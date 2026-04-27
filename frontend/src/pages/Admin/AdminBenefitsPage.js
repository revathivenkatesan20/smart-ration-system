import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { cachedFetch } from '../../utils/apiCache';

const AdminBenefitsPage = () => {
  const { lang } = useApp();
  const t = (k) => T[lang][k]||k;
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nameEn: '', nameTa: '',
    descriptionEn: '', descriptionTa: '',
    price: 0, items: '', isActive: true
  });

  useEffect(() => {
    fetchBenefits();
  }, []);

  const fetchBenefits = async () => {
    setLoading(true);
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/admin/benefits`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setBenefits(data.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleToggle = async (id) => {
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/admin/benefits/${id}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) fetchBenefits();
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/admin/benefits`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchBenefits();
        window.globalToast?.('Success', 'Benefit saved successfully', 'success');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="page animate-fade-in">
      <div className="page-header flex-between">
        <div>
          <h1>🎁 {t('specialBenefitsMgmt')}</h1>
          <p className="text-muted">{t('benefitsDescription')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormData({ nameEn: '', nameTa: '', descriptionEn: '', descriptionTa: '', price: 0, items: '', isActive: true });
          setShowModal(true);
        }}>
          ➕ {t('addNewBenefit')}
        </button>
      </div>

      <div className="grid-3 gap-6">
        {benefits.map(b => (
          <div key={b.id} className={`card glass-card hover-up transition-all ${!b.isActive ? 'opacity-60 grayscale' : 'border-l-4 border-green'}`}>
            <div className="flex-between mb-4">
              <span className="text-2xl">📦</span>
              <div className={`tag ${b.isActive ? 'tag-green' : 'tag-gray'}`}>
                {b.isActive ? t('open').toUpperCase() : t('closed').toUpperCase()}
              </div>
            </div>
            <h3 className="mb-1">{lang === 'ta' && b.nameTa ? b.nameTa : b.nameEn}</h3>
            <p className="text-xs text-muted mb-4">{lang === 'ta' && b.descriptionTa ? b.descriptionTa : b.descriptionEn}</p>
            
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
               <div className="text-xs font-bold text-muted uppercase mb-1">{t('includes')}</div>
               <div className="text-sm font-medium">{b.items || t('catGeneral')}</div>
            </div>

            <div className="flex-between border-t pt-4">
               <div className="font-black text-xl text-green">₹{b.price}</div>
               <button 
                 className={`btn btn-sm ${b.isActive ? 'btn-secondary' : 'btn-primary'}`}
                 onClick={() => handleToggle(b.id)}
               >
                 {b.isActive ? t('deactivate') : t('activate')}
               </button>
            </div>
          </div>
        ))}
        {benefits.length === 0 && !loading && (
          <div className="col-span-3 text-center py-20 text-muted italic card glass-card">
            {t('noSuggestions')}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="card glass-card animate-scale-in" style={{maxWidth: 500, width: '90%'}}>
            <h2 className="mb-6">🛠️ {t('createBenefit')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid-2 gap-4">
                <div className="form-group">
                  <label>{t('nameEn')}</label>
                  <input className="form-input" required value={formData.nameEn} 
                    onChange={e => setFormData({...formData, nameEn: e.target.value})} placeholder="e.g. Pongal Gift Hamper" />
                </div>
                <div className="form-group">
                  <label>{t('nameTa')}</label>
                  <input className="form-input" value={formData.nameTa} 
                    onChange={e => setFormData({...formData, nameTa: e.target.value})} />
                </div>
              </div>
              
              <div className="form-group mt-4">
                <label>{t('grievanceDesc')} (EN)</label>
                <textarea className="form-input" style={{height: 60}} value={formData.descriptionEn} 
                  onChange={e => setFormData({...formData, descriptionEn: e.target.value})} />
              </div>

              <div className="form-group mt-4">
                <label>{t('includes')} (Pulse, Rice, etc.)</label>
                <input className="form-input" value={formData.items} 
                  onChange={e => setFormData({...formData, items: e.target.value})} />
              </div>

              <div className="form-group mt-4">
                <label>{t('benefitPrice')} (₹)</label>
                <input type="number" className="form-input" value={formData.price} 
                  onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>

              <div className="flex gap-4 mt-8">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                  {loading ? t('save')+'...' : '🚀 ' + t('launchScheme')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBenefitsPage;
