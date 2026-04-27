import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X, UserCheck } from 'lucide-react';

export default function AdminInspectors() {
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name:'', email:'', phone:'', specialization:'', regions:'', is_active:true });

  const fetch = () => { setLoading(true); api.get('/api/inspectors').then(d=>setInspectors(d.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>{fetch();},[]);
  const set = (k)=>(e)=>setForm(f=>({...f,[k]:e.target.value}));
  const openEdit = (i)=>{ setEditing(i); setForm({...i, regions: i.regions?.join(', ')||''}); setShowModal(true); };
  const openNew = ()=>{ setEditing(null); setForm({full_name:'',email:'',phone:'',specialization:'',regions:'',is_active:true}); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const payload = {...form, regions: form.regions.split(',').map(r=>r.trim()).filter(Boolean)};
    try {
      if(editing){ await api.put(`/api/inspectors/${editing.id}`,payload); toast.success('Inspector updated'); }
      else{ await api.post('/api/inspectors',payload); toast.success('Inspector added'); }
      setShowModal(false); fetch();
    } catch(err){toast.error(err.message);} finally{setSubmitting(false);}
  };

  const handleDelete = async (id) => {
    if(!confirm('Delete inspector?')) return;
    try{ await api.delete(`/api/inspectors/${id}`); toast.success('Deleted'); fetch(); }
    catch(err){toast.error(err.message);}
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={openNew} style={{marginLeft:'auto'}}><Plus size={15}/> Add Inspector</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Inspectors ({inspectors.length})</div></div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:
            inspectors.length===0?<div className="empty-state"><div className="empty-state-icon"><UserCheck/></div><div className="empty-state-title">No Inspectors</div></div>:(
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Specialization</th><th>Regions</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {inspectors.map(i=>(
                    <tr key={i.id}>
                      <td style={{fontWeight:600}}>{i.full_name}</td>
                      <td>{i.email}</td>
                      <td>{i.phone||'—'}</td>
                      <td>{i.specialization||'—'}</td>
                      <td style={{fontSize:12}}>{i.regions?.join(', ')||'—'}</td>
                      <td><span className={`badge ${i.is_active?'badge-green':'badge-gray'}`}>{i.is_active?'Active':'Inactive'}</span></td>
                      <td style={{display:'flex',gap:6}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(i)}><Edit size={13}/></button>
                        <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>handleDelete(i.id)}><Trash2 size={13}/></button>
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
            <div className="modal-header"><span className="modal-title">{editing?'Edit Inspector':'Add Inspector'}</span><button className="modal-close" onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Full Name <span>*</span></label><input className="form-control" value={form.full_name} onChange={set('full_name')} required/></div>
                  <div className="form-group"><label className="form-label">Email <span>*</span></label><input type="email" className="form-control" value={form.email} onChange={set('email')} required/></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={set('phone')}/></div>
                  <div className="form-group"><label className="form-label">Specialization</label><input className="form-control" value={form.specialization} onChange={set('specialization')} placeholder="e.g. Abattoir, Food Processing"/></div>
                </div>
                <div className="form-group"><label className="form-label">Regions (comma-separated)</label><input className="form-control" value={form.regions} onChange={set('regions')} placeholder="e.g. London, Manchester, Birmingham"/></div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.value==='true'}))}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting?<span className="spinner" style={{width:16,height:16}}/>:(editing?'Update':'Add Inspector')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
