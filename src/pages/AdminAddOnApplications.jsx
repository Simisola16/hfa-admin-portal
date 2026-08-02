import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../lib/pdfUtils';
import {
  PlusCircle, Search, X, Check, FileText, Upload, AlertCircle,
  Clock, Package, RefreshCw, ChevronRight, User, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Canonical status definitions ────────────────────────────────────────────
const STATUS_LABELS = {
  submitted: 'Submitted',
  accepted: 'Application Accepted',
  rejected: 'Application Rejected',
  ft_assigned: 'FT Assigned',
  product_approval_form_enabled: 'Product Approval Form Enabled',
  all_forms_received: 'All Product Approval Form Received',
  logsheet_created: 'Logsheet Created',
  waiting_sharia_signature: 'Waiting For Shari\'a Board Signature',
  product_form_approved: 'Product Form Approved',
  ready_for_certificate: 'Ready For Certificate',
  completed: 'Certificate'
};

const STATUS_BADGE = {
  submitted: 'badge-yellow',
  accepted: 'badge-green',
  rejected: 'badge-red',
  ft_assigned: 'badge-blue',
  product_approval_form_enabled: 'badge-purple',
  all_forms_received: 'badge-teal',
  logsheet_created: 'badge-blue',
  waiting_sharia_signature: 'badge-orange',
  product_form_approved: 'badge-green',
  ready_for_certificate: 'badge-teal',
  completed: 'badge-green'
};

// Flow steps for the progress indicator
const FLOW_STEPS = [
  'submitted', 'accepted', 'ft_assigned', 'product_approval_form_enabled',
  'all_forms_received', 'logsheet_created', 'waiting_sharia_signature',
  'product_form_approved', 'ready_for_certificate', 'completed'
];

export default function AdminAddOnApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'list';

  const [apps, setApps] = useState([]);
  const [ftUsers, setFtUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Modal state
  const [activeApp, setActiveApp] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Review
  const [decision, setDecision] = useState('accepted');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  // Assign FT
  const [selectedFt, setSelectedFt] = useState('');

  // Enable Form
  const [formText, setFormText] = useState('');
  const [formFile, setFormFile] = useState(null);
  const formFileRef = useRef(null);

  const isManagerOrAdmin = ['admin', 'food_tech_manager'].includes(user?.role);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/add-on-applications');
      setApps(res.data?.data || res.data || []);

      if (isManagerOrAdmin) {
        const usersRes = await api.get('/api/users');
        const ft = (usersRes.data || []).filter(u => u.role === 'food_tech');
        setFtUsers(ft);
      }
    } catch {
      toast.error('Failed to load add-on applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApps(); }, [user]);

  const openAction = (app, action) => {
    setActiveApp(app);
    setActionType(action);
    setDecision('accepted');
    setRejectionReason('');
    setNotes('');
    setSelectedFt('');
    setFormText('');
    setFormFile(null);
  };

  const closeModal = () => { setActiveApp(null); setActionType(null); };

  // ─── Action handlers ────────────────────────────────────────────────────

  const handleReview = async () => {
    if (decision === 'rejected' && !rejectionReason.trim()) return toast.error('Please enter a rejection reason.');
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${activeApp._id}/review`, { decision, rejection_reason: rejectionReason, notes });
      toast.success(decision === 'accepted' ? 'Application accepted!' : 'Application rejected.');
      closeModal(); fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const handleAssignFt = async () => {
    if (!selectedFt) return toast.error('Please select a Food Technologies staff member.');
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${activeApp._id}/assign-ft`, { assigned_food_tech: selectedFt });
      toast.success('FT assigned successfully!');
      closeModal(); fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const handleEnableForm = async () => {
    if (!formText.trim() && !formFile) {
      return toast.error('Please upload a form document or write form content.');
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (formFile) fd.append('form_file', formFile);
      if (formText.trim()) fd.append('form_text', formText);
      await api.put(`/api/add-on-applications/${activeApp._id}/enable-form`, fd, true);
      toast.success('Product Approval Form enabled and sent to client!');
      closeModal(); fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const handleCreateLogsheet = async (app) => {
    // Navigate to the logsheet creation page for this add-on application
    // We store the addon app id in sessionStorage so AdminCreateLogsheet can read it
    sessionStorage.setItem('addon_app_id', app._id);
    navigate(`/addon-applications/${app._id}/logsheet`);
  };

  const handleApproveForm = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${activeApp._id}/approve-form`);
      toast.success('Product Form approved! Application is Ready for Certificate.');
      closeModal(); fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${activeApp._id}/complete`);
      toast.success('Certificate updated! Add-on application complete.');
      closeModal(); fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  // ─── View filtering ─────────────────────────────────────────────────────
  const filteredByView = apps.filter(app => {
    if (view === 'request') return app.status === 'submitted';
    if (view === 'inprogress') return !['submitted', 'rejected', 'completed'].includes(app.status);
    return true;
  });

  const filtered = filteredByView.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.client_id?.company_name?.toLowerCase().includes(s) ||
      a.client_id?.full_name?.toLowerCase().includes(s) ||
      a.certificate_id?.certificate_number?.toLowerCase().includes(s) ||
      a.contact_name?.toLowerCase().includes(s) ||
      a.contact_email?.toLowerCase().includes(s) ||
      (a.products || []).some(p => p.name?.toLowerCase().includes(s))
    );
  });

  const getViewMeta = () => {
    if (view === 'request') return { title: 'Add-on Request Queue', subtitle: 'Applications awaiting Accept Or Reject decision', badgeLabel: `${filtered.length} Pending` };
    if (view === 'inprogress') return { title: 'In-Progress Add-on Applications', subtitle: 'Applications undergoing processing through the canonical flow', badgeLabel: `${filtered.length} In-Progress` };
    return { title: 'All Add-on Applications', subtitle: 'Complete history of all add-on product requests', badgeLabel: `${filtered.length} Applications` };
  };

  const meta = getViewMeta();

  return (
    <div className="animate-in">
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search by client, certificate, contact, or product..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchApps}><RefreshCw size={14} /></button>
        <span className="badge badge-gray" style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>{meta.badgeLabel}</span>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header">
          <div>
            <div className="card-title" style={{ fontSize: 18, fontWeight: 700 }}>{meta.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meta.subtitle}</div>
          </div>
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px' }}>
            <PlusCircle size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
            <div className="empty-state-title">No applications found</div>
            <div className="empty-state-text">No add-on product requests matching your current filter.</div>
          </div>
        ) : (
          <div>
            {filtered.map(app => {
              const clientName = app.client_id?.company_name || app.client_id?.full_name || '—';
              const certNo = app.certificate_id?.certificate_number || '—';
              const statusLabel = STATUS_LABELS[app.status] || app.status;
              const badgeClass = STATUS_BADGE[app.status] || 'badge-gray';
              const isExpanded = expandedId === app._id;
              const stepIdx = FLOW_STEPS.indexOf(app.status);

              return (
                <div key={app._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Row */}
                  <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    {/* Client + Cert */}
                    <div style={{ flex: '0 0 200px' }}>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{clientName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cert: {certNo}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(app.createdAt).toLocaleDateString('en-GB')}</div>
                    </div>

                    {/* Products summary */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Products ({(app.products || []).length})</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(app.products || []).slice(0, 3).map((p, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9', borderRadius: 4, color: '#475569', border: '1px solid #e2e8f0' }}>
                            {p.sn || i + 1}. {p.name}
                          </span>
                        ))}
                        {(app.products || []).length > 3 && (
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>+{app.products.length - 3} more</span>
                        )}
                      </div>
                    </div>

                    {/* Contact */}
                    <div style={{ flex: '0 0 170px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{app.contact_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{app.contact_email}</div>
                    </div>

                    {/* Status */}
                    <div style={{ flex: '0 0 180px' }}>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{statusLabel}</span>
                      {app.assigned_food_tech && (
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                          <User size={10} style={{ display: 'inline', marginRight: 2 }} />
                          FT: {app.assigned_food_tech.full_name}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Accept Or Reject */}
                      {isManagerOrAdmin && app.status === 'submitted' && (
                        <button className="btn btn-primary btn-sm" onClick={() => openAction(app, 'review')}>
                          Accept Or Reject
                        </button>
                      )}

                      {/* Assign FT */}
                      {isManagerOrAdmin && app.status === 'accepted' && (
                        <button className="btn btn-primary btn-sm" style={{ background: '#0284c7', borderColor: '#0284c7' }} onClick={() => openAction(app, 'assign_ft')}>
                          Assign FT
                        </button>
                      )}

                      {/* Enable Product Approval Form */}
                      {isManagerOrAdmin && app.status === 'ft_assigned' && (
                        <button className="btn btn-primary btn-sm" style={{ background: '#7c3aed', borderColor: '#7c3aed' }} onClick={() => openAction(app, 'enable_form')}>
                          Enable Product Approval Form
                        </button>
                      )}

                      {/* Waiting for client form — no action, show note */}
                      {app.status === 'product_approval_form_enabled' && (
                        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> Awaiting client form response
                        </span>
                      )}

                      {/* Create Logsheet */}
                      {isManagerOrAdmin && app.status === 'all_forms_received' && (
                        <button className="btn btn-primary btn-sm" style={{ background: '#0d9488', borderColor: '#0d9488' }} onClick={() => handleCreateLogsheet(app)}>
                          Create Logsheet
                        </button>
                      )}

                      {/* Waiting for Shari'a Board Signature — show logsheet link */}
                      {isManagerOrAdmin && app.status === 'logsheet_created' && app.logsheet_id && (
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/logsheets/${app.logsheet_id._id || app.logsheet_id}`)}>
                          View Logsheet
                        </button>
                      )}

                      {/* Approve Product Form */}
                      {isManagerOrAdmin && ['logsheet_created', 'waiting_sharia_signature', 'all_forms_received'].includes(app.status) && (
                        <button className="btn btn-primary btn-sm" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={() => openAction(app, 'approve_form')}>
                          Approve Product Form
                        </button>
                      )}

                      {/* Issue Certificate (Complete) */}
                      {isManagerOrAdmin && app.status === 'ready_for_certificate' && (
                        <button className="btn btn-primary btn-sm" style={{ background: '#0e7490', borderColor: '#0e7490' }} onClick={() => openAction(app, 'complete')}>
                          Issue Certificate
                        </button>
                      )}

                      {/* Completed */}
                      {app.status === 'completed' && (
                        <span style={{ fontSize: 12, color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={13} /> Complete
                        </span>
                      )}

                      {/* Expand/Collapse */}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setExpandedId(isExpanded ? null : app._id)}
                        style={{ padding: '4px 8px' }}
                      >
                        <ChevronRight size={14} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: '0.15s' }} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div style={{ padding: '0 24px 20px', background: '#fafbfc', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingTop: 16 }}>

                        {/* Products table */}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Products</div>
                          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ padding: '6px 8px', textAlign: 'center', width: 32, color: '#64748b' }}>S/N</th>
                                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b' }}>Product Name</th>
                                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b' }}>Code</th>
                                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b' }}>Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(app.products || []).map((p, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>{p.sn || i + 1}</td>
                                  <td style={{ padding: '6px 8px', fontWeight: 600 }}>{p.name}</td>
                                  <td style={{ padding: '6px 8px', color: '#64748b' }}>{p.code || '—'}</td>
                                  <td style={{ padding: '6px 8px' }}>
                                    <span style={{
                                      fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                                      background: p.type === 'Add product' ? '#f0fdf4' : p.type === 'Remove product' ? '#fef2f2' : '#f0f9ff',
                                      color: p.type === 'Add product' ? '#166534' : p.type === 'Remove product' ? '#991b1b' : '#0369a1'
                                    }}>{p.type}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Application details + form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {app.message && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Client Message</div>
                              <div style={{ fontSize: 12, color: '#334155', background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>{app.message}</div>
                            </div>
                          )}

                          {app.rejection_reason && (
                            <div style={{ background: '#fef2f2', padding: 10, borderRadius: 8, border: '1px solid #fecaca', fontSize: 12, color: '#991b1b' }}>
                              <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                              <strong>Rejection Reason:</strong> {app.rejection_reason}
                            </div>
                          )}

                          {/* Product Approval Form — client response */}
                          {app.product_approval_form?.submitted_at && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>Client's Form Response</div>
                              <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                                <div style={{ fontSize: 11, color: '#166534', marginBottom: 6 }}>
                                  <Check size={12} style={{ display: 'inline', marginRight: 4 }} />
                                  Submitted: {new Date(app.product_approval_form.submitted_at).toLocaleDateString('en-GB')}
                                </div>
                                {app.product_approval_form.client_response_text && (
                                  <div style={{ fontSize: 12, color: '#334155', whiteSpace: 'pre-wrap', marginBottom: 8 }}>{app.product_approval_form.client_response_text}</div>
                                )}
                                {app.product_approval_form.client_response_url && (
                                  <a href={getPdfUrl(app.product_approval_form.client_response_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <FileText size={12} /> Download Client Response
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Admin form content */}
                          {app.product_approval_form?.sent_at && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Admin's Form Content</div>
                              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
                                {app.product_approval_form.form_file_url && (
                                  <a href={getPdfUrl(app.product_approval_form.form_file_url)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <FileText size={12} /> View Uploaded Form
                                  </a>
                                )}
                                {app.product_approval_form.form_text && (
                                  <div style={{ color: '#334155', whiteSpace: 'pre-wrap', fontSize: 12 }}>{app.product_approval_form.form_text}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Modals ═══════════════════════════════════════════════════════════ */}

      {/* Accept Or Reject */}
      {activeApp && actionType === 'review' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Accept Or Reject — Add-on Application</span>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{activeApp.client_id?.company_name || activeApp.client_id?.full_name}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Certificate: {activeApp.certificate_id?.certificate_number}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Products: {(activeApp.products || []).length}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  {(activeApp.products || []).map((p, i) => (
                    <span key={i} style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                      {p.name} ({p.type})
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Decision</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className={`btn ${decision === 'accepted' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setDecision('accepted')}>
                    ✅ Accept (Application Accepted)
                  </button>
                  <button type="button" className={`btn ${decision === 'rejected' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, background: decision === 'rejected' ? '#ef4444' : '', borderColor: decision === 'rejected' ? '#ef4444' : '', color: decision === 'rejected' ? 'white' : '' }} onClick={() => setDecision('rejected')}>
                    ❌ Reject (Application Rejected)
                  </button>
                </div>
              </div>

              {decision === 'rejected' ? (
                <div className="form-group animate-in">
                  <label className="form-label">Rejection Reason <span>*</span></label>
                  <textarea className="form-control" rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why this application is being rejected..." required />
                </div>
              ) : (
                <div className="form-group animate-in">
                  <label className="form-label">Internal Notes (Optional)</label>
                  <textarea className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for the team..." />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReview} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign FT */}
      {activeApp && actionType === 'assign_ft' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <span className="modal-title">Assign FT — Food Technologies</span>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div className="form-group">
                <label className="form-label">Select Food Technologies Staff <span>*</span></label>
                <select className="form-control" value={selectedFt} onChange={e => setSelectedFt(e.target.value)} required>
                  <option value="">-- Choose FT Staff Member --</option>
                  {ftUsers.map(u => <option key={u._id} value={u._id}>{u.full_name} ({u.email})</option>)}
                </select>
                {ftUsers.length === 0 && (
                  <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>No Food Technologies staff found. Create a user with role "food_tech" first.</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignFt} disabled={submitting || !selectedFt}>
                {submitting ? 'Assigning...' : 'Assign FT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enable Product Approval Form */}
      {activeApp && actionType === 'enable_form' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <span className="modal-title">Enable Product Approval Form</span>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 16, background: '#f0f9ff', padding: 12, borderRadius: 8, border: '1px solid #bae6fd', lineHeight: 1.5 }}>
                Create the Product Approval Form content to send to the client. You can upload a PDF document, write the form text directly, or both. The client will see this content and submit their completed response.
              </div>

              {/* Upload option */}
              <div className="form-group">
                <label className="form-label">Upload Form Document (PDF / Image)</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  ref={formFileRef}
                  style={{ display: 'none' }}
                  onChange={e => setFormFile(e.target.files[0] || null)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => formFileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Upload size={13} /> {formFile ? formFile.name : 'Choose File'}
                  </button>
                  {formFile && (
                    <button type="button" onClick={() => setFormFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Text content option */}
              <div className="form-group">
                <label className="form-label">Form Text Content</label>
                <textarea
                  className="form-control"
                  rows={6}
                  value={formText}
                  onChange={e => setFormText(e.target.value)}
                  placeholder="Write the form content, instructions, or questions the client must respond to..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEnableForm} disabled={submitting || (!formText.trim() && !formFile)}>
                {submitting ? 'Sending...' : 'Enable Product Approval Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Product Form */}
      {activeApp && actionType === 'approve_form' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">Approve Product Form</span>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, color: '#166534', fontSize: 13, lineHeight: 1.6 }}>
                <Check size={16} style={{ display: 'inline', marginRight: 6 }} />
                Approving the Product Form will advance this application to <strong>Product Form Approved</strong> and then immediately to <strong>Ready For Certificate</strong>, after which you can issue the final certificate update.
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: '#475569' }}>
                <strong>Client:</strong> {activeApp.client_id?.company_name || activeApp.client_id?.full_name}<br />
                <strong>Products:</strong> {(activeApp.products || []).length}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApproveForm} disabled={submitting} style={{ background: '#16a34a', borderColor: '#16a34a' }}>
                {submitting ? 'Approving...' : 'Approve Product Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Certificate */}
      {activeApp && actionType === 'complete' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Issue Certificate — Final Update</span>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, color: '#166534', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                <Check size={16} style={{ display: 'inline', marginRight: 6 }} />
                This will apply all product changes to the client's certificate and regenerate the certificate PDF.
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.8 }}>
                <strong>Certificate:</strong> {activeApp.certificate_id?.certificate_number}<br />
                <strong>Changes to apply:</strong>
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(activeApp.products || []).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '6px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: p.type === 'Add product' ? '#dcfce7' : p.type === 'Remove product' ? '#fee2e2' : '#e0f2fe', color: p.type === 'Add product' ? '#166534' : p.type === 'Remove product' ? '#991b1b' : '#0369a1' }}>{p.type}</span>
                    <span>{p.name}{p.code ? ` (${p.code})` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleComplete} disabled={submitting} style={{ background: '#0e7490', borderColor: '#0e7490' }}>
                {submitting ? 'Updating...' : 'Issue Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
