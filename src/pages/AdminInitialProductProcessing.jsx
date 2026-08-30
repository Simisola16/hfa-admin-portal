import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, RefreshCw,
  Building2, FileText, User, Calendar, Shield,
  ChevronRight, AlertCircle, Clock, Package, Download, Eye, ClipboardList,
  Award, Users, Check, ExternalLink, Sparkles, Send, Upload, Edit, FileSpreadsheet, Plus, X,
  Phone, Mail, MapPin
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../lib/pdfUtils';
import { useAuth } from '../context/AuthContext';
import ProductApprovalRequestForm from '../components/ProductApprovalRequestForm';
import InitialProductTimeline, { INITIAL_PRODUCT_STAGES, INITIAL_PRODUCT_ORDER } from '../components/InitialProductTimeline';

export default function AdminInitialProductProcessing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [app, setApp] = useState(null);
  const [ftUsers, setFtUsers] = useState([]);
  const [logsheets, setLogsheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Direct Assign FT Modal
  const [showFtModal, setShowFtModal] = useState(false);
  const [selectedFtIds, setSelectedFtIds] = useState([]);
  const [customFtName, setCustomFtName] = useState('');
  const [customFtEmail, setCustomFtEmail] = useState('');
  const [customFtNotes, setCustomFtNotes] = useState('');
  const [savingFt, setSavingFt] = useState(false);

  // Enable Form Modal / Fields
  const [showEnableFormModal, setShowEnableFormModal] = useState(false);
  const [formText, setFormText] = useState('');
  const [formFile, setFormFile] = useState(null);
  const [savingEnableForm, setSavingEnableForm] = useState(false);

  // Request More Info Modal
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [infoFile, setInfoFile] = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);

  // View Submitted Form Modal
  const [showFormModal, setShowFormModal] = useState(false);

  // Create Logsheet Modal
  const [showLogsheetModal, setShowLogsheetModal] = useState(false);
  const [logsheetRemarks, setLogsheetRemarks] = useState('');
  const [savingLogsheet, setSavingLogsheet] = useState(false);

  // Direct Approve Form
  const [approving, setApproving] = useState(false);

  const isManagerOrAdmin = ['admin', 'superadmin', 'food_tech_manager'].includes(user?.role);

  const fetchApp = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const [appRes, usersRes, logsheetsRes] = await Promise.all([
        api.get(`/api/initial-products/${id}`),
        isManagerOrAdmin ? api.get('/api/users').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        api.get(`/api/application-logsheets?initial_product_application_id=${id}`).catch(() => ({ data: { data: [] } }))
      ]);

      const loadedApp = appRes.data?.data || appRes.data;
      setApp(loadedApp);

      const rawUsers = Array.isArray(usersRes) ? usersRes : (Array.isArray(usersRes?.data?.data) ? usersRes.data.data : (Array.isArray(usersRes?.data) ? usersRes.data : []));
      setFtUsers(rawUsers.filter(u => u && (u.role === 'food_tech' || (Array.isArray(u.roles) && u.roles.includes('food_tech')))));

      const loadedLogs = logsheetsRes.data?.data || (Array.isArray(logsheetsRes.data) ? logsheetsRes.data : []);
      setLogsheets(loadedLogs);

      // Pre-fill FT modal state
      const preSelected = (loadedApp.assigned_food_techs || []).map(ft => (ft._id || ft).toString());
      setSelectedFtIds(preSelected.length > 0 ? preSelected : (loadedApp.assigned_food_tech ? [(loadedApp.assigned_food_tech._id || loadedApp.assigned_food_tech).toString()] : []));
      setCustomFtName(loadedApp.assigned_ft_custom?.name || loadedApp.assigned_ft_details || '');
      setCustomFtEmail(loadedApp.assigned_ft_custom?.email || '');
      setCustomFtNotes(loadedApp.assigned_ft_custom?.notes || '');
    } catch (err) {
      toast.error('Failed to load Initial Product processing data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, isManagerOrAdmin]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  // Handler: Assign FT (Directly, no accept/reject)
  const handleAssignFt = async () => {
    if (selectedFtIds.length === 0 && !customFtName.trim()) {
      return toast.error('Please select at least one FT or enter specialist details.');
    }
    setSavingFt(true);
    try {
      await api.put(`/api/initial-products/${id}/assign-ft`, {
        assigned_food_techs: selectedFtIds,
        custom_ft_name: customFtName.trim(),
        custom_ft_email: customFtEmail.trim(),
        custom_ft_notes: customFtNotes.trim(),
        assigned_ft_details: customFtName.trim()
      });
      toast.success('Food Technologies specialist assigned!');
      setShowFtModal(false);
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to assign FT');
    } finally {
      setSavingFt(false);
    }
  };

  // Handler: Enable Form
  const handleEnableForm = async () => {
    setSavingEnableForm(true);
    try {
      const fd = new FormData();
      fd.append('form_text', formText);
      if (formFile) fd.append('form_file', formFile);

      await api.put(`/api/initial-products/${id}/enable-form`, fd, true);
      toast.success('Product Approval Form enabled for client!');
      setShowEnableFormModal(false);
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to enable form');
    } finally {
      setSavingEnableForm(false);
    }
  };

  // Handler: Request More Info
  const handleRequestInfo = async () => {
    if (!infoMessage.trim()) return toast.error('Please provide a message for the client.');
    setSavingInfo(true);
    try {
      const fd = new FormData();
      fd.append('message', infoMessage);
      if (infoFile) fd.append('file', infoFile);

      await api.put(`/api/initial-products/${id}/request-info`, fd, true);
      toast.success('Information request sent to client.');
      setShowInfoModal(false);
      setInfoMessage('');
      setInfoFile(null);
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to request info');
    } finally {
      setSavingInfo(false);
    }
  };

  // Handler: Create Logsheet
  const handleCreateLogsheet = async () => {
    setSavingLogsheet(true);
    try {
      await api.post(`/api/initial-products/${id}/create-logsheet`, {
        remarks: logsheetRemarks
      });
      toast.success('Logsheet created for Committee Review!');
      setShowLogsheetModal(false);
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create logsheet');
    } finally {
      setSavingLogsheet(false);
    }
  };

  // Handler: Direct Approve Form -> Initial Product Approved
  const handleApproveForm = async () => {
    if (!window.confirm('Are you sure you want to mark this Initial Product as Approved? This completes product halal evaluation and activates it in the product registry.')) {
      return;
    }
    setApproving(true);
    try {
      await api.put(`/api/initial-products/${id}/approve-form`);
      toast.success('🎉 Initial Product Approved successfully!');
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to approve initial product');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Loading Initial Product Processing...</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
        <h3>Initial Product Not Found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/admin/initial-products')} style={{ marginTop: 12 }}>
          Back to Initial Products
        </button>
      </div>
    );
  }

  const isApproved = app.status === 'initial_product_approved';
  const siteName = app.site_id?.name || app.application_id?.site_name || app.application_id?.establishment_name || 'Main Facility';
  const compName = app.client_id?.company_name || app.client_id?.full_name || 'Client';
  const ftNames = [
    ...(app.assigned_food_techs || []).map(ft => ft.full_name || ft.email),
    app.assigned_ft_custom?.name || app.assigned_ft_details
  ].filter(Boolean);

  const productResp = app.product_approval_form?.product_response;
  const isFormEnabled = ['product_approval_form_enabled', 'all_forms_received', 'logsheet_created', 'waiting_sharia_signature', 'initial_product_approved'].includes(app.status);
  const isFormReceived = ['all_forms_received', 'logsheet_created', 'waiting_sharia_signature', 'initial_product_approved'].includes(app.status);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 80 }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/admin/initial-products')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <ArrowLeft size={16} /> Back to Initial Products
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => fetchApp(true)}
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Header Info Card */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '24px 28px', marginBottom: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: isApproved ? '#dcfce7' : '#ecfdf5', border: `1.5px solid ${isApproved ? '#86efac' : '#a7f3d0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={28} style={{ color: isApproved ? '#16a34a' : '#059669' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  {app.product?.name}
                </h1>
                {app.product?.code && (
                  <span style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, fontWeight: 700, color: '#475569' }}>
                    {app.product.code}
                  </span>
                )}
                <span style={{ fontSize: 12, background: isApproved ? '#dcfce7' : '#f0fdf4', color: isApproved ? '#166534' : '#065f46', border: `1px solid ${isApproved ? '#bbf7d0' : '#a7f3d0'}`, padding: '3px 10px', borderRadius: 20, fontWeight: 800 }}>
                  {isApproved ? 'Initial Product Approved 🎉' : app.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
                <span>Client: <strong>{compName}</strong></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={14} style={{ color: '#059669' }} />
                  Facility: <strong>{siteName}</strong>
                </span>
                {app.application_id?.application_number && (
                  <span>Application: <strong>#{app.application_id.application_number}</strong></span>
                )}
                <span>Submitted: <strong>{new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Celebratory Approved Banner (stops here without cert issuance) */}
      {isApproved && (
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '2px solid #86efac', borderRadius: 18, padding: '22px 26px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
            <Sparkles size={26} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#14532d' }}>
              Initial Product Approved &bull; Halal Processing Complete! 🎉
            </div>
            <div style={{ fontSize: 13, color: '#166534', marginTop: 3, lineHeight: 1.5 }}>
              Initial product processing terminates at <strong>Initial Product Approved</strong>. The product has been synchronized into the client's verified product directory.
            </div>
          </div>
        </div>
      )}

      {/* ─── Main 2-Column Grid Layout (1fr 380px) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        
        {/* ── LEFT COLUMN: Workflow Processing Cards Stack ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* SECTION 1: Product Information */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} style={{ color: '#059669' }} />
              1. Registered Initial Product (Single Item)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Product Name</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{app.product?.name}</div>
                {app.product?.code && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Code: <code>{app.product.code}</code></div>
                )}
                {app.product?.category && (
                  <div style={{ fontSize: 12, color: '#0284c7', marginTop: 4, fontWeight: 600 }}>Category: {app.product.category}</div>
                )}
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Ingredients &amp; Sourcing</div>
                <div style={{ fontSize: 12.5, color: '#334155', marginTop: 4, lineHeight: 1.45 }}>
                  {app.product?.ingredients || 'No ingredients summary provided.'}
                </div>
              </div>
            </div>

            {app.product?.description && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12.5, color: '#475569' }}>
                <strong>Description / Notes:</strong> {app.product.description}
              </div>
            )}
          </div>

          {/* SECTION 2: Food Technologist Direct Assignment (NO ACCEPT/REJECT) */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={18} style={{ color: '#2563eb' }} />
                2. Food Technologist Assignment (Direct Assignment)
              </div>

              {isManagerOrAdmin && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowFtModal(true)}
                  style={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <User size={14} /> {ftNames.length > 0 ? 'Edit FT Assignment' : 'Assign FT'}
                </button>
              )}
            </div>

            <div style={{ padding: '16px 20px', background: ftNames.length > 0 ? '#f0f9ff' : '#fffbeb', borderRadius: 12, border: `1px solid ${ftNames.length > 0 ? '#bae6fd' : '#fde68a'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: ftNames.length > 0 ? '#0369a1' : '#92400e' }}>
                  Assigned Specialist(s)
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: ftNames.length > 0 ? '#0c4a6e' : '#78350f', marginTop: 3 }}>
                  {ftNames.length > 0 ? ftNames.join(', ') : 'No Food Technologist assigned yet.'}
                </div>
                {app.assigned_ft_custom?.notes && (
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                    Notes: {app.assigned_ft_custom.notes}
                  </div>
                )}
              </div>

              {ftNames.length === 0 && isManagerOrAdmin && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowFtModal(true)}
                  style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 800 }}
                >
                  Assign FT Now &rarr;
                </button>
              )}
            </div>
          </div>

          {/* SECTION 3: Product Approval Form */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} style={{ color: '#7c3aed' }} />
                3. Product Approval Form &amp; Technical Formulation
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {!isFormEnabled && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowEnableFormModal(true)}
                    style={{ background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <Send size={14} /> Enable Form for Client
                  </button>
                )}

                {isFormEnabled && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowEnableFormModal(true)}
                    style={{ fontSize: 12, fontWeight: 700 }}
                  >
                    Edit Form Settings
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 20px', background: '#fafafa', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Status</div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: isFormReceived ? '#166534' : isFormEnabled ? '#6b21a8' : '#64748b', marginTop: 2 }}>
                    {isFormReceived ? '✓ Client Form Response Received' : isFormEnabled ? 'Form Enabled — Awaiting Client Response' : 'Not Enabled Yet'}
                  </div>
                </div>

                {productResp?.is_saved && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowFormModal(true)}
                      style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Eye size={14} /> View Form Response
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowInfoModal(true)}
                      style={{ fontWeight: 700, color: '#d97706', borderColor: '#fde68a', background: '#fffbeb', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <AlertCircle size={14} /> Request More Info
                    </button>
                  </div>
                )}
              </div>

              {app.product_approval_form?.form_file_url && (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <a
                    href={getPdfUrl(app.product_approval_form.form_file_url)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#0284c7' }}
                  >
                    <Download size={14} /> Download Uploaded Reference Document
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: Committee Logsheet & Final Approval */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={18} style={{ color: '#059669' }} />
                4. Committee Logsheet &amp; Final Approval
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowLogsheetModal(true)}
                  style={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <Plus size={14} /> Create Logsheet
                </button>
                {!isApproved && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleApproveForm}
                    disabled={approving}
                    style={{ background: '#166534', borderColor: '#166534', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <Sparkles size={14} /> Approve Initial Product
                  </button>
                )}
              </div>
            </div>

            {logsheets.length === 0 ? (
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
                No logsheet created for this Initial Product yet. Click <strong>Create Logsheet</strong> to initiate Shari'a &amp; Technical committee sign-offs.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {logsheets.map(ls => (
                  <div key={ls._id} style={{ background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#166534' }}>
                        Logsheet #{ls._id.slice(-6).toUpperCase()} &bull; Status: {ls.status}
                      </div>
                      <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
                        Committee Signatures: <strong>{ls.committee_signatures?.length || 0} / 4</strong>
                      </div>
                    </div>
                    <Link to={`/admin/logsheets/${ls._id}`} className="btn btn-outline btn-sm" style={{ fontWeight: 700 }}>
                      Open Logsheet &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Sidebar (Initial Product Lifecycle Stages Timeline & Facility Info) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Card: Initial Product Lifecycle Stages */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '24px 22px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              Initial Product Lifecycle Stages
            </div>

            <InitialProductTimeline
              status={app.status}
              statusHistory={app.statusHistory}
              app={app}
            />
          </div>

          {/* Card: Facility & Contact Information */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 14 }}>
              Application &amp; Facility
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Client Organization</div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{compName}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Production Facility / Site</div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Building2 size={14} style={{ color: '#059669' }} /> {siteName}
                </div>
                {app.site_id?.address && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{app.site_id.address}</div>
                )}
              </div>

              {app.contact_name && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Contact Person</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{app.contact_name}</div>
                  {app.contact_email && (
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{app.contact_email}</div>
                  )}
                  {app.contact_phone && (
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{app.contact_phone}</div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ─── MODAL: DIRECT ASSIGN FT ─── */}
      {showFtModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowFtModal(false)} style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 540, width: '95%', padding: 0, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <User size={22} />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff' }}>Assign Food Technologist</h3>
              </div>
              <button onClick={() => setShowFtModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '22px 24px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 800 }}>Select FT Users from System:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
                  {ftUsers.map(ft => {
                    const isSel = selectedFtIds.includes(String(ft._id));
                    return (
                      <label key={ft._id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: isSel ? 700 : 500, color: isSel ? '#065f46' : '#334155', padding: '4px 6px', borderRadius: 6, background: isSel ? '#ecfdf5' : 'transparent' }}>
                        <input type="checkbox" checked={isSel} onChange={() => setSelectedFtIds(prev => prev.includes(String(ft._id)) ? prev.filter(i => i !== String(ft._id)) : [...prev, String(ft._id)])} style={{ accentColor: '#059669' }} />
                        <span>{ft.full_name || ft.name || ft.email} ({ft.email})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 10 }}>Or Custom Specialist Details:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input type="text" className="form-control" placeholder="Name" value={customFtName} onChange={e => setCustomFtName(e.target.value)} style={{ fontSize: 12.5 }} />
                  <input type="email" className="form-control" placeholder="Email" value={customFtEmail} onChange={e => setCustomFtEmail(e.target.value)} style={{ fontSize: 12.5 }} />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowFtModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={savingFt || (selectedFtIds.length === 0 && !customFtName.trim())} onClick={handleAssignFt} style={{ background: '#059669', borderColor: '#059669', fontWeight: 800 }}>
                {savingFt ? <span className="spinner-white" /> : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ENABLE FORM ─── */}
      {showEnableFormModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEnableFormModal(false)} style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 540, width: '95%', padding: 0, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={22} />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff' }}>Enable Product Approval Form</h3>
              </div>
              <button onClick={() => setShowEnableFormModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '22px 24px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 800 }}>Instructions / Custom Remarks for Client:</label>
                <textarea className="form-control" rows={3} placeholder="Provide instructions on required formulation breakdown..." value={formText} onChange={e => setFormText(e.target.value)} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 800 }}>Optional Reference Document (PDF):</label>
                <input type="file" onChange={e => setFormFile(e.target.files[0])} style={{ fontSize: 12.5 }} />
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowEnableFormModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={savingEnableForm} onClick={handleEnableForm} style={{ background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 800 }}>
                {savingEnableForm ? <span className="spinner-white" /> : 'Enable & Notify Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REQUEST MORE INFO ─── */}
      {showInfoModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInfoModal(false)} style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 540, width: '95%', padding: 0, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={22} />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff' }}>Request More Information</h3>
              </div>
              <button onClick={() => setShowInfoModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '22px 24px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 800 }}>Clarification Needed from Client:</label>
                <textarea className="form-control" rows={4} placeholder="Specify ingredients, certificates, or cleaning procedures needing clarification..." value={infoMessage} onChange={e => setInfoMessage(e.target.value)} required />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 800 }}>Optional Attachment:</label>
                <input type="file" onChange={e => setInfoFile(e.target.files[0])} style={{ fontSize: 12.5 }} />
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowInfoModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={savingInfo || !infoMessage.trim()} onClick={handleRequestInfo} style={{ background: '#d97706', borderColor: '#d97706', fontWeight: 800 }}>
                {savingInfo ? <span className="spinner-white" /> : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE LOGSHEET ─── */}
      {showLogsheetModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLogsheetModal(false)} style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 520, width: '95%', padding: 0, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={22} />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff' }}>Create Committee Logsheet</h3>
              </div>
              <button onClick={() => setShowLogsheetModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '22px 24px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 800 }}>Technical Remarks for Committee:</label>
                <textarea className="form-control" rows={3} placeholder="e.g. All raw ingredients and cleaning validations reviewed and verified." value={logsheetRemarks} onChange={e => setLogsheetRemarks(e.target.value)} />
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowLogsheetModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={savingLogsheet} onClick={handleCreateLogsheet} style={{ background: '#059669', borderColor: '#059669', fontWeight: 800 }}>
                {savingLogsheet ? <span className="spinner-white" /> : 'Generate Logsheet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW CLIENT'S SUBMITTED FORM ─── */}
      {showFormModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowFormModal(false)} style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 1000, width: '95%', maxHeight: '90vh', padding: 0, borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={22} style={{ color: '#4ade80' }} />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff' }}>
                  Submitted Form &bull; {app.product?.name}
                </h3>
              </div>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, background: '#fafafa' }}>
              {productResp?.form_data ? (
                <ProductApprovalRequestForm initialData={productResp.form_data} readOnly={true} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  No structured form response data recorded.
                </div>
              )}

              {productResp?.response_url && (
                <div style={{ marginTop: 20, padding: '14px 18px', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <a href={getPdfUrl(productResp.response_url)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0284c7' }}>
                    <Download size={15} /> Download Client's Submitted Supporting Attachment
                  </a>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowFormModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
