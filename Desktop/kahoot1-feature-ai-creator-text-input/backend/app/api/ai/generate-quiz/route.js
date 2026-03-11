import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DIFFICULTY_TO_TONE = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBaseUrl(url) {
  const value = asTrimmedString(url);
  if (!value) return "";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getCandidateMcqBaseUrls() {
  const candidates = [
    normalizeBaseUrl(process.env.MCQ_GENERATOR_URL),
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ].filter(Boolean);

  return [...new Set(candidates)];
}

function safeParseJson(raw) {
  if (typeof raw !== "string") {
    return raw;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = raw.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeOptions(optionsRaw) {
  if (Array.isArray(optionsRaw)) {
    const cleaned = optionsRaw.map((v) => asTrimmedString(v)).filter(Boolean);
    return cleaned.length >= 4 ? cleaned.slice(0, 4) : null;
  }

  if (!optionsRaw || typeof optionsRaw !== "object") {
    return null;
  }

  const orderedKeys = ["a", "b", "c", "d"];
  const mapped = orderedKeys.map((k) =>
    asTrimmedString(optionsRaw[k] ?? optionsRaw[k.toUpperCase()]),
  );
  if (mapped.some((opt) => !opt)) {
    return null;
  }
  return mapped;
}

function correctIndexFromValue(correctRaw, options) {
  const correct = asTrimmedString(correctRaw);
  if (!correct) return 0;

  const asLetter = correct.toUpperCase();
  if (["A", "B", "C", "D"].includes(asLetter)) {
    return asLetter.charCodeAt(0) - 65;
  }

  const normalized = correct.toLowerCase();
  const idx = options.findIndex((opt) => opt.toLowerCase() === normalized);
  return idx === -1 ? 0 : idx;
}

function normalizeQuestionItem(item, index) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const text = asTrimmedString(item.mcq ?? item.question ?? item.text);
  const options = normalizeOptions(item.options);
  if (!text || !options) {
    return null;
  }

  const correctAnswer = correctIndexFromValue(
    item.correct ?? item.correct_answer ?? item.answer,
    options,
  );

  return {
    id: `ai-${index + 1}`,
    text,
    options,
    correctAnswer,
    timeLimit: 30,
    questionImage: "",
    optionImages: ["", "", "", ""],
  };
}

function normalizeGeneratedQuestions(generated) {
  let list = [];

  if (Array.isArray(generated)) {
    list = generated;
  } else if (generated && typeof generated === "object") {
    const keys = Object.keys(generated).sort((a, b) => Number(a) - Number(b));
    list = keys.map((key) => generated[key]);
  }

  return list
    .map((item, index) => normalizeQuestionItem(item, index))
    .filter(Boolean);
}

function normalizeStem(value) {
  return asTrimmedString(value)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeAndValidateQuestions(questions, limit) {
  const usedStems = new Set();
  const output = [];

  for (const item of questions) {
    const stem = normalizeStem(item.text);
    if (!stem || usedStems.has(stem)) {
      continue;
    }

    const options = Array.isArray(item.options)
      ? item.options.map((option) => asTrimmedString(option)).filter(Boolean)
      : [];

    if (options.length < 4) {
      continue;
    }

    const uniqueOptionCount = new Set(
      options.slice(0, 4).map((opt) => opt.toLowerCase()),
    ).size;
    if (uniqueOptionCount < 4) {
      continue;
    }

    usedStems.add(stem);
    output.push({
      ...item,
      options: options.slice(0, 4),
      correctAnswer: Number.isInteger(item.correctAnswer)
        ? Math.max(0, Math.min(3, item.correctAnswer))
        : 0,
    });

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const textInput = asTrimmedString(formData.get("text"));
    const titleInput = asTrimmedString(formData.get("title"));
    const questionCount = Math.max(
      1,
      Math.min(30, parseInt(String(formData.get("count") || "5"), 10) || 5),
    );
    const difficultyInput = asTrimmedString(
      formData.get("difficulty"),
    ).toLowerCase();
    const difficulty = DIFFICULTY_TO_TONE[difficultyInput] || "medium";
    const namespace = `prof-${session.userId}-${Date.now()}`;

    const hasText = Boolean(textInput);
    const hasPdf = Boolean(file && typeof file !== "string");

    if (!hasText && !hasPdf) {
      return NextResponse.json(
        { error: "Provide either source text or a PDF file" },
        { status: 400 },
      );
    }

    if (
      hasPdf &&
      !String(file.name || "")
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Only PDF files are supported for file upload" },
        { status: 400 },
      );
    }

    const mcqBaseUrls = getCandidateMcqBaseUrls();
    let rawBody = "";
    let lastError = "";
    let selectedBaseUrl = "";
    const inferredSubject =
      titleInput ||
      (hasPdf ? String(file?.name || "").replace(/\.pdf$/i, "") : "text input");
    const inferredQuery = hasText
      ? textInput.slice(0, 280)
      : `Generate quiz questions from uploaded PDF on ${inferredSubject || "the uploaded topic"}`;

    for (const mcqBaseUrl of mcqBaseUrls) {
      try {
        let uploadRes;
        if (hasText) {
          uploadRes = await fetch(`${mcqBaseUrl}/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: textInput, namespace }),
            cache: "no-store",
          });
        } else {
          const uploadForm = new FormData();
          uploadForm.append("file", file, file.name || "document.pdf");
          uploadForm.append("namespace", namespace);

          uploadRes = await fetch(`${mcqBaseUrl}/upload`, {
            method: "POST",
            body: uploadForm,
            cache: "no-store",
          });
        }

        if (!uploadRes.ok) {
          const uploadBody = await uploadRes.text();
          lastError = `Upload failed at ${mcqBaseUrl} with status ${uploadRes.status}: ${uploadBody || "No response body"}`;
          continue;
        }

        const generateRes = await fetch(`${mcqBaseUrl}/generate-mcq`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            count: questionCount,
            tone: difficulty,
            subject: inferredSubject || "general",
            query: inferredQuery,
            namespace,
          }),
          cache: "no-store",
        });

        if (!generateRes.ok) {
          const generateBody = await generateRes.text();
          lastError = `Generation failed at ${mcqBaseUrl} with status ${generateRes.status}: ${generateBody || "No response body"}`;
          continue;
        }

        rawBody = await generateRes.text();
        selectedBaseUrl = mcqBaseUrl;
        break;
      } catch (err) {
        lastError = `Connection failed at ${mcqBaseUrl}: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    }

    if (!rawBody) {
      return NextResponse.json(
        {
          error: hasText
            ? "Failed to process text in MCQ generator"
            : "Failed to process PDF in MCQ generator",
          details:
            lastError ||
            "Could not connect to MCQ generator service. Set MCQ_GENERATOR_URL in backend .env (example: http://localhost:3001).",
        },
        { status: 502 },
      );
    }

    const parsed = safeParseJson(rawBody);
    const normalized = normalizeGeneratedQuestions(parsed);
    const questions = dedupeAndValidateQuestions(normalized, questionCount);

    if (questions.length === 0) {
      return NextResponse.json(
        {
          error: "No valid MCQs were generated",
          source: selectedBaseUrl,
          raw: rawBody,
        },
        { status: 502 },
      );
    }

    if (questions.length < questionCount) {
      console.warn(
        `[ai/generate-quiz] Requested ${questionCount} questions but only ${questions.length} passed validation.`,
      );
    }

    const baseName = hasPdf
      ? String(file.name || "AI Quiz")
          .replace(/\.pdf$/i, "")
          .trim()
      : "Text Based Quiz";

    return NextResponse.json({
      success: true,
      source: selectedBaseUrl,
      titleSuggestion: `${baseName} (${difficulty})`,
      questions,
    });
  } catch (error) {
    console.error("AI quiz generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
