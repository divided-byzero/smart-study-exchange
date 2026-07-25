import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, Menu, X, Shield, LogOut, User as UserIcon } from 'lucide-react';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';
import { getSocket } from '../services/socket';

const navLinks = [
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/notes', label: 'Notes' },
  { to: '/ai-assistant', label: 'AI Assistant' },
  { to: '/search', label: 'Smart Search' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    api.get('/notifications').then(({ data }) => setNotifications(data.notifications)).catch(() => {});

    const socket = getSocket();
    if (socket) {
      const handler = (n) => setNotifications((prev) => [n, ...prev]);
      socket.on('notification', handler);
      return () => socket.off('notification', handler);
    }
  }, [user]);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-navy-700 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/"><Logo /></Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 font-body text-sm font-medium transition ${
                  isActive ? 'text-teal-400' : 'text-parchment/70 hover:text-parchment'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/messages" className="btn-ghost !px-2.5" aria-label="Messages">
                <MessageCircle size={19} />
              </Link>

              <div className="relative">
                <button
                  className="btn-ghost relative !px-2.5"
                  onClick={() => setNotifOpen((o) => !o)}
                  aria-label="Notifications"
                >
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber text-[10px] font-bold text-ink">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-lg border border-navy-700 bg-navy-900 shadow-glow">
                    <div className="flex items-center justify-between border-b border-navy-700 px-4 py-2.5">
                      <span className="font-body text-sm font-semibold">Notifications</span>
                      <button onClick={markAllRead} className="font-body text-xs text-teal-400 hover:underline">
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 && (
                        <p className="px-4 py-6 text-center font-body text-sm text-parchment/50">
                          Nothing here yet.
                        </p>
                      )}
                      {notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className={`border-b border-navy-800 px-4 py-3 ${!n.is_read ? 'bg-navy-800/40' : ''}`}>
                          <p className="font-body text-sm font-medium">{n.title}</p>
                          {n.body && <p className="mt-0.5 font-body text-xs text-parchment/60">{n.body}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {user.role === 'admin' && (
                <Link to="/admin" className="btn-ghost !px-2.5" aria-label="Admin">
                  <Shield size={19} />
                </Link>
              )}

              <Link to="/profile" className="btn-ghost !px-2.5" aria-label="Profile">
                <UserIcon size={19} />
              </Link>

              <button onClick={handleLogout} className="btn-ghost !px-2.5" aria-label="Log out">
                <LogOut size={19} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Log in</Link>
              <Link to="/register" className="btn-primary">Get started</Link>
            </>
          )}

          <button className="btn-ghost !px-2 md:hidden" onClick={() => setMobileOpen((o) => !o)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col border-t border-navy-700 px-4 py-2 md:hidden">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2.5 font-body text-sm text-parchment/80 hover:bg-navy-800"
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
