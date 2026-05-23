import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { clearCache } from '../utils/apiCache';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export const AuthProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
  const [authData, setAuthData] = useState(() => {
    const token = sessionStorage.getItem('token');
    const role = sessionStorage.getItem('role');
    const rationCard = sessionStorage.getItem('rationCardNumber');
    const userName = sessionStorage.getItem('userName');
    if (token && role) {
      return { token, role, rationCard, rationCardNumber: rationCard, name: userName };
    }
    return null;
  });

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const newLang = prev === 'en' ? 'ta' : 'en';
      localStorage.setItem('lang', newLang);
      return newLang;
    });
  }, []);

  const login = useCallback((data) => {
    if (data.token) {
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('role', data.role || 'USER');
      sessionStorage.setItem('rationCardNumber', data.rationCard || data.rationCardNumber || '');
      sessionStorage.setItem('userName', data.name || '');
    }
    setAuthData(data);
  }, []);

  const logout = useCallback(() => {
    setAuthData(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('rationCardNumber');
    sessionStorage.removeItem('userName');
    clearCache();
  }, []);

  const value = useMemo(() => ({
    lang, toggleLang,
    authData, user: authData,
    login, logout,
    isAdmin: authData?.role === 'ADMIN' || authData?.role === 'SUPER_ADMIN',
    isShopAdmin: authData?.role === 'SHOP_ADMIN',
  }), [lang, authData, login, logout, toggleLang]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};
