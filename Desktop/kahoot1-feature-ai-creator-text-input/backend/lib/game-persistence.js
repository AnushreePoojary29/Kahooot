import { redis } from "@/lib/redis"
import { connectToDatabase } from "@/lib/mongodb"
import { GameResult } from "@/lib/models/GameResult"

async function buildPlayerResults(gameId, players, totalQuestions) {
  const playerResults = []

  for (const player of players) {
    const answers = []

    for (let i = 0; i < totalQuestions; i++) {
      const answerData = await redis.get(`game:${gameId}:answer:${player.id}:${i}`)
      if (answerData) {
        const parsed = typeof answerData === "string" ? JSON.parse(answerData) : answerData
        answers.push(parsed)
      }
    }

    const correctCount = answers.filter((a) => a.isCorrect).length
    const avgResponseTime =
      answers.length > 0
        ? answers.reduce((sum, a) => sum + a.responseTimeMs, 0) / answers.length
        : 0

    playerResults.push({
      playerId: player.id,
      nickname: player.nickname,
      totalScore: player.score,
      correctCount,
      totalQuestions,
      avgResponseTime: Math.round(avgResponseTime),
      answers,
    })
  }

  playerResults.sort((a, b) => b.totalScore - a.totalScore)
  return playerResults
}

export async function persistFinishedGameToMongo(game, quiz = null) {
  if (!game?.id || !game?.quizId || !game?.professorId) {
    throw new Error("Invalid game payload for persistence")
  }

  await connectToDatabase()

  const totalQuestions = quiz?.questions?.length || 0
  const playerResults = await buildPlayerResults(game.id, game.players || [], totalQuestions)

  const payload = {
    gameId: game.id,
    pin: game.pin,
    quizId: game.quizId,
    quizTitle: quiz?.title || "",
    professorId: game.professorId,
    status: game.status || "finished",
    questionCount: totalQuestions,
    createdAt: new Date(game.createdAt || Date.now()),
    finishedAt: new Date(game.finishedAt || Date.now()),
    players: (game.players || []).map((player) => ({
      id: player.id,
      nickname: player.nickname,
      score: player.score || 0,
      joinedAt: new Date(player.joinedAt || Date.now()),
    })),
    questionSnapshots: (quiz?.questions || []).map((question, questionIndex) => ({
      questionIndex,
      text: question?.text || "",
      options: Array.isArray(question?.options) ? question.options : [],
    })),
    playerResults: playerResults.map((result) => ({
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        submittedAt: new Date(answer.submittedAt || Date.now()),
      })),
    })),
  }

  return GameResult.findOneAndUpdate({ gameId: game.id }, { $set: payload }, { upsert: true, new: true, setDefaultsOnInsert: true })
}
