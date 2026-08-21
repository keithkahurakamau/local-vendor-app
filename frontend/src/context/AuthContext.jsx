import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Both must be read synchronously during the first render. Restoring `user` in a
  // useEffect instead left it null on the initial paint, and ProtectedRoute requires
  // token AND user - so refreshing or deep-linking any protected page bounced the
  // user to /login, and from there vendors were pushed to the dashboard.
  const readStored = (key, parse = false) => {
    try {
      const raw = localStorage.getItem(key);
      return raw && parse ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState(() => readStored('user', true));
  const [token, setToken] = useState(() => readStored('token'));
  const navigate = useNavigate();

  // Keep other tabs in step: a logout in one tab should not leave another authenticated.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'user') setUser(readStored('user', true));
      if (e.key === 'token') setToken(readStored('token'));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);