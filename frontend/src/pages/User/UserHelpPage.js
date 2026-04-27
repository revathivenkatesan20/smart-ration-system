import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../utils/constants';
import RequestChangeModal from '../../components/User/RequestChangeModal';
import { cachedFetch } from '../../utils/apiCache';

const FAQ_DATA = [
  {
    cat: "STOCK",
    qEn: "How do I check current stock at my shop?",
    qTa: "எனது கடையில் தற்போதைய இருப்பை எவ்வாறு சரிபார்க்கலாம்?",
    aEn: "Go to the Home dashboard to see real-time availability of all seven commodities. If an item is low, you'll see a yellow badge.",
    aTa: "முகப்பு டாஷ்போர்டுக்குச் சென்று ஏழு பொருட்களின் இருப்பையும் பார்க்கலாம். இருப்பு குறைவாக இருந்தால் மஞ்சள் நிற பேட்ஜ் தோன்றும்."
  },
  {
    cat: "TOKEN",
    qEn: "How do I generate a ration token?",
    qTa: "ரேஷன் டோக்கனை எப்படி உருவாக்குவது?",
    aEn: "On the Home tab, click 'Generate Token', select your items and quantities, then confirm. A token QR and number will be generated.",
    aTa: "முகப்பு தாவலில் 'டோக்கன் பெறு' என்பதை அழுத்தி, பொருட்களைத் தேர்ந்தெடுத்து உறுதிப்படுத்தவும். QR குறியீடு மற்றும் டோக்கன் எண் உருவாகும்."
  },
  {
    cat: "PROFILE",
    qEn: "How do I update family members?",
    qTa: "குடும்ப உறுப்பினர்களை எப்படி புதுப்பிப்பது?",
    aEn: "Use the 'New Request' button in the Profile Modification section below. A Super Admin will verify and approve your request.",
    aTa: "கீழே உள்ள 'சுயவிவர மாற்றம்' பகுதியில் 'புதிய கோரிக்கை' என்பதைப் பயன்படுத்தவும். சூப்பர் அட்மின் அதைச் சரிபார்த்து அங்கீகரிப்பார்."
  },
  {
    cat: "GENERAL",
    qEn: "Can I use any ration shop?",
    qTa: "நான் எந்த ரேஷன் கடையையும் பயன்படுத்தலாமா?",
    aEn: "You can switch to any shop via the 'View Map' tool. Once switched, you can generate tokens for that shop instantly.",
    aTa: "'வரைபடம் பார்' கருவி மூலம் எந்தக் கடைக்கும் மாறலாம். மாறியதும், அந்தக் கடைக்கு டோக்கன்களை உருவாக்கலாம்."
  }
];

const UserHelpPage = () => {
  const { lang } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('ALL');
  
  // Grievance Form State
  const [gvForm, setGvForm] = useState({ title: '', category: 'GENERAL', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    Promise.all([
      cachedFetch(`${API_BASE_URL}/api/user/profile`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      cachedFetch(`${API_BASE_URL}/api/user/change-requests`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      cachedFetch(`${API_BASE_URL}/api/user/grievances`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ]).then(([profileData, histData, gvData]) => {
      if (profileData.success) setProfile(profileData.data);
      if (histData.success) setHistory(histData.data);
      if (gvData.success) setGrievances(gvData.data);
    }).catch(console.warn).finally(() => setLoading(false));
  }, []);

  const fetchGrievances = () => {
    const token = sessionStorage.getItem('token');
    cachedFetch(`${API_BASE_URL}/api/user/grievances`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data.success) setGrievances(data.data); });
  };

  const handleGvSubmit = async (e) => {
    e.preventDefault();
    if (!gvForm.title || !gvForm.description) return;
    setIsSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await cachedFetch(`${API_BASE_URL}/api/user/grievances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(gvForm)
      });
      const data = await res.json();
      if (data.success) {
        window.globalToast?.('Submitted', 'Ticket created successfully', 'success');
        setGvForm({ title: '', category: 'GENERAL', description: '' });
        fetchGrievances();
      }
    } catch (err) { console.error(err); }
    setIsSubmitting(false);
  };

  const filteredFaqs = FAQ_DATA.filter(f => {
    const matchCat = activeCat === 'ALL' || f.cat === activeCat;
    const text = (lang === 'ta' ? f.qTa + f.aTa : f.qEn + f.aEn).toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const categories = [
    { id: 'ALL', en: 'All', ta: 'அனைத்தும்' },
    { id: 'STOCK', en: 'Stock', ta: 'இருப்பு' },
    { id: 'TOKEN', en: 'Tokens', ta: 'டோக்கன்' },
    { id: 'PROFILE', en: 'Profile', ta: 'சுயவிவரம்' },
    { id: 'GENERAL', en: 'General', ta: 'பொது' },
  ];

  return (
    <div className="page animate-slide-up">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1>❓ {lang === 'ta' ? 'உதவி & ஆதரவு' : 'Help & Support'}</h1>
        <p className="text-muted">{lang === 'ta' ? 'வழிகாட்டுதல் மற்றும் புகார் மேலாண்மை' : 'Guidance, FAQs and Grievance Management'}</p>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
        
        {/* LEFT: FAQ Engine */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card glass-card shadow-lg" style={{ padding: 20 }}>
            <div className="form-group mb-3">
              <input 
                className="form-input" 
                placeholder={lang === 'ta' ? 'தேடு...' : 'Search questions...'} 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ borderRadius: 12, border: '1px solid var(--green-mid)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categories.map(c => (
                <button 
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`tag ${activeCat === c.id ? 'tag-green' : 'btn-secondary'}`}
                  style={{ cursor: 'pointer', fontSize: 11, border: 'none' }}>
                  {lang === 'ta' ? c.ta : c.en}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
             {filteredFaqs.length === 0 ? (
               <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>No matching FAQs found</div>
             ) : filteredFaqs.map((f, i) => (
               <div key={i} style={{ borderBottom: i < filteredFaqs.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                  <button 
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{lang === 'ta' ? f.qTa : f.qEn}</span>
                    <span>{openFaq === i ? '▲' : '▼'}</span>
                  </button>
                  {openFaq === i && (
                    <div className="animate-fade-in" style={{ padding: '0 20px 16px', fontSize: 13, color: 'var(--gray-600)', lineHeight: '1.6' }}>
                      {lang === 'ta' ? f.aTa : f.aEn}
                    </div>
                  )}
               </div>
             ))}
          </div>
        </div>

        {/* RIGHT: Grievance System */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div className="card glass-card shadow-lg" style={{ border: '1px solid var(--green-mid)' }}>
             <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>📝 {lang === 'ta' ? 'புகார் சமர்ப்பி' : 'Submit a Grievance'}</h3>
             <form onSubmit={handleGvSubmit}>
                <div className="form-group mb-3">
                  <label className="form-label text-xs">Category</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap: 6, marginTop: 4 }}>
                    {[
                      {value:'GENERAL', label:'General'},
                      {value:'STOCK', label:'Stock'},
                      {value:'TOKEN', label:'Token'},
                      {value:'PROFILE', label:'Profile'},
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setGvForm({...gvForm, category: opt.value})}
                        style={{
                          padding:'5px 11px', borderRadius:99, fontSize:11, fontWeight:700,
                          cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.18s ease', border:'none',
                          background: gvForm.category === opt.value ? 'var(--green)' : 'var(--gray-100)',
                          color: gvForm.category === opt.value ? 'white' : 'var(--gray-600)',
                        }}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
               <div className="form-group mb-3">
                 <input 
                   className="form-input" 
                   placeholder="Short Summary / Title" 
                   value={gvForm.title}
                   onChange={e => setGvForm({...gvForm, title: e.target.value})}
                 />
               </div>
               <div className="form-group mb-4">
                 <textarea 
                   className="form-input" 
                   placeholder="Describe your problem in detail..." 
                   style={{ height: 80 }}
                   value={gvForm.description}
                   onChange={e => setGvForm({...gvForm, description: e.target.value})}
                 />
               </div>
               <button className="btn btn-primary btn-full btn-sm" disabled={isSubmitting}>
                 {isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
               </button>
             </form>
          </div>

          <div className="card shadow-sm" style={{ padding: 0 }}>
             <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)', display: 'flex', justifyContent: 'space-between' }}>
               <h3 style={{ margin: 0, fontSize: 14 }}>🕒 Your Support Tickets</h3>
               <button className="btn btn-secondary btn-xs" onClick={fetchGrievances}>🔄</button>
             </div>
             {grievances.length === 0 ? (
               <div style={{ padding: 30, textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}>No tickets yet</div>
             ) : grievances.map(g => (
               <div key={g.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--gray-100)' }}>
                  <div className="flex-between mb-1">
                    <span className="tag-amber" style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4 }}>{g.category}</span>
                    <span style={{ fontSize: 10, color: 'var(--gray-500)' }}>{g.createdAt?.split('T')[0]}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{g.title}</div>
                  <div className="text-muted mt-1" style={{ fontSize: 11 }}>{g.description}</div>
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: g.status === 'RESOLVED' ? 'var(--green)' : 'var(--amber)', fontWeight: 800 }}>● {g.status}</span>
                  </div>
               </div>
             ))}
          </div>

        </div>
      </div>

      {/* Profile Modification History Section */}
      <div className="card mt-4 shadow-sm" style={{ background: 'var(--gray-50)' }}>
         <div className="flex-between mb-3">
           <div>
             <h3 style={{ margin: 0, fontSize: 15 }}>🛠️ {lang === 'ta' ? 'சுயவிவர மாற்றங்கள்' : 'Profile Modification Requests'}</h3>
             <p className="text-muted text-xs" style={{ margin: '2px 0 0' }}>{lang === 'ta' ? 'முகவரி, கைபேசி எண் அல்லது குடும்ப விவர மாற்றங்கள்.' : 'Request updates to address, mobile number, or family details.'}</p>
           </div>
           <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ {lang === 'ta' ? 'புதிய கோரிக்கை' : 'New Request'}</button>
         </div>

         {history.length > 0 ? (
           <div className="flex flex-col gap-2">
             {history.slice(0, 3).map(cr => (
               <div key={cr.id} className="p-2 bg-white rounded border border-gray-100 flex-between">
                 <div style={{ fontSize: 11 }}>
                   <span className="font-bold">{cr.fieldName}</span> → <span className="text-muted">{cr.newValue}</span>
                 </div>
                 <span className={`tag ${cr.status === 'APPROVED' ? 'tag-green' : cr.status === 'PENDING' ? 'tag-amber' : 'tag-red'}`} style={{ fontSize: 9 }}>
                   {cr.status}
                 </span>
               </div>
             ))}
             {history.length > 3 && <button className="btn btn-link btn-xs" style={{ alignSelf: 'flex-start' }}>View all history...</button>}
           </div>
         ) : (
           <div style={{ fontSize: 11, color: 'var(--gray-400)', fontStyle: 'italic' }}>No profile change requests yet.</div>
         )}
      </div>

      {showModal && (
        <RequestChangeModal 
          profile={profile} 
          lang={lang}
          onClose={() => setShowModal(false)} 
          onRefresh={() => {
            const token = sessionStorage.getItem('token');
            cachedFetch(`${API_BASE_URL}/api/user/change-requests`, { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.json()).then(data => { if (data.success) setHistory(data.data); });
          }} 
        />
      )}
    </div>
  );
};

export default UserHelpPage;
