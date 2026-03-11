import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Quiz } from "@/lib/models/Quiz";
export async function DELETE(_req, { params }) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id } = await params;
        await connectToDatabase();
        await Quiz.findByIdAndDelete(id);
        await redis.del(`quiz:${id}`);
        await redis.srem(`professor:${session.userId}:quizzes`, id);
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("Delete quiz error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
