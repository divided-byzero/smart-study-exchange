import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, UploadCloud } from 'lucide-react';
import api from '../services/api';

const conditions = ['new', 'like_new', 'good', 'fair', 'poor'];

export default function UploadBook() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', author: '', department: '', semester: '', courseCode: '', price: '', condition: 'good', description: '',
  });
  const [images, setImages] = useState([]);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const predictPrice = async () => {
    if (!form.title) return setError('Enter a title first to predict a price.');
    setPredicting(true);
    setError('');
    try {
      const { data } = await api.post('/books/predict-price', {
        title: form.title, author: form.author, condition: form.condition, department: form.department,
      });
      setPrediction(data);
      setForm((f) => ({ ...f, price: Math.round(data.predicted_price) }));
    } catch (err) {
      setError(err.response?.data?.error || 'Price prediction failed.');
    } finally {
      setPredicting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      images.forEach((img) => fd.append('images', img));

      const { data } = await api.post('/books', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/marketplace/${data.book.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold">List a book</h1>
      <p className="mt-1 font-body text-sm text-parchment/60">FR4: fill in the book's details below.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 font-body text-sm text-red-400">{error}</div>}

        <div>
          <label className="label">Title</label>
          <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Author</label>
          <input className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Department</label>
            <input className="input" placeholder="CSE" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <label className="label">Semester</label>
            <input className="input" placeholder="Summer 2026" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
          </div>
          <div>
            <label className="label">Course code</label>
            <input className="input" placeholder="CSE412" value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label">Condition</label>
          <select className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
            {conditions.map((c) => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Price (৳)</label>
          <div className="flex gap-2">
            <input required type="number" min="0" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <button type="button" onClick={predictPrice} disabled={predicting} className="btn-secondary whitespace-nowrap">
              <Sparkles size={15} /> {predicting ? 'Thinking…' : 'AI suggest'}
            </button>
          </div>
          {prediction && (
            <p className="mt-2 font-body text-xs text-parchment/60">
              <span className="text-amber">AI estimate:</span> ৳{Math.round(prediction.predicted_price)} — {prediction.reasoning}
            </p>
          )}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div>
          <label className="label">Photos (up to 5)</label>
          <label className="card flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed p-8 text-parchment/50 hover:border-teal-500 hover:text-teal-400">
            <UploadCloud size={24} />
            <span className="font-body text-sm">{images.length ? `${images.length} photo(s) selected` : 'Click to upload'}</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setImages(Array.from(e.target.files).slice(0, 5))} />
          </label>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Publishing…' : 'Publish listing'}
        </button>
      </form>
    </div>
  );
}
