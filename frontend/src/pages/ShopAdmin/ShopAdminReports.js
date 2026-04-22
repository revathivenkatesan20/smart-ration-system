import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { tokenStatusTag } from '../../utils/logic';

const ShopAdminReports = () => {
  const { lang } = useApp();
  const t = (k) => T[lang]?.[k] || k;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/shop-admin/reports`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(r => r.json())
    .then(d => { if(d.success) setData(d.data); })
    .catch(()=>{})
    .finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    if (!data?.tokens) return;
    const headers =
      'Token,User,Date,Amount,Payment,Status\n';
    const rows = data.tokens.map(tx =>
      `${tx.tokenNumber},${tx.user},${tx.date},`+
      `${tx.amount},${tx.paymentMode},${tx.status}`
    ).join('\n');
    const blob = new Blob([headers+rows],
      {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shop_report_${new Date().toLocaleDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    window.globalToast?.('Success', 'CSV Exported Successfully', 'success');
  };

  if (loading) return (
    <div className="page animate-slide-up">
      <div className="card" style={{textAlign:'center',padding:40}}>
        <div className="spinner"/>
      </div>
    </div>
  );

  return (
    <div className="page animate-slide-up">
      <div className="page-header" style={{display:'flex',justifyContent:'space-between', alignItems:'center'}}>
        <h1>📈 {t('reports')}</h1>
        <button className="btn btn-secondary" onClick={exportCSV}>
          📥 {t('exportCsv')}
        </button>
      </div>

      <div className="stat-grid" style={{marginBottom:20}}>
        {[
          {label: t('dailyTokens'), value:data?.totalTokens||0, color:'blue'},
          {label: t('collected') || 'Collected', value:data?.collected||0, color:'green'},
          {label: t('confirmed'), value:data?.confirmed||0, color:'amber'},
          {label: t('cancelled') || 'Cancelled', value:data?.cancelled||0, color:'red'},
        ].map((s,i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div className="card-title">💰 {t('revenue')} {t('summary') || 'Summary'}</div>
        <div style={{fontSize:36,fontWeight:800, color:'var(--green)'}}>
          ₹{parseFloat(data?.totalRevenue||0).toFixed(0)}
        </div>
        <div style={{fontSize:13, color:'var(--gray-500)',marginTop:4}}>
          {t('totalRevenue') || 'Total revenue from collected tokens'}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          📋 {t('txnHistory') || 'Transaction History'}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('tokenNumber')}</th>
                <th>{t('username')}</th>
                <th>{t('date')}</th>
                <th>{t('amount')}</th>
                <th>{t('payment')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.tokens||[]).length===0 ? (
                <tr><td colSpan={6} style={{textAlign:'center', color:'var(--gray-400)',padding:20}}>
                  {t('noDataFound')}
                </td></tr>
              ) : (data?.tokens||[]).map((tx,i) => (
                <tr key={i}>
                  <td style={{fontFamily:'monospace', fontSize:11,color:'var(--green)', fontWeight:700}}>
                    {tx.tokenNumber}
                  </td>
                  <td style={{fontSize:12}}>{tx.user||'-'}</td>
                  <td style={{color:'var(--gray-500)', fontSize:12}}>{tx.date||'—'}</td>
                  <td style={{fontWeight:700, color:'var(--green)'}}>
                    ₹{parseFloat(tx.amount||0).toFixed(0)}
                  </td>
                  <td>
                    <span className={`tag ${tx.paymentStatus==='Paid'?'tag-green':'tag-amber'}`}>
                      {tx.paymentStatus==='Paid' ? (tx.paymentMode==='Cash' ? '💵 '+t('offline') : '📱 '+t('online')) : '⏳ '+t('pending')}
                    </span>
                  </td>
                  <td><span className={`tag ${tokenStatusTag(tx.status, lang)}`}>{tx.status === 'Confirmed' ? t('confirmed') : tx.status === 'Collected' ? t('collected') : tx.status === 'Cancelled' ? t('cancelled') : tx.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShopAdminReports;
