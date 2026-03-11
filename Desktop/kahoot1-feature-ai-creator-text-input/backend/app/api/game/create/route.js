import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getSession } from "@/lib/auth";
import { generatePin } from "@/lib/game-utils";
export async function POST(req) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { quizId } = await req.json();
        const quizData = await redis.get(`quiz:${quizId}`);
        if (!quizData) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }
        const quiz = typeof quizData === "string" ? JSON.parse(quizData) : quizData;
        let pin = generatePin();
        let existingGame = await redis.get(`game:pin:${pin}`);
        let attempts = 0;
        while (existingGame && attempts < 10) {
            pin = generatePin();
            existingGame = await redis.get(`game:pin:${pin}`);
            attempts++;
        }
        const gameId = crypto.randomUUID();
        const game = {
            id: gameId,
            quizId: quiz.id,
            pin,
            professorId: session.userId,
            status: "waiting",
            currentQuestion: -1,
            players: [],
            createdAt: new Date().toISOString(),
        };
        await redis.set(`game:${gameId}`, JSON.stringify(game), { ex: 86400 });
        await redis.set(`game:pin:${pin}`, gameId, { ex: 86400 });
        await redis.sadd(`professor:${session.userId}:games`, gameId);
        return NextResponse.json({ success: true, game });
    }
    catch (error) {
        console.error("Create game error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
