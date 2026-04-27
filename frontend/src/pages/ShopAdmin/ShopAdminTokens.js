import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { tokenStatusTag } from '../../utils/logic';
import { cachedFetch } from '../../utils/apiCache';

const ShopAdminTokens = () => {
  const { lang } = useApp();
  const t = (k) => T[lang]?.[k] || k;
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadTokens = () => {
    setLoading(true);
    cachedFetch(`${API_BASE_URL}/api/shop-admin/tokens`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(r => r.json())
    .then(d => { if(d.success) setTokens(d.data); })
    .catch(()=>{})
    .finally(() => setLoading(false));
  };

  useEffect(() => { loadTokens(); }, []);

  const markCollected = async (tokenNum) => {
    try {
      const res = await cachedFetch(
        `${API_BASE_URL}/api/tokens/${tokenNum}/collect`,
        {
          method:'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const d = await res.json();
      if(d.success) {
        setTokens(prev => prev.map(tok =>
          (tok.tokenNumber===tokenNum||tok.number===tokenNum)
            ? {...tok, status:'Collected', paymentStatus:'Paid'}
            : tok));
        window.globalToast?.('Success', `${tokenNum} ` + t('collected'), 'success');
      }
    } catch(e) { window.globalToast?.('Error', t('noDataFound'), 'error'); }
  };

  const counts = {
    all: tokens.length,
    Confirmed: tokens.filter(tok=>tok.status==='Confirmed').length,
    Collected: tokens.filter(tok=>tok.status==='Collected').length,
    Cancelled: tokens.filter(tok=>tok.status==='Cancelled').length,
    Pending: tokens.filter(tok=>tok.status==='Pending').length,
  };

  const filtered = filter==='all' ? tokens : tokens.filter(tok => tok.status===filter);

  return (
    <div className="page animate-slide-up">
      <div className="page-header" style={{display:'flex',justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h1>🎫 {t('tokenMonitor')}</h1>
          <p>{tokens.length} {t('totalTokens')}</p>
        </div>
        <button className="btn btn-secondary" onClick={loadTokens}>🔄 {t('refresh') || 'Refresh'}</button>
      </div>

      <div className="stat-grid" style={{marginBottom:16}}>
        {[
          {label: t('all') || 'Total', value:counts.all, color:'blue'},
          {label: t('confirmed'), value:counts.Confirmed, color:'green'},
          {label: t('markCollected'), value:counts.Collected, color:'green'},
          {label: t('cancelled') || 'Cancelled', value:counts.Cancelled, color:'red'},
        ].map((s,i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:16, padding:'12px 16px', border: '1px solid var(--gray-100)'}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['all','Confirmed','Collected', 'Pending','Cancelled'].map(f => (
            <button key={f}
              className={`btn ${filter===f?'btn-primary':'btn-secondary'} btn-sm`}
              onClick={() => setFilter(f)}>
              {f === 'all' ? (t('all') || 'All') : f === 'Confirmed' ? t('confirmed') : f === 'Collected' ? t('collected') : f === 'Pending' ? t('pending') : (t('cancelled') || f)} ({counts[f]||0})
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{textAlign:'center',padding:30}}>
            <div className="spinner"/>
          </div>
        ) : filtered.length===0 ? (
          <div style={{textAlign:'center',padding:30, color:'var(--gray-400)'}}>
            {t('noDataFound')}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('tokenNumber')}</th>
                  <th>{t('username')}</th>
                  <th>{t('slot')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('payment')}</th>
                  <th>{t('status')}</th>
                  <th>{t('actionsLevel')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tok,i) => {
                  const num = tok.tokenNumber||tok.number;
                  const status = tok.status||'Pending';
                  const payStatus = tok.paymentStatus||'Pending';
                  const payMode = tok.paymentMode||'Cash';
                  return (
                    <tr key={i}>
                      <td style={{fontFamily:'monospace', fontSize:11, fontWeight:700, color:'var(--green)'}}>{num}</td>
                      <td style={{fontSize:12}}>{tok.user||tok.rationCardNumber||'—'}</td>
                      <td style={{fontSize:12}}>{tok.slot||'—'}</td>
                      <td style={{fontWeight:700, color:'var(--green)'}}>
                        ₹{parseFloat(tok.amount||0).toFixed(0)}
                      </td>
                      <td>
                        <span className={`tag ${payStatus==='Paid'?'tag-green':'tag-amber'}`}>
                          {payStatus==='Paid' ? (payMode==='Cash' ? '💵 '+t('offline') : '📱 '+t('online')) : '⏳ '+t('pending')}
                        </span>
                      </td>
                      <td><span className={`tag ${tokenStatusTag(status, lang)}`}>{status === 'Confirmed' ? t('confirmed') : status === 'Collected' ? t('collected') : status === 'Cancelled' ? (t('cancelled') || 'Cancelled') : status}</span></td>
                      <td>
                        {status==='Confirmed' && (
                          <button className="btn btn-primary btn-sm" onClick={()=>markCollected(num)}>
                            ✅ {t('markCollected')}
                          </button>
                        )}
                        {status==='Collected' && (
                          <span style={{color:'var(--green)', fontSize:12, fontWeight:700}}>
                            ✓ {t('collected')}
                          </span>
                        )}
                        {status==='Cancelled' && (
                          <span style={{color:'var(--red)', fontSize:12, fontWeight:700}}>
                            ✕ {t('cancelled')}
                          </span>
                        )}
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

export default ShopAdminTokens;
