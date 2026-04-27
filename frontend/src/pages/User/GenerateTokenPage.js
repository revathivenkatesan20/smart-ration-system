import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { API_BASE_URL } from '../../utils/constants';
import { memberIcon } from '../../utils/logic';
import './GenerateTokenPage.css';
import { cachedFetch } from '../../utils/apiCache';

// Helper to check if an item is Rice (for shared quota logic)
const isRiceItem = (item) => item?.nameEn?.toLowerCase()?.includes('rice');

// Real-Time Schedule Rule Extractor
const checkShopTimings = (shop) => {
  if (shop.isOpen === false && shop.closureReason && shop.closureReason.trim() !== "") {
    return { isOpen: false, msg: shop.closureReason };
  }
  const rightNow = new Date();
  const dayIdx = rightNow.getDay();
  const timeVal = rightNow.getHours() + rightNow.getMinutes() / 60.0;
  
  const shopHoliday = shop.weeklyHoliday || 'FRIDAY';
  const daysMap = {'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6};
  if (daysMap[shopHoliday.toUpperCase()] === dayIdx) return { isOpen: false, msg: `Closed today (${shopHoliday})` };

  const shopDist = (shop.district || '').toLowerCase();
  const sName = (shop.name || '').toLowerCase();
  const sAddr = (shop.address || '').toLowerCase();

  let isChennai = shopDist.includes('chennai') || shopDist.includes('urban') || 
                  sName.includes('velachery') || sAddr.includes('chennai') ||
                  sAddr.includes('velachery') || shopDist.includes('corporation');

  const parseT = (str, defH) => {
    if(!str) return defH;
    const [h,m] = str.split(':').map(Number);
    return h + m/60.0;
  };

  let mO = parseT(shop.morningOpen, 9.0); let mC = parseT(shop.morningClose, 13.0);
  let aO = parseT(shop.afternoonOpen, 14.0); let aC = parseT(shop.afternoonClose, 18.0);
  let timeMsg = "09:00 AM to 01:00 PM, 02:00 PM to 06:00 PM";

  if (isChennai) {
      mO = 8.5; mC = 12.5; aO = 15.0; aC = 19.0;
      timeMsg = "08:30 AM to 12:30 PM, 03:00 PM to 07:00 PM";
  }

  const isOpenTime = (timeVal >= mO && timeVal <= mC) || (timeVal >= aO && timeVal <= aC);
  if (!isOpenTime) return { isOpen: false, msg: `Closed. Timings: ${timeMsg}` };
  return { isOpen: true, msg: '15-20 mins' };
};


// Custom Item Card Component for Step 2
const ItemCard = ({ item, quantity, onUpdate, uiRemaining, backendRemaining, maxQuota, lang }) => {
  const isOutOfStock = item.status === 'Out of Stock' || (parseFloat(item.quantityAvailable) <= 0);
  
  // ALREADY PURCHASED: Backend said 0 left before we started
  const isAlreadyPurchased = !isOutOfStock && backendRemaining === 0 && maxQuota > 0;
  
  // SELECTION FULL: We've picked up to the limit in this session
  const isSelectionFull = !isOutOfStock && uiRemaining === 0 && backendRemaining > 0;
  
  return (
    <div className={`premium-item-card ${quantity > 0 ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`} style={{ 
      padding: '20px',
      opacity: isOutOfStock ? 0.7 : 1
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ 
          width: 50, height: 50, borderRadius: 12, 
          background: isOutOfStock ? 'var(--gray-100)' : 'var(--green-light)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
          flexShrink: 0
        }}>
          {item.icon}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nameEn}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: item.price === 0 ? 'var(--green)' : 'var(--gray-700)' }}>
             {item.price === 0 ? (lang === 'ta' ? 'இலவசம்' : 'FREE') : `₹${item.price}/${item.unit}`}
          </span>
          <span style={{ fontSize: 11, background: isOutOfStock ? '#fee2e2' : (isAlreadyPurchased ? '#d1fae5' : (isSelectionFull ? '#dcfce7' : '#dcfce7')), color: isOutOfStock ? '#b91c1c' : (isAlreadyPurchased ? '#065f46' : (isSelectionFull ? '#166534' : '#166534')), padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
            {isOutOfStock ? (lang === 'ta' ? 'இருப்பு இல்லை' : 'Out of Stock') 
              : (isAlreadyPurchased ? `${maxQuota} ${item.unit} ${lang === 'ta' ? 'வாங்கப்பட்டது' : 'Purchased'}` 
              : (isSelectionFull ? (lang === 'ta' ? 'முழு ஒதுக்கீடு' : 'Full Selection') : `${uiRemaining}/${maxQuota} ${item.unit} ${lang === 'ta' ? 'மீதமுள்ளது' : 'left'}`))}
          </span>
          {item.isSpecialBenefit && (
            <span style={{ fontSize: 10, background: 'var(--amber-light)', color: 'var(--amber-dark)', padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>
              🎁 {lang === 'ta' ? 'சிறப்பு சலுகை' : 'Special Benefit'}
            </span>
          )}
        </div>
        {maxQuota > 0 && maxQuota % 3 === 0 && maxQuota > 5 && (
           <div style={{ marginTop: 6, fontSize: 10, color: 'var(--green-dark)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
             ⚡ {lang === 'ta' ? '3 மாத ஒதுக்கீடு' : '3-Month Quota Bundle'}
           </div>
        )}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--gray-100)', margin: '16px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>Shop Stock: <strong style={{ color: 'var(--gray-700)' }}>{item.quantityAvailable} {item.unit}</strong></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gray-50)', padding: '6px', borderRadius: 12, border: '1px solid var(--gray-200)' }}>
          <button 
            style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'white', fontSize: 18, fontWeight: 900, color: 'var(--gray-500)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: quantity === 0 ? 'not-allowed' : 'pointer' }} 
            disabled={quantity === 0} 
            onClick={() => onUpdate(quantity - 1)}
          >−</button>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 24, padding: '0 4px' }}>
            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--gray-900)' }}>{quantity}</span>
            <span style={{ fontSize: 9, color: 'var(--gray-400)', fontWeight: 700, marginTop: -4 }}>{item.unit}</span>
          </div>
 
          <button 
            style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: (isOutOfStock || uiRemaining <= 0) ? 'var(--gray-300)' : 'var(--green)', fontSize: 18, fontWeight: 900, color: 'white', boxShadow: (isOutOfStock || uiRemaining <= 0) ? 'none' : '0 2px 4px rgba(22,101,52,0.2)', cursor: (isOutOfStock || uiRemaining <= 0) ? 'not-allowed' : 'pointer' }} 
            disabled={isOutOfStock || uiRemaining <= 0}
            onClick={() => onUpdate(quantity + 1)}
          >+</button>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 600 }}>{lang === 'ta' ? 'மொத்தம்' : 'Item Total'}</div>
           <div style={{ fontWeight: 900, fontSize: 16, color: quantity > 0 ? 'var(--green-dark)' : 'var(--gray-300)' }}>
             ₹{(quantity * (item.price || 0)).toFixed(2)}
           </div>
        </div>
      </div>
      {!isOutOfStock && uiRemaining > 0 && (
         <button style={{ width: '100%', marginTop: 12, padding: 8, fontSize: 12, fontWeight: 800, background: 'transparent', border: '1px solid var(--green-mid)', color: 'var(--green-dark)', borderRadius: 8, cursor: 'pointer' }} onClick={() => onUpdate(quantity + uiRemaining)}>
             {lang === 'ta' ? 'அதிகபட்சத்தைச் சேர்க்கவும்' : `Add Maximum (${uiRemaining} ${item.unit})`}
         </button>
      )}
    </div>
  );
};

const GenerateTokenPage = () => {
  const { lang, setPage, user, addToast } = useApp();
  const t = (k) => T[lang][k]||k;

  const [step, setStep] = useState(1);

  const navigateToStep = (newStep) => {
    window.history.pushState({ appStep: newStep }, null, window.location.href);
    setStep(newStep);
  };

  useEffect(() => {
    // Replaces initial mount history state
    window.history.replaceState({ appStep: 1 }, null, window.location.href);
    
    const handlePopState = (e) => {
      if (e.state && e.state.appStep) {
        setStep(e.state.appStep);
      } else {
        setPage('home');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setPage]);

  const [loading, setLoading] = useState(false);
  const [shopInfo, setShopInfo] = useState({ id: null, name: '...', isOpen: true, waitTime: '20 mins' });
  const [liveStock, setLiveStock] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [paymentMode, setPaymentMode] = useState('Online');
  const [quota, setQuota] = useState({});
  const [members, setMembers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isThreeMonth, setIsThreeMonth] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      if (!token || token === 'null' || token === 'undefined') {
        console.error('❌ Security Alert: No valid JWT token found in localStorage!');
        addToast('Session Expired', 'Please login again.', 'error');
        setPage('home'); // Redirect back
        return;
      }
      
      console.log('🎫 Security Check: Token present, fetching profile...');

      try {
        const profRes = await cachedFetch(`${API_BASE_URL}/api/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
        if (profRes.status === 401) {
          localStorage.clear();
          window.location.href = '/';
          return;
        }
        const prof = await profRes.json();
        
          if (prof.success) {
            setProfile(prof.data);
            const sid = prof.data.shopId || 1;
            const rcn = prof.data.rationCardNumber;
            
            // Activation Check
            if (prof.data.isActive === false) {
              setLoading(false);
              return; // We will handle UI in the return
            }

            const shopsRes = await cachedFetch(`${API_BASE_URL}/api/public/shops`);
            const shopsData = await shopsRes.json();
            const shop = shopsData.data.find(s => s.id === sid) || shopsData.data[0];
            
            const shopStatus = checkShopTimings(shop);
            setShopInfo({
              id: shop.id,
              name: shop.name,
              isOpen: shopStatus.isOpen,
              waitTime: shopStatus.msg
            });

            const stockRes = await cachedFetch(`${API_BASE_URL}/api/stock/shop/${shop.id}`);
            const stockData = await stockRes.json();
            
            const url = `${API_BASE_URL}/api/tokens/monthly-quota?rationCardNumber=${encodeURIComponent(rcn)}`;
            console.log(`📡 Initial Quota Fetch (Public): ${url}`);

            const quotaRes = await cachedFetch(url); // Now handled by permitAll() bypass
            const qData = await quotaRes.json();
            if (qData.success) {
              setQuota(qData.data);
            }

          const membersRes = await cachedFetch(`${API_BASE_URL}/api/user/members`, { headers: { Authorization: `Bearer ${token}` } });
          const mData = await membersRes.json();
          if (mData.success) setMembers(mData.data);

          if (stockData.success) {
            setLiveStock(stockData.data.map(s => {
              const name = s.nameEn?.toLowerCase() || '';
              const category = s.category?.toLowerCase() || '';
              let icon = '📦';
              if (name.includes('rice')) icon = '🍚';
              else if (name.includes('wheat')) icon = '🌾';
              else if (name.includes('sugar')) icon = '🍬';
              else if (name.includes('oil')) icon = '🫙';
              else if (name.includes('kerosene')) icon = '⛽';
              else if (name.includes('dal') || name.includes('pulse')) icon = '🫘';
              else if (category.includes('benefit') || category.includes('special')) icon = '🎁';

              return {
                ...s,
                price: parseFloat(s.subsidyPrice) || 0,
                icon
              };
            }));
          }
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchQuota = async () => {
      if (!profile) return;
      
      const getPDSPrice = (nameEn) => {
        const n = (nameEn || '').toLowerCase();
        if (n.includes('rice')) return 0;
        if (n.includes('sugar')) return 25;
        if (n.includes('dal') || n.includes('pulse') || n.includes('paruppu')) return 30;
        if (n.includes('oil')) return 25;
        if (n.includes('kerosene')) return 15;
        return 0; // Wheat etc
      };

      try {
        const rcn = profile.rationCardNumber;
        const url = `${API_BASE_URL}/api/tokens/monthly-quota?rationCardNumber=${encodeURIComponent(rcn)}&isThreeMonth=${isThreeMonth}`;
        
        // --- 📡 Real-time Shop Status Sync ---
        const shopsRes = await cachedFetch(`${API_BASE_URL}/api/public/shops`);
        const shopsData = await shopsRes.json();
        const freshShop = shopsData.data?.find(s => s.id === (profile.shopId || 1));
        if (freshShop) {
           const shopStatus = checkShopTimings(freshShop);
           setShopInfo(prev => ({ ...prev, isOpen: shopStatus.isOpen, waitTime: shopStatus.isOpen ? prev.waitTime : shopStatus.msg }));
        }

        const quotaRes = await cachedFetch(url);
        const qData = await quotaRes.json();
        
        if (qData.success) {
          const quotaMap = qData.data;
          setQuota(quotaMap);
          setLiveStock(prev => {
            const updatedStock = prev.map(it => ({
              ...it,
              price: quotaMap[it.itemId]?.price ? parseFloat(quotaMap[it.itemId].price) : getPDSPrice(it.nameEn)
            }));
            
            Object.keys(quotaMap).forEach(key => {
              const q = quotaMap[key];
              if (q.isSpecialBenefit) {
                const itemId = parseInt(key);
                if (!updatedStock.find(s => s.itemId === itemId)) {
                  updatedStock.push({
                    id: itemId, // Using a combined key as pseudo-id
                    itemId: itemId,
                    nameEn: q.nameEn || 'Special Benefit',
                    nameTa: q.nameTa || 'சிறப்பு வெளியீடு',
                    category: 'Special Benefit',
                    unit: 'Package',
                    quantityAvailable: 9999, // Free selection bounded by quota limit
                    status: 'Available',
                    price: 0,
                    icon: '🎁',
                    isSpecialBenefit: true
                  });
                }
              }
            });
            return updatedStock;
          });
          return;
        }
        throw new Error('401');
      } catch (err) {
        console.warn('⚠️ API Error. Using Local 2026 TN PDS Engine.');
        
        let adults = 1; let children = 0;
        if (members && members.length > 0) {
          adults = members.filter(m => m.isHead || (m.age !== null && m.age >= 12)).length;
          children = members.filter(m => !m.isHead && m.age !== null && m.age < 12).length;
        }
        const units = adults + (children * 0.5);
        const ct = (profile.cardType || 'PHH').toUpperCase().trim();
        const isUrban = profile.isUrban || false;
        const gas = profile.gasCylinders || 0;

        const localQuota = {};
        liveStock.forEach(item => {
          const name = (item.nameEn || '').toLowerCase();
          let max = 0;

          if (name.includes('rice') || (item.nameTa || '').includes('அரிசி')) {
             if (ct.includes('AAY') || ct.includes('AY') || ct.includes('ANTYODAYA')) max = 35;
             else if (ct.includes('-S') || ct.includes('SUGAR') || ct.includes('-NC') || ct.includes('NO COMMODITY')) {
                max = 0;
             } else {
                // Permissive Default: Treat unrecognized but non-restricted cards as Rice Cards
                max = Math.max(12, Math.min(20, units * 5));
             }
          } else if (name.includes('sugar') || (item.nameTa || '').includes('சர்க்கரை')) {
             if (ct.includes('-NC') || ct.includes('NO COMMODITY')) {
                max = 0;
             } else {
                max = Math.min(2, units * 0.5);
                if (ct.includes('-S') || ct.includes('SUGAR')) max += 3;
             }
          } else if (name.includes('dal') || name.includes('pulse') || name.includes('oil') || (item.nameTa || '').includes('பருப்பு') || (item.nameTa || '').includes('எண்ணெய்')) {
             max = (ct.includes('-NC') || ct.includes('NO COMMODITY')) ? 0 : 1;
          } else if (name.includes('wheat') || (item.nameTa || '').includes('கோதுமை')) {
             max = (ct.includes('-NC') || ct.includes('NO COMMODITY') || ct.includes('-S') || ct.includes('SUGAR')) ? 0 : 10;
          } else if (name.includes('kerosene') || (item.nameTa || '').includes('மண்ணெண்ணெய்')) {
             if (!ct.includes('-NC') && !ct.includes('NO COMMODITY') && gas < 2) max = (gas === 1) ? 3 : (isUrban ? 10 : 5);
          }

          if (isThreeMonth) max *= 3;
          localQuota[item.itemId] = { max: max, remaining: max, price: getPDSPrice(item.nameEn), isLocal: true };
        });

        if (ct !== 'NPHH-NC') {
          localQuota[9999] = { max: 1, remaining: 1, price: 0, nameEn: 'Government Gift Hamper', isSpecialBenefit: true };
        }

        setQuota(localQuota);
        setLiveStock(prev => prev.map(it => ({ ...it, price: getPDSPrice(it.nameEn) })));
      }
    };
    fetchQuota();
  }, [isThreeMonth, profile, members, liveStock.length]);

  // Shared Quota Logic (Rice Split)
  const getRemainingForDisplay = (item) => {
    const q = quota[item.itemId] || { max: 0, remaining: 0 };
    let backendRemaining = parseFloat(q.remaining ?? 0);
    const isRice = (item.nameEn || '').toLowerCase().includes('rice') || (item.nameTa || '').includes('அரிசி');
    const isSugar = (item.nameEn || '').toLowerCase().includes('sugar') || (item.nameTa || '').includes('சர்க்கரை');

    let remainingInUi;

    if (isRice) {
      // Shared Rice Pool Logic
      const riceItems = liveStock.filter(s => (s.nameEn || '').toLowerCase().includes('rice') || (s.nameTa || '').includes('அரிசி'));
      const consumedGroup = riceItems.reduce((sum, s) => sum + (quantities[s.itemId] || 0), 0);
      remainingInUi = Math.max(0, backendRemaining - consumedGroup);
    } else if (isSugar) {
      // Shared Sugar Pool Logic (if multiple varieties exist)
      const sugarItems = liveStock.filter(s => (s.nameEn || '').toLowerCase().includes('sugar') || (s.nameTa || '').includes('சர்க்கரை'));
      const consumedGroup = sugarItems.reduce((sum, s) => sum + (quantities[s.itemId] || 0), 0);
      remainingInUi = Math.max(0, backendRemaining - consumedGroup);
    } else {
      const consumed = quantities[item.itemId] || 0;
      remainingInUi = Math.max(0, backendRemaining - consumed);
    }
    
    // Also consider live shop stock
    const stockAvailable = parseFloat(item.quantityAvailable) || 0;
    if (item.isSpecialBenefit) return remainingInUi; // No stock limit for special benefits
    return Math.min(remainingInUi, stockAvailable);
  };


  const setQty = (item, val) => {
    const available = getRemainingForDisplay(item) + (quantities[item.itemId] || 0);
    const clamped = Math.max(0, Math.min(val, available));
    setQuantities(prev => ({ ...prev, [item.itemId]: clamped }));
  };

  const activeItems = liveStock.filter(s => (quantities[s.itemId]||0) > 0);
  const totalPrice = activeItems.reduce((acc, s) => acc + (quantities[s.itemId] * s.price), 0);
  const totalItemsCount = activeItems.length;

  // AI Suggestion Logic
  const outOfStockItem = liveStock.find(s => s.status === 'Out of Stock');
  const alternativeSuggestion = outOfStockItem ? (outOfStockItem.nameEn.includes('Palm Oil') ? 'Groundnut Oil' : 'Wheat') : null;

  const handleFinish = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await cachedFetch(`${API_BASE_URL}/api/tokens/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          shopId: shopInfo.id,
          paymentMode,
          isThreeMonthBundle: isThreeMonth,
          items: activeItems.map(s => ({ itemId: s.itemId, quantity: quantities[s.itemId] }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedToken(data.data);
        navigateToStep(5);
        addToast?.('Success', 'Token generated successfully', 'success');
      } else addToast?.('Error', data.message, 'error');
    } catch (err) { addToast?.('Error', 'Connection failed', 'error'); }
    setLoading(false);
  };

  const renderSteps = () => (
    <div className="token-steps" style={{ display: step >= 5 ? 'none' : 'flex' }}>
      {[1, 2, 3, 4].map(s => (
        <div key={s} className={`token-step ${step >= s ? 'active' : ''}`}>
          <div className="token-step-dot">{step > s ? '✓' : s}</div>
          <span style={{ fontSize: 10, fontWeight: 700, color: step >= s ? 'var(--gray-800)' : 'var(--gray-400)' }}>
            {['Member', 'Items', 'Payment', 'Confirm'][s-1]}
          </span>
        </div>
      ))}
    </div>
  );

  const availableItemsCount = liveStock.filter(item => {
    const q = quota[item.itemId] || { remaining: 0 };
    return parseFloat(q.remaining) > 0;
  }).length;
  const isAllPurchased = !loading && liveStock.length > 0 && availableItemsCount === 0;

  return (
    <div className="page animate-fade-in token-page-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, background: 'white', padding: '20px', borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <button 
          style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-600)' }} 
          onClick={() => setPage('home')}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: 'var(--gray-900)' }}>{lang==='ta'?'டோக்கன் பெறுக':'Generate Token'}</h1>
        </div>
      </div>

      {!loading && profile && profile.isActive === false && (
        <div className="card glass-card animate-scale-in text-center p-8" style={{maxWidth: 500, margin: '40px auto'}}>
          <div style={{fontSize: 64, marginBottom: 20}}>🔒</div>
          <h2 style={{fontWeight: 900, color: '#b91c1c', marginBottom: 12}}>
            {lang==='ta' ? 'அட்டை முடக்கப்பட்டுள்ளது' : 'Ration Card Deactivated'}
          </h2>
          <p style={{color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 24}}>
            {lang==='ta' 
              ? 'உங்கள் ரேஷன் கார்டு தற்போது முடக்கப்பட்டுள்ளது. தயவுசெய்து புகார்கள் பிரிவின் மூலம் அரசாங்கத்தைத் தொடர்புகொண்டு மீண்டும் செயல்படுத்தக் கோரவும்.' 
              : 'Your ration card has been deactivated. Please contact the government through the Grievances section to request activation.'}
          </p>
          <button className="btn btn-primary btn-full" onClick={() => setPage('grievances')}>
            {lang==='ta' ? 'புகார்கள் பிரிவிற்குச் செல்க' : 'Go to Grievances'}
          </button>
        </div>
      )}

      {profile && profile.isActive !== false && step < 5 && renderSteps()}

      {profile && profile.isActive !== false && step === 1 && (
        <div className="animate-scale-in" style={{ paddingBottom: 100 }}>
          <div className="card glass-card" style={{ padding: '24px 16px', borderRadius: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: 20, marginBottom: 24, textAlign: 'center', color: 'var(--gray-800)', fontWeight: 900 }}>
              {lang === 'ta' ? '👨‍👩‍👧‍👦 இன்று யார் பொருட்களைப் பெறுகிறார்கள்?' : '👨‍👩‍👧‍👦 Who is collecting today?'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
              {members.map(m => (
                <div 
                  key={m.id} 
                  className={`member-card ${selectedMember === m.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMember(m.id)}
                  style={{ padding: '24px 16px', borderRadius: 20, textAlign: 'center', border: selectedMember === m.id ? '2px solid var(--green)' : '1px solid var(--gray-200)', background: selectedMember === m.id ? 'var(--green-light)' : 'white', cursor: 'pointer', transition: 'all 0.2s', boxShadow: selectedMember === m.id ? '0 8px 16px -4px rgba(22,101,52,0.15)' : 'none' }}
                >
                  <div className="member-avatar" style={{ width: 56, height: 56, fontSize: 28, margin: '0 auto 12px', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{memberIcon(m.gender)}</div>
                  <div className="member-name" style={{ fontSize: 15, fontWeight: 800 }}>{m.name}</div>
                  <div className="member-rel" style={{ fontSize: 12, color: 'var(--gray-500)' }}>{m.relation}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', background: 'white', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
            <button className="btn btn-primary" style={{ width: '100%', maxWidth: 400, padding: '16px 24px', borderRadius: 16, fontWeight: 900, boxShadow: selectedMember !== null ? '0 8px 24px -4px rgba(22,101,52,0.4)' : 'none' }} disabled={selectedMember === null} onClick={() => navigateToStep(2)}>
              {lang === 'ta' ? 'பொருட்கள் தேர்வுக்குத் தொடரவும் →' : 'Continue to Item Selection →'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-in">
          {isAllPurchased ? (
            <div className="card animate-slide-up" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '2px solid var(--green)', padding: 32, textAlign: 'center', borderRadius: 24, marginBottom: 24 }}>
               <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
               <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--green-dark)', marginBottom: 8, lineHeight: 1.4 }}>
                  {lang === 'ta' ? 'இந்த மாதத்திற்கான உங்கள் ஒதுக்கீடு முழுவதும் வாங்கப்பட்டது!' : 'Overall your monthly quota has been purchased!'}
               </h2>
               <p style={{ color: 'var(--gray-700)', fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>
                  {lang === 'ta' ? 'அடுத்த மாதம் உங்கள் ரேஷன் பொருட்களை வந்து பெற்றுக்கொள்ளுங்கள்.' : 'Please come and collect your ration items next month.'}
               </p>
               <button className="btn btn-primary btn-lg" style={{ marginTop: 24, padding: '14px 32px', borderRadius: 16, fontWeight: 900 }} onClick={() => setPage('home')}>
                  {lang === 'ta' ? '← முகப்புப் பக்கத்திற்குச் செல்க' : '← Back to Dashboard'}
               </button>
            </div>
          ) : (
            <>
              <div style={{ background: 'var(--green-light)', padding: '16px 20px', borderRadius: 16, marginBottom: 20, border: '1px solid var(--green-mid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(22,101,52,0.06)' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Allocated Quota Type</div>
                  <div style={{ fontSize: 15, color: 'var(--gray-800)', fontWeight: 800 }}>Card: <span style={{ color: 'var(--green)' }}>{profile.cardType || 'PHH'}</span></div>
                </div>
                <div style={{ fontSize: 28, opacity: 0.9 }}>💳</div>
              </div>

              {liveStock.length > 0 && (
                <div className="animate-slide-up" style={{ background: 'var(--blue-light)', padding: '16px', borderRadius: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: 24 }}>🛒</span>
                  <div style={{ fontSize: 13, color: '#1e3a8a', fontWeight: 700, lineHeight: 1.5 }}>
                    {lang === 'ta' ? 'இந்த மாதம் நீங்கள் வாங்க வேண்டிய பொருட்கள் இன்னும் உள்ளன. தொடர கீழே உள்ள பொருட்களைத் தேர்ந்தெடுக்கவும்.' : 'You still have items left to purchase this month. Select your items below to continue.'}
                  </div>
                </div>
              )}

              {outOfStockItem && (
                <div className="ai-alert-banner animate-slide-up" style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 24 }}>⚠️</span>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    <b>{outOfStockItem.nameEn}</b> is out of stock. Alternative: <span style={{ color: 'var(--green-mid)' }}>{alternativeSuggestion}</span> available (AI Suggestion)
                  </div>
                </div>
              )}

              <div className="card glass-card" style={{ padding: '20px', marginBottom: 20, background: isThreeMonth ? 'linear-gradient(135deg, #166534 0%, #14532d 100%)' : 'white', color: isThreeMonth ? 'white' : 'inherit', borderRadius: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.06)', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ fontSize: 32 }}>🛒</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>{lang === 'ta' ? '2026 3-மாத தொகுப்பு' : '2026 3-Month Bundle'}</h4>
                      <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.8 }}>{lang === 'ta' ? 'முக்கிய பொருட்களுக்கான முன்பதிவு' : 'Advance purchase for major commodities'}</p>
                    </div>
                  </div>
                  <div 
                    onClick={() => { setIsThreeMonth(!isThreeMonth); setQuantities({}); }}
                    style={{ 
                      width: 60, height: 32, borderRadius: 16, background: isThreeMonth ? 'var(--green-mid)' : 'var(--gray-200)', 
                      padding: 4, cursor: 'pointer', position: 'relative', transition: 'all 0.3s' 
                    }}
                  >
                    <div style={{ 
                      width: 24, height: 24, borderRadius: '50%', background: 'white', 
                      position: 'absolute', left: isThreeMonth ? 32 : 4, top: 4, transition: 'all 0.3s ease-in-out',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
                {isThreeMonth && (
                  <div className="animate-fade-in" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700, display: 'flex', gap: 8 }}>
                    <span>{lang === 'ta' ? '⭐ பெருக்கி செயலில் உள்ளது: அனைத்து முக்கிய ஒதுக்கீடுகளும் 3-ஆல் பெருக்கப்படுகின்றன. நடப்பு மாதம் + 2 எதிர்கால மாதங்கள்.' : '⭐ Multiplier Active: All major quotas are multiplied by 3. Current month + 2 future months.'}</span>
                  </div>
                )}
              </div>

              <div className="premium-item-grid" style={{ paddingBottom: 100 }}>
                {liveStock.map(item => (
                  <ItemCard 
                    key={item.itemId} 
                    item={item} 
                    lang={lang}
                    quantity={quantities[item.itemId] || 0}
                    uiRemaining={getRemainingForDisplay(item)}
                    backendRemaining={parseFloat(quota[item.itemId]?.remaining ?? 0)}
                    maxQuota={parseFloat(quota[item.itemId]?.max || 0)}
                    onUpdate={(val) => setQty(item, val)}
                  />
                ))}
              </div>

              <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', background: 'white', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', maxWidth: 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderRadius: 16, border: 'none', background: totalItemsCount === 0 ? 'var(--gray-300)' : 'var(--green)', color: totalItemsCount === 0 ? 'var(--gray-500)' : 'white', fontWeight: 900, fontSize: 16, boxShadow: totalItemsCount === 0 ? 'none' : '0 8px 24px -4px rgba(22,101,52,0.4)', transition: 'all 0.2s' }}
                  disabled={totalItemsCount === 0}
                  onClick={() => navigateToStep(3)}
                >
                  <span>{totalItemsCount === 0 ? 'Select an item' : 'Proceed to Payment →'}</span>
                  {totalItemsCount > 0 && <span>{totalItemsCount} items · ₹{totalPrice.toFixed(2)}</span>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="card glass-card animate-scale-in" style={{ maxWidth: 500, margin: '0 auto', padding: 32 }}>
           <h3 className="text-center mb-8">💳 Select Payment Mode</h3>
           <div className="grid-2">
             <div className={`payment-option ${paymentMode === 'Online' ? 'selected' : ''}`} onClick={() => setPaymentMode('Online')}>
               <div className="payment-icon">📱</div>
               <div>
                  <div className="payment-label">Digital Payment</div>
                  <div className="payment-sub">UPI, Cards, Netbanking</div>
               </div>
             </div>
             <div className={`payment-option ${paymentMode === 'Cash' ? 'selected' : ''}`} onClick={() => setPaymentMode('Cash')}>
               <div className="payment-icon">💵</div>
               <div>
                  <div className="payment-label">Physical Cash</div>
                  <div className="payment-sub">Pay at shop counter</div>
               </div>
             </div>
           </div>
           <button className="btn btn-primary btn-full mt-10 btn-lg" onClick={() => navigateToStep(4)}>Review Order →</button>
           <button className="btn btn-ghost btn-full mt-2" onClick={() => window.history.back()}>← Back to Items</button>
        </div>
      )}

      {step === 4 && (
        <div className="card glass-card animate-scale-in" style={{ maxWidth: 500, margin: '0 auto', padding: 32 }}>
           <h3 className="mb-6">🔍 Review Summary</h3>
           <div className="border-b pb-4 mb-4">
             {activeItems.map(s => (
               <div key={s.itemId} className="flex-between py-2">
                 <div className="flex gap-3">
                    <span>{s.icon}</span>
                    <span style={{ fontWeight: 600 }}>{s.nameEn} <small className="text-muted">x {quantities[s.itemId]} {s.unit}</small></span>
                 </div>
                 <b style={{ color: s.price === 0 ? 'var(--green)' : 'inherit' }}>{s.price === 0 ? 'FREE' : `₹${(quantities[s.itemId] * s.price).toFixed(2)}`}</b>
               </div>
             ))}
           </div>
           <div className="flex-between mb-8">
             <span style={{ fontSize: 18, fontWeight: 700 }}>Total Payable</span>
             <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--green-dark)' }}>₹{totalPrice.toFixed(2)}</span>
           </div>
           <div className="alert alert-success py-2 text-xs" style={{ border: 'none' }}>
              Confirmed: Your slot will be reserved for 30 minutes after generation.
           </div>
           <button className="btn btn-primary btn-full mt-8 btn-lg" disabled={loading} onClick={handleFinish}>
             {loading ? 'Processing...' : 'Generate Secure Token →'}
           </button>
           <button className="btn btn-ghost btn-full mt-2" onClick={() => window.history.back()}>← Back to Payment</button>
        </div>
      )}

      {step === 5 && generatedToken && (
         <div className="animate-scale-in" style={{ padding: '0 5%' }}>
            <div className="success-header">
               <div className="success-check" style={{ margin: '0 auto 12px' }}>✓</div>
               <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-800)' }}>Token Generated!</h2>
               <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>Show this token at the shop counter</p>
            </div>
            
            {/* Queue Status Banner (Blue) */}
            <div className="queue-banner">
               <div style={{ padding: '8px 16px', fontSize: 12, fontWeight: 800, background: 'rgba(0,0,0,0.1)' }}>👤 Queue Status</div>
               <div className="queue-banner-top">
                  <div className="queue-statbox">
                     <h3>{generatedToken.peopleAhead || 0}</h3>
                     <p>People ahead</p>
                  </div>
                  <div className="queue-statbox">
                     <h3>~{generatedToken.estimatedWaitMins || 0}</h3>
                     <p>Mins est time</p>
                  </div>
               </div>
               <div className="queue-banner-mid">
                  <div>
                     <div style={{ opacity: 0.9, marginBottom: 4 }}>Your time slot</div>
                     <div style={{ opacity: 0.9, marginBottom: 4 }}>Date</div>
                     <div style={{ opacity: 0.9 }}>Shop</div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 800 }}>
                     <div style={{ marginBottom: 4 }}>{generatedToken.timeSlotStart} - {generatedToken.timeSlotEnd}</div>
                     <div style={{ marginBottom: 4 }}>{generatedToken.tokenDate}</div>
                     <div>{generatedToken.shopName}</div>
                  </div>
               </div>
               <div className="queue-banner-bottom">
                  ⚠️ Please arrive 5 mins before your slot
               </div>
            </div>

            {/* Token Detail Banner (Green) */}
            <div className="token-details-banner">
               <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, opacity: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>Token Number</div>
                  <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 12, letterSpacing: 1 }}>{generatedToken.tokenNumber}</div>
                  
                  <div style={{ fontSize: 12, opacity: 0.9, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                     <div>⏰ {generatedToken.timeSlotStart} - {generatedToken.timeSlotEnd}</div>
                     <div>📅 {generatedToken.tokenDate}</div>
                     <div>🏪 {generatedToken.shopName}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontWeight: 800 }}>Confirmed</span>
                     <span style={{ fontSize: 24, fontWeight: 900 }}>₹{parseFloat(generatedToken.totalAmount || 0).toFixed(2)}</span>
                  </div>
               </div>
            </div>
            
            {/* Updated QR Box */}
            <div style={{ textAlign: 'center' }}>
               <div className="premium-qr-box">
                  <QRCodeSVG 
                    value={`RATION:${generatedToken.tokenNumber}|SHOP:${generatedToken.shopName}|DATE:${generatedToken.tokenDate}`} 
                    size={160} 
                    level="H" 
                    includeMargin={false}
                    fgColor="#1a7a4a" 
                  />
                  <div className="qr-text-label">{generatedToken.tokenNumber}</div>
               </div>
            </div>
            
            {/* Actions */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 40, width: '100%', flexWrap: 'wrap' }}>
               <button className="btn btn-secondary" style={{ flex: 1, height: 50, borderRadius: 12 }} onClick={() => setPage('home')}>🏠 Home</button>
               <button className="btn btn-primary" style={{ flex: 1, height: 50, borderRadius: 12 }} onClick={() => setPage('token')}>📋 My Tokens</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default GenerateTokenPage;
