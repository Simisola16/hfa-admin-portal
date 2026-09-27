import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X, UserCheck, Search } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function AdminInspectors() {
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name:'', email:'', phone:'', specialization:'', regions:'', is_active:true });

  const fetch = () => { setLoading(true); api.get('/api/inspectors').then(d=>setInspectors(d.data||[])).catch(()=>toast.error('Failed to load auditors')).finally(()=>setLoading(false)); };
  useEffect(()=>{fetch();},[]);
  const set = (k)=>(e)=>setForm(f=>({...f,[k]:e.target.value}));
  const openEdit = (i)=>{ setEditing(i); setForm({...i, regions: i.regions?.join(', ')||''}); setShowModal(true); };
  const openNew = ()=>{ setEditing(null); setForm({full_name:'',email:'',phone:'',specialization:'',regions:'',is_active:true}); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const payload = {...form, regions: form.regions.split(',').map(r=>r.trim()).filter(Boolean)};
    try {
      if(editing){ await api.put(`/api/inspectors/${editing.id}`,payload); toast.success('Auditor updated'); }
      else{ await api.post('/api/inspectors',payload); toast.success('Auditor added'); }
      setShowModal(false); fetch();
    } catch(err){toast.error(err.message);} finally{setSubmitting(false);}
  };

  const handleDelete = async (id) => {
    if(!confirm('Delete auditor?')) return;
    try{ await api.delete(`/api/inspectors/${id}`); toast.success('Auditor deleted'); fetch(); }
    catch(err){toast.error(err.message);}
  };

  const filteredInspectors = inspectors.filter(i => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (i.full_name || '').toLowerCase().includes(q) ||
      (i.email || '').toLowerCase().includes(q) ||
      (i.specialization || '').toLowerCase().includes(q) ||
      (i.regions || []).some(r => (r || '').toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginatedInspectors = filteredInspectors.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div className="search-box" style={{ maxWidth: 360, minWidth: 260 }}>
          <Search size={15} className="search-icon" />
          <input
            placeholder="Search auditor by name, email, specialization..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={15}/> Add Auditor</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Auditors ({filteredInspectors.length})</div></div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:
            filteredInspectors.length===0?<div className="empty-state"><div className="empty-state-icon"><UserCheck/></div><div className="empty-state-title">No Auditors Found</div></div>:(
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Specialization</th><th>Regions</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {paginatedInspectors.map(i=>(
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
          <Pagination
            total={filteredInspectors.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {showModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">{editing?'Edit Auditor':'Add Auditor'}</span><button className="modal-close" onClick={()=>setShowModal(false)}><X size={16}/></button></div>
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
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting?<span className="spinner" style={{width:16,height:16}}/>:(editing?'Update':'Add Auditor')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
