import { NextResponse } from "next/server";
import { utils, write } from "xlsx";
export async function GET() {
    try {
        const sampleData = [
            {
                Question: "What is the capital of France?",
                "Option A": "London",
                "Option B": "Berlin",
                "Option C": "Paris",
                "Option D": "Madrid",
                "Correct Option": "C",
            },
            {
                Question: "How many sides does a triangle have?",
                "Option A": "2",
                "Option B": "3",
                "Option C": "4",
                "Option D": "5",
                "Correct Option": "B",
            },
            {
                Question: "What does HTML stand for?",
                "Option A": "Hypertext Markup Language",
                "Option B": "High Tech Modern Language",
                "Option C": "Home Tool Markup Language",
                "Option D": "Hyperlinks and Text Markup Language",
                "Correct Option": "A",
            },
            {
                Question: "What is 10 × 5?",
                "Option A": "30",
                "Option B": "40",
                "Option C": "50",
                "Option D": "60",
                "Correct Option": "C",
            },
            {
                Question: "Which of these is a programming language?",
                "Option A": "HTML",
                "Option B": "CSS",
                "Option C": "Python",
                "Option D": "XML",
                "Correct Option": "C",
            },
        ];
        const worksheet = utils.json_to_sheet(sampleData);
        // Set column widths for better readability
        worksheet["!cols"] = [
            { wch: 45 }, // Question
            { wch: 30 }, // Option A
            { wch: 30 }, // Option B
            { wch: 30 }, // Option C
            { wch: 30 }, // Option D
            { wch: 15 }, // Correct Option
        ];
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, "Questions");
        // Generate Excel file as buffer
        const buffer = write(workbook, { bookType: "xlsx", type: "buffer" });
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": 'attachment; filename="quiz_template.xlsx"',
            },
        });
    }
    catch (error) {
        console.error("Template generation error:", error);
        return NextResponse.json({ error: "Failed to generate template" }, { status: 500 });
    }
}
