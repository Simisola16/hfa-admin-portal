import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, X, RefreshCw,
  Building2, FileText, User, Calendar, Shield,
  ChevronRight, AlertCircle, Clock, Package, Upload, Download, Check, Eye, ClipboardList, Award, Users
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../lib/pdfUtils';
import { useAuth } from '../context/AuthContext';
import ProductApprovalModal from '../components/ProductApprovalModal';

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
  const [refreshing, setRefreshing] = useState(false);
  const [ftUsers, setFtUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Modal Action states
  const [actionType, setActionType] = useState(null); // 'review' | 'assign_ft' | 'enable_form' | 'approve_form' | 'complete'
  const [decision, setDecision] = useState('accepted');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFtIds, setSelectedFtIds] = useState([]);
  const [formText, setFormText] = useState('');
  const [formFile, setFormFile] = useState(null);
  const [viewProductModal, setViewProductModal] = useState({ isOpen: false, formData: null, product: null, company: null });

  const toggleFt = (ftId) => {
    setSelectedFtIds(prev =>
      prev.includes(ftId) ? prev.filter(id => id !== ftId) : [...prev, ftId]
    );
  };

  const isManagerOrAdmin = ['admin', 'superadmin', 'food_tech_manager'].includes(user?.role);

  const fetchApp = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
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
      setRefreshing(false);
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
      fetchApp(true);
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
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const handleRequestProductApprovalForm = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${app._id}/enable-form`, {
        form_text: 'Please complete and submit the Product Approval Form for each product.',
        is_draft: false
      });
      toast.success('Request for Product Approval Form sent to client successfully!');
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnableForm = async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (formFile) fd.append('form_file', formFile);
      if (formText.trim()) fd.append('form_text', formText);
      await api.put(`/api/add-on-applications/${app._id}/enable-form`, fd, true);
      toast.success('Request for Product Approval Form sent to client!');
      setActionType(null);
      fetchApp(true);
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
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const certId = app.certificate_id?._id || app.certificate_id;
      await api.put(`/api/add-on-applications/${app._id}/complete`, { certificate_id: certId });
      toast.success('Certificate updated! Add-on application complete.');
      setActionType(null);
      fetchApp(true);
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
  const statusLabel = STATUS_LABELS[app.status] || (app.status || '').replace(/_/g, ' ');
  const badgeClass = STATUS_BADGE[app.status] || 'badge-gray';

  const order = FLOW_STEPS.map(s => s.id);
  const currentIdx = order.indexOf(app.status);

  // Status History Lookup
  const historyMap = {};
  (app.statusHistory || []).forEach(entry => {
    if (!historyMap[entry.status]) {
      historyMap[entry.status] = entry;
    }
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // Render Primary Action Buttons
  const renderPrimaryActionButtons = () => {
    if (!isManagerOrAdmin) return null;

    if (app.status === 'submitted') {
      return (
        <button className="btn btn-primary" onClick={() => setActionType('review')}>
          <CheckCircle size={16} style={{ marginRight: 6 }} /> Accept Or Reject
        </button>
      );
    }

    if (app.status === 'accepted') {
      return (
        <button className="btn btn-primary" style={{ background: '#2563eb', borderColor: '#2563eb' }} onClick={() => {
          setActionType('assign_ft');
          const preSelected = (app.assigned_food_techs || []).map(ft => (ft._id || ft).toString());
          setSelectedFtIds(preSelected.length > 0 ? preSelected : (app.assigned_food_tech ? [(app.assigned_food_tech._id || app.assigned_food_tech).toString()] : []));
        }}>
          <Users size={16} style={{ marginRight: 6 }} /> Assign FT Staff
        </button>
      );
    }

    if (app.status === 'ft_assigned') {
      return (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" style={{ border: '1.5px solid #cbd5e1' }} onClick={() => {
            setActionType('assign_ft');
            const preSelected = (app.assigned_food_techs || []).map(ft => (ft._id || ft).toString());
            setSelectedFtIds(preSelected.length > 0 ? preSelected : (app.assigned_food_tech ? [(app.assigned_food_tech._id || app.assigned_food_tech).toString()] : []));
          }}>
            <Users size={15} style={{ marginRight: 4 }} /> Re-assign FT
          </button>
          <button
            className="btn btn-primary"
            style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
            disabled={submitting}
            onClick={handleRequestProductApprovalForm}
          >
            <FileText size={16} style={{ marginRight: 6 }} /> Request for Product Approval Form
          </button>
        </div>
      );
    }

    if (app.status === 'product_approval_form_enabled') {
      return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-ghost" style={{ border: '1.5px solid #cbd5e1' }} onClick={() => navigate(`/addon-applications/${app._id}/approval-form`)}>
            <Eye size={15} style={{ marginRight: 6 }} /> View Form Template
          </button>
          <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700, padding: '8px 14px', background: '#f5f3ff', borderRadius: 8, border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} /> Awaiting Client Form Responses
          </span>
        </div>
      );
    }

    if (app.status === 'all_forms_received') {
      return (
        <button className="btn btn-primary" style={{ background: '#0d9488', borderColor: '#0d9488' }} onClick={handleCreateLogsheet}>
          <ClipboardList size={16} style={{ marginRight: 6 }} /> Create Logsheet
        </button>
      );
    }

    if (app.status === 'logsheet_created') {
      return (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ background: '#0e7490', borderColor: '#0e7490' }} onClick={() => navigate(`/addon-applications/${app._id}/logsheet`)}>
            <ClipboardList size={16} style={{ marginRight: 6 }} /> Manage Logsheet
          </button>
          <button className="btn btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={() => setActionType('approve_form')}>
            <CheckCircle size={16} style={{ marginRight: 6 }} /> Approve Product Form
          </button>
        </div>
      );
    }

    if (app.status === 'waiting_sharia_signature') {
      return (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ background: '#ea580c', borderColor: '#ea580c' }} onClick={() => navigate(`/addon-applications/${app._id}/logsheet`)}>
            <ClipboardList size={16} style={{ marginRight: 6 }} /> View & Sign Logsheet
          </button>
        </div>
      );
    }

    if (app.status === 'product_form_approved' || app.status === 'ready_for_certificate') {
      return (
        <button className="btn btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={() => setActionType('complete')}>
          <Award size={16} style={{ marginRight: 6 }} /> Issue / Update Certificate
        </button>
      );
    }

    if (app.status === 'completed') {
      return (
        <span className="badge badge-green" style={{ padding: '8px 16px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={15} /> Certificate Updated & Endorsed
        </span>
      );
    }

    return null;
  };

  return (
    <div className="page-content">
      {/* ─── Header Section matching ApplicationProcessing.jsx ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/addon-applications')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 2 }}>
            Add-On Application Processing
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {clientName}
            </h1>
            <span className={`badge ${badgeClass}`} style={{ fontSize: 12 }}>
              {statusLabel}
            </span>
            {refreshing && <RefreshCw size={14} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Certificate: <strong>{certNo}</strong> &middot; Contact: <strong>{app.contact_name}</strong> ({app.contact_email}) &middot; Submitted {new Date(app.createdAt || app.created_at).toLocaleDateString('en-GB')}
          </div>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={() => fetchApp(true)} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ─── Top Action Required Banner matching ApplicationProcessing.jsx ─── */}
      {app.status !== 'completed' && (
        <div style={{
          background: 'white', border: '1px solid var(--border)', borderRadius: 12,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
              Add-On Application Action Required
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {app.status === 'submitted' && 'Review the requested product list and accept or reject the application below.'}
              {app.status === 'accepted' && 'Assign Food Technologies staff member(s) to verify product formulations and ingredients.'}
              {app.status === 'ft_assigned' && 'Configure and enable the Product Approval Form for client submission.'}
              {app.status === 'product_approval_form_enabled' && 'The Product Approval Form has been enabled. Awaiting client product details submission.'}
              {app.status === 'all_forms_received' && 'All product forms have been received from client. Generate Halal Logsheet to proceed to Shariah committee review.'}
              {['logsheet_created', 'waiting_sharia_signature'].includes(app.status) && 'Halal Logsheet is in technical & Shariah committee review.'}
              {['product_form_approved', 'ready_for_certificate'].includes(app.status) && 'Product approval complete. Issue updated certificate to finalize application.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {renderPrimaryActionButtons()}
          </div>
        </div>
      )}

      {/* ─── Main 2-Column Grid (1fr 380px) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        
        {/* ── LEFT COLUMN: Core Content Cards Stack ── */}
        <div style={{ display: 'grid', gap: 20 }}>
          
          {/* Card 1: Requested Products Table */}
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={18} style={{ color: '#1d4ed8' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                    Requested Products ({app.products?.length || 0})
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Multi-Product Request Table for Certificate Endorsement
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'center', width: 50, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>S/N</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Product Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Product Code</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Action Type</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Client Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(app.products || []).map((p, idx) => {
                      const resp = (app.product_approval_form?.product_responses || []).find(r => r.product_index === idx);
                      const isSaved = resp?.is_saved;

                      return (
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
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {isSaved ? (
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                  background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                                  fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                                  display: 'inline-flex', alignItems: 'center', gap: 4
                                }}
                                onClick={() => setViewProductModal({
                                  isOpen: true,
                                  formData: resp.form_data && Object.keys(resp.form_data).length > 0 ? resp.form_data : {
                                    product_name: p.name,
                                    product_code: p.code,
                                    company_name_address: app.client_id?.company_name
                                  },
                                  product: p,
                                  company: app.client_id
                                })}
                              >
                                <Eye size={12} /> View Filled Form
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Pending Response</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 2: Product Approval Form Management */}
          {!['logsheet_created', 'logsheet_signed', 'payment_received', 'ready_for_certificate', 'completed'].includes(app.status) && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} style={{ color: '#7c3aed' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                    Product Approval Form Management
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Specifications, ingredient breakdowns & submission records
                  </div>
                </div>
              </div>

              {isManagerOrAdmin && app.status === 'ft_assigned' && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
                  disabled={submitting}
                  onClick={handleRequestProductApprovalForm}
                >
                  Request for Product Approval Form
                </button>
              )}
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Form template download / instructions */}
              <div style={{ marginBottom: 20, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                  Admin Form Document / Instructions
                </div>
                {app.product_approval_form?.form_file_url && (
                  <a href={getPdfUrl(app.product_approval_form.form_file_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, background: 'white' }}>
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

              {/* Client Responses summary */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Client Responses Per Product
                  </div>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(app.products || []).map((p, idx) => {
                    const resp = (app.product_approval_form?.product_responses || []).find(r => r.product_index === idx);
                    const isSaved = resp?.is_saved;

                    return (
                      <div key={idx} style={{ padding: 14, borderRadius: 10, background: isSaved ? '#f0fdf4' : '#fafbfc', border: isSaved ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
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
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ background: '#164e63', borderColor: '#164e63', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 11.5 }}
                              onClick={() => setViewProductModal({
                                isOpen: true,
                                formData: resp.form_data && Object.keys(resp.form_data).length > 0 ? resp.form_data : {
                                  product_name: p.name,
                                  product_code: p.code,
                                  company_name_address: app.client_id?.company_name
                                },
                                product: p,
                                company: app.client_id
                              })}
                            >
                              <Eye size={13} /> View Filled Product Approval Form
                            </button>

                            {resp.response_url && (
                              <a href={getPdfUrl(resp.response_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', fontSize: 11.5 }}>
                                <Download size={13} /> Attached PDF
                              </a>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>Client has not submitted specifications for this product yet.</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Card 3: Halal Logsheet Review */}
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList size={18} style={{ color: '#0d9488' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                    Halal LogSheet Review
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Technical & Shariah committee evaluation & endorsement
                  </div>
                </div>
              </div>

              {app.logsheet_id ? (
                <button className="btn btn-outline btn-sm" onClick={() => navigate(`/addon-applications/${app._id}/logsheet`)}>
                  Manage Logsheet
                </button>
              ) : isManagerOrAdmin && app.status === 'all_forms_received' ? (
                <button className="btn btn-primary btn-sm" style={{ background: '#0d9488', borderColor: '#0d9488' }} onClick={handleCreateLogsheet}>
                  Create Logsheet
                </button>
              ) : null}
            </div>

            <div style={{ padding: '20px 24px' }}>
              {app.logsheet_id ? (
                <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', padding: '16px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Logsheet Generated
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#134e4a', marginTop: 2 }}>
                      Halal Committee Review in Progress
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ background: '#0d9488', borderColor: '#0d9488' }} onClick={() => navigate(`/addon-applications/${app._id}/logsheet`)}>
                    Open Logsheet
                  </button>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '20px', borderRadius: 12, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  LogSheet will be generated after product approval forms are submitted by client.
                </div>
              )}
            </div>
          </div>

          {/* Client Notes (if provided) */}
          {(app.message || app.rejection_reason) && (
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Client Notes & Feedback</div>
              {app.message && (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {app.message}
                </div>
              )}
              {app.rejection_reason && (
                <div style={{ marginTop: 12, background: '#fef2f2', padding: 14, borderRadius: 10, border: '1px solid #fecaca', color: '#991b1b', fontSize: 13 }}>
                  <strong>Rejection Reason:</strong> {app.rejection_reason}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN: Sidebar (Timeline & Company Info) ── */}
        <div>
          
          {/* Stepper Timeline Card matching ApplicationProcessing.jsx */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Processing Timeline</div>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <div style={{ padding: '8px 0' }}>
                {FLOW_STEPS.map((step, idx) => {
                  const stepIdx = order.indexOf(step.id);
                  const isDone = currentIdx > stepIdx || app.status === 'completed';
                  const isCurrent = currentIdx === stepIdx && app.status !== 'completed';
                  const isPending = !isDone && !isCurrent;
                  const isLast = idx === FLOW_STEPS.length - 1;
                  const histEntry = historyMap[step.id];

                  let circleColor = isDone ? '#15803d' : isCurrent ? '#2563eb' : '#cbd5e1';
                  let labelColor = isDone ? '#0f172a' : isCurrent ? '#0f172a' : '#94a3b8';

                  return (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                      {/* Left: circle + vertical line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
                        <div style={{
                          width: 32, height: 32,
                          borderRadius: '50%',
                          background: isDone ? '#15803d' : isCurrent ? '#2563eb' : '#f1f5f9',
                          border: isCurrent ? `3px solid #2563eb` : `2px solid ${isDone ? '#15803d' : '#e2e8f0'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: isCurrent ? `0 0 0 4px rgba(37, 99, 235, 0.18)` : 'none',
                          position: 'relative',
                          zIndex: 1,
                        }}>
                          {isDone ? (
                            <CheckCircle size={16} color="white" strokeWidth={2.5} />
                          ) : isCurrent ? (
                            <div style={{
                              width: 12, height: 12, borderRadius: '50%',
                              background: 'white',
                              animation: 'pulse 1.5s ease-in-out infinite',
                            }} />
                          ) : (
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#cbd5e1' }} />
                          )}
                        </div>
                        {!isLast && (
                          <div style={{
                            width: 2,
                            flex: 1,
                            minHeight: 40,
                            background: isDone ? '#86efac' : '#e2e8f0',
                            margin: '2px 0',
                          }} />
                        )}
                      </div>

                      {/* Right: content */}
                      <div style={{
                        marginLeft: 12,
                        paddingBottom: isLast ? 0 : 24,
                        flex: 1,
                        paddingTop: 4,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 13,
                            fontWeight: isCurrent ? 800 : isDone ? 700 : 500,
                            color: labelColor,
                          }}>
                            {step.label}
                          </span>
                          {isCurrent && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                              letterSpacing: '0.06em', color: '#1d4ed8',
                              background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 20,
                            }}>
                              Current
                            </span>
                          )}
                        </div>

                        {(isDone || isCurrent) && histEntry && (
                          <div style={{ marginTop: 4 }}>
                            {histEntry.changedAt && (
                              <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={10} />
                                {formatDate(histEntry.changedAt)}
                              </div>
                            )}
                            {histEntry.note && (
                              <div style={{
                                marginTop: 4, fontSize: 12, color: '#475569',
                                fontStyle: 'italic', background: '#f8fafc',
                                padding: '4px 10px', borderRadius: 6,
                                borderLeft: '3px solid #cbd5e1',
                              }}>
                                {histEntry.note}
                              </div>
                            )}
                          </div>
                        )}

                        {isPending && (
                          <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Pending</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Company Info Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Company Info</div>
            </div>
            <div className="card-body" style={{ padding: '20px 24px', display: 'grid', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Company / Client</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{clientName}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Active Certificate No.</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', marginTop: 2 }}>{certNo}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Contact Person</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{app.contact_name}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Email</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{app.contact_email}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Phone</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{app.contact_phone || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Submitted Date</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>
                  {new Date(app.createdAt || app.created_at).toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Food Techs Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Assigned Food Techs</div>
              {isManagerOrAdmin && ['accepted', 'ft_assigned', 'product_approval_form_enabled'].includes(app.status) && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11.5, color: 'var(--primary)' }}
                  onClick={() => {
                    setActionType('assign_ft');
                    const preSelected = (app.assigned_food_techs || []).map(ft => (ft._id || ft).toString());
                    setSelectedFtIds(preSelected.length > 0 ? preSelected : (app.assigned_food_tech ? [(app.assigned_food_tech._id || app.assigned_food_tech).toString()] : []));
                  }}
                >
                  Manage
                </button>
              )}
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              {(app.assigned_food_techs?.length > 0 || app.assigned_food_tech) ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {(app.assigned_food_techs && app.assigned_food_techs.length > 0
                    ? app.assigned_food_techs
                    : [app.assigned_food_tech]
                  ).filter(Boolean).map((ft, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#1d4ed8', fontSize: 12 }}>
                        {(ft.full_name || ft.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{ft.full_name || 'FT Specialist'}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{ft.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                  No Food Technologies staff assigned yet.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ─── ACTION MODALS ────────────────────────────────────────────── */}

      {/* 1. Review (Accept Or Reject) Modal */}
      {actionType === 'review' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Accept Or Reject Add-On Application</span>
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

      {/* Product Approval Request Form Full 3-Page Modal Viewer */}
      <ProductApprovalModal
        isOpen={viewProductModal.isOpen}
        onClose={() => setViewProductModal(prev => ({ ...prev, isOpen: false }))}
        formData={viewProductModal.formData}
        product={viewProductModal.product}
        company={viewProductModal.company}
      />
    </div>
  );
}
