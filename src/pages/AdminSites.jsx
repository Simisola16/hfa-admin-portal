import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { MapPin, Search, ExternalLink, RefreshCw, X, Building2, Phone, Mail, Globe, User, ShieldCheck } from 'lucide-react';

export default function AdminSites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedSite, setSelectedSite] = useState(null);

  const fetchSites = () => {
    setLoading(true);
    api.get('/api/sites')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        setSites(list);
      })
      .catch(() => toast.error('Failed to load sites'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const getSiteCompany = (site) => {
    if (!site) return '—';
    if (site.client_id && typeof site.client_id === 'object') {
      if (site.client_id.company_name) return site.client_id.company_name;
      if (site.client_id.full_name) return site.client_id.full_name;
    }
    if (site.profiles?.company_name && site.profiles.company_name !== '—') {
      return site.profiles.company_name;
    }
    if (site.est_name) return site.est_name;
    if (site.trading_name) return site.trading_name;
    if (site.profiles?.full_name) return site.profiles.full_name;
    return '—';
  };

  const getSiteClientEmail = (site) => {
    if (!site) return '';
    if (site.client_id && typeof site.client_id === 'object' && site.client_id.email) {
      return site.client_id.email;
    }
    if (site.profiles?.email) return site.profiles.email;
    return '';
  };

  const filtered = sites.filter(s => {
    const comp = getSiteCompany(s).toLowerCase();
    const email = getSiteClientEmail(s).toLowerCase();
    const q = search.toLowerCase();
    const matchSearch = !search || 
      s.name?.toLowerCase().includes(q) || 
      comp.includes(q) ||
      email.includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.postcode?.toLowerCase().includes(q) ||
      s.address_1?.toLowerCase().includes(q);
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
            placeholder="Search by site name, company, client email, or location..." 
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
        <button className="btn btn-ghost btn-sm" onClick={fetchSites} title="Refresh Sites">
          <RefreshCw size={14} />
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Showing {filtered.length} of {sites.length} total sites
        </span>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">All Registered Sites</div>
          <div className="card-subtitle">Global view of all client business locations and production sites</div>
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(site => {
                  const sId = (site._id || site.id || '').toString();
                  const compName = getSiteCompany(site);
                  const clientEmail = getSiteClientEmail(site);

                  return (
                    <tr key={sId || Math.random()}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{site.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          ID: {sId ? sId.slice(-8).toUpperCase() : '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{compName}</div>
                        {clientEmail && (
                          <div style={{ fontSize: 11, color: '#64748b' }}>{clientEmail}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-gray">{site.site_type || 'Manufacturing / Facility'}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{site.city || site.state || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{site.country || ''}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{site.postcode || '—'}</td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{site.contact_name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {site.contact_phone_number || site.contact_email || site.email || ''}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${site.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                          {site.status || 'active'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          title="View Site Details"
                          onClick={() => setSelectedSite(site)}
                        >
                          <ExternalLink size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Site Details Modal */}
      {selectedSite && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setSelectedSite(null)}>
          <div className="modal" style={{ maxWidth: 640, borderRadius: 14 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '18px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Building2 size={22} style={{ color: '#047857' }} />
                <div>
                  <div className="modal-title" style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    {selectedSite.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {getSiteCompany(selectedSite)}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedSite(null)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: 24 }}>
              {/* Company Info Box */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Assigned Client / Organization
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  {getSiteCompany(selectedSite)}
                </div>
                {getSiteClientEmail(selectedSite) && (
                  <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3 }}>
                    Email: <span style={{ fontWeight: 600 }}>{getSiteClientEmail(selectedSite)}</span>
                  </div>
                )}
                {selectedSite.client_code && (
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    Client Code: <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{selectedSite.client_code}</span>
                  </div>
                )}
              </div>

              {/* Grid of Site Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                    Address Line 1
                  </label>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                    {selectedSite.address_1 || '—'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                    Address Line 2
                  </label>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                    {selectedSite.address_2 || '—'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                    City & State
                  </label>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                    {[selectedSite.city, selectedSite.state].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                    Postal Code & Country
                  </label>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                    {[selectedSite.postcode, selectedSite.country].filter(Boolean).join(' • ') || '—'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                    Contact Person
                  </label>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                    {selectedSite.contact_name || '—'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                    Contact Phone / Email
                  </label>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                    {selectedSite.contact_phone_number || selectedSite.contact_email || selectedSite.email || '—'}
                  </div>
                </div>

                {selectedSite.reg_number && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Company Reg Number
                    </label>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                      {selectedSite.reg_number}
                    </div>
                  </div>
                )}

                {selectedSite.vat_number && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                      VAT Number
                    </label>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                      {selectedSite.vat_number}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelectedSite(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
