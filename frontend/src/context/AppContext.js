import React, { createContext, useContext, useState } from 'react';
import { clearCache } from '../utils/apiCache';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export const AppProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
  const [authData, setAuthData] = useState(() => {
    // Auth data moved to sessionStorage for independent multi-tab support
    const token = sessionStorage.getItem('token');
    const role = sessionStorage.getItem('role');
    const rationCard = sessionStorage.getItem('rationCardNumber');
    const userName = sessionStorage.getItem('userName');
    if (token && role) {
      return { token, role, rationCard, rationCardNumber: rationCard, name: userName };
    }
    return null;
  });

  // --- NEW GLOBAL STATE RESTORATION ---
  const [page, setPage] = useState('home');
  const [notifs, setNotifs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [smsMessages, setSmsMessages] = useState([]);
  const [mapplsLoaded, setMapplsLoaded] = useState(false);
  const [adminEditContext, setAdminEditContext] = useState(null);
  
  // --- CACHE FOR PERFORMANCE ---
  const [cachedProfile, setCachedProfile] = useState(null);
  const [cachedStock, setCachedStock] = useState([]);
  const [cachedShops, setCachedShops] = useState([]);

  const addToast = (title, msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const triggerSms = (msg) => {
    if (!msg) { setSmsMessages([]); return; }
    const id = Date.now();
    setSmsMessages(prev => [...prev, { id, msg }]);
    setTimeout(() => setSmsMessages(prev => prev.filter(s => s.id !== id)), 6000);
  };

  const markNotifRead = (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'ta' : 'en';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  // Register FCM token with backend and start foreground listener
  const registerFcmToken = async (rationCardNumber) => {
    try {
      const { requestForToken, onMessageListener } = await import('../firebase');
      const fcmToken = await requestForToken();
      if (!fcmToken) return;
      await fetch('/api/auth/update-fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rationCardNumber, fcmToken })
      });
      console.log('\u2705 FCM token registered');
      // Foreground push messages -> show as in-app toast
      onMessageListener().then(payload => {
        const title = payload?.notification?.title || 'Smart Ration';
        const body  = payload?.notification?.body  || '';
        addToast(title, body, 'info');
        setNotifs(prev => [{ id: Date.now(), title, msg: body, read: false, sentAt: new Date().toISOString() }, ...prev]);
      }).catch(() => {});
    } catch (err) {
      console.warn('FCM skipped:', err.message);
    }
  };

  const login = (data) => {
    if (data.token) {
      // Use sessionStorage for tokens to prevent multi-tab conflicts
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('role', data.role || 'USER');
      sessionStorage.setItem('rationCardNumber', data.rationCard || data.rationCardNumber || '');
      sessionStorage.setItem('userName', data.name || '');
    }
    setAuthData(data);
    // Wire push notifications for regular users
    if (!data.role || data.role === 'USER') {
      const card = data.rationCard || data.rationCardNumber || '';
      if (card) registerFcmToken(card);
    }
  };

  const logout = () => {
    setAuthData(null);
    // sessionStorage.clear() only affects current tab
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('rationCardNumber');
    sessionStorage.removeItem('userName');
    clearCache(); // Wipe API cache so next user starts fresh
  };

  const value = {
    lang, toggleLang,
    authData, user: authData,
    login, logout,
    isAdmin: authData?.role === 'ADMIN' || authData?.role === 'SUPER_ADMIN',
    isShopAdmin: authData?.role === 'SHOP_ADMIN',
    
    // Global Features
    page, setPage,
    notifs, setNotifs, markNotifRead,
    toasts, addToast,
    smsMessages, triggerSms,
    mapplsLoaded, setMapplsLoaded,
    adminEditContext, setAdminEditContext,
    cachedProfile, setCachedProfile,
    cachedStock, setCachedStock,
    cachedShops, setCachedShops
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
};
