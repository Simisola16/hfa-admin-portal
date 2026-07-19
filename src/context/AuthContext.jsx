import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

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
        })
        .catch(() => { localStorage.removeItem('hfa_token'); })
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
    const data = await api.post('/api/auth/admin/login', { username, password });
    localStorage.setItem('hfa_token', data.token);
    setUser(data.user);
    setProfile(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('hfa_token');
    setUser(null);
    setProfile(null);
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
