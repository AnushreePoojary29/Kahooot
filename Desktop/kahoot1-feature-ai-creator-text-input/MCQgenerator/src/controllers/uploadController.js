const ragService = require("../services/ragService");
const textUtils = require("../utils/textUtils");

async function uploadHandler(req, res) {
  try {
    const { text } = req.body;
    const namespace =
      typeof req.body?.namespace === "string" ? req.body.namespace : "default";

    if (text) {
      await ragService.processTextContentForNamespace(text, namespace, true);
      return res.json({ status: "ok", message: "Text processed" });
    }
    if (req.file) {
      // assume PDF
      const pdfText = await textUtils.parsePDF(req.file.buffer);
      await ragService.processTextContentForNamespace(pdfText, namespace, true);
      return res.json({ status: "ok", message: "PDF processed" });
    }
    return res.status(400).json({ error: "No text or file provided" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        error: "Processing failed",
        details: err.message || String(err),
      });
  }
}

module.exports = {
  uploadHandler,
};
