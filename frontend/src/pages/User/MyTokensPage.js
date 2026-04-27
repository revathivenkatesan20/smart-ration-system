import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { API_BASE_URL } from '../../utils/constants';
import { tokenStatusTag } from '../../utils/logic';
import { cachedFetch } from '../../utils/apiCache';

const MyTokensPage = ({ newToken }) => {
  const { lang, setPage } = useApp();
  const t = (k) => T[lang][k]||k;
  const [tokens, setTokens] = useState([]);
  const [qrToken, setQrToken] = useState(null);
  const [detailToken, setDetailToken] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);

  useEffect(() => {
    const authToken = sessionStorage.getItem('token');
    if (!authToken) { setLoadingTokens(false); return; }
    cachedFetch(`${API_BASE_URL}/api/tokens/my-tokens`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data && data.data.length > 0) {
        const mapped = data.data.map(t => ({
          id:t.id, number:t.localTokenNumber || t.tokenNumber,
          govtRef: t.tokenNumber,
          slot:`${t.timeSlotStart} - ${t.timeSlotEnd}`,
          date:t.tokenDate, shop:t.shopName,
          amount:parseFloat(t.totalAmount)||0,
          payment:t.paymentMode||'Cash', status:t.status,
          isThreeMonth: t.isThreeMonthBundle,
          items: t.items || []
        }));
        setTokens(mapped);
      }
    })
    .catch(err => console.log('Tokens error:', err))
    .finally(() => setLoadingTokens(false));
  }, []);

  useEffect(() => {
    if (newToken) {
      setTokens(prev => {
        const exists = prev.find(t => t.number===newToken.number);
        if (!exists) return [newToken, ...prev];
        return prev;
      });
    }
  }, [newToken]);

  const [cancelling, setCancelling] = useState(null);
  const [loadingTokens, setLoadingTokens] = useState(true);

  const handleCancel = async (tokenNumber) => {
    setCancelling(tokenNumber);
    try {
      const authToken = sessionStorage.getItem('token');
      const res = await cachedFetch(`${API_BASE_URL}/api/tokens/${tokenNumber}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setTokens(prev => prev.map(tok =>
          tok.number === tokenNumber ? { ...tok, status: 'Cancelled' } : tok));
        window.globalToast?.('Cancelled', `Token ${tokenNumber} has been cancelled.`, 'info');
      } else {
        window.globalToast?.('Error', data.message || 'Failed to cancel token', 'error');
      }
    } catch (e) {
      window.globalToast?.('Error', 'Connection failed', 'error');
    }
    setCancelling(null);
    setCancelConfirm(null);
  };

  return (
    <div className="page animate-slide-up">
      <div className="page-header"><h1>🎫 {t('myTokens')}</h1></div>

      {loadingTokens ? (
        <div className="card" style={{textAlign:'center', padding:60}}>
          <div className="spinner" style={{margin:'0 auto 16px'}} />
          <p style={{color:'var(--gray-400)', fontSize:13}}>
            {lang === 'ta' ? 'உங்கள் டோக்கன்கள் ஏற்றப்படுகின்றன...' : 'Loading your tokens...'}
          </p>
        </div>
      ) : tokens.length===0 ? (
        <div className="card shadow-sm" style={{textAlign:'center',padding:40, background:'var(--white)'}}>
          <div style={{fontSize:48,marginBottom:12}}>🎫</div>
          <div style={{fontWeight:800,color:'var(--gray-400)'}}>
            {lang === 'ta' ? 'டோக்கன் இல்லை' : 'No tokens yet'}
          </div>
          <div style={{fontSize:13,color:'var(--gray-300)',marginTop:4}}>
            {lang === 'ta' ? 'ரேஷன் பெற உங்கள் முதல் டோக்கனை உருவாக்கவும்' : 'Generate your first token to collect rations'}
          </div>
        </div>
      ) : null}

      {!loadingTokens && tokens.map(tok => (
        <div key={tok.id||tok.number} style={{marginBottom:16}}>
          <div className="token-card" onClick={() => setDetailToken(tok)} style={{cursor:'pointer', position:'relative'}}>
            <div style={{display:'flex',justifyContent:'space-between',
              alignItems:'flex-start',marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:800,color:'var(--gray-400)',letterSpacing:1}}>TOKEN NUMBER</div>
              <div className={`tag ${tokenStatusTag(tok.status)}`}>{tok.status}</div>
            </div>
            <div className="token-number" style={{fontSize: 32, marginBottom: 4, fontWeight:900, color:'var(--green-dark)'}}>{tok.number}</div>
            <div style={{fontSize: 11, fontWeight: 700, color: 'var(--blue-dark)', background: '#e0e7ff', padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 12, border: '1px solid #c7d2fe'}}>
              GOVT REF: {tok.govtRef}
            </div>
            {tok.isThreeMonth && (
              <div style={{fontSize: 11, fontWeight: 800, color: 'white', background: 'linear-gradient(90deg, #166534 0%, #15803d 100%)', padding: '2px 10px', borderRadius: 4, display: 'inline-block', marginBottom: 12, marginLeft: 8, boxShadow: '0 2px 4px rgba(22,101,52,0.2)'}}>
                ⭐ 3-MONTH BUNDLE
              </div>
            )}
            <div className="token-slot" style={{fontWeight:900, color:'#000000', fontSize:14}}>⏰ {tok.slot && tok.slot !== ' - ' ? tok.slot : 'Anytime Today'}</div>
            <div className="token-date" style={{fontSize:13, color:'var(--gray-500)'}}>📅 {tok.date} · 🏪 {tok.shop}</div>
            <div style={{display:'flex',justifyContent:'space-between',
              alignItems:'center',marginTop:14}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--gray-600)'}}>💳 {tok.payment}</div>
              <div style={{fontWeight:800,fontSize:20, color:'var(--green)'}}>
                ₹{typeof tok.amount==='number'?tok.amount.toFixed(2):tok.amount}
              </div>
            </div>
            <div style={{position:'absolute', bottom:10, right:10, fontSize:12, color:'var(--gray-300)'}}>Tap for details 🔍</div>
          </div>
          {tok.status==='Confirmed' && (
            <div style={{display:'flex',gap:10,marginTop:10}}>
              <button className="btn btn-primary btn-sm"
                onClick={(e) => { e.stopPropagation(); setQrToken(tok); }}>
                📷 {t('viewQR')}
              </button>
              <button className="btn btn-danger btn-sm"
                disabled={cancelling === tok.number}
                onClick={(e) => { e.stopPropagation(); setCancelConfirm(tok.number); }}>
                {cancelling === tok.number ? '⏳' : '✕'} {t('cancel')}
              </button>
            </div>
          )}
        </div>
      ))}

      {/* DETAIL MODAL (NEW) */}
      {detailToken && (
        <div className="modal-overlay" onClick={() => setDetailToken(null)}>
          <div className="modal" style={{maxWidth:420, padding:0}} onClick={e => e.stopPropagation()}>
             <div className="modal-header" style={{padding:20, borderBottom:'1px solid var(--gray-100)'}}>
                <h3 style={{margin:0}}>🧾 Token Details: {detailToken.number}</h3>
                <button className="close-btn" onClick={() => setDetailToken(null)}>✕</button>
             </div>
             <div className="modal-body" style={{padding:20}}>
                <div style={{background:'var(--gray-50)', padding:14, borderRadius:12, marginBottom:16}}>
                   <div style={{fontSize:11, color:'var(--gray-400)', fontWeight:700, marginBottom:4}}>COLLECTION POINT</div>
                   <div style={{fontWeight:800, fontSize:14}}>🏪 {detailToken.shop}</div>
                   <div style={{fontSize:12, color:'var(--gray-500)', marginTop:4}}>🕒 {detailToken.date} · {detailToken.slot}</div>
                </div>

                <div style={{fontWeight:800, fontSize:13, marginBottom:10, color:'var(--gray-700)'}}>📦 Ration Items Breakdown</div>
                {detailToken.items && detailToken.items.length > 0 ? (
                  <div style={{border:'1px solid var(--gray-100)', borderRadius:12, overflow:'hidden'}}>
                    {detailToken.items.map((it, idx) => (
                      <div key={idx} style={{display:'flex', justifyContent:'space-between', padding:'10px 14px', borderBottom: idx < detailToken.items.length-1 ? '1px solid var(--gray-50)' : 'none', background: idx%2===0 ? 'white' : 'var(--gray-50)'}}>
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          <span style={{fontSize:14}}>{it.icon || '📦'}</span>
                          <div>
                            <div style={{fontWeight:700, fontSize:13}}>{lang === 'ta' ? it.nameTa : it.nameEn}</div>
                            <div style={{fontSize:10, color:'var(--gray-400)'}}>Qty: {it.quantity} {it.unit || 'units'}</div>
                          </div>
                        </div>
                        <div style={{fontWeight:800, fontSize:13, color:'var(--green)'}}>₹{(it.price * it.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                    <div style={{display:'flex', justifyContent:'space-between', padding:'12px 14px', background:'var(--green-light)', borderTop:'1px solid var(--green-200)'}}>
                       <span style={{fontWeight:800, color:'var(--green-dark)'}}>Total Amount {detailToken.isThreeMonth ? '(3-Month Advance)' : ''}</span>
                       <span style={{fontWeight:900, fontSize:16, color:'var(--green-dark)'}}>₹{detailToken.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{textAlign:'center', padding:20, border:'2px dashed var(--gray-100)', borderRadius:12, color:'var(--gray-400)', fontSize:12}}>
                    No item details available for this token.
                  </div>
                )}
             </div>
             <div className="modal-footer" style={{padding:16}}>
                <button className="btn btn-secondary btn-full" onClick={() => setDetailToken(null)}>Close</button>
             </div>
          </div>
        </div>
      )}

      {qrToken && (
        <div className="modal-overlay" onClick={() => setQrToken(null)}>
          <div className="modal" style={{maxWidth:380, padding:0}} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{padding:20}}>
              <h3>📷 Token QR Code</h3>
              <button className="close-btn" onClick={() => setQrToken(null)}>✕</button>
            </div>
            <div className="modal-body" style={{textAlign:'center', paddingBottom:24}}>
              <div style={{fontWeight:800,fontSize:18,marginBottom:16,color:'var(--green-dark)'}}>
                {qrToken.number}
              </div>
              <div style={{background:'white',borderRadius:20,padding:20,
                display:'inline-block',boxShadow:'0 12px 30px rgba(0,0,0,0.1)',
                margin:'0 auto 20px',border:'1px solid var(--gray-100)'}}>
                <QRCodeSVG
                   value={`RATION:${qrToken.number}|SHOP:${qrToken.shop}|DATE:${qrToken.date}|STATUS:${qrToken.status}`}
                   size={180} level="H" includeMargin={false}
                   fgColor="#1a7a4a" bgColor="#ffffff"
                />
              </div>
              <div style={{background:'var(--green-light)',borderRadius:10,
                padding:12,fontSize:13,color:'var(--green-dark)',fontWeight:700, margin:'0 20px'}}>
                📍 Show this QR at the shop counter
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {cancelConfirm && (
        <div className="modal-overlay" onClick={() => setCancelConfirm(null)}>
          <div className="modal" style={{maxWidth:400}} onClick={e => e.stopPropagation()}>
            <div className="text-center p-6">
              <div style={{fontSize:64, marginBottom:20}}>🗑️</div>
              <h2 style={{fontWeight:900, color:'var(--gray-800)', marginBottom:12}}>Cancel Token?</h2>
              <p style={{color:'var(--gray-500)', lineHeight:1.6, marginBottom:24}}>
                Are you sure you want to cancel token <b>#{cancelConfirm}</b>? 
                This will release the reserved items back to the shop inventory.
              </p>
              <div style={{display:'flex', gap:12}}>
                <button className="btn btn-secondary flex-1" onClick={() => setCancelConfirm(null)}>
                   No, Keep it
                </button>
                <button 
                  className="btn btn-danger flex-1" 
                  disabled={cancelling === cancelConfirm}
                  onClick={() => handleCancel(cancelConfirm)}>
                  {cancelling === cancelConfirm ? 'Cancelling...' : 'Yes, Cancel Token'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTokensPage;
