import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, X, RefreshCw,
  Building2, FileText, Calendar, AlertTriangle,
  ClipboardList, Download, Receipt, Clock, Award, ShieldCheck
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../../lib/pdfUtils';
import ProcessingTimeline from '../../components/ProcessingTimeline';
import { STATUS_LABELS, STATUS_BADGE } from '../../lib/applicationStatuses';
import { getSocket } from '../../lib/socket';

// Shared Modals
import InvoiceModal from '../../components/InvoiceModal';
import CertificateModal from '../../components/CertificateModal';
import AuditManageModal from '../../components/AuditManageModal';
import ApplicationSubmissionModal from '../../components/ApplicationSubmissionModal';
import ApplicationSuccessfulModal from '../../components/ApplicationSuccessfulModal';

// Shared Detail Cards
import InvoiceCard from '../../components/InvoiceCard';
import AuditCard from '../../components/AuditCard';
import NcCard from '../../components/NcCard';
import LogsheetCard from '../../components/LogsheetCard';
import CertificateCard from '../../components/CertificateCard';

export default function GSORenewalProcessing({ appId: propAppId, initialData }) {
  const routeParams = useParams();
  const appId = propAppId || routeParams.appId;
  const navigate = useNavigate();

  const [app, setApp] = useState(initialData?.app || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core records
  const [invoice, setInvoice] = useState(initialData?.invoice || null);
  const [allInvoices, setAllInvoices] = useState(initialData?.allInvoices || []);
  const [audits, setAudits] = useState(initialData?.audits || []);
  const [logsheet, setLogsheet] = useState(initialData?.logsheet || null);
  const [certificate, setCertificate] = useState(initialData?.certificate || null);

  // Modal Visibility States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showApplicationSuccessfulModal, setShowApplicationSuccessfulModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showNcModal, setShowNcModal] = useState(false);
  const [ncModalTab, setNcModalTab] = useState('review'); // 'review' | 'flag_new'

  // Inline forms/submission states
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
  const [markingReadyForCert, setMarkingReadyForCert] = useState(false);

  const fetchApp = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [appRes, invRes, allInvRes, auditRes, logsheetRes, certRes] = await Promise.all([
        api.get(`/api/applications/${appId}`),
        api.get(`/api/invoices/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/invoices/application/${appId}/all`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/audits/application/${appId}`).catch(() => ({ data: null })),
        api.get(`/api/application-logsheets/application/${appId}`)
          .catch(() => api.get(`/api/application-logsheets?application_id=${appId}`))
          .catch(() => ({ data: null })),
        api.get(`/api/certificates/application/${appId}`)
          .catch(() => ({ data: null }))
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

      if (fetchedApp) {
        if (fetchedLogsheet) {
          const isSigned = fetchedLogsheet.mufti_signature && fetchedLogsheet.ceo_signature && fetchedLogsheet.manager_signature && fetchedLogsheet.mufti2_signature;
          if (['audit_completed', 'audit_successful', 'nc_flagged', 'nc_closed', 'logsheet_created'].includes(fetchedApp.status)) {
            fetchedApp.status = isSigned ? 'logsheet_signed' : 'logsheet_created';
          }
        } else if (fetchedApp.status === 'nc_flagged') {
          const appNcReports = fetchedApp?.nc_reports || [];
          const auditNcReports = loadedAudits.flatMap(a => a.nc_reports || []);
          const allNc = appNcReports.length > 0 ? appNcReports : auditNcReports;
          const hasClosedAllNc = allNc.length > 0 && allNc.every(r => r.status === 'closed');
          const hasNcClosedInHistory = (fetchedApp?.statusHistory || []).some(h => h.status === 'nc_closed');
          if (hasClosedAllNc || hasNcClosedInHistory) {
            fetchedApp.status = 'nc_closed';
          }
        } else if (hasCompletedAudit && ['dates_proposed', 'dates_rejected', 'dates_accepted', 'date_finalized', 'audit_assigned'].includes(fetchedApp.status)) {
          const hasNcClosedInHistory = (fetchedApp?.statusHistory || []).some(h => h.status === 'nc_closed');
          fetchedApp.status = hasNcClosedInHistory ? 'nc_closed' : 'audit_completed';
        }
      }

      const rawInvoice = invRes?.data?.data !== undefined ? invRes.data.data : (invRes?.data || null);
      const rawAllInvoices = allInvRes?.data?.data || (Array.isArray(allInvRes?.data) ? allInvRes.data : []) || [];
      const effectiveAllInvoices = rawAllInvoices.length > 0
        ? rawAllInvoices
        : (rawInvoice ? [rawInvoice] : []);

      setApp(fetchedApp);
      setInvoice(rawInvoice);
      setAllInvoices(effectiveAllInvoices);
      setAudits(loadedAudits);
      setLogsheet(fetchedLogsheet);
      setCertificate(certRes?.data?.data || certRes?.data || null);
    } catch (err) {
      if (!silent) toast.error('Failed to load GSO Renewal details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appId]);

  useEffect(() => {
    if (initialData) {
      if (initialData.app) setApp(initialData.app);
      if (initialData.invoice !== undefined) setInvoice(initialData.invoice);
      if (initialData.allInvoices !== undefined) setAllInvoices(initialData.allInvoices || []);
      if (initialData.audits !== undefined) setAudits(initialData.audits || []);
      if (initialData.logsheet !== undefined) setLogsheet(initialData.logsheet);
      if (initialData.certificate !== undefined) setCertificate(initialData.certificate);
    }
  }, [initialData]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;
    const handleUpdate = (data) => {
      if (data?.appId === appId || data?.id === appId) {
        fetchApp(true);
      }
    };
    socket.on('application_updated', handleUpdate);
    return () => socket.off('application_updated', handleUpdate);
  }, [appId, fetchApp]);

  if (loading || !app) {
    return (
      <div className="loading-spinner">
        <RefreshCw size={24} className="animate-spin" />
        <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 14 }}>Loading GSO Renewal Application...</p>
      </div>
    );
  }

  const status = (app.status || 'submitted').toLowerCase().replace(/ /g, '_');
  const auditsArr = Array.isArray(audits) ? audits : (audits?.data || []);
  const activeAudit = auditsArr[0] || null;
  const isAuditReady = status === 'audit_assigned' || status === 'nc_flagged' || (activeAudit && (activeAudit.status === 'auditors_assigned' || activeAudit.status === 'audit_assigned' || (activeAudit.status === 'date_finalized' && activeAudit.auditors?.length > 0)));

  const appNcList = Array.isArray(app.nc_reports) ? app.nc_reports : [];
  const auditNcList = auditsArr.flatMap(a => Array.isArray(a.nc_reports) ? a.nc_reports : []);
  const allNcs = [...appNcList, ...auditNcList];
  const hasOpenNc = allNcs.some(nc => ['flagged', 'client_responded', 'admin_replied'].includes(nc.status) || (nc.status && nc.status !== 'closed'));
  const hasLegacyActiveNc = auditsArr.some(a => Boolean(a.nc_text && !a.nc_closed));
  const hasActiveNc = status === 'nc_flagged' || hasOpenNc || hasLegacyActiveNc;
  const isNcClosed = status === 'nc_closed' || (!hasActiveNc && (
    (allNcs.length > 0 && allNcs.every(nc => nc.status === 'closed')) ||
    auditsArr.some(a => Boolean(a.nc_closed)) ||
    (app.statusHistory || []).some(h => h.status === 'nc_closed')
  ));

  // Audit is completed when marked completed, nc is flagged/closed, or downstream stages reached
  const isAuditCompleted = Boolean(
    status === 'audit_completed' ||
    status === 'audit_successful' ||
    status === 'nc_flagged' ||
    status === 'nc_closed' ||
    isNcClosed ||
    ['logsheet_created', 'logsheet_signed', 'application_successful', 'ready_for_certificate', 'certificate_issued', 'invoice_sent', 'payment_received'].includes(status) ||
    (activeAudit && ['audit_completed', 'audit_successful', 'completed'].includes(activeAudit.status)) ||
    auditsArr.some(a => ['audit_completed', 'audit_successful', 'completed'].includes(a.status))
  );

  // Auditor is assigned if auditors array has elements, or status is audit_assigned / auditors_assigned / nc_flagged / nc_closed
  const hasAuditorAssigned = Boolean(
    status === 'audit_assigned' ||
    status === 'auditors_assigned' ||
    isAuditCompleted ||
    (activeAudit && (
      (Array.isArray(activeAudit.auditors) && activeAudit.auditors.length > 0) ||
      ['auditors_assigned', 'audit_assigned', 'audit_completed', 'audit_successful', 'completed'].includes(activeAudit.status)
    )) ||
    auditsArr.some(a => (Array.isArray(a.auditors) && a.auditors.length > 0) || ['auditors_assigned', 'audit_assigned', 'audit_completed', 'audit_successful', 'completed'].includes(a.status))
  );

  const renewalInvoice =
    allInvoices.find(inv => inv.invoice_type === 'renewal' || inv.stage === 'renewal' || (inv.title && inv.title.toLowerCase().includes('renewal'))) ||
    null;
  const isRenewalInvoicePaid = renewalInvoice ? (renewalInvoice.status === 'paid') : (status === 'payment_received');

  const handleApprove = async () => {
    setActionSubmitting(true);
    try {
      const res = await api.put(`/api/applications/${appId}/approve`, {
        category: 'UAE/GSO Approved Halal Certification For Exporters To UAE'
      });
      setApp(res.data?.data || res.data || { ...app, status: 'approved' });
      setShowApproveModal(false);
      toast.success('GSO Renewal Application accepted!');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to accept renewal application.');
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
      const res = await api.put(`/api/applications/${appId}/reject`, { reason: rejectReason.trim() });
      setApp(res.data?.data || res.data || { ...app, status: 'rejected' });
      setShowRejectModal(false);
      setRejectReason('');
      toast.success('Renewal application rejected.');
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
        status: 'on_hold',
        note: holdReason || 'Application placed on hold pending client clarification'
      });
      setShowHoldModal(false);
      toast.success('Application placed on hold.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to place on hold');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    setConfirmingPayment(true);
    try {
      const activeInv = invoice || renewalInvoice;
      await api.post(`/api/invoices/confirm-payment`, {
        application_id: appId,
        invoice_id: activeInv?._id || activeInv?.id
      });
      toast.success('Renewal payment confirmed!');
      fetchApp(true);
    } catch (err) {
      toast.error(err.message || 'Failed to confirm renewal payment.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleFlagNc = async () => {
    if (!ncText.trim()) {
      toast.error('Please enter non-conformance details.');
      return;
    }
    setFlaggingNc(true);
    const auditId = audits?.[0]?._id || audits?.[0]?.id;
    setFlaggingNc(true);
    try {
      const formData = new FormData();
      if (auditId) formData.append('audit_id', auditId);
      formData.append('application_id', appId);
      formData.append('text', ncText.trim());
      if (ncFile) formData.append('nc_document', ncFile);

      await api.post('/api/audits/flag-nc', formData, true);
      toast.success('Non-Conformance flagged successfully! Client has been notified.');
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
    if (!ncReplyText.trim()) return;
    const auditObj = audits?.[0] || audits?.data?.[0];
    const auditId = auditObj?._id || auditObj?.id;
    setReplyingNc(true);
    try {
      const formData = new FormData();
      if (auditId) formData.append('audit_id', auditId);
      formData.append('application_id', appId);
      formData.append('reply_text', ncReplyText.trim());
      if (ncReplyFile) formData.append('reply_document', ncReplyFile);

      await api.post('/api/audits/nc-reply', formData, true);
      toast.success('NC remark sent to client.');
      setNcReplyText('');
      setNcReplyFile(null);
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to reply to NC');
    } finally {
      setReplyingNc(false);
    }
  };

  const handleCloseNc = async () => {
    setActionSubmitting(true);
    try {
      const activeAuditItem = audits?.[0] || audits?.data?.[0];
      const auditId = activeAuditItem?._id || activeAuditItem?.id;
      const res = await api.post('/api/audits/nc-close', { audit_id: auditId, application_id: appId });
      const nextStatus = res?.data?.data?.status || res?.data?.application_status || 'nc_closed';
      setApp(prev => ({
        ...prev,
        status: nextStatus,
        nc_closed: true,
        nc_reports: (prev?.nc_reports || []).map(r => ({ ...r, status: 'closed' })),
        statusHistory: [...(prev?.statusHistory || []), { status: 'nc_closed', changedAt: new Date() }]
      }));
      setAudits(prev => Array.isArray(prev) ? prev.map(a => ({
        ...a,
        nc_closed: true,
        nc_reports: (a.nc_reports || []).map(r => ({ ...r, status: 'closed' }))
      })) : prev);
      toast.success('NC Closed successfully!');
      setShowNcModal(false);
      await fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to close NC.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleMarkLogsheetDone = () => {
    setShowApplicationSuccessfulModal(true);
  };

  const handleConfirmApplicationSuccessful = async (selectedCertType) => {
    const logsheetId = logsheet?._id || logsheet?.id;
    if (!logsheetId) {
      toast.error('No logsheet record found.');
      return;
    }
    setMarkingLogsheetDone(true);
    try {
      await api.put(`/api/application-logsheets/${logsheetId}/status`, {
        status: 'Signed',
        force: true,
        certificate_type: selectedCertType,
      });
      setApp(prev => ({
        ...prev,
        status: 'application_successful',
        certificate_type: selectedCertType,
        scheme: selectedCertType,
        statusHistory: [...(prev?.statusHistory || []), { status: 'application_successful', changedAt: new Date() }]
      }));
      setLogsheet(prev => ({ ...prev, status: 'Signed', certificate_standard: selectedCertType }));
      toast.success(`Renewal logsheet marked Done with ${selectedCertType}! Application moved to Application Successful.`);
      setShowApplicationSuccessfulModal(false);
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to mark logsheet as done.');
    } finally {
      setMarkingLogsheetDone(false);
    }
  };

  const handleMarkReadyForCertificate = async () => {
    setMarkingReadyForCert(true);
    try {
      await api.put(`/api/applications/${appId}/ready-for-certificate`, {
        note: 'Renewal invoice payment confirmed. Application and LogSheet marked Ready for Certificate issuance.'
      });
      setApp(prev => ({
        ...prev,
        status: 'ready_for_certificate',
        statusHistory: [...(prev?.statusHistory || []), { status: 'ready_for_certificate', changedAt: new Date() }]
      }));
      if (logsheet) {
        setLogsheet(prev => ({ ...prev, status: 'Waiting For Certificate' }));
      }
      toast.success('Application and LogSheet marked Ready for Certificate! You can now issue the Certificate.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to mark ready for certificate.');
    } finally {
      setMarkingReadyForCert(false);
    }
  };

  const handleMarkAuditCompleted = async () => {
    if (hasActiveNc) {
      toast.error('Cannot mark audit as completed while there are open Non-Conformities (NC). Please resolve or close all NCs first.');
      return;
    }
    setActionSubmitting(true);
    try {
      const activeAuditItem = audits?.[0] || audits?.data?.[0];
      await api.post('/api/audits/complete-clean', {
        audit_id: activeAuditItem?._id || activeAuditItem?.id,
        application_id: appId
      });
      setApp(prev => ({
        ...prev,
        status: 'audit_completed',
        statusHistory: [...(prev?.statusHistory || []), { status: 'audit_completed', changedAt: new Date() }]
      }));
      setAudits(prev => Array.isArray(prev) ? prev.map(a => ({
        ...a,
        status: 'audit_completed'
      })) : prev);
      toast.success('Renewal audit session marked as completed successfully! You can now Flag NC or Close NC.');
      fetchApp(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to complete renewal audit');
    } finally {
      setActionSubmitting(false);
    }
  };

  const renderPrimaryAction = () => {
    // 1. Initial Review
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

    // 6. Complete
    if (status === 'certificate_issued') {
      return (
        <span className="badge badge-green" style={{ padding: '8px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
          <CheckCircle size={15} /> ✓ Certificate Issued
        </span>
      );
    }

    // 5B. Ready for Certificate Stage (ONLY after marked ready for certificate)
    if (status === 'ready_for_certificate' || status === 'waiting_for_certificate') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            style={{ gap: 8, background: '#16a34a', borderColor: '#15803d' }}
            onClick={() => setShowCertificateModal(true)}
          >
            <Award size={16} /> Issue Certificate
          </button>
          {certificate && (certificate.status === 'under_review' || certificate.status === 'draft') && (
            <span style={{ fontSize: 12, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} /> Under Committee Review ({certificate.certificate_number})
            </span>
          )}
        </div>
      );
    }

    // 5A. Post-Payment Stage: Bring button to mark ready for certificate!
    if (status === 'payment_received' || isRenewalInvoicePaid) {
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#16a34a', borderColor: '#16a34a' }}
          onClick={handleMarkReadyForCertificate}
          disabled={markingReadyForCert}
        >
          <CheckCircle size={16} /> {markingReadyForCert ? 'Marking...' : 'Mark Ready for Certificate'}
        </button>
      );
    }

    // 4. Renewal Fee Invoice Stage
    if (status === 'invoice_sent' && !isRenewalInvoicePaid) {
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#854d0e' }}
          onClick={() => setShowInvoiceModal(true)}
        >
          <Receipt size={16} /> {renewalInvoice ? 'Resend Renewal Invoice' : 'Send Renewal Invoice'}
        </button>
      );
    }

    if (status === 'application_successful' && !renewalInvoice) {
      return (
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: '#854d0e' }}
          onClick={() => setShowInvoiceModal(true)}
        >
          <Receipt size={16} /> Send Renewal Invoice
        </button>
      );
    }

    // 3. LogSheet Stage (AFTER audit is completed AND NC is closed)
    const isLogsheetSigned = status === 'logsheet_signed' || status === 'application_successful' || (logsheet && (logsheet.status === 'Signed' || logsheet.status === 'Waiting For Certificate' || logsheet.status === 'Completed'));

    if (!hasActiveNc && (status === 'nc_closed' || isNcClosed || ['audit_report_submitted', 'logsheet_created', 'logsheet_sign_requested'].includes(status) || isLogsheetSigned)) {
      if (!isLogsheetSigned && status !== 'ready_for_certificate' && status !== 'certificate_issued' && status !== 'invoice_sent' && status !== 'payment_received') {
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

    // Step A: ONLY AFTER audit has been marked completed (and NC not yet closed):
    // Show [Manage Audit], [Flag NC], and [Close NC]
    if (isAuditCompleted && !isNcClosed) {
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
        </div>
      );
    }

    // Step B: BEFORE audit is marked completed:
    // If auditors are assigned or audit is underway:
    // Show [Manage Audit] and [Mark Audit Completed]
    if (!isAuditCompleted && (hasAuditorAssigned || status === 'audit_assigned' || activeAudit?.status === 'auditors_assigned' || activeAudit?.status === 'audit_assigned' || activeAudit?.auditors?.length > 0)) {
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

    // 2. Audit Scheduling & Execution fallback (when auditors not assigned yet, or dates proposed/rejected)
    if (
      ['approved', 'dates_proposed', 'dates_rejected', 'dates_accepted', 'date_finalized', 'date_selected', 'dates_selected'].includes(status) ||
      (activeAudit && ['dates_proposed', 'dates_rejected', 'dates_accepted', 'date_finalized'].includes(activeAudit.status))
    ) {
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
              {status === 'payment_received' ? 'Renewal Fee Paid' : (STATUS_LABELS[status] || status.replace(/_/g, ' '))}
            </span>
            {refreshing && <RefreshCw size={14} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {app.establishment_address || 'Facility'} &middot; Type: <strong>{app.application_type}</strong> &middot; Submitted {new Date(app.created_at).toLocaleDateString('en-GB')}
          </div>
        </div>
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
              {(app?.client_audit_availability_note || auditsArr?.find(a => a.client_availability_note)?.client_availability_note) && (
                <div style={{ marginTop: 8, background: '#ffffff', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700 }}>Client Remarks / Alternative Dates: </span>
                  <em>"{app?.client_audit_availability_note || auditsArr?.find(a => a.client_availability_note)?.client_availability_note}"</em>
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

      {/* Main Grid: Left Column Cards, Right Column Pipeline Timeline & Company Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Processing Stages & Detail Cards */}
        <div style={{ display: 'grid', gap: 20 }}>
          <AuditCard
            app={app}
            audits={audits}
            status={status}
            isFastTrack={true}
            onManage={() => setShowAuditModal(true)}
          />
          <NcCard
            app={app}
            audits={audits}
            status={status}
            onFlagNc={() => setShowNcModal(true)}
            onCloseNc={handleCloseNc}
            actionSubmitting={actionSubmitting}
          />
          <LogsheetCard
            logsheet={logsheet}
            status={status}
            appId={appId}
            isRenewal={true}
            isSurveillance={false}
            hasActiveNc={hasActiveNc}
            isNcClosed={isNcClosed}
            onMarkDone={handleMarkLogsheetDone}
            markingDone={markingLogsheetDone}
          />
          <InvoiceCard
            app={app}
            invoice={renewalInvoice}
            status={app?.status}
            isInitial={false}
            isRenewal={true}
            onConfirmPayment={renewalInvoice?.status === 'client_paid' ? handleConfirmPayment : undefined}
            confirmingPayment={confirmingPayment}
            onSendInvoice={() => setShowInvoiceModal(true)}
          />
          <CertificateCard
            app={app}
            certificate={certificate}
            status={status}
            isSurveillance={false}
            onIssueCertificate={() => setShowCertificateModal(true)}
          />
        </div>

        {/* Right Column: Processing Pipeline / Timeline & Company Info */}
        <div>
          {/* Stepper Timeline */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Processing Timeline</div>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <ProcessingTimeline
                status={status}
                statusHistory={app.statusHistory || app.status_history || []}
                category={app.category || ''}
                applicationType={app.application_type || 'renewal'}
                initialProduct={null}
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
                    onClick={() => {
                      const query = app.profiles?.company_name || app.establishment_name || '';
                      navigate(`/clients${query ? `?search=${encodeURIComponent(query)}` : ''}`);
                    }}
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
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Accept Renewal Application</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Confirm proceeding with renewal compliance audit</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowApproveModal(false)}><X size={18} /></button>
            </div>

            <div style={{ padding: '24px', display: 'grid', gap: 16 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 8 }}>
                  Selected Certification Category
                </label>
                <div style={{ padding: '12px 14px', background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 8 }}>
                  <div style={{ fontWeight: 800, color: '#0369a1', fontSize: 13 }}>
                    UAE/GSO Approved Halal Certification For Exporters To UAE
                  </div>
                  <div style={{ fontSize: 11.5, color: '#0284c7', marginTop: 4 }}>
                    🔒 Fast-track Renewal Certification Cycle.
                  </div>
                </div>
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

      {/* NC Management Modal (Flag, Review, Reply & Close) */}
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
                    borderBottom: ncModalTab === 'flag_new' ? '2.5px solid #0284c7' : 'none',
                    color: ncModalTab === 'flag_new' ? '#0284c7' : '#64748b',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                  onClick={() => setNcModalTab('flag_new')}
                >
                  ➕ Flag Another NC
                </button>
              </div>
            )}

            <div style={{ padding: '24px', display: 'grid', gap: 16, maxHeight: '60vh', overflowY: 'auto' }}>
              {ncModalTab === 'review' && (app.nc_reports?.length > 0 || status === 'nc_flagged') ? (
                <>
                  <div style={{ display: 'grid', gap: 14 }}>
                    {(app.nc_reports || []).map((nc, idx) => (
                      <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>NC Item #{idx + 1}</span>
                          <span className={`badge ${nc.status === 'closed' ? 'badge-green' : nc.status === 'client_responded' ? 'badge-blue' : 'badge-amber'}`}>
                            {nc.status === 'client_responded' ? 'Client Uploaded Proof' : nc.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{nc.nc_text}</div>
                        {nc.nc_document_url && (
                          <div style={{ marginTop: 8 }}>
                            <a href={getPdfUrl(nc.nc_document_url)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}>
                              <Download size={13} /> View Attached Audit Report
                            </a>
                          </div>
                        )}
                        {nc.client_response_text && (
                          <div style={{ marginTop: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 2 }}>Client Corrective Action Response:</div>
                            <div style={{ fontSize: 12.5, color: '#1e3a8a' }}>{nc.client_response_text}</div>
                            {nc.client_document_url && (
                              <div style={{ marginTop: 6 }}>
                                <a href={getPdfUrl(nc.client_document_url)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                                  <Download size={13} /> View Client Corrective Proof
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 6 }}>
                      Send Additional Auditor Remark / Feedback to Client
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="e.g. Received proof. Please also attach updated sanitation register..."
                      value={ncReplyText}
                      onChange={e => setNcReplyText(e.target.value)}
                      disabled={replyingNc}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg"
                        onChange={e => setNcReplyFile(e.target.files[0] || null)}
                        disabled={replyingNc}
                        style={{ fontSize: 12 }}
                      />
                      <button className="btn btn-ghost btn-sm" onClick={handleReplyNc} disabled={replyingNc || !ncReplyText.trim()}>
                        {replyingNc ? 'Sending...' : 'Send Remark to Client'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 8 }}>
                      Non-Conformity (NC) Description *
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="Specify the audit findings, standard violations, or corrective actions required from the client..."
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

      {/* Shared External Modals */}
      <AuditManageModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        app={app}
        existingAudits={audits}
        onSuccess={() => fetchApp(true)}
      />

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        app={app}
        invoice={renewalInvoice}
        invoiceType="initial"
        onSuccess={(newInv) => {
          if (newInv) {
            setInvoice(newInv);
            setAllInvoices(prev => [newInv, ...prev.filter(i => (i._id || i.id) !== (newInv._id || newInv.id))]);
            setApp(prev => prev ? { ...prev, status: 'invoice_sent' } : prev);
          }
          fetchApp(true);
        }}
      />

      <CertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        app={app}
        onSuccess={() => fetchApp(true)}
      />

      <ApplicationSubmissionModal
        isOpen={showSubmissionModal}
        onClose={() => setShowSubmissionModal(false)}
        app={app}
      />

      {/* Application Successful & Certificate Scheme Modal */}
      <ApplicationSuccessfulModal
        isOpen={showApplicationSuccessfulModal}
        onClose={() => setShowApplicationSuccessfulModal(false)}
        app={app}
        logsheet={logsheet}
        onConfirm={handleConfirmApplicationSuccessful}
        submitting={markingLogsheetDone}
      />
    </div>
  );
}
