import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { useUI } from './context/UIContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { T } from './i18n/translations';

// Layout (kept static — needed on first render)
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import NotificationDrawer from './components/NotificationDrawer';
import Toast from './components/Toast';
import SmsNotification from './components/Common/SmsNotification';

// Auth (kept static — first thing shown to user)
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Login/RegisterPage';

// Helper to retry component loading when a chunk fails to load (e.g. on new deployments)
const lazyWithRetry = (componentImport) => {
  return lazy(() =>
    componentImport()
      .then((module) => {
        sessionStorage.removeItem('chunk-failed-reloaded');
        return module;
      })
      .catch((error) => {
        console.error("Error loading chunk: ", error);
        const hasReloaded = sessionStorage.getItem('chunk-failed-reloaded');
        if (!hasReloaded) {
          sessionStorage.setItem('chunk-failed-reloaded', 'true');
          window.location.reload();
          return new Promise(() => {}); // prevent rendering errors before reload
        } else {
          sessionStorage.removeItem('chunk-failed-reloaded');
          throw error;
        }
      })
  );
};

// User pages — lazy loaded
const UserHome            = lazyWithRetry(() => import('./pages/User/UserHome'));
const MyTokensPage        = lazyWithRetry(() => import('./pages/User/MyTokensPage'));
const HistoryPage         = lazyWithRetry(() => import('./pages/User/HistoryPage'));
const NotificationsPage   = lazyWithRetry(() => import('./pages/User/NotificationsPage'));
const ProfilePage         = lazyWithRetry(() => import('./pages/User/ProfilePage'));
const GenerateTokenPage   = lazyWithRetry(() => import('./pages/User/GenerateTokenPage'));
const UserHelpPage        = lazyWithRetry(() => import('./pages/User/UserHelpPage'));

// Admin pages — lazy loaded
const AdminDashboard          = lazyWithRetry(() => import('./pages/Admin/AdminDashboard'));
const AdminStockPage          = lazyWithRetry(() => import('./pages/Admin/AdminStockPage'));
const AdminShopsPage          = lazyWithRetry(() => import('./pages/Admin/AdminShopsPage'));
const AdminUsersPage          = lazyWithRetry(() => import('./pages/Admin/AdminUsersPage'));
const AdminTokensPage         = lazyWithRetry(() => import('./pages/Admin/AdminTokensPage'));
const AdminReportsPage        = lazyWithRetry(() => import('./pages/Admin/AdminReportsPage'));
const AdminChangeRequestsPage = lazyWithRetry(() => import('./pages/Admin/AdminChangeRequestsPage'));
const AdminProfilePage        = lazyWithRetry(() => import('./pages/Admin/AdminProfilePage'));
const AdminAIPage             = lazyWithRetry(() => import('./pages/Admin/AdminAIPage'));
const AdminProcurementPage    = lazyWithRetry(() => import('./pages/Admin/AdminProcurementPage'));
const AdminBenefitsPage       = lazyWithRetry(() => import('./pages/Admin/AdminBenefitsPage'));
const AdminGrievancesPage     = lazyWithRetry(() => import('./pages/Admin/AdminGrievancesPage'));

// Shop Admin pages — lazy loaded
const ShopAdminDashboard         = lazyWithRetry(() => import('./pages/ShopAdmin/ShopAdminDashboard'));
const ShopAdminUsers             = lazyWithRetry(() => import('./pages/ShopAdmin/ShopAdminUsers'));
const ShopAdminTokens            = lazyWithRetry(() => import('./pages/ShopAdmin/ShopAdminTokens'));
const ShopAdminStock             = lazyWithRetry(() => import('./pages/ShopAdmin/ShopAdminStock'));
const ShopAdminReports           = lazyWithRetry(() => import('./pages/ShopAdmin/ShopAdminReports'));
const ShopAdminAI                = lazyWithRetry(() => import('./pages/ShopAdmin/ShopAdminAI'));
const ShopAdminProfile           = lazyWithRetry(() => import('./pages/ShopAdmin/ShopAdminProfile'));
const ShopAdminProcurementPage   = lazyWithRetry(() => import('./pages/ShopAdmin/ShopAdminProcurementPage'));

// Shared skeleton fallback for lazy-loaded pages
const PageSkeleton = () => (
  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {[1,2,3].map(i => (
      <div key={i} style={{
        height: i === 1 ? '48px' : '120px',
        borderRadius: '12px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite'
      }} />
    ))}
    <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
  </div>
);

// Sub-component for Mobile Bottom Nav
const MobileBottomNav = ({ page, setPage, t, onLogout }) => {
  const [showMore, setShowMore] = React.useState(false);
  if (window.innerWidth > 768) return null;
  const navItems = [
    { id: 'home',           icon: '🏠', label: 'Home' },
    { id: 'generate-token', icon: '🎫', label: 'Token' },
    { id: 'token',          icon: '📋', label: 'My Tokens' },
    { id: 'help',           icon: '💬', label: 'Help' },
  ];
  return (
    <>
      {showMore && (
        <div style={{
          position: 'fixed', bottom: 70, left: 0, right: 0, zIndex: 10000,
          background: 'white', borderTop: '1px solid var(--gray-200)',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.12)', padding: '8px 0',
          display: 'flex', flexDirection: 'column'
        }}>
          {[['history','📜','History'],['notifications','🔔','Notifications'],['profile','👤','Profile']].map(([id,icon,label]) => (
            <div key={id} onClick={() => { setPage(id); setShowMore(false); }}
              style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14,
                fontWeight: 700, fontSize: 14, cursor: 'pointer', color: page === id ? 'var(--green)' : 'var(--gray-700)',
                borderBottom: '1px solid var(--gray-100)' }}>
              <span style={{ fontSize: 20 }}>{icon}</span> {label}
            </div>
          ))}
          <div onClick={() => { onLogout(); setShowMore(false); }}
            style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14,
              fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'var(--red)' }}>
            <span style={{ fontSize: 20 }}>🚪</span> Logout
          </div>
        </div>
      )}
      {showMore && <div onClick={() => setShowMore(false)} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.3)' }} />}
      <div className="mobile-bottom-nav">
        {navItems.map(item => (
          <div key={item.id} 
               className={`mobile-bottom-nav-item ${page === item.id ? 'active' : ''}`}
               onClick={() => setPage(item.id)}>
            <span className="icon" style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
        <div className={`mobile-bottom-nav-item ${showMore ? 'active' : ''}`}
             onClick={() => setShowMore(p => !p)}>
          <span className="icon" style={{ fontSize: 20 }}>☰</span>
          <span>More</span>
        </div>
      </div>
    </>
  );
};

const AppContent = () => {
  const { authData, lang, login, logout } = useAuth();
  const { toasts, addToast, smsMessages, triggerSms, notifs, setNotifs, markNotifRead, setMapplsLoaded, page, setPage, adminEditContext, setAdminEditContext } = useUI();

  const t = (k) => T[lang]?.[k] || k;
  
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [latestToken, setLatestToken] = useState(null);

  // --- GLOBAL WINDOW HANDLERS ---
  useEffect(() => {
    window.globalToast = (title, msg, type) => addToast(title, msg, type);
    window.triggerSms = (msg) => triggerSms(msg);
    
    // Optimized Mappls Loader - avoid polling interval
    if (window.mappls) {
      setMapplsLoaded(true);
    } else if (!document.getElementById('mappls-sdk-dynamic')) {
      const script = document.createElement('script');
      script.id = 'mappls-sdk-dynamic';
      script.src = `https://apis.mappls.com/advancedmaps/api/2f66e012e8736a137887ac5492d5beba/map_sdk?v=3.0`;
      script.async = true;
      script.onload = () => setMapplsLoaded(true);
      document.head.appendChild(script);
    }
  }, [addToast, triggerSms, setMapplsLoaded]);

  // --- FIREBASE FCM LISTENERS (safety fallback — primary registration in AppContext) ---
  useEffect(() => {
    import('./firebase').then(({ onMessageListener }) => {
      onMessageListener().then(payload => {
        const { title, body } = payload?.notification || {};
        if (!title) return;
        addToast(title, body, 'success');
        const newNotif = {
          id: Date.now(),
          title,
          msg: body,
          time: 'Just now',
          read: false,
          type: title.includes('Stock') ? 'Stock' : title.includes('Token') ? 'Token' : 'System'
        };
        if (typeof setNotifs === 'function') setNotifs(prev => [newNotif, ...prev]);
      }).catch(() => {});
    }).catch(() => {});
  }, [addToast, setNotifs]);

  const pageTitles = useMemo(() => ({
    'admin-dash': t('dashboard'),
    'shop-dash': t('dashboard'),
    'shop-users': t('userMgmt'),
    'shop-tokens': t('tokenMonitor'),
    'shop-stock': t('stockMgmt'),
    'shop-reports': t('reports'),
    'shop-ai': t('aiInsights'),
    'shop-profile': t('myProfile'),
    'admin-change-requests': t('changeRequests'),
    'admin-benefits': t('specialBenefits'),
    'admin-procurement': t('procurementMgmt'),
    'shop-procurement': t('procurement'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [lang]); // lang change forces re-evaluation; 't' is derived from lang so it's safe to omit

  const renderDashboard = () => {
    if (!authData) return null;
    
    if (authData.role === 'ADMIN') {
      switch(page) {
        case 'admin-dash': return <AdminDashboard setPage={setPage} />;
        case 'admin-stock': return <AdminStockPage />;
        case 'admin-shops': return <AdminShopsPage />;
        case 'admin-users': return <AdminUsersPage adminEditContext={adminEditContext} setAdminEditContext={setAdminEditContext} />;
        case 'admin-tokens': return <AdminTokensPage />;
        case 'admin-reports': return <AdminReportsPage />;
        case 'admin-ai': return <AdminAIPage />;
        case 'admin-change-requests': return <AdminChangeRequestsPage />;
        case 'admin-benefits': return <AdminBenefitsPage />;
        case 'admin-procurement': return <AdminProcurementPage />;
        case 'admin-grievances': return <AdminGrievancesPage />;
        case 'admin-profile': return <AdminProfilePage setPage={setPage} />;
        default: return <AdminDashboard setPage={setPage} />;
      }
    }

    if (authData.role === 'SHOP_ADMIN') {
      switch(page) {
        case 'shop-dash': return <ShopAdminDashboard setPage={setPage}/>;
        case 'shop-users': return <ShopAdminUsers/>;
        case 'shop-tokens': return <ShopAdminTokens/>;
        case 'shop-stock': return <ShopAdminStock/>;
        case 'shop-reports': return <ShopAdminReports/>;
        case 'shop-ai': return <ShopAdminAI/>;
        case 'shop-procurement': return <ShopAdminProcurementPage />;
        case 'shop-profile': return <ShopAdminProfile setPage={setPage}/>;
        default: return <ShopAdminDashboard setPage={setPage}/>;
      }
    }

    // Default USER role
    switch(page) {
      case 'home': return <UserHome setPage={setPage} />;
      case 'token': return <MyTokensPage newToken={latestToken} />;
      case 'history': return <HistoryPage setPage={setPage} />;
      case 'notifications': return <NotificationsPage notifs={notifs} onMarkRead={markNotifRead} />;
      case 'profile': return <ProfilePage setPage={setPage} />;
      case 'generate-token': return <GenerateTokenPage setPage={setPage} setLatestToken={setLatestToken} />;
      case 'help': return <UserHelpPage />;
      default: return <UserHome setPage={setPage} />;
    }
  };

  return (
    <>
      <Toaster position="top-right"/>
      <Toast toasts={toasts} removeToast={() => {}}/>
      {smsMessages.length > 0 && (
        <SmsNotification 
          visible={true} 
          otp={smsMessages[smsMessages.length-1].msg} 
          onClose={() => triggerSms('')}
        />
      )}

        {(!authData && page !== 'register') ? (
           <LoginPage setPage={setPage} />
        ) : (page === 'register') ? (
           <RegisterPage onBack={() => setPage('login')} onSuccess={(data) => login(data)} />
        ) : (
          <div className="app-shell" onClick={(e) => {
            if (window.innerWidth <= 768) {
              const sidebar = document.querySelector('.sidebar');
              if (sidebar?.classList.contains('open') && !sidebar.contains(e.target) && !e.target.classList.contains('hamburger-btn')) {
                sidebar.classList.remove('open');
              }
            }
          }}>
            <Sidebar activePage={page} isAdmin={authData?.role==='ADMIN' || authData?.role==='SUPER_ADMIN'} role={authData?.role}/>
            <div className="main-content">
              <Topbar 
                title={pageTitles[page]||'Smart Ration System'} 
                unreadCount={notifs.filter(n => !n.read).length} 
                onNotifClick={() => setDrawerVisible(true)}
                onProfileClick={() => setPage(authData.role==='ADMIN' || authData.role==='SUPER_ADMIN' ? 'admin-profile' : authData.role==='SHOP_ADMIN' ? 'shop-profile' : 'profile')}
                onMenuClick={() => {
                  const sidebar = document.querySelector('.sidebar');
                  sidebar?.classList.toggle('open');
                }}
              />
              <Suspense fallback={<PageSkeleton />}>
                {renderDashboard()}
              </Suspense>
            </div>
            <NotificationDrawer 
              visible={drawerVisible} 
              onClose={() => setDrawerVisible(false)} 
              notifs={notifs} 
              onMarkRead={markNotifRead}
            />
            {authData?.role === 'USER' && (
              <MobileBottomNav page={page} setPage={setPage} t={t} onLogout={logout} />
            )}
          </div>
        )}
    </>
  );
};

const App = () => (
  <AuthProvider><UIProvider>
    <AppContent />
  </UIProvider></AuthProvider>
);

export default App;
