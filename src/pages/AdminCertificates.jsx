import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Award, Search, Plus, X, Download, Calendar, CheckCircle, AlertCircle, FileText } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AdminCertificates() {
  const [certs, setCerts] = useState([]);
  const [survRequests, setSurvRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('certs'); // 'certs' | 'surveillance'
  const [showModal, setShowModal] = useState(false);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fulfillSubmitting, setFulfillSubmitting] = useState(false);
  const [apps, setApps] = useState([]);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const statusParam = searchParams.get('status') || searchParams.get('filter');
    if (statusParam) {
      setFilterStatus(statusParam);
    }
  }, [searchParams]);
  
  const [form, setForm] = useState({ 
    client_id: '', 
    application_id: '', 
    certificate_type: 'Annual Halal Certificate', 
    issue_date: '', 
    expiry_date: '', 
    products_covered: '' 
  });

  const [fulfillForm, setFulfillForm] = useState({
    file: null,
    notes: ''
  });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [certsRes, appsRes, survRes] = await Promise.all([
        api.get('/api/certificates'),
        api.get('/api/applications'),
        api.get('/api/surveillance').catch(() => ({ data: { data: [] } }))
      ]);
      setCerts(certsRes.data || []);
      setApps(appsRes.data?.filter(a => a.status === 'approved' || a.status === 'certificate_issued') || []);
      setSurvRequests(survRes.data?.data || survRes.data || []);
    } catch (err) {
      toast.error('Failed to load certificates & requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setSubmitting(true);
    const app = apps.find(a => a.id === form.application_id || a._id === form.application_id);
    const clientId = app?.client_id || app?.profiles?._id || app?.profiles?.id;
    const payload = { ...form, client_id: clientId };
    try { 
      await api.post('/api/certificates', payload); 
      toast.success('Certificate issued & email sent!'); 
      setShowModal(false); 
      fetchAllData(); 
    } catch (err) {
      toast.error(err.message || 'Failed to issue certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFulfillSubmit = async (e) => {
    e.preventDefault();
    if (!fulfillForm.file) {
      toast.error('Please upload the surveillance letter PDF.');
      return;
    }
    setFulfillSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('letter_file', fulfillForm.file);
      if (fulfillForm.notes) {
        formData.append('notes', fulfillForm.notes);
      }
      
      const reqId = selectedRequest._id || selectedRequest.id;
      await api.put(`/api/surveillance/${reqId}/fulfill`, formData, true);
      
      toast.success('Surveillance letter uploaded and request fulfilled!');
      setShowFulfillModal(false);
      setFulfillForm({ file: null, notes: '' });
      fetchAllData();
    } catch (err) {
      toast.error(err.message || 'Failed to fulfill request.');
    } finally {
      setFulfillSubmitting(false);
    }
  };

  const handleRevoke = async (id) => {
    const reason = prompt('Reason for revocation:');
    if (!reason) return;
    try { 
      await api.put(`/api/certificates/${id}/revoke`, { reason }); 
      toast.success('Certificate revoked'); 
      fetchAllData(); 
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredCerts = certs.filter(c => {
    const now = new Date();
    if (filterStatus === 'expired') {
      const isExpired = c.status === 'expired' || (c.expiry_date && new Date(c.expiry_date) < now);
      if (!isExpired) return false;
    } else if (filterStatus === 'active') {
      const isActive = c.status === 'active' && (!c.expiry_date || new Date(c.expiry_date) >= now);
      if (!isActive) return false;
    } else if (filterStatus === 'pending') {
      if (c.status !== 'pending') return false;
    }

    return (
      !search || 
      c.certificate_number?.toLowerCase().includes(search.toLowerCase()) || 
      c.profiles?.company_name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const filteredSurv = survRequests.filter(r => 
    !search || 
    r.certificate_id?.certificate_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.certificate_id?.profiles?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Page Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          type="button"
          style={{ padding: '12px 24px', border: 'none', background: 'none', borderBottom: activeTab === 'certs' ? '2.5px solid var(--primary)' : 'none', color: activeTab === 'certs' ? 'var(--primary)' : '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
          onClick={() => setActiveTab('certs')}
        >
          🏆 Issued Certificates
        </button>
        <button
          type="button"
          style={{ padding: '12px 24px', border: 'none', background: 'none', borderBottom: activeTab === 'surveillance' ? '2.5px solid var(--primary)' : 'none', color: activeTab === 'surveillance' ? 'var(--primary)' : '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
          onClick={() => setActiveTab('surveillance')}
        >
          🗓️ Surveillance Requests
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input 
            placeholder={activeTab === 'certs' ? "Search certificates..." : "Search surveillance..."} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        {activeTab === 'certs' && (
          <select
            className="form-control"
            style={{ width: 'auto', marginLeft: 8 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
        )}
        {activeTab === 'certs' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginLeft: 'auto' }}>
            <Plus size={15} /> Issue Certificate
          </button>
        )}
      </div>

      {activeTab === 'certs' ? (
        <div className="card">
          <div className="card-header">
            <div className="card-title">All Certificates ({filteredCerts.length})</div>
          </div>
          <div className="table-wrap">
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
              filteredCerts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Award /></div>
                  <div className="empty-state-title">No Certificates</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Certificate No.</th>
                      <th>Client</th>
                      <th>Type</th>
                      <th>Issue Date</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCerts.map(c => (
                      <tr key={c.id || c._id}>
                        <td style={{ fontWeight: 700 }}>{c.certificate_number}</td>
                        <td>{c.profiles?.company_name || c.profiles?.full_name || '—'}</td>
                        <td>{c.certificate_type}</td>
                        <td style={{ fontSize: 12 }}>{c.issue_date ? new Date(c.issue_date).toLocaleDateString('en-GB') : '—'}</td>
                        <td style={{ fontSize: 12 }}>{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-GB') : '—'}</td>
                        <td>
                          <span className={`badge ${c.status === 'active' ? 'badge-green' : c.status === 'revoked' ? 'badge-red' : 'badge-gray'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          {c.status === 'active' && (
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ color: 'var(--danger)', fontSize: 12 }} 
                              onClick={() => handleRevoke(c.id || c._id)}
                            >
                              Revoke
                            </button>
                          )}
                          {c.certificate_url && (
                            <a href={getPdfUrl(c.certificate_url)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" onClick={e => e.stopPropagation()}>
                              <Download size={13} />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Surveillance Visit Requests ({filteredSurv.length})</div>
          </div>
          <div className="table-wrap">
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
              filteredSurv.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Calendar /></div>
                  <div className="empty-state-title">No Surveillance Requests</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Certificate No.</th>
                      <th>Client</th>
                      <th>Requested Date</th>
                      <th>Fulfillment Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSurv.map(r => (
                      <tr key={r.id || r._id}>
                        <td style={{ fontWeight: 700 }}>{r.certificate_id?.certificate_number || '—'}</td>
                        <td>{r.certificate_id?.profiles?.company_name || '—'}</td>
                        <td style={{ fontSize: 12 }}>{r.requested_at ? new Date(r.requested_at).toLocaleDateString('en-GB') : '—'}</td>
                        <td style={{ fontSize: 12 }}>{r.fulfilled_at ? new Date(r.fulfilled_at).toLocaleDateString('en-GB') : '—'}</td>
                        <td>
                          <span className={`badge ${r.status === 'fulfilled' ? 'badge-green' : 'badge-orange'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          {r.status === 'requested' ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setSelectedRequest(r);
                                setShowFulfillModal(true);
                              }}
                            >
                              Fulfill Request
                            </button>
                          ) : (
                            r.letter_file_url && (
                              <a href={getPdfUrl(r.letter_file_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                                <Download size={13} style={{ marginRight: 4 }} /> Letter
                              </a>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Issue New Certificate</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Linked Application</label>
                  <select className="form-control" value={form.application_id} onChange={e => setForm(f => ({ ...f, application_id: e.target.value }))} required>
                    <option value="">Select Application</option>
                    {apps.map(a => <option key={a.id || a._id} value={a.id || a._id}>{a.application_number} – {a.profiles?.company_name || a.establishment_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Certificate Type <span>*</span></label>
                  <select className="form-control" value={form.certificate_type} onChange={e => setForm(f => ({ ...f, certificate_type: e.target.value }))}>
                    {['Annual Halal Certificate','Abattoir Certificate','Restaurant Certificate','Retail Certificate','Export Certificate','Product Certificate'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Issue Date <span>*</span></label>
                    <input type="date" className="form-control" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Date <span>*</span></label>
                    <input type="date" className="form-control" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Products Covered</label>
                  <textarea className="form-control" value={form.products_covered} onChange={e => setForm(f => ({ ...f, products_covered: e.target.value }))} placeholder="List the products covered by this certificate..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Issue Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fulfill Surveillance Modal */}
      {showFulfillModal && selectedRequest && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowFulfillModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <span className="modal-title">Fulfill Surveillance Letter</span>
              <button className="modal-close" onClick={() => setShowFulfillModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleFulfillSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                  Upload the annual surveillance approval letter for certificate <strong>#{selectedRequest.certificate_id?.certificate_number}</strong>. This will notify the client and show as completed.
                </p>

                <div className="form-group">
                  <label className="form-label">Surveillance Letter (PDF) <span>*</span></label>
                  <div
                    onClick={() => document.getElementById('surv-letter-file').click()}
                    style={{
                      border: '2px dashed #e2e8f0', padding: '32px 24px', borderRadius: '12px',
                      textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                      background: fulfillForm.file ? '#f0fdf4' : '#fff'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <FileText size={40} style={{ color: fulfillForm.file ? '#22c55e' : '#94a3b8', marginBottom: 12, margin: '0 auto' }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                      {fulfillForm.file ? fulfillForm.file.name : 'Click to select surveillance letter PDF'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Only PDF allowed</div>
                    <input
                      id="surv-letter-file"
                      type="file"
                      hidden
                      accept=".pdf"
                      onChange={e => setFulfillForm(f => ({ ...f, file: e.target.files[0] }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Fulfillment Notes</label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    value={fulfillForm.notes} 
                    onChange={e => setFulfillForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Enter any notes or comments for the client..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowFulfillModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={fulfillSubmitting || !fulfillForm.file}>
                  {fulfillSubmitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Fulfill Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
