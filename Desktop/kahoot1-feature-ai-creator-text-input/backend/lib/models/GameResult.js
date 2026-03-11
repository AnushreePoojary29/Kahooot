import mongoose, { Schema } from "mongoose"

const AnswerSchema = new Schema(
  {
    playerId: { type: String, required: true },
    questionIndex: { type: Number, required: true },
    answerIndex: { type: Number, required: true },
    responseTimeMs: { type: Number, required: true },
    score: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    submittedAt: { type: Date, required: true },
  },
  { _id: false }
)

const PlayerResultSchema = new Schema(
  {
    playerId: { type: String, required: true },
    nickname: { type: String, required: true },
    totalScore: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    avgResponseTime: { type: Number, required: true },
    answers: { type: [AnswerSchema], default: [] },
  },
  { _id: false }
)

const PlayerSchema = new Schema(
  {
    id: { type: String, required: true },
    nickname: { type: String, required: true },
    score: { type: Number, required: true, default: 0 },
    joinedAt: { type: Date, required: true },
  },
  { _id: false }
)

const QuestionSnapshotSchema = new Schema(
  {
    questionIndex: { type: Number, required: true },
    text: { type: String, default: "" },
    options: { type: [String], default: [] },
  },
  { _id: false }
)

const gameResultSchema = new Schema(
  {
    gameId: { type: String, required: true, unique: true, index: true },
    pin: { type: String },
    quizId: { type: String, required: true, index: true },
    quizTitle: { type: String, default: "" },
    professorId: { type: String, required: true, index: true },
    status: { type: String, required: true, default: "finished" },
    questionCount: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    players: { type: [PlayerSchema], default: [] },
    playerResults: { type: [PlayerResultSchema], default: [] },
    questionSnapshots: { type: [QuestionSnapshotSchema], default: [] },
  },
  { timestamps: true }
)

export const GameResult = mongoose.models.GameResult || mongoose.model("GameResult", gameResultSchema)
