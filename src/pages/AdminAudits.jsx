import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Calendar, Search, Filter, ExternalLink, Settings,
  CheckCircle, Play, Clock, RefreshCw, UserCheck, Eye,
  AlertTriangle, AlertCircle, FileText, Download, MessageSquare,
  Plus, X, Send, ShieldCheck, ChevronRight, CheckCircle2,
  Building2, MapPin, Award, Layers, SlidersHorizontal
} from 'lucide-react';
import AuditManageModal from '../components/AuditManageModal';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/') || url.startsWith('/uploads/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AdminAudits() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('filter') || 'all';

  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all'); // all | 1 | 2
  const [selectedAuditForModal, setSelectedAuditForModal] = useState(null);

  // NC Modal states
  const [selectedAuditForNc, setSelectedAuditForNc] = useState(null);
  const [showFlagNcModal, setShowFlagNcModal] = useState(false);
  const [flagNcForm, setFlagNcForm] = useState({ text: '', file: null });
  const [replyNcForm, setReplyNcForm] = useState({ reply_text: '', file: null });
  const [ncSubmitting, setNcSubmitting] = useState(false);

  const fetchAudits = () => {
    setLoading(true);
    api.get('/api/audits')
      .then((res) => {
        const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setAudits(data);
      })
      .catch(() => toast.error('Failed to load audits.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const updateStatus = async (id, status, findings = '') => {
    try {
      await api.put(`/api/audits/${id}`, { status, findings });
      toast.success(`Audit status updated to ${formatProcessStatus(status)}`);
      fetchAudits();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update audit');
    }
  };

  const handleCloseNc = async (auditId, appId, reportId) => {
    setNcSubmitting(true);
    try {
      await api.post('/api/audits/nc-close', {
        audit_id: auditId,
        application_id: appId,
        report_id: reportId,
        note: 'NC closed by admin via Audits & NCs Management portal.'
      });
      toast.success('Non-Conformity closed successfully!');
      fetchAudits();
      // Update local modal state
      if (selectedAuditForNc) {
        setSelectedAuditForNc(prev => {
          if (!prev) return null;
          const updatedReports = (prev.nc_reports || []).map(r => {
            if (!reportId || String(r._id) === String(reportId)) {
              return { ...r, status: 'closed' };
            }
            return r;
          });
          return { ...prev, nc_reports: updatedReports };
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to close NC');
    } finally {
      setNcSubmitting(false);
    }
  };

  const handleSendNcReply = async (auditId, appId) => {
    if (!replyNcForm.reply_text.trim() && !replyNcForm.file) {
      toast.error('Please enter reply text or attach a file.');
      return;
    }
    setNcSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('audit_id', auditId);
      formData.append('application_id', appId);
      formData.append('reply_text', replyNcForm.reply_text.trim());
      if (replyNcForm.file) {
        formData.append('reply_document', replyNcForm.file);
      }

      await api.post('/api/audits/nc-reply', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Reply submitted to client successfully.');
      setReplyNcForm({ reply_text: '', file: null });
      fetchAudits();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to send reply');
    } finally {
      setNcSubmitting(false);
    }
  };

  const handleFlagNewNc = async (auditId, appId) => {
    if (!flagNcForm.text.trim()) {
      toast.error('Please describe the non-conformity observation.');
      return;
    }
    setNcSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('audit_id', auditId);
      formData.append('application_id', appId);
      formData.append('text', flagNcForm.text.trim());
      if (flagNcForm.file) {
        formData.append('nc_document', flagNcForm.file);
      }

      await api.post('/api/audits/flag-nc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Non-Conformity flagged and client notified.');
      setFlagNcForm({ text: '', file: null });
      setShowFlagNcModal(false);
      fetchAudits();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to flag NC');
    } finally {
      setNcSubmitting(false);
    }
  };

  const STATUS_BADGE = {
    scheduled: 'badge-blue',
    in_progress: 'badge-yellow',
    completed: 'badge-green',
    cancelled: 'badge-red',
    pending: 'badge-gray',
    dates_proposed: 'badge-yellow',
    dates_rejected: 'badge-red',
    dates_accepted: 'badge-blue',
    date_finalized: 'badge-blue',
    auditors_assigned: 'badge-indigo',
    audit_completed: 'badge-green',
    audit_successful: 'badge-green',
    nc_flagged: 'badge-red',
    nc_closed: 'badge-green'
  };


  const formatProcessStatus = (s) => {
    if (!s) return 'Pending';
    const statusMap = {
      dates_proposed: 'Dates Proposed',
      dates_accepted: 'Dates Accepted',
      dates_rejected: 'Dates Rejected',
      date_finalized: 'Date Finalized',
      auditors_assigned: 'Auditors Assigned',
      audit_assigned: 'Auditors Assigned',
      audit_completed: 'Audit Completed',
      audit_successful: 'Audit Successful',
      on_hold: 'On Hold',
      pending: 'Pending',
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      nc_flagged: 'NC Flagged',
      nc_closed: 'NC Closed',
      audit_report_submitted: 'Audit Report Submitted',
    };
    if (statusMap[s]) return statusMap[s];
    return s
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper to get active NC state for an audit
  const getAuditNcSummary = (audit) => {
    const ncList = audit.nc_reports || [];
    if (ncList.length === 0) {
      return { count: 0, hasActive: false, hasResponse: false, isClosed: false };
    }
    const hasActive = ncList.some(r => ['flagged', 'client_responded', 'admin_replied'].includes(r.status));
    const hasResponse = ncList.some(r => r.status === 'client_responded' || r.client_response || r.correction_document_url || r.client_response_url);
    const isClosed = !hasActive && ncList.some(r => r.status === 'closed');
    return { count: ncList.length, hasActive, hasResponse, isClosed };
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = audits.length;
    const upcoming = audits.filter(a => !['audit_completed', 'completed', 'cancelled'].includes(a.status)).length;
    const pending = audits.filter(a => ['pending', 'dates_proposed', 'dates_rejected'].includes(a.status)).length;
    const withNc = audits.filter(a => {
      const s = getAuditNcSummary(a);
      return s.count > 0;
    }).length;
    const activeNc = audits.filter(a => {
      const s = getAuditNcSummary(a);
      return s.hasActive;
    }).length;
    const completed = audits.filter(a => ['audit_completed', 'completed', 'audit_successful'].includes(a.status)).length;

    return { total, upcoming, pending, withNc, activeNc, completed };
  }, [audits]);

  // Filtered audits
  const filteredAudits = useMemo(() => {
    return audits.filter(a => {
      // 1. Tab filter
      if (activeTab === 'upcoming') {
        if (['audit_completed', 'completed', 'cancelled'].includes(a.status)) return false;
      } else if (activeTab === 'pending') {
        if (!['pending', 'dates_proposed', 'dates_rejected'].includes(a.status)) return false;
      } else if (activeTab === 'ncs') {
        const ncSummary = getAuditNcSummary(a);
        if (ncSummary.count === 0 && a.status !== 'nc_flagged' && a.status !== 'on_hold') return false;
      } else if (activeTab === 'completed') {
        if (!['audit_completed', 'completed', 'audit_successful'].includes(a.status)) return false;
      }

      // 2. Stage filter
      if (stageFilter === '1' && a.stage !== 1) return false;
      if (stageFilter === '2' && a.stage !== 2) return false;

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const comp = (a.company_name || a.profiles?.company_name || a.applications?.establishment_name || '').toLowerCase();
        const site = (a.site_name || a.sites?.name || a.applications?.site_name || '').toLowerCase();
        const ref = (a.applications?.application_number || a.application_id?.application_number || '').toLowerCase();
        const auditors = (a.auditors?.map(x => x.name).join(' ') || a.inspectors?.full_name || '').toLowerCase();
        const ncText = (a.nc_reports?.map(x => x.text).join(' ') || '').toLowerCase();

        if (!comp.includes(q) && !site.includes(q) && !ref.includes(q) && !auditors.includes(q) && !ncText.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [audits, activeTab, stageFilter, search]);

  return (
    <div className="page-content" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Audit &amp; NC Management
          </h1>
          <p style={{ color: '#64748b', fontSize: 13.5, margin: 0 }}>
            Track upcoming audit schedules, auditor assignments, site visits, and manage Non-Conformity (NC) resolutions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={() => navigate('/audit-reports')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, borderRadius: 8, height: 38, background: '#fff' }}
          >
            <FileText size={15} style={{ color: '#047857' }} /> Audit Reports
          </button>

          <button
            className="btn btn-primary"
            onClick={fetchAudits}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, borderRadius: 8, height: 38 }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Total Audits */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: 14,
            cursor: 'pointer',
            border: activeTab === 'all' ? '2px solid var(--primary)' : '1px solid #e2e8f0',
            background: activeTab === 'all' ? '#f0fdf4' : '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setSearchParams({ filter: 'all' })}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Audits</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={16} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>{metrics.total}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Across all facilities</div>
        </div>

        {/* Upcoming / Scheduled */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: 14,
            cursor: 'pointer',
            border: activeTab === 'upcoming' ? '2px solid #0284c7' : '1px solid #e2e8f0',
            background: activeTab === 'upcoming' ? '#f0f9ff' : '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setSearchParams({ filter: 'upcoming' })}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Upcoming / Scheduled</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} style={{ color: '#0284c7' }} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0284c7', marginTop: 6 }}>{metrics.upcoming}</div>
          <div style={{ fontSize: 12, color: '#0369a1', marginTop: 2 }}>{metrics.pending} dates pending confirmation</div>
        </div>

        {/* Non-Conformities (NCs) */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: 14,
            cursor: 'pointer',
            border: activeTab === 'ncs' ? '2px solid #dc2626' : (metrics.activeNc > 0 ? '1.5px solid #fecaca' : '1px solid #e2e8f0'),
            background: activeTab === 'ncs' ? '#fef2f2' : (metrics.activeNc > 0 ? '#fffafa' : '#fff'),
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setSearchParams({ filter: 'ncs' })}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Non-Conformities (NCs)</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} style={{ color: '#dc2626' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>{metrics.activeNc}</span>
            {metrics.activeNc > 0 && (
              <span style={{ fontSize: 10.5, fontWeight: 800, background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 4 }}>
                ACTION NEEDED
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2 }}>{metrics.withNc} total NC recorded findings</div>
        </div>

        {/* Audit Completed */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: 14,
            cursor: 'pointer',
            border: activeTab === 'completed' ? '2px solid #16a34a' : '1px solid #e2e8f0',
            background: activeTab === 'completed' ? '#f0fdf4' : '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setSearchParams({ filter: 'completed' })}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audit Completed</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 6 }}>{metrics.completed}</div>
          <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>Successfully concluded</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSearchParams({ filter: 'all' })}
          style={{ fontWeight: 700, borderRadius: 8, padding: '6px 14px' }}
        >
          All Audits ({metrics.total})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSearchParams({ filter: 'upcoming' })}
          style={{ fontWeight: 700, borderRadius: 8, padding: '6px 14px' }}
        >
          Upcoming ({metrics.upcoming})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSearchParams({ filter: 'pending' })}
          style={{ fontWeight: 700, borderRadius: 8, padding: '6px 14px' }}
        >
          Dates Pending ({metrics.pending})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'ncs' ? 'btn-danger' : 'btn-ghost'}`}
          onClick={() => setSearchParams({ filter: 'ncs' })}
          style={{ fontWeight: 700, borderRadius: 8, padding: '6px 14px', gap: 6 }}
        >
          <AlertTriangle size={13} /> Non-Conformities (NCs) ({metrics.withNc})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'completed' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSearchParams({ filter: 'completed' })}
          style={{ fontWeight: 700, borderRadius: 8, padding: '6px 14px' }}
        >
          Completed ({metrics.completed})
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="card" style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by company name, site location, auditor name, or NC observation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: 38, height: 38, borderRadius: 8, fontSize: 13, background: '#f8fafc', border: '1px solid #e2e8f0' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Stage:</div>
            <select
              className="form-control"
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              style={{ height: 38, borderRadius: 8, fontSize: 12.5, width: 130, background: '#fff', border: '1px solid #e2e8f0' }}
            >
              <option value="all">All Stages</option>
              <option value="1">Stage 1</option>
              <option value="2">Stage 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audits Table Card */}
      <div className="card" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: '#64748b', fontSize: 13.5 }}>Loading audit records...</div>
            </div>
          ) : filteredAudits.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Calendar size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>No Audits Found</div>
              <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                {search ? 'No audit sessions match your search query.' : 'No audit records in this category.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 220 }}>Company &amp; Site</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 130 }}>Type &amp; Stage</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 200 }}>Assigned Auditor Team</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 150 }}>Audit Schedule</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 140 }}>Audit Status</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 170 }}>Non-Conformity (NC)</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', minWidth: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.map(a => {
                  const auditId = a._id || a.id;
                  const appId = a.application_id?._id || a.application_id || a.applications?._id || a.applications?.id;
                  const compName = a.company_name || a.profiles?.company_name || a.applications?.establishment_name || 'Client Facility';
                  const siteName = a.site_name || a.sites?.name || a.applications?.site_name || 'Main Facility Site';
                  const ncSummary = getAuditNcSummary(a);
                  const auditDate = a.finalized_date || a.scheduled_date || a.selected_dates?.[0];

                  return (
                    <tr key={auditId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                      {/* Company & Site (Clean, modern, no ref pill) */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Building2 size={17} style={{ color: '#475569' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{compName}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={11.5} style={{ color: '#94a3b8', flexShrink: 0 }} />
                              <span>Site: <strong>{siteName}</strong></span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type & Stage */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                          {a.audit_type || 'Standard Halal Audit'}
                        </div>
                        {a.stage && (
                          <div style={{ marginTop: 4 }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: a.stage === 2 ? '#f5f3ff' : '#f0fdf4',
                              color: a.stage === 2 ? '#7c3aed' : '#15803d',
                              border: `1px solid ${a.stage === 2 ? '#ddd6fe' : '#bbf7d0'}`
                            }}>
                              Stage {a.stage}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Assigned Auditor Team */}
                      <td style={{ padding: '16px 20px' }}>
                        {a.auditors && a.auditors.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {a.auditors.map((aud, i) => (
                              <div key={i} style={{ fontSize: 12.5, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                                <UserCheck size={13.5} style={{ color: '#0284c7', flexShrink: 0 }} />
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{aud.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <UserCheck size={13} style={{ color: '#cbd5e1' }} />
                            <span>{a.inspectors?.full_name || 'Unassigned'}</span>
                          </div>
                        )}
                      </td>

                      {/* Audit Schedule */}
                      <td style={{ padding: '16px 20px' }}>
                        {auditDate ? (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Calendar size={13.5} style={{ color: '#15803d' }} />
                              {new Date(auditDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div style={{ fontSize: 11, color: '#15803d', marginTop: 2, fontWeight: 600 }}>
                              Confirmed Date
                            </div>
                          </div>
                        ) : a.status === 'dates_proposed' ? (
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: '#fffbeb', padding: '2px 7px', borderRadius: 6, border: '1px solid #fde68a' }}>
                              3 Dates Proposed
                            </span>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Awaiting client choice</div>
                          </div>
                        ) : a.status === 'dates_accepted' ? (
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#eff6ff', padding: '2px 7px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                              Dates Accepted
                            </span>
                            <div style={{ fontSize: 11, color: '#0284c7', marginTop: 3 }}>Ready for confirmation</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12.5, color: '#94a3b8' }}>Unscheduled</span>
                        )}
                      </td>

                      {/* Audit Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span className={`badge ${STATUS_BADGE[a.status] || 'badge-gray'}`} style={{ fontWeight: 700, fontSize: 11.5, padding: '3px 9px', borderRadius: 12 }}>
                          {formatProcessStatus(a.status)}
                        </span>
                      </td>

                      {/* NC Status */}
                      <td style={{ padding: '16px 20px' }}>
                        {ncSummary.count === 0 ? (
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12.5} /> Clean / No NC
                          </span>
                        ) : ncSummary.hasResponse ? (
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <FileText size={12.5} /> Client Evidence
                          </span>
                        ) : ncSummary.hasActive ? (
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={12.5} /> {ncSummary.count} NC Flagged
                          </span>
                        ) : (
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12.5} /> NC Closed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {/* Manage Audit Modal */}
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setSelectedAuditForModal(a)}
                            style={{ fontSize: 12, fontWeight: 700, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                            title="Manage Schedule & Assign Team"
                          >
                            <Settings size={12.5} /> Manage
                          </button>

                          {/* NC Details Modal */}
                          <button
                            className={`btn btn-sm ${ncSummary.count > 0 ? (ncSummary.hasActive ? 'btn-danger' : 'btn-outline') : 'btn-ghost'}`}
                            onClick={() => setSelectedAuditForNc(a)}
                            style={{ fontSize: 12, fontWeight: 700, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 6 }}
                            title="View / Resolve Non-Conformities"
                          >
                            <AlertTriangle size={12.5} />
                            NCs {ncSummary.count > 0 ? `(${ncSummary.count})` : ''}
                          </button>

                          {/* Application Link */}
                          {appId && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => navigate(`/applications/${appId}/processing`)}
                              style={{ fontSize: 12, fontWeight: 700, padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff' }}
                              title="Open Application Processing"
                            >
                              <ExternalLink size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Audit Manage Modal */}
      {selectedAuditForModal && (
        <AuditManageModal
          audit={selectedAuditForModal}
          applicationId={selectedAuditForModal.application_id?._id || selectedAuditForModal.application_id || selectedAuditForModal.applications?._id || selectedAuditForModal.applications?.id}
          onClose={() => setSelectedAuditForModal(null)}
          onSuccess={() => {
            setSelectedAuditForModal(null);
            fetchAudits();
          }}
        />
      )}

      {/* Detailed NC Management Modal */}
      {selectedAuditForNc && (
        <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={() => setSelectedAuditForNc(null)}>
          <div className="modal" style={{ maxWidth: 680, width: '94%', borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={18} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <div className="modal-title" style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Non-Conformity (NC) &amp; Findings</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                    {selectedAuditForNc.company_name} &bull; Site: {selectedAuditForNc.site_name}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedAuditForNc(null)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px 24px' }}>
              {/* Existing NC Reports List */}
              {(!selectedAuditForNc.nc_reports || selectedAuditForNc.nc_reports.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                  <CheckCircle2 size={36} style={{ color: '#16a34a', margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>No Non-Conformities Recorded</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    This audit session is currently clean with no flagged non-conformities.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
                  {selectedAuditForNc.nc_reports.map((nc, idx) => {
                    const isClosed = nc.status === 'closed';
                    const hasClientResp = !!(nc.client_response || nc.correction_document_url || nc.client_response_url);

                    return (
                      <div
                        key={nc._id || idx}
                        style={{
                          background: isClosed ? '#f8fafc' : '#fff',
                          border: `1.5px solid ${isClosed ? '#bbf7d0' : '#fecaca'}`,
                          borderRadius: 12,
                          padding: '16px 18px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        {/* NC Item Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: isClosed ? '#15803d' : '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isClosed ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                            NC Finding #{idx + 1}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: isClosed ? '#f0fdf4' : hasClientResp ? '#f5f3ff' : '#fef2f2',
                              color: isClosed ? '#15803d' : hasClientResp ? '#7c3aed' : '#b91c1c',
                              border: `1px solid ${isClosed ? '#bbf7d0' : hasClientResp ? '#ddd6fe' : '#fecaca'}`
                            }}
                          >
                            {isClosed ? 'Closed / Resolved' : hasClientResp ? 'Client Submitted Evidence' : 'Awaiting Client Action'}
                          </span>
                        </div>

                        {/* Observation Text */}
                        <div style={{ background: '#fafafb', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 3 }}>
                            Auditor Observation / Finding:
                          </div>
                          <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.5 }}>
                            {nc.text || 'Non-conformity observation noted during audit inspection.'}
                          </div>
                        </div>

                        {/* Flagged NC Document */}
                        {(nc.document_url || nc.url) && (
                          <div style={{ marginBottom: 10 }}>
                            <a
                              href={getPdfUrl(nc.document_url || nc.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, borderRadius: 6 }}
                            >
                              <Download size={13} /> Download Flagged NC Report Sheet
                            </a>
                          </div>
                        )}

                        {/* Client Response Evidence */}
                        {hasClientResp && (
                          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: 12, marginTop: 10, marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FileText size={13} /> Client Corrective Action Response
                            </div>
                            {nc.client_response && (
                              <div style={{ fontSize: 12.5, color: '#4c1d95', marginBottom: 8, lineHeight: 1.5 }}>
                                &ldquo;{nc.client_response}&rdquo;
                              </div>
                            )}
                            {(nc.correction_document_url || nc.client_response_url) && (
                              <a
                                href={getPdfUrl(nc.correction_document_url || nc.client_response_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-primary btn-sm"
                                style={{ background: '#6d28d9', borderColor: '#6d28d9', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 6 }}
                              >
                                <Download size={13} /> View / Download Client Corrective Proof
                              </a>
                            )}
                          </div>
                        )}

                        {/* Admin Reply History */}
                        {nc.admin_reply && (
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10, marginTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 3 }}>
                              💬 HFA Guidance / Reply:
                            </div>
                            <div style={{ fontSize: 12.5, color: '#166534' }}>{nc.admin_reply}</div>
                          </div>
                        )}

                        {/* NC Action Footer */}
                        {!isClosed && (
                          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 700, gap: 6, borderRadius: 6 }}
                              disabled={ncSubmitting}
                              onClick={() => handleCloseNc(selectedAuditForNc._id || selectedAuditForNc.id, selectedAuditForNc.application_id?._id || selectedAuditForNc.application_id, nc._id)}
                            >
                              <CheckCircle size={13.5} /> Close &amp; Accept Non-Conformity
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Admin Reply Form */}
              {selectedAuditForNc.nc_reports && selectedAuditForNc.nc_reports.some(r => r.status !== 'closed') && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={13} style={{ color: 'var(--primary)' }} /> Send Additional Guidance / Reply to Client
                  </div>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Enter instructions, notes, or feedback for the client..."
                    value={replyNcForm.reply_text}
                    onChange={e => setReplyNcForm({ ...replyNcForm, reply_text: e.target.value })}
                    style={{ fontSize: 12.5, background: 'white', marginBottom: 8, borderRadius: 6 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <input
                      type="file"
                      style={{ fontSize: 12 }}
                      onChange={e => setReplyNcForm({ ...replyNcForm, file: e.target.files[0] || null })}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={ncSubmitting}
                      onClick={() => handleSendNcReply(selectedAuditForNc._id || selectedAuditForNc.id, selectedAuditForNc.application_id?._id || selectedAuditForNc.application_id)}
                      style={{ gap: 6, borderRadius: 6 }}
                    >
                      <Send size={12.5} /> Send Reply
                    </button>
                  </div>
                </div>
              )}

              {/* Action to Flag New NC */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ gap: 6, color: '#dc2626', borderColor: '#fecaca', borderRadius: 6 }}
                  onClick={() => setShowFlagNcModal(true)}
                >
                  <Plus size={13} /> Flag New Non-Conformity
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9' }}>
              <button className="btn btn-ghost" onClick={() => setSelectedAuditForNc(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag New NC Modal */}
      {showFlagNcModal && selectedAuditForNc && (
        <div className="modal-overlay" style={{ zIndex: 1300 }} onClick={() => setShowFlagNcModal(false)}>
          <div className="modal" style={{ maxWidth: 480, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div className="modal-title" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                <AlertTriangle size={18} /> Flag Non-Conformity (NC)
              </div>
              <button className="modal-close" onClick={() => setShowFlagNcModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 700 }}>Observation / Non-Conformity Description <span>*</span></label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Detail the non-conformity findings discovered during audit..."
                  value={flagNcForm.text}
                  onChange={e => setFlagNcForm({ ...flagNcForm, text: e.target.value })}
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 700 }}>Upload NC Observation Sheet (PDF / Image)</label>
                <input
                  type="file"
                  className="form-control"
                  onChange={e => setFlagNcForm({ ...flagNcForm, file: e.target.files[0] || null })}
                  style={{ borderRadius: 8, fontSize: 12 }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9' }}>
              <button className="btn btn-ghost" onClick={() => setShowFlagNcModal(false)}>Cancel</button>
              <button
                className="btn btn-danger"
                disabled={ncSubmitting}
                onClick={() => handleFlagNewNc(selectedAuditForNc._id || selectedAuditForNc.id, selectedAuditForNc.application_id?._id || selectedAuditForNc.application_id)}
                style={{ borderRadius: 8 }}
              >
                {ncSubmitting ? 'Flagging NC...' : 'Flag NC & Notify Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
