import React from 'react';
import { useApp } from '../context/AppContext';

const Topbar = ({ title, unreadCount, onNotifClick, onProfileClick, onMenuClick }) => {
  const { user } = useApp();
  return (
    <div className="topbar">
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onMenuClick} className="hamburger-btn"
          style={{display:'none',background:'none',border:'none',
            fontSize:22,cursor:'pointer',padding:4,color:'var(--gray-700)'}}>
          ☰
        </button>
        <span className="topbar-title">{title}</span>
      </div>
      <div className="topbar-right">
        <div className="user-chip" onClick={onProfileClick}
          style={{cursor:'pointer'}}>
          <div className="user-avatar">
            {(user?.name||'U')[0].toUpperCase()}
          </div>
          <span className="user-name">
            {user?.name?.split(' ')[0]||'User'}
          </span>
        </div>
        <button className="notif-btn" onClick={onNotifClick}
          style={{position:'relative'}}>
          🔔
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount}</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Topbar;
