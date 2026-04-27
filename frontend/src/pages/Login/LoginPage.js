import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { API_BASE_URL } from '../../utils/constants';
import RegisterPage from './RegisterPage';
import { cachedFetch } from '../../utils/apiCache';

const LoginPage = () => {
  const { login, lang, toggleLang, triggerSms } = useApp();
  const t = (k) => T[lang][k]||k;
  
  const [mode, setMode] = useState('user');
  const [step, setStep] = useState(1);
  const [rationCard, setRationCard] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [forgotState, setForgotState] = useState('none'); // none, request, verify
  const [forgotId, setForgotId] = useState('');
  const [newPass, setNewPass] = useState('');
  const [resetOpt, setResetOtp] = useState(['','','','','','']);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // --- AUTO-WAKEUP OPTIMIZATION ---
  // Since Render Free Tier "sleeps" after 15 mins, we send a tiny 
  // background request as soon as the user lands on the login page.
  useEffect(() => {
    cachedFetch(`${API_BASE_URL}/api/public/shops`).catch(() => {});
  }, []);

  if (showRegister) {
    return (
      <RegisterPage
        onBack={() => setShowRegister(false)}
        onSuccess={(data) => {
          login({
            token: data.token, role: 'USER',
            id: data.id, name: data.name,
            rationCard: data.rationCardNumber,
            rationCardNumber: data.rationCardNumber
          });
        }}
      />
    );
  }

  const handleSendOtp = async () => {
    if (!rationCard || !mobile) return;
    
    // Front-end validation for "Invalid Input"
    if (rationCard.trim().length !== 12 || mobile.trim().length !== 10) {
      window.globalToast?.('Invalid Input', 'Ration Card must be 12 digits and Mobile must be 10 digits.', 'error');
      return;
    }

    setLoading(true);
    const card = rationCard.trim();
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/auth/user/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rationCardNumber: card, mobileNumber: mobile.trim() })
      });
      const data = await res.json();
      if (data.success) {
        if (data.otp) triggerSms(data.otp);
        setCooldown(60); // Set 1-minute cooldown
        setStep(2);
      } else {
        // "Check the details: Not found" alert
        window.globalToast?.('Account Not Found', 'Check the details: User not found with this ration card/mobile combination.', 'error');
      }
    } catch(err) { 
      window.globalToast?.('Error', 'Connection failed', 'error');
    }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) return;
    setLoading(true);
    const card = rationCard.trim();
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/auth/user/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rationCardNumber: card, mobileNumber: mobile.trim(), otp: code })
      });
      const data = await res.json();
      if (data.success && data.data && data.data.token) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('rationCardNumber', card);
        localStorage.setItem('userName', data.data.name||'User');
        localStorage.setItem('role', 'USER');
        login({ token:data.data.token, role:'USER', id:data.data.id,
          name:data.data.name||card, rationCard:card, rationCardNumber:card });
      } else {
        window.globalToast?.('Error', 'Login failed. Check your details and OTP.', 'error');
      }
    } catch(err) { window.globalToast?.('Error', 'Connection error.', 'error'); }
    finally { setLoading(false); }
  };

  const handleAdminLogin = async () => {
    if (!username||!password) return;
    setLoading(true);
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/auth/admin/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        login({ token:data.data.token, role:'ADMIN', id:data.data.id, name:data.data.name });
      } else { window.globalToast?.('Error', 'Invalid credentials!', 'error'); }
    } catch(err) { window.globalToast?.('Error', 'Backend connection failed!', 'error'); }
    finally { setLoading(false); }
  };

  const handleShopAdminLogin = async () => {
    if (!username || !password) return;
    setLoading(true);
    try {
      const res = await cachedFetch(
        `${API_BASE_URL}/api/shop-admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        login({
          token: data.data.token,
          role: 'SHOP_ADMIN',
          id: data.data.shopId,
          name: data.data.name,
          shopId: data.data.shopId,
          shopName: data.data.shopName
        });
      } else {
        window.globalToast?.('Error', 'Invalid shop admin credentials!', 'error');
      }
    } catch(err) {
      window.globalToast?.('Error', 'Connection error!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOtpRequest = async () => {
    if (!forgotId) return;
    setLoading(true);
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/shop-admin/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotId })
      });
      const data = await res.json();
      if (data.success) {
        if (data.otp && data.otp !== 'SENT') triggerSms(data.otp);
        window.globalToast?.('OTP Sent', data.message, 'success');
        setForgotState('verify');
      } else {
        window.globalToast?.('Error', data.message, 'error');
      }
    } catch(err) { window.globalToast?.('Error', 'Connection error', 'error'); }
    finally { setLoading(false); }
  };

  const handleForgotReset = async () => {
    const code = resetOpt.join('');
    if (code.length < 6 || !newPass) return;
    setLoading(true);
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/shop-admin/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotId, otp: code, newPassword: newPass })
      });
      const data = await res.json();
      if (data.success) {
        window.globalToast?.('Success', 'Password reset successfully. Please login.', 'success');
        setForgotState('none');
        setPassword('');
      } else {
        window.globalToast?.('Error', data.message, 'error');
      }
    } catch(err) { window.globalToast?.('Error', 'Connection error', 'error'); }
    finally { setLoading(false); }
  };

  const handleResetOtpInput = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const arr = [...resetOpt]; arr[i] = val;
    setResetOtp(arr);
    if (val && i < 5) document.getElementById(`reset-otp-${i+1}`)?.focus();
  };

  const handleOtpInput = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const arr = [...otp]; arr[i] = val.slice(-1);
    setOtp(arr);
    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      const arr = [...otp];
      if (arr[i]) {
        arr[i] = '';
        setOtp(arr);
      } else if (i > 0) {
        arr[i-1] = '';
        setOtp(arr);
        document.getElementById(`otp-${i-1}`)?.focus();
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Language Toggle - Moved to top-right of page to avoid emblem collision */}
        <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 1000 }}>
          <button className="lang-btn" style={{ fontSize: 11, padding: '4px 10px', opacity: 0.8 }} onClick={toggleLang}>
            {lang === 'en' ? 'தமிழ்' : 'English'}
          </button>
        </div>
        <div className="login-emblem" style={{ marginTop: 8 }}>
          <div className="emblem">🌾</div>
          <h1>{t('appName')}</h1>
          <p>{t('appSub')}</p>
        </div>
        <div className="tabs">
          <button className={`tab-btn ${mode==='user'?'active':''}`}
            onClick={() => { setMode('user'); setStep(1); }}>
            👤 User
          </button>
          <button className={`tab-btn ${mode==='admin'?'active':''}`}
            onClick={() => { setMode('admin'); setStep(1); }}>
            🛡️ Super Admin
          </button>
          <button className={`tab-btn ${mode==='shop'?'active':''}`}
            onClick={() => { setMode('shop'); setStep(1); }}>
            🏪 Shop Admin
          </button>
        </div>

        {mode==='user' && (
          <>
            <div className="step-indicator">
              <div className={`step-dot ${step>=1?'active':''}`}/>
              <div className={`step-dot ${step>=2?'active':''}`}/>
            </div>
            {step===1 && (
              <>
                <div className="form-group">
                  <label className="form-label">🪪 {t('rationCard')}</label>
                  <input className="form-input"
                    placeholder="123456789012" maxLength={12}
                    value={rationCard} onChange={e=>setRationCard(e.target.value.replace(/\D/g,''))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">📱 {t('mobile')}</label>
                  <input className="form-input"
                    placeholder="9876543210" maxLength={10}
                    value={mobile} onChange={e=>setMobile(e.target.value.replace(/\D/g,''))}/>
                </div>
                <button className="btn btn-primary btn-full mt-2"
                  onClick={handleSendOtp} disabled={loading || cooldown > 0}>
                  {loading ? '⏳ Processing...' : (cooldown > 0 ? `Please wait ${cooldown}s` : t('sendOtp'))}
                </button>
                <div style={{textAlign:'center',marginTop:20}}>
                   <span style={{fontSize:13,color:'var(--gray-500)'}}>Don't have an account? </span>
                   <button className="btn-link" onClick={()=>setShowRegister(true)} style={{fontWeight:700,fontSize:13}}>Register Now</button>
                </div>
              </>
            )}
            {step===2 && (
              <div className="animate-fade-in">
                <div className="form-group">
                  <label className="form-label">🔢 {t('enterOtp')}</label>
                  <div className="otp-inputs">
                    {otp.map((d,i)=>(
                      <input key={i} id={`otp-${i}`} className="otp-input"
                        maxLength={1} value={d}
                        inputMode="numeric"
                        onChange={e=>handleOtpInput(i,e.target.value)}
                        onKeyDown={e=>handleOtpKeyDown(i,e)}/>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary btn-full mt-2"
                  onClick={handleVerifyOtp} disabled={loading}>
                  {loading?'⏳ Processing...':t('verifyOtp')}
                </button>
                <button className="btn btn-secondary btn-full mt-2"
                  onClick={()=>setStep(1)}>← {t('back')}</button>
              </div>
            )}
          </>
        )}

        {mode==='admin' && (
          <div className="animate-fade-in">
            <div className="form-group">
              <label className="form-label">👤 {t('username')}</label>
              <input className="form-input" value={username}
                onChange={e=>setUsername(e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">🔒 {t('password')}</label>
              <input className="form-input" type="password"
                value={password} onChange={e=>setPassword(e.target.value)}/>
            </div>
            <button className="btn btn-primary btn-full mt-2"
              onClick={handleAdminLogin} disabled={loading}>
              {loading?'⏳ Logging in...':t('adminLogin')}
            </button>
          </div>
        )}

        {mode==='shop' && (
          <div className="animate-fade-in">
            {forgotState === 'none' && (
              <>
                <div className="form-group">
                  <label className="form-label">🏪 Shop Admin ID (shop_admin_id)</label>
                  <input className="form-input" value={username} placeholder="shop_admin_id"
                    onChange={e=>setUsername(e.target.value)}/>
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>🔒 Password</label>
                    <button 
                      className="btn-link" 
                      style={{ fontSize: 11, fontWeight: 700, padding: 0 }}
                      onClick={() => setForgotState('request')}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input className="form-input" type="password" placeholder="••••••••"
                    value={password} onChange={e=>setPassword(e.target.value)}/>
                </div>
                <button className="btn btn-primary btn-full mt-2"
                  onClick={handleShopAdminLogin} disabled={loading}>
                  {loading?'⏳ Logging in...':'Shop Admin Login'}
                </button>
              </>
            )}

            {forgotState === 'request' && (
              <div className="animate-scale-in">
                <h3 className="mb-4">Reset Shop Admin Password</h3>
                <div className="form-group">
                  <label className="form-label">Shop Admin ID</label>
                  <input className="form-input" placeholder="e.g. shop_admin_4" 
                    value={forgotId} onChange={e=>setForgotId(e.target.value)}/>
                  <p className="text-xs text-muted mt-2">OTP will be sent to your registered MSG91 number.</p>
                </div>
                <button className="btn btn-primary btn-full mt-2" onClick={handleForgotOtpRequest} disabled={loading}>
                  {loading ? 'Sending...' : 'Request OTP via MSG91'}
                </button>
                <button className="btn btn-secondary btn-full mt-2" onClick={()=>setForgotState('none')}>Cancel</button>
              </div>
            )}

            {forgotState === 'verify' && (
              <div className="animate-scale-in">
                <h3 className="mb-4">Enter OTP & New Password</h3>
                <div className="form-group">
                  <label className="form-label">🔢 Enter 6-Digit OTP</label>
                  <div className="otp-inputs">
                    {resetOpt.map((d,i)=>(
                      <input key={i} id={`reset-otp-${i}`} className="otp-input"
                        maxLength={1} value={d}
                        onChange={e=>handleResetOtpInput(i,e.target.value)}/>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">🆕 New Password</label>
                  <input className="form-input" type="password" placeholder="Min 6 characters"
                    value={newPass} onChange={e=>setNewPass(e.target.value)}/>
                </div>
                <button className="btn btn-primary btn-full mt-2" onClick={handleForgotReset} disabled={loading}>
                  {loading ? 'Resetting...' : 'Change Password'}
                </button>
                <button className="btn btn-secondary btn-full mt-2" onClick={()=>setForgotState('request')}>Back</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
