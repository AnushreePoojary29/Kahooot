"use client"

import { useState } from "react"
import { ArrowLeft, Plus, Trash2, Check } from "lucide-react"

const OPTION_COLORS = [
  "bg-game-red text-foreground",
  "bg-game-blue text-primary-foreground",
  "bg-game-yellow text-foreground",
  "bg-game-green text-primary-foreground",
]

const OPTION_LABELS = ["A", "B", "C", "D"]
const buttonBase =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2"
const buttonDefault = `${buttonBase} bg-primary text-primary-foreground shadow hover:bg-primary/90`
const buttonOutline = `${buttonBase} border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`
const buttonGhost = `${buttonBase} hover:bg-accent hover:text-accent-foreground shadow-none`
const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

export function QuizCreator({ onCreated, onCancel }) {
  const DEFAULT_TIME_LIMIT = 30
  const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
  const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
  const [title, setTitle] = useState("")
  const [defaultTimeLimit, setDefaultTimeLimit] = useState(String(DEFAULT_TIME_LIMIT))
  const [questions, setQuestions] = useState([
    {
      text: "",
      questionImage: "",
      options: ["", "", "", ""],
      optionImages: ["", "", "", ""],
      correctAnswer: 0,
      timeLimit: String(DEFAULT_TIME_LIMIT),
    },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function toClampedTime(value, fallback = DEFAULT_TIME_LIMIT) {
    const parsed = parseInt(String(value), 10)
    if (!Number.isFinite(parsed)) return fallback
    return Math.max(5, Math.min(120, parsed))
  }

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        text: "",
        questionImage: "",
        options: ["", "", "", ""],
        optionImages: ["", "", "", ""],
        correctAnswer: 0,
        timeLimit: defaultTimeLimit || String(DEFAULT_TIME_LIMIT),
      },
    ])
  }

  function removeQuestion(index) {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, i) => i !== index))
  }

  function updateQuestion(index, field, value) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q
        if (field === "text") return { ...q, text: value }
        if (field === "correctAnswer") return { ...q, correctAnswer: value }
        if (field === "timeLimit") return { ...q, timeLimit: value }
        return q
      })
    )
  }

  function updateOption(qIndex, oIndex, value) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const options = [...q.options]
        options[oIndex] = value
        return { ...q, options }
      })
    )
  }

  function validateImageFile(file, label) {
    if (!file) {
      return false
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError(`${label} must be PNG, JPG, JPEG, WEBP, or GIF`)
      return false
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`${label} must be smaller than 2 MB`)
      return false
    }
    return true
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
      reader.onerror = () => reject(new Error("Failed to read image"))
      reader.readAsDataURL(file)
    })
  }

  async function handleQuestionImageUpload(qIndex, file) {
    if (!validateImageFile(file, "Question image")) return
    setError("")
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setQuestions((prev) =>
        prev.map((q, i) => (i === qIndex ? { ...q, questionImage: dataUrl } : q))
      )
    } catch {
      setError("Failed to process question image")
    }
  }

  function clearQuestionImage(qIndex) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, questionImage: "" } : q))
    )
  }

  async function handleOptionImageUpload(qIndex, oIndex, file) {
    if (!validateImageFile(file, `Option ${OPTION_LABELS[oIndex]} image`)) return
    setError("")
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setQuestions((prev) =>
        prev.map((q, i) => {
          if (i !== qIndex) return q
          const optionImages = [...(q.optionImages || ["", "", "", ""])]
          optionImages[oIndex] = dataUrl
          return { ...q, optionImages }
        })
      )
    } catch {
      setError(`Failed to process option ${OPTION_LABELS[oIndex]} image`)
    }
  }

  function clearOptionImage(qIndex, oIndex) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const optionImages = [...(q.optionImages || ["", "", "", ""])]
        optionImages[oIndex] = ""
        return { ...q, optionImages }
      })
    )
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Please enter a quiz title")
      return
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        setError(`Question ${i + 1} needs a question text`)
        return
      }
      if (q.options.some((o) => !o.trim())) {
        setError(`Question ${i + 1} needs all four options filled`)
        return
      }
      const parsedTimeLimit = parseInt(String(q.timeLimit), 10)
      if (!Number.isFinite(parsedTimeLimit) || parsedTimeLimit < 5 || parsedTimeLimit > 120) {
        setError(`Question ${i + 1} time must be between 5 and 120 seconds`)
        return
      }
    }

    const payloadQuestions = questions.map((q) => ({
      ...q,
      questionImage: q.questionImage || "",
      optionImages: Array.from({ length: 4 }, (_, i) => q.optionImages?.[i] || ""),
      timeLimit: toClampedTime(q.timeLimit),
    }))

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, questions: payloadQuestions }),
      })
      if (res.ok) {
        onCreated()
      } else {
        const data = await res.json()
        setError(data.error || "Failed to create quiz")
      }
    } catch {
      setError("Failed to create quiz")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button className={`${buttonGhost} h-9 w-9 p-0`} onClick={onCancel}>
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-2xl font-bold text-foreground">Create Quiz</h2>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="quiz-title" className="text-sm font-medium leading-none">
          Quiz Title
        </label>
        <input
          id="quiz-title"
          placeholder="e.g. Biology Chapter 5 Review"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${inputClass} text-lg h-12`}
        />
      </div>

      <div className="flex flex-col gap-2 max-w-xs">
        <label htmlFor="default-time" className="text-sm font-medium leading-none">
          Default Time for New Questions (seconds)
        </label>
        <input
          id="default-time"
          type="number"
          min={5}
          max={120}
          value={defaultTimeLimit}
          onChange={(e) => setDefaultTimeLimit(e.target.value.replace(/\D/g, ""))}
          onBlur={() => setDefaultTimeLimit(String(toClampedTime(defaultTimeLimit)))}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="flex flex-col space-y-1.5 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold leading-none tracking-tight">
                  Question {qIndex + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <label htmlFor={`time-${qIndex}`} className="text-xs text-muted-foreground">
                      Time (s):
                    </label>
                    <input
                      id={`time-${qIndex}`}
                      type="number"
                      min={5}
                      max={120}
                      value={q.timeLimit}
                      onChange={(e) => updateQuestion(qIndex, "timeLimit", e.target.value.replace(/\D/g, ""))}
                      onBlur={() =>
                        updateQuestion(qIndex, "timeLimit", String(toClampedTime(q.timeLimit)))
                      }
                      className={`${inputClass} w-16 h-8 text-xs`}
                    />
                  </div>
                  {questions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(qIndex)}
                      className={`${buttonGhost} size-8 h-8 w-8 p-0`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 pt-0 flex flex-col gap-4">
              <input
                placeholder="Enter your question..."
                value={q.text}
                onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                className={inputClass}
              />
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">Question Image (optional)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleQuestionImageUpload(qIndex, file)
                    }
                    e.target.value = ""
                  }}
                  className={`${inputClass} h-10`}
                />
                {q.questionImage && (
                  <div className="rounded-lg border p-2 flex items-center gap-3">
                    <img
                      src={q.questionImage}
                      alt={`Question ${qIndex + 1} preview`}
                      className="h-16 w-24 rounded object-cover border"
                    />
                    <button
                      type="button"
                      className={`${buttonOutline} h-8 px-3 text-xs`}
                      onClick={() => clearQuestionImage(qIndex)}
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="rounded-md border p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuestion(qIndex, "correctAnswer", oIndex)}
                        className={`shrink-0 flex items-center justify-center size-8 rounded-md text-xs font-bold transition-all ${
                          q.correctAnswer === oIndex
                            ? `${OPTION_COLORS[oIndex]} ring-2 ring-offset-2 ring-foreground`
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {q.correctAnswer === oIndex ? (
                          <Check className="size-4" />
                        ) : (
                          OPTION_LABELS[oIndex]
                        )}
                      </button>
                      <input
                        placeholder={`Option ${OPTION_LABELS[oIndex]}`}
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        className={`${inputClass} flex-1`}
                      />
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleOptionImageUpload(qIndex, oIndex, file)
                        }
                        e.target.value = ""
                      }}
                      className={`${inputClass} h-10`}
                    />
                    {q.optionImages?.[oIndex] && (
                      <div className="rounded-md border p-2 flex items-center gap-2">
                        <img
                          src={q.optionImages[oIndex]}
                          alt={`Option ${OPTION_LABELS[oIndex]} preview`}
                          className="h-14 w-20 rounded object-cover border"
                        />
                        <button
                          type="button"
                          className={`${buttonOutline} h-8 px-3 text-xs`}
                          onClick={() => clearOptionImage(qIndex, oIndex)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click a letter to mark it as the correct answer
              </p>
            </div>
          </div>
        ))}
      </div>

      <button className={`${buttonOutline} self-center gap-2`} onClick={addQuestion}>
        <Plus className="size-4" />
        Add Question
      </button>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button className={buttonOutline} onClick={onCancel}>
          Cancel
        </button>
        <button className={buttonDefault} onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : `Save Quiz (${questions.length} questions)`}
        </button>
      </div>
    </div>
  )
}
