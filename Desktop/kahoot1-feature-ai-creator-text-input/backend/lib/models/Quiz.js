import mongoose, { Schema } from "mongoose"

export const QuestionSchema = new Schema({
  question: { type: String, required: true },
  questionImage: { type: String, default: "" },
  options: { type: [String], required: true, minlength: 4, maxlength: 4 },
  optionImages: {
    type: [String],
    default: ["", "", "", ""],
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length === 4,
      message: "optionImages must contain exactly 4 items",
    },
  },
  correctAnswer: { type: Number, required: true, min: 0, max: 3 },
  timeLimit: { type: Number, required: true, min: 5, max: 120, default: 30 },
})

const quizSchema = new Schema(
  {
    title: { type: String, required: true },
    createdBy: { type: String, required: true },
    questions: { type: [QuestionSchema], required: true, default: [] },
  },
  { timestamps: true }
)

export const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema)
