import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  ClipboardList, Clock, CheckCircle, Package,
  RefreshCw, TrendingUp, BarChart2
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats,       setStats]      = useState(null);
  const [recentApps,  setRecentApps] = useState([]);
  const [recentCerts, setRecentCerts]= useState([]);
  const [loading,     setLoading]    = useState(true);
  const [lastUpdated, setLastUpdated]= useState('');
  const navigate = useNavigate();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/reports/dashboard'),
      api.get('/api/applications'),
      api.get('/api/certificates').catch(() => ({ data: [] })),
    ]).then(([s, apps, certs]) => {
      setStats(s.data || s);
      const allApps = (apps.data || []);
      const allCerts = (certs.data || []);
      // merge last 4 of each for "Recent Activities"
      const activities = [
        ...allApps.slice(0, 4).map(a => ({ ...a, _actType: 'Application' })),
        ...allCerts.slice(0, 4).map(c => ({ ...c, _actType: 'Certificate' })),
      ]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 4);
      setRecentApps(allApps.slice(0, 8));
      setRecentCerts(allCerts);
      // eslint-disable-next-line no-underscore-dangle
      setRecentApps(activities);
      setLastUpdated(new Date().toLocaleTimeString());
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const allApps  = stats?.applications  || [];
  const allCerts = stats?.certificates  || [];
  const allUsers = stats?.users         || [];
  const allProds = stats?.products      || [];
  const allAudits= stats?.audits        || [];

  const count = (arr, key, val) => arr.filter(a => a[key] === val).length;

  const totalApps    = allApps.length;
  const pendingApps  = count(allApps,  'status', 'submitted');
  const activeCerts  = count(allCerts, 'status', 'active');
  const pendingCerts = count(allCerts, 'status', 'pending');
  const expiredCerts = count(allCerts, 'status', 'expired');
  const totalProds   = allProds.length;
  const approvedApps = count(allApps,  'status', 'approved') + count(allApps, 'status', 'certificate_issued');
  const rejectedApps = count(allApps,  'status', 'rejected');

  const kpiCards = [
    {
      label: 'Total Applications',
      value: totalApps,
      trend: '+7%',
      icon: <ClipboardList size={24} />,
      iconBg: '#3b82f6',
      path: '/applications',
    },
    {
      label: 'Pending Applications',
      value: pendingApps,
      trend: '0%',
      icon: <Clock size={24} />,
      iconBg: '#f59e0b',
      path: '/applications',
    },
    {
      label: 'Active Certificates',
      value: activeCerts,
      trend: '+6%',
      icon: <CheckCircle size={24} />,
      iconBg: '#22c55e',
      path: '/certificates',
    },
    {
      label: 'Total Products',
      value: totalProds,
      trend: '+1%',
      icon: <Package size={24} />,
      iconBg: '#1B7A7A',
      path: '/products',
    },
  ];

  const appApprovedPct = totalApps ? Math.round((approvedApps / totalApps) * 100) : 0;
  const appPendingPct  = totalApps ? Math.round((pendingApps  / totalApps) * 100) : 0;
  const appRejectedPct = totalApps ? Math.round((rejectedApps / totalApps) * 100) : 0;

  const STATUS_BADGE = {
    submitted:         'badge-blue',
    under_review:      'badge-yellow',
    approved:          'badge-green',
    rejected:          'badge-red',
    on_hold:           'badge-orange',
    audit_scheduled:   'badge-purple',
    certificate_issued:'badge-green',
    active:            'badge-green',
    pending:           'badge-yellow',
    expired:           'badge-red',
    issued:            'badge-green',
    'PROPOSAL SENT':   'badge-purple',
  };

  /* ── styles ── */
  const page   = { background: '#f0f2f5', minHeight: '100vh', padding: '28px 32px' };
  const header = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 };
  const kpiGrid= { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 24 };
  const card   = { background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 24 };
  const midRow = { display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20, marginBottom: 24 };
  const botRow = { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' };

  return (
    <div style={page}>

      {/* ── Page Header ── */}
      <div style={header}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>Dashboard Overview</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Real-time overview of applications, products, and certificates
            {lastUpdated && <span style={{ marginLeft: 12, color: '#9ca3af' }}>Last updated: {lastUpdated}</span>}
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1B7A7A', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={kpiGrid}>
        {kpiCards.map(k => (
          <div
            key={k.label}
            onClick={() => navigate(k.path)}
            style={{ ...card, cursor: 'pointer', transition: 'box-shadow 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>{k.label}</p>
                <p style={{ fontSize: 32, fontWeight: 800, color: '#111827', margin: 0 }}>
                  {loading ? '—' : k.value}
                </p>
                <p style={{ fontSize: 12, color: '#22c55e', marginTop: 8, fontWeight: 600 }}>
                  ↗ {k.trend}
                </p>
              </div>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: k.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                {k.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Middle Row: Recent Activities + Application Statistics ── */}
      <div style={midRow}>

        {/* Recent Activities */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Recent Activities</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{recentApps.length} items</span>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '3px 12px' }}>
                Applications &amp; Certificates
              </span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['COMPANY / APPLICANT', 'TYPE', 'STATUS', 'DATE'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : recentApps.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 13 }}>No recent activity</td></tr>
              ) : recentApps.map((a, i) => (
                <tr key={a._id || a.id || i} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '14px 0', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                    {a.profiles?.company_name || a.establishment_name || a.application_number || '—'}
                    {a.application_number && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{a.application_number}</div>}
                  </td>
                  <td style={{ padding: '14px 0' }}>
                    <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '3px 10px' }}>
                      {a._actType || (a.category ? 'Application' : 'Certificate')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 0' }}>
                    <span className={`badge ${STATUS_BADGE[a.status] || 'badge-gray'}`}>
                      {a.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 0', fontSize: 13, color: '#6b7280' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Application Statistics */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Application Statistics</h3>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Status distribution of applications</p>

          {/* All Applications bar */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>All Applications</span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Total: {totalApps}</span>
            </div>
            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ height: '100%', width: `${appApprovedPct}%`, background: '#22c55e', borderRadius: 8, transition: 'width 0.8s' }} />
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
                Approved: {approvedApps}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, background: '#f59e0b', borderRadius: '50%', display: 'inline-block' }} />
                Pending: {pendingApps}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, background: '#ef4444', borderRadius: '50%', display: 'inline-block' }} />
                Rejected: {rejectedApps}
              </span>
            </div>
          </div>

          {/* Certificates breakdown */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Certificates</span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Total: {allCerts.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '16px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', margin: '0 0 4px' }}>{activeCerts}</p>
                <p style={{ fontSize: 12, color: '#15803d', fontWeight: 600, margin: 0 }}>Active</p>
              </div>
              <div style={{ background: '#fefce8', borderRadius: 10, padding: '16px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#ca8a04', margin: '0 0 4px' }}>{pendingCerts}</p>
                <p style={{ fontSize: 12, color: '#a16207', fontWeight: 600, margin: 0 }}>Pending</p>
              </div>
              <div style={{ background: '#fff1f2', borderRadius: 10, padding: '16px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#dc2626', margin: '0 0 4px' }}>{expiredCerts}</p>
                <p style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600, margin: 0 }}>Expired</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Summary Bar ── */}
      <div style={botRow}>
        {[
          { label: 'Total Applications', value: totalApps,        sub: `${pendingApps} pending` },
          { label: 'Total Products',     value: totalProds,       sub: 'Registered in system' },
          { label: 'Total Certificates', value: allCerts.length,  sub: `${activeCerts} active` },
          { label: 'Approved',           value: approvedApps,     sub: `${totalApps ? Math.round((approvedApps/totalApps)*100) : 0}% success rate` },
        ].map((b, i, arr) => (
          <div
            key={b.label}
            style={{
              padding: '28px 24px',
              textAlign: 'center',
              borderRight: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}
          >
            <p style={{ fontSize: 36, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
              {loading ? '—' : b.value}
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>{b.label}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{b.sub}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
