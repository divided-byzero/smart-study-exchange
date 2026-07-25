import { useState } from 'react';
import { Send, Save, Unlink } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ fullName: user.full_name, department: user.department || '' });
  const [avatar, setAvatar] = useState(null);
  const [status, setStatus] = useState('');
  const [linkCode, setLinkCode] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const fd = new FormData();
      fd.append('fullName', form.fullName);
      fd.append('department', form.department);
      if (avatar) fd.append('avatar', avatar);
      const { data } = await api.patch('/users/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser((u) => ({ ...u, ...data.user }));
      localStorage.setItem('sse_user', JSON.stringify({ ...user, ...data.user }));
      setStatus('Profile updated.');
    } catch (err) {
      setStatus(err.response?.data?.error || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const generateLinkCode = async () => {
    try {
      const { data } = await api.post('/users/me/telegram/link-code');
      setLinkCode(data);
    } catch (err) {
      setStatus(err.response?.data?.error || 'Could not generate link code.');
    }
  };

  const unlinkTelegram = async () => {
    try {
      await api.delete('/users/me/telegram');
      setLinkCode(null);
      setStatus('Telegram unlinked.');
    } catch (err) {
      setStatus(err.response?.data?.error || 'Could not unlink Telegram.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold">Your profile</h1>

      {status && <p className="mt-4 font-body text-sm text-teal-400">{status}</p>}

      <form onSubmit={handleSave} className="card mt-6 space-y-4 p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-navy-700">
            {(avatar ? URL.createObjectURL(avatar) : user.avatar_url) && (
              <img src={avatar ? URL.createObjectURL(avatar) : user.avatar_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <label className="btn-secondary cursor-pointer">
            Change photo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatar(e.target.files[0])} />
          </label>
        </div>

        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <label className="label">Department</label>
          <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input opacity-60" value={user.email} disabled />
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="card mt-6 p-6">
        <h2 className="font-display text-lg font-medium">Telegram notifications</h2>
        <p className="mt-1 font-body text-sm text-parchment/60">
          Link your Telegram account to receive notifications and use bot commands like /search and /summarize.
        </p>

        {linkCode ? (
          <div className="mt-4 rounded-md border border-teal-500/30 bg-teal-500/10 p-4">
            <p className="font-body text-sm">Send this to the bot:</p>
            <p className="mt-1 font-mono text-lg text-teal-400">/link {linkCode.linkCode}</p>
          </div>
        ) : (
          <button onClick={generateLinkCode} className="btn-secondary mt-4">
            <Send size={15} /> Generate link code
          </button>
        )}

        <button onClick={unlinkTelegram} className="btn-ghost mt-3">
          <Unlink size={14} /> Unlink Telegram
        </button>
      </div>
    </div>
  );
}
