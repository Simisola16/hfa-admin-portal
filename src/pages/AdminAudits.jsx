import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Calendar, Search, Filter, ExternalLink, Settings,
  CheckCircle, Play, Clock, RefreshCw, UserCheck, Eye, PenTool
} from 'lucide-react';
import AuditManageModal from '../components/AuditManageModal';

export default function AdminAudits() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') || 'all';

  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAuditForModal, setSelectedAuditForModal] = useState(null);

  const fetchAudits = () => {
    setLoading(true);
    api.get('/api/audits')
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setAudits(Array.isArray(data) ? data : []);
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
    audit_completed: 'badge-green'
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

  const filteredAudits = audits.filter(a => {
    // Tab filter
    if (filter === 'upcoming') {
      if (a.status === 'audit_completed' || a.status === 'completed' || a.status === 'cancelled') return false;
    } else if (filter === 'completed') {
      if (a.status !== 'audit_completed' && a.status !== 'completed') return false;
    } else if (filter === 'pending') {
      if (!['pending', 'dates_proposed', 'dates_rejected'].includes(a.status)) return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const company = (a.profiles?.company_name || a.applications?.establishment_name || a.applications?.profiles?.company_name || a.company_name || '').toLowerCase();
      const inspector = (a.inspectors?.full_name || a.auditors?.map(x => x.name).join(', ') || '').toLowerCase();
      const site = (a.sites?.name || a.applications?.establishment_address || '').toLowerCase();
      const type = (a.audit_type || '').toLowerCase();

      if (!company.includes(q) && !inspector.includes(q) && !site.includes(q) && !type.includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Audit Schedule &amp; Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>
            Track audit dates, assigned lead auditors/inspectors, audit execution, and non-conformance findings.
          </p>
        </div>

        <button
          className="btn btn-outline"
          onClick={fetchAudits}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}
        >
          <RefreshCw size={15} /> Refresh Schedule
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12, flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSearchParams({ filter: 'all' })}
        >
          All Audits ({audits.length})
        </button>
        <button
          className={`btn btn-sm ${filter === 'upcoming' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSearchParams({ filter: 'upcoming' })}
        >
          Upcoming ({audits.filter(a => a.status !== 'audit_completed' && a.status !== 'completed' && a.status !== 'cancelled').length})
        </button>
        <button
          className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSearchParams({ filter: 'pending' })}
        >
          Dates Pending ({audits.filter(a => ['pending', 'dates_proposed', 'dates_rejected'].includes(a.status)).length})
        </button>
        <button
          className={`btn btn-sm ${filter === 'completed' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSearchParams({ filter: 'completed' })}
        >
          Completed ({audits.filter(a => a.status === 'audit_completed' || a.status === 'completed').length})
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="search-box" style={{ maxWidth: 400 }}>
          <Search size={15} className="search-icon" />
          <input
            placeholder="Search company, auditor, site, or type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="card shadow-sm border-0" style={{ marginTop: 0 }}>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : filteredAudits.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Calendar size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
              <div className="empty-state-title" style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>
                No Audits Found
              </div>
              <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                {filter === 'upcoming' ? 'No upcoming audits currently scheduled.' : 'No audit records match your filters.'}
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Company &amp; Category</th>
                  <th>Auditor</th>
                  <th>Site Location</th>
                  <th>Type</th>
                  <th>Scheduled Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.map(a => {
                  const auditId = a.id || a._id;
                  const appId = a.application_id?._id || a.application_id || a.applications?._id || a.applications?.id;
                  const compName = a.profiles?.company_name || a.applications?.establishment_name || a.applications?.profiles?.company_name || a.company_name || 'Company Facility';
                  const category = a.applications?.category || a.audit_type || 'Standard Audit';
                  const auditorNames = a.inspectors?.full_name || (Array.isArray(a.auditors) && a.auditors.map(x => x.name || x.full_name).filter(Boolean).join(', ')) || 'Unassigned';
                  const siteLocation = a.sites?.name || a.applications?.establishment_address || '—';
                  const auditDate = a.scheduled_date || a.finalized_date;

                  return (
                    <tr key={auditId}>
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0f172a' }}>
                        <div>{compName}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>{category}</div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserCheck size={14} style={{ color: '#0284c7' }} />
                          {auditorNames}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: 12.5, color: '#64748b' }}>
                        {siteLocation}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontWeight: 600, fontSize: 12.5, color: '#1e293b' }}>
                          {a.audit_type || (a.stage ? `Stage ${a.stage}` : 'Standard Audit')}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: 12.5, color: '#64748b' }}>
                        {auditDate ? new Date(auditDate).toLocaleDateString('en-GB') : '—'}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span className={`badge ${STATUS_BADGE[a.status] || 'badge-gray'}`} style={{ fontWeight: 700 }}>
                          {formatProcessStatus(a.status)}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {/* Manage Audit Modal Button */}
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setSelectedAuditForModal(a)}
                            style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                            title="Manage Audit Dates & Team"
                          >
                            <Settings size={13} /> Manage
                          </button>

                          {/* Quick Start for scheduled */}
                          {a.status === 'scheduled' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => updateStatus(auditId, 'in_progress')}
                              style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, borderColor: '#f59e0b', color: '#b45309' }}
                              title="Start Audit"
                            >
                              <Play size={12} /> Start
                            </button>
                          )}

                          {/* Quick Complete for in_progress */}
                          {a.status === 'in_progress' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => updateStatus(auditId, 'completed')}
                              style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, borderColor: '#16a34a', color: '#16a34a' }}
                              title="Complete Audit"
                            >
                              <CheckCircle size={12} /> Complete
                            </button>
                          )}

                          {/* Open Application Processing Link */}
                          {appId && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => navigate(`/applications/${appId}/processing`)}
                              style={{ fontSize: 12, fontWeight: 700, padding: '6px 8px' }}
                              title="Open Application Processing"
                            >
                              <ExternalLink size={14} />
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
    </div>
  );
}
