const pdf = require("pdf-parse");

function chunkText(text, maxChars = 1200, overlapChars = 200) {
  const normalized = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    if (current.length + 2 + paragraph.length <= maxChars) {
      current = `${current}\n\n${paragraph}`;
      continue;
    }

    chunks.push(current);

    const overlap = current
      .slice(Math.max(0, current.length - overlapChars))
      .trim();
    current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;

    if (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars - overlapChars).trim();
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((c) => c.trim()).filter(Boolean);
}

async function parsePDF(buffer) {
  try {
    const data = await pdf(buffer);
    const text = (data.text || "").trim();
    if (!text) {
      throw new Error("PDF has no extractable text");
    }
    return text;
  } catch (error) {
    throw new Error(
      `PDF parsing failed: ${error.message || "Unknown PDF error"}`,
    );
  }
}

module.exports = {
  chunkText,
  parsePDF,
};
