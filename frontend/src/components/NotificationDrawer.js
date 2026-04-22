import React from 'react';

const NotificationDrawer = ({ visible, onClose, notifs, onMarkRead }) => {
  return (
    <>
      {visible && <div className="drawer-overlay" onClick={onClose} />}
      <div className={`notification-drawer ${visible ? 'open' : ''}`}>
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {window.innerWidth <= 768 && (
               <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '0 8px 0 0' }}>←</button>
            )}
            <h3 style={{ margin: 0 }}>🔔 Notifications</h3>
          </div>
          <button onClick={onClose} className="drawer-close" style={{ display: window.innerWidth <= 768 ? 'none' : 'flex' }}>✕</button>
        </div>
        <div className="drawer-content">
          {notifs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
              📭 No notifications yet
            </div>
          ) : (
            notifs.map(n => (
              <div key={n.id} className={`notif-item ${n.read ? 'read' : 'unread'}`} onClick={() => onMarkRead(n.id)}>
                <div className="notif-icon">
                  {n.type === 'Stock' ? '📦' : n.type === 'Token' ? '🎫' : '📢'}
                </div>
                <div className="notif-body">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-msg">{n.msg}</div>
                  <div className="notif-time">{n.time}</div>
                </div>
                {!n.read && <div className="unread-dot" />}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
