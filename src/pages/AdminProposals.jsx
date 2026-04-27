import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { ClipboardList, Search, Eye, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function AdminProposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchProposals = () => {
    setLoading(true);
    api.get('/api/proposals')
      .then(d => setProposals(d.data || []))
      .catch(() => toast.error('Failed to load proposals'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    const notes = prompt(`Please provide a reason for ${status}:`);
    if (notes === null) return;
    
    setSubmitting(true);
    try {
      await api.put(`/api/proposals/${id}/status`, { status, notes });
      toast.success(`Proposal ${status} successfully`);
      fetchProposals();
      setSelected(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = proposals.filter(p => 
    !search || 
    p.reference_number?.toLowerCase().includes(search.toLowerCase()) || 
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.profiles?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input 
            placeholder="Search proposals by reference, title or company..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchProposals}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Client Proposals</div>
          <div className="card-subtitle">Review and approve certification service proposals</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div className="empty-state-title">No proposals found</div>
              <div className="empty-state-text">Pending proposals from clients will appear here</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ref Number</th>
                  <th>Proposal Title</th>
                  <th>Client</th>
                  <th>Proposed Services</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.reference_number}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.title}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{p.profiles?.company_name || '—'}</div>
                    </td>
                    <td style={{ maxWidth: 250 }}>
                      <span className="truncate" style={{ display: 'block', fontSize: 12 }}>
                        {p.proposed_services}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        p.status === 'approved' ? 'badge-green' : 
                        p.status === 'rejected' ? 'badge-red' : 
                        'badge-yellow'
                      }`}>
                        {p.status || 'pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(p.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelected(p)}>
                        <Eye size={14} />
                      </button>
                      {p.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ color: 'var(--primary)' }}
                            onClick={() => handleStatusUpdate(p.id, 'approved')}
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleStatusUpdate(p.id, 'rejected')}
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <span className="modal-title">Proposal: {selected.reference_number}</span>
              <button className="modal-close" onClick={() => setSelected(null)}><XCircle size={16}/></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{selected.title}</h3>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <label className="form-label">Proposed Services & Scope</label>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {selected.proposed_services}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label className="form-label">Estimated Product Count</label>
                  <div style={{ fontWeight: 600 }}>{selected.estimated_products || 'Not specified'}</div>
                </div>
                <div>
                  <label className="form-label">Submission Date</label>
                  <div>{new Date(selected.created_at).toLocaleString('en-GB')}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Client Notes</label>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {selected.description || 'No additional notes provided'}
                </div>
              </div>

              <div style={{ background: 'var(--primary-light)', padding: 16, borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Client Profile</div>
                <div style={{ fontWeight: 600 }}>{selected.profiles?.company_name}</div>
                <div style={{ fontSize: 13 }}>{selected.profiles?.full_name}</div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>{selected.profiles?.email}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
              {selected.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleStatusUpdate(selected.id, 'rejected')}>Reject Proposal</button>
                  <button className="btn btn-primary" onClick={() => handleStatusUpdate(selected.id, 'approved')}>Approve & Send Draft Invoice</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
