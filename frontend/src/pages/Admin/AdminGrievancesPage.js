import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { T } from '../../i18n/translations';
import { cachedFetch } from '../../utils/apiCache';

const AdminGrievancesPage = () => {
  const { lang } = useApp();
  const t = (k) => T[lang][k]||k;
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadGrievances = async () => {
    setLoading(true);
    try {
      const res = await cachedFetch(`${API_BASE_URL}/api/user/grievances/admin/all`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      // Handle both: plain array OR {success: true, data: [...]} wrapper
      if (Array.isArray(data)) {
        setGrievances(data);
      } else if (data.success && Array.isArray(data.data)) {
        setGrievances(data.data);
      } else {
        setGrievances([]);
      }
    } catch (err) {
      console.error('Grievances load error:', err);
      setGrievances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGrievances(); }, []);

  const filtered = useMemo(() => {
    return (grievances || []).filter(g => 
      (g.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.user?.rationCardNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [grievances, searchTerm]);

  return (
    <div className="page animate-slide-up">
      <div className="page-header">
        <h1>⚖️ {lang === 'ta' ? 'அனைத்து புகார்கள்' : 'All Grievances'}</h1>
        <div className="search-box">
          <input 
            className="form-input" 
            placeholder={t('search')}
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner" style={{margin:'40px auto'}} />
        ) : filtered.length === 0 ? (
          <div style={{textAlign:'center', padding:40, color:'var(--gray-500)'}}>No grievances found.</div>
        ) : (
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>{lang === 'ta' ? 'தேதி' : 'Date'}</th>
                  <th>{lang === 'ta' ? 'பயனர்' : 'User'}</th>
                  <th>{lang === 'ta' ? 'வகை' : 'Category'}</th>
                  <th>{lang === 'ta' ? 'தலைப்பு' : 'Title'}</th>
                  <th>{lang === 'ta' ? 'நிலை' : 'Status'}</th>
                  <th>{lang === 'ta' ? 'விவரம்' : 'Description'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => (
                  <tr key={g.id}>
                    <td data-label="Date">{new Date(g.createdAt).toLocaleDateString()}</td>
                    <td data-label="User">
                      <div style={{fontWeight:700}}>{g.user?.name}</div>
                      <div style={{fontSize:11, color:'var(--gray-400)'}}>{g.user?.rationCardNumber}</div>
                    </td>
                    <td data-label="Category">
                      <span className="tag tag-blue" style={{fontSize:10}}>{g.category}</span>
                    </td>
                    <td data-label="Title" style={{fontWeight:600}}>{g.title}</td>
                    <td data-label="Status">
                      <span className={`tag ${g.status === 'RESOLVED' ? 'tag-green' : 'tag-amber'}`}>
                        {g.status}
                      </span>
                    </td>
                    <td data-label="Description" style={{maxWidth:250, fontSize:12}}>{g.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGrievancesPage;
