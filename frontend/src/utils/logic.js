import { API_BASE_URL } from './constants';
import { requestForToken } from '../firebase';

export const registerFCM = async (id, type) => {
  try {
    const token = await requestForToken();
    if (token) {
      console.log(`Registering ${type} FCM Token for ${id}...`);
      const endpoint = type === 'ADMIN' ? '/api/shop-admin/update-fcm-token' : '/api/auth/update-fcm-token';
      const body = type === 'ADMIN' ? { username: id, fcmToken: token } : { rationCardNumber: id, fcmToken: token };
      
      await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }
  } catch (err) {
    console.warn("FCM Registration failed:", err);
  }
};

export const getCalculatedLimit = (item, cardType, units) => {
  if (cardType === 'NPHH-NC') return 0;
  
  const category = item.category || '';
  const name = (item.nameEn || '').toLowerCase();

  // Rice logic
  if (name.includes('rice')) {
    if (cardType === 'AAY') return 35;
    if (cardType === 'PHH' || cardType === 'NPHH') return Math.min(20, units * 5);
    return 0;
  }

  // Sugar logic
  if (category === 'Sugar') {
    if (cardType === 'NPHH-S') return Math.min(5, 3 + units * 0.5);
    if (cardType === 'AAY' || cardType === 'PHH' || cardType === 'NPHH') return Math.min(2, units * 0.5);
    return 0;
  }

  // Wheat logic
  if (name.includes('wheat')) return 10;

  // Oil & Dal logic
  if (category === 'Oil') return 1;
  if (category === 'Pulse') return 1;

  return item.limit || 0;
};

export const getRemainingQuota = (item, cardType, units, getPurchasedQty) => {
  const limit = getCalculatedLimit(item, cardType, units);
  return Math.max(0, limit - getPurchasedQty(item.id));
};

export const isEndOfMonth = () => {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() >= lastDay - 4;
};

export const daysLeftInMonth = () => {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return lastDay - today.getDate();
};

export const statusBadge = (status, lang) => {
  const map = { Available: ["badge-available", "✓"], Low: ["badge-low", "⚠"], "Out of Stock": ["badge-out", "✕"] };
  const taMap = { Available: "கிடைக்கிறது", Low: "குறைவு", "Out of Stock": "இல்லை" };
  const [cls, icon] = map[status] || ["badge-available", "✓"];
  return { cls, icon, label: lang === 'ta' ? taMap[status] : status };
};

export const tokenStatusTag = (status) => {
  const map = { Confirmed: "tag-blue", Collected: "tag-green", Pending: "tag-amber", Expired: "tag-gray", Cancelled: "tag-red" };
  return map[status] || 'tag-gray';
};

export const memberIcon = (gender) => gender === 'Female' ? '👩' : '👨';

export const getPurchasedQty = (itemId, monthlyPurchases) => {
  const p = (monthlyPurchases || []).find(p => p.itemId === itemId &&
    p.month === new Date().getMonth() && p.year === new Date().getFullYear());
  return p ? p.purchased : 0;
};

// --- MAPPLS SDK HELPER ---
export const safeInitMap = (containerId, options, onReady, retryCount = 0) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  const leafletFallback = () => {
    try {
      if (!window.L) {
         console.warn("Leaflet JS not found for fallback.");
         return;
      }
      console.log(`--- LEAFLET FALLBACK [Retry ${retryCount}] ---`);
      container.innerHTML = '';
      const center = options.properties.center;
      // Convert [lng, lat] to [lat, lng]
      const latLng = Array.isArray(center) ? [center[1], center[0]] : 
                     (center.lat ? [center.lat, center.lng] : [12.9229, 80.1275]);
                     
      const map = window.L.map(containerId).setView(latLng, options.properties.zoom || 13);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM'
      }).addTo(map);
      
      if (onReady) onReady(map, true);
      // Trigger resize for modal
      setTimeout(() => map.invalidateSize(), 300);
    } catch (err) {
      console.error('Leaflet Init Error:', err);
    }
  };

  const isMapplsReady = (window.mappls && window.mappls.Map) || (window.MapmyIndia && window.MapmyIndia.v3);

  if (!isMapplsReady) {
    if (retryCount < 8) { 
      setTimeout(() => safeInitMap(containerId, options, onReady, retryCount + 1), 1000);
    } else {
      console.warn('Mappls SDK timed out, using Leaflet.');
      leafletFallback();
    }
    return;
  }

  try {
    console.log('--- MAPPLS SDK READY ---');
    container.innerHTML = '';
    const props = { ...options.properties };
    if (!Array.isArray(props.center) && props.center && typeof props.center === 'object') {
      props.center = [props.center.lng, props.center.lat];
    }
    const map = new (window.mappls?.Map || window.MapmyIndia.Map)(containerId, props);
    if (onReady) onReady(map, false);
  } catch(e) {
    console.warn('Mappls init error, using Leaflet:', e);
    leafletFallback();
  }
};
