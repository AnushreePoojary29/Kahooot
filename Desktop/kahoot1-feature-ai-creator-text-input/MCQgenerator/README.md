# MCQ Generator (RAG-based)

This repository demonstrates a simple **Retrieval-Augmented Generation (RAG)** workflow for generating multiple-choice questions (MCQs) from user-provided text or documents. It exposes a REST API to upload content, generate questions, and retrieve them later.

---

## 🗂 Project Structure

```
mcq-generator/
├── src/
│   ├── controllers/
│   │   ├── mcqController.js
│   │   └── uploadController.js
│   ├── routes/
│   │   ├── mcq.js
│   │   └── upload.js
│   ├── services/
│   │   └── ragService.js
│   ├── utils/
│   │   ├── db.js            # simple in-memory vector store
│   │   └── textUtils.js     # PDF parsing, chunking logic
│   └── index.js             # Express server entrypoint
├── .env.example
├── package.json
└── README.md
```

> ⚠️ In production, replace the in-memory store with a real vector database (Pinecone, Weaviate, Redis, etc.) and handle persistence.

---

## 🛠 Installation

1. **Clone or copy** this structure into your project.
2. Install dependencies:
   ```bash
   cd "MCQ generator"
   npm install
   ```
3. Create a `.env` file from the example and configure Ollama:
   ```text
   OLLAMA_HOST=http://localhost:11434      # or your remote host
  EMBEDDING_MODEL=nomic-embed-text        # name of embedding model
  GENERATION_MODEL=llama3.2:1b            # generation model
  PORT=3001
   ```
   > traditional OpenAI API key is **not** required when using Ollama.
4. Start the server:
   ```bash
   npm run dev   # requires nodemon
   ```

---

## 📦 Required Packages

- `express` – web framework
- `body-parser` – JSON parsing middleware
- `multer` – multipart support (file uploads)
- `dotenv` – environment variable loader
- `openai` – official OpenAI SDK
- `pdf-parse` – PDF-to-text conversion
- `axios` – optional HTTP client (for external calls)

Install with:
```bash
npm install express body-parser multer dotenv openai pdf-parse axios
``` 

---

## 🔁 RAG Pipeline Example

1. **Upload content** (`POST /upload`): accepts raw text in JSON or a file (`multipart/form-data` with field `file`).
2. **Content is split** into chunks (`textUtils.chunkText`).
3. **Embeddings** are generated via `openai.createEmbedding` and stored by `db.addEmbedding`.
4. **Similarity search** when generating MCQs uses cosine distance (`db.queryEmbedding`).
5. Prompt with retrieved context sent to the LLM for question generation.

### sample prompt used for MCQ generation
```text
You are an assistant that creates 5 multiple choice questions based on the following context:

<insert retrieved context here>

Each question should be returned in JSON with keys question, options, correct_answer and explanation.
```

---

## 📡 API Endpoints

| Method | Path            | Description                                 |
|--------|-----------------|---------------------------------------------|
| POST   | `/upload`        | Upload text or PDF (field `text` or `file`) |
| POST   | `/generate-mcq`  | Trigger MCQ creation (optional query body)  |
| GET    | `/generate-mcq`  | Retrieve cached/generated MCQs             |

### Example `curl` calls

Upload text:
```bash
curl -X POST http://localhost:3001/upload \
  -H "Content-Type: application/json" \
  -d '{"text":"OpenAI develops AI models."}'
```

Upload PDF:
```bash
curl -X POST http://localhost:3001/upload \
  -F "file=@/path/to/doc.pdf"
```

Generate MCQs (all text):
```bash
curl -X POST http://localhost:3001/generate-mcq \
  -H "Content-Type: application/json" \
  -d '{"count":3}'
```

Generate MCQs for a query:
```bash
curl -X POST http://localhost:3001/generate-mcq \
  -H "Content-Type: application/json" \
  -d '{"query":"quantum mechanics"}'
```

Retrieve MCQs:
```bash
curl http://localhost:3001/generate-mcq
```

> 💡 Use Postman or any HTTP client; the structure is identical.

---

## 🔄 JSON Output Format

All MCQs returned by the model should match the following schema:

```json
{
  "question": "",
  "options": {
    "A": "",
    "B": "",
    "C": "",
    "D": ""
  },
  "correct_answer": "",
  "explanation": ""
}
```

You can parse the LLM output and convert it into an array of the above objects before caching or returning to the client.

---

## 🧩 Integration Tips

- The service code is modular (`controllers`, `services`, `utils`) so you can plug individual pieces into an existing Express app.
- Convert `db.js` logic to interface with your existing vector store; keep the same `addEmbedding`/`queryEmbedding` API.
- Change prompt templates or switch to Chat completions (`openai.createChatCompletion`) if preferred.
- Environment variables manage keys and configuration; load them early using `dotenv`.

---

This scaffold should help you get started quickly with an MCQ generation API that follows the RAG workflow. Adjust models, splitting strategy, and storage as needed for your use case.
