import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('trimurya_user') || 'null'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('trimurya_token');
    if (!token) return;
    api('/auth/me')
      .then((data) => {
        setUser(data.user);
        localStorage.setItem('trimurya_user', JSON.stringify(data.user));
      })
      .catch(() => logout());
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const ping = () => api('/activity/heartbeat', { method: 'POST' }).catch(() => {});
    ping();
    const timer = window.setInterval(ping, 60000);
    return () => window.clearInterval(timer);
  }, [user?.id, user?._id]);

  useEffect(() => {
    if (!user || !navigator.geolocation) return undefined;
    let lastSent = 0;
    const watcher = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (Date.now() - lastSent < 60000) return;
        lastSent = Date.now();
        api('/activity/location', {
          method: 'PUT',
          body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, enabled: true })
        }).then(updateUser).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [user?.id, user?._id]);

  async function login(email, password) {
    setLoading(true);
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('trimurya_token', data.token);
      localStorage.setItem('trimurya_user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Welcome to Trimurya CRM');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('trimurya_token');
    localStorage.removeItem('trimurya_user');
    setUser(null);
  }

  function updateUser(changes) {
    setUser((current) => {
      const next = { ...current, ...changes };
      localStorage.setItem('trimurya_user', JSON.stringify(next));
      return next;
    });
  }

  const value = useMemo(() => ({ user, loading, login, logout, updateUser }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
