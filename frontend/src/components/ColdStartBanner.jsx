import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { setColdStartHandler } from '../services/api';

export default function ColdStartBanner() {
  const [status, setStatus] = useState(null); // null | 'waking' | 'ready' | 'error'

  useEffect(() => {
    setColdStartHandler((next) => {
      setStatus(next);
      if (next === 'ready') {
        // Briefly show a success flash, then hide.
        setTimeout(() => setStatus(null), 2500);
      }
    });
    return () => setColdStartHandler(null);
  }, []);

  if (!status) return null;

  return (
    <div
      className={`sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 font-body text-sm ${
        status === 'error'
          ? 'bg-red-500/15 text-red-400'
          : status === 'ready'
          ? 'bg-teal-500/15 text-teal-400'
          : 'bg-amber/15 text-amber'
      }`}
    >
      {status === 'waking' && (
        <>
          <Loader2 size={14} className="animate-spin" />
          Waking up the server — this can take up to a minute on the free tier. Hang tight…
        </>
      )}
      {status === 'ready' && <>Server is up. Retrying your request…</>}
      {status === 'error' && <>The server is taking longer than expected to respond. Please try again in a moment.</>}
    </div>
  );
}
