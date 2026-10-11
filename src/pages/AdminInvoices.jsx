import { getPdfUrl } from '../lib/pdfUtils';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, X, FileBarChart, Eye, Download, Check, CheckCircle2, Receipt, ExternalLink, RefreshCw, Search, Shield, Bell, AlertCircle } from 'lucide-react';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { canSendInvoice, canConfirmPayment, canAccessInvoices } from '../lib/permissions';

export default function AdminInvoices() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const currentUser = profile || user;
  const hasAccess = canAccessInvoices(currentUser);

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [remindingId, setRemindingId] = useState(null);
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

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) return;
    if (!hasAccess) {
      toast.error('Access restricted: Only Accountant and Administrator can access the Invoices page.');
      navigate('/dashboard', { replace: true });
      return;
    }
    fetch();
  }, [hasAccess, currentUser, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSendInvoice(currentUser)) {
      return toast.error('Only Accountant and Administrator can create or send invoices.');
    }
    setSubmitting(true);
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
    if (!canConfirmPayment(currentUser)) {
      return toast.error('Only Accountant and Administrator can confirm client payments.');
    }
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

  const handleRemindClient = async (inv) => {
    const invId = inv._id || inv.id;
    if (!invId) return;
    setRemindingId(invId);
    try {
      const res = await api.post(`/api/invoices/${invId}/remind`);
      toast.success(res.data?.message || `Payment reminder sent for Invoice #${inv.invoice_number}`);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to send reminder');
    } finally {
      setRemindingId(null);
    }
  };

  const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid');
  const totalUnpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);

  const filtered = invoices.filter(inv => {
    const s = search.toLowerCase();
    const invNum = (inv.invoice_number || '').toLowerCase();
    const compName = (inv.profiles?.company_name || '').toLowerCase();
    const desc = (inv.description || inv.title || '').toLowerCase();
    const matchesSearch = !s || invNum.includes(s) || compName.includes(s) || desc.includes(s);
    if (!matchesSearch) return false;

    if (filterStatus === 'paid') return inv.status === 'paid';
    if (filterStatus === 'client_paid') return inv.status === 'client_paid';
    if (filterStatus === 'unpaid') return inv.status === 'unpaid' || inv.status === 'pending';
    if (filterStatus === 'overdue') return inv.status === 'overdue';
    return true;
  });

  const paginatedList = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (authLoading) {
    return (
      <div className="loading-overlay" style={{ height: '60vh' }}>
        <div className="spinner" style={{ width: 34, height: 34 }} />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: 16, margin: 24, border: '1px solid #fee2e2' }}>
        <Shield size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#991b1b', marginBottom: 8 }}>Access Restricted</h2>
        <p style={{ color: '#64748b', fontSize: 14, maxWidth: 460, margin: '0 auto 20px' }}>
          The Invoices page is strictly restricted to Accountant and Administrator personnel.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            placeholder="Search invoice number, client, description..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={filterStatus}
          onChange={e => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="client_paid">Pending Verification</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={fetch}><RefreshCw size={14} /></button>
        {canSendInvoice(currentUser) && (
          <button className="btn btn-primary" onClick={()=>setShowModal(true)} style={{marginLeft:'auto'}}><Plus size={15}/> Create Invoice</button>
        )}
      </div>

      {/* UNPAID & OUTSTANDING INVOICES SECTION */}
      {unpaidInvoices.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderRadius: 16, border: '1.5px solid #fed7aa', boxShadow: '0 4px 12px -2px rgba(234, 88, 12, 0.08)' }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #fff7ed, #fffbeb)', padding: '18px 24px', borderBottom: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ffedd5', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Receipt size={20} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#9a3412', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Unpaid & Outstanding Invoices ({unpaidInvoices.length})
                  <span style={{ fontSize: 12, background: '#ea580c', color: '#fff', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                    £{totalUnpaidAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} Due
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: '#c2410c', marginTop: 2 }}>
                  Invoices awaiting client payment. Renewal & Surveillance applications continue processing normally.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: 8, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                ✓ Applications Continue Normally
              </span>
            </div>
          </div>

          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Invoice No.</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Client</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Reminder History</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {unpaidInvoices.map(inv => {
                  const invId = inv._id || inv.id;
                  const isClientPaid = inv.status === 'client_paid';
                  return (
                    <tr key={`unpaid-${invId}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0f172a' }}>{inv.invoice_number}</td>
                      <td style={{ padding: '12px 18px', color: '#334155', fontWeight: 600 }}>{inv.profiles?.company_name || 'Client'}</td>
                      <td style={{ padding: '12px 18px', color: '#64748b', fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.description || inv.title || 'Certification Fee'}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 800, color: '#ea580c' }}>
                        £{parseFloat(inv.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span className={`badge ${isClientPaid ? 'badge-orange' : inv.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`}>
                          {isClientPaid ? 'Proof Submitted' : inv.status || 'Unpaid'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: 12, color: '#64748b' }}>
                        {inv.last_reminded_at ? (
                          <span title={`Reminded ${inv.reminder_count || 1} times`}>
                            Reminded {new Date(inv.last_reminded_at).toLocaleDateString('en-GB')} ({inv.reminder_count || 1}x)
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Never reminded</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={remindingId === invId}
                            onClick={() => handleRemindClient(inv)}
                            style={{ border: '1px solid #fde68a', background: '#fffbeb', color: '#b45309', padding: '6px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                            title="Send payment reminder email and portal notification"
                          >
                            <Bell size={13} style={{ color: '#d97706' }} />
                            <span>{remindingId === invId ? 'Sending...' : 'Remind Client'}</span>
                          </button>
                          {canConfirmPayment(currentUser) && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={confirmingId === invId}
                              onClick={() => handleOneClickConfirm(inv)}
                              style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', padding: '6px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                              title="Confirm payment directly"
                            >
                              <Check size={13} />
                              <span>{confirmingId === invId ? 'Confirming...' : 'Confirm'}</span>
                            </button>
                          )}
                          {inv.invoice_url && (
                            <a
                              href={getPdfUrl(inv.invoice_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', color: '#475569' }}
                              title="View PDF"
                            >
                              <Eye size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><div className="card-title">All Invoices ({filtered.length})</div></div>
        <div className="table-wrap">
          {loading?<div className="loading-overlay"><div className="spinner"/></div>:
            filtered.length===0?<div className="empty-state"><div className="empty-state-icon"><FileBarChart/></div><div className="empty-state-title">No Invoices Found</div></div>:(
              <table>
                <thead><tr><th>Invoice No.</th><th>Client</th><th>Description</th><th>Amount</th><th>Status</th><th style={{ width: '70px', textAlign: 'center' }}>Actions</th></tr></thead>
                <tbody>
                  {paginatedList.map(inv=>{
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
                                ...(!isPaid && canConfirmPayment(currentUser) ? [{
                                  label: confirmingId === invId ? 'Confirming Payment...' : 'Confirm Client Payment',
                                  icon: Check,
                                  variant: 'success',
                                  onClick: () => handleOneClickConfirm(inv)
                                }] : []),
                                ...(!isPaid ? [{
                                  label: remindingId === invId ? 'Sending Reminder...' : 'Send Payment Reminder to Client',
                                  icon: Bell,
                                  variant: 'warning',
                                  onClick: () => handleRemindClient(inv)
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

        <Pagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="invoices"
        />
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

