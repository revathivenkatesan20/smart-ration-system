import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { API_BASE_URL } from '../../utils/constants';
import { tokenStatusTag } from '../../utils/logic';
import { cachedFetch } from '../../utils/apiCache';

const HistoryPage = () => {
  const { lang } = useApp();
  const t = (k) => T[lang][k]||k;
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authToken = sessionStorage.getItem('token');
    if (!authToken) { setLoading(false); return; }
    cachedFetch(`${API_BASE_URL}/api/user/transactions`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data && data.data.length > 0) {
        setTransactions(data.data.sort((a,b) => new Date(b.date) - new Date(a.date)));
      }
    })
    .catch(err => console.log('Transactions error:', err))
    .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page animate-slide-up">
      <div className="page-header" style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
        <div>
          <h1>📋 {t('transactionHistory')}</h1>
          <p style={{fontSize:13, color:'var(--gray-400)', marginTop:4}}>
            Track your ration collection records and digital receipts
          </p>
        </div>
        {!loading && transactions.length > 0 && (
          <div style={{background:'#e0e7ff', color:'var(--blue-dark)', padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:800, border: '1px solid #c7d2fe'}}>
            {transactions.length} RECORDS
          </div>
        )}
      </div>

      {loading ? (
        <div className="card text-center" style={{padding:60}}>
          <div className="spinner" style={{margin:'0 auto'}}></div>
          <p className="mt-4 text-muted">Retrieving your collection history...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="card shadow-sm" style={{textAlign:'center', padding:60, background:'var(--white)'}}>
          <div style={{fontSize:60, marginBottom:16}}>📦</div>
          <div style={{fontWeight:900, fontSize:18, color:'var(--gray-800)'}}>{t('no_transactions_yet')}</div>
          <div style={{fontSize:13, color:'var(--gray-400)', marginTop:8, maxWidth:300, margin:'8px auto'}}>
            You haven't collected any rations yet. Your tokens will appear here after shop authentication.
          </div>
          <button className="btn btn-primary mt-6" onClick={() => window.location.reload()}>
            🔄 Refresh History
          </button>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          {transactions.map((tx, i) => (
            <div key={tx.id || i} className="token-card" style={{padding:20, borderLeft:'5px solid var(--green)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
                 <div>
                    <div style={{fontSize:10, fontWeight:800, color:'var(--gray-400)', letterSpacing:1}}>REF: {tx.ref || 'TSR-'+(tx.id||i)}</div>
                    <div style={{fontSize:12, color:'var(--gray-500)', marginTop:2}}>📅 {new Date(tx.date).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})} · 🏪 {tx.shop}</div>
                 </div>
                 <div className={`tag ${tx.status === 'COLLECTED' ? 'tag-green' : 'tag-blue'}`}>
                   {tx.status === 'COLLECTED' ? (lang === 'ta' ? 'பெறப்பட்டது' : 'COLLECTED') : (lang === 'ta' ? 'உறுதி செய்யப்பட்டது' : 'PAID & CONFIRMED')}
                 </div>
              </div>
              
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, borderTop:'1px solid var(--gray-50)', paddingTop:12}}>
                 <div style={{display:'flex', alignItems:'center', gap:10}}>
                   <div style={{width:40, height:40, borderRadius:10, background:'var(--gray-100)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18}}>
                     🧾
                   </div>
                   <div>
                     <div style={{fontSize:11, color:'var(--gray-400)', fontWeight:700}}>PAYMENT MODE</div>
                     <div style={{fontSize:13, fontWeight:800, color:'#065f46', background:'#d1fae5', padding:'2px 8px', borderRadius:6, display:'inline-block'}}>
                       {tx.paymentMode || 'Cash'}
                     </div>
                   </div>
                 </div>
                 <div style={{textAlign:'right'}}>
                   <div style={{fontSize:11, color:'var(--gray-400)', fontWeight:700}}>AMOUNT PAID</div>
                   <div style={{fontSize:20, fontWeight:900, color:'var(--green)'}}>₹{parseFloat(tx.amount || 0).toFixed(2)}</div>
                 </div>
              </div>

              {tx.items && tx.items.length > 0 && (
                <div style={{marginTop:12, background:'var(--gray-50)', padding:8, borderRadius:8, fontSize:11, color:'var(--gray-500)'}}>
                  <b>Items:</b> {tx.items.map(it => `${it.itemName} (${it.quantity}${it.unit})`).join(', ')}
                </div>
              )}
            </div>
          ))}
          <div style={{textAlign:'center', padding:20, opacity:0.5, fontSize:12, fontWeight:700}}>
             🔒 END OF SECURE HISTORY
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
