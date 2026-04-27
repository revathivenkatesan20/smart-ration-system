import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { cachedFetch } from '../../utils/apiCache';

/* Custom shop select - Combobox style with unified search bar */
const MiniShopSelect = ({ value, onChange, shops, t }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  
  const selected = value === 'all' ? null : shops.find(s => String(s.id) === String(value));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = shops.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) || 
    s.shopCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      <div style={{ position: 'relative' }}>
        <input 
          className="form-input"
          style={{ 
            paddingRight: '30px', 
            fontWeight: 600, 
            fontSize: 13,
            background: 'white',
            borderColor: open ? 'var(--green)' : 'var(--gray-200)',
            boxShadow: open ? '0 0 0 2px var(--green-light)' : 'none'
          }}
          placeholder={selected ? `🏪 ${selected.name}` : `🔍 ${t('search')} / ${t('allShops')}`}
          value={search}
          autoComplete="off"
          onChange={e => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <span 
          onClick={() => setOpen(!open)}
          style={{ 
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: 'var(--gray-400)', cursor: 'pointer' 
          }}
        >
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:9999,
          background:'white', border:'1px solid var(--gray-200)', borderRadius:10,
          boxShadow:'0 12px 32px rgba(0,0,0,0.15)', maxHeight: 200, overflowY:'auto',
          marginTop:4, width:'100%', boxSizing:'border-box', animation: 'slideInUp 0.2s ease'
        }}>
          <div key="all" onClick={() => { onChange('all'); setOpen(false); setSearch(''); }} style={{
            padding:'12px 14px', cursor:'pointer', fontSize:13, borderBottom:'1px solid var(--gray-50)',
            background: value === 'all' ? 'var(--green-light)' : 'transparent',
            color: value === 'all' ? 'var(--green-dark)' : 'var(--gray-700)',
            fontWeight: value === 'all' ? 700 : 500
          }}>
            🌐 {t('allShopsScope') || 'All Shops'}
          </div>
          {filtered.map(s => (
            <div key={s.id} onClick={() => { onChange(String(s.id)); setOpen(false); setSearch(''); }} style={{
              padding:'12px 14px', cursor:'pointer', fontSize:13, borderBottom:'1px solid var(--gray-50)',
              background: String(value) === String(s.id) ? 'var(--green-light)' : 'transparent',
              color: String(value) === String(s.id) ? 'var(--green-dark)' : 'var(--gray-700)',
              fontWeight: String(value) === String(s.id) ? 700 : 500
            }}>
              🏪 {s.name}
            </div>
          ))}
          {filtered.length === 0 && search && (
            <div style={{ padding: 15, textAlign: 'center', fontSize: 12, color: 'var(--gray-400)' }}>
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AdminReportsPage = () => {
  const { lang } = useApp();
  const t = (k) => T[lang][k]||k;
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [shopId, setShopId] = useState('all');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportResults, setReportResults] = useState(null);

  // Detect Mobile for calendar fix
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    cachedFetch(`${API_BASE_URL}/api/admin/shops`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => { if (data.success) setShops(data.data); })
    .catch(err => console.log('Shops error:', err));
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const shopParam = shopId === 'all' ? '' : `&shopId=${shopId}`;
      const res = await cachedFetch(`${API_BASE_URL}/api/admin/reports/data?from=${fromDate}&to=${toDate}${shopParam}`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setReportResults(data);
    } catch(err) { console.log('Report error:', err); }
    finally { setLoading(false); }
  };

  const handleDownload = () => {
    if (!reportResults) return;
    const headers = ["Date", "Token", "Shop", "Amount", "Status", "Mode"];
    const csvRows = [headers.join(',')];
    reportResults.records.forEach(r => {
      csvRows.push([r.date, r.token, r.shop, r.amount, r.status, r.mode].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-ration-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="page animate-slide-up">

      <div className="grid-2 mb-8">
        <div className="card glass-card">
          <h3 className="mb-4">🔍 {t('reportConfig')}</h3>
          <div className="form-group mb-4">
            <label className="form-label text-xs">🔍 {t('selectShopScope') || 'Select Shop Scope'}</label>
            <MiniShopSelect value={shopId} onChange={setShopId} shops={shops} t={t} />
          </div>

          <div className="grid-2 gap-4">
            <div className="form-group">
              <label className="form-label text-xs">📅 {t('date')} ({t('back')})</label>
              <input 
                className="form-input" 
                type={isMobile ? "text" : "date"} 
                placeholder={isMobile ? "YYYY-MM-DD" : ""}
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)} 
              />
              {isMobile && <span style={{fontSize: 9, color: 'var(--gray-400)'}}>Use YYYY-MM-DD format</span>}
            </div>
            <div className="form-group">
              <label className="form-label text-xs">📅 {t('date')} ({t('next')})</label>
              <input 
                className="form-input" 
                type={isMobile ? "text" : "date"} 
                placeholder={isMobile ? "YYYY-MM-DD" : ""}
                value={toDate} 
                onChange={e => setToDate(e.target.value)} 
              />
              {isMobile && <span style={{fontSize: 9, color: 'var(--gray-400)'}}>Use YYYY-MM-DD format</span>}
            </div>
          </div>

          <button className={`btn btn-primary btn-full mt-4 ${loading?'loading':''}`}
            onClick={handleGenerate} disabled={loading}>
            {loading ? <div className="spinner spinner-xs"></div> : '🔍 ' + t('generateReport')}
          </button>
        </div>

        <div className="card glass-card bg-green-50">
          <h3 className="mb-4">📊 {t('summaryStats')}</h3>
          {reportResults?.summary ? (
            <div className="grid-2 gap-4">
              <div className="p-4 bg-white rounded-xl shadow-sm">
                <div className="text-xs text-muted mb-1">{t('totalTokens')}</div>
                <div className="text-2xl font-black text-green">{reportResults.summary.totalTokens}</div>
              </div>
              <div className="p-4 bg-white rounded-xl shadow-sm">
                <div className="text-xs text-muted mb-1">{t('revenue')}</div>
                <div className="text-2xl font-black text-primary">₹{reportResults.summary.revenue?.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-white rounded-xl shadow-sm col-span-2">
                <div className="text-xs text-muted mb-1">{t('collectionProgress')}</div>
                <div className="text-xl font-bold">{reportResults.summary.collected} / {reportResults.summary.totalTokens}</div>
                <div className="w-full bg-gray-200 h-2 rounded-full mt-2 overflow-hidden">
                   <div className="bg-green h-full" style={{width: `${(reportResults.summary.collected/reportResults.summary.totalTokens)*100}%`}}></div>
                </div>
              </div>
            </div>
          ) : (
             <div className="flex-center h-32 text-muted italic">{t('confirm')}...</div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
             <button 
                className="btn btn-secondary btn-full btn-sm" 
                onClick={handleDownload}
                disabled={!reportResults || !reportResults.summary}>
                📥 {lang === 'ta' ? 'பதிவிறக்கு' : 'Download CSV Report'}
             </button>
          </div>
        </div>
      </div>

      {reportResults?.records?.length > 0 && (
        <div className="card glass-card animate-fade-in">
          <div className="flex-between mb-4">
            <h3 style={{ margin: 0 }}>📋 {t('reportResults') || 'Report Results'} ({reportResults.records.length} records)</h3>
            <button className="btn btn-primary btn-sm" onClick={handleDownload}>
              ⬇️ {lang === 'ta' ? 'CSV ஆக பதிவிறக்கு' : 'Download CSV'}
            </button>
          </div>
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{t('tokenNo')}</th>
                  <th>{t('shop')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('status')}</th>
                  <th>{t('payment')}</th>
                </tr>
              </thead>
              <tbody>
                {reportResults.records.map((tx, idx) => (
                  <tr key={idx}>
                    <td data-label={t('date')} className="text-xs">{tx.date}</td>
                    <td data-label={t('tokenNo')} className="font-bold">{tx.token}</td>
                    <td data-label={t('shop')} className="text-xs">{tx.shop}</td>
                    <td data-label={t('amount')} className="font-bold text-green">₹{tx.amount?.toFixed(2)}</td>
                    <td data-label={t('status')}>
                      <span className={`tag ${tx.status==='Collected'?'tag-green':tx.status==='Confirmed'?'tag-blue':'tag-amber'}`}>
                        {tx.status === 'Collected' ? t('collected') : tx.status === 'Confirmed' ? t('confirmed') : tx.status === 'Cancelled' ? t('cancelled') : tx.status}
                      </span>
                    </td>
                    <td data-label={t('payment')}><span className="text-xs opacity-70 italic">{tx.mode}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminReportsPage;
