import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Search, Eye, Users, Shield, Briefcase, Award, FileText } from 'lucide-react';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'company';

  useEffect(() => { 
    setLoading(true);
    api.get('/api/users')
      .then(d => setClients((d.data || []).filter(u => u.role === 'client')))
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false)); 
  }, []);

  const filtered = clients.filter(c => {
    // 1. Category Filtering
    if (category === 'review') {
      if (c.is_active !== false) return false;
    } else if (category === 'processing') {
      if (c.is_active === false || c.certCount > 0) return false;
    } else if (category === 'company') {
      if (c.is_active === false || c.certCount === 0) return false;
    }

    // 2. Search Filtering
    if (!search) return true;
    const s = search.toLowerCase();
    return c.full_name?.toLowerCase().includes(s) || 
           c.company_name?.toLowerCase().includes(s) || 
           c.email?.toLowerCase().includes(s);
  });

  const toggleStatus = async (id, current) => {
    try { 
      await api.put(`/api/users/${id}/status`, { is_active: !current }); 
      toast.success(current ? 'Account suspended' : 'Account activated'); 
      setClients(cs => cs.map(c => c.id === id ? { ...c, is_active: !current } : c)); 
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getTitle = () => {
    if (category === 'review') return 'Review Companies (Pending Activation)';
    if (category === 'processing') return 'Processing List (Active Applicants)';
    return 'Company List (Certified Clients)';
  };

  const getIcon = () => {
    if (category === 'review') return <Shield size={20} />;
    if (category === 'processing') return <Briefcase size={20} />;
    return <Award size={20} />;
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <span className="badge badge-gray">{filtered.length} {category}s</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: 'var(--primary)' }}>{getIcon()}</div>
          <div className="card-title">{getTitle()}</div>
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Users /></div>
                <div className="empty-state-title">No clients found in this category</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Try searching or checking a different list</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Stats</th>
                    <th>Registered</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#111827' }}>{c.company_name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{c.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone || '—'}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span title="Applications" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                            <FileText size={10} /> {c.appCount || 0}
                          </span>
                          <span title="Certificates" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, background: '#f0fdf4', padding: '2px 6px', borderRadius: 4, color: '#166534' }}>
                            <Award size={10} /> {c.certCount || 0}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString('en-GB')}</td>
                      <td>
                        <span className={`badge ${c.is_active !== false ? 'badge-green' : 'badge-red'}`}>
                          {c.is_active !== false ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={`btn ${c.is_active !== false ? 'btn-ghost' : 'btn-primary'} btn-sm`} 
                          onClick={() => toggleStatus(c.id, c.is_active !== false)}
                        >
                          {c.is_active !== false ? 'Suspend' : 'Activate Account'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>
    </div>
  );
}
