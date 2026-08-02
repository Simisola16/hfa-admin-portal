import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, X, RefreshCw,
  Building2, FileText, User, Calendar, Shield,
  ChevronRight, AlertCircle, Clock, Package, Upload, Download, Check
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../lib/pdfUtils';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  submitted: 'Submit Add-On',
  accepted: 'Application Accepted',
  rejected: 'Application Rejected',
  ft_assigned: 'Assign FT Food Technologies',
  product_approval_form_enabled: 'Product Approval Form Enabled',
  all_forms_received: 'All Product Approval Form Received',
  logsheet_created: 'Create Logsheet',
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

const FLOW_STEPS = [
  { id: 'submitted', label: 'Submit Add-On' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'ft_assigned', label: 'Assign FT' },
  { id: 'product_approval_form_enabled', label: 'Form Enabled' },
  { id: 'all_forms_received', label: 'Form Received' },
  { id: 'logsheet_created', label: 'Create Logsheet' },
  { id: 'waiting_sharia_signature', label: 'Shari\'a Signature' },
  { id: 'product_form_approved', label: 'Form Approved' },
  { id: 'ready_for_certificate', label: 'Ready for Cert' },
  { id: 'completed', label: 'Certificate' }
];

export default function AdminAddOnProcessing() {
  const { addonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ftUsers, setFtUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('products');

  // Modal Action states
  const [actionType, setActionType] = useState(null); // 'review' | 'assign_ft' | 'enable_form' | 'approve_form' | 'complete'
  const [decision, setDecision] = useState('accepted');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFt, setSelectedFt] = useState('');
  const [selectedFtIds, setSelectedFtIds] = useState([]);
  const [formText, setFormText] = useState('');
  const [formFile, setFormFile] = useState(null);

  const toggleFt = (ftId) => {
    setSelectedFtIds(prev =>
      prev.includes(ftId) ? prev.filter(id => id !== ftId) : [...prev, ftId]
    );
  };

  const isManagerOrAdmin = ['admin', 'superadmin', 'food_tech_manager'].includes(user?.role);

  const fetchApp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/add-on-applications/${addonId}`);
      setApp(res.data?.data || res.data);

      if (isManagerOrAdmin) {
        const usersRes = await api.get('/api/users');
        const ft = (usersRes.data || []).filter(u => u.role === 'food_tech');
        setFtUsers(ft);
      }
    } catch (err) {
      toast.error('Failed to load add-on application details.');
    } finally {
      setLoading(false);
    }
  }, [addonId, isManagerOrAdmin]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  // Action handlers
  const handleReview = async () => {
    if (decision === 'rejected' && !rejectionReason.trim()) return toast.error('Please enter a rejection reason.');
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${app._id}/review`, { decision, rejection_reason: rejectionReason, notes });
      toast.success(decision === 'accepted' ? 'Application accepted!' : 'Application rejected.');
      setActionType(null);
      fetchApp();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const handleAssignFt = async () => {
    if (selectedFtIds.length === 0) return toast.error('Please select at least one Food Technologies staff member.');
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${app._id}/assign-ft`, { assigned_food_techs: selectedFtIds });
      toast.success(`${selectedFtIds.length} FT staff member${selectedFtIds.length > 1 ? 's' : ''} assigned successfully!`);
      setActionType(null);
      setSelectedFtIds([]);
      fetchApp();
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
      await api.put(`/api/add-on-applications/${app._id}/enable-form`, fd, true);
      toast.success('Product Approval Form enabled and sent to client!');
      setActionType(null);
      fetchApp();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const handleCreateLogsheet = () => {
    sessionStorage.setItem('addon_app_id', app._id);
    navigate(`/addon-applications/${app._id}/logsheet`);
  };

  const handleApproveForm = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${app._id}/approve-form`);
      toast.success('Product Form approved! Application is Ready for Certificate.');
      setActionType(null);
      fetchApp();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${app._id}/complete`);
      toast.success('Certificate updated! Add-on application complete.');
      setActionType(null);
      fetchApp();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return <div className="loading-overlay"><div className="spinner" /></div>;
  }

  if (!app) {
    return (
      <div className="animate-in" style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Add-on Application Not Found</h2>
        <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/addon-applications')}>
          <ArrowLeft size={16} /> Back to Add-on Applications
        </button>
      </div>
    );
  }

  const clientName = app.client_id?.company_name || app.client_id?.full_name || 'HFA Client';
  const certNo = app.certificate_id?.certificate_number || '—';
  const statusLabel = STATUS_LABELS[app.status] || app.status;
  const badgeClass = STATUS_BADGE[app.status] || 'badge-gray';

  const order = FLOW_STEPS.map(s => s.id);
  const currentIdx = order.indexOf(app.status);

  return (
    <div className="animate-in" style={{ paddingBottom: 40 }}>

      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/addon-applications')} style={{ padding: '8px 12px' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>{clientName}</h1>
              <span className={`badge ${badgeClass}`} style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
                {statusLabel}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Certificate: <strong>{certNo}</strong> &bull; Contact: <strong>{app.contact_name}</strong> ({app.contact_email}) &bull; Submitted {new Date(app.createdAt).toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        {/* Action Controls Header Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchApp}><RefreshCw size={14} /></button>

          {isManagerOrAdmin && app.status === 'submitted' && (
            <button className="btn btn-primary" onClick={() => setActionType('review')}>
              Accept Or Reject
            </button>
          )}

          {isManagerOrAdmin && ['accepted', 'ft_assigned'].includes(app.status) && (
            <button className="btn btn-primary" style={{ background: '#2563eb', borderColor: '#2563eb' }} onClick={() => {
              setActionType('assign_ft');
              const preSelected = (app.assigned_food_techs || []).map(ft => (ft._id || ft).toString());
              setSelectedFtIds(preSelected.length > 0 ? preSelected : (app.assigned_food_tech ? [(app.assigned_food_tech._id || app.assigned_food_tech).toString()] : []));
            }}>
              {app.status === 'ft_assigned' ? 'Re-assign FT Staff' : 'Assign FT Food Technologies'}
            </button>
          )}

          {isManagerOrAdmin && app.status === 'ft_assigned' && (
            <button className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }} onClick={() => navigate(`/addon-applications/${app._id}/approval-form`)}>
              Enable Product Approval Form
            </button>
          )}

          {app.status === 'product_approval_form_enabled' && (
            <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700, padding: '8px 14px', background: '#f5f3ff', borderRadius: 8, border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Awaiting Client Form Response
            </span>
          )}

          {isManagerOrAdmin && app.status === 'all_forms_received' && (
            <button className="btn btn-primary" style={{ background: '#0d9488', borderColor: '#0d9488' }} onClick={handleCreateLogsheet}>
              Create Logsheet
            </button>
          )}

          {isManagerOrAdmin && app.status === 'logsheet_created' && app.logsheet_id && (
            <button className="btn btn-outline" onClick={() => navigate(`/logsheets/${app.logsheet_id._id || app.logsheet_id}`)}>
              View Logsheet
            </button>
          )}

          {isManagerOrAdmin && ['logsheet_created', 'waiting_sharia_signature', 'all_forms_received'].includes(app.status) && (
            <button className="btn btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={() => setActionType('approve_form')}>
              Approve Product Form
            </button>
          )}

          {isManagerOrAdmin && app.status === 'ready_for_certificate' && (
            <button className="btn btn-primary" style={{ background: '#0e7490', borderColor: '#0e7490' }} onClick={() => setActionType('complete')}>
              Issue Certificate
            </button>
          )}

          {app.status === 'completed' && (
            <span className="badge badge-green" style={{ padding: '8px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} /> Certificate Updated
            </span>
          )}
        </div>
      </div>

      {/* ─── 10-Step Visual Flow Progress Card ───────────────────────────── */}
      <div className="card shadow-sm" style={{ padding: 20, marginBottom: 24, background: 'white', borderRadius: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
          <span>Track Progress</span>
          <span style={{ color: '#0f172a', fontWeight: 600, fontSize: 12 }}>Current Stage: {statusLabel}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {FLOW_STEPS.map((step, idx) => {
            const stepIdx = order.indexOf(step.id);
            const isDone = currentIdx > stepIdx || app.status === 'completed';
            const isCurrent = currentIdx === stepIdx && app.status !== 'completed';

            return (
              <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 80, textAlign: 'center', position: 'relative' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: isDone ? '#16a34a' : isCurrent ? '#2563eb' : '#f1f5f9',
                  border: isCurrent ? '2px solid #2563eb' : isDone ? '2px solid #16a34a' : '2px solid #cbd5e1',
                  color: isDone || isCurrent ? 'white' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, marginBottom: 6,
                  boxShadow: isCurrent ? '0 0 0 4px rgba(37,99,235,0.2)' : 'none',
                  transition: '0.2s'
                }}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <span style={{
                  fontSize: 10.5, fontWeight: isCurrent ? 800 : isDone ? 700 : 500,
                  color: isDone ? '#15803d' : isCurrent ? '#1d4ed8' : '#64748b',
                  lineHeight: 1.2
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Navigation Tabs ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 24, paddingBottom: 2 }}>
        {[
          { key: 'products', label: `Requested Products (${app.products?.length || 0})`, icon: Package },
          { key: 'details', label: 'Application Details', icon: Building2 },
          { key: 'form', label: 'Product Approval Form', icon: FileText },
          { key: 'history', label: `Workflow Log (${app.statusHistory?.length || 0})`, icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: isActive ? '2px solid #00853b' : '2px solid transparent',
                color: isActive ? '#00853b' : '#64748b',
                fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: 'pointer',
                transition: '0.15s'
              }}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: Products ────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <div className="card shadow-sm" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Multi-Product Request Table</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: 50, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>S/N</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Product Name</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Product Code</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Action Type</th>
                </tr>
              </thead>
              <tbody>
                {(app.products || []).map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#94a3b8' }}>{p.sn || idx + 1}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{p.code || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 6, fontWeight: 700,
                        background: p.type === 'Add product' ? '#f0fdf4' : p.type === 'Remove product' ? '#fef2f2' : '#f0f9ff',
                        color: p.type === 'Add product' ? '#166534' : p.type === 'Remove product' ? '#991b1b' : '#0369a1',
                        border: p.type === 'Add product' ? '1px solid #bbf7d0' : p.type === 'Remove product' ? '1px solid #fecaca' : '1px solid #bae6fd'
                      }}>
                        {p.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Details ────────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card shadow-sm" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Client & Contact Person</div>
            <div style={{ display: 'grid', gap: 14, fontSize: 13 }}>
              <div><span style={{ color: '#64748b' }}>Company / Client:</span> <strong style={{ color: '#0f172a' }}>{clientName}</strong></div>
              <div><span style={{ color: '#64748b' }}>Active Certificate:</span> <strong>{certNo}</strong></div>
              <div><span style={{ color: '#64748b' }}>Contact Person Name:</span> <strong>{app.contact_name}</strong></div>
              <div><span style={{ color: '#64748b' }}>Contact Person Email:</span> <strong>{app.contact_email}</strong></div>
              <div><span style={{ color: '#64748b' }}>Contact Person Phone:</span> <strong>{app.contact_phone || '—'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Assigned Food Tech:</span> <strong>{app.assigned_food_tech?.full_name || 'Not assigned yet'}</strong></div>
            </div>
          </div>

          <div className="card shadow-sm" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Client Message & Notes</div>
            {app.message ? (
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>
                {app.message}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#94a3b8', italic: 'true' }}>No additional client message provided.</div>
            )}

            {app.rejection_reason && (
              <div style={{ marginTop: 16, background: '#fef2f2', padding: 14, borderRadius: 10, border: '1px solid #fecaca', color: '#991b1b', fontSize: 13 }}>
                <strong>Rejection Reason:</strong> {app.rejection_reason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: Form ────────────────────────────────────────────── */}
      {activeTab === 'form' && (
        <div className="card shadow-sm" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Product Approval Form Management</span>
            {app.status === 'ft_assigned' && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/addon-applications/${app._id}/approval-form`)}>
                Enable / Edit Form Page
              </button>
            )}
          </div>

          {/* Admin Sent Form */}
          <div style={{ marginBottom: 24, background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Admin Form Document / Instructions</div>
            {app.product_approval_form?.form_file_url && (
              <a href={getPdfUrl(app.product_approval_form.form_file_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <FileText size={14} /> Download Admin Form PDF
              </a>
            )}
            {app.product_approval_form?.form_text ? (
              <div style={{ background: 'white', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>
                {app.product_approval_form.form_text}
              </div>
            ) : !app.product_approval_form?.form_file_url && (
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Product Approval Form has not been enabled yet.</div>
            )}
          </div>

          {/* Client Submitted Responses per Product */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Client Responses Per Product</div>
              {(() => {
                const prods = app.products || [];
                const resps = app.product_approval_form?.product_responses || [];
                const saved = prods.filter((_, idx) => resps.some(r => r.product_index === idx && r.is_saved)).length;
                return (
                  <span className={`badge ${saved === prods.length && prods.length > 0 ? 'badge-green' : 'badge-purple'}`} style={{ fontSize: 11, fontWeight: 700 }}>
                    {saved} of {prods.length} PRODUCTS RESPONDED
                  </span>
                );
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(app.products || []).map((p, idx) => {
                const resp = (app.product_approval_form?.product_responses || []).find(r => r.product_index === idx);
                const isSaved = resp?.is_saved;

                return (
                  <div key={idx} style={{ padding: 16, borderRadius: 10, background: isSaved ? '#f0fdf4' : '#fafbfc', border: isSaved ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        Product #{idx + 1}: {p.name} {p.code ? `(${p.code})` : ''}
                      </div>
                      {isSaved ? (
                        <span className="badge badge-green" style={{ fontSize: 10, fontWeight: 700 }}>
                          <Check size={11} style={{ marginRight: 2 }} /> RESPONDED
                        </span>
                      ) : (
                        <span className="badge badge-gray" style={{ fontSize: 10, fontWeight: 700 }}>
                          AWAITING RESPONSE
                        </span>
                      )}
                    </div>

                    {isSaved ? (
                      <div style={{ fontSize: 13, color: '#334155' }}>
                        {resp.response_text && (
                          <div style={{ background: 'white', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                            {resp.response_text}
                          </div>
                        )}
                        {resp.response_url && (
                          <a href={getPdfUrl(resp.response_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white' }}>
                            <Download size={13} /> View Attached Response File
                          </a>
                        )}
                        {!resp.response_text && !resp.response_url && (
                          <div style={{ color: '#166534', italic: 'true', fontSize: 12 }}>Acknowledged.</div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>Client has not saved a response for this product yet.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: History ────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="card shadow-sm" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Chronological Workflow History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(app.statusHistory || []).map((h, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 14, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00853b', marginTop: 4 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    {STATUS_LABELS[h.status] || h.status}
                  </div>
                  {h.note && <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{h.note}</div>}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {new Date(h.changedAt).toLocaleString('en-GB')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── ACTION MODALS ────────────────────────────────────────────── */}

      {/* 1. Review (Accept Or Reject) Modal */}
      {actionType === 'review' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Accept Or Reject Application</span>
              <button className="modal-close" onClick={() => setActionType(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 16 }}>
              <div>
                <label className="form-label">Decision</label>
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, color: '#166534' }}>
                    <input type="radio" name="decision" value="accepted" checked={decision === 'accepted'} onChange={() => setDecision('accepted')} />
                    Accept Application
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, color: '#991b1b' }}>
                    <input type="radio" name="decision" value="rejected" checked={decision === 'rejected'} onChange={() => setDecision('rejected')} />
                    Reject Application
                  </label>
                </div>
              </div>

              {decision === 'rejected' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Rejection Reason <span>*</span></label>
                  <textarea className="form-control" rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Specify why the add-on application is rejected..." required />
                </div>
              )}

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Internal Admin Notes</label>
                <textarea className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional internal notes..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActionType(null)} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReview} disabled={submitting}>
                {submitting ? 'Saving...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Assign FT Modal — Multi-Select */}
      {actionType === 'assign_ft' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <span className="modal-title">Assign Food Technologies Staff</span>
              <button className="modal-close" onClick={() => setActionType(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div className="form-group" style={{ margin: 0 }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
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
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#1d4ed8' : '#0f172a' }}>{ft.full_name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{ft.email}</div>
                          </div>
                          {isSelected && <Check size={14} style={{ color: '#2563eb' }} />}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActionType(null)} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignFt} disabled={submitting || selectedFtIds.length === 0}
                style={{ background: '#2563eb', borderColor: '#2563eb' }}>
                {submitting ? 'Assigning...' : `Assign ${selectedFtIds.length > 0 ? selectedFtIds.length : ''} FT Staff`}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 3. Enable Product Approval Form Modal */}
      {actionType === 'enable_form' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">Enable Product Approval Form</span>
              <button className="modal-close" onClick={() => setActionType(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 16 }}>
              <div style={{ fontSize: 13, color: '#475569' }}>
                Upload a form document (PDF) OR write form content below to send to the client.
              </div>

              <div>
                <label className="form-label">Upload Form Document (PDF/Image)</label>
                <input type="file" accept=".pdf,image/*" onChange={e => setFormFile(e.target.files[0] || null)} className="form-control" />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Form Content / Instructions Text</label>
                <textarea className="form-control" rows={5} value={formText} onChange={e => setFormText(e.target.value)} placeholder="Type specific instructions or requirements for the client..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActionType(null)} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEnableForm} disabled={submitting || (!formText.trim() && !formFile)}>
                {submitting ? 'Enabling...' : 'Enable & Send to Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Approve Form Modal */}
      {actionType === 'approve_form' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">Approve Product Form</span>
              <button className="modal-close" onClick={() => setActionType(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>
                Are you sure you want to approve the Product Form for this application? This will transition the application status to <strong>Product Form Approved & Ready for Certificate</strong>.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActionType(null)} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApproveForm} disabled={submitting}>
                {submitting ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Complete / Issue Certificate Modal */}
      {actionType === 'complete' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Issue / Update Certificate</span>
              <button className="modal-close" onClick={() => setActionType(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>
                Completing this application will automatically update the product list on Certificate <strong>{certNo}</strong> and regenerate the official certificate document.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActionType(null)} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleComplete} disabled={submitting}>
                {submitting ? 'Updating Certificate...' : 'Complete & Update Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
