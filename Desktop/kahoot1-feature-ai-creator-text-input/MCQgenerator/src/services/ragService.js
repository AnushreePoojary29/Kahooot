const axios = require("axios");
const textUtils = require("../utils/textUtils");
const db = require("../utils/db");

// We'll talk to an ollama server; default to localhost:11434
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
let shouldSkipRemoteEmbedding = false;
let loggedEmbeddingFallback = false;
let resolvedGenerationModelCache = "";
let warnedGenerationModelFallback = false;

function parseModelTagScore(name) {
  const value = sanitizeLine(name).toLowerCase();
  const match = value.match(/(\d+(?:\.\d+)?)b/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number.parseFloat(match[1]);
}

function isGenerationCapableModel(name) {
  const value = sanitizeLine(name).toLowerCase();
  if (!value) return false;

  // Filter out common embedding-only model names.
  if (value.includes("embed") || value.includes("embedding")) {
    return false;
  }

  return true;
}

function sanitizeLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNamespace(namespace) {
  const value = sanitizeLine(namespace);
  return value || "default";
}

function normalizeTone(tone) {
  const t = sanitizeLine(tone).toLowerCase();
  if (["easy", "medium", "hard"].includes(t)) return t;
  return "medium";
}

async function getAvailableOllamaModels() {
  try {
    const response = await axios.get(`${OLLAMA_HOST}/api/tags`, {
      timeout: 20000,
    });

    const models = Array.isArray(response?.data?.models)
      ? response.data.models
          .map((item) => ({
            name: sanitizeLine(item?.name),
            size: Number.isFinite(item?.size)
              ? Number(item.size)
              : Number.MAX_SAFE_INTEGER,
          }))
          .filter((item) => item.name)
      : [];

    const deduped = [];
    const seen = new Set();
    for (const model of models) {
      if (seen.has(model.name)) continue;
      seen.add(model.name);
      deduped.push(model);
    }
    return deduped;
  } catch (_error) {
    return [];
  }
}

function pickSmallestModel(models, exclude = []) {
  const blocked = new Set(exclude.map((value) => sanitizeLine(value)));

  const sorted = [...models].sort((a, b) => {
    if (a.size !== b.size) return a.size - b.size;
    return parseModelTagScore(a.name) - parseModelTagScore(b.name);
  });

  const selected = sorted.find((item) => !blocked.has(item.name));
  return selected ? selected.name : "";
}

async function resolveGenerationModel() {
  if (resolvedGenerationModelCache) {
    return resolvedGenerationModelCache;
  }

  const configured = sanitizeLine(
    process.env.GENERATION_MODEL || "llama3:latest",
  );
  const available = await getAvailableOllamaModels();
  const generationCandidates = available.filter((item) =>
    isGenerationCapableModel(item.name),
  );
  const availableNames = generationCandidates.map((item) => item.name);

  if (availableNames.length === 0) {
    resolvedGenerationModelCache = configured;
    return resolvedGenerationModelCache;
  }

  if (availableNames.includes(configured)) {
    resolvedGenerationModelCache = configured;
    return resolvedGenerationModelCache;
  }

  const preferredFallbacks = [
    "llama3:latest",
    "llama3.1:8b",
    "qwen2.5:7b-instruct",
    "mistral:7b-instruct",
  ];

  const selected =
    preferredFallbacks.find((model) => availableNames.includes(model)) ||
    pickSmallestModel(generationCandidates) ||
    configured;

  if (!warnedGenerationModelFallback) {
    console.warn(
      `Configured generation model '${configured}' is unavailable. Using '${selected}' instead.`,
    );
    warnedGenerationModelFallback = true;
  }

  resolvedGenerationModelCache = selected;
  return resolvedGenerationModelCache;
}

function extractJsonValue(rawText) {
  if (rawText && typeof rawText === "object") {
    return rawText;
  }

  const text = String(rawText || "").trim();
  if (!text) {
    throw new Error("Generation returned empty output");
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = text.slice(firstBrace, lastBrace + 1);
      return JSON.parse(slice);
    }
    throw new Error("Failed to parse generated JSON");
  }
}

function normalizeOptions(rawOptions) {
  if (!rawOptions || typeof rawOptions !== "object") {
    return null;
  }

  const options = ["a", "b", "c", "d"].map((key) =>
    sanitizeLine(rawOptions[key] || rawOptions[key.toUpperCase()]),
  );
  if (options.some((opt) => !opt)) {
    return null;
  }

  const unique = new Set(options.map((opt) => opt.toLowerCase()));
  if (unique.size < 4) {
    return null;
  }

  return {
    a: options[0],
    b: options[1],
    c: options[2],
    d: options[3],
  };
}

function normalizeCorrect(rawCorrect, options) {
  const normalized = sanitizeLine(rawCorrect).toLowerCase();
  if (["a", "b", "c", "d"].includes(normalized)) {
    return normalized;
  }

  if (normalized) {
    const pairs = Object.entries(options);
    const found = pairs.find(([, value]) => value.toLowerCase() === normalized);
    if (found) {
      return found[0];
    }
  }

  return "a";
}

function normalizeGeneratedMcqs(rawGenerated, questionCount) {
  const parsed = extractJsonValue(rawGenerated);
  const list = Array.isArray(parsed)
    ? parsed
    : Object.keys(parsed || {})
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => parsed[key]);

  const usedStems = new Set();
  const cleaned = [];

  for (const item of list) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const mcq = sanitizeLine(item.mcq || item.question || item.text);
    const options = normalizeOptions(item.options || {});
    if (!mcq || !options) {
      continue;
    }

    const normalizedStem = mcq
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .trim();
    if (!normalizedStem || usedStems.has(normalizedStem)) {
      continue;
    }
    usedStems.add(normalizedStem);

    cleaned.push({
      mcq,
      options,
      correct: normalizeCorrect(
        item.correct || item.answer || item.correct_answer,
        options,
      ),
    });

    if (cleaned.length >= questionCount) {
      break;
    }
  }

  if (!cleaned.length) {
    throw new Error("Model output did not include valid MCQs");
  }

  const result = {};
  for (let i = 0; i < cleaned.length; i++) {
    result[String(i + 1)] = cleaned[i];
  }

  return JSON.stringify(result);
}

function buildPrompt({ context, query, questionCount, subject, tone }) {
  const safeSubject = sanitizeLine(subject || "general studies");
  const safeQuery = sanitizeLine(query);
  const safeTone = normalizeTone(tone);
  const hasContext = Boolean(sanitizeLine(context));

  return `You are an expert assessment designer for professors.

Task:
- Generate exactly ${questionCount} unique multiple-choice questions.
- Audience subject: ${safeSubject}.
- Difficulty: ${safeTone}.
${safeQuery ? `- Topic focus: ${safeQuery}.` : "- Topic focus: infer from the provided context."}

Quality rules:
- Every question must be different in concept.
- Avoid repetitive stems and avoid "Which statement best matches..." patterns.
- Each question must have 4 distinct options (a,b,c,d).
- Exactly one option must be correct.
- Distractors must be plausible and non-trivial.
- Use concise, clear language suitable for classroom use.

Grounding rules:
${hasContext ? "- Use the provided CONTEXT as primary source." : "- If context is minimal, still generate meaningful topic-relevant academic MCQs."}
- Do not mention "context" or "document" in question wording.
- Do not include explanations.

Return format:
- Return ONLY valid JSON object.
- Top-level keys must be "1" .. "${questionCount}".
- Each item must match:
  {"mcq":"...","options":{"a":"...","b":"...","c":"...","d":"..."},"correct":"a|b|c|d"}

CONTEXT:
${context || "(no context provided)"}`;
}

function localEmbeddingFallback(text, dims = 128) {
  const vector = Array.from({ length: dims }, () => 0);
  const normalized = String(text || "");

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    vector[i % dims] += (code % 97) / 97;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) {
    return vector;
  }
  return vector.map((value) => value / norm);
}

async function requestEmbeddingFromOllama(text) {
  const model = process.env.EMBEDDING_MODEL || "nomic-embed-text";
  const payload = { model, input: text };

  try {
    const resp = await axios.post(`${OLLAMA_HOST}/v1/embeddings`, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 60000,
    });

    const vector = resp?.data?.data?.[0]?.embedding;
    if (Array.isArray(vector) && vector.length > 0) {
      return vector;
    }
  } catch (_firstError) {
    // Fall through to /api/embeddings for older Ollama compatibility.
  }

  const resp = await axios.post(
    `${OLLAMA_HOST}/api/embeddings`,
    { model, prompt: text },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 60000,
    },
  );
  const vector = resp?.data?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Embedding response missing vector data");
  }
  return vector;
}

async function embedText(text) {
  if (shouldSkipRemoteEmbedding) {
    return localEmbeddingFallback(text);
  }

  try {
    return await requestEmbeddingFromOllama(text);
  } catch (error) {
    shouldSkipRemoteEmbedding = true;
    if (!loggedEmbeddingFallback) {
      console.warn(
        "Embedding fallback enabled (remote embedding unavailable):",
        error.message || error,
      );
      loggedEmbeddingFallback = true;
    }
    return localEmbeddingFallback(text);
  }
}

async function processTextContent(content) {
  const namespace = "default";
  await processTextContentForNamespace(content, namespace, true);
}

async function processTextContentForNamespace(
  content,
  namespace = "default",
  reset = true,
) {
  const scope = normalizeNamespace(namespace);

  if (reset) {
    db.clearNamespace(scope);
  }

  // split into chunks and create embeddings
  const chunks = textUtils.chunkText(content);
  if (!chunks.length) {
    throw new Error("No text chunks found for processing");
  }
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk);
    db.addEmbedding(`${Date.now()}-${i}`, embedding, chunk, scope);
  }
}

async function callGenerationModel(fullPrompt, questionCount) {
  const postPayload = async (modelName, strictJson = false) => {
    const prompt = strictJson
      ? `${fullPrompt}\n\nIMPORTANT OUTPUT RULES:\n- Return strict JSON only.\n- No markdown or code fences.\n- No extra commentary.\n- No trailing commas.\n- Include exactly ${questionCount} items.`
      : fullPrompt;

    return axios.post(
      `${OLLAMA_HOST}/api/generate`,
      {
        model: modelName,
        prompt,
        stream: false,
        format: "json",
        options: {
          num_predict: 1400,
          temperature: strictJson ? 0.2 : 0.45,
          top_p: 0.9,
        },
      },
      { headers: { "Content-Type": "application/json" }, timeout: 300000 },
    );
  };

  const parseOutput = (responsePayload) => {
    const normalized = normalizeGeneratedMcqs(
      responsePayload?.data?.response,
      questionCount,
    );

    const parsed = JSON.parse(normalized);
    const count = Object.keys(parsed).length;
    if (count < questionCount) {
      throw new Error(
        `Model returned ${count} questions; expected ${questionCount}`,
      );
    }

    return normalized;
  };

  const primaryModel = await resolveGenerationModel();
  let resp;

  try {
    resp = await postPayload(primaryModel, false);
    try {
      return parseOutput(resp);
    } catch (_parseError) {
      const strictResp = await postPayload(primaryModel, true);
      return parseOutput(strictResp);
    }
  } catch (error) {
    const details = JSON.stringify(error?.response?.data || {});
    const modelNotFound = details.toLowerCase().includes("not found");
    const memoryLimit = details
      .toLowerCase()
      .includes("requires more system memory");

    if (!modelNotFound && !memoryLimit) {
      throw error;
    }

    // Clear cache and try one more model resolution in case Ollama models changed at runtime.
    resolvedGenerationModelCache = "";

    let retryModel = await resolveGenerationModel();
    if (memoryLimit) {
      const available = await getAvailableOllamaModels();
      const generationCandidates = available.filter((item) =>
        isGenerationCapableModel(item.name),
      );
      const smaller = pickSmallestModel(generationCandidates, [primaryModel]);
      if (smaller) {
        retryModel = smaller;
      }
    }

    resp = await postPayload(retryModel, false);
    try {
      return parseOutput(resp);
    } catch (_parseError) {
      const strictResp = await postPayload(retryModel, true);
      return parseOutput(strictResp);
    }
  }
}

async function generateMCQs(
  questionCount = 5,
  subject = "general",
  tone = "neutral",
  namespace = "default",
) {
  const scope = normalizeNamespace(namespace);
  const context = db
    .queryEmbedding([], 15, scope)
    .map((c) => c.text)
    .join("\n");
  const fullPrompt = buildPrompt({ context, questionCount, subject, tone });

  try {
    return await callGenerationModel(fullPrompt, questionCount);
  } catch (error) {
    const details = error?.response?.data
      ? JSON.stringify(error.response.data)
      : error.message || String(error);
    throw new Error(`MCQ generation failed: ${details}`);
  }
}

async function searchAndGenerate(
  query,
  questionCount = 5,
  subject = "general",
  tone = "neutral",
  namespace = "default",
) {
  const scope = normalizeNamespace(namespace);
  const qVec = await embedText(query);
  const nearest = db.queryEmbedding(qVec, 12, scope);
  const context = nearest.map((n) => n.text).join("\n");
  const fullPrompt = buildPrompt({
    context,
    query,
    questionCount,
    subject,
    tone,
  });
  try {
    return await callGenerationModel(fullPrompt, questionCount);
  } catch (error) {
    const details = error?.response?.data
      ? JSON.stringify(error.response.data)
      : error.message || String(error);
    throw new Error(`Search-based MCQ generation failed: ${details}`);
  }
}

module.exports = {
  processTextContent,
  processTextContentForNamespace,
  generateMCQs,
  searchAndGenerate,
};
