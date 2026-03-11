import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Quiz } from "@/lib/models/Quiz";
export const dynamic = "force-dynamic";

const IMAGE_DATA_URL_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const MAX_IMAGE_DATA_URL_LENGTH = 2_800_000;

function sanitizeImageDataUrl(value) {
    if (typeof value !== "string") {
        return "";
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }
    if (!IMAGE_DATA_URL_REGEX.test(trimmed)) {
        return "";
    }
    if (trimmed.length > MAX_IMAGE_DATA_URL_LENGTH) {
        return "";
    }
    return trimmed;
}

function sanitizeOptionImages(optionImages) {
    return Array.from({ length: 4 }, (_, index) => {
        if (!Array.isArray(optionImages)) {
            return "";
        }
        return sanitizeImageDataUrl(optionImages[index]);
    });
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const quizIds = await redis.smembers(`professor:${session.userId}:quizzes`);
        const quizzes = [];
        for (const id of quizIds) {
            const quiz = await redis.get(`quiz:${id}`);
            if (quiz) {
                const parsed = typeof quiz === "string" ? JSON.parse(quiz) : quiz;
                quizzes.push(parsed);
            }
        }
        quizzes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return NextResponse.json({ quizzes });
    }
    catch (error) {
        console.error("Get quizzes error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
export async function POST(req) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { title, questions } = await req.json();
        if (typeof title !== "string" || !title.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }
        if (!Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json({ error: "Title and questions are required" }, { status: 400 });
        }
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (typeof q?.text !== "string" || !q.text.trim()) {
                return NextResponse.json({ error: `Question ${i + 1} text is required` }, { status: 400 });
            }
            if (!Array.isArray(q?.options) || q.options.length !== 4 || q.options.some((opt) => typeof opt !== "string" || !opt.trim())) {
                return NextResponse.json({ error: `Question ${i + 1} requires exactly 4 filled options` }, { status: 400 });
            }
            if (!Number.isInteger(q?.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3) {
                return NextResponse.json({ error: `Question ${i + 1} has invalid correct answer` }, { status: 400 });
            }
        }
        const normalizedQuestions = questions.map((q) => ({
            question: q.text.trim(),
            questionImage: sanitizeImageDataUrl(q.questionImage),
            options: q.options.map((opt) => String(opt).trim()),
            optionImages: sanitizeOptionImages(q.optionImages),
            correctAnswer: q.correctAnswer,
            timeLimit: Math.max(5, Math.min(120, parseInt(String(q.timeLimit || 30)) || 30)),
        }));

        await connectToDatabase();
        const savedQuiz = await Quiz.create({
            title: title.trim(),
            createdBy: session.userId,
            questions: normalizedQuestions,
        });

        const quizId = String(savedQuiz._id);
        const quiz = {
            id: quizId,
            title: savedQuiz.title,
            professorId: session.userId,
            questions: normalizedQuestions.map((q, i) => ({
                id: `q-${i}`,
                text: q.question,
                questionImage: q.questionImage,
                options: q.options,
                optionImages: q.optionImages,
                correctAnswer: q.correctAnswer,
                timeLimit: q.timeLimit,
            })),
            createdAt: savedQuiz.createdAt?.toISOString ? savedQuiz.createdAt.toISOString() : new Date().toISOString(),
        };
        await redis.set(`quiz:${quizId}`, JSON.stringify(quiz));
        await redis.sadd(`professor:${session.userId}:quizzes`, quizId);
        return NextResponse.json({ success: true, quiz });
    }
    catch (error) {
        console.error("Create quiz error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
