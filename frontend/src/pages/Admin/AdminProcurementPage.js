import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';

const AdminProcurementPage = () => {
  const { lang } = useApp();
  const t = (k) => T[lang][k]||k;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/procurement/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // Since backend returns direct list for this endpoint
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log(e);
      window.globalToast?.('Error', 'Failed to load procurement requests', 'error');
    }
    setLoading(false);
  };

  const handleAction = async (id, action) => {
    setProcessingId(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/procurement/${id}/${action}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: action === 'reject' ? JSON.stringify({ remarks }) : null
      });
      const data = await res.json();
      if (data.success) {
        window.globalToast?.(
          action === 'approve' ? 'Fulfillment Successful' : t('rejectShort'), 
          data.message, 
          action === 'approve' ? 'success' : 'error'
        );
        fetchRequests();
      } else {
        window.globalToast?.('Error', data.message, 'error');
      }
    } catch (e) { console.log(e); }
    setProcessingId(null);
  };

  if (loading) return <div className="flex-center p-20"><div className="spinner"></div></div>;

  return (
    <div className="page animate-fade-in" style={{ padding: 20 }}>
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">🚛 {t('procurementMgmt')}</h1>
          <p className="text-muted text-sm">{t('pendingRequests')}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchRequests}>🔄 {t('back')}</button>
      </div>

      <div className="card shadow-xl p-0 overflow-hidden border-0">
        <table className="table-clean">
          <thead className="bg-gray-50">
            <tr>
              <th>{t('username')}</th>
              <th>{t('item')}</th>
              <th>{t('requestedQty')}</th>
              <th>{t('date')}</th>
              <th className="text-right">{t('actionsLevel')}</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} className="hover-bg-gray-50 transition-all">
                <td>
                  <div className="font-bold">{r.shop?.name}</div>
                  <div className="text-xs text-muted">{t('shopCodeShort')}: {r.shop?.id} | {r.shop?.district}</div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📦</span>
                    <span className="font-semibold">{lang === 'ta' && r.item?.nameTa ? r.item?.nameTa : r.item?.nameEn}</span>
                  </div>
                </td>
                <td>
                  <span className="text-lg font-bold text-amber-600">{r.requestedQuantity}</span>
                  <span className="ml-1 text-xs text-muted uppercase">{r.item?.unit}</span>
                </td>
                <td className="text-sm text-muted">
                  {r.requestDate ? new Date(r.requestDate).toLocaleDateString() : 'N/A'}
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      className="btn btn-danger btn-xs" 
                      onClick={() => {
                        const reason = window.prompt(t('remarksPlaceholder'));
                        if (reason !== null) {
                          setRemarks(reason);
                          handleAction(r.id, 'reject');
                        }
                      }}
                      disabled={processingId === r.id}
                    >
                      {t('rejectShort')}
                    </button>
                    <button 
                      className="btn btn-primary btn-xs" 
                      onClick={() => handleAction(r.id, 'approve')}
                      disabled={processingId === r.id}
                    >
                      {processingId === r.id ? '...' : t('approve')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center p-20">
                  <div className="text-4xl mb-4">✅</div>
                  <p className="text-muted font-medium">{t('noDataFound')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProcurementPage;
