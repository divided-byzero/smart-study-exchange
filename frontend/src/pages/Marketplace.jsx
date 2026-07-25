import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, BookOpen } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

const conditionLabels = {
  new: 'New', like_new: 'Like new', good: 'Good', fair: 'Fair', poor: 'Poor',
};

export default function Marketplace() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBooks = async (query = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/books', { params: query ? { q: query } : {} });
      setBooks(data.books);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBooks(q);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Marketplace</h1>
          <p className="mt-1 font-body text-sm text-parchment/60">Buy, sell, and exchange used textbooks.</p>
        </div>
        {user && (
          <Link to="/upload-book" className="btn-primary">
            <Plus size={16} /> List a book
          </Link>
        )}
      </div>

      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment/40" />
          <input
            className="input pl-10"
            placeholder="Search by title, author, or course code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      ) : books.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <BookOpen size={32} className="text-parchment/30" />
          <p className="mt-3 font-body text-parchment/60">No listings found. Try a different search, or be the first to list a book.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <Link key={book.id} to={`/marketplace/${book.id}`} className="card group overflow-hidden transition hover:border-teal-600/60">
              <div className="aspect-[4/3] w-full overflow-hidden bg-navy-800">
                {book.images?.[0] ? (
                  <img src={book.images[0]} alt={book.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-parchment/20"><BookOpen size={32} /></div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  {book.course_code && <span className="badge">{book.course_code}</span>}
                  {book.condition && <span className="badge">{conditionLabels[book.condition]}</span>}
                </div>
                <h3 className="mt-2 font-display text-base font-medium leading-snug line-clamp-2">{book.title}</h3>
                {book.author && <p className="mt-0.5 font-body text-xs text-parchment/50">{book.author}</p>}
                <p className="mt-3 font-body text-lg font-semibold text-teal-400">৳{Number(book.price).toLocaleString()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
