"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Loader2,
  RefreshCcw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const buttonBase =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-10 px-4";
const buttonPrimary = `${buttonBase} bg-primary text-primary-foreground shadow hover:bg-primary/90`;
const buttonOutline = `${buttonBase} border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`;
const buttonGhost = `${buttonBase} hover:bg-accent hover:text-accent-foreground shadow-none`;

export function AIQuizCreator({ onCreated, onCancel }) {
  const [file, setFile] = useState(null);
  const [inputMode, setInputMode] = useState("pdf");
  const [sourceText, setSourceText] = useState("");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function parseApiResponse(res) {
    const rawText = await res.text();
    if (!rawText) {
      return {};
    }

    try {
      return JSON.parse(rawText);
    } catch {
      return {
        error: res.ok ? "Invalid server response" : "Request failed",
        details: rawText,
      };
    }
  }

  async function generateQuiz() {
    if (inputMode === "pdf" && !file) {
      setError("Please upload a PDF file");
      return;
    }

    if (inputMode === "text" && !sourceText.trim()) {
      setError("Please enter source text");
      return;
    }

    const parsedCount = Math.max(1, Math.min(30, parseInt(count, 10) || 5));
    const formData = new FormData();
    if (inputMode === "pdf" && file) {
      formData.append("file", file);
    }
    if (inputMode === "text") {
      formData.append("text", sourceText.trim());
    }
    formData.append("count", String(parsedCount));
    formData.append("difficulty", difficulty);

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        body: formData,
      });

      const data = await parseApiResponse(res);
      if (!res.ok) {
        const details = typeof data.details === "string" ? data.details : "";
        throw new Error(
          details
            ? `${data.error || "Failed to generate quiz"}: ${details}`
            : data.error || "Failed to generate quiz",
        );
      }

      const generatedQuestions = Array.isArray(data.questions)
        ? data.questions
        : [];
      if (generatedQuestions.length === 0) {
        throw new Error("No questions were generated");
      }

      setQuestions(generatedQuestions);
      if (!title.trim()) {
        if (inputMode === "pdf" && file) {
          setTitle(
            data.titleSuggestion ||
              `AI Quiz - ${file.name.replace(/\.pdf$/i, "")}`,
          );
        } else {
          setTitle(data.titleSuggestion || "AI Quiz - Text Input");
        }
      }
      setSuccess(
        `Generated ${generatedQuestions.length} questions successfully`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  }

  async function continueWithQuiz() {
    if (!title.trim()) {
      setError("Please enter a quiz title before continuing");
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      setError("Generate questions first");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payloadQuestions = questions.map((q, index) => ({
        text: q.text || `Question ${index + 1}`,
        options: Array.isArray(q.options)
          ? q.options.slice(0, 4)
          : ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: Number.isInteger(q.correctAnswer)
          ? Math.max(0, Math.min(3, q.correctAnswer))
          : 0,
        questionImage: "",
        optionImages: ["", "", "", ""],
        timeLimit: 30,
      }));

      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          questions: payloadQuestions,
        }),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to save generated quiz");
      }

      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save generated quiz",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button className={`${buttonGhost} h-9 w-9 p-0`} onClick={onCancel}>
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-2xl font-bold text-foreground">AI Creator</h2>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={inputMode === "pdf" ? buttonPrimary : buttonOutline}
            onClick={() => setInputMode("pdf")}
            disabled={loading || saving}
          >
            PDF Input
          </button>
          <button
            type="button"
            className={inputMode === "text" ? buttonPrimary : buttonOutline}
            onClick={() => setInputMode("text")}
            disabled={loading || saving}
          >
            Text Input
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {inputMode === "pdf" ? (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Upload PDF</label>
              <input
                type="file"
                accept="application/pdf"
                className={inputClass}
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] || null;
                  setFile(nextFile);
                }}
              />
            </div>
          ) : (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Enter Source Text</label>
              <textarea
                className="flex min-h-36 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Paste chapter notes, concepts, or any study content here..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Quiz Title</label>
            <input
              className={inputClass}
              placeholder="e.g. AI Generated Chapter Test"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Number of Questions</label>
            <input
              type="number"
              min={1}
              max={30}
              className={inputClass}
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Difficulty</label>
            <select
              className={inputClass}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className={buttonPrimary}
            onClick={generateQuiz}
            disabled={loading || saving}
          >
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 size-4" />
            )}
            Submit
          </button>

          {questions.length > 0 && (
            <>
              <button
                className={buttonOutline}
                onClick={continueWithQuiz}
                disabled={saving || loading}
              >
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 size-4" />
                )}
                Continue with Quiz
              </button>
              <button
                className={buttonOutline}
                onClick={generateQuiz}
                disabled={loading || saving}
              >
                <RefreshCcw className="mr-2 size-4" />
                Regenerate Quiz
              </button>
            </>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-700">{success}</p>}
      </div>

      {questions.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Generated Questions Preview</h3>
          <div className="mt-3 space-y-4">
            {questions.map((q, index) => (
              <div key={q.id || index} className="rounded-lg border p-3">
                <p className="font-medium">
                  Q{index + 1}. {q.text}
                </p>
                <ol
                  type="A"
                  className="mt-2 space-y-1 pl-6 text-sm text-muted-foreground"
                >
                  {(q.options || []).map((opt, optIndex) => (
                    <li
                      key={`${index}-${optIndex}`}
                      className={
                        optIndex === q.correctAnswer
                          ? "font-semibold text-foreground"
                          : ""
                      }
                    >
                      {opt}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
