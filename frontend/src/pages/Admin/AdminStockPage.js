import React, { useState, useEffect } from 'react';
import PortalModal from '../../components/Common/PortalModal';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { API_BASE_URL } from '../../utils/constants';
import { statusBadge } from '../../utils/logic';
import { cachedFetch } from '../../utils/apiCache';

const AdminStockPage = () => {
  const { lang } = useApp();
  const t = (k) => T[lang][k]||k;
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updateModal, setUpdateModal] = useState(null);
  const [qty, setQty] = useState('');
  const [threshold, setThreshold] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      window.globalToast?.('Error', 'Please login again', 'error');
      setLoading(false);
      return;
    }
    cachedFetch(`${API_BASE_URL}/api/admin/stock/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data.success && data.data) setStockData(data.data);
    })
    .catch(err => console.log('Stock error:', err))
    .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async () => {
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/stock/admin/update`, {
        method:'PUT',
        headers:{'Content-Type':'application/json',
          'Authorization':`Bearer ${sessionStorage.getItem('token')}`},
        body: JSON.stringify({
          shopId: updateModal.shopId,
          itemId: updateModal.id,
          quantity: parseInt(qty)||0,
          threshold: parseFloat(threshold)||updateModal.threshold
        })
      });
      const data = await res.json();
      if (data.success) {
        window.globalToast?.('Success', t('updateStock'), 'success');
        // Refresh local state or re-fetch
        cachedFetch(`${API_BASE_URL}/api/admin/stock/all`, {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
        })
          .then(res => res.json())
          .then(data => { if (data.success) setStockData(data.data); });
      }
    } catch(err) { console.log('Update error:', err); }
    setUpdateModal(null); setQty(''); setThreshold('');
  };

  const badge = (status) => {
    const res = statusBadge(status, lang);
    return <span className={`stock-badge ${res.cls}`}>{res.icon} {res.label}</span>;
  };

  return (
    <div className="page animate-slide-up">
      <div className="page-header">
        <h1>📦 {t('stockMgmt')}</h1>
        <p>{t('manageStockAcrossShops')}</p>
      </div>

      {loading ? (
        <div className="card" style={{textAlign:'center',padding:40}}>
          <div className="spinner"/>
        </div>
      ) : stockData.length===0 ? (
        <div className="card" style={{textAlign:'center',padding:40}}>
          <div style={{fontWeight:700,color:'var(--gray-500)'}}>{t('noDataFound')}</div>
        </div>
      ) : (
        stockData.map(shopStock => (
          <div key={shopStock.shopId} className="card" style={{marginBottom:20}}>
            <div className="card-title">🏪 {shopStock.shop}</div>
            <div className="table-wrap">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>{t('item')}</th>
                    <th>{t('availableItems')}</th>
                    <th>{t('alertThreshold')}</th>
                    <th>{t('status')}</th>
                    <th>{t('actionsLevel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(shopStock.items||[]).map(item => (
                    <tr key={item.id}>
                      <td data-label="ITEM">
                        <span style={{fontWeight:700}}>{lang === 'ta' && item.nameTa ? item.nameTa : item.nameEn}</span><br/>
                        <span style={{fontSize:12,color:'var(--gray-400)'}}>{item.nameTa}</span>
                      </td>
                      <td data-label="AVAILABLE">
                        <div style={{fontWeight:700}}>
                          {parseFloat(item.available||0).toFixed(0)} {item.unit}
                        </div>
                      </td>
                      <td data-label="THRESHOLD">{parseFloat(item.threshold||0).toFixed(0)} {item.unit}</td>
                      <td data-label="STATUS">{badge(item.status||'Available')}</td>
                      <td data-label="ACTION">
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setUpdateModal({...item, shopId:shopStock.shopId});
                            setQty('');
                            setThreshold(String(item.threshold||''));
                          }}>
                          ✏️ {lang === 'ta' ? 'திருத்து' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <PortalModal
        isOpen={!!updateModal}
        onClose={() => setUpdateModal(null)}
        title={`${t('updateStock')}: ${lang === 'ta' && updateModal?.nameTa ? updateModal.nameTa : updateModal?.nameEn}`}
      >
        {updateModal && (
          <>
            <div style={{background:'var(--gray-50)',borderRadius:10,padding:12,marginBottom:16}}>
              <div style={{fontSize:13,color:'var(--gray-500)'}}>{t('currentStock')}</div>
              <div style={{fontWeight:800,fontSize:20,color:'var(--green)'}}>
                {parseFloat(updateModal.available||0).toFixed(0)} {updateModal.unit}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('addQuantity')}</label>
              <input className="form-input" type="number"
                placeholder={t('enterOtp')}
                value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('alertThreshold')}</label>
              <input className="form-input" type="number"
                placeholder={t('alertThreshold')}
                value={threshold} onChange={e => setThreshold(e.target.value)} />
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', padding: '16px 0 0' }}>
              <button className="btn btn-secondary" onClick={() => setUpdateModal(null)}>
                {t('cancel')}
              </button>
              <button className="btn btn-primary" onClick={handleUpdate}>💾 {t('save')}</button>
            </div>
          </>
        )}
      </PortalModal>
    </div>
  );
};

export default AdminStockPage;
