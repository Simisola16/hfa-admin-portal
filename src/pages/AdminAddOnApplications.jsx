import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../lib/pdfUtils';
import {
  PlusCircle, Search, X, Check, FileText, AlertCircle,
  Clock, Package, RefreshCw, ChevronDown, ChevronUp, User,
  CheckCircle, Users, ArrowRight, Building2, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  ft_assigned: 'FT Assigned',
  product_approval_form_enabled: 'Form Enabled',
  all_forms_received: 'Forms Received',
  logsheet_created: 'Logsheet Created',
  waiting_sharia_signature: "Shari'a Signature",
  product_form_approved: 'Form Approved',
  ready_for_certificate: 'Ready for Cert',
  completed: 'Completed'
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

const STATUS_COLOR = {
  submitted: '#f59e0b',
  accepted: '#16a34a',
  rejected: '#ef4444',
  ft_assigned: '#2563eb',
  product_approval_form_enabled: '#7c3aed',
  all_forms_received: '#0d9488',
  logsheet_created: '#2563eb',
  waiting_sharia_signature: '#ea580c',
  product_form_approved: '#16a34a',
  ready_for_certificate: '#0d9488',
  completed: '#16a34a'
};

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

  const [activeApp, setActiveApp] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [decision, setDecision] = useState('accepted');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  // Multi-FT selection
  const [selectedFtIds, setSelectedFtIds] = useState([]);

  const isManagerOrAdmin = ['admin', 'superadmin', 'food_tech_manager'].includes(user?.role);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/add-on-applications');
      setApps(res.data?.data || res.data || []);
      if (isManagerOrAdmin) {
        const usersRes = await api.get('/api/users');
        setFtUsers((usersRes.data || []).filter(u => u.role === 'food_tech'));
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
    // Pre-select already-assigned FT staff
    const preSelected = (app.assigned_food_techs || []).map(ft => (ft._id || ft).toString());
    setSelectedFtIds(preSelected.length > 0 ? preSelected : (app.assigned_food_tech ? [(app.assigned_food_tech._id || app.assigned_food_tech).toString()] : []));
  };

  const closeModal = () => { setActiveApp(null); setActionType(null); };

  const toggleFt = (id) => {
    setSelectedFtIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

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
    if (selectedFtIds.length === 0) return toast.error('Please select at least one Food Technologies staff member.');
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${activeApp._id}/assign-ft`, { assigned_food_techs: selectedFtIds });
      toast.success(`${selectedFtIds.length} FT staff member(s) assigned successfully!`);
      closeModal(); fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const handleCreateLogsheet = (app) => {
    sessionStorage.setItem('addon_app_id', app._id);
    navigate(`/addon-applications/${app._id}/logsheet`);
  };

  const handleApproveForm = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${activeApp._id}/approve-form`);
      toast.success('Product Form approved!');
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
    if (view === 'request') return { title: 'Add-on Request Queue', subtitle: 'Applications awaiting accept or reject decision', count: filtered.length, color: '#f59e0b' };
    if (view === 'inprogress') return { title: 'In-Progress Applications', subtitle: 'Applications undergoing the processing workflow', count: filtered.length, color: '#2563eb' };
    return { title: 'All Add-on Applications', subtitle: 'Complete history of all add-on product requests', count: filtered.length, color: '#475569' };
  };

  const meta = getViewMeta();

  const getAssignedFtNames = (app) => {
    const arr = app.assigned_food_techs || [];
    if (arr.length > 0) return arr.map(ft => ft.full_name || ft).join(', ');
    if (app.assigned_food_tech?.full_name) return app.assigned_food_tech.full_name;
    return null;
  };

  return (
    <div className="animate-in">
      {/* ─── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="toolbar" style={{ marginBottom: 20 }}>
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search by client, certificate, contact, or product..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><X size={14} /></button>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchApps}><RefreshCw size={14} /></button>
        <span className="badge badge-gray" style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>{meta.count} {view === 'request' ? 'Pending' : view === 'inprogress' ? 'In Progress' : 'Total'}</span>
      </div>

      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>{meta.title}</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{meta.subtitle}</p>
      </div>

      {/* ─── Main Card ───────────────────────────────────────────────────── */}
      <div className="card shadow-sm border-0" style={{ borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Package size={28} style={{ color: '#94a3b8' }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 6 }}>No applications found</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>No add-on product requests matching your current filter.</div>
          </div>
        ) : (
          <div>
            {filtered.map((app, appIdx) => {
              const clientName = app.client_id?.company_name || app.client_id?.full_name || '—';
              const certNo = app.certificate_id?.certificate_number || '—';
              const statusLabel = STATUS_LABELS[app.status] || app.status;
              const badgeClass = STATUS_BADGE[app.status] || 'badge-gray';
              const statusColor = STATUS_COLOR[app.status] || '#475569';
              const isExpanded = expandedId === app._id;
              const stepIdx = FLOW_STEPS.indexOf(app.status);
              const ftNames = getAssignedFtNames(app);

              return (
                <div key={app._id} style={{ borderBottom: appIdx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  {/* ─── Row ──────────────────────────────────────────── */}
                  <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 160px 200px', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>

                      {/* Client + Cert */}
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginBottom: 2 }}>{clientName}</div>
                        <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FileText size={10} /> {certNo}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={10} /> {new Date(app.createdAt).toLocaleDateString('en-GB')}
                        </div>
                      </div>

                      {/* Products */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                          Products ({(app.products || []).length})
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(app.products || []).slice(0, 3).map((p, i) => (
                            <span key={i} style={{
                              fontSize: 10, padding: '2px 7px', borderRadius: 5,
                              background: p.type === 'Add product' ? '#f0fdf4' : p.type === 'Remove product' ? '#fef2f2' : '#f0f9ff',
                              color: p.type === 'Add product' ? '#166534' : p.type === 'Remove product' ? '#991b1b' : '#0369a1',
                              border: `1px solid ${p.type === 'Add product' ? '#bbf7d0' : p.type === 'Remove product' ? '#fecaca' : '#bae6fd'}`,
                              fontWeight: 600
                            }}>
                              {p.sn || i + 1}. {p.name}
                            </span>
                          ))}
                          {(app.products || []).length > 3 && (
                            <span style={{ fontSize: 10, color: '#94a3b8', padding: '2px 6px' }}>+{app.products.length - 3} more</span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, display: 'inline-block' }}>
                          {statusLabel}
                        </span>
                        {ftNames && (
                          <div style={{ fontSize: 10, color: '#2563eb', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Users size={9} /> {ftNames}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/addon-applications/${app._id}/processing`)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 11 }}
                        >
                          Track <ArrowRight size={11} />
                        </button>

                        {isManagerOrAdmin && app.status === 'submitted' && (
                          <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => openAction(app, 'review')}>
                            Review
                          </button>
                        )}

                        {isManagerOrAdmin && ['accepted', 'ft_assigned'].includes(app.status) && (
                          <button className="btn btn-sm" style={{ background: '#2563eb', color: 'white', border: 'none', fontSize: 11 }} onClick={() => openAction(app, 'assign_ft')}>
                            {app.status === 'ft_assigned' ? 'Re-assign FT' : 'Assign FT'}
                          </button>
                        )}

                        {isManagerOrAdmin && app.status === 'ft_assigned' && (
                          <button className="btn btn-sm" style={{ background: '#7c3aed', color: 'white', border: 'none', fontSize: 11 }} onClick={() => navigate(`/addon-applications/${app._id}/approval-form`)}>
                            Enable Form
                          </button>
                        )}

                        {app.status === 'product_approval_form_enabled' && (
                          <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={10} /> Awaiting client
                          </span>
                        )}

                        {isManagerOrAdmin && app.status === 'all_forms_received' && (
                          <button className="btn btn-sm" style={{ background: '#0d9488', color: 'white', border: 'none', fontSize: 11 }} onClick={() => handleCreateLogsheet(app)}>
                            Logsheet
                          </button>
                        )}

                        {isManagerOrAdmin && ['logsheet_created', 'waiting_sharia_signature', 'all_forms_received'].includes(app.status) && (
                          <button className="btn btn-sm" style={{ background: '#16a34a', color: 'white', border: 'none', fontSize: 11 }} onClick={() => openAction(app, 'approve_form')}>
                            Approve Form
                          </button>
                        )}

                        {isManagerOrAdmin && app.status === 'ready_for_certificate' && (
                          <button className="btn btn-sm" style={{ background: '#0e7490', color: 'white', border: 'none', fontSize: 11 }} onClick={() => openAction(app, 'complete')}>
                            Issue Cert
                          </button>
                        )}

                        {app.status === 'completed' && (
                          <span style={{ fontSize: 11, color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle size={12} /> Done
                          </span>
                        )}

                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setExpandedId(isExpanded ? null : app._id)}
                          style={{ padding: '4px 6px' }}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar below row */}
                  <div style={{ height: 3, background: '#f1f5f9', borderRadius: 0 }}>
                    <div style={{
                      height: '100%',
                      width: `${app.status === 'completed' ? 100 : Math.round(((stepIdx + 1) / FLOW_STEPS.length) * 100)}%`,
                      background: statusColor,
                      borderRadius: 0,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div style={{ background: '#fafbfc', borderTop: '1px solid #f1f5f9', padding: '20px 24px 24px' }}>

                      {/* 10-Step Flow */}
                      <div style={{ marginBottom: 20, background: 'white', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                          Workflow Progress — <span style={{ color: statusColor }}>{STATUS_LABELS[app.status]}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                          {FLOW_STEPS.map((stepId, idx) => {
                            const currentIdx = FLOW_STEPS.indexOf(app.status);
                            const isDone = currentIdx > idx || app.status === 'completed';
                            const isCurrent = currentIdx === idx && app.status !== 'completed';
                            return (
                              <React.Fragment key={stepId}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 56 }}>
                                  <div style={{
                                    width: 24, height: 24, borderRadius: '50%',
                                    background: isDone ? '#16a34a' : isCurrent ? statusColor : '#e2e8f0',
                                    color: isDone || isCurrent ? 'white' : '#94a3b8',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 700, marginBottom: 4,
                                    boxShadow: isCurrent ? `0 0 0 3px ${statusColor}30` : 'none',
                                    transition: 'all 0.2s'
                                  }}>
                                    {isDone ? '✓' : idx + 1}
                                  </div>
                                  <span style={{
                                    fontSize: 9, fontWeight: isCurrent ? 700 : 500, textAlign: 'center', lineHeight: 1.2,
                                    color: isDone ? '#16a34a' : isCurrent ? statusColor : '#94a3b8'
                                  }}>
                                    {STATUS_LABELS[stepId]}
                                  </span>
                                </div>
                                {idx < FLOW_STEPS.length - 1 && (
                                  <div style={{ flex: '0 0 12px', height: 2, background: isDone ? '#16a34a' : '#e2e8f0', marginBottom: 14 }} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        {/* Products */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Products</div>
                          <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 32, color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>S/N</th>
                                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Product Name</th>
                                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Code</th>
                                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(app.products || []).map((p, i) => (
                                  <tr key={i} style={{ borderBottom: i < (app.products.length - 1) ? '1px solid #f8fafc' : 'none' }}>
                                    <td style={{ padding: '7px 10px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>{p.sn || i + 1}</td>
                                    <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0f172a' }}>{p.name}</td>
                                    <td style={{ padding: '7px 10px', color: '#64748b' }}>{p.code || '—'}</td>
                                    <td style={{ padding: '7px 10px' }}>
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
                        </div>

                        {/* App Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {/* Contact */}
                          <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Contact</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{app.contact_name}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{app.contact_email}</div>
                            {app.contact_phone && <div style={{ fontSize: 12, color: '#64748b' }}>{app.contact_phone}</div>}
                          </div>

                          {/* Assigned FT */}
                          {ftNames && (
                            <div style={{ background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd', padding: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Users size={11} /> Assigned FT Staff
                              </div>
                              {(app.assigned_food_techs || [app.assigned_food_tech]).filter(Boolean).map((ft, i) => (
                                <div key={i} style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>
                                  {ft.full_name || ft} {ft.email ? <span style={{ fontWeight: 400, color: '#7dd3fc' }}>({ft.email})</span> : ''}
                                </div>
                              ))}
                            </div>
                          )}

                          {app.rejection_reason && (
                            <div style={{ background: '#fef2f2', padding: 12, borderRadius: 10, border: '1px solid #fecaca', fontSize: 12, color: '#991b1b' }}>
                              <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                              <strong>Rejection Reason:</strong> {app.rejection_reason}
                            </div>
                          )}

                          {app.message && (
                            <div style={{ background: 'white', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Client Note</div>
                              <div style={{ fontSize: 12, color: '#334155' }}>{app.message}</div>
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

      {/* ═══ MODALS ════════════════════════════════════════════════════════ */}

      {/* Accept Or Reject */}
      {activeApp && actionType === 'review' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Review Add-on Application</span>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{activeApp.client_id?.company_name || activeApp.client_id?.full_name}</div>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button type="button"
                    onClick={() => setDecision('accepted')}
                    style={{
                      padding: '12px', borderRadius: 10, border: `2px solid ${decision === 'accepted' ? '#16a34a' : '#e2e8f0'}`,
                      background: decision === 'accepted' ? '#f0fdf4' : 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      color: decision === 'accepted' ? '#16a34a' : '#64748b', transition: 'all 0.15s'
                    }}>
                    ✅ Accept
                  </button>
                  <button type="button"
                    onClick={() => setDecision('rejected')}
                    style={{
                      padding: '12px', borderRadius: 10, border: `2px solid ${decision === 'rejected' ? '#ef4444' : '#e2e8f0'}`,
                      background: decision === 'rejected' ? '#fef2f2' : 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      color: decision === 'rejected' ? '#ef4444' : '#64748b', transition: 'all 0.15s'
                    }}>
                    ❌ Reject
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

      {/* Assign FT — Multi-Select */}
      {activeApp && actionType === 'assign_ft' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <span className="modal-title">Assign Food Technologies Staff</span>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 12, fontSize: 13, color: '#0369a1', marginBottom: 20 }}>
                <strong>{activeApp.client_id?.company_name || activeApp.client_id?.full_name}</strong><br />
                <span style={{ fontSize: 12 }}>Cert: {activeApp.certificate_id?.certificate_number} · {(activeApp.products || []).length} product(s)</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Select FT Staff Members <span>*</span>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
                    {selectedFtIds.length > 0 ? `${selectedFtIds.length} selected` : '— select one or more'}
                  </span>
                </label>

                {ftUsers.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#ef4444', padding: 12, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                    No Food Technologies staff found. Create a user with role "food_tech" first.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                    {ftUsers.map(ft => {
                      const isSelected = selectedFtIds.includes(ft._id);
                      return (
                        <label key={ft._id} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                          borderRadius: 10, border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                          background: isSelected ? '#eff6ff' : 'white', cursor: 'pointer', transition: 'all 0.15s'
                        }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFt(ft._id)}
                            style={{ width: 16, height: 16, accentColor: '#2563eb', flexShrink: 0 }}
                          />
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: isSelected ? '#2563eb' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: isSelected ? 'white' : '#64748b' }}>
                              {(ft.full_name || ft.email || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#1d4ed8' : '#0f172a' }}>{ft.full_name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{ft.email}</div>
                          </div>
                          {isSelected && <Check size={14} style={{ marginLeft: 'auto', color: '#2563eb' }} />}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignFt} disabled={submitting || selectedFtIds.length === 0}
                style={{ background: '#2563eb', borderColor: '#2563eb' }}>
                {submitting ? 'Assigning...' : `Assign ${selectedFtIds.length > 0 ? selectedFtIds.length : ''} FT Staff`}
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
                Approving the Product Form will advance this application to <strong>Product Form Approved</strong> then to <strong>Ready For Certificate</strong>.
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
