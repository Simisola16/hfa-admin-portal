import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, X, RefreshCw,
  Building2, FileText, User, Calendar, Shield,
  ChevronRight, AlertTriangle, ClipboardList, Download, Award, PenTool, Receipt, ExternalLink, Clock
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../lib/pdfUtils';
import ProcessingTimeline from '../components/ProcessingTimeline';
import { STATUS_LABELS, STATUS_BADGE } from '../lib/applicationStatuses';
import { getSocket } from '../lib/socket';

// Extracted Modals
import ProposalModal from '../components/ProposalModal';
import InvoiceModal from '../components/InvoiceModal';
import AgreementModal from '../components/AgreementModal';
import CertificateModal from '../components/CertificateModal';
import AuditManageModal from '../components/AuditManageModal';
import FinalAgreementModal from '../components/FinalAgreementModal';

// Extracted Detail Cards
import ProposalCard from '../components/ProposalCard';
import InvoiceCard from '../components/InvoiceCard';
import AuditCard from '../components/AuditCard';
import NcCard from '../components/NcCard';
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
  const [logsheet, setLogsheet] = useState(null);

  // Modal Visibility States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceModalType, setInvoiceModalType] = useState('initial'); // 'initial' | 'final'
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showFinalAgreementModal, setShowFinalAgreementModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showNcModal, setShowNcModal] = useState(false);
  const [ncModalTab, setNcModalTab] = useState('review'); // 'review' | 'flag_new'

  // Inline forms/submission states
  const [approveCategory, setApproveCategory] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [ncText, setNcText] = useState('');
  const [ncFile, setNcFile] = useState(null);
  const [ncReplyText, setNcReplyText] = useState('');
  const [ncReplyFile, setNcReplyFile] = useState(null);
  const [flaggingNc, setFlaggingNc] = useState(false);
  const [replyingNc, setReplyingNc] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [markingLogsheetDone, setMarkingLogsheetDone] = useState(false);
  const [markingAgreementDone, setMarkingAgreementDone] = useState(false);

  const fetchApp = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [appRes, propRes, invRes, allInvRes, agreementRes, auditRes, logsheetRes] = await Promise.all([
        api.get(`/api/applications/${appId}`),
        api.get(`/api/proposals/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/invoices/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/invoices/application/${appId}/all`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/agreements/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/audits/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/application-logsheets/application/${appId}`).catch(() => ({ data: null }))
      ]);

      const fetchedApp = appRes.data?.data || appRes.data || null;
      const fetchedLogsheet = logsheetRes.data?.data || (logsheetRes.data && !logsheetRes.data.error ? logsheetRes.data : null) || fetchedApp?.logsheet_id || fetchedApp?.logsheet || null;

      setApp(fetchedApp);
      setProposal(propRes.data?.data || propRes.data || null);
      setInvoice(invRes.data?.data || invRes.data || null);
      setAllInvoices(allInvRes.data?.data || allInvRes.data || []);
      setAgreement(agreementRes.data?.data || agreementRes.data || null);
      setAudits(auditRes.data?.data || auditRes.data || []);
      setLogsheet(fetchedLogsheet);
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
    setSocketConnected(socket.connected);

    const handleUpdate = (data) => {
      if (data?.appId === appId || data?.id === appId) {
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
  }, [appId, fetchApp]);

  const handleApprove = async () => {
    setActionSubmitting(true);
    try {
      const res = await api.put(`/api/applications/${appId}/approve`, {
        category: approveCategory || app.category
      });
      setApp(res.data?.data || res.data || { ...app, status: 'approved' });
      setShowApproveModal(false);
      toast.success('Application accepted successfully!');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to accept application.');
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
      setApp(res.data?.data || res.data || { ...app, status: 'rejected' });
      setShowRejectModal(false);
      setRejectReason('');
      toast.success('Application rejected.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to reject application.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    setConfirmingPayment(true);
    try {
      await api.post(`/api/invoices/confirm-payment`, {
        application_id: appId,
        invoice_id: invoice?._id || invoice?.id
      });
      toast.success('Payment confirmed! Client and Admin notified.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to confirm payment.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleConfirmFinalPayment = async () => {
    setConfirmingPayment(true);
    try {
      const targetInvoice = allInvoices.find(inv => inv.invoice_type === 'final' || inv.stage === 'final') || invoice;
      await api.post(`/api/invoices/confirm-payment`, {
        application_id: appId,
        invoice_id: targetInvoice?._id || targetInvoice?.id
      });
      toast.success('Final Certification Payment confirmed!');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to confirm final payment.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleHoldConfirm = async () => {
    setActionSubmitting(true);
    try {
      await api.put(`/api/applications/${appId}/status`, {
        status: 'under_review',
        note: holdReason.trim() || 'Application put on hold for client clarifications.'
      });
      setShowHoldModal(false);
      setHoldReason('');
      toast.success('Application status updated to Under Review.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleFlagNc = async () => {
    if (!ncText.trim()) {
      toast.error('Please enter Non-Conformity details.');
      return;
    }
    const auditObj = audits?.[0] || audits?.data?.[0];
    const auditId = auditObj?._id || auditObj?.id;
    setFlaggingNc(true);
    try {
      const formData = new FormData();
      if (auditId) formData.append('audit_id', auditId);
      formData.append('application_id', appId);
      formData.append('text', ncText.trim());
      if (ncFile) {
        formData.append('nc_document', ncFile);
      }
      await api.post('/api/audits/flag-nc', formData, true);
      toast.success('NC Report flagged successfully. Client notified.');
      setShowNcModal(false);
      setNcText('');
      setNcFile(null);
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to flag NC report.');
    } finally {
      setFlaggingNc(false);
    }
  };

  const handleReplyNc = async () => {
    if (!ncReplyText.trim()) {
      toast.error('Please enter your reply comments or instructions.');
      return;
    }
    const auditObj = audits?.[0] || audits?.data?.[0];
    const auditId = auditObj?._id || auditObj?.id;
    setReplyingNc(true);
    try {
      const formData = new FormData();
      if (auditId) formData.append('audit_id', auditId);
      formData.append('application_id', appId);
      formData.append('reply_text', ncReplyText.trim());
      if (ncReplyFile) {
        formData.append('reply_document', ncReplyFile);
      }
      await api.post('/api/audits/nc-reply', formData, true);
      toast.success('Admin reply submitted successfully! Client notified.');
      setNcReplyText('');
      setNcReplyFile(null);
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to submit admin reply.');
    } finally {
      setReplyingNc(false);
    }
  };

  const handleCloseNc = async () => {
    setActionSubmitting(true);
    try {
      const auditObj = audits?.[0] || audits?.data?.[0];
      const auditId = auditObj?._id || auditObj?.id;
      if (auditId) {
        await api.post('/api/audits/complete-clean', { audit_id: auditId }).catch(() => {});
      }
      await api.post('/api/audits/nc-close', { audit_id: auditId, application_id: appId });
      toast.success('NC Closed successfully! You can now create the LogSheet.');
      setShowNcModal(false);
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to close NC.');
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
  const isRenewal = app.application_type === 'renewal';
  const initialInvoice = allInvoices.find(inv => inv.invoice_type === 'initial' || inv.stage === 'initial') || (invoice && invoice.invoice_type !== 'final' ? invoice : null);
  const finalInvoice = allInvoices.find(inv => inv.invoice_type === 'final' || inv.stage === 'final' || inv.target_status === 'final_invoice_sent') || (invoice && invoice.invoice_type === 'final' ? invoice : null);
  const isFinalInvoicePaid = (finalInvoice && (finalInvoice.status === 'paid' || finalInvoice.status === 'client_paid')) || status === 'final_invoice_paid';

  const handleMarkLogsheetDone = async () => {
    const logsheetId = logsheet?._id || logsheet?.id;
    if (!logsheetId) {
      toast.error('No logsheet record found for this application.');
      return;
    }
    setMarkingLogsheetDone(true);
    try {
      await api.put(`/api/application-logsheets/${logsheetId}/status`, {
        status: 'Waiting For Certificate',
        force: true
      });
      toast.success('Logsheet marked as Done! Application moved to Application Successful & Agreement unlocked.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to mark logsheet as done.');
    } finally {
      setMarkingLogsheetDone(false);
    }
  };

  const handleMarkAgreementDone = async () => {
    const agreementId = agreement?._id || agreement?.id;
    setMarkingAgreementDone(true);
    try {
      if (agreementId) {
        await api.post(`/api/agreements/${agreementId}/mark-done`);
      } else {
        await api.put(`/api/applications/${appId}/status`, {
          status: 'agreement_finalised',
          note: 'Certification Agreement marked as done & approved by admin.'
        });
      }
      toast.success('Certification Agreement marked as Done! Application advanced to next stage.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to mark agreement as done.');
    } finally {
      setMarkingAgreementDone(false);
    }
  };

  const handleMarkReadyForCertificate = async () => {
    setActionSubmitting(true);
    try {
      await api.put(`/api/applications/${appId}/ready-for-certificate`);
      toast.success('Application marked Ready for Certificate Issuance!');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const renderPrimaryAction = () => {
    // 1. Initial Application Review (Accept / Put On Hold / Reject)
    if (status === 'submitted' || status === 'under_review') {
      return (
        <>
          <button className="btn btn-danger" style={{ gap: 8 }} onClick={() => setShowRejectModal(true)}>
            <XCircle size={16} /> Reject Application
          </button>
          <button
            className="btn btn-ghost"
            style={{ gap: 8, border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: 700 }}
            onClick={() => setShowHoldModal(true)}
          >
            <Clock size={16} style={{ color: '#d97706' }} /> Put On Hold
          </button>
          <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => setShowApproveModal(true)}>
            <CheckCircle size={16} /> Accept Application
          </button>
        </>
      );
    }

    // 2. Proposal Stage
    if (status === 'approved' || status === 'proposal_sent' || status === 'proposal_rejected') {
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#6b21a8' }}
          onClick={() => setShowProposalModal(true)}
        >
          <FileText size={16} /> {proposal ? 'Resend Proposal' : 'Send Proposal'}
        </button>
      );
    }

    // 3. Initial Invoice Stage
    if (status === 'proposal_approved' || status === 'invoice_sent') {
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#854d0e' }}
          onClick={() => { setInvoiceModalType('initial'); setShowInvoiceModal(true); }}
        >
          <Receipt size={16} /> {initialInvoice ? 'Resend Initial Invoice' : 'Send Initial Invoice'}
        </button>
      );
    }

    // 4. Audit Scheduling & Execution Stage
    if (['payment_received', 'dates_proposed', 'dates_accepted', 'date_finalized', 'audit_assigned'].includes(status)) {
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#ea580c' }}
          onClick={() => setShowAuditModal(true)}
        >
          <Calendar size={16} /> Manage Audit
        </button>
      );
    }

    // 5. Post-Audit Decision (NC vs Clean Close & NC Reply)
    if (status === 'audit_successful' || status === 'audit_completed' || status === 'nc_flagged' || status === 'on_hold') {
      return (
        <>
          <button
            className="btn btn-danger"
            style={{ gap: 8 }}
            onClick={() => setShowNcModal(true)}
            disabled={actionSubmitting}
          >
            <AlertTriangle size={16} /> Flag NC
          </button>
          <button
            className="btn btn-primary"
            style={{ gap: 8, background: '#16a34a', borderColor: '#16a34a' }}
            onClick={handleCloseNc}
            disabled={actionSubmitting}
          >
            <CheckCircle size={16} /> Close NC
          </button>
        </>
      );
    }

    // 6. LogSheet Stage (Create / Sign LogSheet) - After NC is Closed
    const isLogsheetSigned = status === 'logsheet_signed' || (logsheet && (logsheet.status === 'Signed' || logsheet.status === 'Waiting For Certificate' || logsheet.status === 'Completed'));

    if (['nc_closed', 'audit_report_submitted', 'logsheet_created', 'logsheet_sign_requested'].includes(status) || (status === 'application_successful' && !isLogsheetSigned)) {
      const isCreated = ['logsheet_created', 'logsheet_sign_requested'].includes(status) || !!logsheet;
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#0e7490' }}
          onClick={() => navigate(`/applications/${appId}/logsheet`)}
          title={isCreated ? 'Manage LogSheet' : 'Create LogSheet'}
        >
          <ClipboardList size={16} /> {isCreated ? 'Manage LogSheet' : 'Create LogSheet'}
        </button>
      );
    }

    // 7. Send Agreement Stage (Logsheet signed / application_successful -> Send Agreement)
    if (status === 'logsheet_signed' || status === 'application_successful' || status === 'agreement_sent') {
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#2563eb' }}
          onClick={() => setShowAgreementModal(true)}
        >
          <FileText size={16} /> {agreement ? 'Resend Agreement' : 'Send Agreement'}
        </button>
      );
    }

    // 8. Final Countersigned Agreement Copy (Client signed agreement -> Admin countersigns and uploads final copy)
    if (status === 'agreement_signed') {
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#0284c7' }}
          onClick={() => setShowFinalAgreementModal(true)}
        >
          <FileText size={16} /> {agreement?.final_agreement_url ? 'Resend Final Signed Copy' : 'Send Final Signed Copy'}
        </button>
      );
    }

    // 9. Final Invoice Stage (For non-renewal apps when agreement is finalized)
    if (!isRenewal && (status === 'agreement_finalised' || status === 'final_invoice_sent')) {
      if (isFinalInvoicePaid) {
        return (
          <span className="badge badge-green" style={{ padding: '8px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={15} /> ✓ Final Invoice Paid
          </span>
        );
      }
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#854d0e' }}
          onClick={() => { setInvoiceModalType('final'); setShowInvoiceModal(true); }}
        >
          <Receipt size={16} /> {finalInvoice ? 'Resend Final Invoice' : 'Send Final Invoice'}
        </button>
      );
    }

    // 10. Mark Ready for Certificate Stage
    // For non-renewal: once final invoice is paid (status === 'final_invoice_paid')
    // For renewal: once agreement is finalized (status === 'agreement_finalised')
    if ((!isRenewal && status === 'final_invoice_paid') || (isRenewal && status === 'agreement_finalised')) {
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#9333ea', borderColor: '#9333ea' }}
          onClick={handleMarkReadyForCertificate}
          disabled={actionSubmitting}
        >
          <Award size={16} /> Mark Ready for Certificate
        </button>
      );
    }

    // 11. Issue Certificate Stage
    if (status === 'ready_for_certificate') {
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#16a34a' }}
          onClick={() => setShowCertificateModal(true)}
        >
          <Award size={16} /> Issue Certificate
        </button>
      );
    }

    // 12. Certificate Issued
    if (status === 'certificate_issued') {
      return (
        <span className="badge badge-green" style={{ padding: '8px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
          <CheckCircle size={15} /> ✓ Certificate Issued
        </span>
      );
    }

    return null;
  };

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
              {app.profiles?.company_name || app.establishment_name || app.company_name || 'Company Facility'}
            </h1>
            <span className={`badge ${STATUS_BADGE[status] || 'badge-gray'}`} style={{ fontSize: 12 }}>
              {STATUS_LABELS[status] || status.replace(/_/g, ' ')}
            </span>
            {refreshing && <RefreshCw size={14} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {app.establishment_address || 'Facility'} &middot; Type: <strong>{app.application_type}</strong> &middot; Submitted {new Date(app.created_at).toLocaleDateString('en-GB')}
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
          onClick={() => setShowSubmissionModal(true)}
        >
          <ClipboardList size={15} style={{ color: 'var(--primary)' }} />
          View Application Submission
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
                ? 'Review the application details and approve, put on hold, or reject below.'
                : 'Use the actions below to proceed with the next phase of application processing.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {renderPrimaryAction()}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Processing Stages & Detail Cards */}
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Proposal Card */}
          <ProposalCard app={app} proposal={proposal} />

          {/* 1. Initial Certification Invoice Card */}
          <InvoiceCard
            app={app}
            invoice={initialInvoice}
            status={app?.status}
            isInitial={true}
            onConfirmPayment={initialInvoice?.status === 'client_paid' ? handleConfirmPayment : undefined}
            confirmingPayment={confirmingPayment}
          />

          {/* Audit Card */}
          <AuditCard app={app} audits={audits} onManage={() => setShowAuditModal(true)} />

          {/* Non-Conformity (NC) & Findings Card */}
          <NcCard
            app={app}
            audits={audits}
            status={status}
            onFlagNc={() => setShowNcModal(true)}
            onCloseNc={handleCloseNc}
            actionSubmitting={actionSubmitting}
          />

          {/* Logsheet Card (Admin Only) */}
          <LogsheetCard 
            logsheet={logsheet} 
            status={status} 
            appId={appId} 
            onMarkDone={handleMarkLogsheetDone}
            markingDone={markingLogsheetDone}
          />

          {/* Agreement Card */}
          <AgreementCard 
            app={app} 
            agreement={agreement} 
            status={status}
            onReupload={() => setShowAgreementModal(true)}
            onMarkDone={handleMarkAgreementDone}
            markingDone={markingAgreementDone}
          />

          {/* 2. Final Halal Certificate Fee Invoice Card */}
          {(finalInvoice || ['agreement_signed', 'agreement_finalised', 'final_invoice_sent', 'final_invoice_paid', 'ready_for_certificate', 'certificate_issued'].includes(status)) && (
            <InvoiceCard
              app={app}
              invoice={finalInvoice}
              status={app?.status}
              isFinal={true}
              onConfirmPayment={finalInvoice?.status === 'client_paid' ? handleConfirmFinalPayment : undefined}
              confirmingPayment={confirmingPayment}
            />
          )}
        </div>

        {/* Right Column: Sidebar info */}
        <div>
          {/* Stepper Timeline */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Processing Timeline</div>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <ProcessingTimeline status={status} statusHistory={app.statusHistory || app.status_history || []} category={app.category || ''} applicationType={app.application_type || ''} />
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
          <div className="modal" style={{ maxWidth: 560, width: '92%', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                  <CheckCircle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Accept Application</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Confirm certification scope &amp; category before proceeding</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowApproveModal(false)}><X size={18} /></button>
            </div>

            <div style={{ padding: '24px', display: 'grid', gap: 16 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 8 }}>
                  Selected Certification Category
                </label>
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

            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setShowApproveModal(false)} disabled={actionSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApprove} disabled={actionSubmitting}>
                {actionSubmitting ? 'Accepting...' : 'Confirm Acceptance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowRejectModal(false)}>
          <div className="modal" style={{ maxWidth: 560, width: '92%', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <XCircle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>Reject Application</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Specify formal rejection reasons for client review</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}><X size={18} /></button>
            </div>

            <div style={{ padding: '24px', display: 'grid', gap: 16 }}>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 8 }}>
                  Reason for Rejection *
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Provide clear reasons for rejection..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  disabled={actionSubmitting}
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setShowRejectModal(false)} disabled={actionSubmitting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={actionSubmitting || !rejectReason.trim()}>
                {actionSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
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

      <FinalAgreementModal
        isOpen={showFinalAgreementModal}
        onClose={() => setShowFinalAgreementModal(false)}
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

      {/* Flag / Review NC Modal */}
      {showNcModal && (
        <div className="modal-overlay" style={{ zIndex: 1150 }} onClick={() => setShowNcModal(false)}>
          <div className="modal" style={{ maxWidth: 700, width: '92%', maxHeight: '88vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    {app.nc_reports?.length > 0 || status === 'nc_flagged' ? 'Non-Conformity (NC) Management' : 'Flag Non-Conformity (NC)'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {app.nc_reports?.length > 0 || status === 'nc_flagged' ? 'Review client corrections, submit feedback, or close the NC to proceed.' : 'Specify audit non-conformities and attach report documents for client correction.'}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowNcModal(false)}><X size={18} /></button>
            </div>

            {/* Tab navigation if NCs already exist */}
            {(app.nc_reports?.length > 0 || status === 'nc_flagged') && (
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff', padding: '0 24px' }}>
                <button
                  type="button"
                  style={{
                    padding: '12px 18px',
                    border: 'none',
                    background: 'none',
                    borderBottom: ncModalTab === 'review' ? '2.5px solid #0284c7' : 'none',
                    color: ncModalTab === 'review' ? '#0284c7' : '#64748b',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                  onClick={() => setNcModalTab('review')}
                >
                  💬 Review &amp; Reply
                </button>
                <button
                  type="button"
                  style={{
                    padding: '12px 18px',
                    border: 'none',
                    background: 'none',
                    borderBottom: ncModalTab === 'flag_new' ? '2.5px solid #dc2626' : 'none',
                    color: ncModalTab === 'flag_new' ? '#dc2626' : '#64748b',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                  onClick={() => setNcModalTab('flag_new')}
                >
                  ⚠️ Flag Additional Finding
                </button>
              </div>
            )}

            <div style={{ padding: '24px', display: 'grid', gap: 18, flex: 1, overflowY: 'auto' }}>
              {/* If NC already exists, display existing findings and client response */}
              {app.nc_reports && app.nc_reports.length > 0 && ncModalTab === 'review' && (
                <div style={{ display: 'grid', gap: 14 }}>
                  {app.nc_reports.map((nc, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#dc2626' }}>
                          ⚠️ Flagged Observation #{idx + 1}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {nc.flagged_at ? new Date(nc.flagged_at).toLocaleDateString('en-GB') : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: 13.5, color: '#1e293b', lineHeight: 1.5, marginBottom: 8 }}>
                        {nc.text || 'Non-Conformity flagged during audit.'}
                      </div>
                      {nc.url && (
                        <div style={{ marginTop: 6 }}>
                          <a href={getPdfUrl(nc.url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fecaca', gap: 6 }}>
                            <Download size={13} /> View Flagged NC Sheet
                          </a>
                        </div>
                      )}

                      {/* Client rectification evidence */}
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #cbd5e1' }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#15803d', marginBottom: 4 }}>
                          🛠️ Client Rectification Response
                        </div>
                        {nc.client_response ? (
                          <div style={{ fontSize: 13, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', marginTop: 4 }}>
                            {nc.client_response}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
                            ⏳ Client has not yet submitted corrective explanation.
                          </div>
                        )}
                        {(nc.client_response_url || nc.correction_document_url) && (
                          <div style={{ marginTop: 8 }}>
                            <a href={getPdfUrl(nc.client_response_url || nc.correction_document_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ color: '#15803d', borderColor: '#bbf7d0', gap: 6 }}>
                              <Download size={13} /> View Client Rectification Document
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Previous Admin Reply */}
                      {nc.admin_reply && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #cbd5e1' }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#0369a1', marginBottom: 4 }}>
                            💬 Previous Admin Reply
                          </div>
                          <div style={{ fontSize: 13, color: '#075985', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 12px', marginTop: 4 }}>
                            {nc.admin_reply}
                          </div>
                          {nc.admin_reply_document_url && (
                            <div style={{ marginTop: 8 }}>
                              <a href={getPdfUrl(nc.admin_reply_document_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ color: '#0284c7', borderColor: '#bae6fd', gap: 6 }}>
                                <Download size={13} /> View Admin Reply Document
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Admin Reply Form */}
              {(app.nc_reports?.length > 0 || status === 'nc_flagged') && ncModalTab === 'review' && (
                <div style={{ background: 'white', border: '1.5px solid #bae6fd', borderRadius: 12, padding: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0369a1', marginBottom: 8 }}>
                    Reply to NC / Provide Corrective Instructions
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Enter official feedback, guidance, or verification comments for the client..."
                    value={ncReplyText}
                    onChange={e => setNcReplyText(e.target.value)}
                    disabled={replyingNc}
                  />
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                      Attach Admin Feedback Document (Optional)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg"
                      onChange={e => setNcReplyFile(e.target.files[0] || null)}
                      disabled={replyingNc}
                      style={{ fontSize: 13 }}
                    />
                    {ncReplyFile && (
                      <div style={{ fontSize: 12, color: '#0284c7', fontWeight: 600, marginTop: 4 }}>
                        Selected file: {ncReplyFile.name}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ background: '#0284c7', borderColor: '#0284c7' }}
                      onClick={handleReplyNc}
                      disabled={replyingNc || !ncReplyText.trim()}
                    >
                      {replyingNc ? 'Sending Reply...' : 'Send Admin Reply'}
                    </button>
                  </div>
                </div>
              )}

              {/* Flag New / Additional NC Form */}
              {(!app.nc_reports || app.nc_reports.length === 0 || ncModalTab === 'flag_new') && (
                <>
                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 8 }}>
                      Non-Conformity Description &amp; Required Action *
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="Specify audit findings, clause non-compliance, and instructions for client correction..."
                      value={ncText}
                      onChange={e => setNcText(e.target.value)}
                      disabled={flaggingNc}
                    />
                  </div>

                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 8 }}>
                      Upload Official NC Report Document (Optional)
                    </label>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                      Attach official audit observation sheet or NC report PDF.
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg"
                      onChange={e => setNcFile(e.target.files[0] || null)}
                      disabled={flaggingNc}
                      style={{ fontSize: 13 }}
                    />
                    {ncFile && (
                      <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 6 }}>
                        Selected file: {ncFile.name}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setShowNcModal(false)} disabled={flaggingNc || replyingNc}>Close</button>
              {(!app.nc_reports || app.nc_reports.length === 0 || ncModalTab === 'flag_new') ? (
                <button className="btn btn-danger" onClick={handleFlagNc} disabled={flaggingNc || !ncText.trim()}>
                  {flaggingNc ? 'Flagging Report...' : 'Flag NC'}
                </button>
              ) : (
                <button className="btn btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={handleCloseNc} disabled={actionSubmitting}>
                  {actionSubmitting ? 'Closing...' : 'Accept & Close NC'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Put On Hold Modal */}
      {showHoldModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowHoldModal(false)}>
          <div className="modal" style={{ maxWidth: 560, width: '92%', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <Clock size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Put Application On Hold</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Pause application processing pending client clarifications</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowHoldModal(false)}><X size={18} /></button>
            </div>

            <div style={{ padding: '24px', display: 'grid', gap: 16 }}>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 8 }}>
                  Hold Reason / Admin Note (Optional)
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="e.g. Awaiting client documentation clarification on ingredient list..."
                  value={holdReason}
                  onChange={e => setHoldReason(e.target.value)}
                  disabled={actionSubmitting}
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setShowHoldModal(false)} disabled={actionSubmitting}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#d97706', borderColor: '#d97706' }} onClick={handleHoldConfirm} disabled={actionSubmitting}>
                {actionSubmitting ? 'Updating...' : 'Confirm Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Submission Details Modal */}
      {showSubmissionModal && (
        <div className="modal-overlay" style={{ zIndex: 1150 }} onClick={() => setShowSubmissionModal(false)}>
          <div
            className="modal"
            style={{
              maxWidth: 920,
              width: '92%',
              maxHeight: '88vh',
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: "'Inter', sans-serif"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <ClipboardList size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: '#0f172a' }}>
                    Application Submission Details — {app.profiles?.company_name || app.establishment_name || app.company_name || 'Company Facility'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                    Original form responses submitted by client on {new Date(app.created_at).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowSubmissionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 6 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'grid', gap: 20 }}>
              {/* Section 1: Establishment & Manufacturing */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={15} style={{ color: '#2563eb' }} />
                  1. Establishment & Facility Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Establishment Name</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.establishment_name || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Application Type & Category</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.application_type} &middot; {app.category}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Establishment Address</div>
                    <div style={{ fontSize: 13, color: '#334155', marginTop: 2, fontWeight: 400 }}>{app.establishment_address || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Registration Number</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.reg_number || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>VAT Number</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.vat_number || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Managing Director</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.managing_director || '—'}</div>
                  </div>
                  {app.manufacturer_name && (
                    <div style={{ gridColumn: 'span 2', marginTop: 4, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Manufacturer Name & Address</div>
                      <div style={{ fontSize: 13, color: '#0f172a', marginTop: 2, fontWeight: 400 }}><strong style={{ fontWeight: 500 }}>{app.manufacturer_name}</strong> &middot; {app.manufacturer_address}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Key Personnel Contacts */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={15} style={{ color: '#2563eb' }} />
                  2. Key Personnel & Representatives
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Halal Coordinator</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.halal_coordinator || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>QA / Technical Contact</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.qa_contact || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Finance Contact</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.finance_contact || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Production Contact</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.production_contact || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Section 3: Operating Scope & Products */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} style={{ color: '#2563eb' }} />
                  3. Operating Scope & Product List
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Total Employees</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.employee_count || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Production Schedule</div>
                      <div style={{ fontSize: 13, color: '#0f172a', marginTop: 2, fontWeight: 400 }}>{app.production_schedule || '—'}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Scope of Certification</div>
                    <div style={{ fontSize: 13, color: '#0f172a', background: '#f8fafc', padding: 10, borderRadius: 8, marginTop: 4, fontWeight: 400 }}>{app.scope || '—'}</div>
                  </div>

                  {/* Submitted Products Table */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>Submitted Products List ({app.products?.length || 0})</div>
                    {!app.products || app.products.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>No products listed</div>
                    ) : (
                      <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#64748b' }}>
                              <th style={{ padding: '6px 10px', fontWeight: 500 }}>Product Name</th>
                              <th style={{ padding: '6px 10px', fontWeight: 500 }}>Brand</th>
                              <th style={{ padding: '6px 10px', fontWeight: 500 }}>Category</th>
                            </tr>
                          </thead>
                          <tbody>
                            {app.products.map((p, idx) => (
                              <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '6px 10px', fontWeight: 500 }}>{p.name}</td>
                                <td style={{ padding: '6px 10px', color: '#64748b', fontWeight: 400 }}>{p.brand || '—'}</td>
                                <td style={{ padding: '6px 10px', color: '#64748b', fontWeight: 400 }}>{p.category || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Halal Declarations */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={15} style={{ color: '#2563eb' }} />
                  4. Halal Compliance & Ingredient Declarations
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: app.has_porcine ? '#fef2f2' : '#f0fdf4', border: `1px solid ${app.has_porcine ? '#fecaca' : '#dcfce7'}`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: app.has_porcine ? '#991b1b' : '#166534' }}>Porcine Materials Handled</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: app.has_porcine ? '#dc2626' : '#15803d', marginTop: 2 }}>
                      {app.has_porcine ? 'YES — Porcine declared' : 'NO — Free of porcine'}
                    </div>
                    {app.porcine_details && <div style={{ fontSize: 11, color: '#991b1b', marginTop: 4, fontWeight: 400 }}>Details: {app.porcine_details}</div>}
                  </div>

                  <div style={{ background: app.has_intoxicants ? '#fffbeb' : '#f0fdf4', border: `1px solid ${app.has_intoxicants ? '#fde68a' : '#dcfce7'}`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: app.has_intoxicants ? '#92400e' : '#166534' }}>Intoxicants / Alcohol Handled</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: app.has_intoxicants ? '#d97706' : '#15803d', marginTop: 2 }}>
                      {app.has_intoxicants ? 'YES — Intoxicants declared' : 'NO — Free of intoxicants'}
                    </div>
                    {app.intoxicants_details && <div style={{ fontSize: 11, color: '#92400e', marginTop: 4, fontWeight: 400 }}>Details: {app.intoxicants_details}</div>}
                  </div>

                  <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: 10, borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={16} style={{ color: app.declared_true ? '#15803d' : '#94a3b8' }} />
                    <span style={{ fontWeight: 500, color: '#0f172a' }}>
                      Legal Declaration: {app.declared_true ? 'Signed & Confirmed True by Applicant' : 'Pending Signature'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 5: Uploaded Documents & Attachments */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={15} style={{ color: '#2563eb' }} />
                  5. Uploaded Documents & Attachments
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  {[
                    { key: 'halal_policy', label: 'Halal Policy Document' },
                    { key: 'ingredient_list', label: 'Raw Material / Ingredient List' },
                    { key: 'floor_plan', label: 'Plant / Facility Floor Plan' },
                    { key: 'haccp_plan', label: 'HACCP Plan & Process Flow' },
                  ].map(doc => {
                    const url = app.documents?.[doc.key];
                    return (
                      <div key={doc.key} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>{doc.label}</div>
                        {url ? (
                          <a
                            href={getPdfUrl(url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: '#2563eb',
                              borderColor: '#bfdbfe',
                              background: '#eff6ff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              width: 'fit-content',
                              textDecoration: 'none',
                              borderRadius: 6
                            }}
                          >
                            <FileText size={14} /> View Document
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Not provided</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Supporting Docs Array */}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                    Additional Supporting Attachments {Array.isArray(app.documents?.supporting_docs) && app.documents.supporting_docs.length > 0 ? `(${app.documents.supporting_docs.length})` : ''}
                  </div>
                  {Array.isArray(app.documents?.supporting_docs) && app.documents.supporting_docs.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {app.documents.supporting_docs.map((docUrl, idx) => (
                        <a
                          key={idx}
                          href={getPdfUrl(docUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#334155',
                            borderColor: '#cbd5e1',
                            background: '#white',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            textDecoration: 'none',
                            borderRadius: 6
                          }}
                        >
                          <Download size={13} /> Supporting Doc #{idx + 1}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>
                      No supporting documents provided
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right', flexShrink: 0 }}>
              <button className="btn btn-ghost" onClick={() => setShowSubmissionModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
