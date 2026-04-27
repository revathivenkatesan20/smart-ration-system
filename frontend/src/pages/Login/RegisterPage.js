import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { API_BASE_URL } from '../../utils/constants';
import { safeInitMap } from '../../utils/logic';
import { cachedFetch } from '../../utils/apiCache';

/* ── Pill-button selector: replaces native <select> to avoid OS dropdown overflow ── */
const PillSelect = ({ label, options, value, onChange }) => (
  <div className="form-group mb-1">
    {label && <label className="form-label" style={{ fontSize: 11, display:'block', marginBottom: 5 }}>{label}</label>}
    <div style={{ display:'flex', flexWrap:'wrap', gap: 5, width:'100%' }}>
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          style={{
            padding:'5px 11px', borderRadius: 99, fontSize: 11, fontWeight: 700,
            cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.18s ease',
            border: `1.5px solid ${value === opt.value ? 'var(--green)' : 'var(--gray-200)'}`,
            background: value === opt.value ? 'var(--green)' : 'var(--gray-50)',
            color: value === opt.value ? 'white' : 'var(--gray-600)',
            boxShadow: value === opt.value ? '0 2px 8px rgba(20,90,50,0.15)' : 'none'
          }}
        >{opt.label}</button>
      ))}
    </div>
  </div>
);

const SearchableShopDropdown = ({ shops, selectedId, onSelect, lang, t }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const filtered = shops.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.shopCode?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedShop = shops.find(s => s.id === selectedId);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="form-group" ref={containerRef} style={{ position: 'relative', maxWidth: '100%' }}>
      <label className="form-label">🏪 Select Ration Shop</label>
      <div className="search-input-wrap" style={{ position: 'relative', width: '100%' }}>
        <input 
          className="form-input" 
          placeholder={t('searchShop') || '🔍 Search by name or code...'}
          value={isOpen ? search : (selectedShop?.name || '')}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          style={{ width: '100%', boxSizing: 'border-box', textOverflow: 'ellipsis', paddingRight: 40, cursor: 'pointer' }}
        />
        <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', display: 'flex', gap: 6, alignItems: 'center' }}>
           {selectedShop && !isOpen && <span className="tag tag-green" style={{ padding: '2px 4px', fontSize: 10 }}>✅</span>}
           <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {isOpen && (
        <div className="card shadow-lg" style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:9999,
          maxHeight:220, overflowY:'auto', overflowX: 'hidden', marginTop:5, padding: 0,
          border: '1px solid var(--gray-200)', borderRadius: 12,
          background: 'white', width: '100%', boxSizing: 'border-box',
          boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding:15, textAlign:'center', color:'var(--gray-400)', fontSize: 12 }}>No shops found</div>
          ) : filtered.map((s, idx) => (
            <div key={s.id} 
              onClick={() => { onSelect(s); setIsOpen(false); setSearch(''); }}
              style={{
                padding:'12px 14px', cursor:'pointer',
                background: selectedId === s.id ? 'var(--green-light)' : 'transparent',
                borderBottom: '1px solid var(--gray-100)',
                overflow: 'hidden',
                width: '100%', boxSizing: 'border-box'
              }}>
              <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '100%' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{s.shopCode} · {s.district}</span>
                {s.isNearest && <span className="tag tag-green" style={{ fontSize: 8, flexShrink: 0, marginLeft: 4 }}>⭐ NEAREST</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RegisterPage = ({ onBack, onSuccess }) => {
  const { lang, mapplsLoaded, triggerSms, login } = useApp();
  const t = (k) => T[lang][k]||k;
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [allShops, setAllShops] = useState([]);
  const [form, setForm] = useState({
    headOfFamily: '',
    rationCardNumber: '',
    mobileNumber: '',
    aadharNumber: '',
    address: '',
    pincode: '',
    district: 'Chengalpattu',
    cardType: 'PHH',
    isUrban: true,
    gasCylinders: 0,
    headAge: '',
    headGender: 'Male',
    familyMembers: []
  });
  
  const [newMember, setNewMember] = useState({ name: '', age: '', gender: 'Male', relation: '', aadhar: '' });
  const [govtShop, setGovtShop] = useState(null);
  const [preferredShop, setPreferredShop] = useState(null);
  const [otp, setOtp] = useState(['','','','','','']);
  const [error, setError] = useState('');
  const mapRef = useRef(null);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    const initData = async () => {
      try {
        const res = await cachedFetch(`${API_BASE_URL}/api/public/shops`);
        const data = await res.json();
        if (data.success) {
          setAllShops(data.data);
          detectLocation(data.data);
        }
      } catch (err) { setGpsLoading(false); }
    };
    initData();
  }, []);

    const mapTrigger = !!(!gpsLoading && allShops.length > 0);
    const [mapInitialized, setMapInitialized] = useState(false);

    useEffect(() => {
      if (mapTrigger && !mapInitialized && step === 1) {
        const lat = preferredShop?.latitude || allShops[0]?.latitude || 12.6921;
        const lng = preferredShop?.longitude || allShops[0]?.longitude || 79.9765;
        setTimeout(() => {
          initMap(lat, lng, allShops.slice(0, 5));
          setMapInitialized(true);
        }, 500);
      }
    }, [mapTrigger, step]);

  const detectLocation = (shops) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const shopsWithDist = shops.map(s => ({
            ...s,
            distance: s.latitude ? getDistance(latitude, longitude, s.latitude, s.longitude) : Infinity
          })).sort((a,b) => a.distance - b.distance);
          
          if (shopsWithDist.length > 0) {
            const nearest = { ...shopsWithDist[0], isNearest: true };
            const updatedList = [nearest, ...shopsWithDist.slice(1)];
            setAllShops(updatedList);
            setPreferredShop(nearest);
            setGovtShop(shops[0]); 
          }
          setGpsLoading(false);
        },
        () => {
          setGpsLoading(false);
          if (shops.length > 0) {
            setGovtShop(shops[0]);
            setPreferredShop(shops[0]);
          }
        }
      );
    } else {
      setGpsLoading(false);
    }
  };

  const initMap = (lat, lng, nearby) => {
    safeInitMap('register-map', {
      properties: { center: [lng, lat], zoom: 14 }
    }, (map) => {
      // OSM Leaflet specifics
      if (window.L) {
        window.L.marker([lat, lng]).addTo(map).bindPopup('<b>📍 Your Location</b>').openPopup();
        nearby.forEach(s => {
          window.L.marker([s.latitude, s.longitude], {
            icon: window.L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="shop-marker-icon ${s.isNearest ? 'assigned' : ''}">🏪</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 38]
            })
          }).addTo(map).bindPopup(`<b>🏪 ${s.name}</b><br/>${s.distance.toFixed(1)} km away`);
        });
      }
    });
  };

  const addFamilyMember = () => {
    if (!newMember.name || !newMember.age || !newMember.aadhar) { 
      window.globalToast?.('Error', 'Please fill all fields', 'error');
      return; 
    }
    setForm({ ...form, familyMembers: [...form.familyMembers, { ...newMember, aadhaar: newMember.aadhar, id: Date.now() }] });
    setNewMember({ name: '', age: '', gender: 'Male', relation: '', aadhar: '' });
  };

  const handleContinueToStep3 = () => {
    // If user has typed something in newMember but forgotten to click "Add"
    if (newMember.name || newMember.age || newMember.aadhar || newMember.relation) {
      if (newMember.name && newMember.age && newMember.aadhar && newMember.relation) {
        // All fields filled? Auto-add them.
        setForm(prev => ({ 
          ...prev, 
          familyMembers: [...prev.familyMembers, { ...newMember, aadhaar: newMember.aadhar, id: Date.now() }] 
        }));
        setNewMember({ name: '', age: '', gender: 'Male', relation: '', aadhar: '' });
      } else {
        // Partially filled, warn the user they might lose this data
        window.globalToast?.('Notice', 'Incomplete family member details ignored. Please click +Add or complete the fields.', 'warning');
      }
    }
    setStep(3);
  };

  const handleRegister = async () => {
    // ── Validate all required fields before sending OTP ──
    if (!govtShop?.id) {
      setError('Please select your Permanent Assigned Shop.');
      return;
    }
    if (!preferredShop?.id) {
      setError('Please select your Preferred Purchase Shop.');
      return;
    }
    if (!form.headOfFamily.trim()) {
      setError('Please enter the Full Name of the Head of Family.');
      return;
    }
    if (!form.aadharNumber || form.aadharNumber.length !== 12) {
      setError('Please enter a valid 12-digit Aadhar Number.');
      return;
    }
    if (!form.rationCardNumber || form.rationCardNumber.length !== 12) {
      setError('Please enter a valid 12-digit Ration Card Number.');
      return;
    }
    if (!form.mobileNumber || form.mobileNumber.length !== 10) {
      setError('Please enter a valid 10-digit Mobile Number.');
      return;
    }
    if (!form.cardType) {
      setError('Please select a Card Type.');
      return;
    }
    if (!form.district) {
      setError('Please select your District.');
      return;
    }
    if (!form.pincode || form.pincode.length !== 6) {
      setError('Please enter a valid 6-digit Pincode.');
      return;
    }
    if (!form.address.trim()) {
      setError('Please enter your Full Address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...form,
          gasCylinders: Number(form.gasCylinders),
          isUrban: Boolean(form.isUrban),
          govtShopId: govtShop?.id,
          shopId: preferredShop?.id 
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.otp) triggerSms(data.otp);
        setStep(4);
        window.globalToast?.('OTP Sent', 'Check your mobile device', 'success');
      } else setError(data.message);
    } catch(err) { setError('Registration failed'); }
    setLoading(false);
  };

  const handleVerifyRegistration = async () => {
    const code = otp.join('');
    if (code.length < 6) return;
    setLoading(true);
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/auth/verify-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rationCardNumber: form.rationCardNumber, 
          mobileNumber: form.mobileNumber, 
          otp: code 
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (onSuccess) onSuccess(data.data);
        else login(data.data);
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch(err) { setError('Connection error'); }
    setLoading(false);
  };

  return (
    <div className="page" style={{ 
      minHeight:'100vh', 
      background:'linear-gradient(135deg, var(--green-dark), var(--green))',
      display:'flex', alignItems:'center', justifyContent:'center', padding: window.innerWidth < 480 ? 12 : 20
    }}>
      <div className="card glass-card animate-scale-in" style={{ 
        maxWidth: 600, width:'95%', padding: window.innerWidth < 480 ? 16 : 32, borderRadius: 24, boxShadow:'0 30px 60px rgba(0,0,0,0.3)',
        marginLeft: 'auto', marginRight: 'auto'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <button className="btn btn-secondary btn-circle btn-sm" onClick={onBack}>←</button>
          <div>
            <h2 style={{ margin:0, fontSize: window.innerWidth < 480 ? 18 : 22 }}>🌾 {t('registerTitle') || 'New Registration'}</h2>
            <div className="text-muted" style={{ fontSize:11 }}>Step {step} of 4</div>
          </div>
        </div>

        {error && <div className="alert alert-danger mb-3 p-2 text-sm">{error}</div>}

        {step === 1 && (
          <div className="animate-fade-in">
            <div id="register-map" style={{ 
              width:'100%', height: 160, 
              borderRadius:12, marginBottom:16, background:'var(--gray-50)', 
              border:'2px solid var(--green-light)', position: 'relative',
              overflow: 'hidden'
            }}>
              {(!mapInitialized || gpsLoading) && (
                <div className="flex-center h-full" style={{ flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.8)', position: 'absolute', inset: 0, zIndex: 10 }}>
                  <div className="spinner"></div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)' }}>
                    {gpsLoading ? '🔍 Locating nearest shops...' : '🗺️ Map is loading, please wait...'}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <div>
                <label className="form-label" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>🏦 Permanent Assigned Shop</label>
                <SearchableShopDropdown 
                  shops={allShops} 
                  selectedId={govtShop?.id} 
                  onSelect={setGovtShop} 
                  lang={lang} t={t} 
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>📍 Preferred Purchase Shop</label>
                <SearchableShopDropdown 
                  shops={allShops} 
                  selectedId={preferredShop?.id} 
                  onSelect={setPreferredShop} 
                  lang={lang} t={t} 
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group mb-2">
                <label className="form-label" style={{ fontSize: 11 }}>Full Name (Head)</label>
                <input className="form-input" style={{ padding: '8px 12px', fontSize: 13 }} autoComplete="new-password" value={form.headOfFamily} onChange={e=>setForm({...form, headOfFamily:e.target.value})} />
              </div>
              <div className="form-group mb-2">
                <label className="form-label" style={{ fontSize: 11 }}>Age (Head)</label>
                <input className="form-input" type="number" style={{ padding: '8px 12px', fontSize: 13 }} value={form.headAge} onChange={e=>setForm({...form, headAge:e.target.value})} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group mb-2">
                <PillSelect
                  label="Gender (Head)"
                  value={form.headGender}
                  onChange={v => setForm({...form, headGender: v})}
                  options={[{value:'Male',label:'Male'},{value:'Female',label:'Female'}]}
                />
              </div>
              <div className="form-group mb-2">
                <label className="form-label" style={{ fontSize: 11 }}>Aadhar Number</label>
                <input className="form-input" style={{ padding: '8px 12px', fontSize: 13 }} autoComplete="new-password" maxLength={12} value={form.aadharNumber} onChange={e=>setForm({...form, aadharNumber:e.target.value.replace(/\D/g,'')})} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group mb-2">
                <label className="form-label" style={{ fontSize: 11 }}>Ration Card No</label>
                <input className="form-input" style={{ padding: '8px 12px', fontSize: 13 }} autoComplete="new-password" maxLength={12} value={form.rationCardNumber} onChange={e=>setForm({...form, rationCardNumber:e.target.value.replace(/\D/g,'')})} />
              </div>
              <div className="form-group mb-2">
                <label className="form-label" style={{ fontSize: 11 }}>Mobile Number</label>
                <input className="form-input" style={{ padding: '8px 12px', fontSize: 13 }} autoComplete="new-password" maxLength={10} value={form.mobileNumber} onChange={e=>setForm({...form, mobileNumber:e.target.value.replace(/\D/g,'')})} />
              </div>
            </div>
            
            <div style={{ display:'flex', flexDirection:'column', gap: 6, marginTop: 8 }}>
              <PillSelect
                label="Card Type"
                value={form.cardType}
                onChange={v => setForm({...form, cardType: v})}
                options={[
                  {value:'PHH',label:'PHH'},{value:'PHH-AAY',label:'PHH-AAY'},
                  {value:'NPHH',label:'NPHH'},{value:'NPHH-S',label:'NPHH-S'},
                  {value:'NPHH-NC',label:'NPHH-NC'}
                ]}
              />
              <PillSelect
                label="Gas Cylinders"
                value={String(form.gasCylinders)}
                onChange={v => setForm({...form, gasCylinders: v})}
                options={[
                  {value:'0',label:'0 Cylinders'},{value:'1',label:'1 Cylinder'},{value:'2',label:'2+ Cylinders'}
                ]}
              />
              <PillSelect
                label="Area Type"
                value={form.isUrban ? 'Urban' : 'Rural'}
                onChange={v => setForm({...form, isUrban: v === 'Urban'})}
                options={[
                  {value:'Urban',label:'🏙️ Urban'},{value:'Rural',label:'🌳 Rural'}
                ]}
              />
              <div className="form-group mb-1">
                <label className="form-label" style={{ fontSize: 11 }}>District</label>
                <input 
                  className="form-input" 
                  style={{ padding: '6px 10px', fontSize: 12, width: '100%' }} 
                  placeholder="Enter your district name..."
                  autoComplete="new-password" 
                  value={form.district} 
                  onChange={e => setForm({...form, district: e.target.value})} 
                />
              </div>
              <div className="form-group mb-1">
                <label className="form-label" style={{ fontSize: 11 }}>Pincode</label>
                <input className="form-input" style={{ padding: '6px 10px', fontSize: 12, width: '100%' }} autoComplete="new-password" maxLength={6} value={form.pincode} onChange={e=>setForm({...form, pincode:e.target.value.replace(/\D/g,'')})} />
              </div>
            </div>

            <div className="form-group mb-2">
              <label className="form-label" style={{ fontSize: 11 }}>Full Address</label>
              <textarea className="form-input" style={{ padding: '8px 12px', fontSize: 12, height: 60, resize:'none' }} value={form.address} onChange={e=>setForm({...form, address:e.target.value})} placeholder="Enter your full door address..." />
            </div>
            <button className="btn btn-primary btn-full mt-3 btn-sm" onClick={() => setStep(2)}>Continue to Members →</button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize:15, marginBottom:12 }}>👨‍👩‍👧‍👦 {t('familyMembers') || 'Add Family Members'}</h3>
            <div className="card glass-card" style={{ padding:12, marginBottom:16, border:'1px dashed var(--green)', borderRadius: 12 }}>
               <div className="grid-2" style={{ gap: 8 }}>
                 <input className="form-input" style={{ fontSize: 12 }} placeholder="Name" value={newMember.name} onChange={e=>setNewMember({...newMember, name:e.target.value})} />
                 <input className="form-input" style={{ fontSize: 12 }} placeholder="Age" type="number" value={newMember.age} onChange={e=>setNewMember({...newMember, age:e.target.value})} />
               </div>
               <div className="grid-2 mt-2" style={{ gap: 8 }}>
               <div className="col-span-2">
                 <PillSelect
                   value={newMember.relation}
                   onChange={v => setNewMember({...newMember, relation: v})}
                   options={[
                     {value:'Spouse',label:'Spouse'},{value:'Son',label:'Son'},
                     {value:'Daughter',label:'Daughter'},{value:'Father',label:'Father'},
                     {value:'Mother',label:'Mother'}
                   ]}
                 />
               </div>
                 <input className="form-input" style={{ fontSize: 12 }} placeholder="Aadhar" maxLength={12} value={newMember.aadhar} onChange={e=>setNewMember({...newMember, aadhar:e.target.value.replace(/\D/g,'')})} />
               </div>
               <button className="btn btn-secondary btn-full mt-2 btn-sm" onClick={addFamilyMember}>+ Add Member</button>
            </div>
            <div style={{ maxHeight:120, overflowY:'auto' }}>
              {form.familyMembers.map(m => (
                <div key={m.id} className="flex-between p-2 border-b" style={{ fontSize: 12 }}>
                  <span><b>{m.name}</b> ({m.relation})</span>
                  <button onClick={() => setForm({...form, familyMembers: form.familyMembers.filter(fm=>fm.id!==m.id)})} className="text-red">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn btn-secondary btn-full btn-sm" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary btn-full btn-sm" onClick={handleContinueToStep3}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize:16, marginBottom:12 }}>✅ {t('previewTitle') || 'Review Your Application'}</h3>
            <div className="card" style={{ padding:14, background:'var(--gray-50)', borderRadius:16, marginBottom:16, fontSize: 12, border:'1px solid var(--gray-200)' }}>
               <div className="grid-2 mb-3" style={{ gap: 16 }}>
                 <div>
                   <div style={{ color:'var(--gray-400)', fontSize:10, fontWeight:800 }}>MEMBER PRIMARY</div>
                   <div className="mt-1">👤 <b>{form.headOfFamily}</b></div>
                   <div>🪪 {form.aadharNumber}</div>
                   <div>🪪 Card No: {form.rationCardNumber}</div>
                   <div className="tag tag-green mt-1" style={{ fontSize:9 }}>{form.cardType}</div>
                 </div>
                 <div>
                   <div style={{ color:'var(--gray-400)', fontSize:10, fontWeight:800 }}>SHOPS MAPPING</div>
                   <div className="mt-1">🏦 Assigned: <b>{govtShop?.name || 'N/A'}</b></div>
                   <div>📍 Preferred: <b>{preferredShop?.name || 'N/A'}</b></div>
                    <div mt-2 style={{ color:'var(--gray-400)', fontSize:10, fontWeight:800 }}>GEOGRAPHY</div>
                    <div>{form.isUrban ? '🏙️ Urban' : '🌳 Rural'} Area</div>
                    <div>🏙️ {form.district} - {form.pincode}</div>
                  </div>
               </div>

               <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 10 }}>
                 <div style={{ color:'var(--gray-400)', fontSize:10, fontWeight:800, marginBottom:8 }}>FAMILY MEMBERS ({form.familyMembers.length + 1} TOTAL)</div>
                 <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    <div className="flex-between py-1 border-b" style={{ fontWeight:700 }}>
                      <span>Name</span>
                      <span>Relation / Age</span>
                    </div>
                    {form.familyMembers.map(m => (
                      <div key={m.id} className="flex-between py-1 border-b" style={{ color:'var(--gray-600)' }}>
                        <span>{m.name}</span>
                        <span>{m.relation} / {m.age}</span>
                      </div>
                    ))}
                    {form.familyMembers.length === 0 && <div className="py-2 text-center text-muted italic">No additional family members</div>}
                 </div>
               </div>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-secondary btn-full btn-sm" onClick={() => setStep(2)}>Modify</button>
              <button className="btn btn-primary btn-full btn-sm" onClick={handleRegister} disabled={loading}>
                {loading ? 'Submitting...' : 'Confirm & Send OTP'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in text-center">
            <h3 style={{ fontSize: 16 }}>🔢 OTP Verification</h3>
            <p style={{ fontSize: 12 }}>Enter code sent to {form.mobileNumber}</p>
            <div className="otp-inputs mt-3">
              {otp.map((d,i) => (
                <input key={i} id={`otp-${i}`} className="otp-input" style={{ width: 34, height: 44, fontSize: 18 }} 
                  maxLength={1} value={d} inputMode="numeric"
                  onChange={e => {
                    if (!/^\d*$/.test(e.target.value)) return;
                    const arr = [...otp]; arr[i] = e.target.value.slice(-1); setOtp(arr);
                    if (e.target.value && i < 5) document.getElementById(`otp-${i+1}`).focus();
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace') {
                      const arr = [...otp];
                      if (arr[i]) { arr[i] = ''; setOtp(arr); }
                      else if (i > 0) { arr[i-1] = ''; setOtp(arr); document.getElementById(`otp-${i-1}`)?.focus(); }
                    }
                  }}
                />
              ))}
            </div>
            <button className="btn btn-primary btn-full mt-5 btn-sm" onClick={handleVerifyRegistration} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Finish'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
