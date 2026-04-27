import React, { useState } from 'react';
import { API_BASE_URL } from '../../utils/constants';

const RequestChangeModal = ({ profile, onClose, onRefresh, lang = 'en' }) => {
  const t = (k) => {
    const translations = {
      ta: {
        title: '📝 சுயவிவர மாற்றத்தைக் கோருங்கள்',
        subtitle: 'உங்கள் கோரிக்கைப் பட்டியலில் ஒன்று அல்லது அதற்கு மேற்பட்ட மாற்றங்களைச் சேர்க்கவும். இறுதியில் ஒரே ஒரு OTP மூலம் அனைத்தையும் சரிபார்க்கலாம்.',
        fieldLabel: 'மாற்ற வேண்டிய புலம்',
        currentLabel: 'தற்போதைய மதிப்பு',
        detailLabel: 'தேவை விவரம்',
        addBtn: '➕ மாற்றப் பட்டியலில் சேர்க்கவும்',
        queueTitle: '📂 செயலில் உள்ள பட்டியல்',
        readyTag: 'சமர்ப்பிக்கத் தயார்',
        previewBtn: 'முன்னோட்டம் & OTP பெறுக →',
        finalTitle: '📋 இறுதி உறுதிப்படுத்தல்',
        finalSubtitle: 'பின்வரும் மாற்றக் கோரிக்கைகளைச் சரிபார்க்கவும். அனைத்தையும் இறுதி செய்ய உங்களுக்கு ஒரு OTP அனுப்பப்படும்.',
        backBtn: '← பட்டியலைத் திருத்து',
        otpBtn: 'OTP-க்குச் செல்லவும் →',
        verifyTitle: 'இறுதி சரிபார்ப்பு',
        verifySubtitle: 'அனைத்து மாற்றங்களையும் அங்கீகரிக்க உங்கள் கைபேசிக்கு அனுப்பப்பட்ட 6-இலக்கக் குறியீட்டை உள்ளிடவும்.',
        authorizeBtn: 'அனைத்து மாற்றங்களையும் அங்கீகரிக்கவும்',
        addressPlaceholder: 'முழு முகவரியை உள்ளிடவும்...',
        phonePlaceholder: '10-இலக்க எண்ணை உள்ளிடவும்...',
        namePlaceholder: 'உறுப்பினர் பெயர்',
        agePlaceholder: 'வயது',
        selectEdit: 'திருத்த வேண்டிய உறுப்பினரைத் தேர்ந்தெடுக்கவும்...',
        selectRemove: 'நீக்க வேண்டிய உறுப்பினரைத் தேர்ந்தெடுக்கவும்...',
        phone: 'கைபேசி எண்',
        add_member: 'குடும்ப உறுப்பினரைச் சேர்க்கவும்',
        remove_member: 'உறுப்பினரை நீக்கவும்',
        edit_member: 'உறுப்பினரைத் திருத்தவும்',
        address: 'முகவரி',
        name: 'குடும்பத் தலைவரின் பெயர்',
        pincode: 'அஞ்சல் குறியீடு',
        district: 'மாவட்டம்',
        card_type: 'அட்டை வகை'
      },
      en: {
        title: '📝 Request Profile Change',
        subtitle: 'Add one or more changes to your queue. You\'ll verify everything with ONE OTP at the end.',
        fieldLabel: 'Field to Change',
        currentLabel: 'Current Value',
        detailLabel: 'Requirement Detail',
        addBtn: '➕ Add to Modification Queue',
        queueTitle: '📂 Active Queue',
        readyTag: 'Ready to Submit',
        previewBtn: 'Preview & Get OTP →',
        finalTitle: '📋 Final Confirmation',
        finalSubtitle: 'Please verify the following modification requests. You will receive ONE OTP to finalize all of them.',
        backBtn: '← Edit List',
        otpBtn: 'Proceed to OTP →',
        verifyTitle: 'Final Verification',
        verifySubtitle: 'Enter the 6-digit code sent to your mobile to authorize all changes at once.',
        authorizeBtn: 'Authorize All Changes',
        addressPlaceholder: 'Enter full address...',
        phonePlaceholder: 'Enter 10-digit mobile...',
        namePlaceholder: 'Member Name',
        agePlaceholder: 'Age',
        selectEdit: 'Select member to edit...',
        selectRemove: 'Select member to remove...',
        phone: 'Mobile Number',
        add_member: 'Add Family Member',
        remove_member: 'Remove Family Member',
        edit_member: 'Edit Family Member',
        address: 'Full Address',
        name: 'Head of Family Name',
        pincode: 'Pincode',
        district: 'District',
        card_type: 'Card Type'
      }
    };
    return translations[lang]?.[k] || k;
  };

  const fields = [
    { type: 'PHONE', label: t('phone'), cur: profile?.mobileNumber },
    { type: 'ADD_MEMBER', label: t('add_member'), cur: lang === 'ta' ? 'சேர்க்கத் தேர்ந்தெடுக்கவும்' : 'Select to add' },
    { type: 'REMOVE_MEMBER', label: t('remove_member'), cur: lang === 'ta' ? 'நீக்கத் தேர்ந்தெடுக்கவும்' : 'Select to remove' },
    { type: 'EDIT_MEMBER', label: t('edit_member'), cur: lang === 'ta' ? 'திருத்தத் தேர்ந்தெடுக்கவும்' : 'Select to edit' },
    { type: 'ADDRESS', label: t('address'), cur: profile?.address },
    { type: 'NAME', label: t('name'), cur: profile?.headOfFamily },
    { type: 'PINCODE', label: t('pincode'), cur: profile?.pincode },
    { type: 'DISTRICT', label: t('district'), cur: profile?.district },
    { type: 'CARD_TYPE', label: t('card_type'), cur: profile?.cardType },
  ];

  const [step, setStep] = useState(1); // 1: Editor, 2: Final Preview, 3: OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [drafts, setDrafts] = useState([]);
  const [request, setRequest] = useState({
    requestType: 'PHONE',
    fieldName: t('phone'),
    newValue: '',
    description: ''
  });


  const validateInput = (req) => {
    if (req.requestType === 'PHONE') {
      const val = req.newValue.trim();
      if (!/^\d{10}$/.test(val)) return 'Error: Mobile number must be exactly 10 digits';
    }
    if (!req.newValue) return 'Please enter new value';
    
    if (req.requestType === 'ADD_MEMBER' || req.requestType === 'EDIT_MEMBER') {
       if (req.newValue.includes('||')) {
          if (!req.newValue.split('||')[1]) return 'Please enter a name';
       } else if (req.newValue.includes('|')) {
          if (!req.newValue.split('|')[0]) return 'Please enter a name';
       } else {
          return 'Enter valid member details';
       }
    }
    return null;
  };

  const handleAddDraft = () => {
    const err = validateInput(request);
    if (err) return setError(err);

    setDrafts([...drafts, { ...request, id: Date.now() }]);
    
    // Reset inputs but keep type if it's MEMBER to speed up adding multiple
    if (request.requestType.includes('MEMBER')) {
        setRequest({ ...request, newValue: '' }); 
    } else {
        setRequest({ requestType: 'PHONE', fieldName: 'Mobile Number', newValue: '', description: '' });
    }
    setError('');
  };

  const handleRemoveDraft = (id) => {
    setDrafts(drafts.filter(d => d.id !== id));
  };

  const handleProceedToReview = () => {
    // AUTO-CAPTURE: If the user filled out the form but forgot to hit "+ Add", do it for them!
    if (request.newValue.trim()) {
      const err = validateInput(request);
      if (!err) {
        const newDraft = { ...request, id: Date.now() };
        const updatedDrafts = [...drafts, newDraft];
        setDrafts(updatedDrafts);
        setRequest({ requestType: 'PHONE', fieldName: 'Mobile Number', newValue: '', description: '' });
        setStep(2);
        return;
      }
    }
    
    if (drafts.length === 0) return setError('Please add at least one change to the queue');
    setStep(2);
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/user/change-request/send-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      const data = await res.json();
      if (data.success) {
        if (data.otp) window.triggerSms?.(data.otp);
        setStep(3);
        setError('');
      } else setError(data.message);
    } catch (e) { setError('Failed to send OTP'); }
    setLoading(false);
  };

  const handleVerifyAndSubmit = async () => {
    const code = otp.join('');
    if (code.length < 6) return;
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const vRes = await fetch(`${API_BASE_URL}/api/user/change-request/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ otp: code })
      });
      const vData = await vRes.json();
      
      if (vData.success) {
        const promises = drafts.map(async (draft) => {
           const curField = fields.find(f => f.type === draft.requestType);
           return fetch(`${API_BASE_URL}/api/user/change-request`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
             body: JSON.stringify({
               requestType: draft.requestType,
               fieldName: draft.fieldName,
               newValue: draft.newValue,
               oldValue: curField?.cur || ''
             })
           });
        });

        await Promise.all(promises);
        window.globalToast?.('Submitted', `Successfully submitted ${drafts.length} profile changes`, 'success');
        onRefresh();
        onClose();
      } else setError(vData.message || 'OTP verification failed');
    } catch (e) { setError('Connection error'); }
    setLoading(false);
  };

  let parsedMembersFull = [];
  let parsedMembers = [];
  try {
    const listStr = (profile?.familyMembersList || '').trim();
    if (listStr.startsWith('[')) {
       try {
         parsedMembersFull = JSON.parse(listStr);
         parsedMembers = parsedMembersFull.map(m => m.name || m.nameEn || 'Unknown');
       } catch(parseErr) {
         parsedMembers = listStr.replace(/[[\]{}"]/g, '').split(',')
            .map(m => m.includes(':') ? m.split(':')[1] : m)
            .map(m => m.trim()).filter(Boolean);
         parsedMembersFull = parsedMembers.map(m => ({ name: m, age: '' }));
       }
    } else if (listStr.length > 0) {
       parsedMembers = listStr.split(',').map(m => m.trim()).filter(Boolean);
       parsedMembersFull = parsedMembers.map(m => ({ name: m, age: '' }));
    }
  } catch(e) { console.error('Member parse error:', e); }

  return (
    <div className="modal-overlay">
      <div className="card glass-card animate-scale-in" style={{ maxWidth: 450, width: '90%', padding: 24, maxHeight: '90vh', overflowY:'auto' }}>
        <div className="flex-between mb-4">
          <h2 style={{ fontSize: 18, margin: 0 }}>{t('title')}</h2>
          <button className="btn-circle btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-danger mb-3 p-2 text-xs">{error}</div>}

        {step === 1 ? (
          <div className="animate-fade-in">
            <p className="text-muted text-xs mb-4">{t('subtitle')}</p>
            
            <div className="form-group mb-3">
              <label className="form-label text-xs">{t('fieldLabel')}</label>
              <select className="form-input" value={request.requestType} onChange={e => {
                const f = fields.find(x => x.type === e.target.value);
                setRequest({ ...request, requestType: e.target.value, fieldName: f.label, newValue: '' });
              }}>
                {fields.map(f => <option key={f.type} value={f.type}>{f.label}</option>)}
              </select>
            </div>
            
            {request.requestType !== 'ADD_MEMBER' && request.requestType !== 'REMOVE_MEMBER' && request.requestType !== 'EDIT_MEMBER' && (
              <div className="form-group mb-3">
                <label className="form-label text-xs">Current Value</label>
                <input className="form-input" disabled value={fields.find(f => f.type === request.requestType)?.cur || ''} style={{ opacity: 0.6 }} />
              </div>
            )}

            <div className="form-group mb-4">
              <label className="form-label text-xs">{t('detailLabel')}</label>
              {request.requestType === 'ADDRESS' ? (
                <textarea className="form-input" placeholder={t('addressPlaceholder')} value={request.newValue} onChange={e => setRequest({ ...request, newValue: e.target.value })} style={{ height: 80 }} />
              ) : request.requestType === 'PHONE' ? (
                <input className="form-input" maxLength={10} placeholder={t('phonePlaceholder')} value={request.newValue} onChange={e => setRequest({ ...request, newValue: e.target.value.replace(/\D/g,'') })} />
              ) : request.requestType === 'ADD_MEMBER' ? (
                <div className="card p-2" style={{ backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid var(--gray-200)' }}>
                   <input className="form-input mb-2" placeholder={t('namePlaceholder')} value={request.newValue.split('|')[0] || ''} onChange={e => {
                     const parts = request.newValue.split('|');
                     setRequest({ ...request, newValue: `${e.target.value}|${parts[1] || ''}` });
                   }} />
                   <input className="form-input" type="number" placeholder={t('agePlaceholder')} value={request.newValue.split('|')[1] || ''} onChange={e => {
                     const parts = request.newValue.split('|');
                     setRequest({ ...request, newValue: `${parts[0] || ''}|${e.target.value}` });
                   }} />
                </div>
              ) : request.requestType === 'EDIT_MEMBER' ? (
                <div className="card p-2" style={{ backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid var(--gray-200)' }}>
                   <select className="form-input mb-2" 
                     value={request.newValue.split('||')[0] || ''}
                     onChange={e => {
                      const selectedName = e.target.value;
                      const selectedObj = parsedMembersFull.find(m => m.name === selectedName) || { name: '', age: '' };
                      setRequest({ ...request, newValue: `${selectedName}||${selectedObj.name}||${selectedObj.age || ''}` });
                   }}>
                      <option value="">{t('selectEdit')}</option>
                      {parsedMembers.map((m,idx) => <option key={idx} value={m}>{m}</option>)}
                   </select>
                   <input className="form-input mb-2" placeholder={t('namePlaceholder')} 
                     value={request.newValue.split('||')[1] !== undefined ? request.newValue.split('||')[1] : ''} 
                     onChange={e => {
                      const parts = request.newValue.split('||');
                      setRequest({ ...request, newValue: `${parts[0]||''}||${e.target.value}||${parts[2]||''}` });
                   }} />
                   <input className="form-input" type="number" placeholder={t('agePlaceholder')} 
                     value={request.newValue.split('||')[2] !== undefined ? request.newValue.split('||')[2] : ''}
                     onChange={e => {
                      const parts = request.newValue.split('||');
                      setRequest({ ...request, newValue: `${parts[0]||''}||${parts[1]||''}||${e.target.value}` });
                   }} />
                </div>
              ) : request.requestType === 'REMOVE_MEMBER' ? (
                <select className="form-input" value={request.newValue} onChange={e => setRequest({ ...request, newValue: e.target.value })}>
                   <option value="">{t('selectRemove')}</option>
                   {parsedMembers.map((m,idx) => (
                     <option key={idx} value={m}>{m}</option>
                   ))}
                </select>
              ) : (
                <input className="form-input" value={request.newValue} onChange={e => setRequest({ ...request, newValue: e.target.value })} />
              )}
            </div>
            
            <button className="btn btn-secondary btn-full btn-sm mb-4" onClick={handleAddDraft} 
               style={{ border: '2px dashed var(--green-mid)', background: 'transparent', color: 'var(--green-dark)' }}>
              {t('addBtn')}
            </button>

            {drafts.length > 0 && (
              <div className="animate-slide-up mt-2 p-3 rounded" style={{ backgroundColor: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                <div className="flex-between mb-2">
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{t('queueTitle')} ({drafts.length})</span>
                  <span className="tag-green" style={{ fontSize: 10 }}>{t('readyTag')}</span>
                </div>
                <div className="flex flex-col gap-2 mb-3" style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {drafts.map((d, i) => (
                    <div key={d.id} className="p-2 bg-white rounded flex-between border border-gray-100">
                      <div style={{ fontSize: 11 }}>
                        <strong style={{ color: 'var(--green)' }}>{d.fieldName}</strong>: {
                          d.requestType === 'EDIT_MEMBER' ? `${d.newValue.split('||')[1]}` :
                          d.requestType === 'ADD_MEMBER' ? `${d.newValue.split('|')[0]}` : d.newValue
                        }
                      </div>
                      <button className="text-red" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }} onClick={() => handleRemoveDraft(d.id)}>🗑️</button>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary btn-full btn-sm" onClick={handleProceedToReview}>
                  {t('previewBtn')}
                </button>
              </div>
            )}
          </div>
        ) : step === 2 ? (
          <div className="animate-fade-in">
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>{t('finalTitle')}</h3>
            <p className="text-muted text-xs mb-4">{t('finalSubtitle')}</p>
            
            <div className="flex flex-col gap-3 mb-5">
              {drafts.map((d, i) => (
                <div key={d.id} className="p-3 bg-white rounded shadow-sm border border-gray-100 flex-between">
                  <div style={{ fontSize: 12 }}>
                    <div className="font-bold mb-1" style={{ color: 'var(--green-dark)' }}>{i+1}. {d.fieldName}</div>
                    <div className="text-muted" style={{ paddingLeft: 8, borderLeft: '2px solid var(--gray-200)' }}>
                      {d.requestType === 'EDIT_MEMBER' ? `Fix: ${d.newValue.split('||')[0]} ➡️ ${d.newValue.split('||')[1]} (Age: ${d.newValue.split('||')[2]})`
                      : d.requestType === 'ADD_MEMBER' ? `New: ${d.newValue.split('|')[0]} (Age: ${d.newValue.split('|')[1]})`
                      : `Update: ${d.newValue}`}
                    </div>
                  </div>
                  <button className="btn-circle btn-sm" style={{ background: '#fef2f2', color: 'var(--red)', border: 'none' }} 
                     onClick={() => {
                       const nextDrafts = drafts.filter((_, idx) => idx !== i);
                       if (nextDrafts.length === 0) setStep(1);
                       setDrafts(nextDrafts);
                     }}>🗑️</button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
               <button className="btn btn-secondary btn-full btn-sm" onClick={() => setStep(1)}>{t('backBtn')}</button>
               <button className="btn btn-primary btn-full btn-sm" onClick={handleSendOtp} disabled={loading}>
                 {loading ? (lang === 'ta' ? 'அனுப்பப்படுகிறது...' : 'Sending OTP...') : t('otpBtn')}
               </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in text-center">
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔢</div>
            <h3 style={{ margin: 0, fontSize: 16 }}>{t('verifyTitle')}</h3>
            <p className="text-muted text-xs mb-4">{t('verifySubtitle')}</p>
            <div className="otp-inputs mb-5">
              {otp.map((d, i) => (
                <input key={i} id={`cr-otp-${i}`} className="otp-input" style={{ width: 34, height: 42 }} maxLength={1} value={d} onChange={e => {
                  const arr = [...otp]; arr[i] = e.target.value; setOtp(arr);
                  if (e.target.value && i < 5) document.getElementById(`cr-otp-${i + 1}`).focus();
                }} />
              ))}
            </div>
            <div className="flex gap-2">
               <button className="btn btn-secondary btn-full btn-sm" onClick={() => setStep(2)}>{lang === 'ta' ? 'பின்செல்ல' : 'Back'}</button>
               <button className="btn btn-primary btn-full btn-sm" onClick={handleVerifyAndSubmit} disabled={loading}>
                 {loading ? (lang === 'ta' ? 'சமர்ப்பிக்கிறது...' : 'Submitting...') : t('authorizeBtn')}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestChangeModal;
