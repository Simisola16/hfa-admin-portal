import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { getSocket, disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (token) {
      api.get('/api/auth/profile')
        .then(data => { 
          setUser(data.user); 
          setProfile(data.user);
          getSocket(token);
        })
        .catch(() => { 
          localStorage.removeItem('hfa_token'); 
          disconnectSocket();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  /**
   * Admin-portal login — authenticates via username (not email).
   * Calls the dedicated /api/auth/admin/login endpoint which only
   * accepts users with role === 'admin'.
   */
  const login = async (username, password) => {
    let clientTimezone = '';
    let clientIp = '';
    let clientCity = '';
    let clientCountry = '';
    let clientLocation = '';

    try {
      clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}

    // Fast browser-side location resolution via ipinfo.io (1.2s timeout so login is never blocked)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('https://ipinfo.io/json', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const info = await res.json();
        clientIp = info.ip || '';
        clientCity = info.city || '';
        clientCountry = info.country || '';
        if (info.city && info.country) {
          clientLocation = `${info.city}, ${info.country}`;
        }
      }
    } catch {}

    const data = await api.post('/api/auth/admin/login', { 
      username, 
      password,
      client_timezone: clientTimezone,
      client_ip: clientIp,
      client_city: clientCity,
      client_country: clientCountry,
      client_location: clientLocation,
    });
    localStorage.setItem('hfa_token', data.token);
    setUser(data.user);
    setProfile(data.user);
    if (data.token) {
      getSocket(data.token);
    }
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {}
    localStorage.removeItem('hfa_token');
    setUser(null);
    setProfile(null);
    disconnectSocket();
  };

  const updateProfile = (newProfile) => setProfile(newProfile);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
