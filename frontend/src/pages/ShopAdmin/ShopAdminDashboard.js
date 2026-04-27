import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../utils/constants';
import { T } from '../../i18n/translations';
import { cachedFetch } from '../../utils/apiCache';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const ShopAdminDashboard = ({ setPage }) => {
  const { addToast, lang } = useApp();
  const t = (k) => T[lang]?.[k] || k;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closureReasonInput, setClosureReasonInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [canRenderCharts, setCanRenderCharts] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    // Small delay to let grid layout settle
    const timer = setTimeout(() => {
      setCanRenderCharts(true);
      setRenderKey(prev => prev + 1);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    cachedFetch(`${API_BASE_URL}/api/shop-admin/dashboard`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(d => { 
      if (d.success) {
        setData(d.data);
        setClosureReasonInput(d.data.closureReason || '');
      } else {
        console.error('Dashboard error:', d.message);
      }
    })
    .catch(err => {
      console.error('Dashboard fetch error:', err);
      window.globalToast?.('Error', t('noDataFound'), 'error');
    })
    .finally(() => setLoading(false));
  }, []);

  const toggleStatus = () => {
    if(!data) return;
    setIsUpdatingStatus(true);
    const newStatus = !data.isOpen;
    
    cachedFetch(`${API_BASE_URL}/api/shop-admin/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ isOpen: newStatus, closureReason: newStatus ? null : closureReasonInput })
    })
    .then(r => r.json())
    .then(res => {
      if(res.success) {
        setData({...data, isOpen: newStatus, closureReason: newStatus ? null : closureReasonInput });
        addToast?.(t('shopStatus'), `${t('shopStatus')}: ${newStatus ? t('open') : t('closed')}`, 'success');
      }
    })
    .finally(() => setIsUpdatingStatus(false));
  };

  if (loading) return <div className="page flex-center h-screen"><div className="spinner"></div></div>;

  const chartData = [
    { name: t('totalTokens'), count: data?.totalTokens || 0 },
    { name: t('confirmed'), count: data?.confirmedTokens || 0 },
    { name: t('pending'), count: (data?.totalTokens || 0) - (data?.confirmedTokens || 0) }
  ];

  const pieData = [
    { name: t('healthy'), value: (data?.totalStockItems || 10) - (data?.lowStockAlerts || 0) },
    { name: t('lowStock'), value: data?.lowStockAlerts || 0 }
  ];
  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="page animate-fade-in" style={{ padding: window.innerWidth < 480 ? '8px 12px' : '24px 28px' }}>
      <div className="page-header flex items-center gap-3" style={{ marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, background: 'var(--green-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💹</div>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: window.innerWidth < 480 ? 18 : 26, letterSpacing: '-0.5px', margin:0 }}>{data?.shopName || t('dashboard')}</h1>
          <p className="text-muted flex items-center gap-2" style={{ fontSize: 10, margin:0 }}>
             📍 {data?.shopAddress || '—'} · 👤 {data?.managerName || '—'}
          </p>
        </div>
      </div>

      <div className="card shadow-md overflow-hidden mb-4" style={{ 
        background: 'linear-gradient(135deg, #065f46, #064e3b)', 
        borderRadius: 16, 
        padding: '16px 20px',
        color: 'white',
        border: 'none',
        boxShadow: '0 8px 30px rgba(6,78,59,0.15)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          flexDirection: window.innerWidth < 500 ? 'column' : 'row',
          gap: 12
        }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1px', opacity: 0.8, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4, color:'var(--green-100)' }}>
              🏪 {t('shop').toUpperCase()}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 2 }}>{data?.shopName}</h2>
            <div style={{ opacity: 0.8, fontSize: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 4 }}>
              <span>☀️ {data?.morningOpen} – {data?.morningClose}</span>
              <span>🌙 {data?.afternoonOpen} – {data?.afternoonClose}</span>
              <span style={{ color: 'var(--amber)' }}>🗓️ {lang==='ta' ? 'விடுமுறை' : 'Holiday'}: {data?.weeklyHoliday}</span>
            </div>
          </div>
          <div style={{ textAlign: window.innerWidth < 500 ? 'left' : 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-1px' }}>₹{parseFloat(data?.revenue || 0).toLocaleString()}</div>
            <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 700 }}>{t('revenue').toUpperCase()}</div>
          </div>
        </div>

        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex-between" style={{ gap: 16, flexWrap: 'wrap' }}>
            <div className="flex items-center gap-4">
              <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.9 }}>{t('status')}:</div>
              <button 
                onClick={toggleStatus} 
                disabled={isUpdatingStatus}
                style={{
                  background: data?.isOpen ? '#10b981' : '#f43f5e', 
                  color: 'white', border: 'none', padding: '6px 14px', borderRadius: 10,
                  fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: 'all 0.3s ease', 
                  opacity: isUpdatingStatus ? 0.7 : 1, fontSize: 12
                }}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white' }} />
                {data?.isOpen ? t('open') : t('closed')}
              </button>
            </div>
            {!data?.isOpen && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <input 
                  className="form-input" 
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: 12, height: 32, borderRadius: 8 }}
                  placeholder={lang==='ta' ? "மூடியதற்கான காரணம்..." : "Reason for closure..."}
                  value={closureReasonInput}
                  onChange={e => setClosureReasonInput(e.target.value)}
                  onBlur={toggleStatus} // Save when editing reason
                />
              </div>
            )}
          </div>
          {data?.isOpen && (
             <div style={{ marginTop: 8, fontSize: 10, opacity: 0.7, fontStyle: 'italic' }}>
               {lang==='ta' ? 'தற்போது பயனர்கள் டோக்கன் பெற முடியும்.' : 'Users can currently generate tokens for this shop.'}
             </div>
          )}
        </div>
      </div>

      <div className="stat-grid" style={{ gap: 10, marginBottom: 20 }}>
        {[
          { label: t('totalUsers'), val: data?.totalUsers, icon: '👥', color: 'blue' },
          { label: t('dailyTokens'), val: data?.totalTokens, icon: '🎫', color: 'green' },
          { label: t('confirmed'), val: data?.confirmedTokens, icon: '✅', color: 'amber' },
          { label: t('lowStock'), val: data?.lowStockAlerts, icon: '📦', color: 'red' }
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color} glass-card`} style={{ padding: '12px 16px' }}>
             <div className="stat-icon" style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
             <div className="stat-value" style={{ fontSize: 20 }}>{s.val}</div>
             <div className="stat-label" style={{ fontSize: 10 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        <div className="card glass-card shadow-sm" style={{ height: 260, minHeight: 260, padding: 16, overflow: 'hidden' }}>
           <h3 style={{ fontSize: 13, marginBottom: 12, fontWeight: 700 }}>{t('tokenDistribution')}</h3>
           <div style={{ width: '100%', overflowX: 'auto' }}>
             {canRenderCharts && (
               <div style={{ minWidth: 280, height: 200 }}>
                 <ResponsiveContainer key={`bar-${renderKey}`} width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize:9 }} />
                      <YAxis axisLine={false} tickLine={false} style={{ fontSize:9 }} />
                      <Tooltip cursor={{fill:'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius:12, border:'none', fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
             )}
           </div>
        </div>

        <div className="card glass-card shadow-sm" style={{ height: 260, minHeight: 260, padding: 16, overflow: 'hidden' }}>
           <h3 style={{ fontSize: 13, marginBottom: 12, fontWeight: 700 }}>{t('stockHealth')}</h3>
           <div style={{ width: '100%', overflowX: 'auto' }}>
             {canRenderCharts && (
               <div style={{ minWidth: 200, height: 200 }}>
                 <ResponsiveContainer key={`pie-${renderKey}`} width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={5} dataKey="value">
                        {pieData.map((e,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius:12, border:'none', fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                    </PieChart>
                 </ResponsiveContainer>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ShopAdminDashboard;
