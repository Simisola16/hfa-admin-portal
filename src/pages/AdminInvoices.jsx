import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, X, FileBarChart, Eye, Download } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ client_id:'', description:'', amount:'', due_date:'', items:'' });

  const fetch = () => {
    setLoading(true);
    Promise.all([api.get('/api/invoices'), api.get('/api/users')])
      .then(([inv,u])=>{setInvoices(inv.data||[]);setClients((u.data||[]).filter(u=>u.role==='client'));})
      .catch(()=>toast.error('Failed')).finally(()=>setLoading(false));
  };
  useEffect(()=>{fetch();},[]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try{ await api.post('/api/invoices',form); toast.success('Invoice created'); setShowModal(false); fetch(); }
    catch(err){toast.error(err.message);} finally{setSubmitting(false);}
  };

  const markPaid = async (id) => {
    try{ await api.put(`/api/invoices/${id}/status`,{status:'paid',payment_date:new Date().toISOString()}); toast.success('Marked as paid'); fetch(); }
    catch(err){toast.error(err.message);}
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={()=>setShowModal(true)} style={{marginLeft:'auto'}}><Plus size={15}/> Create Invoice</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Invoices ({invoices.length})</div></div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:
            invoices.length===0?<div className="empty-state"><div className="empty-state-icon"><FileBarChart/></div><div className="empty-state-title">No Invoices</div></div>:(
              <table>
                <thead><tr><th>Invoice No.</th><th>Client</th><th>Description</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {invoices.map(inv=>(
                    <tr key={inv.id || inv._id}>
                      <td style={{fontWeight:700}}>{inv.invoice_number}</td>
                      <td>{inv.profiles?.company_name||'—'}</td>
                      <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inv.description || inv.title}</td>
                      <td style={{fontWeight:700}}>£{parseFloat(inv.amount||0).toFixed(2)}</td>
                      <td><span className={`badge ${inv.status==='paid'?'badge-green':inv.status==='client_paid'?'badge-orange':inv.status==='overdue'?'badge-red':'badge-yellow'}`}>{inv.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {inv.invoice_url ? (
                            <>
                              <a
                                href={getPdfUrl(inv.invoice_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#16a34a', padding: '4px 8px', gap: 4 }}
                                title="View Invoice"
                              >
                                <Eye size={14} /> View
                              </a>
                              <a
                                href={getPdfUrl(inv.invoice_url)}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline btn-sm"
                                style={{ padding: '4px 8px', gap: 4 }}
                                title="Download Invoice"
                              >
                                <Download size={14} /> Download
                              </a>
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>No PDF</span>
                          )}
                          {(inv.status === 'pending' || inv.status === 'issued' || inv.status === 'unpaid') && (
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--primary)' }} onClick={() => markPaid(inv.id || inv._id)}>Mark Paid</button>
                          )}
                        </div>
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
            <div className="modal-header"><span className="modal-title">Create Invoice</span><button className="modal-close" onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Client <span>*</span></label>
                  <select className="form-control" value={form.client_id} onChange={e=>setForm(f=>({...f,client_id:e.target.value}))} required>
                    <option value="">Select Client</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.company_name||c.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Description <span>*</span></label><input className="form-control" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} required/></div>
                <div className="form-group"><label className="form-label">Amount (£) <span>*</span></label><input type="number" step="0.01" className="form-control" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} required/></div>
                <div className="form-group"><label className="form-label">Line Items</label><textarea className="form-control" value={form.items} onChange={e=>setForm(f=>({...f,items:e.target.value}))} placeholder="e.g. Application Fee: £500, Inspection Fee: £300"/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting?<span className="spinner" style={{width:16,height:16}}/>:'Create Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
