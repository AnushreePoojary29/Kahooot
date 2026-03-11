import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { connectToDatabase } from "@/lib/mongodb";
import { GameResult } from "@/lib/models/GameResult";
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const gameId = searchParams.get("gameId");
        if (!gameId) {
            return NextResponse.json({ error: "gameId required" }, { status: 400 });
        }
        const gameData = await redis.get(`game:${gameId}`);
        if (!gameData) {
            await connectToDatabase();
            const persistedGame = await GameResult.findOne({ gameId }).lean();
            if (!persistedGame) {
                return NextResponse.json({ error: "Game not found" }, { status: 404 });
            }
            return NextResponse.json({
                results: persistedGame.playerResults || [],
                quiz: null,
                source: "mongodb",
            });
        }
        const game = typeof gameData === "string" ? JSON.parse(gameData) : gameData;
        const quizData = await redis.get(`quiz:${game.quizId}`);
        const quiz = quizData
            ? typeof quizData === "string"
                ? JSON.parse(quizData)
                : quizData
            : null;
        const totalQuestions = quiz?.questions.length || 0;
        const playerResults = [];
        for (const player of game.players) {
            const answers = [];
            for (let i = 0; i < totalQuestions; i++) {
                const answerData = await redis.get(`game:${gameId}:answer:${player.id}:${i}`);
                if (answerData) {
                    const parsed = typeof answerData === "string" ? JSON.parse(answerData) : answerData;
                    answers.push(parsed);
                }
            }
            const correctCount = answers.filter((a) => a.isCorrect).length;
            const avgResponseTime = answers.length > 0
                ? answers.reduce((sum, a) => sum + a.responseTimeMs, 0) / answers.length
                : 0;
            playerResults.push({
                playerId: player.id,
                nickname: player.nickname,
                totalScore: player.score,
                correctCount,
                totalQuestions,
                avgResponseTime: Math.round(avgResponseTime),
                answers,
            });
        }
        playerResults.sort((a, b) => b.totalScore - a.totalScore);
        return NextResponse.json({ results: playerResults, quiz, source: "redis" });
    }
    catch (error) {
        console.error("Results error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
