# Excel Quiz Import Guide

## Overview
The Excel upload feature allows you to quickly import quiz questions from an Excel file (.xlsx or .xls) instead of manually creating each question.

## Excel Format

Your Excel file must have the following columns in this exact order:

| Column Name | Description | Example |
|---|---|---|
| Question | The quiz question text | "What is the capital of France?" |
| Option A | First answer option | "London" |
| Option B | Second answer option | "Berlin" |
| Option C | Third answer option | "Paris" |
| Option D | Fourth answer option | "Madrid" |
| Correct Option | The correct answer (must be A, B, C, or D) | "C" |

## Step-by-Step Instructions

### 1. Create Your Excel File
Create a new Excel workbook (.xlsx) with the following structure:

```
| Question | Option A | Option B | Option C | Option D | Correct Option |
|----------|----------|----------|----------|----------|----------------|
| What is 2+2? | 2 | 3 | 4 | 5 | C |
| Which planet is closest to the sun? | Venus | Mercury | Mars | Earth | B |
```

### 2. Access the Import Page
- Go to your Dashboard
- Click the **"Import"** button (or **"Import Quiz"** button next to "Create Quiz")
- Select **"Import from Excel"** option

### 3. Upload Your File
- Choose between:
  - **Drag and drop** your Excel file onto the upload area
  - **Click to browse** and select the file from your computer
- Enter a **Quiz Title**
- Click **"Import Quiz"**

### 4. Verify Your Questions
- Review the imported questions and their correct answers
- Questions with green highlights are marked as correct
- If there are any skipped rows (invalid entries), they will be listed

### 5. Complete
Your quiz is now created and ready to use! You can:
- Return to the dashboard
- Import another quiz
- Start a game with your new quiz

## Important Notes

### Valid Format Requirements
✅ **Must Have:**
- All 6 columns present (Question, Option A, B, C, D, Correct Option)
- Non-empty values in all columns
- Correct Option must be exactly: `A`, `B`, `C`, or `D`

❌ **Invalid (will skip the row):**
- Missing any column
- Empty Question or Options
- Correct Option with values like "1", "First", "Third Option", etc.
- Special characters or extra spaces (will be trimmed automatically)

### File Size Limits
- Maximum file size: **10 MB**
- Maximum questions per file: Unlimited (but reasonable for performance)

### Column Order Matters
The columns must be in this exact order:
1. Question
2. Option A
3. Option B
4. Option C
5. Option D
6. Correct Option

### Example Excel File Structure

**Sheet Name:** Questions (can be any name - first sheet is used)

| Question | Option A | Option B | Option C | Option D | Correct Option |
|----------|----------|----------|----------|----------|----------------|
| What is the capital of France? | London | Berlin | Paris | Madrid | C |
| How many sides does a triangle have? | 2 | 3 | 4 | 5 | B |
| Which programming language is known for web development? | Python | JavaScript | C++ | Java | B |
| What does HTML stand for? | Hypertext Markup Language | High Tech Modern Language | Home Tool Markup Language | Hyperlinks and Text Markup Language | A |
| What is 10 × 5? | 30 | 40 | 50 | 60 | C |

## Troubleshooting

### "File must be an Excel file (.xlsx or .xls)"
- Ensure your file has the correct extension (.xlsx or .xls)
- Don't use .csv, .txt, or other formats

### "File size must be less than 10MB"
- Your file is too large
- Try splitting it into multiple files

### "Excel sheet has no data rows"
- Your Excel file has headers but no data below
- Add at least one question row

### "No valid questions found in Excel file"
- All rows were skipped due to validation errors
- Check the error messages for which rows are invalid
- Ensure all required columns are present and filled

### "Correct Option must be A, B, C, or D"
- The Correct Option column contains invalid values
- Use only: `A`, `B`, `C`, or `D` (uppercase)
- Don't use: `1`, `Option A`, `First`, etc.

### Questions imported but some rows skipped
- The import shows which rows had issues
- Fix those rows and re-import
- Valid rows are saved, invalid ones are skipped

## Best Practices

1. **Test with a small file first** - Import 2-3 questions to verify your format
2. **Use consistent formatting** - Avoid extra spaces and special characters
3. **Keep options concise** - Very long options display poorly in the quiz
4. **Double-check correct answers** - Verify before importing
5. **Use clear questions** - Ambiguous questions confuse players

## Example Template

Download and use this template to get started:

```excel
| Question | Option A | Option B | Option C | Option D | Correct Option |
|----------|----------|----------|----------|----------|----------------|
| [Replace with your question] | [Answer 1] | [Answer 2] | [Answer 3] | [Answer 4] | [A/B/C/D] |
```

## Need Help?

If you encounter issues:
1. Check the validation error message
2. Verify your Excel format matches the examples above
3. Ensure the Correct Option column uses only A, B, C, or D
4. Try creating a quiz manually to compare the structure
5. Contact support if problems persist
