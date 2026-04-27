import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Search, Filter, Eye, X, UserCheck, Calendar } from 'lucide-react';

const STATUS_BADGE = {
  submitted:'badge-blue', under_review:'badge-yellow', approved:'badge-green',
  rejected:'badge-red', on_hold:'badge-orange', audit_scheduled:'badge-purple',
  audit_completed:'badge-green', certificate_issued:'badge-green',
};

const ALL_STATUSES = ['submitted','under_review','approved','rejected','on_hold','audit_scheduled','audit_completed','certificate_issued'];

export default function AdminApplications() {
  const [apps, setApps] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionForm, setActionForm] = useState({ status:'', notes:'', inspector_id:'', audit_date:'' });
  const [submitting, setSubmitting] = useState(false);

  const fetch = () => {
    setLoading(true);
    Promise.all([api.get('/api/applications'), api.get('/api/inspectors')])
      .then(([a,i])=>{setApps(a.data||[]);setInspectors(i.data||[]);})
      .catch(()=>toast.error('Failed to load'))
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{fetch();},[]);

  const filtered = apps.filter(a=>{
    const s = !search||a.application_number?.toLowerCase().includes(search.toLowerCase())||a.profiles?.company_name?.toLowerCase().includes(search.toLowerCase());
    const st = !filterStatus||a.status===filterStatus;
    return s&&st;
  });

  const openAction = (app) => { setActionModal(app); setActionForm({status:app.status,notes:'',inspector_id:app.inspector_id||'',audit_date:app.audit_date||''}); };

  const handleUpdate = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.put(`/api/applications/${actionModal.id}/status`, actionForm);
      toast.success('Application updated & email sent to client');
      setActionModal(null); fetch();
    } catch(err){toast.error(err.message);} finally{setSubmitting(false);}
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon"/>
          <input placeholder="Search by app no. or client..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="form-control" style={{width:'auto'}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
        <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:'auto'}}>{filtered.length} applications</span>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">All Applications</div></div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:(
            <table>
              <thead><tr><th>App No.</th><th>Client / Company</th><th>Category</th><th>Site</th><th>Inspector</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(app=>(
                  <tr key={app.id}>
                    <td style={{fontWeight:700,color:'var(--primary)'}}>{app.application_number}</td>
                    <td>
                      <div style={{fontWeight:600,fontSize:13}}>{app.profiles?.company_name||'—'}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{app.profiles?.full_name}</div>
                    </td>
                    <td style={{maxWidth:200}}><span style={{fontSize:12,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{app.category}</span></td>
                    <td style={{fontSize:12}}>{app.site_name||'—'}</td>
                    <td style={{fontSize:12}}>{app.inspectors?.full_name||<span style={{color:'var(--text-muted)'}}>Unassigned</span>}</td>
                    <td style={{fontSize:12}}>{new Date(app.created_at).toLocaleDateString('en-GB')}</td>
                    <td><span className={`badge ${STATUS_BADGE[app.status]||'badge-gray'}`}>{app.status?.replace(/_/g,' ')}</span></td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={()=>openAction(app)}>Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setActionModal(null)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-header">
              <span className="modal-title">Manage: {actionModal.application_number}</span>
              <button className="modal-close" onClick={()=>setActionModal(null)}><X size={16}/></button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div style={{background:'#f9fafb',borderRadius:12,padding:16,marginBottom:20,fontSize:13, border: '1px solid var(--border)'}}>
                  <div style={{fontWeight:800, fontSize:15, marginBottom:8, color: 'var(--primary)'}}>{actionModal.establishment_name || actionModal.profiles?.company_name}</div>
                  <div style={{marginBottom:12, lineHeight: 1.4}}>{actionModal.establishment_address}</div>
                  
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12, paddingTop:12, borderTop:'1px solid #e2e8f0'}}>
                    <div>
                      <div style={{fontWeight:700, fontSize:11, color:'var(--text-muted)', textTransform:'uppercase'}}>Category</div>
                      <div style={{fontWeight:600}}>{actionModal.category}</div>
                    </div>
                    <div>
                      <div style={{fontWeight:700, fontSize:11, color:'var(--text-muted)', textTransform:'uppercase'}}>Staff / Schedule</div>
                      <div style={{fontWeight:600}}>{actionModal.employee_count} staff | {actionModal.production_schedule || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{marginTop:12, paddingTop:12, borderTop:'1px solid #e2e8f0'}}>
                    <div style={{fontWeight:700, fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:4}}>Halal Declarations</div>
                    <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                      <span className={`badge ${actionModal.has_porcine ? 'badge-red' : 'badge-green'}`}>
                        {actionModal.has_porcine ? '⚠️ Porcine Handling' : '✅ No Porcine'}
                      </span>
                      <span className={`badge ${actionModal.has_intoxicants ? 'badge-red' : 'badge-green'}`}>
                        {actionModal.has_intoxicants ? '⚠️ Intoxicants' : '✅ No Intoxicants'}
                      </span>
                    </div>
                    {(actionModal.porcine_details || actionModal.intoxicants_details) && (
                      <div style={{marginTop:8, fontSize:12, fontStyle:'italic', color:'#4b5563'}}>
                        {actionModal.porcine_details && <div>Pork: {actionModal.porcine_details}</div>}
                        {actionModal.intoxicants_details && <div>Alcohol: {actionModal.intoxicants_details}</div>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Update Status <span>*</span></label>
                  <select className="form-control" value={actionForm.status} onChange={e=>setActionForm(f=>({...f,status:e.target.value}))} required>
                    {ALL_STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                  </select>
                </div>

                {(actionForm.status==='audit_scheduled'||actionForm.status==='under_review') && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Assign Inspector</label>
                      <select className="form-control" value={actionForm.inspector_id} onChange={e=>setActionForm(f=>({...f,inspector_id:e.target.value}))}>
                        <option value="">Select Inspector</option>
                        {inspectors.map(i=><option key={i.id} value={i.id}>{i.full_name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Audit Date</label>
                      <input type="date" className="form-control" value={actionForm.audit_date} onChange={e=>setActionForm(f=>({...f,audit_date:e.target.value}))}/>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Notes to Client</label>
                  <textarea className="form-control" rows={3} value={actionForm.notes} onChange={e=>setActionForm(f=>({...f,notes:e.target.value}))} placeholder="This message will be included in the email notification..."/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setActionModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting?<span className="spinner" style={{width:16,height:16}}/>:'Update & Notify Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
