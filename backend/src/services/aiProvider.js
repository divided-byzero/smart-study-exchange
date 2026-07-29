/**
 * IAIProvider abstraction (Section 3.2 of the SDD — Dependency Inversion Principle).
 * NoteService and QuizService depend on this abstract interface rather than a
 * concrete vendor SDK, so the underlying LLM can be swapped by changing only
 * this file.
 *
 * Current concrete implementation: xAI's Grok API (OpenAI-compatible chat
 * completions format). Get a key at https://console.x.ai
 */

const API_KEY = process.env.GROK_API_KEY;
const MODEL = process.env.GROK_MODEL || 'grok-3-mini';

const BASE_URL = 'https://api.x.ai/v1';

function ensureConfigured() {
  if (!API_KEY) {
    const err = new Error('AI provider not configured: set GROK_API_KEY in the environment.');
    err.statusCode = 503;
    throw err;
  }
}

/**
 * Low-level call to Grok's OpenAI-compatible chat completions endpoint.
 */
async function callGrok({ systemInstruction, userContent, maxTokens = 1500 }) {
  ensureConfigured();

  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: userContent });

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const err = new Error(`Grok API request failed (${response.status}): ${errText.slice(0, 300)}`);
    err.statusCode = response.status === 429 ? 429 : 502;
    throw err;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    const err = new Error('Grok returned no content in its response.');
    err.statusCode = 502;
    throw err;
  }

  return content.trim();
}

function stripJsonFences(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
}

/**
 * Summarize raw note text into a structured, student-friendly summary.
 */
async function summarizeText(rawText, { title = 'Untitled' } = {}) {
  const systemInstruction =
    'You are an academic note summarizer for university students. Produce clear, ' +
    'structured study notes in Markdown with headings, bullet points, and bolded ' +
    'key terms. Keep it faithful to the source material — do not invent facts.';

  const userContent = `Summarize the following lecture/note material titled "${title}" into structured study notes:\n\n${rawText.slice(0, 30000)}`;

  return callGrok({ systemInstruction, userContent, maxTokens: 1500 });
}

/**
 * Generate a multiple-choice quiz from note text or a summary.
 * Returns an array of { question_text, options: string[4], correct_option: number }.
 */
async function generateQuiz(sourceText, { count = 5 } = {}) {
  const systemInstruction =
    'You generate multiple-choice practice quizzes from study material. ' +
    'Respond with ONLY valid JSON — no markdown fences, no preamble — matching this shape: ' +
    '{"questions": [{"question_text": string, "options": [string, string, string, string], "correct_option": number}]}. ' +
    'correct_option is a zero-based index into options.';

  const userContent = `Generate exactly ${count} multiple-choice questions from this material:\n\n${sourceText.slice(0, 25000)}`;

  const text = await callGrok({ systemInstruction, userContent, maxTokens: 2000 });
  const parsed = JSON.parse(stripJsonFences(text));
  return parsed.questions || [];
}

/**
 * Evaluate a free-text answer against the expected answer (used when a
 * quiz question isn't strictly multiple-choice, e.g. short answer mode).
 */
async function evaluateAnswer(question, correctAnswer, studentAnswer) {
  const systemInstruction =
    'You grade a single quiz answer. Respond with ONLY valid JSON: ' +
    '{"is_correct": boolean, "feedback": string}. feedback is one short encouraging sentence.';

  const userContent = `Question: ${question}\nExpected answer: ${correctAnswer}\nStudent answer: ${studentAnswer}`;

  const text = await callGrok({ systemInstruction, userContent, maxTokens: 300 });
  return JSON.parse(stripJsonFences(text));
}

/**
 * Predict a fair resale price for a used textbook.
 */
async function predictBookPrice({ title, author, condition, department, originalPrice }) {
  const systemInstruction =
    'You estimate a fair resale price in BDT (Bangladeshi Taka) for a used university ' +
    'textbook based on its condition and typical depreciation. Respond with ONLY valid JSON: ' +
    '{"predicted_price": number, "reasoning": string}.';

  const userContent = `Title: ${title}\nAuthor: ${author || 'Unknown'}\nDepartment: ${department || 'Unknown'}\nCondition: ${condition}\nOriginal/list price if known: ${originalPrice || 'unknown'}`;

  const text = await callGrok({ systemInstruction, userContent, maxTokens: 200 });
  return JSON.parse(stripJsonFences(text));
}

/**
 * Generate a vector embedding for semantic search.
 *
 * xAI does not currently offer a public embeddings endpoint, so this always
 * throws — callers (searchStrategies.js) already catch this and fall back to
 * Postgres keyword search automatically. Smart search will simply behave as
 * keyword search until an embeddings-capable provider is configured.
 */
async function generateEmbedding() {
  const err = new Error('Embeddings not supported by the current AI provider (Grok/xAI). Falling back to keyword search.');
  err.statusCode = 503;
  throw err;
}

module.exports = {
  summarizeText,
  generateQuiz,
  evaluateAnswer,
  predictBookPrice,
  generateEmbedding,
  isConfigured: () => Boolean(API_KEY),
};
