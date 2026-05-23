import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

const UICtx = createContext(null);
export const useUI = () => useContext(UICtx);

export const UIProvider = ({ children }) => {
  const [page, setPage] = useState('home');
  const [notifs, setNotifs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [smsMessages, setSmsMessages] = useState([]);
  const [mapplsLoaded, setMapplsLoaded] = useState(false);
  const [adminEditContext, setAdminEditContext] = useState(null);
  
  const [cachedProfile, setCachedProfile] = useState(null);
  const [cachedStock, setCachedStock] = useState([]);
  const [cachedShops, setCachedShops] = useState([]);

  const addToast = useCallback((title, msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const triggerSms = useCallback((msg) => {
    if (!msg) { setSmsMessages([]); return; }
    const id = Date.now();
    setSmsMessages(prev => [...prev, { id, msg }]);
    setTimeout(() => setSmsMessages(prev => prev.filter(s => s.id !== id)), 6000);
  }, []);

  const markNotifRead = useCallback((id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const value = useMemo(() => ({
    page, setPage,
    notifs, setNotifs, markNotifRead,
    toasts, addToast,
    smsMessages, triggerSms,
    mapplsLoaded, setMapplsLoaded,
    adminEditContext, setAdminEditContext,
    cachedProfile, setCachedProfile,
    cachedStock, setCachedStock,
    cachedShops, setCachedShops
  }), [
    page, notifs, toasts, smsMessages, 
    mapplsLoaded, adminEditContext, cachedProfile, cachedStock, cachedShops,
    addToast, triggerSms, markNotifRead
  ]);

  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
};
