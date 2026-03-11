import { NextRequest, NextResponse } from "next/server";
import { read, utils } from "xlsx";
import { connectToDatabase } from "@/lib/mongodb";
import { Quiz, QuestionSchema } from "@/lib/models/Quiz";
import { redis } from "@/lib/redis";
import { getSession } from "@/lib/auth";
const CORRECT_ANSWER_MAP = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
};
function validateRow(row) {
    try {
        // Extract and trim fields
        const question = String(row["Question"] || "").trim();
        const optionA = String(row["Option A"] || "").trim();
        const optionB = String(row["Option B"] || "").trim();
        const optionC = String(row["Option C"] || "").trim();
        const optionD = String(row["Option D"] || "").trim();
        const correctOption = String(row["Correct Option"] || "").trim().toUpperCase();
        // Validate all fields exist and are non-empty
        if (!question) {
            return { valid: false, error: "Question field is empty" };
        }
        if (!optionA || !optionB || !optionC || !optionD) {
            return { valid: false, error: "All four options must be provided" };
        }
        if (!correctOption) {
            return { valid: false, error: "Correct Option field is empty" };
        }
        // Validate correct answer is A, B, C, or D
        if (!CORRECT_ANSWER_MAP.hasOwnProperty(correctOption)) {
            return { valid: false, error: `Correct Option must be A, B, C, or D. Got: ${correctOption}` };
        }
        return {
            valid: true,
            question: {
                question,
                options: [optionA, optionB, optionC, optionD],
                correctAnswer: CORRECT_ANSWER_MAP[correctOption],
            },
        };
    }
    catch (error) {
        return { valid: false, error: `Row validation failed: ${String(error)}` };
    }
}
export async function POST(request) {
    try {
        // Verify authentication
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
        }
        if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
            return NextResponse.json({ success: false, error: "File must be an Excel file (.xlsx or .xls)" }, { status: 400 });
        }
        const quizTitle = formData.get("title") || "Imported Quiz";
        const importedTimeLimit = Math.max(5, Math.min(120, parseInt(String(formData.get("timeLimit") || "30")) || 30));
        // Read file buffer
        const buffer = await file.arrayBuffer();
        const workbook = read(buffer);
        // Get first sheet
        const worksheetName = workbook.SheetNames[0];
        if (!worksheetName) {
            return NextResponse.json({ success: false, error: "Excel file has no sheets" }, { status: 400 });
        }
        const worksheet = workbook.Sheets[worksheetName];
        const rows = utils.sheet_to_json(worksheet);
        if (rows.length === 0) {
            return NextResponse.json({ success: false, error: "Excel sheet has no data rows" }, { status: 400 });
        }
        // Parse and validate questions
        const questions = [];
        const skippedRows = [];
        rows.forEach((row, index) => {
            const validation = validateRow(row);
            if (validation.valid && validation.question) {
                questions.push({
                    ...validation.question,
                    timeLimit: importedTimeLimit,
                });
            }
            else {
                skippedRows.push({ index: index + 2, error: validation.error || "Unknown error" });
            }
        });
        if (questions.length === 0) {
            return NextResponse.json({
                success: false,
                error: "No valid questions found in Excel file",
                skippedRows,
            }, { status: 400 });
        }
        // Connect to MongoDB
        await connectToDatabase();
        // Create and save quiz
        const quiz = new Quiz({
            title: quizTitle,
            createdBy: session.userId,
            questions,
        });
        await quiz.save();
        // Also persist a lightweight copy in Redis so the app (which reads Redis)
        // can surface the imported quiz the same way manual creations do.
        try {
            const quizId = String(quiz._id);
            const redisQuiz = {
                id: quizId,
                title: quiz.title,
                professorId: session.userId,
                questions: questions.map((q, i) => ({
                    id: `q-${i}`,
                    text: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    timeLimit: q.timeLimit || importedTimeLimit,
                })),
                createdAt: quiz.createdAt?.toISOString ? quiz.createdAt.toISOString() : new Date().toISOString(),
            };
            await redis.set(`quiz:${quizId}`, JSON.stringify(redisQuiz));
            await redis.sadd(`professor:${session.userId}:quizzes`, quizId);
        }
        catch (redisErr) {
            console.error("Warning: failed to persist imported quiz to Redis:", redisErr);
        }
        return NextResponse.json({
            success: true,
            totalQuestions: questions.length,
            quizId: quiz._id,
            importedQuestions: questions,
            skippedRows: skippedRows.length > 0 ? skippedRows : undefined,
        }, { status: 201 });
    }
    catch (error) {
        console.error("Upload quiz error:", error);
        return NextResponse.json({ success: false, error: String(error) || "Internal server error" }, { status: 500 });
    }
}
