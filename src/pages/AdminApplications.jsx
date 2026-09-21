import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Search, RefreshCw, Settings, Trash2, ArrowRight } from 'lucide-react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { STATUS_LABELS, STATUS_BADGE } from '../lib/applicationStatuses';

const LEGACY_BADGE = {
  'PROPOSAL SENT': 'badge-purple',
  'PROPOSAL ACCEPTED/REJECTED': 'badge-blue',
  'PROPOSAL REJECTED': 'badge-red',
};

export default function AdminApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const fetchData = async () => {
    setLoading(true);
    try {
      const a = await api.get('/api/applications').catch(() => ({ data: [] }));
      const rawApps = Array.isArray(a) ? a : (Array.isArray(a?.data?.data) ? a.data.data : (Array.isArray(a?.data) ? a.data : []));
      setApps(rawApps);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setFilterStatus(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const appId = searchParams.get('appId');
    if (appId) {
      navigate(`/applications/${appId}/processing`, { replace: true });
    }
  }, [searchParams, navigate]);

  const typeParam = searchParams.get('type') || (location.pathname.includes('/certified') ? 'certified' : null);

  const isTerminalStatus = (statusStr) => {
    if (!statusStr) return false;
    const s = statusStr.toLowerCase().replace(/ /g, '_');
    return s === 'certificate_issued' || s === 'send_certificate' || s === 'rejected';
  };

  const isCertifiedStatus = (statusStr) => {
    if (!statusStr) return false;
    const s = statusStr.toLowerCase().replace(/ /g, '_');
    return s === 'certificate_issued' || s === 'send_certificate' || s === 'certificate_processing';
  };

  const safeApps = Array.isArray(apps) ? apps : [];
  const filtered = safeApps.filter(a => {
    if (!a) return false;
    // 1. View Type Filter
    if (typeParam === 'new') {
      if (isTerminalStatus(a.status)) return false;
    } else if (typeParam === 'certified') {
      if (!isCertifiedStatus(a.status)) return false;
    } else if (typeParam === 'renewal') {
      if (a.application_type !== 'renewal') return false;
    } else if (typeParam === 'surveillance') {
      if (a.application_type !== 'surveillance') return false;
    }

    // 2. Search Filter
    const matchSearch = !search || 
      a.application_number?.toLowerCase().includes(search.toLowerCase()) || 
      a.profiles?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.establishment_name?.toLowerCase().includes(search.toLowerCase());

    // 3. Dropdown Status Filter
    const matchStatus = !filterStatus || a.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const getPageTitleAndSub = () => {
    if (typeParam === 'new') {
      return {
        title: 'New Applications (In-Progress)',
        sub: 'Active and in-progress applications awaiting or undergoing certification review'
      };
    }
    if (typeParam === 'certified') {
      return {
        title: 'Certified Applications',
        sub: 'Applications that have successfully completed certification and been issued certificates'
      };
    }
    if (typeParam === 'renewal') {
      return {
        title: 'Renewal Applications',
        sub: 'Certification renewal requests submitted by existing clients'
      };
    }
    if (typeParam === 'surveillance') {
      return {
        title: 'Surveillance Applications',
        sub: 'Ongoing surveillance and compliance review applications'
      };
    }
    return {
      title: 'All Applications',
      sub: 'All certification applications submitted across all stages and history'
    };
  };

  const pageMeta = getPageTitleAndSub();

  const handleDelete = async (id, appNo) => {
    if (!window.confirm(`Are you sure you want to delete application ${appNo || ''}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/applications/${id}`);
      toast.success('Application deleted');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete application');
    }
  };

  return (
    <div className="page-content">
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon"/>
          <input placeholder="Search by app no. or client..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="form-control" style={{width:'auto'}} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
        </select>
        <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:'auto'}}>{filtered.length} applications</span>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{pageMeta.title}</div>
            <div className="card-subtitle">{pageMeta.sub}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchData} title="Refresh"><RefreshCw size={13}/></button>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner"/></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Primary Contact</th>
                  <th>Site Name</th>
                  <th>Type &amp; Category</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(app => (
                  <tr 
                    key={app._id} 
                    onClick={() => navigate(`/applications/${app._id}/processing`)}
                    style={{ cursor: 'pointer' }}
                    className="app-table-row"
                  >
                    <td style={{fontWeight: 700, color: '#0f172a', fontSize: 13.5}}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{app.profiles?.company_name || app.company_name || app.establishment_name || 'Company Facility'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {app.application_number}
                      </div>
                    </td>
                    <td>
                      <div style={{fontWeight:600,fontSize:13}}>{app.profiles?.full_name || app.managing_director || '—'}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{app.profiles?.email || '—'}</div>
                    </td>
                    <td style={{fontSize:12}}>{app.site_name || '—'}</td>
                    <td>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--primary)',textTransform:'uppercase',marginBottom:2}}>{app.application_type}</div>
                      <div style={{fontSize:12,color:'var(--text-muted)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{app.category}</div>
                    </td>
                    <td style={{fontSize:12}}>{new Date(app.created_at).toLocaleDateString('en-GB')}</td>
                    <td style={{textAlign:'center'}}>
                      <span className={`badge ${STATUS_BADGE[app.status] || LEGACY_BADGE[app.status] || 'badge-gray'}`}>
                        {app.status === 'payment_received' && (app.application_type || '').toLowerCase() === 'renewal' 
                          ? 'Renewal Fee Paid' 
                          : (STATUS_LABELS[app.status] || app.status?.replace(/_/g, ' '))}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 12, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/applications/${app._id}/processing`);
                          }}
                          title="Open Application Processing"
                        >
                          <Settings size={13} /> Process <ArrowRight size={12} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#ef4444', padding: '5px 8px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(app._id, app.application_number);
                          }}
                          title="Delete Application"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-title">No Applications Found</div>
              <div className="empty-state-text">No applications match your current search or filter.</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .app-table-row:hover {
          background-color: #f8fafc;
        }
      `}</style>
    </div>
  );
}
