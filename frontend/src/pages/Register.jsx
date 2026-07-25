import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import api from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', department: '', studentId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      navigate('/verify-email', { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
      <Link to="/" className="mb-8 self-start"><Logo /></Link>
      <h1 className="font-display text-2xl font-semibold">Create your account</h1>
      <p className="mt-1.5 font-body text-sm text-parchment/60">
        Use your university email — we'll send a verification code.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 font-body text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <label className="label">Full name</label>
          <input required className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <label className="label">University email</label>
          <input type="email" required className="input" placeholder="you@ewubd.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Department</label>
            <input className="input" placeholder="CSE" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <label className="label">Student ID</label>
            <input className="input" placeholder="2023-2-60-XXX" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" required minLength={8} className="input" placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          <UserPlus size={16} /> {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center font-body text-sm text-parchment/60">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-teal-400 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
