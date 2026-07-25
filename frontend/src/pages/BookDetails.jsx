import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, MessageCircle, Repeat, Star, Flag } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

export default function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [ratings, setRatings] = useState({ ratings: [], average: null });
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [exchangeForm, setExchangeForm] = useState({ cashAmount: 0, message: '' });
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get(`/books/${id}`).then(({ data }) => setBook(data.book)).catch(() => {});
    api.get(`/ratings/book/${id}`).then(({ data }) => setRatings(data)).catch(() => {});
  }, [id]);

  const sendExchangeRequest = async (e) => {
    e.preventDefault();
    setStatus('');
    try {
      await api.post('/exchanges', { bookId: id, ...exchangeForm });
      setStatus('Request sent to the seller!');
      setShowExchangeForm(false);
    } catch (err) {
      setStatus(err.response?.data?.error || 'Failed to send request.');
    }
  };

  const reportListing = async () => {
    const reason = window.prompt('Briefly describe the issue with this listing:');
    if (!reason) return;
    try {
      await api.post('/reports', { targetType: 'book', targetId: id, reason });
      setStatus('Report submitted. Thank you.');
    } catch (err) {
      setStatus(err.response?.data?.error || 'Failed to submit report.');
    }
  };

  if (!book) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-[4/3] overflow-hidden rounded-lg border border-navy-700 bg-navy-800">
          {book.images?.[0] ? (
            <img src={book.images[0]} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-parchment/20"><BookOpen size={48} /></div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            {book.course_code && <span className="badge">{book.course_code}</span>}
            {book.department && <span className="badge">{book.department}</span>}
            {book.semester && <span className="badge">{book.semester}</span>}
            <span className="badge capitalize">{book.status}</span>
          </div>

          <h1 className="mt-3 font-display text-3xl font-semibold">{book.title}</h1>
          {book.author && <p className="mt-1 font-body text-parchment/60">by {book.author}</p>}
          <p className="mt-4 font-display text-3xl font-semibold text-teal-400">৳{Number(book.price).toLocaleString()}</p>

          {book.description && <p className="mt-4 font-body text-sm leading-relaxed text-parchment/70">{book.description}</p>}

          <div className="mt-5 flex items-center gap-2 border-t border-navy-800 pt-5">
            <div className="h-9 w-9 overflow-hidden rounded-full bg-navy-700">
              {book.seller_avatar && <img src={book.seller_avatar} alt="" className="h-full w-full object-cover" />}
            </div>
            <div>
              <p className="font-body text-sm font-medium">{book.seller_name}</p>
              {ratings.average && (
                <p className="flex items-center gap-1 font-body text-xs text-parchment/50">
                  <Star size={12} className="fill-amber text-amber" /> {ratings.average.toFixed(1)} ({ratings.ratings.length})
                </p>
              )}
            </div>
          </div>

          {status && <p className="mt-4 font-body text-sm text-teal-400">{status}</p>}

          {user && user.id !== book.seller_id && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={`/messages/${book.seller_id}`} className="btn-secondary">
                <MessageCircle size={16} /> Message seller
              </Link>
              <button onClick={() => setShowExchangeForm((s) => !s)} className="btn-primary">
                <Repeat size={16} /> Exchange request
              </button>
              <button onClick={reportListing} className="btn-ghost">
                <Flag size={14} /> Report
              </button>
            </div>
          )}

          {!user && (
            <Link to="/login" className="btn-primary mt-6">Log in to contact seller</Link>
          )}

          {showExchangeForm && (
            <form onSubmit={sendExchangeRequest} className="card mt-5 space-y-3 p-5">
              <div>
                <label className="label">Additional cash offer (৳, optional)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={exchangeForm.cashAmount}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, cashAmount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea
                  className="input"
                  rows={3}
                  value={exchangeForm.message}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, message: e.target.value })}
                />
              </div>
              <button type="submit" className="btn-primary w-full">Send request</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
