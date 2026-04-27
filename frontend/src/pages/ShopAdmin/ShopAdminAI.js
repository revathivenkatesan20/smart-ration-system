import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../utils/constants';
import { T } from '../../i18n/translations';
import { cachedFetch } from '../../utils/apiCache';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ShopAdminAI = () => {
  const { lang } = useApp();
  const t = (k) => T[lang]?.[k] || k;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canRenderCharts, setCanRenderCharts] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    // Wait for layout to settle, then force re-render
    const timer = setTimeout(() => {
       setCanRenderCharts(true);
       setRenderKey(prev => prev + 1);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    cachedFetch(`${API_BASE_URL}/api/shop-admin/ai-insights`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Accept-Language': lang === 'ta' ? 'ta' : 'en'
      }
    })
    .then(r => r.json())
    .then(d => { 
      if(d.success) {
        setData(d.data);
      } else {
        console.error("AI Insights Error:", d.message);
      }
    })
    .catch(err => console.error("Fetch Error:", err))
    .finally(() => setLoading(false));
  }, [lang]);

  const chartData = (data?.itemDemand || []).map(item => ({
    name: lang === 'ta' ? (item.itemNameTa || item.itemName) : item.itemName,
    Current: parseFloat(item.currentStock || 0),
    Recommended: parseFloat(item.recommendedStock || (item.currentStock * 1.2))
  }));

  if (loading) return (
    <div className="page flex-center h-96">
      <div className="spinner"></div>
      <p className="ml-4">{lang === 'ta' ? 'AI கண்டறிதல் இயங்குகிறது...' : 'Running AI Diagnostics...'}</p>
    </div>
  );

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1>🤖 {t('aiInsights')}</h1>
        <p className="text-muted">{lang === 'ta' ? 'உங்கள் கிளைக்கான உள்ளூர் நுண்ணறிவு மற்றும் தேவை கணிப்பு' : 'Local intelligence and demand forecasting for your branch'}</p>
      </div>

      <div className="grid-3 mb-6">
        <div className="card glass-card shadow-sm flex items-center gap-4">
           <div className="avatar-md bg-green-light">📅</div>
           <div>
              <div className="text-xs text-muted font-bold">{t('peakDayLabel')}</div>
              <div className="text-xl font-black text-green">{data?.peakDay || (lang === 'ta' ? 'வெள்ளி' : 'Friday')}</div>
           </div>
        </div>
        <div className="card glass-card shadow-sm flex items-center gap-4">
           <div className="avatar-md bg-green-light">📊</div>
           <div>
              <div className="text-xs text-muted font-bold">{lang === 'ta' ? 'சேகரிப்பு விகிதம்' : 'COLLECTION RATE'}</div>
              <div className="text-xl font-black text-green">{data?.collectionRate || 0}%</div>
           </div>
        </div>
        <div className="card glass-card shadow-sm flex items-center gap-4">
           <div className="avatar-md bg-green-light">🚀</div>
           <div>
              <div className="text-xs text-muted font-bold">{lang === 'ta' ? 'செயல்திறன்' : 'EFFICIENCY'}</div>
              <div className="text-xl font-black text-green">{lang === 'ta' ? 'உயர்' : 'High'}</div>
           </div>
        </div>
      </div>

      <div className="card mb-8 border-0 shadow-2xl relative overflow-hidden" 
           style={{ background: 'linear-gradient(135deg, #064e3b 0%, #14532d 100%)', color: 'white' }}>
         <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 80, opacity: 0.1 }}>💡</div>
         <h3 className="mb-2" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
           <span style={{ fontSize: 24 }}>💡</span> {t('recommendationLabel')}
         </h3>
         <p className="leading-relaxed text-lg" style={{ fontWeight: 700, color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            "{data?.recommendation || (lang === 'ta' ? 'அமைப்பின் தரவு சேகரிக்கப்படுகிறது... ' : 'Analyzing system patterns for local insights...')}"
         </p>
      </div>

      <div className="card glass-card mb-8">
         <div className="flex-between mb-6">
            <h3>📈 {lang === 'ta' ? 'இருப்பு மற்றும் உள்ளூர் தேவை கணிப்பு' : 'Stock vs Local Demand Prediction'}</h3>
            <div className="tag tag-green">{lang === 'ta' ? 'AI வரிசைப்படுத்தி செயலில் உள்ளது' : 'AI Sorter Active'}</div>
         </div>
         <div style={{ width: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {canRenderCharts && chartData.length > 0 && (
               <ResponsiveContainer key={`ai-bar-${renderKey}`} width="99%" height={400}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                     <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
                     <Legend iconType="circle" />
                     <Bar dataKey="Current" fill="var(--green)" radius={[4, 4, 0, 0]} name={t('stockLevel')} barSize={35} />
                     <Bar dataKey="Recommended" fill="var(--secondary)" radius={[4, 4, 0, 0]} name={t('recommendationLabel')} barSize={35} />
                  </BarChart>
               </ResponsiveContainer>
            )}
         </div>
      </div>

      <div className="card glass-card">
         <h3>📦 {lang === 'ta' ? 'முக்கியமான பொருட்கள் துடிப்பு' : 'Critical Item Pulse'}</h3>
         <div className="mt-4 flex flex-col gap-2">
          {(data?.itemDemand || []).map((item, i) => (
             <div key={i} className="flex-between p-3 border-b last:border-0 border-gray-100">
                <div className="flex items-center gap-3">
                   <span className="font-bold">{lang === 'ta' ? (item.itemNameTa || item.itemName) : item.itemName}</span>
                   <span className="text-xs text-muted">{item.unit}</span>
                   <span className="text-xs text-muted" style={{color: 'var(--gray-500)'}}>
                     {lang === 'ta' ? 'தற்போது:' : 'Stock:'} <strong>{parseFloat(item.currentStock || 0).toFixed(1)} {item.unit}</strong>
                   </span>
                </div>
                <div className="flex items-center gap-2">
                  {parseFloat(item.adequateKg || 0) > 0 && (
                    <span className="text-xs" style={{color: 'var(--amber-dark)', fontWeight: 700}}>
                      +{parseFloat(item.adequateKg).toFixed(1)} {item.unit} {lang === 'ta' ? 'தேவை' : 'needed'}
                    </span>
                  )}
                  <span className={`tag ${
                    item.prediction?.includes('Restock') ? 'tag-red' : 
                    item.prediction?.includes('Monitor') ? 'tag-amber' : 'tag-green'
                  }`}>
                    {lang === 'ta' ? (item.prediction?.includes('Restock') ? 'இருப்பு நிரப்பவும்' : item.prediction?.includes('Monitor') ? 'கண்காணிக்கவும்' : 'ஆரோக்கியமானது') : item.prediction}
                  </span>
                </div>
             </div>
          ))}

         </div>
      </div>
    </div>
  );
};

export default ShopAdminAI;
