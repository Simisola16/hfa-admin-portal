import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, X, Calendar } from 'lucide-react';

export default function AdminAudits() {
  const [audits, setAudits] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ application_id:'', inspector_id:'', site_id:'', client_id:'', scheduled_date:'', audit_type:'Initial', notes:'' });
  const [apps, setApps] = useState([]);

  const fetch = () => {
    setLoading(true);
    Promise.all([api.get('/api/audits'), api.get('/api/inspectors'), api.get('/api/applications')])
      .then(([a,i,ap])=>{setAudits(a.data||[]);setInspectors(i.data||[]);setApps(ap.data||[]);})
      .catch(()=>toast.error('Failed')).finally(()=>setLoading(false));
  };
  useEffect(()=>{fetch();},[]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const app = apps.find(a=>a.id===form.application_id);
    const payload = {...form, client_id: app?.client_id, site_id: app?.site_id};
    try { await api.post('/api/audits',payload); toast.success('Audit scheduled'); setShowModal(false); fetch(); }
    catch(err){toast.error(err.message);} finally{setSubmitting(false);}
  };

  const updateStatus = async (id, status, findings='') => {
    try { await api.put(`/api/audits/${id}`,{status,findings}); toast.success('Audit updated'); fetch(); }
    catch(err){toast.error(err.message);}
  };

  const STATUS_BADGE = { scheduled:'badge-blue', in_progress:'badge-yellow', completed:'badge-green', cancelled:'badge-red' };

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={()=>setShowModal(true)} style={{marginLeft:'auto'}}><Plus size={15}/> Schedule Audit</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Audits ({audits.length})</div></div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:
            audits.length===0?<div className="empty-state"><div className="empty-state-icon"><Calendar/></div><div className="empty-state-title">No Audits Scheduled</div></div>:(
              <table>
                <thead><tr><th>Application</th><th>Client</th><th>Inspector</th><th>Site</th><th>Type</th><th>Scheduled Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {audits.map(a=>(
                    <tr key={a.id}>
                      <td style={{fontWeight:600,color:'var(--primary)'}}>{a.applications?.application_number||'—'}</td>
                      <td>{a.profiles?.company_name||'—'}</td>
                      <td>{a.inspectors?.full_name||'Unassigned'}</td>
                      <td>{a.sites?.name||'—'}</td>
                      <td>{a.audit_type}</td>
                      <td style={{fontSize:12}}>{a.scheduled_date?new Date(a.scheduled_date).toLocaleDateString('en-GB'):'—'}</td>
                      <td><span className={`badge ${STATUS_BADGE[a.status]||'badge-gray'}`}>{a.status}</span></td>
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

      {showModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">Schedule Audit</span><button className="modal-close" onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Application <span>*</span></label>
                  <select className="form-control" value={form.application_id} onChange={e=>setForm(f=>({...f,application_id:e.target.value}))} required>
                    <option value="">Select Application</option>
                    {apps.map(a=><option key={a.id} value={a.id}>{a.application_number} – {a.profiles?.company_name}</option>)}
                  </select>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Inspector</label>
                    <select className="form-control" value={form.inspector_id} onChange={e=>setForm(f=>({...f,inspector_id:e.target.value}))}>
                      <option value="">Select Inspector</option>
                      {inspectors.map(i=><option key={i.id} value={i.id}>{i.full_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Audit Type</label>
                    <select className="form-control" value={form.audit_type} onChange={e=>setForm(f=>({...f,audit_type:e.target.value}))}>
                      {['Initial','Surveillance','Renewal','Unannounced'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Scheduled Date <span>*</span></label><input type="date" className="form-control" value={form.scheduled_date} onChange={e=>setForm(f=>({...f,scheduled_date:e.target.value}))} required/></div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting?<span className="spinner" style={{width:16,height:16}}/>:'Schedule Audit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
