/**
 * IAIProvider abstraction (Section 3.2 of the SDD — Dependency Inversion Principle).
 * NoteService and QuizService depend on this abstract interface rather than a
 * concrete vendor SDK, so the underlying LLM can be swapped by changing only
 * this file.
 *
 * Current concrete implementation: Google Gemini API (free tier available —
 * no credit card / prepaid credit required, unlike the Anthropic or OpenAI APIs).
 * Get a free key at https://aistudio.google.com/app/apikey
 */

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function ensureConfigured() {
  if (!API_KEY) {
    const err = new Error('AI provider not configured: set GEMINI_API_KEY in the environment.');
    err.statusCode = 503;
    throw err;
  }
}

/**
 * Low-level call to Gemini's generateContent endpoint.
 */
async function callGemini({ systemInstruction, userContent, maxOutputTokens = 1500 }) {
  ensureConfigured();

  const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: { maxOutputTokens, temperature: 0.4 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const err = new Error(`Gemini API request failed (${response.status}): ${errText.slice(0, 300)}`);
    err.statusCode = response.status === 429 ? 429 : 502;
    throw err;
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  if (!candidate) {
    const err = new Error('Gemini returned no candidates (the response may have been blocked by safety filters).');
    err.statusCode = 502;
    throw err;
  }

  return (candidate.content?.parts || []).map((p) => p.text || '').join('\n').trim();
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

  return callGemini({ systemInstruction, userContent, maxOutputTokens: 1500 });
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

  const text = await callGemini({ systemInstruction, userContent, maxOutputTokens: 2000 });
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

  const text = await callGemini({ systemInstruction, userContent, maxOutputTokens: 300 });
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

  const text = await callGemini({ systemInstruction, userContent, maxOutputTokens: 200 });
  return JSON.parse(stripJsonFences(text));
}

/**
 * Generate a vector embedding for semantic search.
 * Uses Gemini's free embedding endpoint — same GEMINI_API_KEY as everything else,
 * so no separate Voyage AI account is needed. Falls back gracefully if not configured
 * (caller should catch and use keyword search instead).
 */
async function generateEmbedding(text) {
  ensureConfigured();

  const url = `${BASE_URL}/models/${EMBEDDING_MODEL}:embedContent?key=${API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text: text.slice(0, 8000) }] },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini embeddings request failed (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

module.exports = {
  summarizeText,
  generateQuiz,
  evaluateAnswer,
  predictBookPrice,
  generateEmbedding,
  isConfigured: () => Boolean(API_KEY),
};
