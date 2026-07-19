import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import {
  ClipboardList, Clock, CheckCircle, Award, Calendar, Briefcase,
  RefreshCw, ArrowRight, AlertTriangle, TrendingUp, ChevronRight,
  Layers, Users, FileText,
} from 'lucide-react';

/* ─── Status display helpers ─────────────────────────────────── */
const STATUS_META = {
  submitted:              { label: 'Submitted',         color: '#3b82f6',  bg: '#eff6ff', dot: '#3b82f6' },
  under_review:           { label: 'Under Review',      color: '#d97706',  bg: '#fffbeb', dot: '#f59e0b' },
  approved:               { label: 'Approved',          color: '#15803d',  bg: '#f0fdf4', dot: '#22c55e' },
  rejected:               { label: 'Rejected',          color: '#b91c1c',  bg: '#fef2f2', dot: '#ef4444' },
  proposal_sent:          { label: 'Proposal Sent',     color: '#7c3aed',  bg: '#f5f3ff', dot: '#8b5cf6' },
  proposal_approved:      { label: 'Proposal Approved', color: '#15803d',  bg: '#f0fdf4', dot: '#22c55e' },
  proposal_rejected:      { label: 'Proposal Rejected', color: '#b91c1c',  bg: '#fef2f2', dot: '#ef4444' },
  invoice_sent:           { label: 'Invoice Sent',      color: '#c2410c',  bg: '#fff7ed', dot: '#f97316' },
  audit_assigned:         { label: 'Audit Assigned',    color: '#0891b2',  bg: '#ecfeff', dot: '#06b6d4' },
  audit_report_submitted: { label: 'Audit Submitted',   color: '#0891b2',  bg: '#ecfeff', dot: '#06b6d4' },
  certificate_issued:     { label: 'Cert Issued',       color: '#15803d',  bg: '#f0fdf4', dot: '#22c55e' },
};

function StatusBadge({ status }) {
  const s = STATUS_META[status] || { label: status || '—', color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      color: s.color, background: s.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function daysAgo(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

/* ─── Component ─────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats,       setStats]      = useState(null);
  const [allApps,     setAllApps]    = useState([]);
  const [allCerts,    setAllCerts]   = useState([]);
  const [proposals,   setProposals]  = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, appsRes, certsRes, propRes] = await Promise.all([
        api.get('/api/reports/dashboard'),
        api.get('/api/applications'),
        api.get('/api/certificates').catch(() => ({ data: [] })),
        api.get('/api/proposals').catch(() => ({ data: [] })),
      ]);
      setStats(dashRes.data || dashRes);
      setAllApps(appsRes.data || []);
      setAllCerts(certsRes.data || []);
      setProposals(propRes.data || []);
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Derived counts ─── */
  const count = (arr, key, val) => arr.filter(a => a[key] === val).length;

  const submitted    = count(allApps, 'status', 'submitted');
  const underReview  = count(allApps, 'status', 'under_review');
  const proposalSent = count(allApps, 'status', 'proposal_sent');
  const auditsActive = count(allApps, 'status', 'audit_assigned')
                     + count(allApps, 'status', 'audit_report_submitted');
  const activeCerts  = count(allCerts, 'status', 'active');
  const certTotal    = allCerts.length;

  /* ─── KPI cards ─── */
  const KPI = [
    { label: 'Submitted',         sub: 'Awaiting review',       value: submitted,    accent: '#3b82f6', iconBg: '#eff6ff', iconColor: '#2563eb', icon: <ClipboardList size={20}/>, path: '/applications', urgent: submitted > 0 },
    { label: 'Under Review',      sub: 'Being processed',       value: underReview,  accent: '#f59e0b', iconBg: '#fffbeb', iconColor: '#d97706', icon: <Clock         size={20}/>, path: '/applications' },
    { label: 'Proposals Pending', sub: 'Awaiting client reply', value: proposalSent, accent: '#8b5cf6', iconBg: '#f5f3ff', iconColor: '#7c3aed', icon: <Briefcase     size={20}/>, path: '/proposals' },
    { label: 'Audits Active',     sub: 'In progress',           value: auditsActive, accent: '#06b6d4', iconBg: '#ecfeff', iconColor: '#0891b2', icon: <Calendar      size={20}/>, path: '/audits' },
    { label: 'Active Certs',      sub: 'Currently valid',       value: activeCerts,  accent: '#10b981', iconBg: '#f0fdf4', iconColor: '#059669', icon: <Award         size={20}/>, path: '/certificates' },
    { label: 'Total Certs',       sub: 'All time issued',       value: certTotal,    accent: '#15803d', iconBg: '#f0fdf4', iconColor: '#15803d', icon: <CheckCircle   size={20}/>, path: '/certificates' },
  ];

  /* ─── Needs Attention list ─── */
  const needsAttention = allApps
    .filter(a => a.status === 'submitted' || a.status === 'under_review')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(0, 7);

  /* ─── Pipeline: last 8 apps ─── */
  const pipeline = [...allApps]
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 8);

  /* ─── Loading skeleton ─── */
  if (loading && allApps.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #dcfce7', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 3, fontWeight: 500 }}>
            Certification management overview
            {lastUpdated && (
              <span style={{ marginLeft: 10, background: '#f1f5f9', color: '#475569', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                Updated {lastUpdated}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'white', color: '#0f172a', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { icon: <FileText size={18} style={{ color: '#2563eb' }} />, label: 'Processing Queue', sub: 'Review submitted applications', path: '/applications', accent: '#eff6ff' },
          { icon: <Briefcase size={18} style={{ color: '#7c3aed' }} />, label: 'Pending Proposals', sub: 'Open proposals awaiting response', path: '/proposals', accent: '#f5f3ff' },
          { icon: <Calendar size={18} style={{ color: '#0891b2' }} />, label: 'Manage Audits', sub: 'Assign auditors and review findings', path: '/audits', accent: '#ecfeff' },
        ].map(qa => (
          <button
            key={qa.label}
            className="quick-action-btn"
            onClick={() => navigate(qa.path)}
          >
            <div style={{ width: 34, height: 34, borderRadius: 9, background: qa.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              {qa.icon}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>{qa.label}</div>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>{qa.sub}</div>
          </button>
        ))}
      </div>

      {/* ── 6 KPI Cards ── */}
      <div className="kpi-grid">
        {KPI.map(k => (
          <div
            key={k.label}
            className="kpi-card"
            onClick={() => navigate(k.path)}
          >
            <div className="kpi-card-bar" style={{ background: k.accent }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: k.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.iconColor }}>
                {k.icon}
              </div>
              {k.urgent && (
                <span style={{ background: '#fef2f2', color: '#b91c1c', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <AlertTriangle size={9} /> Action needed
                </span>
              )}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {loading ? '—' : k.value}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginTop: 4 }}>{k.label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Bottom row: Needs Attention + Pipeline ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16, alignItems: 'start' }}>

        {/* Needs Your Attention */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div className="dash-section-header">
            <div>
              <div className="dash-section-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                Needs Your Attention
              </div>
              <div className="dash-section-sub">Applications waiting for action</div>
            </div>
            <Link
              to="/applications"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View all <ChevronRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : needsAttention.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle size={22} style={{ color: '#15803d' }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>All clear!</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>No applications need immediate attention.</div>
            </div>
          ) : (
            <div className="attention-list">
              {needsAttention.map(a => {
                const days = daysAgo(a.created_at);
                const isUrgent = days > 3;
                return (
                  <div
                    key={a._id}
                    className="attention-item"
                    onClick={() => navigate(`/applications/${a._id}/processing`)}
                  >
                    <div className="attention-urgency-dot" style={{ background: isUrgent ? '#ef4444' : '#f59e0b' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.establishment_name || a.site_name || a.application_number || 'Untitled Application'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                        <span>#{a.application_number}</span>
                        <span>·</span>
                        <span style={{ textTransform: 'capitalize' }}>{a.application_type}</span>
                        <span>·</span>
                        <span style={{ color: isUrgent ? '#ef4444' : '#94a3b8', fontWeight: isUrgent ? 700 : 500 }}>
                          {days === 0 ? 'Today' : `${days}d ago`}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                    <ArrowRight size={13} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pipeline Table */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div className="dash-section-header">
            <div>
              <div className="dash-section-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Layers size={14} style={{ color: '#64748b' }} />
                Application Pipeline
              </div>
              <div className="dash-section-sub">Most recent applications across all stages</div>
            </div>
            <Link
              to="/applications"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View all <ChevronRight size={12} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="pipeline-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>
                      <div className="spinner" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : pipeline.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: 13 }}>
                      No applications yet
                    </td>
                  </tr>
                ) : pipeline.map(a => (
                  <tr key={a._id} onClick={() => navigate(`/applications/${a._id}/processing`)}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>
                        #{a.application_number || '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.establishment_name || a.site_name || '—'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 12, textTransform: 'capitalize' }}>
                        {a.application_type || '—'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                        {daysAgo(a.created_at)}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Summary stats footer ── */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Total Applications', value: allApps.length, sub: `${submitted} awaiting review`, color: '#3b82f6', path: '/applications' },
            { label: 'All Certificates',   value: certTotal,      sub: `${activeCerts} currently active`, color: '#10b981', path: '/certificates' },
            { label: 'Proposals Sent',     value: count(allApps, 'status', 'proposal_sent'), sub: 'Pending client decision', color: '#8b5cf6', path: '/proposals' },
            { label: 'Approval Rate',
              value: allApps.length
                ? `${Math.round(((count(allApps,'status','approved') + count(allApps,'status','certificate_issued')) / allApps.length) * 100)}%`
                : '—',
              sub: 'Of all applications', color: '#15803d', path: '/reports' },
          ].map((b, i, arr) => (
            <div
              key={b.label}
              onClick={() => navigate(b.path)}
              style={{
                padding: '20px 24px',
                textAlign: 'center',
                borderRight: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <div style={{ fontSize: 30, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
                {loading ? '—' : b.value}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', marginTop: 3 }}>{b.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{b.sub}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
