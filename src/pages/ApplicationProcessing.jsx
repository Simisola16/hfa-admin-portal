import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, X, RefreshCw,
  Building2, FileText, User, Calendar, Shield,
  ChevronRight, AlertTriangle, ClipboardList, Download, Award, PenTool, Receipt, ExternalLink
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ProcessingTimeline from '../components/ProcessingTimeline';
import { STATUS_LABELS, STATUS_BADGE } from '../lib/applicationStatuses';
import { getSocket } from '../lib/socket';

// Extracted Modals
import ProposalModal from '../components/ProposalModal';
import InvoiceModal from '../components/InvoiceModal';
import AgreementModal from '../components/AgreementModal';
import CertificateModal from '../components/CertificateModal';
import AuditManageModal from '../components/AuditManageModal';

// Extracted Detail Cards
import ProposalCard from '../components/ProposalCard';
import InvoiceCard from '../components/InvoiceCard';
import AuditCard from '../components/AuditCard';
import LogsheetCard from '../components/LogsheetCard';
import AgreementCard from '../components/AgreementCard';

export default function ApplicationProcessing() {
  const { appId } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core records for child components
  const [proposal, setProposal] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [allInvoices, setAllInvoices] = useState([]);
  const [agreement, setAgreement] = useState(null);
  const [audits, setAudits] = useState([]);

  // Modal Visibility States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceModalType, setInvoiceModalType] = useState('initial'); // 'initial' | 'final'
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  // Inline forms/submission states
  const [approveCategory, setApproveCategory] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  const fetchApp = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [appRes, propRes, invRes, allInvRes, agreementRes, auditRes] = await Promise.all([
        api.get(`/api/applications/${appId}`),
        api.get(`/api/proposals/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/invoices/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/invoices/application/${appId}/all`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/agreements/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/audits/application/${appId}`).catch(() => ({ data: null }))
      ]);

      setApp(appRes.data);
      setProposal(propRes.data || null);
      setInvoice(invRes.data || null);
      setAllInvoices(allInvRes.data?.data || allInvRes.data || []);
      setAgreement(agreementRes.data?.data || agreementRes.data || null);
      setAudits(auditRes.data?.data || auditRes.data || []);
    } catch (err) {
      if (!silent) toast.error('Failed to load application details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appId]);

  const [socketConnected, setSocketConnected] = useState(true);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleConnectError = () => setSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    // Sync initial state
    setSocketConnected(socket.connected);

    const handleUpdate = (data) => {
      if (data.appId === appId) {
        // Silent re-fetch to sync fresh DB state with zero UI disruption
        fetchApp(true);
      }
    };

    socket.on('application_updated', handleUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('application_updated', handleUpdate);
    };
  }, [appId]);

  // Fallback Polling (only if socket is disconnected)
  useEffect(() => {
    if (socketConnected) return;

    const interval = setInterval(() => fetchApp(true), 20000);
    return () => clearInterval(interval);
  }, [socketConnected, fetchApp]);

  const handleConfirmPayment = async () => {
    if (!invoice) return;
    setConfirmingPayment(true);
    try {
      await api.put(`/api/invoices/${invoice._id || invoice.id}/confirm-payment`, {});
      setInvoice(prev => ({ ...prev, status: 'paid' }));
      toast.success('Payment confirmed! Application moved to Payment Received.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to confirm payment.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleApprove = async () => {
    setActionSubmitting(true);
    try {
      const res = await api.put(`/api/applications/${appId}/approve`, { category: approveCategory || app.category });
      setApp(res.data);
      setShowApproveModal(false);
      toast.success('Application approved successfully!');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Approval failed.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setActionSubmitting(true);
    try {
      const res = await api.put(`/api/applications/${appId}/reject`, { note: rejectReason.trim() });
      setApp(res.data);
      setShowRejectModal(false);
      setRejectReason('');
      toast.success('Application rejected.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Rejection failed.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handlePostAuditDecision = async (newStatus) => {
    setActionSubmitting(true);
    try {
      const res = await api.put(`/api/applications/${appId}/status`, { 
        status: newStatus, 
        note: newStatus === 'audit_successful' ? 'Audit marked successful by admin' : 'Application put on hold post-audit' 
      });
      setApp(res.data);
      toast.success(newStatus === 'audit_successful' ? 'Application marked as successful.' : 'Application put on hold.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setActionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: 80 }}>
          <AlertTriangle size={40} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 700, fontSize: 18 }}>Application Not Found</div>
          <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/applications')}>
            <ArrowLeft size={16} /> Back to Applications
          </button>
        </div>
      </div>
    );
  }

  const status = (app.status || 'submitted').toLowerCase().replace(/ /g, '_');
  const isTerminal = ['rejected', 'certificate_issued'].includes(status);
  const canActOnApplication = status === 'submitted' || status === 'under_review';

  // Helper flags for action stepper
  const showSendProposalAction = status === 'approved' || status === 'proposal_sent' || status === 'proposal_rejected';
  
  // For initial invoice
  const showInvoiceAction = status === 'proposal_approved' || status === 'invoice_sent';
  
  const showAuditAction = ['payment_received', 'dates_proposed', 'dates_accepted', 'date_finalized', 'audit_assigned'].includes(status) || (invoice && (invoice.status === 'paid' || invoice.status === 'client_paid') && status === 'invoice_sent');
  
  const showPostAuditDecision = status === 'audit_report_submitted' || status === 'on_hold';
  
  const finalInvoice = allInvoices.find(inv => inv.invoice_type === 'final') || (invoice && invoice.invoice_type === 'final' ? invoice : null);
  const isFinalInvoicePaid = (finalInvoice && (finalInvoice.status === 'paid' || finalInvoice.status === 'client_paid')) || status === 'final_invoice_paid';

  const showCreateLogsheetAction = ['audit_successful', 'logsheet_created', 'logsheet_sign_requested', 'logsheet_signed'].includes(status);
  
  const showSendAgreementAction = ['logsheet_created', 'logsheet_sign_requested', 'logsheet_signed', 'agreement_sent'].includes(status);
  
  const showFinalInvoiceAction = ['agreement_signed', 'final_invoice_sent', 'final_invoice_paid'].includes(status);
  
  const showCertificateAction = ['agreement_signed', 'final_invoice_sent', 'final_invoice_paid'].includes(status);

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/applications')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 2 }}>
            Application Processing
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {app.application_number}
            </h1>
            <span className={`badge ${STATUS_BADGE[status] || 'badge-gray'}`} style={{ fontSize: 12 }}>
              {STATUS_LABELS[status] || status.replace(/_/g, ' ')}
            </span>
            {refreshing && <RefreshCw size={14} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {app.profiles?.company_name || app.establishment_name} &middot; Submitted {new Date(app.created_at).toLocaleDateString('en-GB')}
          </div>
        </div>
        {!socketConnected && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700
          }}>
            <span className="spinner" style={{ width: 8, height: 8, borderTopColor: '#991b1b', display: 'inline-block' }} />
            Disconnected (Polling)
          </span>
        )}
        <button
          className="btn btn-ghost btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 700, color: 'var(--text-primary)' }}
          onClick={() => setShowClientModal(true)}
        >
          <Building2 size={15} style={{ color: 'var(--primary)' }} />
          View Client Details
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => fetchApp(true)} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Action Panel */}
      {!isTerminal && (
        <div style={{
          background: 'white', border: '1px solid var(--border)', borderRadius: 12,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
              Application Action Required
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {canActOnApplication
                ? 'Review the application details and approve or reject below.'
                : 'Use the actions below to proceed with the next phase of application processing.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {canActOnApplication && (
              <>
                <button className="btn btn-danger" style={{ gap: 8 }} onClick={() => setShowRejectModal(true)}>
                  <XCircle size={16} /> Reject Application
                </button>
                <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => setShowApproveModal(true)}>
                  <CheckCircle size={16} /> Approve Application
                </button>
              </>
            )}

            {showSendProposalAction && (
              <button
                className="btn btn-primary"
                style={{ gap: 8, background: '#6b21a8' }}
                onClick={() => setShowProposalModal(true)}
              >
                <FileText size={16} /> {proposal ? 'Resend Proposal' : 'Send Proposal'}
              </button>
            )}

            {showInvoiceAction && (
              <button
                className="btn btn-primary"
                style={{ gap: 8, background: '#854d0e' }}
                onClick={() => { setInvoiceModalType('initial'); setShowInvoiceModal(true); }}
              >
                <Receipt size={16} /> {invoice ? 'Resend Initial Invoice' : 'Send Initial Invoice'}
              </button>
            )}

            {showAuditAction && (
              <button
                className="btn btn-primary"
                style={{ gap: 8, background: '#ea580c' }}
                onClick={() => setShowAuditModal(true)}
              >
                <Calendar size={16} /> Manage Audit
              </button>
            )}

            {showPostAuditDecision && (
              <>
                {status !== 'on_hold' && (
                  <button className="btn btn-ghost" style={{ gap: 8, border: '1px solid #e2e8f0' }} onClick={() => handlePostAuditDecision('on_hold')} disabled={actionSubmitting}>
                    <XCircle size={16} color="#64748b" /> Put On Hold
                  </button>
                )}
                <button className="btn btn-primary" style={{ gap: 8, background: '#16a34a' }} onClick={() => handlePostAuditDecision('audit_successful')} disabled={actionSubmitting}>
                  <CheckCircle size={16} /> Mark Successful
                </button>
              </>
            )}

            {showCreateLogsheetAction && (
              <button
                className="btn btn-primary"
                style={{ gap: 8, background: '#0e7490' }}
                onClick={() => navigate(`/applications/${appId}/logsheet`)}
                title={['logsheet_created', 'logsheet_signed'].includes(status) ? 'Manage LogSheet' : 'Create LogSheet'}
              >
                <ClipboardList size={16} /> {['logsheet_created', 'logsheet_signed'].includes(status) ? 'Manage LogSheet' : 'Create LogSheet'}
              </button>
            )}

            {showSendAgreementAction && (
              <button
                className="btn btn-primary"
                style={{ gap: 8, background: '#2563eb' }}
                onClick={() => setShowAgreementModal(true)}
              >
                <FileText size={16} /> {agreement ? 'Resend Agreement' : 'Send Agreement'}
              </button>
            )}

            {showFinalInvoiceAction && (
              <button
                className="btn btn-primary"
                style={{ gap: 8, background: '#854d0e' }}
                onClick={() => { setInvoiceModalType('final'); setShowInvoiceModal(true); }}
              >
                <Receipt size={16} /> {finalInvoice ? 'Resend Final Invoice' : 'Send Final Invoice'}
              </button>
            )}

            {showCertificateAction && (
              <button
                className="btn btn-primary"
                style={{
                  gap: 8,
                  background: '#16a34a',
                  opacity: isFinalInvoicePaid ? 1 : 0.5,
                  cursor: isFinalInvoicePaid ? 'pointer' : 'not-allowed'
                }}
                onClick={() => {
                  if (isFinalInvoicePaid) {
                    setShowCertificateModal(true);
                  } else {
                    toast.error('Final invoice must be paid before certificate issuance');
                  }
                }}
                title={isFinalInvoicePaid ? 'Issue Certificate' : 'Locked: Final invoice must be paid before certificate issuance'}
              >
                <Award size={16} /> Issue Certificate
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Processing Stages & Detail Cards */}
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Proposal Card */}
          <ProposalCard app={app} proposal={proposal} />

          {/* Invoice Card */}
          <InvoiceCard
            app={app}
            invoice={invoice}
            status={app?.status}
            onConfirmPayment={invoice?.status === 'client_paid' ? handleConfirmPayment : undefined}
            confirmingPayment={confirmingPayment}
          />

          {/* Audit Card */}
          <AuditCard app={app} audits={audits} onManage={() => setShowAuditModal(true)} />

          {/* Logsheet Card (Admin Only) */}
          <LogsheetCard app={app} />

          {/* Agreement Card */}
          <AgreementCard app={app} agreement={agreement} />
        </div>

        {/* Right Column: Sidebar info */}
        <div>
          {/* Stepper Timeline */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Processing Timeline</div>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <ProcessingTimeline status={status} statusHistory={app.status_history} />
            </div>
          </div>

          {/* Company Info */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Company Info</div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Company Name</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{app.profiles?.company_name || app.establishment_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Certification Type</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{app.application_type}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Address</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{app.establishment_address}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Contact Person</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{app.profiles?.full_name || app.contact_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.profiles?.email || app.contact_email}</div>
                </div>
                <div style={{ marginTop: 6, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      gap: 6,
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 9,
                      fontWeight: 700,
                      color: '#0f172a',
                      background: '#f8fafc'
                    }}
                    onClick={() => setShowClientModal(true)}
                  >
                    <Building2 size={15} style={{ color: 'var(--primary)' }} />
                    View Full Client Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowApproveModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Approve Application</div>
              <button className="modal-close" onClick={() => setShowApproveModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                You are about to approve this application. Please confirm the final category before approving.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>Final Category</label>
                <select 
                  className="form-control" 
                  value={approveCategory || app?.category} 
                  onChange={e => setApproveCategory(e.target.value)}
                  disabled={actionSubmitting}
                >
                  <option value="Annual Certification – Food and General processing">Annual Certification – Food and General processing</option>
                  <option value="Annual Certification – Meat Processing">Annual Certification – Meat Processing</option>
                  <option value="UAE/GSO Approved Halal Certification For Exporters To UAE">UAE/GSO Approved Halal Certification For Exporters To UAE</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowApproveModal(false)} disabled={actionSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApprove} disabled={actionSubmitting}>
                {actionSubmitting ? 'Approving...' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowRejectModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: '#dc2626' }}>Reject Application</div>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                Please provide a brief reason for rejection. The client will see this note in their portal.
              </p>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                disabled={actionSubmitting}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowRejectModal(false)} disabled={actionSubmitting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={actionSubmitting || !rejectReason.trim()}>
                {actionSubmitting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Modals */}
      <ProposalModal
        isOpen={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        app={app}
        proposal={proposal}
        onSuccess={() => fetchApp(true)}
      />

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        app={app}
        invoice={invoice}
        invoiceType={invoiceModalType}
        onSuccess={() => fetchApp(true)}
      />

      <AuditManageModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        app={app}
        existingAudits={audits}
        onSuccess={() => fetchApp(true)}
      />

      <AgreementModal
        isOpen={showAgreementModal}
        onClose={() => setShowAgreementModal(false)}
        app={app}
        agreement={agreement}
        onSuccess={() => fetchApp(true)}
      />

      <CertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        app={app}
        onSuccess={() => fetchApp(true)}
      />

      {/* Client Details Modal */}
      {showClientModal && (
        <div className="modal-overlay" style={{ zIndex: 1150 }} onClick={() => setShowClientModal(false)}>
          <div className="modal" style={{ maxWidth: 540, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    {app.profiles?.company_name || app.establishment_name || 'Client Profile'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Client & Company Overview</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowClientModal(false)}><X size={18}/></button>
            </div>

            <div style={{ padding: '24px', display: 'grid', gap: 16 }}>
              {/* Profile Header Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contact Name</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{app.profiles?.full_name || app.contact_name || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Email Address</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', marginTop: 2 }}>{app.profiles?.email || app.contact_email || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Telephone</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{app.contact_phone || app.profiles?.phone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Account Status</div>
                  <div style={{ marginTop: 3 }}>
                    <span style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={10} /> Active Client
                    </span>
                  </div>
                </div>
              </div>

              {/* Site & Application Scope info */}
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                  Registered Establishment & Scope
                </div>
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{app.establishment_name || app.site_name || 'Main Facility'}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{app.establishment_address || 'Address not specified'}</div>
                  {app.scope && (
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 8, background: '#f1f5f9', padding: '8px 10px', borderRadius: 6 }}>
                      <strong>Scope:</strong> {app.scope}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                style={{ gap: 7, fontSize: 13 }}
                onClick={() => {
                  setShowClientModal(false);
                  const searchStr = app.profiles?.company_name || app.profiles?.email || app.establishment_name;
                  navigate(`/clients?search=${encodeURIComponent(searchStr)}`);
                }}
              >
                <ExternalLink size={14} /> Open in Companies Directory
              </button>
              <button className="btn btn-ghost" onClick={() => setShowClientModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
