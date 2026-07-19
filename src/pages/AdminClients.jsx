import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Search, Eye, Users, Shield, Briefcase, Award, FileText, Trash2, X, AlertCircle } from 'lucide-react';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'company';

  // Suspension Modal State
  const [suspensionModal, setSuspensionModal] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  const fetchClients = () => {
    setLoading(true);
    api.get('/api/users')
      .then(d => setClients((d.data || []).filter(u => u.role === 'client')))
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    fetchClients(); 
  }, []);

  const filtered = clients.filter(c => {
    const isActive = c.is_active !== false;
    const isSuspended = !!c.suspension_reason;
    
    // 1. Category Filtering
    if (category === 'bin') {
      // Suspended companies
      if (!isSuspended && isActive) return false;
    } else {
      if (isSuspended) return false;
      if (category === 'review') {
        // New signups: 0 applications
        if (c.appCount > 0) return false;
      } else if (category === 'processing') {
        // Processing: Has applications, but no active certificate yet
        if (c.appCount === 0 || (c.certCount || 0) > 0) return false;
      } else if (category === 'company') {
        // Certified: Has at least one active certificate
        if ((c.certCount || 0) === 0) return false;
      }
    }

    // 2. Search Filtering
    if (!search) return true;
    const s = search.toLowerCase();
    return c.full_name?.toLowerCase().includes(s) || 
           c.company_name?.toLowerCase().includes(s) || 
           c.email?.toLowerCase().includes(s);
  });

  const handleStatusChange = async (id, isActivating) => {
    try {
      if (!isActivating && !suspensionReason.trim()) {
        return toast.error('Please provide a reason for suspension');
      }

      await api.put(`/api/users/${id}/status`, { 
        is_active: isActivating,
        suspension_reason: isActivating ? null : suspensionReason 
      });

      toast.success(isActivating ? 'Account activated' : 'Account suspended');
      setSuspensionModal(null);
      setSuspensionReason('');
      fetchClients();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getTitle = () => {
    if (category === 'review') return 'Review Companies (New Signups)';
    if (category === 'processing') return 'Processing List (Pending Applications)';
    if (category === 'bin') return 'Bin List (Suspended Companies)';
    return 'Company List (Certified Clients)';
  };

  const getIcon = () => {
    if (category === 'review') return <Shield size={20} />;
    if (category === 'processing') return <Briefcase size={20} />;
    if (category === 'bin') return <Trash2 size={20} />;
    return <Award size={20} />;
  };

  return (
    <div className="animate-in">
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <span className="badge badge-gray" style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>
            {filtered.length} {
              category === 'company' ? 'Certified Companies' :
              category === 'bin' ? 'Suspended Companies' :
              category === 'review' ? 'New Signups' :
              category === 'processing' ? 'Processing Companies' : 'Companies'
            }
          </span>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', background: '#fff' }}>
          <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: 10, borderRadius: 12, display: 'flex' }}>{getIcon()}</div>
          <div>
            <div className="card-title" style={{ fontSize: 18, fontWeight: 700 }}>{getTitle()}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Manage your corporate clients and their status</div>
          </div>
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <div className="empty-state-icon" style={{ background: '#f8fafc', color: '#cbd5e1', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Users size={32} /></div>
                <div className="empty-state-title" style={{ fontSize: 16, fontWeight: 700 }}>No clients found</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Try searching or checking a different category</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Company / Email</th>
                    <th>Primary Contact</th>
                    <th>Activity Stats</th>
                    <th>Joined Date</th>
                    <th>Current Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c._id} className="hover-row">
                      <td>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{c.company_name || c.full_name || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>{c.email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{c.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone || '—'}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span title="Total Applications" style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: 6 }}>
                            <FileText size={12} /> {c.appCount || 0}
                          </span>
                          <span title="Active Certificates" style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, background: '#f0fdf4', padding: '4px 8px', borderRadius: 6, color: '#166534' }}>
                            <Award size={12} /> {c.certCount || 0}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>
                        {c.suspension_reason ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span className="badge badge-red" style={{ alignSelf: 'flex-start' }}>Suspended</span>
                            <span style={{ fontSize: 10, color: '#ef4444', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.suspension_reason}>Reason: {c.suspension_reason}</span>
                          </div>
                        ) : (
                          <span className={`badge ${c.is_active !== false ? 'badge-green' : 'badge-yellow'}`}>
                            {c.is_active !== false ? 'Active' : 'Pending Verification'}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          {(c.suspension_reason || c.is_active === false || category === 'review') && (
                            <button 
                              className="btn btn-primary btn-sm" 
                              style={{ 
                                background: (c.is_active !== false && category === 'review') ? '#94a3b8' : '#10b981', 
                                borderColor: (c.is_active !== false && category === 'review') ? '#94a3b8' : '#10b981', 
                                fontWeight: 600,
                                opacity: (c.is_active !== false && category === 'review') ? 0.6 : 1,
                                cursor: (c.is_active !== false && category === 'review') ? 'default' : 'pointer'
                              }}
                              onClick={() => {
                                if (c.is_active === false || c.suspension_reason) {
                                  handleStatusChange(c._id, true);
                                }
                              }}
                              disabled={c.is_active !== false && category === 'review' && !c.suspension_reason}
                            >
                              {c.is_active !== false && !c.suspension_reason ? 'Already Active' : 'Activate'}
                            </button>
                          )}
                          {!c.suspension_reason && (
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ color: '#ef4444', fontWeight: 600, border: '1px solid #fee2e2' }}
                              onClick={() => setSuspensionModal(c)}
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      {/* Suspension Reason Modal */}
      {suspensionModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#fee2e2', color: '#ef4444', padding: 8, borderRadius: 10 }}><AlertCircle size={20} /></div>
                <div className="modal-title">Suspend Company</div>
              </div>
              <button className="modal-close" onClick={() => { setSuspensionModal(null); setSuspensionReason(''); }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{suspensionModal.company_name || suspensionModal.full_name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{suspensionModal.email}</div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Reason for Suspension</label>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  placeholder="e.g. Failure to comply with Halal standards, missing documentation, or unpaid fees..."
                  value={suspensionReason}
                  onChange={e => setSuspensionReason(e.target.value)}
                  style={{ resize: 'none', fontSize: 14 }}
                ></textarea>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>This reason will be recorded in the system and visible to other administrators.</p>
              </div>
            </div>
            <div className="modal-footer" style={{ background: '#f8fafc' }}>
              <button className="btn btn-ghost" onClick={() => { setSuspensionModal(null); setSuspensionReason(''); }}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => handleStatusChange(suspensionModal._id, false)}
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
