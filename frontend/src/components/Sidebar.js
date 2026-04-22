import React from 'react';
import { useApp } from '../context/AppContext';
import { T } from '../i18n/translations';

const Sidebar = ({ activePage, isAdmin, role }) => {
  const { logout, lang, toggleLang, setPage } = useApp();
  const t = (k) => T[lang][k]||k;
  
  const userNav = [
    { key:'home', icon:'🏠', label:t('home') },
    { key:'token', icon:'🎫', label:t('myTokens') },
    { key:'history', icon:'📋', label:t('history') },
    { key:'notifications', icon:'🔔', label:t('notifications') },
    { key:'profile', icon:'👤', label:t('profile') },
    { key:'help', icon:'❓', label:t('help') },
  ];
  
  const adminNav = [
    { key:'admin-dash', icon:'📊', label:t('dashboard') },
    { key:'admin-stock', icon:'📦', label:t('stockMgmt') },
    { key:'admin-shops', icon:'🏪', label:t('shopMgmt') },
    { key:'admin-users', icon:'👥', label:t('userMgmt') },
    { key:'admin-tokens', icon:'🎫', label:t('tokenMonitor') },
    { key:'admin-change-requests', icon:'🗳️', label:t('changeRequests') },
    { key:'admin-benefits', icon:'🎁', label:t('specialBenefits') },
    { key:'admin-reports', icon:'📈', label:t('reports') },
    { key:'admin-ai', icon:'🤖', label:t('aiInsights') },
    { key:'admin-procurement', icon:'🚚', label:t('procurement') },
    { key:'admin-grievances', icon:'⚖️', label:lang === 'ta' ? 'புகார்கள்' : 'Grievances' },
    { key:'admin-profile', icon:'👤', label:t('myProfile') },
  ];
  
  const shopAdminNav = [
    { key:'shop-dash', icon:'📊', label:t('dashboard') },
    { key:'shop-users', icon:'👥', label:t('userMgmt') },
    { key:'shop-tokens', icon:'🎫', label:t('tokenMonitor') },
    { key:'shop-stock', icon:'📦', label:t('stockMgmt') },
    { key:'shop-reports', icon:'📈', label:t('reports') },
    { key:'shop-ai', icon:'🤖', label:t('aiInsights') },
    { key:'shop-procurement', icon:'🚚', label:t('procurement') },
    { key:'shop-profile', icon:'👤', label:t('myProfile') },
  ];

  const nav = isAdmin ? adminNav
    : role === 'SHOP_ADMIN' ? shopAdminNav
    : userNav;

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🌾</div>
        <h2>{t('appName')}</h2>
        <p>{t('appSub')}</p>
      </div>
      <nav className="sidebar-nav">
        {nav.map(item => (
          <div key={item.key}
            className={`nav-item ${activePage===item.key?'active':''}`}
            onClick={() => setPage(item.key)}>
            <span className="icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer" style={{
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        marginBottom: 16
      }}>
        <button className="lang-btn"
          style={{width:'100%', marginBottom:8}}
          onClick={toggleLang}>
          🌐 {lang==='en' ? 'தமிழில் பார்' : 'View in English'}
        </button>
        <button className="btn btn-danger btn-full"
          style={{marginBottom:16}}
          onClick={logout}>
          🚪 {t('logout')}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
