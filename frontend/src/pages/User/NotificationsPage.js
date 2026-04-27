import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { API_BASE_URL, MOCK } from '../../utils/constants';
import { cachedFetch } from '../../utils/apiCache';

const NotificationsPage = () => {
  const { lang } = useApp();
  const t = (k) => T[lang][k]||k;
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    if (!authToken) return;
    cachedFetch(`${API_BASE_URL}/api/user/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data && data.data.length > 0) {
        setNotifs(data.data);
      } else {
        setNotifs(MOCK.notifications);
      }
    })
    .catch(() => setNotifs(MOCK.notifications));
  }, []);

  const markRead = (id) => setNotifs(prev =>
    prev.map(n => n.id===id?{...n,read:true,isRead:true}:n));
  
  const iconMap = { Token:'🎫', Stock:'📦', Payment:'💳', System:'🔔' };

  return (
    <div className="page animate-slide-up">
      <div className="page-header" style={{display:'flex',
        justifyContent:'space-between',alignItems:'center'}}>
        <h1>🔔 {t('notifications')}</h1>
        <button className="btn btn-secondary btn-sm"
          onClick={() => setNotifs(prev => prev.map(n => ({...n,read:true,isRead:true})))}>
          {t('markAllRead')}
        </button>
      </div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {notifs.length===0 ? (
          <div style={{textAlign:'center',padding:40}}>
            <div style={{fontSize:40,marginBottom:12}}>🔔</div>
            <div style={{fontWeight:700,color:'var(--gray-500)'}}>{t('noNotifications')}</div>
          </div>
        ) : notifs.map(n => (
          <div key={n.id}
            className={`notif-item ${!(n.read||n.isRead)?'unread':''}`}
            onClick={() => markRead(n.id)}>
            {!(n.read||n.isRead) && <div className="notif-dot"/>}
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span>{iconMap[n.type]||'🔔'}</span>
                <span className="notif-title">
                  {lang==='ta'&&n.titleTa?n.titleTa:n.title}
                </span>
              </div>
              <div className="notif-msg">{n.msg||n.messageEn}</div>
              <div className="notif-time">🕐 {n.time||n.sentAt||''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
