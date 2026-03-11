import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { calculateScore } from "@/lib/game-utils";
export async function POST(req) {
    try {
        const { gameId, playerId, questionIndex, answerIndex } = await req.json();
        const gameData = await redis.get(`game:${gameId}`);
        if (!gameData) {
            return NextResponse.json({ error: "Game not found" }, { status: 404 });
        }
        const game = typeof gameData === "string" ? JSON.parse(gameData) : gameData;
        if (game.status !== "started") {
            return NextResponse.json({ error: "Game is not active" }, { status: 400 });
        }
        if (game.currentQuestion !== questionIndex) {
            return NextResponse.json({ error: "Wrong question" }, { status: 400 });
        }
        const existingAnswer = await redis.get(`game:${gameId}:answer:${playerId}:${questionIndex}`);
        if (existingAnswer) {
            return NextResponse.json({ error: "Already answered" }, { status: 409 });
        }
        const quizData = await redis.get(`quiz:${game.quizId}`);
        if (!quizData) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }
        const quiz = typeof quizData === "string" ? JSON.parse(quizData) : quizData;
        const question = quiz.questions[questionIndex];
        const questionStartStr = await redis.get(`game:${gameId}:questionStart`);
        const questionStart = questionStartStr ? parseInt(questionStartStr) : Date.now();
        const responseTimeMs = Date.now() - questionStart;
        const timeLimitMs = (question.timeLimit || 30) * 1000;
        const isCorrect = answerIndex === question.correctAnswer;
        const score = calculateScore(isCorrect, responseTimeMs, timeLimitMs);
        const answer = {
            playerId,
            questionIndex,
            answerIndex,
            responseTimeMs,
            score,
            isCorrect,
            submittedAt: new Date().toISOString(),
        };
        await redis.set(`game:${gameId}:answer:${playerId}:${questionIndex}`, JSON.stringify(answer), { ex: 86400 });
        const playerIndex = game.players.findIndex((p) => p.id === playerId);
        if (playerIndex !== -1) {
            game.players[playerIndex].score += score;
            game.players[playerIndex].lastResponseTimeMs = responseTimeMs;
            await redis.set(`game:${gameId}`, JSON.stringify(game), { ex: 86400 });
        }
        return NextResponse.json({
            success: true,
            isCorrect,
            score,
            reactionTimeMs: responseTimeMs,
            correctAnswer: question.correctAnswer,
            totalScore: game.players[playerIndex]?.score || 0,
        });
    }
    catch (error) {
        console.error("Submit answer error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
