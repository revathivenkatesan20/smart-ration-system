import React, { useState, useEffect } from 'react';
import PortalModal from '../../components/Common/PortalModal';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { API_BASE_URL } from '../../utils/constants';
import { statusBadge } from '../../utils/logic';
import { cachedFetch } from '../../utils/apiCache';

const StockViewForShop = ({ shopId }) => {
  const [stock, setStock] = useState([]);
  const { lang } = useApp();
  const t = (k) => T[lang][k]||k;
  useEffect(() => {
    cachedFetch(`${API_BASE_URL}/api/stock/shop/${shopId}`)
    .then(res => res.json())
    .then(data => { if (data.success) setStock(data.data); })
    .catch(()=>{});
  }, [shopId]);

  const badge = (status) => {
    const res = statusBadge(status, lang);
    return <span className={`stock-badge ${res.cls}`}>{res.icon} {res.label}</span>;
  };

  return stock.length===0 ? (
    <div style={{textAlign:'center',padding:20,color:'var(--gray-500)'}}>
      {t('updatingAI')}
    </div>
  ) : (
    <>
      {stock.map(item => (
        <div key={item.itemId} style={{display:'flex',justifyContent:'space-between',
          alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
          <div>
            <div style={{fontWeight:700,fontSize:13}}>{lang === 'ta' && item.nameTa ? item.nameTa : item.nameEn}</div>
            <div style={{fontSize:11,color:'var(--gray-400)'}}>{item.nameTa}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:700}}>
              {parseFloat(item.quantityAvailable||0).toFixed(0)} {item.unit}
            </div>
            {badge(item.status||'Available')}
          </div>
        </div>
      ))}
    </>
  );
};

const AdminShopsPage = () => {
  const { lang } = useApp();
  const t = (k) => T[lang][k]||k;
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    cachedFetch(`${API_BASE_URL}/api/admin/shops`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data.success && data.data) setShops(data.data);
    })
    .catch(err => console.log('Shops error:', err))
    .finally(() => setLoading(false));
  }, []);

  const saveShop = async () => {
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/admin/shops/${editModal.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        window.globalToast?.('Success', 'Shop details updated successfully', 'success');
        setEditModal(null);
        // Refresh shops list
        cachedFetch(`${API_BASE_URL}/api/admin/shops`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => res.json())
        .then(data => { if (data.success) setShops(data.data); });
      } else {
        window.globalToast?.('Error', data.message || 'Update failed', 'error');
      }
    } catch (err) {
      window.globalToast?.('Error', 'Connection error', 'error');
    }
  };

  return (
    <div className="page animate-slide-up">
      <div className="page-header">
        <h1>🏪 {t('shopMgmt')}</h1>
        <p>{shops.length} {t('shopsInDatabase')}</p>
      </div>

      {loading ? (
        <div className="card" style={{textAlign:'center',padding:40}}>
          <div className="spinner"/>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>{t('shopCode')}</th>
                  <th>{t('username')}</th>
                  <th>{t('compDistrict')}</th>
                  <th>{t('shopManager')}</th>
                  <th>{t('openingHours')}</th>
                  <th>{t('status')}</th>
                  <th>{t('actionsLevel')}</th>
                </tr>
              </thead>
              <tbody>
                {shops.map(s => (
                  <tr key={s.id}>
                    <td data-label={t('shopCode')} style={{fontFamily:'monospace',fontWeight:700,fontSize:12}}>
                      {s.code}
                    </td>
                    <td data-label={t('username')} style={{fontWeight:700}}>{s.name}</td>
                    <td data-label={t('compDistrict')}>{s.district}</td>
                    <td data-label={t('shopManager')}>{s.manager}</td>
                    <td data-label={t('openingHours')} style={{fontSize:12}}>{s.openingTime} – {s.closingTime}</td>
                    <td data-label={t('status')}>
                      <span className={`tag ${s.active?'tag-green':'tag-red'}`}>
                        {s.active?t('open'):t('closed')}
                      </span>
                    </td>
                    <td data-label={t('actionsLevel')} style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => { 
                          setForm({
                            name: s.name, 
                            district: s.district, 
                            manager: s.manager || s.managerName,
                            phone: s.phone || s.contactNumber || '',
                            address: s.address || '',
                            openingTime: s.openingTime || '09:00',
                            closingTime: s.closingTime || '17:00',
                            morningOpen: s.morningOpen || '09:00',
                            morningClose: s.morningClose || '13:00',
                            afternoonOpen: s.afternoonOpen || '14:00',
                            afternoonClose: s.afternoonClose || '18:00',
                            weeklyHoliday: s.weeklyHoliday || 'FRIDAY',
                            isOpen: s.isOpen !== false,
                            closureReason: s.closureReason || '',
                            pincode: s.pincode || ''
                          }); 
                          setEditModal(s); 
                        }}>
                        ✏️ {lang === 'ta' ? 'திருத்து' : 'Edit'}
                      </button>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => setStockModal(s)}>
                        📦 {t('stockMgmt')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PortalModal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title={`${lang === 'ta' ? 'திருத்து' : 'Edit'}: ${editModal?.name}`}
      >
        {editModal && (
          <div className="animate-fade-in">
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label text-xs">Shop Name</label>
                <input className="form-input" value={form.name||''} onChange={e => setForm({...form,name:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label text-xs">Manager Name</label>
                <input className="form-input" value={form.manager||''} onChange={e => setForm({...form,manager:e.target.value})} />
              </div>
            </div>
            <div className="grid-2 mt-3" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label text-xs">District</label>
                <input className="form-input" value={form.district||''} onChange={e => setForm({...form,district:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label text-xs">Contact Phone</label>
                <input className="form-input" value={form.phone||''} onChange={e => setForm({...form,phone:e.target.value})} />
              </div>
            </div>
            <div className="grid-2 mt-3" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label text-xs">Morning Session (Open/Close)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                   <input className="form-input" type="time" value={form.morningOpen||''} onChange={e => setForm({...form,morningOpen:e.target.value})} />
                   <input className="form-input" type="time" value={form.morningClose||''} onChange={e => setForm({...form,morningClose:e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label text-xs">Afternoon Session (Open/Close)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                   <input className="form-input" type="time" value={form.afternoonOpen||''} onChange={e => setForm({...form,afternoonOpen:e.target.value})} />
                   <input className="form-input" type="time" value={form.afternoonClose||''} onChange={e => setForm({...form,afternoonClose:e.target.value})} />
                </div>
              </div>
            </div>

            <div className="grid-2 mt-3" style={{ gap: 12, alignItems: 'center' }}>
               <div className="form-group">
                 <label className="form-label text-xs">Weekly Holiday</label>
                 <select className="form-input" value={form.weeklyHoliday||'FRIDAY'} onChange={e => setForm({...form,weeklyHoliday:e.target.value})}>
                    {['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
               </div>
               <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setForm({...form, morningOpen:'08:30', morningClose:'12:30', afternoonOpen:'15:00', afternoonClose:'19:00'})}>Chennai Slots</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setForm({...form, morningOpen:'09:00', morningClose:'13:00', afternoonOpen:'14:00', afternoonClose:'18:00'})}>Rural Slots</button>
               </div>
            </div>

            <div className="card mt-4" style={{ background: 'var(--gray-50)', padding: 16 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                     <div style={{ fontWeight: 800, fontSize: 13 }}>Manual Shop Control</div>
                     <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Override schedule to open or close shop</div>
                  </div>
                  <div 
                    onClick={() => setForm({...form, isOpen: !form.isOpen})}
                    style={{ width: 50, height: 26, borderRadius: 13, background: form.isOpen ? 'var(--green)' : 'var(--gray-300)', padding: 3, cursor: 'pointer', position: 'relative', transition: '0.3s' }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', left: form.isOpen ? 26 : 3, transition: '0.3s' }} />
                  </div>
               </div>
               {!form.isOpen && (
                 <div className="mt-3">
                   <label className="form-label text-xs">Closure Reason</label>
                   <input className="form-input" placeholder="e.g. Stock Verification" value={form.closureReason||''} onChange={e => setForm({...form,closureReason:e.target.value})} />
                 </div>
               )}
            </div>
            <div className="form-group mt-3">
              <label className="form-label text-xs">Address</label>
              <textarea className="form-input" style={{height:60}} value={form.address||''} onChange={e => setForm({...form,address:e.target.value})} />
            </div>

            <div className="modal-footer" style={{ borderTop: 'none', padding: '24px 0 0' }}>
               <button className="btn btn-secondary" onClick={() => setEditModal(null)}>{t('cancel')}</button>
               <button className="btn btn-primary" style={{fontWeight:900}} onClick={saveShop}>
                 💾 {t('save')} Changes
               </button>
            </div>
          </div>
        )}
      </PortalModal>

      <PortalModal
        isOpen={!!stockModal}
        onClose={() => setStockModal(null)}
        title={`${t('stockMgmt')} — ${stockModal?.name}`}
        maxWidth={600}
      >
        {stockModal && (
           <StockViewForShop shopId={stockModal.id} />
        )}
      </PortalModal>
    </div>
  );
};

export default AdminShopsPage;
