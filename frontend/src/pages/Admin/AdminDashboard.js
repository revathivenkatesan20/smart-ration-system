import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { API_BASE_URL, MOCK } from '../../utils/constants';
import { statusBadge } from '../../utils/logic';
import { cachedFetch } from '../../utils/apiCache';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';

const AdminDashboard = () => {
  const { lang } = useApp();
  const t = (k) => T[lang][k]||k;
  const [d, setD] = useState(MOCK.adminDash);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const authToken = sessionStorage.getItem('token');
    cachedFetch(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => { if (data.success) setD(data.data); })
    .catch(err => {
      console.log('Dashboard error:', err);
      // Handle connection refused / backend down specifically
      if (err.message === 'Failed to fetch') {
        window.globalToast?.('Connection Error', 'Backend server is unreachable. Please ensure the server is running on port 8080.', 'error');
      }
      setD(MOCK.adminDash);
    });

    cachedFetch(`${API_BASE_URL}/api/stock/admin/alerts`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => { if (data.success && data.data.length>0) setAlerts(data.data); })
    .catch(err => console.log('Alerts error:', err));
  }, []);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
  const pieData = [
    { name: 'PHH', value: 400 },
    { name: 'NPHH', value: 300 },
    { name: 'AYY', value: 200 },
    { name: 'Others', value: 100 }
  ];

  const badge = (status) => {
    const res = statusBadge(status, lang);
    return <span className={`stock-badge ${res.cls}`}>{res.icon} {res.label}</span>;
  };

  return (
    <div className="page animate-fade-in" style={{ padding: window.innerWidth < 480 ? '12px 16px' : '24px 28px' }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: window.innerWidth < 480 ? 20 : 26 }}>📊 {t('dashboard')}</h1>
        <p className="text-muted" style={{ fontSize: 13 }}>System Metrics & Operations</p>
      </div>

      <div className="stat-grid" style={{ gap: 10, marginBottom: 20 }}>
        {[
          { icon: '👥', label: t('totalUsers'), val: d.totalUsers, cls: 'green' },
          { icon: '🏪', label: t('totalShops'), val: d.totalShops, cls: 'blue' },
          { icon: '🎫', label: t('tokensToday'), val: d.tokensToday, cls: 'amber' },
          { icon: '⚠️', label: t('lowStockAlerts'), val: d.lowAlerts, cls: 'red' }
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls} glass-card`} style={{ padding: '12px 16px' }}>
             <div className="stat-icon" style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
             <div className="stat-value" style={{ fontSize: 20 }}>{s.val}</div>
             <div className="stat-label" style={{ fontSize: 10 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        <div className="card glass-card shadow-sm" style={{ padding: 16, minHeight: 280 }}>
           <h3 style={{ fontSize: 14, marginBottom: 12 }}>Distribution by Card Type</h3>
           <div style={{ width: '100%', overflowX: 'auto' }}>
              <div style={{ minWidth: 200, height: 220 }}>
                 <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie 
                        data={pieData} 
                        cx="50%" cy="50%" 
                        innerRadius={45} 
                        outerRadius={75} 
                        paddingAngle={5} 
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        <div className="card glass-card shadow-sm" style={{ padding: 16 }}>
          <div className="flex-between mb-3">
             <h3 style={{ fontSize: 14, margin:0 }}>⚠️ Intelligence Alerts</h3>
             <span className="tag tag-red" style={{ fontSize: 9 }}>CRITICAL</span>
          </div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {(alerts.length > 0 ? alerts : [
              { shopName: 'Zone A Main', itemName: 'Kerosene', quantity: 45, status: 'Low', unit: 'L' },
              { shopName: 'South Retail', itemName: 'Rice', quantity: 120, status: 'Monitor', unit: 'kg' }
            ]).map((a, i) => (
              <div key={i} className="flex-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <div className="font-bold" style={{ fontSize: 12 }}>{a.shopName}</div>
                  <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>📦 {a.itemName}: {a.quantity} {a.unit}</div>
                </div>
                {badge(a.status || 'Available')}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card glass-card shadow-lg" style={{ 
        marginTop: 16, 
        padding: 16, 
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: 'white',
        border: 'none',
        borderRadius: 16
      }}>
         <div className="flex-between">
            <div>
               <div className="text-xs opacity-60 font-bold mb-1 uppercase tracking-widest" style={{ fontSize: 9 }}>REVENUE FORECAST (CURRENT MONTH)</div>
               <div className="text-2xl font-black">₹{d.revenueMonth.toLocaleString()}</div>
            </div>
            <div className="text-right">
               <span className="text-green-400 font-bold" style={{ fontSize: 12 }}>↑ 12.5%</span>
               <div className="opacity-50" style={{ fontSize: 10 }}>vs last month</div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
