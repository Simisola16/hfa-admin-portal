import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  ClipboardList, Clock, CheckCircle, Package,
  RefreshCw, TrendingUp, MapPin, Tag, ChevronDown, CheckCircle2, AlertTriangle, XCircle, Calendar
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats,       setStats]      = useState(null);
  const [recentApps,  setRecentApps] = useState([]);
  const [recentCerts, setRecentCerts]= useState([]);
  const [loading,     setLoading]    = useState(true);
  const [lastUpdated, setLastUpdated]= useState('');
  const [hoveredCard, setHoveredCard] = useState(null);
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
      setRecentCerts(allCerts);
      setRecentApps(activities);
      setLastUpdated(new Date().toLocaleTimeString());
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const allApps  = stats?.applications  || [];
  const allCerts = stats?.certificates  || [];
  const allProds = stats?.products      || [];
  const allAudits = stats?.audits       || [];
  const upcomingAudits = allAudits.filter(a => a.status !== 'audit_completed').length;

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
      icon: <ClipboardList size={22} />,
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      path: '/applications',
    },
    {
      label: 'Upcoming Audits',
      value: upcomingAudits,
      trend: 'Scheduled',
      icon: <Calendar size={22} />,
      iconBg: '#f5f3ff',
      iconColor: '#7c3aed',
      path: '/audits',
    },
    {
      label: 'Active Certificates',
      value: activeCerts,
      trend: '+6%',
      icon: <CheckCircle size={22} />,
      iconBg: '#ecfdf5',
      iconColor: '#059669',
      path: '/certificates',
    },
    {
      label: 'Total Products',
      value: totalProds,
      trend: '+1%',
      icon: <Package size={22} />,
      iconBg: '#eef2ff',
      iconColor: '#4f46e5',
      path: '/products',
    },
  ];

  const appApprovedPct = totalApps ? Math.round((approvedApps / totalApps) * 100) : 0;

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'active' || s === 'certificate_issued' || s === 'issued') {
      return { bg: '#d1fae5', text: '#065f46', icon: <CheckCircle2 size={12} /> };
    }
    if (s === 'submitted' || s === 'pending' || s === 'under_review') {
      return { bg: '#fef9c3', text: '#854d0e', icon: <Clock size={12} /> };
    }
    return { bg: '#fee2e2', text: '#991b1b', icon: <XCircle size={12} /> };
  };

  return (
    <div style={{
      background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.03), transparent 45%), radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.03), transparent 45%), #f8fafc',
      minHeight: '100vh',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '28px',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      
      {/* Dynamic CSS Styling Injector */}
      <style>{`
        .hca-kpi-card {
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 24px;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .hca-kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
          border-color: #e2e8f0;
        }
        .hca-activity-table tr {
          transition: all 0.2s ease;
        }
        .hca-activity-table tr:hover {
          background-color: #f8fafc;
        }
        .cert-card {
          border-radius: 14px;
          padding: 16px;
          text-align: center;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .cert-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px -2px rgba(0,0,0,0.04);
        }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Dashboard Overview</h1>
          <p style={{ fontSize: '13.5px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
            Real-time overview of applications, products, and certificates
            {lastUpdated && (
              <span style={{ 
                marginLeft: '12px', 
                background: '#f1f5f9', 
                color: '#475569', 
                padding: '3px 10px', 
                borderRadius: '50px', 
                fontSize: '11px',
                fontWeight: 600
              }}>
                Updated: {lastUpdated}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'white', 
            color: '#0f172a', 
            border: '1.5px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '10px 18px', 
            fontWeight: 700, 
            fontSize: '13.5px', 
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
        >
          <RefreshCw size={15} className={loading ? 'spin-anim' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> 
          Refresh Data
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {kpiCards.map((k, idx) => (
          <div
            key={k.label}
            className="hca-kpi-card"
            onClick={() => navigate(k.path)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                  {k.label}
                </p>
                <p style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>
                  {loading ? '—' : k.value}
                </p>
                
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  fontSize: '12px', 
                  color: k.iconColor, 
                  background: k.iconBg, 
                  padding: '4px 10px', 
                  borderRadius: '30px', 
                  marginTop: '12px',
                  fontWeight: 700 
                }}>
                  <TrendingUp size={12} /> {k.trend}
                </span>
              </div>
              
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: k.iconBg, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: k.iconColor, 
                flexShrink: 0 
              }}>
                {k.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Middle Row: Recent Activities + Application Statistics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', alignItems: 'start' }}>
        
        {/* Recent Activities (Takes 3/5 width on wide screens) */}
        <div style={{ 
          background: 'white', 
          border: '1px solid #f1f5f9', 
          borderRadius: '20px', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', 
          padding: '28px',
          flex: 1.5
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>Recent Activities</h3>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Latest updates in certification pipeline</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{recentApps.length} items</span>
              <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '12px', fontWeight: 700, borderRadius: '50px', padding: '4px 12px' }}>
                Applications &amp; Certificates
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="hca-activity-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['COMPANY / APPLICANT', 'TYPE', 'DATE'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#94a3b8', padding: '12px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '60px' }}>
                      <div className="spinner" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : recentApps.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '60px', fontSize: '13.5px', fontWeight: 500 }}>
                      No recent activity in system
                    </td>
                  </tr>
                ) : recentApps.map((a, i) => {
                  return (
                    <tr key={a._id || a.id || i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '16px 8px', fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                        {a.profiles?.company_name || a.establishment_name || a.application_number || '—'}
                        {a.application_number && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>
                            #{a.application_number}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <span style={{ 
                          background: '#e0e7ff', 
                          color: '#4338ca', 
                          fontSize: '11.5px', 
                          fontWeight: 700, 
                          borderRadius: '30px', 
                          padding: '4px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Tag size={10} />
                          {a._actType || (a.category ? 'Application' : 'Certificate')}
                        </span>
                      </td>
                      <td style={{ padding: '16px 8px', fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Application Statistics (Takes 2/5 width on wide screens) */}
        <div style={{ 
          background: 'white', 
          border: '1px solid #f1f5f9', 
          borderRadius: '20px', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', 
          padding: '28px',
          flex: 1
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>Application Statistics</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', marginBottom: '24px' }}>Status distribution of registered files</p>

          {/* All Applications bar */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#1e293b' }}>Total Active Operations</span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Total: {totalApps}</span>
            </div>
            
            {/* Split Progress bar matching HCA */}
            <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '50px', overflow: 'hidden', marginBottom: '16px', display: 'flex' }}>
              <div style={{ height: '100%', width: `${appApprovedPct}%`, background: '#10b981', transition: 'width 0.8s' }} />
              <div style={{ height: '100%', width: `${totalApps ? Math.round((pendingApps/totalApps)*100) : 0}%`, background: '#f59e0b', transition: 'width 0.8s' }} />
              <div style={{ height: '100%', width: `${totalApps ? Math.round((rejectedApps/totalApps)*100) : 0}%`, background: '#ef4444', transition: 'width 0.8s' }} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }} />
                Approved: {approvedApps}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%' }} />
                Pending: {pendingApps}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                Rejected: {rejectedApps}
              </span>
            </div>
          </div>

          {/* Certificates breakdown */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#1e293b' }}>Certificates Registry</span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Total: {recentCerts.length}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div className="cert-card" style={{ background: '#f0fdf4' }}>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', margin: '0 0 2px' }}>{activeCerts}</p>
                <p style={{ fontSize: '12px', color: '#15803d', fontWeight: 700, margin: 0 }}>Active</p>
              </div>
              <div className="cert-card" style={{ background: '#fefce8' }}>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#eab308', margin: '0 0 2px' }}>{pendingCerts}</p>
                <p style={{ fontSize: '12px', color: '#a16207', fontWeight: 700, margin: 0 }}>Pending</p>
              </div>
              <div className="cert-card" style={{ background: '#fef2f2' }}>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', margin: '0 0 2px' }}>{expiredCerts}</p>
                <p style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 700, margin: 0 }}>Expired</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Widescreen Stats Summary Card ── */}
      <div style={{ 
        background: 'white', 
        border: '1px solid #f1f5f9', 
        borderRadius: '20px', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', 
        overflow: 'hidden',
        padding: '12px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Total Applications', value: totalApps,        sub: `${pendingApps} waiting sign-off`, color: '#3b82f6' },
            { label: 'Total Products',     value: totalProds,       sub: 'Verified standard matrix', color: '#6366f1' },
            { label: 'Total Certificates', value: recentCerts.length,  sub: `${activeCerts} fully active`, color: '#10b981' },
            { label: 'Audit Success Rate',  value: `${totalApps ? Math.round((approvedApps/totalApps)*100) : 0}%`,     sub: 'Approved applications ratio', color: '#059669' },
          ].map((b, i, arr) => (
            <div
              key={b.label}
              style={{
                padding: '24px',
                textAlign: 'center',
                borderRight: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <p style={{ fontSize: '38px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.04em' }}>
                {loading ? '—' : b.value}
              </p>
              <p style={{ fontSize: '14px', fontWeight: 800, color: '#334155', margin: 0 }}>{b.label}</p>
              <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, margin: 0 }}>{b.sub}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
