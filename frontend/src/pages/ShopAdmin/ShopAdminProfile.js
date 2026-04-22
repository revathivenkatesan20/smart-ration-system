import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../utils/constants';
import { T } from '../../i18n/translations';

const ShopAdminProfile = () => {
  const { addToast, lang } = useApp();
  const t = (k) => T[lang]?.[k] || k;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [notices, setNotices] = useState({ en: '', ta: '' });

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/shop-admin/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setNotices({ en: data.data.noticeEn || '', ta: data.data.noticeTa || '' });
      }
    } catch (err) { }
  };

  useEffect(() => { fetchProfile(); }, []);

  const toggleStatus = async () => {
    if (profile.isOpen && !reason) {
      setShowReasonModal(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shop-admin/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ 
          ...profile, 
          isOpen: !profile.isOpen,
          closureReason: !profile.isOpen ? '' : reason
        })
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        addToast?.(t('shopStatus'), `${t('shopStatus')}: ${!profile.isOpen ? t('open') : t('closed')}`, 'success');
        setShowReasonModal(false);
        setReason('');
      }
    } catch (err) { addToast?.('Error', t('noDataFound'), 'error'); }
    setLoading(false);
  };

  const updateNotices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shop-admin/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ 
          ...profile, 
          noticeEn: notices.en,
          noticeTa: notices.ta
        })
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        addToast?.('Success', lang === 'ta' ? 'அறிவிப்பு புதுப்பிக்கப்பட்டது' : 'Announcements updated successfully', 'success');
        setShowNoticeModal(false);
      }
    } catch (err) { addToast?.('Error', 'Failed to update notice', 'error'); }
    setLoading(false);
  };

  if (!profile) return <div className="page flex-center"><div className="spinner"></div></div>;

  return (
    <div className="page animate-fade-in">
      {showReasonModal && (
        <div className="modal-overlay">
           <div className="card glass-card animate-scale-in" style={{ maxWidth:400, width:'90%' }}>
              <h3>{lang === 'ta' ? 'கடையை மூடவா?' : 'Close Shop Broadly?'}</h3>
              <p className="text-muted text-sm">{lang === 'ta' ? 'பயனர்கள் பார்க்க ஒரு காரணத்தை வழங்கவும் (எ.கா. இருப்பு வருகை, மின் வெட்டு)' : 'Provide a reason for users to see (e.g. Stock Arrival, Power Cut)'}</p>
              <textarea 
                className="form-input mt-4" 
                placeholder={t('closureReason')} 
                value={reason} 
                onChange={e => setReason(e.target.value)}
              />
              <div className="flex gap-3 mt-6">
                 <button className="btn btn-danger btn-full" onClick={toggleStatus}>{lang === 'ta' ? 'மூடுவதை உறுதிப்படுத்து' : 'Confirm Closure'}</button>
                 <button className="btn btn-ghost btn-full" onClick={() => setShowReasonModal(false)}>{t('cancel')}</button>
              </div>
           </div>
        </div>
      )}

      {showNoticeModal && (
        <div className="modal-overlay">
           <div className="card glass-card animate-scale-in" style={{ maxWidth:500, width:'90%' }}>
              <h3>📢 {lang === 'ta' ? 'அறிவிப்பை புதுப்பிக்கவும்' : 'Update Announcements'}</h3>
              <p className="text-muted text-xs">{lang === 'ta' ? 'அனைத்து வாடிக்கையாளர்களுக்கும் காட்டப்படும் செய்தியை உள்ளிடவும்.' : 'This message will be shown on the notice board of all assigned users.'}</p>
              
              <div className="form-group mt-4">
                <label className="form-label text-xs">Tamil Message</label>
                <textarea 
                  className="form-input" 
                  style={{height: 80, fontSize: 13}}
                  placeholder="உதாரணம்: இன்று அரிசி இருப்பு வந்துள்ளது..." 
                  value={notices.ta} 
                  onChange={e => setNotices({...notices, ta: e.target.value})}
                />
              </div>

              <div className="form-group mt-3">
                <label className="form-label text-xs">English Message</label>
                <textarea 
                  className="form-input" 
                  style={{height: 80, fontSize: 13}}
                  placeholder="Example: Fresh stock of Rice available today..." 
                  value={notices.en} 
                  onChange={e => setNotices({...notices, en: e.target.value})}
                />
              </div>

              <div className="flex gap-3 mt-6">
                 <button className="btn btn-primary btn-full" onClick={updateNotices} disabled={loading}>
                   {loading ? '...' : (lang === 'ta' ? 'அறிவிப்பை வெளியிடு' : 'Post Announcement')}
                 </button>
                 <button className="btn btn-ghost btn-full" onClick={() => setShowNoticeModal(false)}>{t('cancel')}</button>
              </div>
           </div>
        </div>
      )}

      <div className="page-header">
        <h1>👤 {profile.name} <span className="text-muted" style={{ fontSize:14 }}>[#{profile.shopCode}]</span></h1>
      </div>

      <div className="grid-2">
        <div className="card glass-card shadow-xl p-0 overflow-hidden">
           <div className="p-8 text-center bg-gradient-to-br from-green-700 to-green-500 text-white">
              <div className="avatar-xl mx-auto mb-4 border-4 border-white-20 shadow-2xl">🏪</div>
              <h2 className="text-2xl font-black">{profile.managerName}</h2>
              <div className="opacity-80 text-sm">{lang === 'ta' ? 'முதன்மை நிர்வாகி' : 'Master Administrator'}</div>
           </div>
           <div className="p-6">
              {[
                { l: t('mobileNumber'), v: profile.contactNumber, i: '📞' },
                { l: t('district'), v: profile.district, i: '🏢' },
                { l: t('address') || 'Address', v: profile.address, i: '📍' },
                { l: t('slot') || 'Schedule', v: `${profile.openingTime} - ${profile.closingTime}`, i: '⏰' }
              ].map(row => (
                <div key={row.l} className="flex-between py-3 border-b border-gray-100 last:border-0">
                   <span className="text-muted flex items-center gap-2">{row.i} {row.l}</span>
                   <span className="font-bold text-gray-800">{row.v}</span>
                </div>
              ))}
           </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className={`card ${profile.isOpen ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border-2`}>
             <div className="flex-between">
                <div>
                   <h3 className={profile.isOpen ? 'text-green-800' : 'text-red-800'}>{t('shopStatus')}</h3>
                   <div className="text-sm opacity-70">{lang === 'ta' ? 'பயனர் தெரிவுநிலை தற்போது ' : 'User visibility is currently '} {profile.isOpen ? (lang === 'ta' ? 'திறந்துள்ளது' : 'LIVE') : (lang === 'ta' ? 'மறைக்கப்பட்டுள்ளது' : 'HIDDEN')}</div>
                </div>
                <div className={`status-pill ${profile.isOpen ? 'live' : 'dead'}`}>
                   {profile.isOpen ? t('open') : t('closed')}
                </div>
             </div>
             <button 
                className={`btn btn-full mt-6 ${profile.isOpen ? 'btn-danger' : 'btn-primary shadow-green'}`}
                onClick={toggleStatus}
                disabled={loading}
             >
                {profile.isOpen ? '🔴 ' + (lang === 'ta' ? 'கடையை மூடவும்' : 'Close Shop') : '🟢 ' + (lang === 'ta' ? 'கடையை மீண்டும் திறக்கவும்' : 'Re-Open Shop')}
             </button>
          </div>

          <div className="card glass-card">
             <h3>🔔 {t('notifications')} {t('reports') || 'Management'}</h3>
             <p className="text-muted text-xs mb-4">{lang === 'ta' ? 'உங்கள் கடை வாடிக்கையாளர்களுக்கு முக்கியமான அறிவிப்புகளை ஒளிபரப்பவும்.' : 'Broadcast important updates to your shop customers.'}</p>
             <button className="btn btn-secondary btn-full" onClick={() => setShowNoticeModal(true)}>
               {lang === 'ta' ? 'அறிவிப்பை உருவாக்கு' : 'Create Announcement'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopAdminProfile;
