import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, X, RefreshCw,
  Building2, FileText, User, Calendar, Shield,
  ChevronRight, AlertTriangle, ClipboardList, Download, Award, PenTool, Receipt
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ProcessingTimeline from '../components/ProcessingTimeline';
import { STATUS_LABELS, STATUS_BADGE } from '../lib/applicationStatuses';

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
  const [agreement, setAgreement] = useState(null);
  const [audit, setAudit] = useState(null);

  // Modal Visibility States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Inline forms/submission states
  const [rejectReason, setRejectReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchApp = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [appRes, propRes, invRes, agreementRes, auditRes] = await Promise.all([
        api.get(`/api/applications/${appId}`),
        api.get(`/api/proposals/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/invoices/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/agreements/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/audits/application/${appId}`).catch(() => ({ data: null }))
      ]);

      setApp(appRes.data);
      setProposal(propRes.data || null);
      setInvoice(invRes.data || null);
      setAgreement(agreementRes.data?.data || agreementRes.data || null);
      setAudit(auditRes.data || null);
    } catch (err) {
      if (!silent) toast.error('Failed to load application details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchApp();
    const interval = setInterval(() => fetchApp(true), 20000);
    return () => clearInterval(interval);
  }, [fetchApp]);

  const handleApprove = async () => {
    setActionSubmitting(true);
    try {
      const res = await api.put(`/api/applications/${appId}/approve`, {});
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

  const status = app.status || 'submitted';
  const isTerminal = ['rejected', 'certificate_issued'].includes(status);
  const canActOnApplication = status === 'submitted' || status === 'under_review';

  // Helper flags for action stepper
  const showSendProposalAction = status === 'approved' || status === 'proposal_sent' || status === 'proposal_rejected';
  const showInvoiceAction = status === 'proposal_approved' || status === 'invoice_sent';
  const showAuditAction = ['payment_received', 'dates_proposed', 'dates_accepted', 'date_finalized', 'audit_assigned'].includes(status);
  const showCreateLogsheetAction = status === 'audit_report_submitted';
  const showSendAgreementAction = ['logsheet_created', 'logsheet_sign_requested', 'logsheet_signed', 'agreement_sent'].includes(status);
  const showCertificateAction = status === 'agreement_signed';

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
                onClick={() => setShowInvoiceModal(true)}
              >
                <Receipt size={16} /> {invoice ? 'Resend Invoice' : 'Send Invoice'}
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

            {showCreateLogsheetAction && (
              <button
                className="btn btn-primary"
                style={{ gap: 8, background: '#0e7490' }}
                onClick={() => navigate(`/applications/${appId}/logsheet`)}
              >
                <ClipboardList size={16} /> Create LogSheet
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

            {showCertificateAction && (
              <button
                className="btn btn-primary"
                style={{ gap: 8, background: '#16a34a' }}
                onClick={() => setShowCertificateModal(true)}
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
          <InvoiceCard app={app} invoice={invoice} />

          {/* Audit Card */}
          <AuditCard app={app} audit={audit} onManage={() => setShowAuditModal(true)} />

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
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Are you sure you want to approve this application? This will advance the status to <strong>APPROVED</strong> and allow you to submit a proposal.
              </p>
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
        onSuccess={() => fetchApp(true)}
      />

      <AuditManageModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        app={app}
        existingAudit={audit}
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
    </div>
  );
}
