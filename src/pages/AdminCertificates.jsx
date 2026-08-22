import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Award, Search, Plus, X, Download, Calendar, CheckCircle, AlertCircle, FileText, ShieldCheck, Edit3 } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AdminCertificates({ defaultTab }) {
  const navigate = useNavigate();
  const [certs, setCerts] = useState([]);
  const [survRequests, setSurvRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab || 'certs'); // 'review' | 'certs' | 'surveillance'
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
    if (statusParam === 'under_review' || statusParam === 'review') {
      setActiveTab('review');
      setFilterStatus('under_review');
    } else if (statusParam) {
      setFilterStatus(statusParam);
    }
  }, [searchParams]);
  
  const [form, setForm] = useState({ 
    client_id: '', 
    application_id: '', 
    certificate_type: 'Halal Certification', 
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
        api.get('/api/certificates').catch(() => ({ data: [] })),
        api.get('/api/applications').catch(() => ({ data: [] })),
        api.get('/api/surveillance').catch(() => ({ data: { data: [] } }))
      ]);
      const rawCerts = Array.isArray(certsRes) ? certsRes : (Array.isArray(certsRes?.data) ? certsRes.data : []);
      const rawApps = Array.isArray(appsRes) ? appsRes : (Array.isArray(appsRes?.data) ? appsRes.data : []);
      const rawSurv = Array.isArray(survRes) ? survRes : (Array.isArray(survRes?.data?.data) ? survRes.data.data : (Array.isArray(survRes?.data) ? survRes.data : []));

      setCerts(rawCerts);
      setApps(rawApps.filter(a => a && (a.status === 'approved' || a.status === 'ready_for_certificate' || a.status === 'certificate_issued')));
      setSurvRequests(rawSurv);
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
    const payload = { 
      ...form, 
      client_id: clientId,
      company_name: app?.establishment_name || app?.profiles?.company_name || '',
      company_address: app?.establishment_address || app?.profiles?.address || '',
      manufacturing_address: app?.manufacturer_address || app?.establishment_address || '',
      scope: app?.scope || 'Halal Food Certification',
      status: 'under_review'
    };
    try { 
      const res = await api.post('/api/certificates', payload); 
      const created = res.data?.data || res.data;
      toast.success('Certificate created! Opening review page...'); 
      setShowModal(false); 
      fetchAllData();
      if (created?._id) {
        navigate(`/certificates/${created._id}/review`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create certificate.');
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
    const reason = window.prompt('Please enter the reason for certificate revocation:');
    if (!reason) return;
    try {
      await api.put(`/api/certificates/${id}/revoke`, { reason });
      toast.success('Certificate revoked.');
      fetchAllData();
    } catch (err) {
      toast.error(err.message || 'Failed to revoke certificate.');
    }
  };

  const underReviewCerts = certs.filter(c => c.status === 'under_review' || c.status === 'draft');

  const filteredCerts = certs.filter(c => {
    if (activeTab === 'review') {
      if (c.status !== 'under_review' && c.status !== 'draft') return false;
    } else if (activeTab === 'certs') {
      if (filterStatus) {
        if (filterStatus === 'under_review') {
          if (c.status !== 'under_review' && c.status !== 'draft') return false;
        } else if (c.status !== filterStatus) {
          return false;
        }
      }
    }
    const q = search.toLowerCase();
    const certNo = (c.certificate_number || '').toLowerCase();
    const comp = (c.company_name || c.profiles?.company_name || c.application_id?.establishment_name || '').toLowerCase();
    const site = (c.site_name || c.site_id?.name || c.site_id?.est_name || c.application_id?.site_name || '').toLowerCase();
    return certNo.includes(q) || comp.includes(q) || site.includes(q);
  });

  const filteredSurv = survRequests.filter(r => {
    const q = search.toLowerCase();
    const certNo = (r.certificate_id?.certificate_number || '').toLowerCase();
    const comp = (r.certificate_id?.profiles?.company_name || '').toLowerCase();
    return certNo.includes(q) || comp.includes(q);
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1.5px solid #e2e8f0', marginBottom: 20, gap: 8 }}>
        <button
          type="button"
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'review' ? '2.5px solid #047857' : 'none',
            color: activeTab === 'review' ? '#047857' : '#64748b',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
          onClick={() => setActiveTab('review')}
        >
          <ShieldCheck size={16} /> 
          Pending Review 
          {underReviewCerts.length > 0 && (
            <span style={{
              background: '#f97316',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 12
            }}>
              {underReviewCerts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'certs' ? '2.5px solid #047857' : 'none',
            color: activeTab === 'certs' ? '#047857' : '#64748b',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 14
          }}
          onClick={() => setActiveTab('certs')}
        >
          🏅 All Certificates ({certs.length})
        </button>

        <button
          type="button"
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'surveillance' ? '2.5px solid #047857' : 'none',
            color: activeTab === 'surveillance' ? '#047857' : '#64748b',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 14
          }}
          onClick={() => setActiveTab('surveillance')}
        >
          🗓️ Surveillance Requests
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input 
            placeholder={activeTab === 'surveillance' ? "Search surveillance..." : "Search by cert no, company, site..."} 
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
            <option value="under_review">Under Review</option>
            <option value="active">Active</option>
            <option value="outdated">Outdated</option>
            <option value="expired">Expired</option>
          </select>
        )}
        {activeTab !== 'surveillance' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginLeft: 'auto', background: '#047857', borderColor: '#047857' }}>
            <Plus size={15} /> Create &amp; Review Certificate
          </button>
        )}
      </div>

      {activeTab === 'review' || activeTab === 'certs' ? (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {activeTab === 'review' ? `Certificates Awaiting Review & QA (${filteredCerts.length})` : `All Certificates (${filteredCerts.length})`}
            </div>
          </div>
          <div className="table-wrap">
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
              filteredCerts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Award /></div>
                  <div className="empty-state-title">
                    {activeTab === 'review' ? 'No Certificates Awaiting Review' : 'No Certificates Found'}
                  </div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Certificate No.</th>
                      <th>Company / Site</th>
                      <th>Type &amp; Scheme</th>
                      <th>Issue Date</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCerts.map(c => {
                      const effectiveStatus =
                        c.status === 'active' && c.expiry_date && new Date(c.expiry_date) < new Date()
                          ? 'expired'
                          : c.status;
                      const siteStr = c.site_name || c.site_id?.name || c.site_id?.est_name || c.establishment_name || c.application_id?.establishment_name || c.application_id?.site_name;
                      const isReview = effectiveStatus === 'under_review' || effectiveStatus === 'draft';
                      
                      return (
                      <tr key={c.id || c._id} style={isReview ? { background: '#fffbeb' } : {}}>
                        <td style={{ fontWeight: 800, color: '#047857' }}>{c.certificate_number}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          <div>{c.company_name || c.profiles?.company_name || c.application_id?.establishment_name || c.profiles?.full_name || '—'}</div>
                          {siteStr && (
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                              Site: {siteStr}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13 }}>{c.certificate_type || 'Halal Certification'}</td>
                        <td style={{ fontSize: 12 }}>{c.issue_date ? new Date(c.issue_date).toLocaleDateString('en-GB') : '—'}</td>
                        <td style={{ fontSize: 12 }}>{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-GB') : '—'}</td>
                        <td>
                          <span className={`badge ${
                            isReview ? 'badge-orange' :
                            effectiveStatus === 'active' ? 'badge-green' :
                            effectiveStatus === 'renewed' ? 'badge-blue' :
                            effectiveStatus === 'outdated' || effectiveStatus === 'superseded' ? 'badge-gray' :
                            effectiveStatus === 'revoked' ? 'badge-red' :
                            'badge-gray'
                          }`} style={{ textTransform: 'capitalize' }}>
                            {isReview ? '⏳ Under Review' :
                             effectiveStatus === 'outdated' ? 'Outdated' :
                             effectiveStatus === 'superseded' ? 'Superseded' :
                             effectiveStatus === 'renewed' ? 'Renewed' :
                             effectiveStatus === 'active' ? 'Active' :
                             effectiveStatus === 'expired' ? 'Expired' :
                             effectiveStatus === 'revoked' ? 'Revoked' :
                             effectiveStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => navigate(`/certificates/${c.id || c._id}/review`)}
                              style={{
                                background: isReview ? '#047857' : '#f1f5f9',
                                color: isReview ? '#ffffff' : '#334155',
                                borderColor: isReview ? '#047857' : '#cbd5e1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontWeight: 700,
                                fontSize: 12
                              }}
                            >
                              <Edit3 size={13} /> {isReview ? 'Review & Send' : 'Review / Edit'}
                            </button>

                            {effectiveStatus === 'active' && (
                              <button 
                                className="btn btn-ghost btn-sm" 
                                style={{ color: 'var(--danger)', fontSize: 12 }} 
                                onClick={() => handleRevoke(c.id || c._id)}
                              >
                                Revoke
                              </button>
                            )}

                            {c.certificate_url && (
                              <a href={getPdfUrl(c.certificate_url)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" title="Download PDF">
                                <Download size={13} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
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
