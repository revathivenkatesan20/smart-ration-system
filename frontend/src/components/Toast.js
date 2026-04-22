import React from 'react';

const Toast = ({ toasts, removeToast }) => (
  <div style={{position:'fixed',top:20,right:20,zIndex:9999,display:'flex',flexDirection:'column',gap:10}}>
    {toasts.map(toast => (
      <div key={toast.id} style={{
        background: toast.type==='success'?'var(--green)':toast.type==='error'?'var(--red)':'#1d4ed8',
        color:'white',borderRadius:12,padding:'14px 18px',
        boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
        display:'flex',alignItems:'center',gap:12,
        minWidth:280,maxWidth:380,animation:'slideUp 0.3s ease',
      }}>
        <span style={{fontSize:20}}>
          {toast.type==='success'?'✅':toast.type==='error'?'❌':'ℹ️'}
        </span>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:14}}>{toast.title}</div>
          {toast.msg && <div style={{fontSize:12,opacity:0.85,marginTop:2}}>{toast.msg}</div>}
        </div>
        <button onClick={()=>removeToast(toast.id)} style={{
          background:'rgba(255,255,255,0.2)',border:'none',color:'white',
          borderRadius:'50%',width:24,height:24,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:14
        }}>✕</button>
      </div>
    ))}
  </div>
);

export default Toast;
