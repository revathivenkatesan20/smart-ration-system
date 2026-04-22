import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';

const ShopAdminUsers = () => {
  const { lang } = useApp();
  const t = (k) => T[lang]?.[k] || k;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewModal, setViewModal] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/shop-admin/users`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(r => r.json())
    .then(d => { if(d.success) setUsers(d.data); })
    .catch(()=>{})
    .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    (u.name||'').toLowerCase().includes(search.toLowerCase()) ||
    (u.rationCard||'').includes(search) ||
    (u.mobile||'').includes(search)
  );

  return (
    <div className="page animate-slide-up">
      <div className="page-header">
        <h1>👥 {t('userMgmt')}</h1>
        <p>{users.length} {t('totalUsers')}</p>
      </div>
      <div className="card">
        <div style={{marginBottom:14}}>
          <input className="form-input"
            placeholder={t('search')}
            style={{maxWidth:400}}
            value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div style={{textAlign:'center',padding:30}}>
            <div className="spinner"/>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>{t('rationCard')}</th>
                  <th>{t('username')}</th>
                  <th>{t('mobileNumber')}</th>
                  <th>{t('cardType')}</th>
                  <th>{t('status')}</th>
                  <th>{t('actionsLevel')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={6}
                    style={{textAlign:'center',
                      color:'var(--gray-400)',padding:20}}>
                    {t('noDataFound')}
                  </td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id}>
                    <td data-label="CARD" style={{fontFamily:'monospace', fontSize:12}}>{u.rationCard}</td>
                    <td data-label="NAME" style={{fontWeight:700}}>{u.name||'—'}</td>
                    <td data-label="MOBILE">{u.mobile||'—'}</td>
                    <td data-label="TYPE">
                      <span className={`tag ${u.cardType==='PHH'||u.cardType==='AAY'?'tag-red':'tag-blue'}`}>
                        {u.cardType||'PHH'}
                      </span>
                    </td>
                    <td data-label="STATUS">
                      <span className={`tag ${u.active?'tag-green':'tag-red'}`}>
                        {u.active ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td data-label="ACTION">
                      <button className="btn btn-secondary btn-sm" onClick={() => setViewModal(u)}>
                        📋 {t('view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewModal && (
        <div className="modal-overlay" onClick={() => setViewModal(null)}>
          <div className="modal" style={{maxWidth:400}} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 {t('cardInfo')}</h3>
              <button className="close-btn" onClick={() => setViewModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{display:'flex',alignItems:'center', gap:14, marginBottom:20, padding:16, background:'var(--green-light)', borderRadius:12}}>
                <div style={{width:52, height:52, borderRadius:'50%', background:'var(--green)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800}}>
                  {(viewModal.name||'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{fontWeight:800, fontSize:16}}>
                    {viewModal.name||t('unknown')}
                  </div>
                  <span className={`tag ${viewModal.cardType==='PHH' ? 'tag-red' : 'tag-blue'}`}>
                    {viewModal.cardType} {t('cardInfo')}
                  </span>
                </div>
              </div>
              {[
                [t('rationCard'), viewModal.rationCard],
                [t('mobileNumber'), viewModal.mobile||'—'],
                [t('district'), viewModal.district||'—'],
                [t('status'), viewModal.active ? t('active') : t('inactive')],
              ].map(([label,value]) => (
                <div key={label} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--gray-100)'}}>
                  <span style={{fontSize:13, color:'var(--gray-500)'}}>{label}</span>
                  <span style={{fontWeight:700, fontSize:13}}>{value}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopAdminUsers;
