// A very basic in-memory vector store for demonstration purposes.
// In production you'd use a proper vector database like Pinecone, Weaviate, or Redis.

const vectors = [];

function normalizeNamespace(namespace) {
  const value = String(namespace || "").trim();
  return value || "default";
}

function addEmbedding(id, embedding, text, namespace = "default") {
  vectors.push({
    id,
    embedding,
    text,
    namespace: normalizeNamespace(namespace),
  });
}

function cosineSimilarity(a, b) {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b) ||
    a.length === 0 ||
    b.length === 0
  ) {
    return 0;
  }
  if (a.length !== b.length) {
    return 0;
  }
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (!magA || !magB) {
    return 0;
  }
  return dot / (magA * magB);
}

function queryEmbedding(queryVec, topK = 5, namespace = "default") {
  const scope = normalizeNamespace(namespace);
  const scopedVectors = vectors.filter((item) => item.namespace === scope);

  if (!Array.isArray(queryVec) || queryVec.length === 0) {
    return scopedVectors.slice(-topK).reverse();
  }

  const scored = scopedVectors.map((v) => ({
    ...v,
    score: cosineSimilarity(queryVec, v.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function clearNamespace(namespace = "default") {
  const scope = normalizeNamespace(namespace);
  for (let i = vectors.length - 1; i >= 0; i--) {
    if (vectors[i].namespace === scope) {
      vectors.splice(i, 1);
    }
  }
}

module.exports = {
  addEmbedding,
  queryEmbedding,
  clearNamespace,
};
