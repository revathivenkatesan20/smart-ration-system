import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { tokenStatusTag } from '../../utils/logic';
import { cachedFetch } from '../../utils/apiCache';

const AdminTokensPage = () => {
  const { lang } = useApp();
  const t = (k) => T[lang][k]||k;
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTokens = () => {
    setLoading(true);
    cachedFetch(`${API_BASE_URL}/api/admin/tokens`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data.success) setTokens(data.data);
    })
    .catch(err => {
      console.log('Tokens load error:', err);
      setTokens([]);
    })
    .finally(() => setLoading(false));
  };

  useEffect(() => { loadTokens(); }, []);

  const markCollected = async (tok) => {
    try {
      const tokenNum = tok.number || tok.tokenNumber;
      const res = await cachedFetch(`${API_BASE_URL}/api/tokens/${tokenNum}/collect`, {
        method:'PUT',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        window.globalToast?.('Success', t('tokenStatus') + ': ' + t('collected'), 'success');
        loadTokens();
      }
    } catch(err) { window.globalToast?.('Error', t('noDataFound'), 'error'); }
  };

  const filtered = useMemo(() => {
    return tokens.filter(tok => 
      (tok.number || tok.tokenNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tok.user || tok.rationCardNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tokens, searchTerm]);

  return (
    <div className="page animate-slide-up">
      <div className="page-header">
        <h1>🎫 {t('tokenMonitor')}</h1>
        <div className="search-box">
          <input className="form-input" placeholder={t('search')}
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>
      <div className="card">
        {loading ? <div className="spinner" /> : filtered.length === 0 ? (
          <div style={{textAlign:'center', padding:40, color:'var(--gray-500)'}}>{t('noDataFound')}</div>
        ) : (
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>{t('tokenNumber')}</th>
                  <th>{t('username')}</th>
                  <th>{t('shop')}</th>
                  <th>{t('date')}</th>
                  <th>{t('slot')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('payment')}</th>
                  <th>{t('status')}</th>
                  <th>{t('actionsLevel')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tok, idx) => {
                  const tokenNum = tok.number || tok.tokenNumber;
                  const status = tok.status || 'Pending';
                  return (
                    <tr key={tok.id || idx}>
                      <td data-label={t('tokenNumber')} style={{fontWeight:700}}>{tokenNum}</td>
                      <td data-label={t('username')}>{tok.user || tok.rationCardNumber || '—'}</td>
                      <td data-label={t('shop')} style={{fontSize:12}}>{tok.shop || tok.shopName || '—'}</td>
                      <td data-label={t('date')}>{tok.date || tok.tokenDate || '—'}</td>
                      <td data-label={t('slot')}>{tok.slot || '—'}</td>
                      <td data-label={t('amount')} style={{fontWeight:800,color:'var(--green)'}}>
                        ₹{parseFloat(tok.amount||tok.totalAmount||0).toFixed(0)}
                      </td>
                      <td data-label={t('payment')}>
                        <span className={`tag ${(tok.paymentStatus||'Pending')==='Paid'?'tag-green':'tag-amber'}`}>
                          {(tok.paymentStatus||'Pending')==='Paid' ? ((tok.paymentMode||'Cash')==='Cash'?'💵 '+t('offline'):'📱 '+t('online')) : '⏳ '+t('pending')}
                        </span>
                      </td>
                      <td data-label={t('status')}>
                        <span className={`tag ${tokenStatusTag(status)}`}>
                          {status === 'Confirmed' ? t('confirmed') : status === 'Collected' ? t('collected') : status === 'Cancelled' ? (t('cancelled') || 'Cancelled') : status}
                        </span>
                      </td>
                      <td data-label={t('actionsLevel')} style={{justifyContent: 'flex-end'}}>
                        {status==='Confirmed' && <span style={{fontSize:12,color:'var(--amber)',fontWeight:700}}>⏳ pending collection</span>}
                        {status==='Collected' && <span style={{fontSize:12,color:'var(--green)',fontWeight:700}}>✓ {t('collected')}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTokensPage;
