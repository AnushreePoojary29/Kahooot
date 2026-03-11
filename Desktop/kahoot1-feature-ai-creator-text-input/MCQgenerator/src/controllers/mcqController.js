const ragService = require("../services/ragService");

async function generateHandler(req, res) {
  try {
    const { query, count, subject, tone, namespace } = req.body;
    const scope = typeof namespace === "string" ? namespace : "default";
    let result;
    if (query) {
      result = await ragService.searchAndGenerate(
        query,
        count || 5,
        subject,
        tone,
        scope,
      );
    } else {
      result = await ragService.generateMCQs(count || 5, subject, tone, scope);
    }
    // result is text, assume JSON lines or array
    res.send(result);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        error: "Generation failed",
        details: err.message || String(err),
      });
  }
}

let cachedMCQs = [];
function cacheHandler(req, res) {
  res.json(cachedMCQs);
}

module.exports = {
  generateHandler,
  cacheHandler,
};
