import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { GameResult } from "@/lib/models/GameResult";
export async function GET(req) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        await connectToDatabase();
        const mongoGames = await GameResult.find({ professorId: session.userId })
            .sort({ createdAt: -1 })
            .lean();
        const persistedIds = new Set();
        const games = mongoGames.map((entry) => {
            persistedIds.add(entry.gameId);
            return {
                game: {
                    id: entry.gameId,
                    quizId: entry.quizId,
                    pin: entry.pin,
                    status: entry.status,
                    createdAt: entry.createdAt,
                    finishedAt: entry.finishedAt,
                    players: entry.players || [],
                },
                quiz: entry.quizTitle ? { title: entry.quizTitle } : null,
                playerCount: (entry.players || []).length,
                topPlayer: entry.playerResults?.[0]?.nickname || null,
                source: "mongodb",
            };
        });
        for (const entry of games) {
            if (!entry.quiz?.title && entry.game?.quizId) {
                const quizData = await redis.get(`quiz:${entry.game.quizId}`);
                if (quizData) {
                    const quiz = typeof quizData === "string" ? JSON.parse(quizData) : quizData;
                    entry.quiz = { title: quiz?.title || null };
                }
            }
        }
        const gameIds = await redis.smembers(`professor:${session.userId}:games`);
        for (const gid of gameIds) {
            if (persistedIds.has(gid)) {
                continue;
            }
            const gameData = await redis.get(`game:${gid}`);
            if (gameData) {
                const game = typeof gameData === "string" ? JSON.parse(gameData) : gameData;
                if (game.status === "finished") {
                    const quizData = await redis.get(`quiz:${game.quizId}`);
                    const quiz = quizData
                        ? typeof quizData === "string"
                            ? JSON.parse(quizData)
                            : quizData
                        : null;
                    const sorted = [...game.players].sort((a, b) => b.score - a.score);
                    games.push({
                        game,
                        quiz,
                        playerCount: game.players.length,
                        topPlayer: sorted[0]?.nickname || null,
                        source: "redis",
                    });
                }
            }
        }
        games.sort((a, b) => new Date(b.game.createdAt).getTime() -
            new Date(a.game.createdAt).getTime());
        const start = (page - 1) * limit;
        const paged = games.slice(start, start + limit);
        return NextResponse.json({
            history: paged,
            total: games.length,
            page,
            totalPages: Math.ceil(games.length / limit),
        });
    }
    catch (error) {
        console.error("History error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
