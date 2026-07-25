export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" rx="7" fill="#152841" />
        <path d="M6 20V8l8 4-8 4z" fill="#2CB1A3" />
        <path d="M14 12l8-4v12l-8-4z" fill="#4FD1C5" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight text-parchment">
        Smart Study <span className="text-teal-400">Exchange</span>
      </span>
    </div>
  );
}
