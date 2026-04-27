import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../utils/constants';
import { T } from '../../i18n/translations';
import { cachedFetch } from '../../utils/apiCache';

/* Viewport-safe select replacement */
const MiniItemSelect = ({ value, onChange, items, lang, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = items.find(s => String(s.itemId) === String(value));
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'8px 12px', border:'1.5px solid var(--gray-200)', borderRadius:10,
        background:'white', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--gray-700)',
        boxShadow: open ? '0 0 0 2px var(--green)' : 'none', transition:'box-shadow 0.2s'
      }}>
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'calc(100% - 20px)' }}>
          {selected ? (lang === 'ta' ? selected.nameTa : selected.nameEn) : placeholder}
        </span>
        <span style={{ fontSize:10, color:'var(--gray-400)', flexShrink:0 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:9999,
          background:'white', border:'1px solid var(--gray-200)', borderRadius:10,
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)', maxHeight:200, overflowY:'auto',
          overflowX:'hidden', marginTop:4, width:'100%', boxSizing:'border-box'
        }}>
          {items.map(s => (
            <div key={s.itemId} onClick={() => { onChange(String(s.itemId)); setOpen(false); }} style={{
              padding:'10px 14px', cursor:'pointer', fontSize:12, borderBottom:'1px solid var(--gray-50)',
              background: String(value) === String(s.itemId) ? 'var(--green-light)' : 'transparent',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%', boxSizing:'border-box'
            }}>
              {lang === 'ta' ? s.nameTa : s.nameEn} — {s.quantityAvailable} {s.unit}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ShopAdminProcurementPage = () => {
  const { lang } = useApp();
  const t = (k) => T[lang]?.[k] || k;
  const [stock, setStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state
  const [selectedItem, setSelectedItem] = useState('');
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Always fetch on mount using JWT token directly — no dependency on authData.shopId
  useEffect(() => {
    fetchData();
  }, []);

  const getHeaders = () => ({
    'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` };
    
    try {
      const [stockRes, histRes] = await Promise.all([
        cachedFetch(`${API_BASE_URL}/api/shop-admin/stock`, { headers }),
        cachedFetch(`${API_BASE_URL}/api/shop-admin/procurement/my-history`, { headers })
      ]);

      const [stockData, histData] = await Promise.all([
        stockRes.json(),
        histRes.json()
      ]);

      if (stockData.success) {
        setStock(stockData.data || []);
      } else {
        console.warn('Stock load failed:', stockData.message);
        setStock([]);
      }

      if (histData.success) {
        setHistory(histData.data || []);
      } else {
        console.warn('History load failed:', histData.message);
        setHistory([]);
      }
    } catch (e) {
      console.error('Procurement fetch error:', e);
      setError(lang === 'ta' ? 'தரவை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem || !qty || parseFloat(qty) <= 0) {
      window.globalToast?.('Error', lang === 'ta' ? 'பொருள் மற்றும் அளவை நிரப்பவும்' : 'Please select item and quantity', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/shop-admin/procurement/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          itemId: parseInt(selectedItem),
          requestedQuantity: parseFloat(qty)
        })
      });
      const data = await res.json();
      if (data.success) {
        window.globalToast?.(
          t('requestStock'),
          lang === 'ta' ? 'கோரிக்கை அனுப்பப்பட்டது. நிர்வாகத்திடம் தெரியப்படுத்தப்பட்டது.' : 'Request sent successfully. Admin has been notified.',
          'success'
        );
        setQty('');
        setSelectedItem('');
        fetchData();
      } else {
        window.globalToast?.('Failed', data.message || 'Request failed', 'error');
      }
    } catch (e) {
      window.globalToast?.('Error', lang === 'ta' ? 'இணைப்பு தோல்வி' : 'Connection failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const lowStockItems = stock.filter(s => parseFloat(s.quantityAvailable || 0) <= parseFloat(s.thresholdMin || 50));

  if (loading) return (
    <div className="page flex-center" style={{ minHeight: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>
          {lang === 'ta' ? 'இருப்பு தரவை ஏற்றுகிறது...' : 'Loading stock data...'}
        </p>
      </div>
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="card" style={{ textAlign: 'center', padding: 40, border: '2px dashed var(--red)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: 'var(--red)', fontWeight: 700 }}>{error}</p>
        <button className="btn btn-primary mt-4" onClick={fetchData}>
          🔄 {lang === 'ta' ? 'மீண்டும் முயற்சி' : 'Retry'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page animate-fade-in p-6">
      <div className="mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-2xl font-bold">🚚 {t('procurementMgmt')}</h1>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            {lang === 'ta' ? 'உங்கள் இருப்பைக் கண்காணித்து, மாவட்ட கிடங்கிலிருந்து இருப்புக் கோரிக்கை அனுப்பவும்.' : 'Monitor your inventory and request replenishment from the district warehouse.'}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData}>
          🔄 {t('refresh') || 'Refresh'}
        </button>
      </div>

      <div className="grid-2 gap-6 mb-8">
        {/* REQUEST FORM */}
        <div className="card shadow-md">
          <h3 className="mb-4">➕ {lang === 'ta' ? 'புதிய இருப்புக் கோரிக்கை' : 'New Replenishment Request'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label text-xs">{lang === 'ta' ? 'பொருளைத் தேர்ந்தெடுக்கவும்' : 'Select Item'}</label>
              <MiniItemSelect
                value={selectedItem}
                onChange={setSelectedItem}
                items={stock}
                lang={lang}
                placeholder={`-- ${lang === 'ta' ? 'பொருளைத் தேர்வு செய்யவும்' : 'Choose Item'} --`}
              />
            </div>
            <div className="form-group">
              <label className="form-label text-xs">{lang === 'ta' ? 'கோர வேண்டிய அளவு' : 'Quantity to Request'}</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="e.g. 500" 
                value={qty} 
                onChange={e => setQty(e.target.value)}
                min="1"
                step="0.5"
                required
              />
            </div>
            <button className="btn btn-primary btn-full py-3" type="submit" disabled={submitting || !selectedItem || !qty}>
              {submitting
                ? (lang === 'ta' ? '⏳ அனுப்பப்படுகிறது...' : '⏳ Sending Request...')
                : (lang === 'ta' ? '📤 நிர்வாகத்திடம் கோரிக்கை சமர்ப்பி' : '📤 Submit Request to SuperAdmin')}
            </button>
          </form>
        </div>

        {/* INVENTORY STATUS WIDGET */}
        <div className="card shadow-md border-l-4" style={{ borderColor: lowStockItems.length > 0 ? 'var(--red)' : 'var(--green)' }}>
          <h3 className="mb-4">📉 {t('stockLevel')}</h3>
          {stock.length === 0 ? (
            <div className="text-center py-10">
              <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
              <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>
                {lang === 'ta' ? 'இருப்பு தரவு கிடைக்கவில்லை' : 'No stock data available'}
              </p>
            </div>
          ) : lowStockItems.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 text-red-700 rounded text-sm font-medium">
                ⚠️ {lowStockItems.length} {t('lowStock')}
              </div>
              {lowStockItems.map(s => (
                <div key={s.itemId} className="flex-between p-2 border-b border-gray-100 last:border-0">
                  <span className="font-semibold">{lang === 'ta' ? s.nameTa : s.nameEn}</span>
                  <span style={{ color: 'var(--red)', fontWeight: 700 }}>{s.quantityAvailable} {s.unit}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <p style={{ fontWeight: 600, color: 'var(--green-dark)' }}>
                {lang === 'ta' ? 'அனைத்து இருப்பு நிலைகளும் ஆரோக்கியமாக உள்ளன' : 'All stock levels healthy'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* REQUEST HISTORY */}
      <div className="card shadow-lg p-0 overflow-hidden border-0">
        <div className="p-4 border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="text-lg">📋 {t('requestHistory')}</h3>
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{history.length} {lang === 'ta' ? 'கோரிக்கைகள்' : 'requests'}</span>
        </div>
        <div className="table-wrap">
          <table className="responsive-table">
            <thead className="bg-gray-50">
              <tr>
                <th>{lang === 'ta' ? 'பொருள்' : 'Item'}</th>
                <th>{lang === 'ta' ? 'அளவு' : 'Quantity'}</th>
                <th>{t('status')}</th>
                <th>{lang === 'ta' ? 'கோரப்பட்ட தேதி' : 'Request Date'}</th>
                <th>{lang === 'ta' ? 'நிறைவேற்றப்பட்ட தேதி' : 'Fulfilled Date'}</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                    {t('noDataFound')}
                  </td>
                </tr>
              ) : history.map(h => (
                <tr key={h.id}>
                  <td data-label={lang === 'ta' ? 'பொருள்' : 'Item'} className="font-bold">
                    {lang === 'ta' ? (h.itemNameTa || h.itemName) : h.itemName}
                  </td>
                  <td data-label={lang === 'ta' ? 'அளவு' : 'Quantity'}>
                    {h.requestedQuantity} <span className="text-xs text-muted font-normal uppercase">{h.itemUnit}</span>
                  </td>
                  <td data-label={t('status')}>
                    <span className={`tag ${
                      h.status === 'Pending' ? 'tag-amber' : 
                      h.status === 'Fulfilled' || h.status === 'Approved' ? 'tag-green' : 'tag-red'
                    }`} style={{ fontSize: 10 }}>
                      {h.status === 'Pending' ? t('pending') : 
                       h.status === 'Fulfilled' || h.status === 'Approved' ? t('confirmed') : 
                       h.status}
                    </span>
                  </td>
                  <td data-label={lang === 'ta' ? 'கோரப்பட்ட தேதி' : 'Request Date'} className="text-xs text-muted">
                    {h.requestDate ? new Date(h.requestDate).toLocaleString() : '—'}
                  </td>
                  <td data-label={lang === 'ta' ? 'நிறைவேற்றப்பட்ட தேதி' : 'Fulfilled Date'} className="text-xs text-muted">
                    {h.fulfilledDate ? new Date(h.fulfilledDate).toLocaleString() : (h.status === 'Pending' ? '⏳ Pending' : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShopAdminProcurementPage;
