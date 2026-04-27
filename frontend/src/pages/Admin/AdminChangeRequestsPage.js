import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { cachedFetch } from '../../utils/apiCache';

const AdminChangeRequestsPage = () => {
  const { lang, setPage, setAdminEditContext } = useApp();
  const t = (k) => T[lang][k]||k;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await cachedFetch(`${API_BASE_URL}/api/admin/change-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch (e) {
      console.log(e);
      window.globalToast?.('Fetch Error', 'Failed to load change requests', 'error');
    }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await cachedFetch(`${API_BASE_URL}/api/admin/change-requests/${id}/approve`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ modifiedValue: tempValue, remarks })
      });
      const data = await res.json();
      if (data.success) {
        window.globalToast?.('Approved', 'User profile updated and push notification sent', 'success');
        setEditingId(null);
        fetchRequests();
      } else {
        window.globalToast?.('Approval Failed', data.message || 'Error occurred', 'error');
      }
    } catch (e) { console.log(e); }
    setLoading(false);
  };

  const handleReject = async (id) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await cachedFetch(`${API_BASE_URL}/api/admin/change-requests/${id}/reject`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ remarks })
      });
      const data = await res.json();
      if (data.success) {
        window.globalToast?.('Rejected', 'Request dismissed and user notified', 'error');
        setEditingId(null);
        fetchRequests();
      } else {
        window.globalToast?.('Rejection Failed', data.message || 'Error occurred', 'error');
      }
    } catch (e) { console.log(e); }
    setLoading(false);
  };

  if (loading) return <div className="flex-center p-10"><div className="spinner"></div></div>;

  return (
    <div className="page animate-fade-in" style={{ padding: 20 }}>
      <div className="flex-between mb-6">
        <h1>📑 {t('changeRequestsMgmt')}</h1>
        <button className="btn btn-secondary btn-sm" onClick={fetchRequests}>🔄 {t('back')}</button>
      </div>

      <div className="card shadow-lg p-0 overflow-hidden">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>{t('requestDetail')}</th>
              <th>{t('userInfo')}</th>
              <th>{t('oldValue')}</th>
              <th>{t('newValue')}</th>
              <th>{t('status')}</th>
              <th>{t('confirm')}</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id}>
                <td data-label="REQUEST">
                  <div style={{ fontWeight: 800 }}>{r.fieldName}</div>
                  <div className="text-muted text-xs">{r.requestType}</div>
                </td>
                <td data-label="USER">
                  <div style={{ fontWeight: 700 }}>{r.userName}</div>
                  <div className="text-muted text-xs">{r.rationCard}</div>
                </td>
                <td data-label="OLD VALUE" className="text-muted">{r.oldValue}</td>
                <td data-label="NEW VALUE" style={{ color: 'var(--green)', fontWeight: 700 }}>{r.newValue}</td>
                <td data-label="STATUS">
                  <span className={`tag ${r.status === 'PENDING' ? 'tag-amber' : r.status === 'APPROVED' ? 'tag-green' : 'tag-red'}`} style={{ fontSize: 9 }}>
                    {r.status}
                  </span>
                </td>
                <td data-label="ACTION">
                  {r.status === 'PENDING' ? (
                    <button className="btn btn-primary btn-xs" onClick={() => {
                      setEditingId(r.id);
                      setTempValue(r.newValue);
                      setRemarks('');
                    }}>{t('review')}</button>
                  ) : (
                    <span className="text-muted text-xs">{t('close')}</span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan="6" className="text-center p-10 text-muted">{t('noNotifications')}</td></tr>}
          </tbody>
        </table>
      </div>

      {editingId && (
        <div className="modal-overlay">
          <div className="modal animate-scale-in" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>🛠️ {t('reviewModalTitle')}</h3>
              <button className="close-btn" onClick={() => setEditingId(null)}>✕</button>
            </div>
            {(() => {
              const r = requests.find(x => x.id === editingId);
              return (
                <>
                  <div className="modal-body">
                    <div className="mb-4 p-3 bg-gray-50 rounded text-xs border border-gray-200">
                    <p><b>{t('profile')}:</b> {r.userName} ({r.rationCard})</p>
                    <p><b>{t('category')}:</b> {r.fieldName}</p>
                    <p><b>{t('userComment')}:</b> {r.description || 'None'}</p>
                  </div>
                  
                  <div className="form-group mb-4">
                    <label className="form-label text-xs">👀 {t('requestedValue') || 'Requested Value'}</label>
                    <div className="form-input bg-gray-50" style={{ fontWeight: 700, borderStyle: 'dashed' }}>
                      {tempValue}
                    </div>
                  </div>

                  <div className="mb-4">
                    <button 
                      className="btn btn-secondary btn-full bg-blue-50 text-blue-700 border-blue-200"
                      style={{ fontSize: 11, fontWeight: 700 }}
                      onClick={() => {
                        setAdminEditContext({ 
                          search: r.rationCard,
                          fieldName: r.fieldName,
                          newValue: r.newValue,
                          oldValue: r.oldValue
                        });
                        setPage('admin-users');
                      }}
                    >
                      🛠️ {t('editInUserMgmt') || 'Open User Management to Edit'}
                    </button>
                    <p className="text-xs text-muted mt-1 italic">Note: Use this button to manually fix the user's profile before approving.</p>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label text-xs">{t('adminRemarks')}</label>
                    <textarea className="form-input" style={{ height: 60 }} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder={t('remarksPlaceholder')} />
                  </div>

                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-secondary flex-1" onClick={() => setEditingId(null)}>{t('cancel')}</button>
                    <button className="btn btn-red flex-1" onClick={() => handleReject(r.id)}>{t('reject')}</button>
                    <button className="btn btn-primary flex-1" onClick={() => handleApprove(r.id)}>{t('submit')}</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChangeRequestsPage;
