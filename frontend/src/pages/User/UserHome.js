import React, { useState, useEffect } from 'react';
import PortalModal from '../../components/Common/PortalModal';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { API_BASE_URL, MOCK } from '../../utils/constants';
import { statusBadge, safeInitMap } from '../../utils/logic';

const UserHome = () => {
  const { user, lang, setPage, mapplsLoaded } = useApp();
  const t = (k) => T[lang][k]||k;

  const [profile, setProfile] = useState(null);
  const [shopStock, setShopStock] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStock, setLoadingStock] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [allShops, setAllShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const mapInstanceRef = React.useRef(null);

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    if (!authToken) { setLoadingProfile(false); setLoadingStock(false); return; }

    fetch(`${API_BASE_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data) {
        const p = data.data;
        setProfile(p);
        localStorage.setItem('rationCardNumber', p.rationCardNumber||'');
        localStorage.setItem('userName', p.name||p.headOfFamily||'');
        localStorage.setItem('shopId', String(p.shopId||4));
        localStorage.setItem('shopName', p.shopName||'');
        return p.shopId || 4;
      }
      return parseInt(localStorage.getItem('shopId')||'4');
    })
    .then(shopId => {
      setLoadingProfile(false);
      return fetch(`${API_BASE_URL}/api/stock/shop/${shopId}`);
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.success && data.data && data.data.length > 0) {
        const mapped = data.data.map(s => ({
          id:s.itemId, nameEn:s.nameEn||'Unknown', nameTa:s.nameTa||'',
          category:s.category||'Other', unit:s.unit||'kg',
          price:parseFloat(s.subsidyPrice)||0,
          available:parseFloat(s.quantityAvailable)||0,
          limit:parseFloat(s.monthlyEntitlement)||1,
          status:s.status||'Available',
          icon:s.category==='Grain'?'🌾':s.category==='Oil'?'🫙':
            s.category==='Sugar'?'🍬':s.category==='Pulse'?'🫘':
            s.category==='Kerosene'?'🛢️':'📦'
        }));
        setShopStock(mapped);
      }
    })
    .catch(err => console.log('Error:', err))
    .finally(() => {
      setLoadingStock(false);
      setLoadingProfile(false);
    });

    // Fetch All Shops for Map
    fetch(`${API_BASE_URL}/api/public/shops`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => { if (data.success) setAllShops(data.data); })
    .catch(e => console.error('Shops fetch error:', e));
  }, []);

  useEffect(() => {
    if (showMapModal) {
      setTimeout(() => {
        const mapContainer = document.getElementById('user-shop-map');
        if (!mapContainer) return;
        
        const shopLat = profile?.latitude || 12.6921;
        const shopLng = profile?.longitude || 79.9765;
        
        safeInitMap('user-shop-map', {
          properties: { center: [shopLng, shopLat], zoom: 14 }
        }, (map, isLeaflet) => {
          mapInstanceRef.current = map;
          if (isLeaflet) {
             allShops.forEach(s => {
               if (!s.latitude || !s.longitude) return;
               const isAssigned = s.id === profile?.shopId;
               const customIcon = window.L.divIcon({
                 className: 'custom-div-icon',
                 html: `<div class="shop-marker-icon ${isAssigned ? 'assigned' : ''}">🏪</div>`,
                 iconSize: [32, 32],
                 iconAnchor: [16, 38]
               });
               
               const m = window.L.marker([s.latitude, s.longitude], { icon: customIcon }).addTo(map)
                 .bindPopup(`<b>🏪 ${s.name}</b><br/>${s.district}`);
               
               m.on('click', () => {
                 setSelectedShop(s);
                 map.setView([s.latitude, s.longitude], 15);
               });

               if (isAssigned) {
                 m.openPopup();
                 setSelectedShop(s);
               }
             });
          } else if (window.mappls && window.mappls.Marker) {
             allShops.forEach(s => {
               if (!s.latitude || !s.longitude) return;
               const isAssigned = s.id === profile?.shopId;
               const m = new window.mappls.Marker({
                 map: map,
                 position: { lat: s.latitude, lng: s.longitude },
                 html: `<div class="shop-marker-icon ${isAssigned ? 'assigned' : ''}">🏪</div>`,
                 width: 32,
                 height: 32,
                 popupHtml: `<b>🏪 ${s.name}</b><br/>${s.district}`,
                 popupOptions: { openPopup: isAssigned }
               });

               m.addListener('click', () => {
                 setSelectedShop(s);
                 map.setCenter({ lat: s.latitude, lng: s.longitude });
                 map.setZoom(15);
               });

               if (isAssigned) setSelectedShop(s);
             });
          }
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            if (isLeaflet && map) map.invalidateSize();
          }, 300);
        });
      }, 500);
    }
  }, [showMapModal, profile, allShops]);

  const [showSwitchModal, setShowSwitchModal] = useState(null);

  const handleSwitchShop = async () => {
    const shopId = showSwitchModal?.id;
    if (!shopId) return;
    setShowSwitchModal(null);
    try {
      const authToken = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/user/update-shop`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ shopId })
      });
      const data = await res.json();
      if (data.success) {
        window.globalToast?.('Success', lang === 'ta' ? 'கடை வெற்றிகரமாக மாற்றப்பட்டது' : 'Active shop updated successfully', 'success');
        window.location.reload(); 
      } else {
        window.globalToast?.('Error', data.message || 'Failed to switch shop', 'error');
      }
    } catch (err) {
      window.globalToast?.('Error', 'Connection failed', 'error');
    }
  };

  const userName = profile?.name||profile?.headOfFamily||
    localStorage.getItem('userName')||'User';
  const rationCard = profile?.rationCardNumber||
    localStorage.getItem('rationCardNumber')||'';
  const cardType = profile?.cardType||localStorage.getItem('cardType')||'PHH';
  const district = profile?.district||'';
  const shopDistrict = profile?.shopDistrict||'';
  const shopName = profile?.shopName||localStorage.getItem('shopName')||'';
  const shopAddress = profile?.shopAddress||'';
  const shopManager = profile?.shopManagerName||'';

  const shopDist = (shopDistrict || '').toLowerCase();
  const sName = (shopName || '').toLowerCase();
  const sAddr = (shopAddress || '').toLowerCase();

  const familyUnits = (profile?.familyMembers || MOCK.members).reduce((acc, m) => acc + (m.age < 12 ? 0.5 : 1.0), 0);
  
  const getEntitlementsText = () => {
    const units = Math.max(1, familyUnits);
    const ct = (cardType || 'PHH').toUpperCase().trim();

    if (lang === 'ta') {
      if (ct.includes('AAY') || ct.includes('AY') || ct.includes('ANTYODAYA')) {
        return `அந்தியோதயா அட்டை: 35கி அரிசி (இலவசம்), ${Math.min(2, units * 0.5)}கி சர்க்கரை (ரூ.13.50), 1லி பாமாயில் (ரூ.25), 1கி பருப்பு (ரூ.30) மற்றும் 10கி கோதுமை (இலவசம்).`;
      } else if (ct.includes('-NC') || ct.includes('NO COMMODITY')) {
        return `பொருட்கள் இல்லா அட்டை: இந்த கார்டிற்கு பொருட்கள் ஒதுக்கப்படவில்லை.`;
      } else if (ct.includes('-S') || ct.includes('SUGAR')) {
        return `சர்க்கரை அட்டை: அரிசி கிடையாது. ${Math.min(5, 3 + units * 0.5)}கி சர்க்கரை (ரூ.25), 1லி பாமாயில் மற்றும் 1கி பருப்பு.`;
      } else {
        // Default Rice Card
        return `ரேஷன் அட்டை: ${Math.max(12, Math.min(20, units * 5))}கி அரிசி (இலவசம்), ${Math.min(2, units * 0.5)}கி சர்க்கரை (ரூ.13.50), 1லி பாமாயில், 1கி பருப்பு மற்றும் கோதுமை.`;
      }
    }

    if (ct.includes('AAY') || ct.includes('AY') || ct.includes('ANTYODAYA')) {
      return `Antyodaya Card: 35kg Rice (Free), ${Math.min(2, units * 0.5)}kg Sugar (₹13.50), 1L Oil (₹25), 1kg Dal (₹30), and 10kg Wheat (Free).`;
    } else if (ct.includes('-NC') || ct.includes('NO COMMODITY')) {
      return `No Commodity Card: No ration commodities are allocated for this card type.`;
    } else if (ct.includes('-S') || ct.includes('SUGAR')) {
      return `Sugar Only Card: No Rice. ${Math.min(5, 3 + units * 0.5)}kg Sugar (₹25), 1L Oil, and 1kg Dal.`;
    } else {
      // Default Rice Card
      return `Priority Card: ${Math.max(12, Math.min(20, units * 5))}kg Rice (Free), ${Math.min(2, units * 0.5)}kg Sugar (₹13.50), 1L Oil, 1kg Dal, and Wheat.`;
    }
    return t('cardDetails');
  };

  const getDetailedShopStatus = () => {
    if (!profile) return { status: 'loading', label: 'Checking...', color: 'var(--gray-400)' };
    
    // 1. Manual Toggle Override (Master Multi-state)
    // If Admin says explicitly CLOSED
    if (profile.isOpen === false) {
      return { 
        status: 'CLOSED', 
        label: lang==='ta' ? `மூடியுள்ளது (${profile.closureReason || 'நிர்வாகம்'})` : `CLOSED: ${profile.closureReason || 'Admin Override'}`, 
        color: 'var(--red)',
        icon: '🚫'
      };
    }

    const now = new Date();
    const day = now.getDay();
    const date = now.getDate();
    const weeklyHoliday = profile.weeklyHoliday || 'FRIDAY';
    const holidayMap = { 'SUNDAY':0,'MONDAY':1,'TUESDAY':2,'WEDNESDAY':3,'THURSDAY':4,'FRIDAY':5,'SATURDAY':6 };

    // 2. Holiday Checks
    const isHoliday = (day === holidayMap[weeklyHoliday]) || (day === 0 && date <= 7);
    if (isHoliday) {
      const holidayLabel = day === holidayMap[weeklyHoliday] 
        ? (lang==='ta' ? 'வார விடுமுறை' : 'Weekly Holiday')
        : (lang==='ta' ? 'மாதாந்திர சரிபார்ப்பு' : 'Monthly stock check');
      return { status: 'HOLIDAY', label: holidayLabel, color: 'var(--red)', icon: '🏠' };
    }

    // 3. Strict Timing Checks
    const timeVal = now.getHours() + now.getMinutes() / 60.0;
    
    const isChennai = shopDist.includes('chennai') || shopDist.includes('urban') || 
                     sName.includes('velachery') || sAddr.includes('chennai') ||
                     sAddr.includes('velachery') || shopDist.includes('corporation');

    const parseT = (str, defH) => {
      if(!str) return defH;
      const [h,m] = str.split(':').map(Number);
      return h + m/60.0;
    };

    let mO = parseT(profile.morningOpen, 9.0); let mC = parseT(profile.morningClose, 13.0);
    let aO = parseT(profile.afternoonOpen, 14.0); let aC = parseT(profile.afternoonClose, 18.0);
    let sTimeM = `${profile.morningOpen || '09:00'} AM`; let eTimeM = `${profile.morningClose || '01:00'} PM`;
    let sTimeA = `${profile.afternoonOpen || '02:00'} PM`; let eTimeA = `${profile.afternoonClose || '06:00'} PM`;

    if (isChennai) {
        mO = 8.5; mC = 12.5; aO = 15.0; aC = 19.0;
        sTimeM = "08:30 AM"; eTimeM = "12:30 PM";
        sTimeA = "03:00 PM"; eTimeA = "07:00 PM";
    }

    if (timeVal >= mO && timeVal <= mC) {
      return { status: 'OPEN', label: lang==='ta' ? `திறந்துள்ளது - ${eTimeM} வரை` : `Open Now - Closes at ${eTimeM}`, color: 'var(--green)', icon: '✅' };
    }
    
    if (timeVal > mC && timeVal < aO) {
      return { status: 'LUNCH', label: lang==='ta' ? `உணவு இடைவேளை - ${sTimeA} மணிக்கு திறக்கும்` : `Lunch Break - Reopens at ${sTimeA}`, color: 'var(--amber)', icon: '🍱' };
    }

    if (timeVal >= aO && timeVal <= aC) {
      return { status: 'OPEN', label: lang==='ta' ? `திறந்துள்ளது - ${eTimeA} வரை` : `Open Now - Closes at ${eTimeA}`, color: 'var(--green)', icon: '✅' };
    }
    
    const isNextMorning = timeVal < mO;
    const opensAtStr = isChennai ? "08:30 AM" : (profile.morningOpen || "09:00 AM");
    return { 
      status: 'CLOSED', 
      label: lang==='ta' ? `${isNextMorning?'':'நாளை காலை'} ${opensAtStr} மணிக்கு திறக்கும்` : `Closed - Opens ${isNextMorning?'at':'Tomorrow at'} ${opensAtStr}`, 
      color: 'var(--gray-500)', 
      icon: '⏰' 
    };
  };

  const shopStatus = getDetailedShopStatus();
  const isShopOpen = shopStatus.status === 'OPEN';

  const renderStatusBadge = (status) => {
    const { cls, icon, label } = statusBadge(status, lang);
    return <span className={`stock-badge ${cls}`}>{icon} {label}</span>;
  };

  return (
    <div className="page animate-slide-up" style={{ 
      padding: '24px 18px', 
      width: '100%',
      backgroundColor: 'var(--gray-50)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }}>
      
      {/* ── SECTION 1: CONSOLIDATED ACCOUNT & SHOP OVERVIEW ── */}
      <div className="glass-card" style={{ 
        padding: '28px 24px', 
        border: '1px solid var(--gray-200)',
        boxShadow: '0 15px 35px -5px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ 
          position: 'absolute', top: -40, right: -40, width: 140, height: 140, 
          borderRadius: 100, background: 'var(--green-light)', opacity: 0.5, zIndex: 0 
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', letterSpacing: 0.5 }}>👋 {t('home').toUpperCase()}</div>
              <h1 style={{ 
                fontSize: 'clamp(20px, 5vw, 28px)', 
                fontWeight: 900, 
                color: 'var(--gray-900)', 
                marginTop: 4,
                fontFamily: "'Outfit', sans-serif"
              }}>
                {userName.split(' ')[0]}
              </h1>
              {lang === 'ta' && profile?.nameTa && (
                <div style={{ fontSize: 18, color: 'var(--gray-700)', fontFamily: "'Baloo Thambi 2', cursive", marginTop: 2 }}>
                  {profile.nameTa}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
               <div className="tag tag-green" style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px' }}>{cardType} {t('card')}</div>
               <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-500)', fontFamily: 'monospace' }}>🪪 {rationCard}</div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--gray-100)', margin: '20px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px 24px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', letterSpacing: 1, marginBottom: 8 }}>{t('assigned_shop')?.toUpperCase() || 'ASSIGNED SHOP'}</div>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                🏪 {shopName}
                <div style={{ 
                  width: 8, height: 8, borderRadius: '50%', 
                  background: isShopOpen ? '#10b981' : '#ef4444',
                  boxShadow: `0 0 8px ${isShopOpen ? '#10b98188' : '#ef444488'}`
                }} title={isShopOpen ? (lang==='ta'?'திறந்திருக்கிறது':'Open') : (lang==='ta'?'மூடியுள்ளது':'Closed')} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5, marginTop: 4 }}>📍 {shopAddress}, {district}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', fontSize: 13, color: 'var(--gray-600)', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>⏰</span> 
                  <span style={{ fontWeight: 800 }}>
                    {(shopDist.includes('chennai') || shopDist.includes('urban') || 
                      sName.includes('velachery') || sAddr.includes('chennai') ||
                      sAddr.includes('velachery') || shopDist.includes('corporation')) 
                      ? "08:30 AM – 12:30 PM & 03:00 PM – 07:00 PM" 
                      : `${profile?.morningOpen || '09:00'}–${profile?.morningClose || '13:00'} & ${profile?.afternoonOpen || '14:00'}–${profile?.afternoonClose || '18:00'}`
                    }
                  </span>
                </div>
                {shopManager && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>👤</span> 
                    <span style={{ fontWeight: 600 }}>{shopManager}</span>
                  </div>
                )}
              </div>
              {profile?.govtShopName && profile.govtShopName !== shopName && (
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>
                  🏛️ {lang === 'ta' ? 'நிரந்தர கடை' : 'Permanent'}: <b>{profile.govtShopName}</b>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ background: 'var(--green-light)', padding: 16, borderRadius: 16, border: '1px solid var(--gray-100)' }}>
                 <div style={{ fontSize: 12, color: 'var(--green-dark)', fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>
                   {lang === 'ta' ? 'கடையின் இருப்பிடத்தை பார்க்க வரைபடத்தை சொடுக்கவும்.' : 'View the physical location of your assigned Ration Shop.'}
                 </div>
                 <button
                   className="btn btn-secondary"
                   style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px', fontWeight: 800, borderRadius: 10, background: 'white' }}
                   onClick={() => setShowMapModal(true)}>
                   🗺️ {lang === 'ta' ? 'வரைபடத்தில் பார்க்க' : 'View on Map'}
                 </button>
              </div>
            </div>
          </div>

          {(profile?.shopNoticeEn || profile?.shopNoticeTa || !isShopOpen) && (
            <div style={{ 
              marginTop: 24, padding: '20px 24px', 
              background: shopStatus.color === 'var(--green)' ? 'var(--green-light)' : shopStatus.color === 'var(--amber)' ? 'var(--amber-light)' : 'var(--red-light)',
              borderRadius: 20, 
              borderStyle: 'solid',
              borderWidth: '1px 1px 1px 8px',
              borderColor: shopStatus.color,
              boxShadow: '0 8px 20px -10px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: shopStatus.color === 'var(--gray-500)' ? 'var(--gray-800)' : shopStatus.color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{fontSize:20}}>{shopStatus.icon}</span> {shopStatus.label.toUpperCase()}
              </div>
              {(profile?.shopNoticeEn || profile?.shopNoticeTa) && (
                <div style={{ 
                  fontSize: 14, color: '#1f2937', lineHeight: 1.7, fontWeight: 600,
                  fontFamily: lang === 'ta' ? "'Baloo Thambi 2', cursive" : 'inherit',
                  marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.05)'
                }}>
                  {lang === 'ta' ? profile?.shopNoticeTa : profile?.shopNoticeEn}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: STANDALONE TOKEN ACTION CARD ── */}
      <div className="card" style={{ 
        padding: '24px', 
        background: isShopOpen ? 'linear-gradient(135deg, var(--green-dark), var(--green-mid))' : 'var(--gray-200)',
        border: 'none',
        borderRadius: 20,
        boxShadow: '0 12px 24px -8px rgba(22, 101, 52, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ 
            fontSize: 22, fontWeight: 900, 
            color: isShopOpen ? 'white' : 'var(--gray-600)', 
            letterSpacing: -0.5,
            lineHeight: 1.2
          }}>
            {lang === 'ta' ? 'டோக்கனைப் பெறுக' : 'Get Your Ration Token'}
          </div>
          <p style={{ 
            fontSize: 13, 
            color: isShopOpen ? 'rgba(255,255,255,0.8)' : 'var(--gray-400)', 
            marginTop: 6,
            fontWeight: 500
          }}>
            {shopStatus.label}
          </p>
        </div>
        
        <button 
          className="btn" 
          disabled={!isShopOpen}
          style={{ 
            padding:'16px 32px', 
            background: isShopOpen ? 'white' : 'var(--gray-300)', 
            color: isShopOpen ? 'var(--green-dark)' : 'var(--gray-500)',
            fontWeight: 900, 
            fontSize: 16,
            borderRadius: 14,
            boxShadow: isShopOpen ? '0 10px 20px -5px rgba(0,0,0,0.15)' : 'none',
            border: 'none'
          }}
          onClick={() => setPage('generate-token')}>
          🎫 {t('generateToken')}
        </button>
      </div>




      <div style={{ marginBottom: 40 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16, padding: '0 4px' }}>
          <h2 style={{ fontWeight: 900, fontSize: 18, color: 'var(--gray-800)' }}>📦 {t('available_stock') || 'Available Stock'}</h2>
          <div className="tag" style={{ fontSize: 10, background: 'var(--gray-100)', color: 'var(--gray-500)' }}>LIVE UPDATES</div>
        </div>

        {loadingStock ? (
          <div className="card" style={{textAlign:'center',padding:'40px 20px'}}>
            <div className="spinner" style={{ margin: '0 auto' }}/>
            <p style={{color:'var(--gray-500)',marginTop:12, fontWeight: 600}}>Checking inventory status...</p>
          </div>
        ) : shopStock.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:40}}>
            <div style={{fontSize:44,marginBottom:16}}>📦</div>
            <div style={{fontWeight:800, color:'var(--gray-800)', fontSize: 16}}>No Stock Data Available</div>
            <p style={{ color:'var(--gray-400)', fontSize: 13, marginTop: 4 }}>This shop hasn't updated its live inventory yet.</p>
            <button className="btn btn-secondary btn-sm" style={{marginTop:20, borderRadius: 10}} onClick={() => window.location.reload()}>🔄 Refresh Dashboard</button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
            gap: 16 
          }}>
            {shopStock.map(item => (
              <div key={item.id} className="card" style={{ 
                padding: '16px 20px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 16,
                transition: 'transform 0.2s',
                border: '1px solid var(--gray-100)'
              }}>
                <div style={{ 
                  width: 50, height: 50, borderRadius: '15px', 
                  background: 'var(--green-light)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', fontSize: 28,
                  flexShrink: 0
                }}>{item.icon}</div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--gray-800)' }}>{item.nameEn}</span>
                      {renderStatusBadge(item.status)}
                   </div>
                   <div style={{ fontSize: 13, color: 'var(--gray-400)', fontFamily: "'Baloo Thambi 2', cursive", fontWeight: 700 }}>{item.nameTa}</div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                   <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', marginBottom: 2 }}>{t('available')?.toUpperCase() || 'AVAILABLE'}</div>
                   <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--green-dark)' }}>
                      {item.available} <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{item.unit}</span>
                   </div>
                   <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginTop: 4 }}>₹{item.price}/{item.unit}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mappls Map Modal via Portal */}
      <PortalModal 
        isOpen={showMapModal} 
        onClose={() => setShowMapModal(false)}
        title={lang === 'ta' ? 'அருகிலுள்ள கடை இருப்பிடம்' : 'Nearest Shop Location'}
        maxWidth={650}
        padding={0}
      >
        <div style={{ position: 'relative' }}>
          <div id="user-shop-map" style={{height:400, width:'100%', background:'var(--gray-50)', position: 'relative'}}>
            {(!mapplsLoaded || !selectedShop) && (
              <div className="flex-center h-full" style={{ flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.9)', position: 'absolute', inset: 0, zIndex: 10 }}>
                <div className="spinner"></div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green-dark)' }}>
                  🗺️ {lang === 'ta' ? 'வரைபடம் தயாராகிறது...' : 'Map is preparing, please wait...'}
                </div>
              </div>
            )}
          </div>
          <div style={{padding:24, backgroundColor:'var(--white)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
              <div>
                <div style={{fontWeight:800, fontSize:18, color:'var(--green-dark)'}}>{selectedShop?.name || shopName}</div>
                <div className="text-muted" style={{fontSize:12}}>{selectedShop?.district || district} • {selectedShop?.code}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="tag tag-green">{lang==='ta'?'திறந்துள்ளது':'Open Now'}</div>
              </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12, marginBottom:20}}>
              <div style={{padding:12, background:'var(--gray-50)', borderRadius:12}}>
                <div style={{fontSize:11, color:'var(--gray-400)', fontWeight:700}}>{t('openingHours')?.toUpperCase()}</div>
                <div style={{fontWeight:800, fontSize:14}}>{selectedShop?.openingTime} - {selectedShop?.closingTime}</div>
              </div>
              <div style={{padding:12, background:'var(--gray-50)', borderRadius:12}}>
                <div style={{fontSize:11, color:'var(--gray-400)', fontWeight:700}}>MANAGER</div>
                <div style={{fontWeight:800, fontSize:14}}>{selectedShop?.manager || 'Station Officer'}</div>
              </div>
            </div>

            {selectedShop?.id !== (profile?.shopId || user?.shopId) ? (
              <button 
                className="btn btn-primary btn-full btn-lg"
                style={{boxShadow:'0 10px 20px rgba(76, 175, 80, 0.2)'}}
                onClick={() => setShowSwitchModal(selectedShop)}>
                📍 {lang === 'ta' ? 'இந்த கடைக்கு மாறவும்' : 'Switch to this Shop'}
              </button>
            ) : (
                <div className="btn btn-secondary btn-full btn-lg" style={{ cursor: 'default', opacity: 1, color: 'var(--green-dark)' }}>
                    ✅ {lang === 'ta' ? 'தற்போது செயலில் உள்ள கடை' : 'This is your Active Shop'}
                </div>
            )}
          </div>
        </div>
      </PortalModal>

      {/* SHOP SWITCH MODAL */}
      <PortalModal
        isOpen={!!showSwitchModal}
        onClose={() => setShowSwitchModal(null)}
        title={lang==='ta' ? 'கடையை மாற்றவா?' : 'Switch Shop?'}
        maxWidth={420}
      >
        <div className="text-center p-6">
          <div style={{fontSize:60, marginBottom:20, filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.1))'}}>🏗️</div>
          <h3 style={{fontWeight: 900, marginBottom: 12, color: 'var(--gray-800)'}}>
            {lang==='ta' ? 'உறுதிப்படுத்தல்' : 'Confirm Action'}
          </h3>
          <p style={{marginBottom: 24, color: 'var(--gray-600)', lineHeight:1.6}}>
            {lang==='ta' 
              ? `உங்கள் ரேஷன் கடையை "${showSwitchModal?.name}" என்று மாற்ற விரும்புகிறீர்களா? இதன்பிறகு இந்த கடையில் மட்டுமே பொருட்கள் கிடைக்கும்.`
              : `Are you sure you want to switch your primary ration shop to "${showSwitchModal?.name}"? You will only be able to generate tokens for this shop.`}
          </p>
          <div style={{display:'flex', gap:12}}>
            <button className="btn btn-secondary flex-1" style={{padding:14, borderRadius:12}} onClick={() => setShowSwitchModal(null)}>
              {lang==='ta' ? 'ரத்துசெய்' : 'Cancel'}
            </button>
            <button className="btn btn-primary flex-1" style={{padding:14, borderRadius:12, fontWeight: 900}} onClick={handleSwitchShop}>
              {lang==='ta' ? 'நிச்சயமாக' : 'Confirm Switch'}
            </button>
          </div>
        </div>
      </PortalModal>
    </div>
  );
};

export default UserHome;
