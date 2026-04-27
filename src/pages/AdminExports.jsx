import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Ship, Search, Eye, CheckCircle, XCircle, RefreshCw, Download, Filter } from 'lucide-react';

export default function AdminExports() {
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchExports = () => {
    setLoading(true);
    api.get('/api/exports')
      .then(d => setExports(d.data || []))
      .catch(() => toast.error('Failed to load export requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExports();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    const notes = prompt(`Please provide a reason for ${status}:`);
    if (notes === null) return;
    
    setSubmitting(true);
    try {
      await api.put(`/api/exports/${id}/status`, { status, notes });
      toast.success(`Export request ${status} successfully`);
      fetchExports();
      setSelected(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = exports.filter(e => {
    const matchSearch = !search || 
      e.reference_number?.toLowerCase().includes(search.toLowerCase()) || 
      e.destination_country?.toLowerCase().includes(search.toLowerCase()) ||
      e.profiles?.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input 
            placeholder="Search exports by ref, destination or company..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <select 
          className="form-control" 
          style={{ width: 'auto' }} 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="shipped">Shipped</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={fetchExports}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Export Certificate Requests</div>
          <div className="card-subtitle">Manage international halal export documentation</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Ship size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div className="empty-state-title">No export requests found</div>
              <div className="empty-state-text">New requests from clients will appear here</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ref Number</th>
                  <th>Client</th>
                  <th>Destination</th>
                  <th>Shipment Date</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{e.reference_number}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.profiles?.company_name || '—'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.destination_country}</div>
                    </td>
                    <td>
                      {e.shipment_date ? new Date(e.shipment_date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td>
                      <span className={`badge ${
                        e.status === 'approved' ? 'badge-green' : 
                        e.status === 'rejected' ? 'badge-red' : 
                        e.status === 'shipped' ? 'badge-blue' : 
                        'badge-yellow'
                      }`}>
                        {e.status || 'pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(e.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelected(e)}>
                        <Eye size={14} />
                      </button>
                      {e.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ color: 'var(--primary)' }}
                            onClick={() => handleStatusUpdate(e.id, 'approved')}
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleStatusUpdate(e.id, 'rejected')}
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                      {e.status === 'approved' && (
                        <button className="btn btn-outline btn-sm">
                          <Download size={13} /> Cert
                        </button>
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
        <div className="modal-overlay" onClick={ev => ev.target === ev.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">Export Request: {selected.reference_number}</span>
              <button className="modal-close" onClick={() => setSelected(null)}><XCircle size={16}/></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
                <div>
                  <label className="form-label">Destination Country</label>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{selected.destination_country}</div>
                </div>
                <div>
                  <label className="form-label">Target Shipment Date</label>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {selected.shipment_date ? new Date(selected.shipment_date).toLocaleDateString('en-GB') : 'Flexible'}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Consignee Details</label>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{selected.consignee_name || 'N/A'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {selected.consignee_address || 'No address provided'}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Products to be Exported</label>
                <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, maxHeight: 150, overflowY: 'auto' }}>
                  {selected.products || 'No product list provided'}
                </div>
              </div>

              {selected.notes && (
                <div className="form-group">
                  <label className="form-label">Additional Client Notes</label>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.notes}</div>
                </div>
              )}

              <div style={{ background: 'var(--primary-light)', padding: 16, borderRadius: 12, marginTop: 24 }}>
                <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Exporter (Client)</div>
                <div style={{ fontWeight: 600 }}>{selected.profiles?.company_name}</div>
                <div style={{ fontSize: 13 }}>{selected.profiles?.full_name}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
              {selected.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleStatusUpdate(selected.id, 'rejected')}>Reject</button>
                  <button className="btn btn-primary" onClick={() => handleStatusUpdate(selected.id, 'approved')}>Approve & Issue Certificate</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
