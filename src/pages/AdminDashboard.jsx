import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { FileText, Award, Users, Calendar, TrendingUp, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/reports/dashboard'),
      api.get('/api/applications'),
    ]).then(([s, apps]) => {
      setStats(s.data || s);
      setRecentApps((apps.data||[]).slice(0,8));
    }).catch(()=>{}).finally(()=>setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const countByStatus = (arr, status) => arr?.filter(a=>a.status===status).length || 0;

  const allApps = stats?.applications || [];
  const allCerts = stats?.certificates || [];
  const allUsers = stats?.users || [];

  const statCards = [
    { label: 'Total Applications', value: allApps.length, icon: <FileText size={22}/>, color: '#3b82f6', bg: '#dbeafe', sub: `${countByStatus(allApps,'submitted')} pending review`, path: '/applications' },
    { label: 'Active Certificates', value: countByStatus(allCerts,'active'), icon: <Award size={22}/>, color: '#15803d', bg: '#dcfce7', sub: `${allCerts.length} total issued`, path: '/certificates' },
    { label: 'Registered Clients', value: allUsers.filter(u=>u.role==='client').length, icon: <Users size={22}/>, color: '#7c3aed', bg: '#f3e8ff', sub: 'Active companies', path: '/clients' },
    { label: 'Audits Scheduled', value: countByStatus(stats?.audits||[],'scheduled'), icon: <Calendar size={22}/>, color: '#d97706', bg: '#fef3c7', sub: `${countByStatus(stats?.audits||[],'completed')} completed`, path: '/audits' },
    { label: 'Pending Review', value: countByStatus(allApps,'submitted'), icon: <Clock size={22}/>, color: '#ef4444', bg: '#fee2e2', sub: 'Needs action', path: '/applications' },
    { label: 'Certs This Month', value: 0, icon: <TrendingUp size={22}/>, color: '#0891b2', bg: '#e0f2fe', sub: 'New certificates issued', path: '/certificates' },
  ];

  const STATUS_BADGE = {
    submitted:'badge-blue', under_review:'badge-yellow', approved:'badge-green',
    rejected:'badge-red', on_hold:'badge-orange', audit_scheduled:'badge-purple',
    certificate_issued:'badge-green',
  };

  return (
    <div>
      {/* Welcome banner */}
      <div style={{background:'linear-gradient(135deg,#15803d,#14532d)',borderRadius:'var(--radius-lg)',padding:'24px 28px',marginBottom:24,color:'white',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,marginBottom:4}}>HFA Admin Portal</h2>
          <p style={{opacity:0.85,fontSize:13}}>Halal Food Authority UK — Certification Management System</p>
        </div>
        <div style={{display:'flex',gap:16,fontSize:13}}>
          <Link to="/applications" style={{textDecoration:'none', color:'inherit'}}>
            <div style={{textAlign:'center',background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 20px',cursor:'pointer',transition:'background 0.2s'}} onMouseOver={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.15)'} onMouseOut={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
              <div style={{fontWeight:800,fontSize:22}}>{countByStatus(allApps,'submitted')}</div>
              <div style={{opacity:0.8}}>Awaiting Review</div>
            </div>
          </Link>
          <Link to="/applications" style={{textDecoration:'none', color:'inherit'}}>
            <div style={{textAlign:'center',background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 20px',cursor:'pointer',transition:'background 0.2s'}} onMouseOver={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.15)'} onMouseOut={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
              <div style={{fontWeight:800,fontSize:22}}>{countByStatus(allApps,'audit_scheduled')}</div>
              <div style={{opacity:0.8}}>Audits Upcoming</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        {statCards.map(s=>(
          <div className="stat-card" key={s.label} onClick={() => navigate(s.path)} style={{cursor: 'pointer'}}>
            <div className="stat-icon" style={{background:s.bg,color:s.color}}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{loading?'—':s.value}</div>
              <div className="stat-change">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="card" style={{marginTop:24}}>
        <div className="card-header">
          <div><div className="card-title">Recent Applications</div><div className="card-subtitle">Latest submissions requiring attention</div></div>
          <button className="btn btn-ghost btn-sm" onClick={fetchData}><RefreshCw size={13}/></button>
        </div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:
            recentApps.length===0?<div className="empty-state"><div className="empty-state-title">No Applications</div></div>:(
              <table>
                <thead><tr><th>App No.</th><th>Client</th><th>Category</th><th>Site</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {recentApps.map(app=>(
                    <tr key={app.id || app._id}>
                      <td style={{fontWeight:700,color:'var(--primary)'}}>{app.application_number}</td>
                      <td>{app.profiles?.company_name||'—'}</td>
                      <td style={{maxWidth:180}}><span className="truncate" style={{display:'block',fontSize:12}}>{app.category}</span></td>
                      <td>{app.site_name||'—'}</td>
                      <td style={{fontSize:12}}>{new Date(app.created_at).toLocaleDateString('en-GB')}</td>
                      <td><span className={`badge ${STATUS_BADGE[app.status]||'badge-gray'}`}>{app.status?.replace(/_/g,' ')}</span></td>
                      <td><Link to={`/applications?appId=${app.id || app._id}`} className="btn btn-ghost btn-sm">Manage</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>
    </div>
  );
}
