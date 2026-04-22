import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { API_BASE_URL } from '../../utils/constants';
import { memberIcon } from '../../utils/logic';

const ProfilePage = () => {
  const { lang } = useApp();
  const [profile, setProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    if (!authToken) return;
    
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/api/user/profile`, { headers: { Authorization: `Bearer ${authToken}` } }).then(res => res.json()),
      fetch(`${API_BASE_URL}/api/user/members`, { headers: { Authorization: `Bearer ${authToken}` } }).then(res => res.json())
    ])
    .then(([profData, membData]) => {
      if (profData.success) setProfile(profData.data);
      if (membData.success) {
        // De-duplicate: remove duplicates by id or by name match (in case head appears twice)
        const raw = membData.data || [];
        const seen = new Set();
        const unique = raw.filter(m => {
          const key = (m.name || '').toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setMembers(unique);
      }
    })
    .catch(err => console.log('Profile Load Error:', err))
    .finally(() => setLoading(false));
  }, []);

  const t = (k) => T[lang][k]||k;
  const name = profile?.name || profile?.headOfFamily || localStorage.getItem('userName') || 'User';
  const cardType = profile?.cardType || 'PHH';
  const rationCard = profile?.rationCardNumber || localStorage.getItem('rationCardNumber') || '-';
  const district = profile?.district || '-';

  if (loading) return (
    <div className="page flex-center h-full">
      <div className="spinner"></div>
    </div>
  );

  return (
    <div className="page animate-slide-up">
      <div className="page-header">
        <h1>👤 {t('profile')}</h1>
      </div>

      {/* MODERN SMART RATION CARD UI - SHRUNK FOR SUITABILITY */}
      <div className="card shadow-2xl overflow-hidden" style={{
        background: '#1a1a1a', 
        borderRadius: 20, 
        padding: 0,
        color: 'white',
        border: 'none',
        maxWidth: 420,
        margin: '0 auto 20px auto',
        boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
        transform: window.innerWidth < 400 ? 'scale(0.95)' : 'none'
      }}>
        <div style={{
          background: 'linear-gradient(90deg, #d97706, #f59e0b)',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(0,0,0,0.5)'}}>
              {lang==='ta' ? 'தமிழ்நாடு அரசு' : 'GOVERNMENT OF TAMIL NADU'}
            </div>
            <div style={{fontSize:13, fontWeight:900, color:'rgba(0,0,0,0.8)'}}>
               {t('civilSupplies')}
            </div>
          </div>
          <div style={{fontSize:24}}>🦁</div>
        </div>

        <div className="responsive-card-body" style={{
          padding: '16px 20px', 
          display: 'flex', 
          flexDirection: window.innerWidth < 420 ? 'column-reverse' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{flex: 1, textAlign: window.innerWidth < 420 ? 'center' : 'left'}}>
            <div style={{color:'var(--gray-500)', fontSize:9, fontWeight:800, textTransform:'uppercase', marginBottom:2}}>
               {t('rationCard')}
            </div>
            <div style={{fontSize: 18, fontWeight:900, color:'var(--green)', letterSpacing:1}}>{rationCard}</div>
            
            <div className="mt-3">
              <div style={{color:'var(--gray-500)', fontSize:9, fontWeight:700}}>{t('headOfFamily')}</div>
              <div style={{fontSize: 15, fontWeight:800}}>{name}</div>
            </div>

            <div style={{display:'flex', gap:16, marginTop:12, justifyContent: window.innerWidth < 420 ? 'center' : 'flex-start'}}>
               <div>
                  <div style={{color:'var(--gray-500)', fontSize:8, fontWeight:700}}>{t('compCardType')}</div>
                  <div style={{fontSize:12, fontWeight:900, color:'#f59e0b'}}>{cardType}</div>
               </div>
               <div>
                  <div style={{color:'var(--gray-500)', fontSize:8, fontWeight:700}}>{t('compDistrict')}</div>
                  <div style={{fontSize:12, fontWeight:800}}>{district}</div>
               </div>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection: 'column', alignItems:'center', gap:8 }}>
            <div style={{
              width: 90, 
              height: 90, 
              background:'white', 
              borderRadius:10, 
              padding:6, 
              display:'flex', 
              alignItems:'center', 
              justifyContent:'center'
            }}>
              <QRCodeSVG value={rationCard} size={78} />
            </div>
            <div style={{background:'rgba(255,255,255,0.05)', borderRadius:40, padding:'3px 10px', fontSize:8, fontWeight:700, color:'var(--green)'}}>
               ✅ SECURE
            </div>
          </div>
        </div>

        <div style={{padding:'8px 20px', background:'rgba(255,255,255,0.05)', fontSize:9, color:'var(--gray-500)', display:'flex', justifyContent:'space-between'}}>
           <span>v2.0 Compact</span>
           <span style={{color:'var(--gray-400)'}}>ID: TN-{rationCard.slice(-4)}</span>
        </div>
      </div>

      <div className="grid-2 gap-4 mb-6">
         <div className="card shadow-sm" style={{padding:16}}>
            <div style={{fontSize:11, color:'var(--gray-400)', fontWeight:800, marginBottom:12}}>📱 {t('contactInfo')}</div>
            <div className="flex-between py-2 border-b-gray-50">
               <span style={{fontSize:13, color:'var(--gray-500)'}}>Mobile</span>
               <span style={{fontSize:13, fontWeight:700}}>{profile?.mobileNumber || '-'}</span>
            </div>
            <div className="flex-between py-2">
               <span style={{fontSize:13, color:'var(--gray-500)'}}>Address</span>
               <span style={{fontSize:12, fontWeight:700, textAlign:'right', maxWidth:180}}>{profile?.address || '-'}</span>
            </div>
         </div>
         <div className="card shadow-sm" style={{padding:16}}>
            <div style={{fontSize:11, color:'var(--gray-400)', fontWeight:800, marginBottom:12}}>🏛️ {t('assignedShopTab')}</div>
            <div className="flex-between py-2 border-b-gray-50">
               <span style={{fontSize:12, color:'var(--gray-500)'}}>Permanent Govt Shop</span>
               <span style={{fontSize:12, fontWeight:700, textAlign:'right'}}>{profile?.govtShopName || '-'}</span>
            </div>
            <div className="flex-between py-2">
               <span style={{fontSize:12, color:'var(--gray-500)'}}>Active Purchase Shop</span>
               <span style={{fontSize:12, fontWeight:700, color:'var(--amber-dark)', textAlign:'right'}}>{profile?.shopName || '-'}</span>
            </div>
         </div>
      </div>

      <div className="card animate-fade-in shadow-lg">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <div style={{fontWeight:900, fontSize:17, color:'var(--gray-800)'}}>👨‍👩‍👧‍👦 {t('familyMembers')}</div>
          <span className="badge-available" style={{fontSize:11, padding:'4px 12px'}}>{members.length} Units</span>
        </div>
        
        {members.length > 0 ? (
          <div className="grid-3 gap-4">
            {members.map(m => (
              <div key={m.id} style={{background:'var(--gray-50)', borderRadius:20, padding:16, display:'flex', flexDirection:'column', alignItems:'center', gap:8, border:'1px solid var(--gray-100)'}}>
                <div style={{width:50, height:50, borderRadius:'50%', background:'white', display:'flex', alignItems:'center', justifyContext:'center', fontSize:24, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                  {memberIcon(m.gender)}
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontWeight:800, fontSize:14}}>{m.name}</div>
                  <div style={{fontSize:11, color:'var(--gray-500)', marginTop:2}}>{m.relation} {m.age ? `· ${m.age} Yrs` : ''}</div>
                  {m.isHead && <div style={{fontSize:9, background:'var(--green-light)', color:'var(--green-dark)', padding:'2px 8px', borderRadius:20, display:'inline-block', marginTop:6, fontWeight:900}}>HEAD</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{textAlign:'center', padding:40, border:'2px dashed var(--gray-100)', borderRadius:20, color:'var(--gray-400)'}}>
            No family member records found.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
