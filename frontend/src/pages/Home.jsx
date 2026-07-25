import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, MessageSquare, Search, Youtube, Bot, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const features = [
  {
    icon: BookOpen,
    title: 'Buy, sell, exchange',
    body: 'List your used textbooks with photos, condition, and price — or offer a book-for-book trade plus cash.',
  },
  {
    icon: Youtube,
    title: 'YouTube → Notes',
    body: 'Paste a lecture video link and get back a structured, summarized note in seconds.',
  },
  {
    icon: Sparkles,
    title: 'AI Note Summarizer',
    body: 'Upload a PDF or scan and let AI condense it into clear, exam-ready study notes.',
  },
  {
    icon: Bot,
    title: 'AI Quiz Generator',
    body: 'Turn any note into a practice quiz, and get instant scoring on your answers.',
  },
  {
    icon: Search,
    title: 'Smart semantic search',
    body: "Find conceptually related notes even when your keywords don't match the file exactly.",
  },
  {
    icon: MessageSquare,
    title: 'Real-time chat',
    body: 'Message sellers directly, share files, and negotiate exchange terms in one thread.',
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-navy-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(44,177,163,0.12),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <span className="badge-ai mb-6">
            <Sparkles size={12} /> Now with AI-powered study tools
          </span>
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            Your textbooks, your notes, your <span className="text-teal-400">semester</span> — sorted.
          </h1>
          <p className="mt-6 max-w-xl font-body text-lg text-parchment/70">
            A marketplace and study-notes exchange built exclusively for East West University
            students. Trade used books, share notes, and let AI turn a lecture video into a
            quiz you can actually study from.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {user ? (
              <Link to="/marketplace" className="btn-primary">
                Browse the marketplace <ArrowRight size={16} />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary">
                Join with your EWU email <ArrowRight size={16} />
              </Link>
            )}
            <Link to="/ai-assistant" className="btn-secondary">
              Try the AI Assistant
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
          Everything you need for the semester
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card group p-6 transition hover:border-teal-600/60">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-navy-800 text-teal-400 transition group-hover:bg-teal-500 group-hover:text-ink">
                <Icon size={18} />
              </div>
              <h3 className="font-display text-lg font-medium">{title}</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-parchment/60">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-navy-800 bg-navy-900/40">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            Have a lecture recording sitting unwatched?
          </h2>
          <p className="mx-auto mt-3 max-w-md font-body text-parchment/60">
            Drop the link into the AI Assistant and get a summarized note back before your next class.
          </p>
          <Link to="/ai-assistant" className="btn-primary mt-7 inline-flex">
            Generate notes from a video <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
