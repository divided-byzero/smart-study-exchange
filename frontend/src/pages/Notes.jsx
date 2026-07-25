import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Youtube, Plus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notes').then(({ data }) => setNotes(data.notes)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Study notes</h1>
          <p className="mt-1 font-body text-sm text-parchment/60">Uploaded notes and AI-generated summaries from students.</p>
        </div>
        {user && (
          <Link to="/ai-assistant" className="btn-primary">
            <Plus size={16} /> Add notes
          </Link>
        )}
      </div>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      ) : notes.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <FileText size={32} className="text-parchment/30" />
          <p className="mt-3 font-body text-parchment/60">No notes yet. Be the first to share one.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Link key={note.id} to={`/notes/${note.id}`} className="card p-5 transition hover:border-teal-600/60">
              <div className="flex items-center gap-2">
                {note.source_type === 'youtube' ? (
                  <span className="badge-ai"><Youtube size={12} /> From video</span>
                ) : (
                  <span className="badge"><FileText size={12} /> Upload</span>
                )}
                {note.course_code && <span className="badge">{note.course_code}</span>}
              </div>
              <h3 className="mt-3 font-display text-base font-medium leading-snug line-clamp-2">{note.title}</h3>
              <p className="mt-1 font-body text-xs text-parchment/50">by {note.uploader_name}</p>
              {note.summary && <p className="mt-2 font-body text-sm text-parchment/60 line-clamp-3">{note.summary.replace(/[#*]/g, '')}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
