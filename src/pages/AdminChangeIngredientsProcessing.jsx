import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, X, RefreshCw,
  Building2, FileText, User, Calendar, Shield,
  ChevronRight, AlertCircle, Clock, Package, UploadCloud, Download, Check, Eye, ClipboardList, Award, Users,
  MessageSquare, CheckCircle2, ShieldCheck, Layers, Paperclip, Beaker
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../lib/pdfUtils';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';
import {
  canReviewAddOnApp,
  canAssignFoodTech,
  canManageProductForm,
  canCreateLogsheet
} from '../lib/permissions';

const STATUS_LABELS = {
  submitted: 'Submit Request',
  accepted: 'Application Accepted',
  rejected: 'Application Rejected',
  ft_assigned: 'Assign FT Food Technologies',
  all_forms_received: 'All Documents Received',
  logsheet_created: 'Create Logsheet',
  waiting_sharia_signature: 'Waiting For Committee Signature',
  completed: 'Ingredients Accepted & Completed'
};

const STATUS_BADGE = {
  submitted: 'badge-yellow',
  accepted: 'badge-green',
  rejected: 'badge-red',
  ft_assigned: 'badge-blue',
  all_forms_received: 'badge-teal',
  logsheet_created: 'badge-blue',
  waiting_sharia_signature: 'badge-orange',
  completed: 'badge-green'
};

const FLOW_STEPS = [
  { id: 'submitted', label: 'Submit Request' },
  { id: 'accepted', label: 'Application Accepted' },
  { id: 'ft_assigned', label: 'Assign FT' },
  { id: 'all_forms_received', label: 'Documents Review' },
  { id: 'logsheet_created', label: 'Create Logsheet' },
  { id: 'waiting_sharia_signature', label: 'Committee Review' },
  { id: 'completed', label: 'Ingredients Accepted' }
];

const ORDER = [
  'submitted', 'accepted', 'ft_assigned', 'all_forms_received',
  'logsheet_created', 'waiting_sharia_signature', 'completed'
];

export default function AdminChangeIngredientsProcessing() {
  const { addonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [app, setApp] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ftUsers, setFtUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Modal Action states
  const [actionType, setActionType] = useState(null); // 'review' | 'assign_ft' | 'request_docs'
  const [decision, setDecision] = useState('accepted');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFtIds, setSelectedFtIds] = useState([]);
  const [customFtName, setCustomFtName] = useState('');
  const [customFtEmail, setCustomFtEmail] = useState('');
  const [customFtNotes, setCustomFtNotes] = useState('');

  // Request More Documents modal state
  const [requestDocsNote, setRequestDocsNote] = useState('');
  const [requestDocsFile, setRequestDocsFile] = useState(null);

  const toggleFt = (ftId) => {
    const idStr = String(ftId);
    setSelectedFtIds(prev =>
      prev.map(String).includes(idStr) ? prev.filter(id => String(id) !== idStr) : [...prev, idStr]
    );
  };

  const isManagerOrAdmin = canAssignFoodTech(user);

  const fetchApp = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get(`/api/add-on-applications/${addonId}`);
      const data = res.data?.data || res.data;
      setApp(data);

      if (data?.certificate_id?._id || data?.certificate_id) {
        const cId = data.certificate_id._id || data.certificate_id;
        try {
          const cRes = await api.get(`/api/certificates/${cId}`);
          setCertificate(cRes.data?.data || cRes.data);
        } catch (cErr) {
          console.warn('[AddOn] Could not fetch linked certificate:', cErr.message);
        }
      }

      if (isManagerOrAdmin) {
        const usersRes = await api.get('/api/users?category=staff&all=true').catch(() => ({ data: [] }));
        const rawUsers = Array.isArray(usersRes.data)
          ? usersRes.data
          : (Array.isArray(usersRes.data?.data) ? usersRes.data.data : (Array.isArray(usersRes?.data) ? usersRes.data : []));
        const ft = rawUsers.filter(u => u && (
          u.role === 'food_tech' || u.role === 'food_tech_manager' ||
          (Array.isArray(u.roles) && (u.roles.includes('food_tech') || u.roles.includes('food_tech_manager')))
        ));
        setFtUsers(ft.length > 0 ? ft : rawUsers);
      }
    } catch (err) {
      toast.error('Failed to load application details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addonId, isManagerOrAdmin]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  // Real-time socket updates
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;

    socket.emit('join_application', addonId);

    const handleUpdate = (data) => {
      const incomingId = data.addOnId || data.addon_id || data.id || data._id;
      if (String(incomingId) === String(addonId)) {
        if (data.status) {
          setApp(prev => prev ? { ...prev, status: data.status } : prev);
        }
        fetchApp(true);
      }
    };

    socket.on('addon_updated', handleUpdate);
    socket.on('application_updated', handleUpdate);

    return () => {
      socket.off('addon_updated', handleUpdate);
      socket.off('application_updated', handleUpdate);
    };
  }, [addonId, fetchApp]);

  // Review Application (Accept / Reject)
  const handleReview = async () => {
    if (decision === 'rejected' && !rejectionReason.trim()) {
      return toast.error('Rejection reason is required.');
    }
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${app._id}/review`, {
        decision,
        rejection_reason: decision === 'rejected' ? rejectionReason.trim() : undefined,
        notes: notes.trim() || undefined
      });
      toast.success(decision === 'accepted' ? 'Application accepted!' : 'Application rejected.');
      setActionType(null);
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Assign Food Tech
  const handleAssignFT = async () => {
    if (selectedFtIds.length === 0 && !customFtName.trim()) {
      return toast.error('Please select at least one FT staff member or provide custom details.');
    }
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${app._id}/assign-ft`, {
        assigned_food_techs: selectedFtIds,
        food_tech_ids: selectedFtIds,
        custom_ft_name: customFtName.trim(),
        custom_ft_email: customFtEmail.trim(),
        custom_ft_notes: customFtNotes.trim(),
        assigned_ft_details: customFtName.trim()
      });
      toast.success('Food Technology staff assigned successfully!');
      setActionType(null);
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // All Documents Received
  const handleAllDocumentsReceived = async () => {
    if (!canManageProductForm(user)) {
      return toast.error('Only Food Technology staff or Managers can verify documents.');
    }
    const confirm = window.confirm('Are you sure you want to mark All Documents as Received? This will advance the application to the Logsheet stage.');
    if (!confirm) return;

    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${app._id}/all-documents-received`);
      toast.success('All documents confirmed! You can now create the Committee Logsheet.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Request More Documents
  const handleRequestMoreDocuments = async () => {
    if (!requestDocsNote.trim()) {
      return toast.error('Please enter a note describing the required documents or information.');
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('note', requestDocsNote.trim());
      if (requestDocsFile) {
        fd.append('attachment', requestDocsFile);
      }
      await api.post(`/api/add-on-applications/${app._id}/request-more-documents`, fd);
      toast.success('Document request sent to client successfully!');
      setActionType(null);
      setRequestDocsNote('');
      setRequestDocsFile(null);
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Navigate to Create Logsheet
  const handleCreateLogsheet = () => {
    if (!canCreateLogsheet(user)) {
      return toast.error('Only FT or FT Manager can create logsheets.');
    }
    sessionStorage.setItem('addon_app_id', app._id);
    navigate(`/addon-applications/${app._id}/logsheet`);
  };

  if (loading) {
    return <div style={{ padding: 80, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  }
  if (!app) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#dc2626' }}>Change Ingredients Application not found.</div>;
  }

  const siteName = app.site_id?.name || app.application_id?.establishment_name || app.certificate_id?.site_name || 'Main Facility';
  const companyName = app.client_id?.company_name || app.client_id?.full_name || 'Client';
  const certNo = app.certificate_id?.certificate_number || certificate?.certificate_number || '—';
  const statusLabel = STATUS_LABELS[app.status] || app.status;
  const badgeClass = STATUS_BADGE[app.status] || 'badge-gray';

  const ftNames = (() => {
    const arr = app.assigned_food_techs || [];
    if (arr.length > 0) {
      return arr.map(ft => ft.full_name || ft.name || 'Food Technologist').join(', ');
    }
    if (app.assigned_food_tech?.full_name) return app.assigned_food_tech.full_name;
    if (app.assigned_ft_custom?.name) return app.assigned_ft_custom.name;
    return null;
  })();

  const currentIdx = ORDER.indexOf(app.status);
  const productsList = app.products || [];

  const historyMap = {};
  (app.statusHistory || []).forEach(entry => {
    if (entry && entry.status && !historyMap[entry.status]) {
      historyMap[entry.status] = entry;
    }
  });

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const getActorName = (entry, stepKey) => {
    if (entry?.changedByName) {
      const roleStr = entry.changedByRole
        ? ` (${entry.changedByRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())})`
        : '';
      return `${entry.changedByName}${roleStr}`;
    }
    if (entry?.changedBy) {
      if (typeof entry.changedBy === 'object') {
        const name = entry.changedBy.full_name || entry.changedBy.name || entry.changedBy.username || entry.changedBy.email;
        const roleStr = entry.changedBy.role
          ? ` (${entry.changedBy.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())})`
          : '';
        if (name) return `${name}${roleStr}`;
      } else if (typeof entry.changedBy === 'string' && entry.changedBy.trim()) {
        const isHexId = /^[0-9a-fA-F]{24}$/.test(entry.changedBy.trim());
        if (!isHexId) {
          return entry.changedBy;
        }
      }
    }

    if (stepKey === 'submitted') {
      const cName = app?.client_id?.company_name || app?.client_id?.full_name || app?.contact_name;
      return cName ? `${cName} (Client)` : 'Client / Applicant';
    }
    if (stepKey === 'accepted') return 'HFA Administrator';
    if (stepKey === 'ft_assigned') {
      const ft = app?.assigned_food_techs?.[0] || app?.assigned_food_tech || app?.assigned_ft_custom;
      return ft ? `${ft.full_name || ft.name || 'Food Tech'} (Assigned FT)` : 'Food Tech Manager';
    }
    if (stepKey === 'all_forms_received') return 'HFA Administrator';
    if (stepKey === 'logsheet_created') return 'Food Tech Specialist';
    if (stepKey === 'waiting_sharia_signature') return 'Shari\'a Board Member';
    if (stepKey === 'completed') return 'Food Tech Manager / Committee';
    return null;
  };

  const getStepTimestamp = (stepId, isDone) => {
    const histEntry = historyMap[stepId];
    if (histEntry?.changedAt) return histEntry.changedAt;
    if (stepId === 'submitted') return app?.submission_date || app?.created_at || app?.createdAt;
    if (stepId === 'completed' && isDone) return app?.ingredients_accepted_at || app?.updatedAt || new Date();
    if (isDone) return app?.updatedAt;
    return null;
  };

  return (
    <div className="page-content animate-in">
      {/* ─── Top Header Section ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/addon-applications')}>
          <ArrowLeft size={16} /> Back to Add-on Applications
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8b5cf6', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={13} /> Change Ingredients Processing Workflow
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              {companyName} &middot; {siteName}
            </h1>
            <span className={`badge ${badgeClass}`} style={{ fontSize: 12 }}>
              {statusLabel}
            </span>
            {refreshing && <RefreshCw size={14} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Certificate: <strong>{certNo}</strong> &middot; Contact: <strong>{app.contact_name}</strong> ({app.contact_email}) &middot; Submitted {new Date(app.createdAt || app.created_at).toLocaleDateString('en-GB')}
            {ftNames && <> &middot; FT Assigned: <strong style={{ color: '#2563eb' }}>{ftNames}</strong></>}
          </div>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={() => fetchApp(true)} title="Refresh Application">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ─── Action Ribbon Banner ─── */}
      <div style={{
        background: 'white', border: '1px solid var(--border)', borderRadius: 16,
        padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
            Current Workflow Stage
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {app.status === 'submitted' && 'Change ingredients request submitted. Review the formulation details and accept or reject.'}
            {app.status === 'accepted' && 'Application accepted. Assign Food Technology specialists to handle technical formulation review.'}
            {app.status === 'ft_assigned' && `Assigned FT: ${ftNames || 'Inspector'}. Review specifications or request additional compliance documents from the client.`}
            {app.status === 'all_forms_received' && 'All formulation documents verified and confirmed! You can now proceed to create the Committee Logsheet.'}
            {['logsheet_created', 'waiting_sharia_signature'].includes(app.status) && 'Committee Logsheet created. Shariah and Technical signatories are reviewing the ingredient changes.'}
            {app.status === 'completed' && 'Ingredients changes accepted and approved by Committee. Request completed successfully (no certificate change required).'}
            {app.status === 'rejected' && (app.rejection_reason ? `Application Rejected: ${app.rejection_reason}` : 'Application rejected.')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* 1. Review Request (submitted) */}
          {canReviewAddOnApp(user) && app.status === 'submitted' && (
            <button
              className="btn btn-primary"
              style={{ background: '#f59e0b', borderColor: '#f59e0b', fontWeight: 700 }}
              onClick={() => { setDecision('accepted'); setActionType('review'); }}
            >
              Review Request (Accept / Reject)
            </button>
          )}

          {/* 2. Assign FT */}
          {isManagerOrAdmin && ['accepted', 'ft_assigned'].includes(app.status) && (
            <button
              className="btn btn-outline"
              style={{ fontWeight: 700, borderColor: '#2563eb', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => {
                const preSelected = (app.assigned_food_techs || []).map(f => (f._id || f).toString());
                setSelectedFtIds(preSelected.length > 0 ? preSelected : (app.assigned_food_tech ? [(app.assigned_food_tech._id || app.assigned_food_tech).toString()] : []));
                setCustomFtName(app.assigned_ft_custom?.name || app.assigned_ft_details || '');
                setCustomFtEmail(app.assigned_ft_custom?.email || '');
                setCustomFtNotes(app.assigned_ft_custom?.notes || '');
                setActionType('assign_ft');
              }}
            >
              <Users size={15} /> {app.status === 'ft_assigned' ? 'Reassign FT Staff' : 'Assign FT Staff'}
            </button>
          )}

          {/* 3. Document Review Stage Actions (ft_assigned) */}
          {canManageProductForm(user) && app.status === 'ft_assigned' && (
            <>
              <button
                className="btn btn-outline"
                style={{ borderColor: '#d97706', color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => setActionType('request_docs')}
              >
                <MessageSquare size={15} /> Request for More Documents
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#0d9488', borderColor: '#0d9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={handleAllDocumentsReceived}
                disabled={submitting}
              >
                <CheckCircle2 size={16} /> All Documents Received
              </button>
            </>
          )}

          {/* 4. Create Logsheet */}
          {canCreateLogsheet(user) && app.status === 'all_forms_received' && (
            <button
              className="btn btn-primary"
              style={{ background: '#0e7490', borderColor: '#0e7490', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={handleCreateLogsheet}
            >
              <FileText size={16} /> Create Logsheet &rarr;
            </button>
          )}

          {/* 5. View Logsheet if created */}
          {['logsheet_created', 'waiting_sharia_signature', 'completed'].includes(app.status) && (
            <button
              className="btn btn-outline"
              style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#0e7490', color: '#0e7490' }}
              onClick={() => navigate(`/addon-applications/${app._id}/logsheet`)}
            >
              <FileText size={15} /> View Committee Logsheet
            </button>
          )}

          {/* Completed Badge */}
          {app.status === 'completed' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
              <CheckCircle2 size={16} /> Ingredients Accepted
            </div>
          )}
        </div>
      </div>

      {/* ─── Main Content Grid (1fr 360px) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT COLUMN: Cards ── */}
        <div style={{ display: 'grid', gap: 20 }}>

          {/* Card 1: Products & Ingredients Modification Details */}
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={18} style={{ color: '#8b5cf6' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                    Products with Modified Ingredients ({productsList.length})
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Formulation updates submitted for Halal compliance review
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', width: 50, color: '#64748b', fontWeight: 700 }}>#</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 700 }}>Product Name</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 700 }}>Code</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 700 }}>Action Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {productsList.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: 700 }}>#{idx + 1}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                        <div>{p.name || p.original_name}</div>
                        {p.description && (
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#0369a1', marginTop: 4, background: '#f0f9ff', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                            Notes: {p.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}><code>{p.code || '—'}</code></td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#f3e8ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                          <Layers size={11} /> Change ingredients
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Ingredients Accepted Banner if completed */}
              {app.ingredients_accepted_at && (
                <div style={{ marginTop: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: 6 }}>
                    ✓ Ingredients Officially Accepted by Committee
                  </div>
                  <div style={{ fontSize: 12.5, color: '#14532d' }}>
                    Ingredient changes accepted on {new Date(app.ingredients_accepted_at).toLocaleDateString('en-GB')}. The product formulation is confirmed compliant. No new certificate issuance required.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Supporting Documents Uploaded by Client */}
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Paperclip size={18} style={{ color: '#0284c7' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                    Supporting Documents ({app.supporting_documents?.length || 0})
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Specifications, Halal certificates of ingredients, declarations &amp; lab analyses
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {Array.isArray(app.supporting_documents) && app.supporting_documents.length > 0 ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {app.supporting_documents.map((doc, dIdx) => (
                    <div key={dIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <FileText size={18} color="#0284c7" />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{doc.file_name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB · ` : ''}Uploaded {new Date(doc.uploaded_at || Date.now()).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      </div>
                      <a
                        href={getPdfUrl(doc.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, background: 'white' }}
                      >
                        <Download size={13} /> View / Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '24px', background: '#fafbfc', borderRadius: 10, textAlign: 'center', color: '#64748b', fontSize: 13, border: '1px dashed #cbd5e1' }}>
                  No supporting documents attached with this submission.
                </div>
              )}

              {/* Document Requests & Communication Log */}
              {Array.isArray(app.document_requests) && app.document_requests.length > 0 && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.04em' }}>
                    Document Requests Sent to Client ({app.document_requests.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {app.document_requests.map((req, rIdx) => (
                      <div key={rIdx} style={{ background: req.status === 'pending' ? '#fffbeb' : '#f8fafc', border: `1px solid ${req.status === 'pending' ? '#fde68a' : '#e2e8f0'}`, borderRadius: 10, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                            REQUEST #{rIdx + 1} &middot; {new Date(req.requested_at).toLocaleDateString('en-GB')}
                          </span>
                          <span className={`badge ${req.status === 'pending' ? 'badge-yellow' : 'badge-green'}`} style={{ fontSize: 10 }}>
                            {req.status === 'pending' ? 'Awaiting Client Reply' : 'Client Replied'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{req.note}</div>
                        {req.attachment_url && (
                          <a href={getPdfUrl(req.attachment_url)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#0284c7', marginTop: 6, fontWeight: 600, textDecoration: 'none' }}>
                            <Download size={12} /> {req.attachment_name || 'Download Reference File'}
                          </a>
                        )}

                        {req.status === 'replied' && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0', background: 'white', padding: 10, borderRadius: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>CLIENT REPLY ({new Date(req.replied_at).toLocaleDateString('en-GB')}):</div>
                            <div style={{ fontSize: 12.5, color: '#334155', marginTop: 2 }}>{req.reply_note || 'Documents attached.'}</div>
                            {req.reply_attachments?.length > 0 && (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                {req.reply_attachments.map((att, aIdx) => (
                                  <a key={aIdx} href={getPdfUrl(att.file_url)} target="_blank" rel="noreferrer" className="badge badge-teal" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <Paperclip size={11} /> {att.file_name}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Client Message / Context */}
          {app.message && (
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Client Submission Note</div>
              <div style={{ fontSize: 13.5, color: '#334155', background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                {app.message}
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN: Timeline & Info ── */}
        <div>

          {/* Timeline Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Processing Timeline</div>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <div style={{ padding: '8px 0' }}>
                {FLOW_STEPS.map((step, idx) => {
                  const stepIdx = ORDER.indexOf(step.id);
                  const isDone = currentIdx > stepIdx || app.status === 'completed';
                  const isCurrent = currentIdx === stepIdx && app.status !== 'completed';
                  const isLast = idx === FLOW_STEPS.length - 1;
                  const histEntry = historyMap[step.id];
                  const stepDate = getStepTimestamp(step.id, isDone);
                  const actor = getActorName(histEntry, step.id);

                  return (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
                        <div style={{
                          width: 32, height: 32,
                          borderRadius: '50%',
                          background: isDone ? '#15803d' : isCurrent ? '#8b5cf6' : '#f1f5f9',
                          border: isCurrent ? `3px solid #8b5cf6` : `2px solid ${isDone ? '#15803d' : '#e2e8f0'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          position: 'relative', zIndex: 1
                        }}>
                          {isDone ? (
                            <CheckCircle size={16} color="white" strokeWidth={2.5} />
                          ) : isCurrent ? (
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white' }} />
                          ) : (
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#cbd5e1' }} />
                          )}
                        </div>
                        {!isLast && (
                          <div style={{ width: 2, flex: 1, minHeight: 36, background: isDone ? '#86efac' : '#e2e8f0', margin: '2px 0' }} />
                        )}
                      </div>

                      <div style={{ marginLeft: 12, paddingBottom: isLast ? 0 : 20, flex: 1, paddingTop: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: isCurrent ? 800 : isDone ? 700 : 500, color: isDone ? '#0f172a' : isCurrent ? '#0f172a' : '#94a3b8' }}>
                            {step.label}
                          </span>
                          {isCurrent && <span className="badge badge-purple" style={{ fontSize: 9, marginLeft: 2, background: '#f3e8ff', color: '#7c3aed' }}>CURRENT</span>}
                        </div>

                        {/* Date, Time & Actor User Details */}
                        {(isDone || isCurrent) && stepDate && (
                          <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              flexWrap: 'wrap',
                              fontSize: 11,
                              color: '#64748b',
                              background: '#f8fafc',
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              width: 'fit-content',
                            }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3.5, color: '#334155', fontWeight: 600 }}>
                                <Calendar size={11} style={{ color: '#0e7490' }} />
                                <span>{formatDateOnly(stepDate)}</span>
                              </div>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3.5, color: '#334155', fontWeight: 600 }}>
                                <Clock size={11} style={{ color: '#0e7490' }} />
                                <span>{formatTimeOnly(stepDate)}</span>
                              </div>
                              {actor && (
                                <>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3.5, color: '#0e7490', fontWeight: 700 }}>
                                    <User size={11} style={{ color: '#0e7490' }} />
                                    <span>{actor}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {histEntry?.note && (
                              <div style={{
                                fontSize: 11.5,
                                color: '#475569',
                                background: '#f8fafc',
                                padding: '4px 8px',
                                borderRadius: 6,
                                borderLeft: '3px solid #0e7490',
                                lineHeight: 1.4,
                              }}>
                                {histEntry.note}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Facility & Contact Info Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Facility &amp; Client Details</div>
            </div>
            <div className="card-body" style={{ padding: '16px 20px', fontSize: 13 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Company</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{companyName}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Facility / Site</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{siteName}</div>
                {app.site_id?.address && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{app.site_id.address}</div>}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Contact Person</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{app.contact_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{app.contact_email}</div>
                {app.contact_phone && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{app.contact_phone}</div>}
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Linked Certificate</div>
                <div style={{ fontWeight: 700, color: '#0e7490', marginTop: 2 }}>{certNo}</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── MODAL 1: Review Request (Accept / Reject) ── */}
      {actionType === 'review' && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Review Change Ingredients Request</span>
              <button className="modal-close" onClick={() => setActionType(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 16 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Decision</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setDecision('accepted')}
                    style={{ flex: 1, background: decision === 'accepted' ? '#16a34a' : '#f1f5f9', color: decision === 'accepted' ? 'white' : '#334155', fontWeight: 700 }}
                  >
                    Accept Request
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setDecision('rejected')}
                    style={{ flex: 1, background: decision === 'rejected' ? '#dc2626' : '#f1f5f9', color: decision === 'rejected' ? 'white' : '#334155', fontWeight: 700 }}
                  >
                    Reject Request
                  </button>
                </div>
              </div>

              {decision === 'rejected' && (
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Rejection Reason *</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Explain why this request cannot be approved..."
                  />
                </div>
              )}

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Internal Notes (Optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes for internal record..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActionType(null)} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReview} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Assign FT Staff ── */}
      {actionType === 'assign_ft' && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <span className="modal-title">Assign Food Technology Staff</span>
              <button className="modal-close" onClick={() => setActionType(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 16 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>
                  1. Select Registered FT Staff
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
                    {selectedFtIds.length > 0 ? `(${selectedFtIds.length} selected)` : '— select one or more'}
                  </span>
                </label>

                {ftUsers.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#64748b', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    No registered food_tech user accounts in system. You can type FT details below.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                    {ftUsers.map(ft => {
                      const isSelected = selectedFtIds.map(String).includes(String(ft._id));
                      return (
                        <label key={ft._id} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                          borderRadius: 8, border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                          background: isSelected ? '#eff6ff' : 'white', cursor: 'pointer', transition: 'all 0.15s'
                        }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFt(ft._id)}
                            style={{ width: 16, height: 16, accentColor: '#2563eb', flexShrink: 0 }}
                          />
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: isSelected ? '#2563eb' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: isSelected ? 'white' : '#64748b' }}>
                              {(ft.full_name || ft.email || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#1d4ed8' : '#0f172a' }}>{ft.full_name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{ft.email}</div>
                          </div>
                          {isSelected && <Check size={14} style={{ marginLeft: 'auto', color: '#2563eb', flexShrink: 0 }} />}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Option 2: Type FT Details Directly */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>
                  2. Or Type FT Staff Details Directly
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
                    (Enter name, email, or notes to assign)
                  </span>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                      FT Staff Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Dr. Lasun Adebayo"
                      value={customFtName}
                      onChange={e => setCustomFtName(e.target.value)}
                      style={{ fontSize: 12.5, height: 36, borderRadius: 6 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                      FT Staff Email
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="ft@example.com"
                      value={customFtEmail}
                      onChange={e => setCustomFtEmail(e.target.value)}
                      style={{ fontSize: 12.5, height: 36, borderRadius: 6 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                    Notes / Instructions for FT
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Assigned for formulation review"
                    value={customFtNotes}
                    onChange={e => setCustomFtNotes(e.target.value)}
                    style={{ fontSize: 12.5, height: 36, borderRadius: 6 }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActionType(null)} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignFT} disabled={submitting}>
                {submitting ? 'Assigning...' : 'Save FT Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Request for More Documents ── */}
      {actionType === 'request_docs' && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} color="#d97706" /> Request More Documents from Client
              </span>
              <button className="modal-close" onClick={() => setActionType(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 16 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Note to Client *</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={requestDocsNote}
                  onChange={e => setRequestDocsNote(e.target.value)}
                  placeholder="Enter details of what documents, declarations or proof are required from the client..."
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Attach Reference Document (Optional)</label>
                <input
                  type="file"
                  className="form-control"
                  onChange={e => setRequestDocsFile(e.target.files?.[0] || null)}
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Attach template or reference instructions for the client.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActionType(null)} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRequestMoreDocuments} disabled={submitting} style={{ background: '#d97706', borderColor: '#d97706' }}>
                {submitting ? 'Sending...' : 'Send Request to Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
