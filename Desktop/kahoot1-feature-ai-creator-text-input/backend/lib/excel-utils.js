import { utils, write } from "xlsx"

export function generateExcelTemplate() {
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
      Question: "What is 2 + 2?",
      "Option A": "2",
      "Option B": "3",
      "Option C": "4",
      "Option D": "5",
      "Correct Option": "C",
    },
    {
      Question: "Which planet is closest to the sun?",
      "Option A": "Venus",
      "Option B": "Mercury",
      "Option C": "Mars",
      "Option D": "Earth",
      "Correct Option": "B",
    },
  ]

  const worksheet = utils.json_to_sheet(sampleData)

  worksheet["!cols"] = [
    { wch: 40 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
  ]

  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, "Questions")

  return write(workbook, { bookType: "xlsx", type: "buffer" })
}

export function validateExcelStructure(headers) {
  const requiredColumns = ["Question", "Option A", "Option B", "Option C", "Option D", "Correct Option"]
  const missingColumns = requiredColumns.filter((col) => !headers.includes(col))

  return {
    valid: missingColumns.length === 0,
    missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
  }
}
