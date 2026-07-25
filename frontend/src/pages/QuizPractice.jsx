import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ListChecks, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import api from '../services/api';

export default function QuizPractice() {
  const { quizId } = useParams();
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Because /quizzes/generate returns the questions at creation time, and there's
  // no separate GET /quizzes/:id/questions route on the backend, we rely on the
  // questions having been passed via navigation state when coming from NoteDetails.
  // As a resilient fallback (e.g. page refresh), we show a friendly message.
  useEffect(() => {
    const stored = sessionStorage.getItem(`quiz:${quizId}`);
    if (stored) {
      setQuestions(JSON.parse(stored));
    }
  }, [quizId]);

  const selectOption = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, selectedOption]) => ({ questionId, selectedOption })),
      };
      const { data } = await api.post(`/quizzes/${quizId}/submit`, payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!questions) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <ListChecks size={32} className="mx-auto text-parchment/30" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Quiz not found in this session</h1>
        <p className="mt-2 font-body text-sm text-parchment/60">
          Quizzes are generated fresh from a note. Head back to a note and click
          "Generate practice quiz" to start one.
        </p>
        <Link to="/notes" className="btn-primary mt-6 inline-flex">Browse notes</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <span className="badge-ai"><Sparkles size={12} /> AI-generated quiz</span>
      <h1 className="mt-3 font-display text-3xl font-semibold">Practice quiz</h1>

      {error && <div className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 font-body text-sm text-red-400">{error}</div>}

      {result ? (
        <div className="card mt-6 p-6 text-center">
          <h2 className="font-display text-2xl font-semibold text-teal-400">
            {result.score} / {result.total}
          </h2>
          <p className="mt-1 font-body text-sm text-parchment/60">Nice work — review the breakdown below.</p>
          <div className="mt-6 space-y-3 text-left">
            {result.results.map((r) => (
              <div key={r.questionId} className="flex items-center gap-2 font-body text-sm">
                {r.isCorrect ? <CheckCircle2 size={16} className="text-teal-400" /> : <XCircle size={16} className="text-red-400" />}
                <span className={r.isCorrect ? 'text-parchment/80' : 'text-parchment/60'}>
                  {r.isCorrect ? 'Correct' : `Incorrect — correct answer was option ${r.correctOption + 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {questions.map((q, i) => (
            <div key={q.id} className="card p-5">
              <p className="font-body text-sm font-medium">{i + 1}. {q.question_text}</p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => selectOption(q.id, oi)}
                    className={`w-full rounded-md border px-3.5 py-2.5 text-left font-body text-sm transition ${
                      answers[q.id] === oi
                        ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                        : 'border-navy-700 bg-navy-950/40 text-parchment/70 hover:border-navy-600'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={submit}
            disabled={submitting || Object.keys(answers).length < questions.length}
            className="btn-primary w-full"
          >
            {submitting ? 'Submitting…' : 'Submit answers'}
          </button>
        </div>
      )}
    </div>
  );
}
