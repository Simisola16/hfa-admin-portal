import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, X, RefreshCw,
  Building2, FileText, User, Calendar, Shield,
  ChevronRight, AlertTriangle, ClipboardList, Download, Award, Receipt, ExternalLink, Clock,
  Lock, Package, ShieldCheck
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../../lib/pdfUtils';
import ProcessingTimeline from '../../components/ProcessingTimeline';
import { STATUS_LABELS, STATUS_BADGE } from '../../lib/applicationStatuses';
import { getSocket } from '../../lib/socket';

// Extracted Modals
import ProposalModal from '../../components/ProposalModal';
import InvoiceModal from '../../components/InvoiceModal';
import AgreementModal from '../../components/AgreementModal';
import CertificateModal from '../../components/CertificateModal';
import AuditManageModal from '../../components/AuditManageModal';
import FinalAgreementModal from '../../components/FinalAgreementModal';
import ApplicationSubmissionModal from '../../components/ApplicationSubmissionModal';

// Extracted Detail Cards
import ProposalCard from '../../components/ProposalCard';
import InvoiceCard from '../../components/InvoiceCard';
import InitialProductCard from '../../components/InitialProductCard';
import AuditCard from '../../components/AuditCard';
import NcCard from '../../components/NcCard';
import LogsheetCard from '../../components/LogsheetCard';
import AgreementCard from '../../components/AgreementCard';
import CertificateCard from '../../components/CertificateCard';

/**
 * HFANewProcessing
 * Dedicated 10-stage initial certification processing component for HFA New applications.
 * 
 * 10-Stage Lifecycle:
 * 1. Application Review & Accept (approved)
 * 2. Certification Proposal (Sent -> Client Accepted)
 * 3. Initial Certification Fee (Stage 1 Invoice -> Payment Received)
 * 4. Initial Product Technical Evaluation Gate (Specifications Approved)
 * 5. Single-Stage Facility Audit (Propose Dates -> Accept -> Finalize & Assign -> Complete)
 * 6. Non-Conformance (NC) Resolution (Flag -> Client Proof -> Admin Reply -> Close NC)
 * 7. Facility Logsheet (4 Signatures) -> Application Successful
 * 8. Certification Agreement Contract (Send -> Client Sign -> Final Countersigned Upload)
 * 9. Final Halal Certification Fee Invoice (Send -> Client Paid -> Confirm Final Payment)
 * 10. Mark Ready for Certificate -> Issue Certificate -> Committee Review -> Active Certificate Issued
 */
export default function HFANewProcessing(props) {
  const params = useParams();
  const navigate = useNavigate();
  const appId = props.appId || params.appId;

  const [app, setApp] = useState(props.app || null);
  const [loading, setLoading] = useState(!props.app);
  const [refreshing, setRefreshing] = useState(false);

  // Core records
  const [proposal, setProposal] = useState(props.proposal || null);
  const [invoice, setInvoice] = useState(props.invoice || null);
  const [allInvoices, setAllInvoices] = useState(props.allInvoices || []);
  const [agreement, setAgreement] = useState(props.agreement || null);
  const [audits, setAudits] = useState(props.audits || []);
  const [logsheet, setLogsheet] = useState(props.logsheet || null);
  const [initialProduct, setInitialProduct] = useState(props.initialProduct || null);
  const [certificate, setCertificate] = useState(props.certificate || null);

  // Modal Visibility States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceModalType, setInvoiceModalType] = useState('initial'); // 'initial' | 'final'
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showFinalAgreementModal, setShowFinalAgreementModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
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
  const [socketConnected, setSocketConnected] = useState(true);

  const fetchApp = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // 1. Ultra-fast single DB round-trip fetch
      const detailsRes = await api.get(`/api/applications/${appId}/processing-details`).catch(() => null);
      if (detailsRes?.data?.data) {
        const d = detailsRes.data.data;
        const fetchedApp = d.app;
        setApp(fetchedApp);
        setProposal(d.proposal);
        setInvoice(d.invoice);
        setAllInvoices(d.allInvoices || []);
        setAgreement(d.agreement);
        setAudits(d.audits || []);
        setLogsheet(d.logsheet);
        setInitialProduct(d.initialProduct);
        setCertificate(d.certificate);
        return;
      }

      // Fallback: parallel individual endpoints if processing-details is unavailable
      const [appRes, propRes, invRes, allInvRes, agreementRes, auditRes, logsheetRes, ipRes, certRes] = await Promise.all([
        api.get(`/api/applications/${appId}`),
        api.get(`/api/proposals/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/invoices/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/invoices/application/${appId}/all`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/agreements/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/audits/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/application-logsheets/application/${appId}`)
          .catch(() => api.get(`/api/application-logsheets?application_id=${appId}`))
          .catch(() => ({ data: null })),
        api.get(`/api/initial-products/by-application/${appId}`)
          .catch(() => api.get(`/api/initial-products?application_id=${appId}`))
          .catch(() => ({ data: null })),
        api.get(`/api/certificates/application/${appId}`).catch(() => ({ data: null }))
      ]);

      const fetchedApp = appRes.data?.data || appRes.data || null;

      let rawLogsheet = null;
      if (logsheetRes) {
        if (logsheetRes.data && !logsheetRes.data.error) {
          rawLogsheet = Array.isArray(logsheetRes.data)
            ? logsheetRes.data.find(l => l.source_type !== 'initial_product_application' && l.audit_type !== 'Initial Product Evaluation')
            : logsheetRes.data;
        } else if (Array.isArray(logsheetRes)) {
          rawLogsheet = logsheetRes.find(l => l.source_type !== 'initial_product_application' && l.audit_type !== 'Initial Product Evaluation');
        } else if (logsheetRes._id) {
          rawLogsheet = logsheetRes;
        }
      }
      if (!rawLogsheet && fetchedApp?.logsheet_id && typeof fetchedApp.logsheet_id === 'object') {
        rawLogsheet = fetchedApp.logsheet_id;
      }
      const isExternalProductLogsheet = rawLogsheet && (rawLogsheet.source_type === 'initial_product_application' || Boolean(rawLogsheet.initial_product_application_id) || rawLogsheet.source_type === 'addon_application' || Boolean(rawLogsheet.addon_application_id) || rawLogsheet.audit_type === 'Initial Product Evaluation');
      const fetchedLogsheet = isExternalProductLogsheet ? null : rawLogsheet;

      const loadedAudits = auditRes.data?.data || auditRes.data || [];
      const hasCompletedAudit = loadedAudits.some(a => ['audit_completed', 'audit_successful', 'completed'].includes(a.status));

      // Sanitize status if application was falsely jumped to application_successful or ready_for_certificate without logsheet
      const hasPostLogsheetHistory = Array.isArray(fetchedApp?.statusHistory) && fetchedApp.statusHistory.some(h => ['agreement_sent', 'agreement_signed', 'agreement_finalised', 'final_invoice_sent', 'final_invoice_paid', 'certificate_issued'].includes(h.status));
      if (fetchedApp && !fetchedLogsheet && !hasPostLogsheetHistory && ['application_successful', 'ready_for_certificate'].includes(fetchedApp.status)) {
        if (hasCompletedAudit || ['audit_successful', 'audit_completed'].includes(fetchedApp.status)) {
          const hasNcClosed = (fetchedApp.statusHistory || []).some(h => h.status === 'nc_closed');
          fetchedApp.status = hasNcClosed ? 'nc_closed' : 'audit_completed';
          if (Array.isArray(fetchedApp.statusHistory)) {
            fetchedApp.statusHistory = fetchedApp.statusHistory.filter(h => !['application_successful', 'ready_for_certificate'].includes(h.status));
          }
        }
      }

      if (fetchedApp) {
        if (fetchedLogsheet) {
          const isSigned = fetchedLogsheet.mufti_signature && fetchedLogsheet.ceo_signature && fetchedLogsheet.manager_signature && fetchedLogsheet.mufti2_signature;
          if (['audit_completed', 'audit_successful', 'nc_flagged', 'nc_closed', 'logsheet_created'].includes(fetchedApp.status)) {
            fetchedApp.status = isSigned ? 'logsheet_signed' : 'logsheet_created';
          }
        } else if (['audit_completed', 'audit_successful', 'nc_flagged'].includes(fetchedApp.status)) {
          const appNcReports = fetchedApp?.nc_reports || [];
          const auditNcReports = loadedAudits.flatMap(a => a.nc_reports || []);
          const allNc = appNcReports.length > 0 ? appNcReports : auditNcReports;
          const hasClosedAllNc = allNc.length > 0 && allNc.every(r => r.status === 'closed');
          const hasNcClosedInHistory = (fetchedApp?.statusHistory || []).some(h => h.status === 'nc_closed');
          if (hasClosedAllNc || hasNcClosedInHistory) {
            fetchedApp.status = 'nc_closed';
          }
        }
      }

      let initialProductItem = null;
      if (ipRes) {
        const rawIp = ipRes.data?.data !== undefined ? ipRes.data.data : (ipRes.data !== undefined ? ipRes.data : ipRes);
        if (rawIp && !Array.isArray(rawIp) && (rawIp._id || rawIp.id)) {
          const ipAppId = rawIp.application_id?._id || rawIp.application_id?.id || rawIp.application_id;
          if (String(ipAppId) === String(appId)) {
            initialProductItem = rawIp;
          }
        } else if (Array.isArray(rawIp)) {
          initialProductItem = rawIp.find(ip => {
            const ipAppId = ip.application_id?._id || ip.application_id?.id || ip.application_id;
            return String(ipAppId) === String(appId);
          }) || null;
        }
      }

      setApp(fetchedApp);
      setProposal(propRes.data?.data || propRes.data || null);
      setInvoice(invRes.data?.data || invRes.data || null);
      setAllInvoices(allInvRes.data?.data || allInvRes.data || []);
      setAgreement(agreementRes.data?.data || agreementRes.data || null);
      setAudits(loadedAudits);
      setLogsheet(fetchedLogsheet);
      setInitialProduct(initialProductItem);
      setCertificate(certRes?.data?.data || certRes?.data || null);
    } catch (err) {
      if (!silent) toast.error('Failed to load application details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleConnect = () => {
      setSocketConnected(true);
      socket.emit('join_application', appId);
    };
    const handleDisconnect = () => setSocketConnected(false);
    const handleConnectError = () => setSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    setSocketConnected(socket.connected);

    socket.emit('join_application', appId);

    const handleUpdate = (data) => {
      if (String(data?.appId) === String(appId) || String(data?.id) === String(appId)) {
        // INSTANT zero-latency local state sync
        if (data.status) {
          setApp(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              status: data.status,
              statusHistory: data.statusHistory || prev.statusHistory
            };
          });
        }
        fetchApp(true);
      }
    };

    socket.on('application_updated', handleUpdate);

    // Fast liveness background refresh (every 5 seconds when window is focused)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchApp(true);
      }
    }, 5000);

    return () => {
      socket.emit('leave_application', appId);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('application_updated', handleUpdate);
      clearInterval(interval);
    };
  }, [appId, fetchApp]);

  const handleApprove = async () => {
    setActionSubmitting(true);
    try {
      const categoryToSet = approveCategory || app.category;
      const res = await api.put(`/api/applications/${appId}/approve`, {
        category: categoryToSet
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

  const handleConfirmPayment = async () => {
    setConfirmingPayment(true);
    try {
      const activeInv = initialInvoice || invoice || allInvoices.find(i => i.status === 'client_paid') || allInvoices[0];
      await api.post(`/api/invoices/confirm-payment`, {
        application_id: appId,
        invoice_id: activeInv?._id || activeInv?.id
      });
      toast.success('Initial Payment confirmed! Client and Admin notified.');
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
      const targetInvoice = finalInvoice || allInvoices.find(inv => inv.invoice_type === 'final' || inv.stage === 'final') || invoice || allInvoices.find(i => i.status === 'client_paid');
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

  const handleMarkAuditCompleted = async () => {
    setActionSubmitting(true);
    try {
      const activeAudit = audits?.[0];
      await api.post('/api/audits/complete-clean', {
        audit_id: activeAudit?._id || activeAudit?.id,
        application_id: appId
      });
      toast.success('Audit session marked as completed successfully!');
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to complete audit');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleMarkLogsheetDone = async () => {
    const logsheetId = logsheet?._id || logsheet?.id;
    if (!logsheetId) {
      toast.error('No logsheet record found for this application.');
      return;
    }
    const certType = logsheet?.certificate_type || logsheet?.suggested_certificate_type || logsheet?.certificate_standard || '';
    setMarkingLogsheetDone(true);
    try {
      await api.put(`/api/application-logsheets/${logsheetId}/status`, {
        status: 'Signed',
        force: true,
        certificate_type: certType,
        suggested_certificate_type: certType,
      });
      toast.success('Application marked Successful! Agreement stage unlocked.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to mark application as successful.');
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
      toast.success('Certification Agreement marked as Done! Final Invoice unlocked.');
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

  const handleFlagNc = async () => {
    if (!ncText.trim()) {
      toast.error('Please enter Non-Conformity details.');
      return;
    }
    const targetAudit = audits?.[0] || null;
    const auditId = targetAudit?._id || targetAudit?.id;
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
      toast.error(err.response?.data?.error || err.message || 'Failed to flag NC report.');
    } finally {
      setFlaggingNc(false);
    }
  };

  const handleReplyNc = async () => {
    if (!ncReplyText.trim()) {
      toast.error('Please enter your reply comments or instructions.');
      return;
    }
    const auditObj = audits?.[0];
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
      const auditObj = audits?.[0];
      const auditId = auditObj?._id || auditObj?.id;

      const res = await api.post('/api/audits/nc-close', { audit_id: auditId, application_id: appId }).catch(() => {});
      const nextStatus = res?.data?.data?.status || res?.data?.application_status || 'nc_closed';

      setApp(prev => ({ ...prev, status: nextStatus }));
      toast.success('NC Closed successfully! You can now create the Facility LogSheet.');
      setShowNcModal(false);
      await fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to close NC.');
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

  const rawStatus = (app.status || 'submitted').toLowerCase().replace(/ /g, '_');
  const status = rawStatus === 'payment_received' ? 'initial_product' : rawStatus;
  const auditsArr = Array.isArray(audits) ? audits : (audits?.data || []);
  const activeAudit = auditsArr[0] || null;
  const appNcList = Array.isArray(app.nc_reports) ? app.nc_reports : [];
  const auditNcList = auditsArr.flatMap(a => Array.isArray(a.nc_reports) ? a.nc_reports : []);
  const allNcs = [...appNcList, ...auditNcList];
  const hasOpenNc = allNcs.some(nc => ['flagged', 'client_responded', 'admin_replied'].includes(nc.status) || (nc.status && nc.status !== 'closed'));
  const hasLegacyActiveNc = auditsArr.some(a => Boolean(a.nc_text && !a.nc_closed));
  const hasActiveNc = status === 'nc_flagged' || hasOpenNc || hasLegacyActiveNc;
  const isNcClosed = !hasActiveNc && Boolean(
    status === 'nc_closed' ||
    (allNcs.length > 0 && allNcs.every(nc => nc.status === 'closed')) ||
    auditsArr.some(a => Boolean(a.nc_closed)) ||
    (app.statusHistory || []).some(h => h.status === 'nc_closed') ||
    ['logsheet_created', 'logsheet_signed', 'application_successful', 'agreement_sent', 'agreement_signed', 'agreement_finalised', 'final_invoice_sent', 'final_invoice_paid', 'ready_for_certificate', 'certificate_issued'].includes(status)
  );

  const initialInvoice =
    allInvoices.find(inv => inv.invoice_type === 'initial' || inv.stage === 'initial') ||
    allInvoices.find(inv => inv.invoice_type !== 'final' && inv.stage !== 'final') ||
    (invoice && invoice.invoice_type !== 'final' ? invoice : null) ||
    (allInvoices.length > 0 && allInvoices[0].invoice_type !== 'final' ? allInvoices[0] : null);
  const finalInvoice =
    allInvoices.find(inv => inv.invoice_type === 'final' || inv.stage === 'final' || inv.target_status === 'final_invoice_sent') ||
    (invoice && invoice.invoice_type === 'final' ? invoice : null);
  const isFinalInvoicePaid = (finalInvoice && (finalInvoice.status === 'paid' || finalInvoice.status === 'confirmed' || finalInvoice.status === 'payment_received')) || status === 'final_invoice_paid';
  const isInitialProductApproved = Boolean(status === 'initial_product_approved' || (initialProduct && initialProduct.status === 'initial_product_approved') || app?.is_initial_product_approved);
  const canCompleteAudit = status === 'audit_assigned' || activeAudit?.status === 'auditors_assigned' || (activeAudit?.status === 'date_finalized' && activeAudit?.auditors?.length > 0);

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
    if (status === 'proposal_approved' || status === 'proposal_accepted' || status === 'invoice_sent') {
      if (initialInvoice?.status === 'client_paid' || invoice?.status === 'client_paid' || (allInvoices.length > 0 && allInvoices[0].status === 'client_paid')) {
        return (
          <button
            className="btn btn-primary"
            style={{ gap: 8, background: '#16a34a', borderColor: '#16a34a' }}
            onClick={handleConfirmPayment}
            disabled={confirmingPayment}
          >
            <ShieldCheck size={16} /> {confirmingPayment ? 'Confirming...' : 'Confirm Payment'}
          </button>
        );
      }
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
    if (['payment_received', 'initial_product', 'initial_product_approved', 'dates_proposed', 'dates_rejected', 'dates_accepted', 'date_finalized', 'audit_assigned'].includes(status)) {
      if (!isInitialProductApproved) {
        if (!initialProduct) {
          return (
            <button
              type="button"
              className="btn btn-outline"
              disabled
              style={{
                gap: 8,
                opacity: 0.65,
                cursor: 'not-allowed',
                background: '#f8fafc',
                borderColor: '#cbd5e1',
                color: '#64748b',
                fontWeight: 700
              }}
              title="Awaiting client to submit an Initial Product. Facility audit cannot be scheduled until Initial Product is approved."
            >
              <Lock size={15} /> Awaiting Initial Product Submission
            </button>
          );
        }
        return (
          <button
            type="button"
            className="btn btn-outline"
            disabled
            style={{
              gap: 8,
              opacity: 0.85,
              cursor: 'not-allowed',
              background: '#fefce8',
              borderColor: '#fde047',
              color: '#854d0e',
              fontWeight: 700
            }}
            title={`Initial Product "${initialProduct.product?.name || 'Product'}" is currently under review (${(initialProduct.status || '').replace(/_/g, ' ')}). It must be approved before facility audit can be scheduled.`}
          >
            <Clock size={15} /> Initial Product Review in Progress
          </button>
        );
      }

      if (canCompleteAudit) {
        return (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost"
              style={{ gap: 8, border: '1.5px solid #cbd5e1', background: 'white', color: 'var(--text-primary)', fontWeight: 700 }}
              onClick={() => setShowAuditModal(true)}
            >
              <Calendar size={16} /> Manage Audit
            </button>
            <button
              className="btn btn-primary"
              style={{ gap: 8, background: '#16a34a', borderColor: '#16a34a' }}
              onClick={handleMarkAuditCompleted}
              disabled={actionSubmitting}
            >
              <CheckCircle size={16} /> {actionSubmitting ? 'Completing...' : 'Mark Audit Completed'}
            </button>
          </div>
        );
      }

      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: status === 'dates_rejected' ? '#dc2626' : '#ea580c', borderColor: status === 'dates_rejected' ? '#b91c1c' : undefined }}
          onClick={() => setShowAuditModal(true)}
        >
          <Calendar size={16} /> {status === 'dates_rejected' ? 'Propose New Audit Dates' : (audits && audits.length > 0 ? 'Manage Audit' : 'Schedule Audit')}
        </button>
      );
    }

    // 5. Post-Audit Decision (NC Resolution)
    if (!isNcClosed && (status === 'nc_flagged' || hasActiveNc || status === 'audit_successful' || status === 'audit_completed' || status === 'on_hold')) {
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

    // 6. LogSheet Stage (Create / Sign LogSheet)
    const isLogsheetSigned = status === 'logsheet_signed' || (logsheet && (logsheet.status === 'Signed' || logsheet.status === 'Waiting For Certificate' || logsheet.status === 'Completed'));

    if (!hasActiveNc && !isLogsheetSigned && (['nc_closed', 'audit_report_submitted', 'logsheet_created', 'logsheet_sign_requested'].includes(status) || isNcClosed)) {
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

    if (status === 'logsheet_signed') {
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#16a34a', borderColor: '#16a34a' }}
          onClick={handleMarkLogsheetDone}
          disabled={markingLogsheetDone}
        >
          <CheckCircle size={16} /> {markingLogsheetDone ? 'Confirming...' : 'Application Successful'}
        </button>
      );
    }

    // 7. Send Agreement Stage
    if (status === 'application_successful' || status === 'agreement_sent') {
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

    // 8. Final Countersigned Agreement Copy
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

    // 9. Final Invoice Stage
    if (status === 'agreement_finalised' || status === 'final_invoice_sent') {
      if (finalInvoice?.status === 'client_paid') {
        return (
          <button
            className="btn btn-primary"
            style={{ gap: 8, background: '#16a34a', borderColor: '#16a34a' }}
            onClick={handleConfirmFinalPayment}
            disabled={confirmingPayment}
          >
            <ShieldCheck size={16} /> {confirmingPayment ? 'Confirming...' : 'Confirm Payment'}
          </button>
        );
      }
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
    if (status === 'final_invoice_paid' || status === 'agreement_finalised') {
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
    if (status === 'ready_for_certificate' || status === 'waiting_for_certificate' || (certificate && status !== 'certificate_issued')) {
      const certId = certificate?._id || certificate?.id || (typeof app?.certificate_id === 'object' ? app?.certificate_id?._id : app?.certificate_id);
      const isUnderReview = certificate && (certificate.status === 'under_review' || certificate.status === 'draft');

      if (isUnderReview && certId) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={{ gap: 8, background: '#0284c7', borderColor: '#0284c7' }}
              onClick={() => navigate(`/certificates/${certId}/review`)}
            >
              <FileText size={16} /> Open Review Certificate
            </button>
            <span style={{ fontSize: 12, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} /> Under Committee Review ({certificate.certificate_number})
            </span>
          </div>
        );
      }

      if (status === 'certificate_issued' || certificate?.status === 'active') {
        return (
          <span className="badge badge-green" style={{ padding: '8px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
            <CheckCircle size={15} /> ✓ Certificate Issued
          </span>
        );
      }

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            style={{ gap: 8, background: '#16a34a', borderColor: '#15803d' }}
            onClick={() => setShowCertificateModal(true)}
          >
            <Award size={16} /> Issue Certificate
          </button>
        </div>
      );
    }

    // 12. Certificate Issued
    if (status === 'certificate_issued' || certificate?.status === 'active') {
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
            HFA Initial Certification Processing
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {app.profiles?.company_name || app.client_id?.company_name || app.client?.company_name || (app.company_name && app.company_name !== app.establishment_name ? app.company_name : '') || app.establishment_name || 'Company Facility'}
            </h1>
            <span className={`badge ${STATUS_BADGE[status] || 'badge-gray'}`} style={{ fontSize: 12 }}>
              {STATUS_LABELS[status] || status.replace(/_/g, ' ')}
            </span>
            {refreshing && <RefreshCw size={14} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {app.establishment_address || 'Facility'} &middot; Type: <strong>{app.application_type || 'Initial'}</strong> &middot; Submitted {new Date(app.created_at).toLocaleDateString('en-GB')}
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
        {renderPrimaryAction()}
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

      {/* Dates Rejected Alert Banner */}
      {status === 'dates_rejected' && (
        <div style={{
          background: '#fef2f2',
          border: '1.5px solid #fca5a5',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 280 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#991b1b' }}>
                Client Unavailable — Proposed Dates Declined
              </div>
              <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 3 }}>
                The client was unable to accept the proposed audit dates and submitted availability remarks.
              </div>
              {(app?.client_audit_availability_note || audits?.find(a => a.client_availability_note)?.client_availability_note) && (
                <div style={{ marginTop: 8, background: '#ffffff', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700 }}>Client Remarks / Alternative Dates: </span>
                  <em>"{app?.client_audit_availability_note || audits?.find(a => a.client_availability_note)?.client_availability_note}"</em>
                </div>
              )}
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ gap: 8, background: '#dc2626', borderColor: '#dc2626', alignSelf: 'center' }}
            onClick={() => setShowAuditModal(true)}
          >
            <Calendar size={15} /> Propose New Dates
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="processing-layout-grid" style={{ gap: 24, alignItems: 'start' }}>
        {/* Left Column: 10-Stage Detail Cards */}
        <div style={{ display: 'grid', gap: 20 }}>
          {/* 1. Proposal Card */}
          <ProposalCard
            app={app}
            proposal={proposal}
            status={status}
            onSendProposal={() => setShowProposalModal(true)}
          />

          {/* 2. Initial Invoice Card */}
          <InvoiceCard
            app={app}
            invoice={initialInvoice}
            status={app?.status}
            isInitial={true}
            onConfirmPayment={initialInvoice?.status === 'client_paid' ? handleConfirmPayment : undefined}
            confirmingPayment={confirmingPayment}
            onSendInvoice={() => { setInvoiceModalType('initial'); setShowInvoiceModal(true); }}
          />

          {/* 3. Initial Product Gate Card */}
          <InitialProductCard
            app={app}
            initialProduct={initialProduct}
            isFastTrack={false}
          />

          {/* 4. Single-Stage Facility Audit Card */}
          <AuditCard 
            app={app} 
            audits={audits} 
            status={status}
            initialProduct={initialProduct}
            isInitialProductApproved={isInitialProductApproved}
            isFastTrack={false}
            onManage={!isInitialProductApproved ? undefined : () => setShowAuditModal(true)} 
          />

          {/* 5. Non-Conformity (NC) & Findings Card */}
          <NcCard
            app={app}
            audits={audits}
            status={status}
            onFlagNc={() => setShowNcModal(true)}
            onCloseNc={handleCloseNc}
            actionSubmitting={actionSubmitting}
          />

          {/* 6. Facility Logsheet Card */}
          <LogsheetCard 
            logsheet={logsheet} 
            status={status} 
            appId={appId} 
            isRenewal={false}
            hasActiveNc={hasActiveNc}
            isNcClosed={isNcClosed}
            onMarkDone={handleMarkLogsheetDone}
            markingDone={markingLogsheetDone}
          />

          {/* 7. Certification Agreement Card */}
          <AgreementCard 
            app={app} 
            agreement={agreement} 
            status={status}
            onReupload={() => setShowAgreementModal(true)}
            onSendFinal={() => setShowFinalAgreementModal(true)}
            onMarkDone={handleMarkAgreementDone}
            markingDone={markingAgreementDone}
          />

          {/* 8. Final Invoice Card — only visible after admin sends the final countersigned agreement copy */}
          {(finalInvoice || ['agreement_finalised', 'final_invoice_sent', 'final_invoice_paid', 'ready_for_certificate', 'certificate_issued'].includes(status)) && (
            <InvoiceCard
              app={app}
              invoice={finalInvoice}
              status={app?.status}
              isFinal={true}
              onConfirmPayment={finalInvoice?.status === 'client_paid' ? handleConfirmFinalPayment : undefined}
              confirmingPayment={confirmingPayment}
              onSendInvoice={() => { setInvoiceModalType('final'); setShowInvoiceModal(true); }}
            />
          )}

          {/* 9. Certificate Card */}
          <CertificateCard
            app={app}
            certificate={certificate}
            status={status}
            onIssueCertificate={() => setShowCertificateModal(true)}
          />
        </div>

        {/* Right Column: Sidebar info */}
        <div>
          {/* Stepper Timeline */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Initial Processing Timeline</div>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <ProcessingTimeline
                status={status}
                statusHistory={app.statusHistory || app.status_history || []}
                category={app.category || ''}
                applicationType="initial"
                initialProduct={initialProduct}
                appId={appId}
                audits={audits}
                app={app}
              />
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
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {app.profiles?.company_name || app.client_id?.company_name || app.client?.company_name || (app.company_name && app.company_name !== (app.site_name || app.establishment_name) ? app.company_name : '') || app.profiles?.full_name || app.client_id?.full_name || app.establishment_name || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Site / Facility</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {app.site_name || app.establishment_name || 'Main Facility / Site'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Certification Type</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{app.application_type || 'Initial Certification'}</div>
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
                    onClick={() => setShowSubmissionModal(true)}
                  >
                    <Building2 size={15} style={{ color: 'var(--primary)' }} />
                    View Full Application Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accept Modal */}
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
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Confirm certification category before proceeding</div>
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
                  <option value="Annual Certification – Cosmetics and Personal Care">Annual Certification – Cosmetics and Personal Care</option>
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
              <button className="btn btn-danger" onClick={() => !rejectReason.trim() ? toast.error('Please provide a rejection reason') : handleReject()} disabled={actionSubmitting}>
                {actionSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
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

      {/* Modals */}
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
        invoice={invoiceModalType === 'final' ? finalInvoice : initialInvoice}
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
        logsheet={logsheet}
        onSuccess={() => fetchApp(true)}
      />

      {/* NC Management Modal */}
      {showNcModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowNcModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    {hasActiveNc ? '⚠️ Review & Manage Non-Conformity (NC)' : 'Flag Non-Conformity (NC)'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {hasActiveNc ? 'Review client resolution documents, reply, or close the NC' : 'Specify audit issues requiring client corrective action before approval'}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowNcModal(false)}><X size={18} /></button>
            </div>

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
                      disabled={replyingNc}
                    >
                      {replyingNc ? 'Sending Reply...' : 'Send Admin Reply'}
                    </button>
                  </div>
                </div>
              )}

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
                <button className="btn btn-danger" onClick={handleFlagNc} disabled={flaggingNc}>
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

      {/* Submission Modal */}
      <ApplicationSubmissionModal
        isOpen={showSubmissionModal}
        onClose={() => setShowSubmissionModal(false)}
        app={app}
      />
    </div>
  );
}
