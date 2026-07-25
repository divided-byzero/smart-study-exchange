import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('sse_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sse_token');
    if (token) {
      connectSocket(token);
      api
        .get('/auth/me')
        .then(({ data }) => {
          setUser(data.user);
          localStorage.setItem('sse_user', JSON.stringify(data.user));
        })
        .catch(() => {
          localStorage.removeItem('sse_token');
          localStorage.removeItem('sse_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback((token, userData) => {
    localStorage.setItem('sse_token', token);
    localStorage.setItem('sse_user', JSON.stringify(userData));
    setUser(userData);
    connectSocket(token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sse_token');
    localStorage.removeItem('sse_user');
    setUser(null);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
