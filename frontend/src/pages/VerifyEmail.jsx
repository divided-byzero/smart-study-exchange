import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { email, otp });
      login(data.token, data.user);
      navigate('/marketplace');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    try {
      await api.post('/auth/resend-otp', { email });
      setInfo('A new code has been sent.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend code.');
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
      <Link to="/" className="mb-8 self-start"><Logo /></Link>
      <h1 className="font-display text-2xl font-semibold">Verify your email</h1>
      <p className="mt-1.5 font-body text-sm text-parchment/60">
        Enter the 6-digit code we sent to your email.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 font-body text-sm text-red-400">{error}</div>
        )}
        {info && (
          <div className="rounded-md border border-teal-500/30 bg-teal-500/10 px-3.5 py-2.5 font-body text-sm text-teal-400">{info}</div>
        )}
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Verification code</label>
          <input
            required
            maxLength={6}
            className="input text-center font-mono text-lg tracking-[0.5em]"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          <ShieldCheck size={16} /> {loading ? 'Verifying…' : 'Verify email'}
        </button>
      </form>

      <button onClick={handleResend} className="mt-5 font-body text-sm text-teal-400 hover:underline">
        Resend code
      </button>
    </div>
  );
}
