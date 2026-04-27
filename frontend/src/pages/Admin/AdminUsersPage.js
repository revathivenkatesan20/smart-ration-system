import React, { useState, useEffect } from 'react';
import PortalModal from '../../components/Common/PortalModal';
import { API_BASE_URL } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { cachedFetch } from '../../utils/apiCache';

const AdminUsersPage = () => {
  const { lang, adminEditContext } = useApp();
  const t = (k) => T[lang][k]||k;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(adminEditContext?.search || '');
  const [viewModal, setViewModal] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editContext, setEditContext] = useState(null);
  const { setAdminEditContext } = useApp(); // Access setter to clear context

  useEffect(() => {
    cachedFetch(`${API_BASE_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => { if (data.success) setUsers(data.data); })
    .catch(err => console.log('Users error:', err))
    .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (id, payload) => {
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/admin/users/${id}/update`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 403) {
        window.globalToast?.('Error', 'Permission Denied. Please log in again.', 'error');
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Update failed:', errorText);
        window.globalToast?.('Error', t('updateFailed') || 'Update failed', 'error');
        return;
      }

      const data = await res.json();
      if (data.success) {
        window.globalToast?.('Success', t('userUpdated') || 'User updated successfully', 'success');
        setUsers(users.map(u => u.id === id ? { ...u, ...payload } : u));
        setEditUser(null);
        setEditContext(null);
      } else {
        window.globalToast?.('Error', data.message || t('updateFailed'), 'error');
      }
    } catch (err) {
      console.error('Update error:', err);
      window.globalToast?.('Error', 'Connection error. Please try again.', 'error');
    }
  };

  // Auto-trigger edit modal from Change Request context
  useEffect(() => {
    if (adminEditContext?.search && users.length > 0) {
      const user = users.find(u => u.rationCard === adminEditContext.search);
      if (user) {
        setEditUser(user);
        setEditContext({
          fieldName: adminEditContext.fieldName,
          newValue: adminEditContext.newValue,
          oldValue: adminEditContext.oldValue
        });
        setAdminEditContext(null);
      }
    }
  }, [adminEditContext, users, setAdminEditContext]);

  const toggleUser = async (id) => {
    try {
      await cachedFetch(`${API_BASE_URL}/api/admin/users/${id}/toggle`, {
        method:'PUT',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setUsers(prev => prev.map(u => u.id===id?{...u,active:!u.active}:u));
    } catch(err) { console.log('Toggle error:', err); }
  };

  const filtered = users.filter(u =>
    (u.name||'').toLowerCase().includes(search.toLowerCase()) ||
    (u.rationCard||'').includes(search) ||
    (u.mobile||'').includes(search)
  );

  return (
    <div className="page animate-slide-up">
      <div className="page-header">
        <h1>👥 {t('userMgmt')}</h1>
        <p>{users.length} {t('registeredUsers')}</p>
      </div>
      <div className="card">
        <div style={{marginBottom:14}}>
          <input className="form-input"
            placeholder={t('search')}
            style={{maxWidth:400}} value={search}
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
                  <th>{t('mobile')}</th>
                  <th>{t('compCardType')}</th>
                  <th>{t('shop')}</th>
                  <th>{t('status')}</th>
                  <th>{t('actionsLevel')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr>
                    <td colSpan={7} style={{textAlign:'center',
                      color:'var(--gray-400)',padding:30}}>
                      {t('noDataFound')}
                    </td>
                  </tr>
                ) : filtered.map(u => (
                  <tr key={u.id}>
                    <td data-label={t('rationCard')} style={{fontFamily:'monospace',fontSize:12}}>
                      {u.rationCard}
                    </td>
                    <td data-label={t('username')} style={{fontWeight:700}}>{u.name||'-'}</td>
                    <td data-label={t('mobile')}>{u.mobile||'-'}</td>
                    <td data-label={t('compCardType')}>
                      <span className={`tag ${
                        u.cardType==='PHH'||u.cardType==='AAY'?'tag-red':'tag-blue'
                      }`}>{u.cardType||'PHH'}</span>
                    </td>
                    <td data-label={t('shop')} style={{fontSize:12}}>{u.shop || u.shopName || t('assignedShop')}</td>
                    <td data-label={t('status')}>
                      <span className={`tag ${u.active?'tag-green':'tag-red'}`}>
                        {u.active ? t('activeStatus') : t('inactiveStatus')}
                      </span>
                    </td>
                    <td data-label={t('actionsLevel')} style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => setViewModal(u)}>📋 {t('viewQR')}</button>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => {
                          setEditUser(u);
                          setEditContext(null);
                        }}>✏️ {t('edit')}</button>
                      <button
                        className={`btn ${u.active?'btn-danger':'btn-primary'} btn-sm`}
                        onClick={() => toggleUser(u.id)}>
                        {u.active?t('deactivate'):t('activate')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- VIEW MODAL --- */}
      <PortalModal
        isOpen={!!viewModal}
        onClose={() => setViewModal(null)}
        title={t('profile')}
        maxWidth={420}
      >
        {viewModal && (
          <>
            <div style={{display:'flex',alignItems:'center',gap:14,
              marginBottom:20,padding:16,background:'var(--green-light)',
              borderRadius:12}}>
              <div style={{width:52,height:52,borderRadius:'50%',
                background:'var(--green)',color:'white',display:'flex',
                alignItems:'center',justifyContent:'center',
                fontSize:22,fontWeight:800}}>
                {(viewModal.name||'U')[0]}
              </div>
              <div>
                <div style={{fontWeight:800,fontSize:16}}>{viewModal.name||'Unknown'}</div>
                <span className={`tag ${viewModal.cardType==='PHH'?'tag-red':'tag-blue'}`}>
                  {viewModal.cardType}
                </span>
              </div>
            </div>
            {[
              [t('rationCard'), viewModal.rationCard],
              [t('mobile'), viewModal.mobile||'-'],
              [t('shop'), viewModal.shop || viewModal.shopName || t('assignedShop')],
              [t('district'), viewModal.district||'-'],
              [t('status'), viewModal.active? '✅ '+t('activeStatus') : '❌ '+t('inactiveStatus')],
            ].map(([label, value]) => (
              <div key={label} style={{display:'flex',justifyContent:'space-between',
                padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                <span style={{fontSize:13,color:'var(--gray-500)'}}>{label}</span>
                <span style={{fontWeight:700,fontSize:13}}>{value}</span>
              </div>
            ))}
            <div className="modal-footer" style={{ borderTop: 'none', padding: '16px 0 0' }}>
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>
                {t('close')}
              </button>
              <button className={`btn ${viewModal.active?'btn-danger':'btn-primary'}`}
                onClick={() => {
                  toggleUser(viewModal.id);
                  setViewModal({...viewModal,active:!viewModal.active});
                }}>
                {viewModal.active?t('deactivate'):t('activate')}
              </button>
            </div>
          </>
        )}
      </PortalModal>

      {/* --- EDIT PROFILE MODAL --- */}
      <PortalModal
        isOpen={!!editUser}
        onClose={() => { setEditUser(null); setEditContext(null); }}
        title={t('editProfile') || 'Edit Profile'}
        maxWidth={500}
      >
        {editUser && (
          <EditForm 
            user={editUser} 
            context={editContext} 
            onSave={handleUpdate} 
            t={t} 
            onCancel={() => setEditUser(null)} 
          />
        )}
      </PortalModal>
    </div>
  );
};

/* Sub-component for editing to manage its own form state */
const EditForm = ({ user, context, onSave, t, onCancel }) => {
  const [form, setForm] = useState({
    name: user.name || '',
    mobile: user.mobile || '',
    address: user.address || '',
    district: user.district || '',
    cardType: user.cardType || 'PHH'
  });

  const [family, setFamily] = useState(() => {
    try {
      return JSON.parse(user.familyMembersList || '[]');
    } catch (e) {
      // Fallback for legacy comma-separated strings
      const raw = String(user.familyMembersList || '');
      if (!raw || raw === '[]' || raw === 'null') return [];
      return raw.split(',').map(name => ({ name: name.trim(), age: '', relation: '' }));
    }
  });

  const handleFamilyChange = (idx, field, val) => {
    const next = [...family];
    next[idx] = { ...next[idx], [field]: val };
    setFamily(next);
  };

  const addMember = () => setFamily([...family, { name: '', age: '', relation: '' }]);
  const removeMember = (idx) => setFamily(family.filter((_, i) => i !== idx));

  const submit = () => {
    onSave(user.id, { ...form, familyMembersList: JSON.stringify(family) });
  };

  return (
    <div className="animate-fade-in">
      {context && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--blue-dark)', marginBottom: 4 }}>
            🎯 {t('adminGuidance') || 'Review Requested Change'}
          </div>
          <p className="text-xs text-blue-700" style={{ margin: 0 }}>
            {t('userRequestedUpdate') || 'User requested to update'}: <b>{context.fieldName}</b>
          </p>
          <div className="flex gap-4 mt-2">
            <div className="flex-1 text-xs">
              <span className="text-muted block">{t('oldValue')}</span>
              <span style={{ textDecoration: 'line-through', color: 'var(--gray-400)' }}>{context.oldValue}</span>
            </div>
            <div className="flex-1 text-xs">
              <span className="text-muted block">{t('newValue')}</span>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>{context.newValue}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2 gap-4">
        <div className="form-group">
          <label className="form-label text-xs">👤 {t('headOfFamily')}</label>
          <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label text-xs">📱 {t('mobileNumber')}</label>
          <input className="form-input" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} />
        </div>
      </div>

      <div className="form-group mt-2">
        <label className="form-label text-xs">📍 {t('address')}</label>
        <textarea className="form-input" style={{ height: 60 }} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
      </div>

      <div className="grid-2 gap-4 mt-2">
        <div className="form-group">
          <label className="form-label text-xs">🏢 {t('district')}</label>
          <input className="form-input" value={form.district} onChange={e => setForm({...form, district: e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label text-xs">💳 {t('cardType')}</label>
          <select className="form-input" value={form.cardType} onChange={e => setForm({...form, cardType: e.target.value})}>
            <option value="PHH">PHH</option>
            <option value="AAY">AAY (Antyodaya)</option>
            <option value="NPHH">NPHH</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex-between mb-2">
          <label className="form-label text-xs font-bold">👨‍👩‍👧‍👦 {t('familyMembers')}</label>
          <button className="btn btn-secondary btn-xs" onClick={addMember}>+ {t('addMember') || 'Add'}</button>
        </div>
        <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--gray-100)', borderRadius: 8, padding: 8 }}>
          {family.map((m, i) => (
            <div key={i} className="flex gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
              <input className="form-input flex-1" style={{ fontSize: 11 }} placeholder="Name" value={m.name} onChange={e => handleFamilyChange(i, 'name', e.target.value)} />
              <input className="form-input" style={{ width: 45, fontSize: 11 }} placeholder="Age" value={m.age} onChange={e => handleFamilyChange(i, 'age', e.target.value)} />
              <button className="btn btn-red btn-xs" style={{ padding: '0 8px' }} onClick={() => removeMember(i)}>✕</button>
            </div>
          ))}
          {family.length === 0 && <p className="text-center text-xs text-muted italic p-4">No family members listed</p>}
        </div>
      </div>

      <div className="modal-footer mt-6" style={{ borderTop: 'none', padding: 0 }}>
        <button className="btn btn-secondary flex-1" onClick={onCancel}>{t('cancel')}</button>
        <button className="btn btn-primary flex-1" onClick={submit}>💾 {t('saveChanges')}</button>
      </div>
    </div>
  );
};

export default AdminUsersPage;
