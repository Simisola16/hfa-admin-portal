import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Award, Search, Plus, X, Download } from 'lucide-react';

export default function AdminCertificates() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apps, setApps] = useState([]);
  const [form, setForm] = useState({ client_id:'', application_id:'', certificate_type:'Annual Halal Certificate', issue_date:'', expiry_date:'', products_covered:'' });

  const fetch = () => { setLoading(true); Promise.all([api.get('/api/certificates'),api.get('/api/applications')]).then(([c,a])=>{setCerts(c.data||[]);setApps(a.data?.filter(a=>a.status==='approved')||[]);}).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>{fetch();},[]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const app = apps.find(a=>a.id===form.application_id);
    const payload = {...form, client_id: app?.client_id};
    try { await api.post('/api/certificates', payload); toast.success('Certificate issued & email sent!'); setShowModal(false); fetch(); }
    catch(err){toast.error(err.message);} finally{setSubmitting(false);}
  };

  const handleRevoke = async (id) => {
    const reason = prompt('Reason for revocation:');
    if(!reason) return;
    try{ await api.put(`/api/certificates/${id}/revoke`,{reason}); toast.success('Certificate revoked'); fetch(); }
    catch(err){toast.error(err.message);}
  };

  const filtered = certs.filter(c=>!search||c.certificate_number?.toLowerCase().includes(search.toLowerCase())||c.profiles?.company_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="toolbar">
        <div className="search-box"><Search size={15} className="search-icon"/><input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)} style={{marginLeft:'auto'}}><Plus size={15}/> Issue Certificate</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">All Certificates ({filtered.length})</div></div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:
            filtered.length===0?<div className="empty-state"><div className="empty-state-icon"><Award/></div><div className="empty-state-title">No Certificates</div></div>:(
              <table>
                <thead><tr><th>Certificate No.</th><th>Client</th><th>Type</th><th>Issue Date</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(c=>(
                    <tr key={c.id}>
                      <td style={{fontWeight:700}}>{c.certificate_number}</td>
                      <td>{c.profiles?.company_name||'—'}</td>
                      <td>{c.certificate_type}</td>
                      <td style={{fontSize:12}}>{c.issue_date?new Date(c.issue_date).toLocaleDateString('en-GB'):'—'}</td>
                      <td style={{fontSize:12}}>{c.expiry_date?new Date(c.expiry_date).toLocaleDateString('en-GB'):'—'}</td>
                      <td><span className={`badge ${c.status==='active'?'badge-green':c.status==='revoked'?'badge-red':'badge-gray'}`}>{c.status}</span></td>
                      <td style={{display:'flex',gap:6}}>
                        {c.status==='active'&&<button className="btn btn-ghost btn-sm" style={{color:'var(--danger)',fontSize:12}} onClick={()=>handleRevoke(c.id)}>Revoke</button>}
                        <button className="btn btn-ghost btn-sm"><Download size={13}/></button>
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
          <div className="modal" style={{maxWidth:520}}>
            <div className="modal-header"><span className="modal-title">Issue New Certificate</span><button className="modal-close" onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Linked Application</label>
                  <select className="form-control" value={form.application_id} onChange={e=>setForm(f=>({...f,application_id:e.target.value}))}>
                    <option value="">Select Application</option>
                    {apps.map(a=><option key={a.id} value={a.id}>{a.application_number} – {a.profiles?.company_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Certificate Type <span>*</span></label>
                  <select className="form-control" value={form.certificate_type} onChange={e=>setForm(f=>({...f,certificate_type:e.target.value}))}>
                    {['Annual Halal Certificate','Abattoir Certificate','Restaurant Certificate','Retail Certificate','Export Certificate','Product Certificate'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Issue Date <span>*</span></label><input type="date" className="form-control" value={form.issue_date} onChange={e=>setForm(f=>({...f,issue_date:e.target.value}))} required/></div>
                  <div className="form-group"><label className="form-label">Expiry Date <span>*</span></label><input type="date" className="form-control" value={form.expiry_date} onChange={e=>setForm(f=>({...f,expiry_date:e.target.value}))} required/></div>
                </div>
                <div className="form-group"><label className="form-label">Products Covered</label><textarea className="form-control" value={form.products_covered} onChange={e=>setForm(f=>({...f,products_covered:e.target.value}))} placeholder="List the products covered by this certificate..."/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting?<span className="spinner" style={{width:16,height:16}}/>:'Issue Certificate'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
