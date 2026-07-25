import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      navigate('/marketplace');
    } catch (err) {
      const res = err.response?.data;
      if (res?.needsVerification) {
        navigate('/verify-email', { state: { email: form.email } });
        return;
      }
      setError(res?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
      <Link to="/" className="mb-8 self-start"><Logo /></Link>
      <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1.5 font-body text-sm text-parchment/60">Log in to continue to your dashboard.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 font-body text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <label className="label">University email</label>
          <input
            type="email"
            required
            className="input"
            placeholder="you@ewubd.edu"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            required
            className="input"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          <LogIn size={16} /> {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center font-body text-sm text-parchment/60">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-teal-400 hover:underline">Register</Link>
      </p>
    </div>
  );
}
