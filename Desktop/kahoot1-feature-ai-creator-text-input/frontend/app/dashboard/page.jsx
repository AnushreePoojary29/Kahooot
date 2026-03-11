"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import {
  Plus,
  LogOut,
  History,
  Trash2,
  Play,
  Download,
  Upload,
  Clock,
  LayoutGrid,
  Pencil,
  Sparkles,
} from "lucide-react";
import { QuizCreator } from "@/components/quiz-creator";
import { AIQuizCreator } from "@/components/ai-quiz-creator";
import { GameLobby } from "@/components/game-lobby";
import { GameHistory } from "@/components/game-history";

const fetcher = (url) =>
  fetch(url, { cache: "no-store", credentials: "include" }).then((r) => r.json());

const buttonBase =
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:pointer-events-none disabled:opacity-50";
const buttonPrimary =
  `${buttonBase} h-10 px-4 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-cyan-400/35`;
const buttonSoft =
  `${buttonBase} h-10 px-4 border border-white/35 bg-white/85 text-slate-800 shadow-sm hover:bg-white hover:shadow-md`;
const buttonGhost =
  `${buttonBase} h-9 px-3 text-slate-600 hover:bg-white/70 hover:text-slate-900`;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: authData, isLoading: authLoading } = useSWR("/api/auth/me", fetcher);
  const { data: quizData, isLoading: quizLoading } = useSWR("/api/quizzes", fetcher);

  const [view, setView] = useState("list");
  const [activeGameId, setActiveGameId] = useState(null);

  useEffect(() => {
    if (!authLoading && !authData?.user) {
      router.push("/auth/login");
    }
  }, [authData, authLoading, router]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
  }, [router]);

  const handleDeleteQuiz = useCallback(async (quizId) => {
    await fetch(`/api/quizzes/${quizId}`, { method: "DELETE", credentials: "include" });
    mutate("/api/quizzes");
  }, []);

  const handleStartGame = useCallback(async (quizId) => {
    const res = await fetch("/api/game/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ quizId }),
    });
    const data = await res.json();
    if (res.ok) {
      setActiveGameId(data.game.id);
      setView("lobby");
    }
  }, []);

  const handleExportQuiz = useCallback((quiz) => {
    const questionBlocks = quiz.questions
      .map((q, qIndex) => {
        const questionImage = q.questionImage
          ? `<div style=\"margin:10px 0;\"><img src=\"${q.questionImage}\" style=\"max-width:560px;max-height:280px;border:1px solid #ddd;border-radius:8px;object-fit:contain;\" /></div>`
          : "";

        const optionRows = (q.options || [])
          .map((opt, oIndex) => {
            const optionImage = q.optionImages?.[oIndex]
              ? `<img src=\"${q.optionImages[oIndex]}\" style=\"max-width:180px;max-height:120px;border:1px solid #ddd;border-radius:6px;object-fit:contain;vertical-align:middle;margin-left:8px;\" />`
              : "";
            const isCorrect = q.correctAnswer === oIndex;
            return `<li style=\"margin:8px 0;${isCorrect ? "font-weight:700;" : ""}\">${escapeHtml(opt)} ${optionImage} ${isCorrect ? "(Correct)" : ""}</li>`;
          })
          .join("");

        return `
          <div style="margin:20px 0;padding:14px;border:1px solid #e2e2e2;border-radius:10px;">
            <h3 style="margin:0 0 8px 0;font-size:18px;">Q${qIndex + 1}. ${escapeHtml(q.text)}</h3>
            <p style="margin:0 0 8px 0;color:#444;">Time Limit: ${q.timeLimit || 30}s</p>
            ${questionImage}
            <ol type="A" style="padding-left:22px;margin:10px 0 0 0;">
              ${optionRows}
            </ol>
          </div>
        `;
      })
      .join("");

    const htmlDoc = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(quiz.title)}</title>
        </head>
        <body style="font-family:Calibri,Arial,sans-serif;padding:20px;color:#111;">
          <h1 style="margin-bottom:4px;">${escapeHtml(quiz.title)}</h1>
          <p style="margin-top:0;color:#666;">Exported on ${new Date().toLocaleString()}</p>
          ${questionBlocks}
        </body>
      </html>
    `;

    const blob = new Blob([htmlDoc], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quiz.title.replace(/\s+/g, "-").toLowerCase()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportQuiz = useCallback(() => {
    router.push("/import");
  }, [router]);

  const handleEditQuiz = useCallback(() => {
    setView("create");
  }, []);

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  if (!authData?.user) {
    return null;
  }

  const quizzes = quizData?.quizzes || [];
  const userName = authData.user.name || "Professor";

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen">

      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-8 overflow-hidden rounded-full bg-white p-0.5 shadow-lg shadow-slate-300/40">
              <img src="/sahyadri.png" alt="Sahyadri logo" className="h-full w-full object-cover" />
            </div>
            <span className="font-bold tracking-tight text-slate-900">QuizBlitz</span>
          </div>

          <nav className="flex items-center gap-1 rounded-full border border-white/50 bg-white/85 p-1 shadow-sm">
            <button
              className={`${view === "list" || view === "create" ? "bg-violet-100 text-violet-700" : ""} ${buttonGhost}`}
              onClick={() => setView("list")}
            >
              <LayoutGrid className="size-4" />
              <span className="hidden sm:inline">Quizzes</span>
            </button>
            <button
              className={`${view === "history" ? "bg-cyan-100 text-cyan-700" : ""} ${buttonGhost}`}
              onClick={() => setView("history")}
            >
              <History className="size-4" />
              <span className="hidden sm:inline">History</span>
            </button>
            <button className={buttonGhost} onClick={handleLogout}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 rounded-full border border-white/45 bg-white/85 px-2.5 py-1 shadow-sm">
            <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white text-xs font-bold flex items-center justify-center">
              {initials}
            </div>
            <span className="hidden sm:inline text-sm font-medium text-slate-700">{userName}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {view === "list" && (
          <div className="flex flex-col gap-6">
            <section className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 px-6 py-7 text-white shadow-2xl shadow-indigo-400/35">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/20 blur-xl" />
              <div className="absolute -left-6 -bottom-10 h-28 w-28 rounded-full bg-cyan-200/30 blur-xl" />
              <div className="relative">
                <p className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  <Sparkles className="size-3.5" />
                  Campus Edition
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Welcome back, {userName}! Ready to create a quiz?
                </h1>
                <p className="mt-2 text-sm text-indigo-50">
                  Build a standout classroom challenge with one click.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Quick Actions</h3>
              <div className="grid gap-2 sm:grid-cols-4">
                <button className={`${buttonPrimary} justify-start`} onClick={() => setView("create")}>
                  <Plus className="mr-2 size-4" />
                  Create Quiz
                </button>
                <button className={`${buttonSoft} justify-start`} onClick={() => setView("ai-create")}>
                  <Sparkles className="mr-2 size-4" />
                  AI Creator
                </button>
                <button className={`${buttonSoft} justify-start`} onClick={handleImportQuiz}>
                  <Upload className="mr-2 size-4" />
                  Import Quiz
                </button>
                <button className={`${buttonSoft} justify-start`} onClick={() => setView("history")}>
                  <History className="mr-2 size-4" />
                  View History
                </button>
              </div>
            </section>

            {quizLoading ? (
              <div className="flex justify-center py-12">
                <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : quizzes.length === 0 ? (
              <section className="rounded-3xl border border-dashed border-indigo-300/70 bg-white/85 py-16 shadow-sm">
                <div className="px-6 text-center flex flex-col items-center gap-4">
                  <div className="rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 p-4 shadow-lg shadow-indigo-300/35">
                    <Sparkles className="size-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Your quiz journey starts here!</h3>
                  <p className="text-sm text-slate-600">Create your first quiz and make everyone clap.</p>
                  <button
                    className={`${buttonPrimary} h-12 px-8 text-base animate-[pulse_2.2s_ease-in-out_infinite]`}
                    onClick={() => setView("create")}
                  >
                    <Plus className="mr-2 size-5" />
                    Create Quiz
                  </button>
                </div>
              </section>
            ) : (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {quizzes.map((quiz) => (
                  <article
                    key={quiz.id}
                    className="group rounded-2xl border border-white/50 bg-white/92 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="p-6">
                      <h3 className="text-lg font-semibold leading-tight tracking-tight text-slate-900">{quiz.title}</h3>
                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          {quiz.questions.length} {quiz.questions.length === 1 ? "question" : "questions"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Clock className="size-3" />
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                    </div>

                    <div className="p-6 pt-0 flex flex-col gap-2.5">
                      <button className={`${buttonPrimary} w-full`} onClick={() => handleStartGame(quiz.id)}>
                        <Play className="mr-2 size-4" />
                        Start Quiz
                      </button>

                      <div className="grid grid-cols-3 gap-2">
                        <button className={buttonSoft} onClick={handleEditQuiz} title="Edit">
                          <Pencil className="mr-1 size-4" />
                          Edit
                        </button>
                        <button className={buttonSoft} onClick={() => handleExportQuiz(quiz)}>
                          <Download className="mr-1 size-4" />
                          Export
                        </button>
                        <button className={`${buttonSoft} text-red-600 hover:text-red-700`} onClick={() => handleDeleteQuiz(quiz.id)}>
                          <Trash2 className="mr-1 size-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </div>
        )}

        {view === "create" && (
          <QuizCreator
            onCreated={() => {
              mutate("/api/quizzes");
              setView("list");
            }}
            onCancel={() => setView("list")}
          />
        )}

        {view === "ai-create" && (
          <AIQuizCreator
            onCreated={() => {
              mutate("/api/quizzes");
              setView("list");
            }}
            onCancel={() => setView("list")}
          />
        )}

        {view === "lobby" && activeGameId && (
          <GameLobby
            gameId={activeGameId}
            onEnd={() => {
              setActiveGameId(null);
              setView("list");
            }}
          />
        )}

        {view === "history" && <GameHistory />}
      </div>
    </main>
  );
}
