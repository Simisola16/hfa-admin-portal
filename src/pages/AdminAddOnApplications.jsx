import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../lib/pdfUtils';
import {
  PlusCircle, Search, X, Check, FileText, AlertCircle,
  Clock, Package, RefreshCw, ChevronDown, ChevronUp, User,
  CheckCircle, Users, ArrowRight, Building2, Calendar,
  Layers, ShieldCheck, CheckCheck, ExternalLink, Sparkles,
  Tag, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  ft_assigned: 'FT Assigned',
  product_approval_form_enabled: 'Product Form Enabled',
  all_forms_received: 'Product Form Received',
  logsheet_created: 'Logsheet Created',
  waiting_sharia_signature: "Committee Signature",
  product_form_approved: 'Product Form Approved',
  ready_for_certificate: 'Ready for Cert',
  completed: 'Completed'
};

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', bg: '#fef3c7', color: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  accepted: { label: 'Accepted', bg: '#dcfce7', color: '#166534', border: '#bbf7d0', dot: '#22c55e' },
  rejected: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b', border: '#fecaca', dot: '#ef4444' },
  ft_assigned: { label: 'FT Assigned', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
  product_approval_form_enabled: { label: 'Product Form Enabled', bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff', dot: '#a855f7' },
  all_forms_received: { label: 'Product Form Received', bg: '#ccfbf1', color: '#115e59', border: '#99f6e4', dot: '#14b8a6' },
  logsheet_created: { label: 'Logsheet Created', bg: '#e0f2fe', color: '#075985', border: '#bae6fd', dot: '#0ea5e9' },
  waiting_sharia_signature: { label: "Committee Signature", bg: '#ffedd5', color: '#9a3412', border: '#fed7aa', dot: '#f97316' },
  product_form_approved: { label: 'Product Form Approved', bg: '#dcfce7', color: '#166534', border: '#bbf7d0', dot: '#16a34a' },
  ready_for_certificate: { label: 'Ready for Cert', bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', dot: '#6366f1' },
  completed: { label: 'Completed', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', dot: '#10b981' }
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const [activeApp, setActiveApp] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [decision, setDecision] = useState('accepted');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedFtIds, setSelectedFtIds] = useState([]);

  const isManagerOrAdmin = ['admin', 'superadmin', 'food_tech_manager'].includes(user?.role);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/add-on-applications').catch(() => ({ data: [] }));
      const loaded = Array.isArray(res) ? res : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []));
      setApps(loaded);
      if (isManagerOrAdmin) {
        const usersRes = await api.get('/api/users').catch(() => ({ data: [] }));
        const rawUsers = Array.isArray(usersRes) ? usersRes : (Array.isArray(usersRes?.data?.data) ? usersRes.data.data : (Array.isArray(usersRes?.data) ? usersRes.data : []));
        setFtUsers(rawUsers.filter(u => u && u.role === 'food_tech'));
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
    const preSelected = (app.assigned_food_techs || []).map(ft => (ft._id || ft).toString());
    setSelectedFtIds(preSelected.length > 0 ? preSelected : (app.assigned_food_tech ? [(app.assigned_food_tech._id || app.assigned_food_tech).toString()] : []));
  };

  const toggleFt = (ftId) => {
    const idStr = String(ftId);
    setSelectedFtIds(prev =>
      prev.includes(idStr) ? prev.filter(id => id !== idStr) : [...prev, idStr]
    );
  };

  const closeModal = () => { setActiveApp(null); setActionType(null); };

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

  const handleRequestProductApprovalForm = async (targetApp) => {
    try {
      await api.put(`/api/add-on-applications/${targetApp._id}/enable-form`, {
        form_text: 'Please complete and submit the Product Approval Form for each product.',
        is_draft: false
      });
      toast.success('Request for Product Approval Form sent to client!');
      fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleCreateLogsheet = (app) => {
    sessionStorage.setItem('addon_app_id', app._id);
    navigate(`/addon-applications/${app._id}/logsheet`);
  };

  const handleApproveForm = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${activeApp._id}/approve-form`);
      toast.success('Product Approval Form approved! Application is now Ready for Certificate.');
      closeModal(); fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const certId = activeApp?.certificate_id?._id || activeApp?.certificate_id;
      await api.put(`/api/add-on-applications/${activeApp._id}/complete`, { certificate_id: certId });
      toast.success('Certificate product list updated successfully!');
      closeModal(); fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setSubmitting(false); }
  };

  const safeApps = Array.isArray(apps) ? apps : [];

  const baseList = useMemo(() => {
    if (view === 'request') return safeApps.filter(a => a && (a.status === 'submitted' || a.status === 'on_hold'));
    if (view === 'inprogress') return safeApps.filter(a => a && a.status !== 'submitted' && a.status !== 'on_hold' && a.status !== 'completed' && a.status !== 'rejected');
    return safeApps;
  }, [safeApps, view]);

  const stats = useMemo(() => {
    const total = safeApps.length;
    const pending = safeApps.filter(a => a && (a.status === 'submitted' || a.status === 'on_hold')).length;
    const inProgress = safeApps.filter(a => a && !['submitted', 'on_hold', 'completed', 'rejected'].includes(a.status)).length;
    const completed = safeApps.filter(a => a && a.status === 'completed').length;
    return { total, pending, inProgress, completed };
  }, [safeApps]);

  const filtered = useMemo(() => {
    const safeBaseList = Array.isArray(baseList) ? baseList : [];
    return safeBaseList.filter(a => {
      if (!a) return false;
      if (statusFilter === 'pending' && !['submitted', 'on_hold'].includes(a.status)) return false;
      if (statusFilter === 'on_hold' && a.status !== 'on_hold') return false;
      if (statusFilter === 'inprogress' && (a.status === 'submitted' || a.status === 'on_hold' || a.status === 'completed' || a.status === 'rejected')) return false;
      if (statusFilter === 'ft_assigned' && a.status !== 'ft_assigned') return false;
      if (statusFilter === 'forms' && !['product_approval_form_enabled', 'all_forms_received'].includes(a.status)) return false;
      if (statusFilter === 'ready' && a.status !== 'ready_for_certificate') return false;
      if (statusFilter === 'completed' && a.status !== 'completed') return false;

      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        a.client_id?.company_name?.toLowerCase().includes(s) ||
        a.client_id?.full_name?.toLowerCase().includes(s) ||
        a.certificate_id?.certificate_number?.toLowerCase().includes(s) ||
        a.contact_name?.toLowerCase().includes(s) ||
        a.contact_email?.toLowerCase().includes(s) ||
        (a.products || []).some(p => (p.name || p.new_name)?.toLowerCase().includes(s))
      );
    });
  }, [baseList, statusFilter, search]);

  const getViewMeta = () => {
    if (view === 'request') return { title: 'Add-on Request Review Queue', subtitle: 'Review new product addition requests submitted by clients (Accept, Put on Hold, or Reject)' };
    if (view === 'inprogress') return { title: 'InProgress Add-on Applications', subtitle: 'Accepted add-on applications undergoing food technology evaluation and certificate updates' };
    return { title: 'Add-on Product Applications List', subtitle: 'Manage, review, and track all client product modification requests' };
  };

  const meta = getViewMeta();

  const getAssignedFtNames = (app) => {
    const arr = app.assigned_food_techs || [];
    if (arr.length > 0) return arr.map(ft => ft.full_name || ft).join(', ');
    if (app.assigned_food_tech?.full_name) return app.assigned_food_tech.full_name;
    return null;
  };

  return (
    <div className="animate-in" style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              {meta.title}
            </h1>
            <span style={{ fontSize: 12, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 20 }}>
              {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{meta.subtitle}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchApps}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 14px', fontWeight: 600, color: '#475569' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards - Only shown in InProgress and List views */}
      {view !== 'request' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 22 }}>
          <div
            onClick={() => setStatusFilter('all')}
            style={{
              background: 'white', padding: '16px 18px', borderRadius: 14, border: `1px solid ${statusFilter === 'all' ? '#0284c7' : '#e2e8f0'}`,
              boxShadow: statusFilter === 'all' ? '0 0 0 2px #e0f2fe' : '0 1px 3px rgba(0,0,0,0.03)',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Requests</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{stats.total}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} color="#64748b" />
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('pending')}
            style={{
              background: 'white', padding: '16px 18px', borderRadius: 14, border: `1px solid ${statusFilter === 'pending' ? '#f59e0b' : '#e2e8f0'}`,
              boxShadow: statusFilter === 'pending' ? '0 0 0 2px #fef3c7' : '0 1px 3px rgba(0,0,0,0.03)',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Review</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#b45309', marginTop: 2 }}>{stats.pending}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color="#d97706" />
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('inprogress')}
            style={{
              background: 'white', padding: '16px 18px', borderRadius: 14, border: `1px solid ${statusFilter === 'inprogress' ? '#2563eb' : '#e2e8f0'}`,
              boxShadow: statusFilter === 'inprogress' ? '0 0 0 2px #dbeafe' : '0 1px 3px rgba(0,0,0,0.03)',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>In Processing</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1d4ed8', marginTop: 2 }}>{stats.inProgress}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color="#2563eb" />
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('completed')}
            style={{
              background: 'white', padding: '16px 18px', borderRadius: 14, border: `1px solid ${statusFilter === 'completed' ? '#16a34a' : '#e2e8f0'}`,
              boxShadow: statusFilter === 'completed' ? '0 0 0 2px #dcfce7' : '0 1px 3px rgba(0,0,0,0.03)',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Completed</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d', marginTop: 2 }}>{stats.completed}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#16a34a" />
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '12px 16px',
        marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {view !== 'request' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Requests' },
              { id: 'pending', label: 'Pending Review' },
              { id: 'ft_assigned', label: 'FT Assigned' },
              { id: 'forms', label: 'Forms Phase' },
              { id: 'ready', label: 'Ready for Cert' },
              { id: 'completed', label: 'Completed' }
            ].map(tab => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: isActive ? 700 : 600,
                    background: isActive ? '#0f172a' : 'transparent', color: isActive ? 'white' : '#64748b',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Pending Requests' },
              { id: 'pending', label: 'New Requests' },
              { id: 'on_hold', label: 'On Hold' }
            ].map(tab => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: isActive ? 700 : 600,
                    background: isActive ? '#0f172a' : 'transparent', color: isActive ? 'white' : '#64748b',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', minWidth: 260, maxWidth: 360, flex: 1 }}>
          <Search size={14} style={{ color: '#94a3b8', marginRight: 8, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search client, cert, contact, product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, width: '100%', color: '#1e293b' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 80, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '72px 20px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Package size={24} style={{ color: '#94a3b8' }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 4 }}>No Add-on Applications Found</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>No requests match the current search or status filter.</div>
          </div>
        ) : (
          filtered.map(app => {
            const clientName = app.client_id?.company_name || app.client_id?.full_name || 'Unnamed Client';
            const certNo = app.certificate_id?.certificate_number || null;
            const linkedAppNo = app.application_id?.application_number || null;
            const cfg = STATUS_CONFIG[app.status] || { label: app.status, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', dot: '#94a3b8' };
            const isExpanded = expandedId === app._id;
            const stepIdx = FLOW_STEPS.indexOf(app.status);
            const ftNames = getAssignedFtNames(app);
            const productsList = app.products || [];

            return (
              <div
                key={app._id}
                style={{
                  background: 'white',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s, box-shadow 0.15s'
                }}
              >
                <div style={{ padding: '16px 20px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 1.2fr) minmax(220px, 1.6fr) minmax(160px, 1fr) auto',
                    gap: 16,
                    alignItems: 'center'
                  }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, fontWeight: 800, textTransform: 'uppercase'
                      }}>
                        {clientName.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>
                          {clientName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                          {certNo ? (
                            <span style={{ fontSize: 11, color: '#0369a1', background: '#f0f9ff', padding: '1px 6px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <FileText size={10} /> {certNo}
                            </span>
                          ) : linkedAppNo ? (
                            <span style={{ fontSize: 11, color: '#6366f1', background: '#eef2ff', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                              App: {linkedAppNo}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Pending Cert</span>
                          )}
                          <span style={{ fontSize: 11, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Calendar size={10} /> {new Date(app.createdAt).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                        Products ({productsList.length})
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {productsList.slice(0, 3).map((p, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                              background: p.type === 'Add product' ? '#f0fdf4' : p.type === 'Remove product' ? '#fef2f2' : '#f0f9ff',
                              color: p.type === 'Add product' ? '#166534' : p.type === 'Remove product' ? '#991b1b' : '#0369a1',
                              border: `1px solid ${p.type === 'Add product' ? '#bbf7d0' : p.type === 'Remove product' ? '#fecaca' : '#bae6fd'}`,
                              display: 'inline-flex', alignItems: 'center', gap: 4
                            }}
                          >
                            <span style={{ opacity: 0.7, fontWeight: 700 }}>
                              {p.type === 'Add product' ? '+' : p.type === 'Remove product' ? '-' : '~'}
                            </span>
                            {p.new_name || p.name}
                          </span>
                        ))}
                          {productsList.length > 3 && (
                            <span style={{ fontSize: 10.5, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                              +{productsList.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3. Status & FT Staff */}
                      <div>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                          padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em'
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
                          {cfg.label}
                        </div>
                        {ftNames ? (
                          <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={11} /> {ftNames}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>FT: Unassigned</div>
                        )}
                      </div>

                      {/* 4. Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        {isManagerOrAdmin && (app.status === 'submitted' || app.status === 'on_hold') && (
                          <button
                            className="btn btn-sm"
                            onClick={() => openAction(app, 'review')}
                            style={{ background: '#f59e0b', color: 'white', border: 'none', fontWeight: 700, fontSize: 12, padding: '7px 14px', borderRadius: 8, whiteSpace: 'nowrap' }}
                          >
                            Review Request
                          </button>
                        )}

                        {isManagerOrAdmin && app.status === 'accepted' && (
                          <button
                            className="btn btn-sm"
                            onClick={() => openAction(app, 'assign_ft')}
                            style={{ background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, fontSize: 12, padding: '7px 14px', borderRadius: 8, whiteSpace: 'nowrap' }}
                          >
                            <Users size={13} style={{ marginRight: 4 }} /> Assign FT
                          </button>
                        )}

                        {isManagerOrAdmin && app.status === 'ft_assigned' && (
                          <button
                            className="btn btn-sm"
                            onClick={() => handleRequestProductApprovalForm(app)}
                            style={{ background: '#7c3aed', color: 'white', border: 'none', fontWeight: 700, fontSize: 12, padding: '7px 14px', borderRadius: 8, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          >
                            <FileText size={13} /> Request for Product Approval Form
                          </button>
                        )}

                        {app.status === 'product_approval_form_enabled' && (
                          <span style={{ fontSize: 11.5, color: '#7c3aed', fontWeight: 700, background: '#f5f3ff', padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd6fe', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                            <Clock size={12} /> Awaiting Client Forms
                          </span>
                        )}

                        {isManagerOrAdmin && app.status === 'all_forms_received' && (
                          <button
                            className="btn btn-sm"
                            onClick={() => handleCreateLogsheet(app)}
                            style={{ background: '#0d9488', color: 'white', border: 'none', fontWeight: 700, fontSize: 12, padding: '7px 14px', borderRadius: 8, whiteSpace: 'nowrap' }}
                          >
                            Create Logsheet
                          </button>
                        )}

                        {isManagerOrAdmin && ['logsheet_created', 'waiting_sharia_signature', 'product_form_approved'].includes(app.status) && (
                          <button
                            className="btn btn-sm"
                            onClick={() => openAction(app, 'approve_form')}
                            style={{ background: '#16a34a', color: 'white', border: 'none', fontWeight: 700, fontSize: 12, padding: '7px 14px', borderRadius: 8, whiteSpace: 'nowrap' }}
                          >
                            Approve Form
                          </button>
                        )}

                        {isManagerOrAdmin && app.status === 'ready_for_certificate' && (
                          <button
                            className="btn btn-sm"
                            onClick={() => openAction(app, 'complete')}
                            style={{ background: '#0e7490', color: 'white', border: 'none', fontWeight: 700, fontSize: 12, padding: '7px 14px', borderRadius: 8, whiteSpace: 'nowrap' }}
                          >
                            Issue Certificate
                          </button>
                        )}

                        {/* Process & Track Details Button */}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/addon-applications/${app._id}/processing`)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px', color: '#334155', whiteSpace: 'nowrap' }}
                        >
                          Track <ArrowUpRight size={13} />
                        </button>

                        {/* Expand Toggle */}
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : app._id)}
                          style={{
                            background: isExpanded ? '#f1f5f9' : 'transparent',
                            border: '1px solid #e2e8f0', borderRadius: 8, width: 32, height: 32,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#64748b'
                          }}
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Progress bar below row */}
                  <div style={{ height: 3, background: '#f1f5f9', width: '100%' }}>
                    <div style={{
                      height: '100%',
                      width: `${app.status === 'completed' ? 100 : Math.max(8, Math.round(((stepIdx + 1) / FLOW_STEPS.length) * 100))}%`,
                      background: cfg.dot,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div style={{ background: '#fafbfc', borderTop: '1px solid #e2e8f0', padding: '20px 24px' }}>

                      {/* Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                        {/* Products */}
                        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                            Requested Products ({productsList.length})
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                  <th style={{ padding: '7px 10px', textAlign: 'center', width: 32, color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>#</th>
                                  <th style={{ padding: '7px 10px', textAlign: 'left', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Product Name</th>
                                  <th style={{ padding: '7px 10px', textAlign: 'left', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Code</th>
                                  <th style={{ padding: '7px 10px', textAlign: 'left', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {productsList.map((p, i) => (
                                  <tr key={i} style={{ borderBottom: i < (productsList.length - 1) ? '1px solid #f1f5f9' : 'none' }}>
                                    <td style={{ padding: '7px 10px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>{p.sn || i + 1}</td>
                                    <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0f172a' }}>{p.new_name || p.name}</td>
                                    <td style={{ padding: '7px 10px', color: '#64748b' }}>{p.new_code || p.code || '—'}</td>
                                    <td style={{ padding: '7px 10px' }}>
                                      <span style={{
                                        fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
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

                        {/* Contact & Meta */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Contact Person</div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{app.contact_name}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{app.contact_email}</div>
                            {app.contact_phone && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{app.contact_phone}</div>}
                          </div>

                          {app.message && (
                            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Client Note</div>
                              <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>{app.message}</div>
                            </div>
                          )}

                          {app.rejection_reason && (
                            <div style={{ background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca', padding: 14, color: '#991b1b', fontSize: 12 }}>
                              <strong>Rejection Reason:</strong> {app.rejection_reason}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
            );
          })
        )}
      </div>

      {/* ═══ MODALS ════════════════════════════════════════════════════════ */}

      {/* Accept, Hold, Or Reject */}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <button type="button"
                    onClick={() => setDecision('accepted')}
                    style={{
                      padding: '10px 8px', borderRadius: 10, border: `2px solid ${decision === 'accepted' ? '#16a34a' : '#e2e8f0'}`,
                      background: decision === 'accepted' ? '#f0fdf4' : 'white', cursor: 'pointer', fontWeight: 700, fontSize: 12.5,
                      color: decision === 'accepted' ? '#16a34a' : '#64748b', transition: 'all 0.15s'
                    }}>
                    ✅ Accept
                  </button>
                  <button type="button"
                    onClick={() => setDecision('on_hold')}
                    style={{
                      padding: '10px 8px', borderRadius: 10, border: `2px solid ${decision === 'on_hold' ? '#d97706' : '#e2e8f0'}`,
                      background: decision === 'on_hold' ? '#fffbeb' : 'white', cursor: 'pointer', fontWeight: 700, fontSize: 12.5,
                      color: decision === 'on_hold' ? '#d97706' : '#64748b', transition: 'all 0.15s'
                    }}>
                    ⏸️ Hold
                  </button>
                  <button type="button"
                    onClick={() => setDecision('rejected')}
                    style={{
                      padding: '10px 8px', borderRadius: 10, border: `2px solid ${decision === 'rejected' ? '#ef4444' : '#e2e8f0'}`,
                      background: decision === 'rejected' ? '#fef2f2' : 'white', cursor: 'pointer', fontWeight: 700, fontSize: 12.5,
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
              ) : decision === 'on_hold' ? (
                <div className="form-group animate-in">
                  <label className="form-label">Hold Reason / Note</label>
                  <textarea className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Explain why this request is being placed on hold..." />
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
                      const isSelected = selectedFtIds.includes(String(ft._id));
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
