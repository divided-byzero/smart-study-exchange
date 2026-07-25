import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Youtube, UploadCloud, Sparkles } from 'lucide-react';
import api from '../services/api';

export default function AiAssistant() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('youtube');

  // YouTube tab
  const [videoUrl, setVideoUrl] = useState('');
  const [ytMeta, setYtMeta] = useState({ courseCode: '', department: '', semester: '' });
  const [ytLoading, setYtLoading] = useState(false);

  // Upload tab
  const [file, setFile] = useState(null);
  const [uploadMeta, setUploadMeta] = useState({ title: '', courseCode: '', department: '', semester: '' });
  const [uploadLoading, setUploadLoading] = useState(false);

  const [error, setError] = useState('');

  const handleYoutube = async (e) => {
    e.preventDefault();
    setError('');
    setYtLoading(true);
    try {
      const { data } = await api.post('/notes/from-youtube', { videoUrl, ...ytMeta });
      navigate(`/notes/${data.note.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate notes from that video.');
    } finally {
      setYtLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please choose a file to upload.');
    setError('');
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      Object.entries(uploadMeta).forEach(([k, v]) => fd.append(k, v));
      const { data } = await api.post('/notes', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/notes/${data.note.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <span className="badge-ai"><Sparkles size={12} /> AI Study Assistant</span>
      <h1 className="mt-3 font-display text-3xl font-semibold">Turn material into study notes</h1>
      <p className="mt-1 font-body text-sm text-parchment/60">FR15: generate a summarized note from a YouTube lecture, or upload your own file.</p>

      <div className="mt-6 flex gap-1 rounded-lg border border-navy-700 bg-navy-900 p-1">
        <button
          className={`flex-1 rounded-md py-2 font-body text-sm font-medium transition ${tab === 'youtube' ? 'bg-teal-500 text-ink' : 'text-parchment/60 hover:text-parchment'}`}
          onClick={() => setTab('youtube')}
        >
          <Youtube size={14} className="mr-1.5 inline" /> YouTube video
        </button>
        <button
          className={`flex-1 rounded-md py-2 font-body text-sm font-medium transition ${tab === 'upload' ? 'bg-teal-500 text-ink' : 'text-parchment/60 hover:text-parchment'}`}
          onClick={() => setTab('upload')}
        >
          <UploadCloud size={14} className="mr-1.5 inline" /> Upload file
        </button>
      </div>

      {error && <div className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 font-body text-sm text-red-400">{error}</div>}

      {tab === 'youtube' ? (
        <form onSubmit={handleYoutube} className="mt-6 space-y-4">
          <div>
            <label className="label">YouTube video URL</label>
            <input required className="input" placeholder="https://youtube.com/watch?v=…" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input className="input" placeholder="Course code" value={ytMeta.courseCode} onChange={(e) => setYtMeta({ ...ytMeta, courseCode: e.target.value })} />
            <input className="input" placeholder="Department" value={ytMeta.department} onChange={(e) => setYtMeta({ ...ytMeta, department: e.target.value })} />
            <input className="input" placeholder="Semester" value={ytMeta.semester} onChange={(e) => setYtMeta({ ...ytMeta, semester: e.target.value })} />
          </div>
          <button type="submit" disabled={ytLoading} className="btn-primary w-full">
            <Sparkles size={16} /> {ytLoading ? 'Fetching transcript & summarizing…' : 'Generate notes'}
          </button>
          <p className="font-body text-xs text-parchment/40">This can take up to a minute for longer videos.</p>
        </form>
      ) : (
        <form onSubmit={handleUpload} className="mt-6 space-y-4">
          <div>
            <label className="label">Title</label>
            <input required className="input" value={uploadMeta.title} onChange={(e) => setUploadMeta({ ...uploadMeta, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input className="input" placeholder="Course code" value={uploadMeta.courseCode} onChange={(e) => setUploadMeta({ ...uploadMeta, courseCode: e.target.value })} />
            <input className="input" placeholder="Department" value={uploadMeta.department} onChange={(e) => setUploadMeta({ ...uploadMeta, department: e.target.value })} />
            <input className="input" placeholder="Semester" value={uploadMeta.semester} onChange={(e) => setUploadMeta({ ...uploadMeta, semester: e.target.value })} />
          </div>
          <label className="card flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed p-8 text-parchment/50 hover:border-teal-500 hover:text-teal-400">
            <UploadCloud size={24} />
            <span className="font-body text-sm">{file ? file.name : 'Click to choose a PDF or image'}</span>
            <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <button type="submit" disabled={uploadLoading} className="btn-primary w-full">
            {uploadLoading ? 'Uploading…' : 'Upload note'}
          </button>
          <p className="font-body text-xs text-parchment/40">
            After uploading, open the note and use "Generate summary" to run the AI summarizer.
          </p>
        </form>
      )}
    </div>
  );
}
