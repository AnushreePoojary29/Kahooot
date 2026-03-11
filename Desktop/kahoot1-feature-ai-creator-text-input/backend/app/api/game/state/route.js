import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const gameId = searchParams.get("gameId");
        if (!gameId) {
            return NextResponse.json({ error: "gameId required" }, { status: 400 });
        }
        const gameData = await redis.get(`game:${gameId}`);
        if (!gameData) {
            return NextResponse.json({ error: "Game not found" }, { status: 404 });
        }
        const game = typeof gameData === "string" ? JSON.parse(gameData) : gameData;
        const quizData = await redis.get(`quiz:${game.quizId}`);
        const quiz = quizData
            ? typeof quizData === "string"
                ? JSON.parse(quizData)
                : quizData
            : null;
        const serverNowMs = Date.now();
        const questionStartRaw = await redis.get(`game:${gameId}:questionStart`);
        const quizStartRaw = await redis.get(`game:${gameId}:quizStart`);
        const questionStartMs = questionStartRaw ? parseInt(String(questionStartRaw), 10) : null;
        const quizStartMs = quizStartRaw ? parseInt(String(quizStartRaw), 10) : null;
        const questionDurationMs = game.status === "started" && Number.isInteger(game.currentQuestion)
            ? ((quiz?.questions?.[game.currentQuestion]?.timeLimit || 30) * 1000)
            : null;
        const remainingMs = questionStartMs && questionDurationMs
            ? Math.max(0, questionDurationMs - (serverNowMs - questionStartMs))
            : null;
        return NextResponse.json({
            game,
            quiz,
            timer: {
                serverNowMs,
                quizStartMs,
                questionStartMs,
                questionDurationMs,
                remainingMs,
            },
        });
    }
    catch (error) {
        console.error("Game state error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
