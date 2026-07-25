import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, FileText } from 'lucide-react';
import api from '../services/api';

export default function SmartSearch() {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('smart');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/search', { params: { q, mode } });
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <span className="badge-ai"><Sparkles size={12} /> FR17</span>
      <h1 className="mt-3 font-display text-3xl font-semibold">Smart search</h1>
      <p className="mt-1 font-body text-sm text-parchment/60">
        Semantic search finds conceptually related notes, even without exact keyword matches.
      </p>

      <form onSubmit={handleSearch} className="mt-6 space-y-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment/40" />
          <input
            className="input pl-10"
            placeholder="e.g. 'gradient descent intuition' or 'how TCP handles congestion'"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1 rounded-lg border border-navy-700 bg-navy-900 p-1">
            <button
              type="button"
              onClick={() => setMode('smart')}
              className={`rounded-md px-3.5 py-1.5 font-body text-xs font-medium transition ${mode === 'smart' ? 'bg-teal-500 text-ink' : 'text-parchment/60'}`}
            >
              Smart (AI)
            </button>
            <button
              type="button"
              onClick={() => setMode('keyword')}
              className={`rounded-md px-3.5 py-1.5 font-body text-xs font-medium transition ${mode === 'keyword' ? 'bg-teal-500 text-ink' : 'text-parchment/60'}`}
            >
              Keyword
            </button>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {error && <div className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 font-body text-sm text-red-400">{error}</div>}

      {results && (
        <div className="mt-8">
          <p className="font-body text-xs uppercase tracking-wide text-parchment/40">
            {results.results.length} result(s) — {results.mode} mode
          </p>
          <div className="mt-4 space-y-3">
            {results.results.map((note) => (
              <Link key={note.id} to={`/notes/${note.id}`} className="card block p-4 transition hover:border-teal-600/60">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-teal-400" />
                  <p className="font-body text-sm font-medium">{note.title}</p>
                  {note.course_code && <span className="badge">{note.course_code}</span>}
                  {note.similarity && (
                    <span className="ml-auto font-body text-xs text-parchment/40">
                      {(note.similarity * 100).toFixed(0)}% match
                    </span>
                  )}
                </div>
                {note.summary && <p className="mt-2 font-body text-xs text-parchment/50 line-clamp-2">{note.summary.replace(/[#*]/g, '')}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
