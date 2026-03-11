const axios = require('axios');
const OLLAMA_HOST = 'http://localhost:11434';
const prompt = `You are an assistant that creates 1 multiple choice questions based on the following context:\n\nOpenAI develops AI models.\n\nEach question should be returned in JSON with keys question, options and correct_answer.`;

async function run() {
  const resp = await axios.post(
    `${OLLAMA_HOST}/v1/completions`,
    {
      model: 'llama3:latest',
      prompt: prompt,
      max_tokens: 1000,
      temperature: 0.7,
      format: 'json'
    },
    { headers: { 'Content-Type': 'application/json' } }
  );
  console.log(resp.data.choices[0].text);
}
run();
