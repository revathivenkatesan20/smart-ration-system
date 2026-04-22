import React from 'react';
import { useApp } from '../../context/AppContext';

const AdminProfilePage = () => {
  const { user } = useApp();
  return (
    <div className="page animate-slide-up">
      <div className="page-header"><h1>👤 Admin Profile</h1></div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
          <div style={{width:64,height:64,borderRadius:'50%',
            background:'linear-gradient(135deg,var(--green),var(--green-mid))',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:28,color:'white',fontWeight:800}}>
            {(user?.name||'A')[0]}
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:18}}>{user?.name||'Super Admin'}</div>
            <span className="tag tag-blue">SuperAdmin</span>
          </div>
        </div>
        {[
          ['👤 Username','superadmin'],
          ['📧 Email','admin@rationdept.gov.in'],
          ['🏪 Scope','All Shops (Super Admin)'],
          ['📊 Role','Super Administrator'],
          ['🕐 Last Login', new Date().toLocaleString('en-IN')],
        ].map(([label,value]) => (
          <div key={label} style={{display:'flex',justifyContent:'space-between',
            padding:'12px 0',borderBottom:'1px solid var(--gray-100)'}}>
            <span style={{fontSize:13,color:'var(--gray-500)'}}>{label}</span>
            <span style={{fontWeight:700,fontSize:13}}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminProfilePage;
