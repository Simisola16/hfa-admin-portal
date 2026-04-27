import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { MapPin, Search, Filter, ExternalLink, RefreshCw } from 'lucide-react';

export default function AdminSites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchSites = () => {
    setLoading(true);
    api.get('/api/sites')
      .then(d => setSites(d.data || []))
      .catch(() => toast.error('Failed to load sites'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const filtered = sites.filter(s => {
    const matchSearch = !search || 
      s.name?.toLowerCase().includes(search.toLowerCase()) || 
      s.profiles?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.city?.toLowerCase().includes(search.toLowerCase()) ||
      s.postcode?.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || s.site_type === filterType;
    return matchSearch && matchType;
  });

  const siteTypes = [...new Set(sites.map(s => s.site_type).filter(Boolean))];

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input 
            placeholder="Search by site name, company, or location..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <select 
          className="form-control" 
          style={{ width: 'auto' }} 
          value={filterType} 
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Site Types</option>
          {siteTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={fetchSites}>
          <RefreshCw size={14} />
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Showing {filtered.length} of {sites.length} total sites
        </span>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">All Registered Sites</div>
          <div className="card-subtitle">Global view of all client business locations</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <MapPin size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div className="empty-state-title">No sites found</div>
              <div className="empty-state-text">No business locations matching your criteria</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Site Name</th>
                  <th>Client / Company</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Postcode</th>
                  <th>Contact Person</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(site => (
                  <tr key={site.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{site.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {site.id.slice(0,8)}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{site.profiles?.company_name || '—'}</div>
                    </td>
                    <td>
                      <span className="badge badge-gray">{site.site_type || 'General'}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{site.city}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{site.country}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{site.postcode}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{site.contact_name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{site.contact_email}</div>
                    </td>
                    <td>
                      <span className={`badge ${site.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                        {site.status || 'active'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" title="View Details">
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
