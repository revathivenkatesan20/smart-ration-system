import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../utils/constants';
import { T } from '../../i18n/translations';
import { statusBadge } from '../../utils/logic';
import { cachedFetch } from '../../utils/apiCache';

const ShopAdminStock = () => {
  const { lang } = useApp();
  const t = (k) => T[lang]?.[k] || k;
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [newQty, setNewQty] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStock = () => {
    cachedFetch(`${API_BASE_URL}/api/shop-admin/stock`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    })
    .then(r => r.json())
    .then(d => { if(d.success) setStock(d.data); })
    .catch(()=>{})
    .finally(() => setLoading(false));
  };

  useEffect(() => { loadStock(); }, []);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/shop-admin/stock/update`, {
        method:'PUT',
        headers:{
          'Content-Type':'application/json',
          'Authorization':`Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          stockId: editModal.stockId,
          quantity: parseFloat(newQty)||0
        })
      });
      const d = await res.json();
      if(d.success) {
        window.globalToast?.('Success', (lang === 'ta' ? editModal.nameTa : editModal.nameEn) + ' ' + t('closed'), 'success');
        loadStock();
        setEditModal(null);
        setNewQty('');
      } else {
        window.globalToast?.('Error', d.message||'Failed', 'error');
      }
    } catch(e) {
      window.globalToast?.('Error', t('noDataFound'), 'error');
    } finally { setSaving(false); }
  };

  const badge = (status) => {
    const res = statusBadge(status, lang);
    return <span className={`stock-badge ${res.cls}`}>{res.icon} {res.label}</span>;
  };

  return (
    <div className="page animate-slide-up">
      <div className="page-header" style={{display:'flex',justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h1>📦 {t('stockMgmt')}</h1>
          <p>
            {stock.filter(s=>s.status==='Low'||s.status==='Out of Stock').length} {t('lowStock')}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadStock}>🔄 {t('refresh') || 'Refresh'}</button>
      </div>

      {stock.filter(s=>s.status==='Low'||s.status==='Out of Stock').length > 0 && (
        <div style={{ background:'#fef3c7', borderRadius:12, padding:16, marginBottom:16, border:'1px solid #f59e0b' }}>
          <div style={{fontWeight:700, marginBottom:8, color:'#92400e'}}>
            ⚠️ {t('lowStock')} — {t('recommendationLabel')}: {t('requestStock')}
          </div>
          {stock.filter(s=>s.status==='Low'||s.status==='Out of Stock').map(s => (
            <div key={s.stockId} style={{fontSize:13, color:'#78350f', marginBottom:4}}>
              • {lang === 'ta' ? s.nameTa : s.nameEn}: {parseFloat(s.quantityAvailable||0).toFixed(0)} {s.unit} {t('pending')}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{textAlign:'center',padding:30}}>
            <div className="spinner"/>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>{t('item') || 'Item'}</th>
                  <th>{t('quantity') || 'Available'}</th>
                  <th>{t('threshold') || 'Min Threshold'}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s,i) => (
                  <tr key={i} style={{ background: s.status==='Out of Stock' ? '#fff1f2' : s.status==='Low' ? '#fffbeb' : 'white' }} onClick={() => setEditModal(s)} className="clickable-row">
                    <td data-label={t('item') || 'Item'}>
                      <div style={{fontWeight:700}}>{lang === 'ta' ? s.nameTa : s.nameEn}</div>
                      <div style={{fontSize:11, color:'var(--gray-400)'}}>{lang === 'ta' ? s.nameEn : s.nameTa}</div>
                    </td>
                    <td data-label={t('quantity') || 'Available'}>
                      <span style={{fontWeight:800, color: s.status==='Out of Stock' ? 'var(--red)' : s.status==='Low' ? 'var(--amber)' : 'var(--green)'}}>
                        {parseFloat(s.quantityAvailable||0).toFixed(0)}
                      </span>{' '}{s.unit}
                    </td>
                    <td data-label={t('threshold') || 'Min Threshold'}>{parseFloat(s.thresholdMin||0).toFixed(0)} {s.unit}</td>
                    <td data-label={t('status')}>{badge(s.status||'Available')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ {t('requestStock')}: {lang === 'ta' ? editModal.nameTa : editModal.nameEn}</h3>
              <button className="close-btn" onClick={() => setEditModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{background:'var(--gray-50)', borderRadius:10, padding:16, marginBottom:16}}>
                <div style={{fontSize:13, color:'var(--gray-500)'}}>{t('currentStock') || 'Current Stock'}</div>
                <div style={{fontWeight:800, fontSize:28, color:'var(--green)'}}>
                  {parseFloat(editModal.quantityAvailable||0).toFixed(0)} {editModal.unit}
                </div>
                <div style={{fontSize:12, color:'var(--gray-400)', marginTop:4}}>
                  {t('threshold') || 'Min threshold'}: {parseFloat(editModal.thresholdMin||0).toFixed(0)} {editModal.unit}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('quantity') || 'New Quantity'} ({editModal.unit})</label>
                <input className="form-input" type="number" value={newQty} onChange={e=>setNewQty(e.target.value)}/>
                <div style={{fontSize:11, color:'var(--gray-400)', marginTop:4}}>{t('aiPatterns') || 'If quantity falls below threshold, super admin will be notified automatically'}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={saving}>
                {saving ? '⏳ ' + t('saving') : '💾 ' + t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopAdminStock;
