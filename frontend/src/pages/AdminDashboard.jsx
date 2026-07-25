import { useEffect, useState } from 'react';
import { Users, BookOpen, FileText, Flag, Ban, ShieldCheck, Megaphone, Plus } from 'lucide-react';
import api from '../services/api';

const tabs = ['Overview', 'Reports', 'Users', 'Ads'];

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [ads, setAds] = useState([]);
  const [adForm, setAdForm] = useState({ title: '', linkUrl: '' });
  const [adImage, setAdImage] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'Reports') api.get('/admin/reports').then(({ data }) => setReports(data.reports)).catch(() => {});
    if (tab === 'Users') api.get('/admin/users').then(({ data }) => setUsers(data.users)).catch(() => {});
    if (tab === 'Ads') api.get('/ads').then(({ data }) => setAds(data.advertisements)).catch(() => {});
  }, [tab]);

  const resolveReport = async (id, status) => {
    await api.patch(`/admin/reports/${id}`, { status });
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const banUser = async (id) => {
    await api.patch(`/admin/users/${id}/ban`);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_banned: true } : u)));
  };

  const unbanUser = async (id) => {
    await api.patch(`/admin/users/${id}/unban`);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_banned: false } : u)));
  };

  const createAd = async (e) => {
    e.preventDefault();
    setStatus('');
    try {
      const fd = new FormData();
      fd.append('title', adForm.title);
      fd.append('linkUrl', adForm.linkUrl);
      if (adImage) fd.append('image', adImage);
      const { data } = await api.post('/ads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAds((prev) => [data.advertisement, ...prev]);
      setAdForm({ title: '', linkUrl: '' });
      setAdImage(null);
    } catch (err) {
      setStatus(err.response?.data?.error || 'Failed to create ad.');
    }
  };

  const toggleAd = async (id, isActive) => {
    await api.patch(`/ads/${id}`, { isActive: !isActive });
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !isActive } : a)));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold">Admin dashboard</h1>

      <div className="mt-6 flex gap-1 rounded-lg border border-navy-700 bg-navy-900 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-2 font-body text-sm font-medium transition ${
              tab === t ? 'bg-teal-500 text-ink' : 'text-parchment/60 hover:text-parchment'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && stats && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Users', value: stats.totalUsers, icon: Users },
            { label: 'Book listings', value: stats.totalBooks, icon: BookOpen },
            { label: 'Notes', value: stats.totalNotes, icon: FileText },
            { label: 'Pending reports', value: stats.pendingReports, icon: Flag },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="card p-5">
              <Icon size={18} className="text-teal-400" />
              <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
              <p className="font-body text-xs text-parchment/50">{label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Reports' && (
        <div className="mt-8 space-y-3">
          {reports.length === 0 && <p className="font-body text-sm text-parchment/50">No reports.</p>}
          {reports.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-body text-sm font-medium capitalize">{r.target_type} report</p>
                  <p className="mt-1 font-body text-xs text-parchment/60">{r.reason}</p>
                  <p className="mt-1 font-body text-xs text-parchment/40">by {r.reporter_name} · {r.status}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => resolveReport(r.id, 'resolved')} className="btn-secondary !px-3 !py-1.5 text-xs">Resolve</button>
                    <button onClick={() => resolveReport(r.id, 'dismissed')} className="btn-ghost !px-3 !py-1.5 text-xs">Dismiss</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Users' && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse font-body text-sm">
            <thead>
              <tr className="border-b border-navy-800 text-left text-parchment/50">
                <th className="pb-2">Name</th><th className="pb-2">Email</th><th className="pb-2">Role</th><th className="pb-2">Status</th><th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-navy-800/60">
                  <td className="py-2.5">{u.full_name}</td>
                  <td className="py-2.5 text-parchment/60">{u.email}</td>
                  <td className="py-2.5 capitalize">{u.role}</td>
                  <td className="py-2.5">{u.is_banned ? <span className="badge text-red-400">Banned</span> : <span className="badge">Active</span>}</td>
                  <td className="py-2.5 text-right">
                    {u.is_banned ? (
                      <button onClick={() => unbanUser(u.id)} className="btn-ghost !px-2 !py-1 text-xs"><ShieldCheck size={13} /> Unban</button>
                    ) : (
                      <button onClick={() => banUser(u.id)} className="btn-ghost !px-2 !py-1 text-xs text-red-400"><Ban size={13} /> Ban</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Ads' && (
        <div className="mt-8 space-y-6">
          <form onSubmit={createAd} className="card space-y-3 p-5">
            <h3 className="flex items-center gap-2 font-body text-sm font-semibold"><Megaphone size={15} /> New advertisement</h3>
            {status && <p className="font-body text-xs text-red-400">{status}</p>}
            <input required className="input" placeholder="Title" value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} />
            <input className="input" placeholder="Link URL (optional)" value={adForm.linkUrl} onChange={(e) => setAdForm({ ...adForm, linkUrl: e.target.value })} />
            <input type="file" accept="image/*" onChange={(e) => setAdImage(e.target.files[0])} className="font-body text-sm" />
            <button type="submit" className="btn-primary"><Plus size={15} /> Create</button>
          </form>

          <div className="grid gap-4 sm:grid-cols-3">
            {ads.map((ad) => (
              <div key={ad.id} className="card overflow-hidden">
                {ad.image_url && <img src={ad.image_url} alt="" className="aspect-video w-full object-cover" />}
                <div className="p-3">
                  <p className="font-body text-sm font-medium">{ad.title}</p>
                  <p className="mt-1 font-body text-xs text-parchment/40">{ad.impressions} views · {ad.clicks} clicks</p>
                  <button onClick={() => toggleAd(ad.id, ad.is_active)} className="btn-ghost mt-2 !px-2 !py-1 text-xs">
                    {ad.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
