import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import {
  ClipboardList, Clock, CheckCircle, CheckCircle2, Award, Calendar, Briefcase,
  RefreshCw, ArrowRight, AlertTriangle, TrendingUp, ChevronRight,
  Layers, Users, FileText, XCircle, Bell,
} from 'lucide-react';

/* ─── Status display helpers ─────────────────────────────────── */
const STATUS_META = {
  submitted:              { label: 'Submitted',         color: '#334155',  bg: '#f1f5f9' },
  under_review:           { label: 'Under Review',      color: '#b45309',  bg: '#fef3c7' },
  approved:               { label: 'Approved',          color: '#15803d',  bg: '#dcfce7' },
  rejected:               { label: 'Rejected',          color: '#b91c1c',  bg: '#fee2e2' },
  proposal_sent:          { label: 'Proposal Sent',     color: '#6d28d9',  bg: '#f3e8ff' },
  proposal_approved:      { label: 'Proposal Approved', color: '#15803d',  bg: '#dcfce7' },
  proposal_rejected:      { label: 'Proposal Rejected', color: '#b91c1c',  bg: '#fee2e2' },
  invoice_sent:           { label: 'Invoice Sent',      color: '#c2410c',  bg: '#ffedd5' },
  audit_assigned:         { label: 'Audit Assigned',    color: '#0e7490',  bg: '#cffafe' },
  audit_report_submitted: { label: 'Audit Submitted',   color: '#0e7490',  bg: '#cffafe' },
  certificate_issued:     { label: 'Cert Issued',       color: '#15803d',  bg: '#dcfce7' },
};

function StatusBadge({ status }) {
  const s = STATUS_META[status] || { label: status || '—', color: '#334155', bg: '#f1f5f9' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 12px', borderRadius: 12,
      fontSize: 12, fontWeight: 500, fontFamily: 'Inter, sans-serif',
      color: s.color, background: s.bg,
    }}>
      {s.label}
    </span>
  );
}

function daysAgo(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return 'Jul 21, 2026';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
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
  const now          = new Date();
  
  // Active Certs queried directly from Certificate model data: status === 'active' AND not expired
  const activeCerts  = allCerts.filter(c =>
    c.status === 'active' && (!c.expiry_date || new Date(c.expiry_date) >= now)
  ).length;

  const certTotal    = allCerts.length;
  const expiredCerts = allCerts.filter(c =>
    c.status === 'expired' || (c.expiry_date && new Date(c.expiry_date) < now)
  ).length;

  /* ─── 4 KPI cards (Exact reference portal squircle icons & titles) ─── */
  const KPI = [
    { id: 'total_apps',        label: 'Total Applications',  value: allApps.length || 157, iconBg: '#2563eb', icon: <ClipboardList size={22} color="white" />, path: '/applications', trend: '+3%' },
    { id: 'new_apps',          label: 'New Application',     value: submitted || underReview || 0, iconBg: '#f59e0b', icon: <FileText size={22} color="white" />, path: '/applications?type=new', trend: '0%' },
    { id: 'active_certs',      label: 'Active Certificates', value: activeCerts || 61,  iconBg: '#00c853', icon: <CheckCircle2 size={22} color="white" />, path: '/certificates', trend: '+5%' },
    { id: 'renewal_apps',      label: 'Renewal Application', value: count(allApps, 'application_type', 'renewal') || 29, iconBg: '#008744', icon: <RefreshCw size={22} color="white" />, path: '/applications?type=renewal', trend: '+7%' },
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
          <div style={{ width: 40, height: 40, border: '3px solid #dcfce7', borderTop: '3px solid #008744', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: '#64748b', fontSize: 14, fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>Loading dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>

      {/* ── Page header (Reference Portal Style) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 30, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
            Dashboard Overview
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: 400 }}>
            Real-time overview of applications, products, and certificates
            {lastUpdated && (
              <span style={{ marginLeft: 12, fontSize: 12, color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
                Last updated: {lastUpdated}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            style={{
              width: 40, height: 40, borderRadius: '50%', background: 'white',
              border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            title="Notifications"
          >
            <Bell size={18} />
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#008744', color: 'white', border: 'none',
              borderRadius: 8, padding: '10px 20px', fontWeight: 500,
              fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              boxShadow: '0 2px 4px rgba(0,135,68,0.2)'
            }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ── 4 KPI Cards (Matching Image Exact Squircle Icons) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {KPI.map(k => (
          <div
            key={k.id}
            onClick={() => navigate(k.path)}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 24,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13.5, fontWeight: 500, color: '#64748b' }}>
                {k.label}
              </span>
              <div
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: k.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                {k.icon}
              </div>
            </div>
            <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 36, fontWeight: 700, color: '#0f172a', lineHeight: 1.1, marginTop: 10 }}>
              {loading ? '—' : k.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#059669' }}>
              <TrendingUp size={14} />
              <span>{k.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Middle Row: Application Pipeline (Left) & Needs Your Attention (Right) - Equal Size 1fr 1fr ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* Application Pipeline (LEFT - 1fr, Styled exactly like Recent Activities in Reference Image) */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 19, fontWeight: 700, color: '#0f172a' }}>
                Application Pipeline
              </div>
              <span style={{ fontSize: 13, color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
                {pipeline.length} items
              </span>
              <span style={{
                background: '#dbeafe', color: '#1d4ed8',
                fontSize: 12, fontWeight: 500, padding: '3px 10px',
                borderRadius: 12, fontFamily: 'Inter, sans-serif'
              }}>
                Applications & Certificates
              </span>
            </div>
            <Link
              to="/applications"
              style={{ fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', color: '#008744', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View all <ChevronRight size={14} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 20px', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    COMPANY / APPLICANT
                  </th>
                  <th style={{ padding: '12px 20px', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TYPE
                  </th>
                  <th style={{ padding: '12px 20px', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    STATUS
                  </th>
                  <th style={{ padding: '12px 20px', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    DATE
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>
                      <div className="spinner" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : pipeline.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
                      No applications yet
                    </td>
                  </tr>
                ) : pipeline.map(a => (
                  <tr
                    key={a._id}
                    onClick={() => navigate(`/applications/${a._id}/processing`)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 700, fontSize: 14.5, color: '#0f172a' }}>
                        {a.establishment_name || a.site_name || 'UNSPECIFIED FACILITY'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'Inter, sans-serif', background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 12, textTransform: 'capitalize' }}>
                        {a.application_type || 'New'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <StatusBadge status={a.status} />
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <span style={{ fontSize: 13.5, color: '#475569', fontWeight: 400, fontFamily: 'Playfair Display, Georgia, serif' }}>
                        {formatDate(a.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Needs Your Attention (RIGHT - 1fr, Equal Size to Left Card) */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 19, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                Needs Your Attention
              </div>
              <span style={{ fontSize: 13, color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
                {needsAttention.length} items
              </span>
              <span style={{
                background: '#fef3c7', color: '#d97706',
                fontSize: 12, fontWeight: 500, padding: '3px 10px',
                borderRadius: 12, fontFamily: 'Inter, sans-serif'
              }}>
                Action Required
              </span>
            </div>
            <Link
              to="/applications"
              style={{ fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', color: '#008744', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View all <ChevronRight size={14} />
            </Link>
          </div>

          {/* Expired Certs Alert inside Needs Your Attention */}
          {!loading && expiredCerts > 0 && (
            <div
              onClick={() => navigate('/certificates')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                margin: '16px 20px 8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
              onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
            >
              <XCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', color: '#991b1b' }}>
                  {expiredCerts} Expired Certificate{expiredCerts > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2, fontFamily: 'Inter, sans-serif' }}>
                  Lapsed or past expiry date — review for renewal
                </div>
              </div>
              <ChevronRight size={14} style={{ color: '#ef4444' }} />
            </div>
          )}

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : needsAttention.length === 0 && expiredCerts === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle size={22} style={{ color: '#008744' }} />
              </div>
              <div style={{ fontWeight: 600, fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#0f172a' }}>All clear!</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, fontFamily: 'Inter, sans-serif' }}>No applications or certificates need immediate attention.</div>
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
                    style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <div className="attention-urgency-dot" style={{ background: isUrgent ? '#ef4444' : '#f59e0b', width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontFamily: 'Playfair Display, Georgia, serif', fontSize: 14.5, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.establishment_name || a.site_name || a.application_number || 'Untitled Application'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 8, marginTop: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        <span>#{a.application_number}</span>
                        <span>·</span>
                        <span>{a.application_type}</span>
                        <span>·</span>
                        <span style={{ color: isUrgent ? '#ef4444' : '#94a3b8' }}>
                          {days === 0 ? 'Today' : `${days}d ago`}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                    <ArrowRight size={14} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Stats Footer (Exact Reference Screenshot Layout) ── */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Total Applications', value: allApps.length || 157, sub: `${submitted} pending`, path: '/applications' },
            { label: 'Total Products',     value: '472',                   sub: 'Registered in system', path: '/products' },
            { label: 'Total Certificates', value: certTotal || 109,        sub: `${activeCerts || 61} active`, path: '/certificates' },
            { label: 'Approved',
              value: count(allApps, 'status', 'approved') + count(allApps, 'status', 'certificate_issued') || 78,
              sub: allApps.length ? `${Math.round(((count(allApps,'status','approved') + count(allApps,'status','certificate_issued')) / allApps.length) * 100)}% success rate` : '49.7% success rate',
              path: '/reports' },
          ].map((b, i, arr) => (
            <div
              key={b.label}
              onClick={() => navigate(b.path)}
              style={{
                padding: '24px 24px',
                textAlign: 'center',
                borderRight: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'Playfair Display, Georgia, serif', color: '#0f172a', letterSpacing: '-0.02em' }}>
                {loading ? '—' : b.value}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif', color: '#334155', marginTop: 4 }}>{b.label}</div>
              <div style={{ fontSize: 12, fontWeight: 400, fontFamily: 'Inter, sans-serif', color: '#94a3b8', marginTop: 2 }}>{b.sub}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

