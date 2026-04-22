import React from 'react';

export const SmsNotification = ({ visible, otp, onClose }) => {
  if (!visible) return null;
  return (
    <div style={{
      position:'fixed', top:20, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
      background:'#1e1e1e', color:'white', borderRadius:16, width: window.innerWidth < 400 ? '90%' : 350,
      boxShadow:'0 15px 50px rgba(0,0,0,0.5)', overflow:'hidden',
      animation:'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{background:'rgba(255,255,255,0.05)', padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--gray-400)'}}>
          <span>💬 MESSAGES</span>
          <span>· now</span>
        </div>
        <button onClick={onClose} style={{background:'none', border:'none', color:'var(--gray-500)', cursor:'pointer'}}>✕</button>
      </div>
      <div style={{padding:16}}>
        <div style={{fontWeight:700, marginBottom:4}}>Smart Ration System</div>
        <div style={{fontSize:14, lineHeight:1.4, color:'var(--gray-300)'}}>
          Your OTP for registration is <span style={{color:'var(--green)', fontWeight:700, fontSize:18, letterSpacing:2}}>{otp}</span>. 
          Do not share this with anyone.
        </div>
      </div>
    </div>
  );
};

export default SmsNotification;
