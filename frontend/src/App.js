import React, { useState, useEffect, useMemo } from 'react';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import { T } from './i18n/translations';
import UserHome from './pages/User/UserHome';
import MyTokensPage from './pages/User/MyTokensPage';
import HistoryPage from './pages/User/HistoryPage';
import NotificationsPage from './pages/User/NotificationsPage';
import ProfilePage from './pages/User/ProfilePage';
import GenerateTokenPage from './pages/User/GenerateTokenPage';
import UserHelpPage from './pages/User/UserHelpPage';

// Layout
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import NotificationDrawer from './components/NotificationDrawer';
import Toast from './components/Toast';
import SmsNotification from './components/Common/SmsNotification';

// Auth / Register
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Login/RegisterPage';

// Admin
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminStockPage from './pages/Admin/AdminStockPage';
import AdminShopsPage from './pages/Admin/AdminShopsPage';
import AdminUsersPage from './pages/Admin/AdminUsersPage';
import AdminTokensPage from './pages/Admin/AdminTokensPage';
import AdminReportsPage from './pages/Admin/AdminReportsPage';
import AdminChangeRequestsPage from './pages/Admin/AdminChangeRequestsPage';
import AdminProfilePage from './pages/Admin/AdminProfilePage';
import AdminAIPage from './pages/Admin/AdminAIPage';
import AdminProcurementPage from './pages/Admin/AdminProcurementPage';
import AdminBenefitsPage from './pages/Admin/AdminBenefitsPage';
import AdminGrievancesPage from './pages/Admin/AdminGrievancesPage';

// Shop Admin
import ShopAdminDashboard from './pages/ShopAdmin/ShopAdminDashboard';
import ShopAdminUsers from './pages/ShopAdmin/ShopAdminUsers';
import ShopAdminTokens from './pages/ShopAdmin/ShopAdminTokens';
import ShopAdminStock from './pages/ShopAdmin/ShopAdminStock';
import ShopAdminReports from './pages/ShopAdmin/ShopAdminReports';
import ShopAdminAI from './pages/ShopAdmin/ShopAdminAI';
import ShopAdminProfile from './pages/ShopAdmin/ShopAdminProfile';
import ShopAdminProcurementPage from './pages/ShopAdmin/ShopAdminProcurementPage';

// User - IMPORTED STATICALLY AT TOP

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
  const { 
    authData, lang, login, logout,
    toasts, addToast, 
    smsMessages, triggerSms,
    notifs, setNotifs, markNotifRead,
    setMapplsLoaded,
    page, setPage,
    adminEditContext, setAdminEditContext
  } = useApp();

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
  }), [lang]);

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
              {renderDashboard()}
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
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
