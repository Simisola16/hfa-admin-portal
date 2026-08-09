import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Calendar } from 'lucide-react';

export default function AdminAudits() {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter') || 'all';

  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    api.get('/api/audits')
      .then((a)=>{setAudits(a.data||[]);})
      .catch(()=>toast.error('Failed')).finally(()=>setLoading(false));
  };
  useEffect(()=>{fetch();},[]);

  const updateStatus = async (id, status, findings='') => {
    try { await api.put(`/api/audits/${id}`,{status,findings}); toast.success('Audit updated'); fetch(); }
    catch(err){toast.error(err.message);}
  };

  const STATUS_BADGE = { 
    scheduled:'badge-blue', 
    in_progress:'badge-yellow', 
    completed:'badge-green', 
    cancelled:'badge-red',
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
    if (filter === 'upcoming') {
      return a.status !== 'audit_completed' && a.status !== 'completed' && a.status !== 'cancelled';
    }
    return true;
  });

  return (
    <div>
      <div className="card" style={{ marginTop: 0 }}>
        <div className="card-header">
          <div className="card-title">
            {filter === 'upcoming' ? 'Upcoming Audits' : 'All Audits'} ({filteredAudits.length})
          </div>
        </div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:
            filteredAudits.length===0?<div className="empty-state"><div className="empty-state-icon"><Calendar/></div><div className="empty-state-title">No Audits Found</div></div>:(
              <table>
                <thead><tr><th>Company Name</th><th>Inspector / Auditor</th><th>Site Location</th><th>Type</th><th>Scheduled Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredAudits.map(a=>(
                    <tr key={a.id || a._id}>
                      <td style={{fontWeight:700,color:'#0f172a'}}>
                        <div>{a.profiles?.company_name || a.applications?.establishment_name || a.applications?.profiles?.company_name || a.company_name || 'Company Facility'}</div>
                        <div style={{fontSize:11.5,color:'var(--text-muted)',fontWeight:400}}>{a.applications?.category || a.audit_type || 'Standard Audit'}</div>
                      </td>
                      <td>{a.inspectors?.full_name || a.auditors?.map(x => x.name).join(', ') || 'Unassigned'}</td>
                      <td>{a.sites?.name || a.applications?.establishment_address || '—'}</td>
                      <td><span style={{ fontWeight: 600 }}>{a.audit_type || (a.stage ? `Stage ${a.stage}` : 'Audit')}</span></td>
                      <td style={{fontSize:12}}>{a.scheduled_date || a.finalized_date ? new Date(a.scheduled_date || a.finalized_date).toLocaleDateString('en-GB'):'—'}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[a.status]||'badge-gray'}`} style={{ fontWeight: 700 }}>
                          {formatProcessStatus(a.status)}
                        </span>
                      </td>
                      <td>
                        {a.status==='scheduled'&&<button className="btn btn-ghost btn-sm" onClick={()=>updateStatus(a.id,'in_progress')}>Start</button>}
                        {a.status==='in_progress'&&<button className="btn btn-primary btn-sm" onClick={()=>updateStatus(a.id,'completed')}>Complete</button>}
                      </td>
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
