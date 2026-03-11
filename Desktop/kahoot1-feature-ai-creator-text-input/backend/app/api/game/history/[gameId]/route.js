import { NextResponse } from "next/server"
import { utils, write } from "xlsx"
import { redis } from "@/lib/redis"
import { getSession } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { GameResult } from "@/lib/models/GameResult"

const OPTION_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function sanitizeFilePart(value) {
  return String(value || "game-history")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase()
}

function toOptionLabel(answerIndex) {
  if (!Number.isInteger(answerIndex) || answerIndex < 0) {
    return "Not Answered"
  }

  const label = OPTION_LABELS[answerIndex] || `Option ${answerIndex + 1}`
  return label
}

function formatSubmittedAnswer(answerIndex, questionSnapshot) {
  if (!Number.isInteger(answerIndex) || answerIndex < 0) {
    return "Not Answered"
  }

  const label = toOptionLabel(answerIndex)
  const optionText = questionSnapshot?.options?.[answerIndex]

  if (!optionText) {
    return label
  }

  return `${label}: ${optionText}`
}

function normalizeQuestions(gameDoc, quiz) {
  if (Array.isArray(gameDoc.questionSnapshots) && gameDoc.questionSnapshots.length > 0) {
    return gameDoc.questionSnapshots
      .slice()
      .sort((a, b) => a.questionIndex - b.questionIndex)
      .map((q, index) => ({
        questionIndex: Number.isInteger(q.questionIndex) ? q.questionIndex : index,
        text: q.text || "",
        options: Array.isArray(q.options) ? q.options : [],
      }))
  }

  if (Array.isArray(quiz?.questions)) {
    return quiz.questions.map((q, index) => ({
      questionIndex: index,
      text: q?.text || "",
      options: Array.isArray(q?.options) ? q.options : [],
    }))
  }

  return []
}

function buildLeaderboardRows(playerResults, questions, totalQuestions) {
  const questionCount = Math.max(totalQuestions, questions.length)
  const normalizedQuestions = Array.from({ length: questionCount }, (_, index) => {
    return questions[index] || { questionIndex: index, text: "", options: [] }
  })

  return playerResults.map((result, index) => {
    const answerMap = new Map((result.answers || []).map((answer) => [answer.questionIndex, answer]))

    const answers = normalizedQuestions.map((question, questionNumber) => {
      const submitted = answerMap.get(questionNumber)
      const answerIndex = submitted?.answerIndex

      return {
        questionNumber: questionNumber + 1,
        question: question.text || `Question ${questionNumber + 1}`,
        submittedAnswer: formatSubmittedAnswer(answerIndex, question),
      }
    })

    return {
      rank: index + 1,
      name: result.nickname,
      totalScore: result.totalScore || 0,
      correctCount: result.correctCount || 0,
      totalQuestions: questionCount,
      answers,
    }
  })
}

function toExcelBuffer({ gameId, quizTitle, rows, questionCount }) {
  const worksheetRows = rows.map((row) => {
    const sheetRow = {
      Rank: row.rank,
      Name: row.name,
      Score: row.totalScore,
      "Correct Answers": `${row.correctCount}/${row.totalQuestions}`,
    }

    for (let i = 0; i < questionCount; i++) {
      sheetRow[`Q${i + 1} Answer`] = row.answers[i]?.submittedAnswer || "Not Answered"
    }

    return sheetRow
  })

  const worksheet = utils.json_to_sheet(worksheetRows)
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 12 },
    { wch: 18 },
    ...Array.from({ length: questionCount }, () => ({ wch: 28 })),
  ]

  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, "Student Answers")

  const safeQuiz = sanitizeFilePart(quizTitle || gameId)
  const filename = `${safeQuiz || "game"}-student-answers.xlsx`

  return {
    buffer: write(workbook, { bookType: "xlsx", type: "buffer" }),
    filename,
  }
}

async function buildPlayerResultsFromRedis(game, quiz) {
  const totalQuestions = Array.isArray(quiz?.questions) ? quiz.questions.length : 0
  const playerResults = []

  for (const player of game.players || []) {
    const answers = []

    for (let i = 0; i < totalQuestions; i++) {
      const answerData = await redis.get(`game:${game.id}:answer:${player.id}:${i}`)
      if (answerData) {
        const parsed = typeof answerData === "string" ? JSON.parse(answerData) : answerData
        answers.push(parsed)
      }
    }

    const correctCount = answers.filter((a) => a.isCorrect).length
    const avgResponseTime =
      answers.length > 0
        ? answers.reduce((sum, a) => sum + (a.responseTimeMs || 0), 0) / answers.length
        : Number.MAX_SAFE_INTEGER

    playerResults.push({
      playerId: player.id,
      nickname: player.nickname,
      totalScore: player.score || 0,
      correctCount,
      totalQuestions,
      avgResponseTime,
      answers,
    })
  }

  return playerResults
}

export async function GET(_req, { params }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const awaitedParams = await params
    const gameId = awaitedParams?.gameId
    if (!gameId) {
      return NextResponse.json({ error: "gameId required" }, { status: 400 })
    }

    const requestUrl = new URL(_req.url)
    const shouldDownload = requestUrl.searchParams.get("download") === "xlsx"

    await connectToDatabase()
    const gameDoc = await GameResult.findOne({ gameId, professorId: session.userId }).lean()

    let quiz = null
    let quizTitle = "Unknown Quiz"
    let pin = ""
    let finishedAt = null
    let questionCountHint = 0
    let sourceQuestions = []
    let sourcePlayerResults = []

    if (gameDoc) {
      if (gameDoc.quizId) {
        const quizData = await redis.get(`quiz:${gameDoc.quizId}`)
        if (quizData) {
          quiz = typeof quizData === "string" ? JSON.parse(quizData) : quizData
        }
      }

      quizTitle = gameDoc.quizTitle || quiz?.title || "Unknown Quiz"
      pin = gameDoc.pin || ""
      finishedAt = gameDoc.finishedAt
      questionCountHint = gameDoc.questionCount || 0
      sourceQuestions = normalizeQuestions(gameDoc, quiz)
      sourcePlayerResults = gameDoc.playerResults || []
    } else {
      const liveGameData = await redis.get(`game:${gameId}`)
      if (!liveGameData) {
        return NextResponse.json({ error: "Game not found" }, { status: 404 })
      }

      const liveGame = typeof liveGameData === "string" ? JSON.parse(liveGameData) : liveGameData
      if (liveGame.professorId !== session.userId) {
        return NextResponse.json({ error: "Game not found" }, { status: 404 })
      }

      const quizData = await redis.get(`quiz:${liveGame.quizId}`)
      if (quizData) {
        quiz = typeof quizData === "string" ? JSON.parse(quizData) : quizData
      }

      quizTitle = quiz?.title || "Unknown Quiz"
      pin = liveGame.pin || ""
      finishedAt = liveGame.finishedAt || liveGame.createdAt || null
      questionCountHint = Array.isArray(quiz?.questions) ? quiz.questions.length : 0
      sourceQuestions = normalizeQuestions({ questionSnapshots: [] }, quiz)
      sourcePlayerResults = await buildPlayerResultsFromRedis(liveGame, quiz)
    }

    const sortedPlayerResults = [...sourcePlayerResults].sort((a, b) => {
      if ((b.totalScore || 0) !== (a.totalScore || 0)) {
        return (b.totalScore || 0) - (a.totalScore || 0)
      }
      return (a.avgResponseTime || Number.MAX_SAFE_INTEGER) - (b.avgResponseTime || Number.MAX_SAFE_INTEGER)
    })

    const questions = sourceQuestions
    const totalQuestions =
      questionCountHint ||
      questions.length ||
      Math.max(
        0,
        ...sortedPlayerResults.flatMap((player) =>
          (player.answers || []).map((answer) => (answer.questionIndex || 0) + 1)
        )
      )

    const rows = buildLeaderboardRows(sortedPlayerResults, questions, totalQuestions)

    if (shouldDownload) {
      const { buffer, filename } = toExcelBuffer({
        gameId,
        quizTitle,
        rows,
        questionCount: totalQuestions,
      })

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json({
      game: {
        gameId,
        quizTitle,
        pin,
        finishedAt,
      },
      totalQuestions,
      rows,
    })
  } catch (error) {
    console.error("History detail error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
