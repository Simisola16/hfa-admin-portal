import { getPdfUrl } from '../lib/pdfUtils';
import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, X, FileBarChart, Eye, Download, Check, CheckCircle2, Receipt, ExternalLink, RefreshCw } from 'lucide-react';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';


export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [form, setForm] = useState({ client_id:'', description:'', amount:'', due_date:'', items:'' });
  const [confirmPaymentModal, setConfirmPaymentModal] = useState({ isOpen: false, invoice: null, app: null });
  const [activeActionModal, setActiveActionModal] = useState(null);

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
        <button className="btn btn-ghost btn-sm" onClick={fetch}><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)} style={{marginLeft:'auto'}}><Plus size={15}/> Create Invoice</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Invoices ({invoices.length})</div></div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:
            invoices.length===0?<div className="empty-state"><div className="empty-state-icon"><FileBarChart/></div><div className="empty-state-title">No Invoices</div></div>:(
              <table>
                <thead><tr><th>Invoice No.</th><th>Client</th><th>Description</th><th>Amount</th><th>Status</th><th style={{ width: '70px', textAlign: 'center' }}>Actions</th></tr></thead>
                <tbody>
                  {invoices.map(inv=>{
                    const isPaid = inv.status === 'paid';
                    const invId = inv._id || inv.id;
                    const statusBadgeClass = isPaid
                      ? 'badge-green'
                      : inv.status === 'client_paid'
                      ? 'badge-orange'
                      : inv.status === 'overdue'
                      ? 'badge-red'
                      : 'badge-yellow';

                    return (
                      <tr key={invId}>
                        <td style={{fontWeight:700}}>{inv.invoice_number}</td>
                        <td>{inv.profiles?.company_name||'—'}</td>
                        <td style={{maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inv.description || inv.title}</td>
                        <td style={{fontWeight:700, color: '#0f172a'}}>£{parseFloat(inv.amount||0).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${statusBadgeClass}`} style={isPaid ? { display: 'inline-flex', alignItems: 'center', gap: 4 } : {}}>
                            {isPaid && <CheckCircle2 size={12} />}
                            {inv.status === 'client_paid' ? 'Pending Verification' : inv.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <ActionTriggerButton
                            onClick={() => setActiveActionModal({
                              title: `Invoice #${inv.invoice_number}`,
                              subtitle: `${inv.profiles?.company_name || 'Client'} • £${parseFloat(inv.amount||0).toFixed(2)}`,
                              badge: isPaid ? 'Payment Confirmed' : inv.status === 'client_paid' ? 'Payment Pending Verification' : (inv.status || 'Pending Payment'),
                              badgeVariant: statusBadgeClass,
                              actions: [
                                ...(!isPaid ? [{
                                  label: confirmingId === invId ? 'Confirming Payment...' : 'Confirm Client Payment',
                                  icon: Check,
                                  variant: 'success',
                                  onClick: () => handleOneClickConfirm(inv)
                                }] : []),
                                ...(inv.invoice_url ? [
                                  {
                                    label: 'View Invoice Document (PDF)',
                                    icon: Eye,
                                    href: getPdfUrl(inv.invoice_url),
                                    target: '_blank',
                                    variant: 'primary'
                                  },
                                  {
                                    label: 'Download Invoice PDF',
                                    icon: Download,
                                    href: getPdfUrl(inv.invoice_url),
                                    target: '_blank',
                                    variant: 'default'
                                  }
                                ] : []),
                                ...(inv.payment_proof_url ? [{
                                  label: 'View Client Payment Proof Receipt',
                                  icon: Receipt,
                                  href: getPdfUrl(inv.payment_proof_url),
                                  target: '_blank',
                                  variant: 'default'
                                }] : [])
                              ]
                            })}
                          />
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
                    {clients.map(c=><option key={c.id || c._id} value={c.id || c._id}>{c.company_name||c.full_name}</option>)}
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

      {/* Action Modal Popup */}
      <ActionModal
        isOpen={Boolean(activeActionModal)}
        onClose={() => setActiveActionModal(null)}
        title={activeActionModal?.title}
        subtitle={activeActionModal?.subtitle}
        badge={activeActionModal?.badge}
        badgeVariant={activeActionModal?.badgeVariant}
        actions={activeActionModal?.actions || []}
      />
    </div>
  );
}

