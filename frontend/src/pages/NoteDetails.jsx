import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Youtube, FileText, Sparkles, ListChecks } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

export default function NoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [note, setNote] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/notes/${id}`).then(({ data }) => setNote(data.note)).catch(() => {});
  }, [id]);

  const summarize = async (e) => {
    e.preventDefault();
    setSummarizing(true);
    setError('');
    try {
      const { data } = await api.post(`/notes/${id}/summarize`, { text: rawText || undefined });
      setNote((n) => ({ ...n, summary: data.summary }));
    } catch (err) {
      setError(err.response?.data?.error || 'Summarization failed.');
    } finally {
      setSummarizing(false);
    }
  };

  const generateQuiz = async () => {
    setGenerating(true);
    setError('');
    try {
      const { data } = await api.post('/quizzes/generate', { noteId: id, count: 5 });
      sessionStorage.setItem(`quiz:${data.quiz.id}`, JSON.stringify(data.questions));
      navigate(`/quiz/${data.quiz.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Quiz generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  if (!note) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        {note.source_type === 'youtube' ? (
          <span className="badge-ai"><Youtube size={12} /> Generated from video</span>
        ) : (
          <span className="badge"><FileText size={12} /> Uploaded file</span>
        )}
        {note.course_code && <span className="badge">{note.course_code}</span>}
      </div>

      <h1 className="mt-3 font-display text-3xl font-semibold">{note.title}</h1>
      <p className="mt-1 font-body text-sm text-parchment/50">by {note.uploader_name}</p>

      {note.file_url && (
        <a href={note.file_url} target="_blank" rel="noreferrer" className="btn-secondary mt-5 inline-flex">
          <FileText size={15} /> Open original file
        </a>
      )}

      {error && <div className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 font-body text-sm text-red-400">{error}</div>}

      {note.summary ? (
        <div className="card mt-6 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium text-amber">
            <Sparkles size={16} /> AI-generated summary
          </h2>
          <div className="prose-invert mt-4 whitespace-pre-wrap font-body text-sm leading-relaxed text-parchment/80">
            {note.summary}
          </div>
        </div>
      ) : note.source_type === 'upload' && user?.id === note.uploader_id ? (
        <form onSubmit={summarize} className="card mt-6 space-y-3 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium text-amber">
            <Sparkles size={16} /> Generate a summary
          </h2>
          <p className="font-body text-xs text-parchment/50">
            Paste the extracted text from your PDF/scan below (client-side OCR/PDF extraction isn't wired up in this build), then run the AI summarizer.
          </p>
          <textarea
            className="input"
            rows={6}
            placeholder="Paste the note's text here…"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <button type="submit" disabled={summarizing} className="btn-primary">
            {summarizing ? 'Summarizing…' : 'Generate summary'}
          </button>
        </form>
      ) : (
        <p className="mt-6 font-body text-sm text-parchment/50">No summary generated for this note yet.</p>
      )}

      {user && note.summary && (
        <button onClick={generateQuiz} disabled={generating} className="btn-primary mt-6">
          <ListChecks size={16} /> {generating ? 'Generating quiz…' : 'Generate practice quiz from this note'}
        </button>
      )}
    </div>
  );
}
