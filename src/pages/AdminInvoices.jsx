import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, X, FileBarChart, Eye, Download, Check, CheckCircle2, Receipt } from 'lucide-react';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';
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
  const [confirmingId, setConfirmingId] = useState(null);
  const [form, setForm] = useState({ client_id:'', description:'', amount:'', due_date:'', items:'' });
  const [confirmPaymentModal, setConfirmPaymentModal] = useState({ isOpen: false, invoice: null, app: null });

  const fetch = () => {
    setLoading(true);
    Promise.all([api.get('/api/invoices'), api.get('/api/users')])
      .then(([inv, u]) => {
        const invList = Array.isArray(inv) ? inv : (Array.isArray(inv?.data) ? inv.data : []);
        const userList = Array.isArray(u) ? u : (Array.isArray(u?.data) ? u.data : []);
        setInvoices(invList);
        setClients(userList.filter(u => u.role === 'client'));
      })
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try{ await api.post('/api/invoices',form); toast.success('Invoice created'); setShowModal(false); fetch(); }
    catch(err){toast.error(err.message);} finally{setSubmitting(false);}
  };

  const handlePaymentConfirmed = (confirmedInvId) => {
    if (confirmedInvId) {
      setInvoices(prev => prev.map(inv => {
        const id = inv._id || inv.id;
        if (id === confirmedInvId) {
          return { ...inv, status: 'paid', payment_date: new Date().toISOString(), paid_at: new Date().toISOString() };
        }
        return inv;
      }));
    }
    fetch();
  };

  const handleOneClickConfirm = async (inv) => {
    const invId = inv._id || inv.id;
    if (!invId) return;
    setConfirmingId(invId);
    try {
      await api.put(`/api/invoices/${invId}/confirm-payment`);
      toast.success(`Payment confirmed for Invoice #${inv.invoice_number}`);
      handlePaymentConfirmed(invId);
    } catch (err) {
      toast.error(err.message || 'Failed to confirm payment');
    } finally {
      setConfirmingId(null);
    }
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
                  {invoices.map(inv=>{
                    const isPaid = inv.status === 'paid';
                    const invId = inv._id || inv.id;
                    return (
                      <tr key={invId}>
                        <td style={{fontWeight:700}}>{inv.invoice_number}</td>
                        <td>{inv.profiles?.company_name||'—'}</td>
                        <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inv.description || inv.title}</td>
                        <td style={{fontWeight:700}}>£{parseFloat(inv.amount||0).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${
                            isPaid
                              ? 'badge-green'
                              : inv.status === 'client_paid'
                              ? 'badge-orange'
                              : inv.status === 'overdue'
                              ? 'badge-red'
                              : 'badge-yellow'
                          }`} style={isPaid ? { display: 'inline-flex', alignItems: 'center', gap: 4 } : {}}>
                            {isPaid && <CheckCircle2 size={12} />}
                            {inv.status === 'client_paid' ? 'Pending Verification' : inv.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
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

                            {/* Client Payment Receipt link */}
                            {inv.payment_proof_url && (
                              <a
                                href={getPdfUrl(inv.payment_proof_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline btn-sm"
                                style={{ padding: '4px 8px', gap: 4, color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                                title="View Client Uploaded Payment Proof"
                              >
                                <Receipt size={14} /> Receipt
                              </a>
                            )}

                            {/* Action: Paid badge or Confirm Payment trigger */}
                            {isPaid ? (
                              <span
                                className="badge badge-green"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  border: '1px solid #bbf7d0'
                                }}
                                title="Payment confirmed by admin"
                              >
                                <CheckCircle2 size={13} /> Confirmed
                              </span>
                            ) : (
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  borderColor: '#15803d',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontWeight: 600,
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  cursor: confirmingId === invId ? 'not-allowed' : 'pointer',
                                  opacity: confirmingId === invId ? 0.75 : 1
                                }}
                                disabled={confirmingId === invId}
                                onClick={() => handleOneClickConfirm(inv)}
                                title="One-Click Confirm Client Payment"
                              >
                                {confirmingId === invId ? (
                                  <>
                                    <span className="spinner-white" style={{ width: 12, height: 12 }} /> Confirming...
                                  </>
                                ) : (
                                  <>
                                    <Check size={14} /> Confirm Payment
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Confirm Payment Modal */}
      <ConfirmPaymentModal
        isOpen={confirmPaymentModal.isOpen}
        onClose={() => setConfirmPaymentModal({ isOpen: false, invoice: null, app: null })}
        invoice={confirmPaymentModal.invoice}
        app={confirmPaymentModal.app}
        onSuccess={() => handlePaymentConfirmed(confirmPaymentModal.invoice?._id || confirmPaymentModal.invoice?.id)}
      />
    </div>
  );
}
