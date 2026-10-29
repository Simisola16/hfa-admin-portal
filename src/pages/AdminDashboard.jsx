import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { STATUS_LABELS, STATUS_ORDER } from '../lib/applicationStatuses';
import {
  ClipboardList, Clock, CheckCircle2,
  RefreshCw, ArrowRight, TrendingUp, ChevronRight,
  FileText, AlertTriangle, AlertCircle, BellRing,
  PenTool, Package, MessageSquare, CreditCard,
  FileSignature, ChevronDown, ChevronUp, Search, CheckCircle, Award, X, Calendar,
  Layers, RotateCcw
} from 'lucide-react';

/* ─── Status display helpers ─────────────────────────────────── */
const STATUS_META = {
  submitted: { label: 'Submitted', color: '#334155', bg: '#f1f5f9' },
  under_review: { label: 'Under Review', color: '#b45309', bg: '#fef3c7' },
  approved: { label: 'Accepted', color: '#15803d', bg: '#dcfce7' },
  accepted: { label: 'Accepted', color: '#15803d', bg: '#dcfce7' },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fee2e2' },
  proposal_sent: { label: 'Proposal Sent', color: '#6d28d9', bg: '#f3e8ff' },
  proposal_approved: { label: 'Proposal Accepted', color: '#15803d', bg: '#dcfce7' },
  proposal_accepted: { label: 'Proposal Accepted', color: '#15803d', bg: '#dcfce7' },
  proposal_rejected: { label: 'Proposal Rejected', color: '#b91c1c', bg: '#fee2e2' },
  invoice_sent: { label: 'Invoice Sent', color: '#c2410c', bg: '#ffedd5' },
  payment_received: { label: 'Initial Payment Confirmed', color: '#15803d', bg: '#dcfce7' },
  initial_product: { label: 'Initial Product In-Progress', color: '#0284c7', bg: '#e0f2fe' },
  initial_product_approved: { label: 'Initial Product Approved', color: '#15803d', bg: '#dcfce7' },
  dates_proposed: { label: 'Audit Dates Proposed', color: '#0284c7', bg: '#e0f2fe' },
  dates_accepted: { label: 'Dates Accepted', color: '#15803d', bg: '#dcfce7' },
  date_finalized: { label: 'Date Finalized', color: '#15803d', bg: '#dcfce7' },
  audit_assigned: { label: 'Audit Assigned', color: '#0e7490', bg: '#cffafe' },
  audit_report_submitted: { label: 'Audit Submitted', color: '#0e7490', bg: '#cffafe' },
  certificate_issued: { label: 'Cert Issued', color: '#15803d', bg: '#dcfce7' },
  final_invoice_paid: { label: 'Invoice Paid', color: '#15803d', bg: '#dcfce7' },
  agreement_signed: { label: 'Agreement Signed', color: '#0e7490', bg: '#cffafe' },
  inactive: { label: 'Inactive', color: '#64748b', bg: '#f1f5f9' },
  superseded: { label: 'Inactive', color: '#64748b', bg: '#f1f5f9' },
};

function StatusBadge({ status, type }) {
  const isRenewal = (type || '').toLowerCase() === 'renewal' || (type || '').toLowerCase() === 'surveillance';
  let normStatus = (status || '').toLowerCase().replace(/ /g, '_');
  if (normStatus === 'payment_received' && !isRenewal) {
    normStatus = 'initial_product';
  }
  let s = STATUS_META[normStatus];
  if (normStatus === 'payment_received' && isRenewal) {
    s = { label: 'Renewal Fee Paid', color: '#15803d', bg: '#dcfce7' };
  } else if (!s) {
    s = {
      label: (normStatus || '—').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/Approved/gi, 'Accepted'),
      color: '#334155',
      bg: '#f1f5f9'
    };
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 10,
      fontSize: 11, fontWeight: 600, fontFamily: "'Inter', \"Segoe UI\", sans-serif",
      color: s.color, background: s.bg, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}


function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Component ─────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState({
    stats: {
      totalApps: 0,
      submittedApps: 0,
      underReviewApps: 0,
      pendingApps: 0,
      renewalApps: 0,
      acceptedApps: 0,
      rejectedApps: 0,
      totalCerts: 0,
      activeCerts: 0,
      expiredCerts: 0,
      pendingCerts: 0,
      totalProducts: 0
    },
    pipeline: []
  });

  // Action Required operational data states
  const [allAppsList, setAllAppsList] = useState([]);
  const [agreementsList, setAgreementsList] = useState([]);
  const [logsheetsList, setLogsheetsList] = useState([]);
  const [initialProductsList, setInitialProductsList] = useState([]);
  const [addOnsList, setAddOnsList] = useState([]);
  const [extensionsList, setExtensionsList] = useState([]);
  const [surveillanceList, setSurveillanceList] = useState([]);
  const [ticketsList, setTicketsList] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);

  // UI filters for Action Required
  const [actionCategoryTab, setActionCategoryTab] = useState('all');
  const [actionTimelineFilter, setActionTimelineFilter] = useState('all');
  const [actionSearchQuery, setActionSearchQuery] = useState('');
  const [actionSectionCollapsed, setActionSectionCollapsed] = useState(false);
  const [showAdminActionModal, setShowAdminActionModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        appsRes,
        agreementsRes,
        logsheetsRes,
        initProdsRes,
        addOnsRes,
        extensionsRes,
        surveillanceRes,
        ticketsRes,
        invoicesRes
      ] = await Promise.all([
        api.get('/api/reports/dashboard-overview').catch(err => ({ data: null })),
        api.get('/api/applications').catch(() => ({ data: [] })),
        api.get('/api/agreements').catch(() => ({ data: { data: [] } })),
        api.get('/api/application-logsheets?status=Waiting for Signature').catch(() => ({ data: [] })),
        api.get('/api/initial-products').catch(() => ({ data: [] })),
        api.get('/api/add-on-applications').catch(() => ({ data: [] })),
        api.get('/api/extension-applications').catch(() => ({ data: [] })),
        api.get('/api/surveillance-schedules').catch(() => ({ data: [] })),
        api.get('/api/tickets').catch(() => ({ data: { data: [] } })),
        api.get('/api/invoices').catch(() => ({ data: [] })),
      ]);

      const payload = overviewRes?.data?.stats ? overviewRes.data : (overviewRes?.stats ? overviewRes : null);
      if (payload?.stats) {
        setData({
          stats: payload.stats,
          pipeline: payload.pipeline || []
        });
      }

      // Safe extraction helper
      const extractList = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.data)) return res.data.data;
        return [];
      };

      setAllAppsList(extractList(appsRes));
      setAgreementsList(extractList(agreementsRes));
      setLogsheetsList(extractList(logsheetsRes));
      setInitialProductsList(extractList(initProdsRes));
      setAddOnsList(extractList(addOnsRes));
      setExtensionsList(extractList(extensionsRes));
      setSurveillanceList(extractList(surveillanceRes));
      setTicketsList(extractList(ticketsRes));
      setInvoicesList(extractList(invoicesRes));

      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Action Items Calculation for Admin Staff ─────────────────────────────────
  const adminActionItems = useMemo(() => {
    const items = [];
    const currentTime = new Date();

    // 1. Applications across Processing Timeline stages (New, Renewal, Surveillance, Add-on, Extension)
    (allAppsList || []).forEach(app => {
      const st = app.status;
      const clientName = app.client_id?.company_name || app.profiles?.company_name || app.establishment_name || app.site_name || 'Client';
      const appRef = app.application_number ? `#${app.application_number}` : 'N/A';
      const dateStr = formatDate(app.created_at || app.createdAt);

      const rawType = (app.application_type || app.type || '').toLowerCase();
      let category = 'applications';
      let appType = 'standard';
      let appTypeLabel = 'New App';
      let appTypeBadgeBg = '#f1f5f9';
      let appTypeBadgeColor = '#334155';

      if (rawType.includes('renewal')) {
        category = 'renewals';
        appType = 'renewal';
        appTypeLabel = 'Renewal';
        appTypeBadgeBg = '#dcfce7';
        appTypeBadgeColor = '#15803d';
      } else if (rawType.includes('surveillance')) {
        category = 'surveillance';
        appType = 'surveillance';
        appTypeLabel = 'Surveillance';
        appTypeBadgeBg = '#e0f2fe';
        appTypeBadgeColor = '#0369a1';
      } else if (rawType.includes('addon') || rawType.includes('add-on')) {
        category = 'addons';
        appType = 'addon';
        appTypeLabel = 'Add-On';
        appTypeBadgeBg = '#f3e8ff';
        appTypeBadgeColor = '#7e22ce';
      } else if (rawType.includes('extension')) {
        category = 'extensions';
        appType = 'extension';
        appTypeLabel = 'Extension';
        appTypeBadgeBg = '#fef3c7';
        appTypeBadgeColor = '#b45309';
      } else if (rawType.includes('initial') || rawType.includes('product')) {
        category = 'initial_products';
        appType = 'initial_product';
        appTypeLabel = 'Initial Product';
        appTypeBadgeBg = '#e0e7ff';
        appTypeBadgeColor = '#4338ca';
      }

      const isRenewal = appType === 'renewal';
      const isSurv = appType === 'surveillance';

      if (st === 'submitted' || st === 'application_submitted') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'submitted',
          appStatusLabel: STATUS_LABELS['submitted'] || 'Application Submitted',
          timelineStage: isRenewal ? 'Renewal Submitted' : isSurv ? 'Surveillance Submitted' : 'Application Submitted',
          urgency: 'urgent',
          urgencyLabel: isRenewal ? 'Renewal Submitted' : isSurv ? 'Surveillance' : 'New Application',
          badgeColor: '#fee2e2',
          badgeTextColor: '#b91c1c',
          title: `${clientName} • App ${appRef}`,
          description: isRenewal
            ? `Certificate renewal application submitted. Review site changes and proceed with scope triage.`
            : `New certification application submitted for ${app.category || 'Halal Certification'}. Initial triage, scope assessment, and proposal required.`,
          meta: `Submitted: ${dateStr} • Type: ${appTypeLabel}`,
          actionLabel: isRenewal ? 'Review Renewal' : isSurv ? 'Review Surveillance' : 'Review Application',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <ClipboardList size={18} />
        });
      } else if (st === 'under_review') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'under_review',
          appStatusLabel: STATUS_LABELS['under_review'] || 'Under Review',
          timelineStage: 'Under Review',
          urgency: 'action_needed',
          urgencyLabel: isRenewal ? 'Renewal In Review' : 'Under Review',
          badgeColor: '#fef3c7',
          badgeTextColor: '#b45309',
          title: `${clientName} • App ${appRef}`,
          description: isRenewal
            ? 'Renewal application is undergoing technical evaluation. Review scope and formulate fee proposal.'
            : 'Application is undergoing technical review. Complete document audit, evaluate scope, and issue decision or proposal.',
          meta: `Type: ${appTypeLabel} • Submitted: ${dateStr}`,
          actionLabel: isRenewal ? 'Review Renewal' : 'Review Scope',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <ClipboardList size={18} />
        });
      } else if (st === 'approved') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'approved',
          appStatusLabel: STATUS_LABELS['approved'] || 'Application Accepted',
          timelineStage: 'Application Accepted',
          urgency: 'action_needed',
          urgencyLabel: 'Scope Accepted',
          badgeColor: '#dcfce7',
          badgeTextColor: '#15803d',
          title: `${clientName} • App ${appRef}`,
          description: 'Application accepted. Generate and issue official Halal certification proposal to client.',
          meta: `Category: ${app.category || 'Halal Certification'}`,
          actionLabel: 'Issue Proposal',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <FileText size={18} />
        });
      } else if (st === 'proposal_approved') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'proposal_approved',
          appStatusLabel: STATUS_LABELS['proposal_approved'] || 'Proposal Accepted',
          timelineStage: 'Proposal Accepted',
          urgency: 'urgent',
          urgencyLabel: 'Invoice Due',
          badgeColor: '#fee2e2',
          badgeTextColor: '#b91c1c',
          title: `${clientName} • App ${appRef}`,
          description: 'Client accepted formal fee proposal. Issue initial audit invoice to proceed to next stage.',
          meta: 'Awaiting initial invoice generation',
          actionLabel: 'Issue Invoice',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <CreditCard size={18} />
        });
      } else if (st === 'payment_received') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'payment_received',
          appStatusLabel: STATUS_LABELS['payment_received'] || 'Initial Payment Confirmed',
          timelineStage: 'Initial Payment Confirmed',
          urgency: 'action_needed',
          urgencyLabel: 'PAF / Dates',
          badgeColor: '#e0e7ff',
          badgeTextColor: '#4338ca',
          title: `${clientName} • App ${appRef}`,
          description: 'Initial invoice payment confirmed. Enable Product Approval Form (PAF) or propose audit dates to client.',
          meta: 'Ready for PAF enablement & audit scheduling',
          actionLabel: 'Manage Next Steps',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <Calendar size={18} />
        });
      } else if (st === 'dates_accepted') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'dates_accepted',
          appStatusLabel: STATUS_LABELS['dates_accepted'] || 'Audit Dates Accepted',
          timelineStage: 'Audit Dates Accepted',
          urgency: 'urgent',
          urgencyLabel: 'Assign Auditor',
          badgeColor: '#fee2e2',
          badgeTextColor: '#b91c1c',
          title: `${clientName} • App ${appRef}`,
          description: 'Client has confirmed audit dates. Finalize date schedule and assign Lead Auditor to facility.',
          meta: 'Audit schedule confirmation needed',
          actionLabel: 'Assign Auditor',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <Calendar size={18} />
        });
      } else if (st === 'audit_completed' || st === 'audit_successful') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'audit_completed',
          appStatusLabel: STATUS_LABELS['audit_completed'] || 'Audit Complete',
          timelineStage: 'Audit Complete',
          urgency: 'action_needed',
          urgencyLabel: 'Audit Done',
          badgeColor: '#dcfce7',
          badgeTextColor: '#15803d',
          title: `${clientName} • App ${appRef}`,
          description: 'Facility audit completed. Review findings, verify non-conformances, and initiate Committee logsheet review.',
          meta: 'Ready for Logsheet review',
          actionLabel: 'Create Logsheet',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <PenTool size={18} />
        });
      } else if (st === 'nc_flagged') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'nc_flagged',
          appStatusLabel: STATUS_LABELS['nc_flagged'] || 'NC Flagged',
          timelineStage: 'NC Flagged',
          urgency: 'urgent',
          urgencyLabel: 'NC Evidence',
          badgeColor: '#fee2e2',
          badgeTextColor: '#b91c1c',
          title: `${clientName} • App ${appRef}`,
          description: 'Non-conformance flagged during audit. Review corrective evidence submitted by client.',
          meta: 'Client rectification pending review',
          actionLabel: 'Review NCs',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <AlertTriangle size={18} />
        });
      } else if (st === 'nc_closed' || st === 'audit_report_submitted') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'nc_closed',
          appStatusLabel: STATUS_LABELS['nc_closed'] || 'NC Closed',
          timelineStage: 'NC Closed',
          urgency: 'action_needed',
          urgencyLabel: 'NCs Cleared',
          badgeColor: '#dcfce7',
          badgeTextColor: '#15803d',
          title: `${clientName} • App ${appRef}`,
          description: 'All non-conformances cleared. Prepare facility logsheet for Committee signatures.',
          meta: 'Ready for Committee Logsheet',
          actionLabel: 'Create Logsheet',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <PenTool size={18} />
        });
      } else if (st === 'logsheet_signed') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'logsheet_signed',
          appStatusLabel: STATUS_LABELS['logsheet_signed'] || 'Logsheet Signed',
          timelineStage: 'Logsheet Signed',
          urgency: 'urgent',
          urgencyLabel: 'Endorsed',
          badgeColor: '#dcfce7',
          badgeTextColor: '#15803d',
          title: `${clientName} • App ${appRef}`,
          description: 'Committee members signed audit logsheet. Mark application as successful and release agreement.',
          meta: 'Committee endorsement complete',
          actionLabel: 'Mark Successful',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <Award size={18} />
        });
      } else if (st === 'application_successful') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'application_successful',
          appStatusLabel: STATUS_LABELS['application_successful'] || 'Application Successful',
          timelineStage: 'Application Successful',
          urgency: 'urgent',
          urgencyLabel: 'Agreement Due',
          badgeColor: '#fee2e2',
          badgeTextColor: '#b91c1c',
          title: `${clientName} • App ${appRef}`,
          description: 'Application successfully endorsed. Prepare and send official Halal Certification Agreement.',
          meta: 'Ready for Agreement issuance',
          actionLabel: 'Send Agreement',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <FileSignature size={18} />
        });
      } else if (st === 'final_invoice_paid' || st === 'ready_for_certificate') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'ready_for_certificate',
          appStatusLabel: STATUS_LABELS['ready_for_certificate'] || 'Ready for Certificate',
          timelineStage: 'Ready for Certificate',
          urgency: 'urgent',
          urgencyLabel: 'Issue Certificate',
          badgeColor: '#dcfce7',
          badgeTextColor: '#15803d',
          title: `${clientName} • App ${appRef}`,
          description: 'All milestones fulfilled and final fee paid. Generate, approve, and issue official Halal Certificate.',
          meta: 'Final milestone reached',
          actionLabel: 'Issue Certificate',
          actionUrl: `/applications/${app._id || app.id}/issue-certificate`,
          icon: <Award size={18} />
        });
      } else if (st === 'on_hold') {
        items.push({
          id: `app_${app._id || app.id}`,
          category,
          appType,
          appTypeLabel,
          appTypeBadgeBg,
          appTypeBadgeColor,
          appStatus: 'on_hold',
          appStatusLabel: STATUS_LABELS['on_hold'] || 'On Hold',
          timelineStage: 'On Hold',
          urgency: 'action_needed',
          urgencyLabel: 'On Hold',
          badgeColor: '#ffedd5',
          badgeTextColor: '#c2410c',
          title: `${clientName} • App ${appRef}`,
          description: app.on_hold_reason ? `On hold: ${app.on_hold_reason}` : 'Application placed on hold. Review outstanding documentation to resume.',
          meta: 'Awaiting resolution to resume processing',
          actionLabel: 'Review Hold',
          actionUrl: `/applications/${app._id || app.id}/processing`,
          icon: <AlertCircle size={18} />
        });
      }
    });

    // 2. Client-Signed Agreements Awaiting HFA Countersignature
    (agreementsList || []).forEach(agr => {
      const isSignedByClient = agr.status === 'signed' || (agr.client_signed && agr.status !== 'approved' && agr.status !== 'finalized');
      if (isSignedByClient) {
        const appRef = agr.application_id?.application_number ? `#${agr.application_id.application_number}` : '';
        const clientName = agr.application_id?.establishment_name || agr.application_id?.site_name || agr.title || 'Client Agreement';
        items.push({
          id: `agr_${agr._id || agr.id}`,
          category: 'agreements',
          appType: 'agreement',
          appTypeLabel: 'Agreement',
          appTypeBadgeBg: '#ffe4e6',
          appTypeBadgeColor: '#be123c',
          appStatus: agr.application_id?.status || 'agreement_signed',
          appStatusLabel: STATUS_LABELS[agr.application_id?.status] || 'Agreement Signed',
          timelineStage: 'Agreement Signed',
          urgency: 'urgent',
          urgencyLabel: 'Countersign Required',
          badgeColor: '#fee2e2',
          badgeTextColor: '#b91c1c',
          title: `Countersign Agreement: ${clientName} ${appRef}`,
          description: 'Client has signed the Halal Certification Agreement. Scheme Manager countersignature and final copy upload required.',
          meta: `Client signed on ${formatDate(agr.client_sign_date || agr.updatedAt || agr.createdAt)}`,
          actionLabel: 'Countersign Agreement',
          actionUrl: '/agreements',
          icon: <FileSignature size={18} />
        });
      }
    });

    // 3. Logsheets Waiting Signatures
    (logsheetsList || []).forEach(log => {
      if (log.status === 'Waiting for Signature') {
        const logRef = log.logsheet_number || log.direct_ref || 'LOG';
        const company = log.company_name || log.site_name || 'Facility';
        items.push({
          id: `log_${log._id || log.id}`,
          category: 'agreements',
          appType: 'logsheet',
          appTypeLabel: 'Logsheet',
          appTypeBadgeBg: '#fef3c7',
          appTypeBadgeColor: '#b45309',
          appStatus: log.application_id?.status || 'logsheet_created',
          appStatusLabel: STATUS_LABELS[log.application_id?.status] || 'Under Committee Review',
          timelineStage: 'Under Committee Review',
          urgency: 'urgent',
          urgencyLabel: 'Signatures Pending',
          badgeColor: '#fef3c7',
          badgeTextColor: '#b45309',
          title: `Logsheet #${logRef}: ${company}`,
          description: 'Facility audit logsheet is waiting for Committee signatures (Mufti, CEO, Scheme Manager) before certificate issuance.',
          meta: `Standard: ${log.certificate_standard || log.certificate_type || 'Halal Standard'}`,
          actionLabel: 'Sign Logsheet',
          actionUrl: '/logsheet/waiting-signature',
          icon: <PenTool size={18} />
        });
      }
    });

    // 4. Initial Products submitted / PAF completed
    (initialProductsList || []).forEach(ip => {
      const isSubmitted = ip.status === 'submitted';
      const isPafDone = ip.status === 'paf_client_submitted';
      const isPending = isSubmitted || isPafDone || ip.status === 'under_review' || ip.status === 'in_review';
      if (isPending) {
        const clientName = ip.client_id?.company_name || ip.client_id?.full_name || 'Client';
        const appRef = ip.application_id?.application_number ? `#${ip.application_id.application_number}` : '';
        items.push({
          id: `ip_${ip._id || ip.id}`,
          category: 'initial_products',
          appType: 'initial_product',
          appTypeLabel: 'Initial Product',
          appTypeBadgeBg: '#e0e7ff',
          appTypeBadgeColor: '#4338ca',
          appStatus: ip.application_id?.status || ip.status || 'initial_product',
          appStatusLabel: isPafDone ? 'PAF Submitted' : (STATUS_LABELS[ip.status] || 'Initial Product In-Progress'),
          timelineStage: isPafDone ? 'PAF Completed' : 'Initial Product Evaluation',
          urgency: isPafDone ? 'urgent' : 'action_needed',
          urgencyLabel: isPafDone ? 'PAF Completed' : 'Product Evaluation',
          badgeColor: isPafDone ? '#dcfce7' : '#e0e7ff',
          badgeTextColor: isPafDone ? '#15803d' : '#4338ca',
          title: `Initial Product: "${ip.product?.name || 'Product'}" (${clientName})`,
          description: isPafDone
            ? 'Client submitted Product Approval Form specifications. Food Tech review and evaluation required.'
            : 'New initial product submitted. Awaiting Food Tech assignment and evaluation.',
          meta: `Application ${appRef} • Contact: ${ip.contact_name || 'Client Contact'}`,
          actionLabel: 'Evaluate Product',
          actionUrl: `/initial-products/${ip._id || ip.id}/processing`,
          icon: <Package size={18} />
        });
      }
    });

    // 5. Add-on Applications submitted / PAF completed
    (addOnsList || []).forEach(ao => {
      const isSubmitted = ao.status === 'submitted';
      const isPafDone = ao.status === 'paf_client_submitted';
      const isPending = isSubmitted || isPafDone || ao.status === 'under_review' || ao.status === 'in_review';
      if (isPending) {
        const clientName = ao.client_id?.company_name || ao.client_id?.full_name || 'Client';
        const count = (ao.products || []).length;
        items.push({
          id: `ao_${ao._id || ao.id}`,
          category: 'addons',
          appType: 'addon',
          appTypeLabel: 'Add-On',
          appTypeBadgeBg: '#f3e8ff',
          appTypeBadgeColor: '#7e22ce',
          appStatus: ao.application_id?.status || ao.status || 'under_review',
          appStatusLabel: isPafDone ? 'PAF Completed' : (STATUS_LABELS[ao.status] || 'Under Review'),
          timelineStage: isPafDone ? 'PAF Completed' : 'Under Review',
          urgency: isPafDone ? 'urgent' : 'action_needed',
          urgencyLabel: isPafDone ? 'PAF Completed' : 'Add-on Request',
          badgeColor: isPafDone ? '#dcfce7' : '#f3e8ff',
          badgeTextColor: isPafDone ? '#15803d' : '#7e22ce',
          title: `Add-on Application: ${count} product(s) (${clientName})`,
          description: isPafDone
            ? 'Client has submitted the Add-on Product Approval Form. Technical review and evaluation required.'
            : 'Client submitted an add-on product application. Review products and enable PAF or take decision.',
          meta: `Type: ${(ao.addon_type || 'Add-on').replace(/_/g, ' ')} • Date: ${formatDate(ao.created_at || ao.createdAt)}`,
          actionLabel: 'Review Add-on',
          actionUrl: `/addon-applications/${ao._id || ao.id}/processing`,
          icon: <Package size={18} />
        });
      }
    });

    // 6. Extension Applications
    (extensionsList || []).forEach(ext => {
      const isPending = !['approved', 'rejected', 'completed'].includes((ext.status || '').toLowerCase());
      if (isPending) {
        const clientName = ext.client_id?.company_name || ext.client_id?.full_name || 'Client';
        const extRef = ext.application_number ? `#${ext.application_number}` : '';
        const isSubmitted = ext.status === 'submitted';
        items.push({
          id: `ext_${ext._id || ext.id}`,
          category: 'extensions',
          appType: 'extension',
          appTypeLabel: 'Extension',
          appTypeBadgeBg: '#fef3c7',
          appTypeBadgeColor: '#b45309',
          appStatus: ext.status || 'submitted',
          appStatusLabel: isSubmitted ? 'Extension Submitted' : 'Extension In Review',
          timelineStage: isSubmitted ? 'Extension Submitted' : 'Extension In Review',
          urgency: isSubmitted ? 'urgent' : 'action_needed',
          urgencyLabel: isSubmitted ? 'Extension Submitted' : 'Scope Review',
          badgeColor: isSubmitted ? '#fee2e2' : '#fef3c7',
          badgeTextColor: isSubmitted ? '#b91c1c' : '#b45309',
          title: `Scope Extension ${extRef} (${clientName})`,
          description: `Client requested facility/standard scope extension for: ${ext.extension_scope || ext.scope || 'Facility Extension'}. Review and determine audit/approval requirement.`,
          meta: `Date: ${formatDate(ext.created_at || ext.createdAt)} • Type: Extension Application`,
          actionLabel: 'Process Extension',
          actionUrl: `/extension-applications/${ext._id || ext.id}/processing`,
          icon: <Layers size={18} />
        });
      }
    });

    // 7. Surveillance Schedules & Due Dates
    (surveillanceList || []).forEach(surv => {
      const isDueOrPending = !['completed', 'cancelled'].includes((surv.status || '').toLowerCase());
      if (isDueOrPending) {
        const clientName = surv.client_id?.company_name || surv.client_name || surv.site_name || 'Client Facility';
        const dueDate = surv.due_date || surv.surveillance_date || surv.scheduled_date;
        const isOverdue = dueDate && new Date(dueDate) < currentTime;
        items.push({
          id: `surv_${surv._id || surv.id}`,
          category: 'surveillance',
          appType: 'surveillance',
          appTypeLabel: 'Surveillance',
          appTypeBadgeBg: '#e0f2fe',
          appTypeBadgeColor: '#0369a1',
          appStatus: 'surveillance',
          appStatusLabel: 'Annual Surveillance',
          timelineStage: 'Surveillance Due',
          urgency: isOverdue ? 'urgent' : 'action_needed',
          urgencyLabel: isOverdue ? 'Surveillance Overdue' : 'Surveillance Due',
          badgeColor: isOverdue ? '#fee2e2' : '#e0f2fe',
          badgeTextColor: isOverdue ? '#b91c1c' : '#0369a1',
          title: `Surveillance Audit: ${clientName}`,
          description: `Annual Halal compliance surveillance audit ${isOverdue ? 'is overdue' : 'is approaching due date'}. Coordinate with client and assign auditor.`,
          meta: dueDate ? `Due: ${formatDate(dueDate)}` : 'Annual surveillance cycle',
          actionLabel: 'Manage Surveillance',
          actionUrl: '/surveillance-due-dates',
          icon: <Calendar size={18} />
        });
      }
    });

    // 8. Open Support Tickets
    (ticketsList || []).forEach(t => {
      if (t.status === 'open') {
        const clientName = t.user_id?.company_name || t.user_id?.full_name || 'Client';
        items.push({
          id: `tkt_${t._id || t.id}`,
          category: 'tickets',
          appType: 'ticket',
          appTypeLabel: 'Support',
          appTypeBadgeBg: '#dbeafe',
          appTypeBadgeColor: '#1d4ed8',
          appStatus: 'support',
          appStatusLabel: 'Support Ticket',
          timelineStage: 'Support Ticket',
          urgency: 'urgent',
          urgencyLabel: 'Open Ticket',
          badgeColor: '#fee2e2',
          badgeTextColor: '#b91c1c',
          title: `Support Ticket #${t.ticket_number || 'TKT'}: ${t.subject || 'Inquiry'}`,
          description: `Client (${clientName}) submitted a support request. Priority: ${(t.priority || 'Medium').toUpperCase()}. Staff response needed.`,
          meta: `Submitted: ${formatDate(t.created_at || t.createdAt)} • Dept: ${t.department || 'General'}`,
          actionLabel: 'Reply to Ticket',
          actionUrl: '/tickets',
          icon: <MessageSquare size={18} />
        });
      }
    });

    // 9. Receipts Submitted awaiting confirmation / Overdue Invoices
    (invoicesList || []).forEach(inv => {
      const isClientPaid = inv.status === 'client_paid';
      const isOverdue = inv.status !== 'paid' && inv.status !== 'settled' && inv.due_date && new Date(inv.due_date) < currentTime;
      if (isClientPaid) {
        const company = inv.profiles?.company_name || inv.client_id?.company_name || 'Client';
        const amountStr = inv.amount ? `£${Number(inv.amount).toFixed(2)}` : '';
        items.push({
          id: `inv_paid_${inv._id || inv.id}`,
          category: 'finance',
          appType: 'finance',
          appTypeLabel: 'Finance',
          appTypeBadgeBg: '#ecfdf5',
          appTypeBadgeColor: '#047857',
          appStatus: inv.application_id?.status || 'payment_received',
          appStatusLabel: STATUS_LABELS[inv.application_id?.status] || 'Initial Payment Confirmed',
          timelineStage: 'Verify Payment',
          urgency: 'action_needed',
          urgencyLabel: 'Verify Payment',
          badgeColor: '#fef3c7',
          badgeTextColor: '#b45309',
          title: `Receipt Uploaded: Invoice #${inv.invoice_number || 'INV'} ${amountStr ? `(${amountStr})` : ''}`,
          description: `Client (${company}) uploaded payment proof. Accountant verification required to unlock progress.`,
          meta: `Invoice: ${inv.title || 'Certification Fee'}`,
          actionLabel: 'Verify Payment',
          actionUrl: '/invoices',
          icon: <CreditCard size={18} />
        });
      } else if (isOverdue) {
        const company = inv.profiles?.company_name || inv.client_id?.company_name || 'Client';
        const amountStr = inv.amount ? `£${Number(inv.amount).toFixed(2)}` : '';
        items.push({
          id: `inv_overdue_${inv._id || inv.id}`,
          category: 'finance',
          appType: 'finance',
          appTypeLabel: 'Finance',
          appTypeBadgeBg: '#ecfdf5',
          appTypeBadgeColor: '#047857',
          appStatus: inv.application_id?.status || (inv.is_final ? 'final_invoice_sent' : 'invoice_sent'),
          appStatusLabel: STATUS_LABELS[inv.application_id?.status] || (inv.is_final ? 'Final Certification Invoice Sent' : 'Initial Invoice Sent'),
          timelineStage: inv.is_final ? 'Final Invoice' : 'Initial Invoice Sent',
          urgency: 'action_needed',
          urgencyLabel: 'Invoice Overdue',
          badgeColor: '#fee2e2',
          badgeTextColor: '#b91c1c',
          title: `Overdue Invoice #${inv.invoice_number || 'INV'} • ${amountStr} (${company})`,
          description: `Invoice passed due date (${formatDate(inv.due_date)}). Follow up with client regarding settlement.`,
          meta: `Due was ${formatDate(inv.due_date)}`,
          actionLabel: 'Review Invoices',
          actionUrl: '/invoices',
          icon: <CreditCard size={18} />
        });
      }
    });

    const priorityScore = { urgent: 3, action_needed: 2, review: 1 };
    return items.sort((a, b) => (priorityScore[b.urgency] || 0) - (priorityScore[a.urgency] || 0));
  }, [allAppsList, agreementsList, logsheetsList, initialProductsList, addOnsList, extensionsList, surveillanceList, ticketsList, invoicesList]);

  const urgentAdminCount = adminActionItems.filter(i => i.urgency === 'urgent').length;

  // Derive distinct timeline stages present in current operational action items
  const availableTimelineStages = useMemo(() => {
    const counts = {};
    adminActionItems.forEach(item => {
      if (item.appStatus) {
        counts[item.appStatus] = (counts[item.appStatus] || 0) + 1;
      }
    });

    const stages = [];
    const seen = new Set();
    (STATUS_ORDER || []).forEach(st => {
      if (counts[st]) {
        stages.push({
          status: st,
          label: STATUS_LABELS[st] || st.replace(/_/g, ' '),
          count: counts[st]
        });
        seen.add(st);
      }
    });
    // Add any categories not strictly in STATUS_ORDER (e.g. 'support')
    Object.keys(counts).forEach(st => {
      if (!seen.has(st)) {
        stages.push({
          status: st,
          label: STATUS_LABELS[st] || (st === 'support' ? 'Support Ticket' : st.replace(/_/g, ' ')),
          count: counts[st]
        });
      }
    });
    return stages;
  }, [adminActionItems]);

  const filteredAdminActions = useMemo(() => {
    let list = adminActionItems;
    if (actionCategoryTab === 'urgent') {
      list = list.filter(i => i.urgency === 'urgent');
    } else if (actionCategoryTab !== 'all') {
      list = list.filter(i => i.category === actionCategoryTab || i.appType === actionCategoryTab);
    }
    if (actionTimelineFilter !== 'all') {
      list = list.filter(i => i.appStatus === actionTimelineFilter);
    }
    if (actionSearchQuery.trim()) {
      const q = actionSearchQuery.trim().toLowerCase();
      list = list.filter(i =>
        (i.title          || '').toLowerCase().includes(q) ||
        (i.description    || '').toLowerCase().includes(q) ||
        (i.meta           || '').toLowerCase().includes(q) ||
        (i.urgencyLabel   || '').toLowerCase().includes(q) ||
        (i.urgency        || '').toLowerCase().includes(q) ||
        (i.appType        || '').toLowerCase().includes(q) ||
        (i.appTypeLabel   || '').toLowerCase().includes(q) ||
        (i.appStatus      || '').toLowerCase().includes(q) ||
        (i.appStatusLabel || '').toLowerCase().includes(q) ||
        (i.timelineStage  || '').toLowerCase().includes(q) ||
        (i.actionLabel    || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [adminActionItems, actionCategoryTab, actionTimelineFilter, actionSearchQuery]);

  // Auto popup on login when pending action items exist
  useEffect(() => {
    if (!loading && adminActionItems.length > 0) {
      const hasAutoShown = sessionStorage.getItem('hfa_admin_action_popup_shown');
      if (!hasAutoShown) {
        setShowAdminActionModal(true);
        sessionStorage.setItem('hfa_admin_action_popup_shown', 'true');
      }
    }
  }, [loading, adminActionItems.length]);

  /* ─── Derived counts from server stats ─── */
  const { stats, pipeline: pipelineList } = data;
  const {
    totalApps: totalAppsCount = 0,
    submittedApps = 0,
    underReviewApps = 0,
    pendingApps: pendingAppsCount = 0,
    renewalApps = 0,
    acceptedApps: acceptedAppsCount = 0,
    rejectedApps: rejectedAppsCount = 0,
    totalCerts: certTotal = 0,
    activeCerts = 0,
    expiredCerts = 0,
    pendingCerts: pendingCertsCount = 0,
    totalProducts: productsCount = 0
  } = stats || {};

  const pendingApps = pendingAppsCount;
  const submitted = submittedApps;
  const underReview = underReviewApps;
  const pipelineTotal = totalAppsCount;

  /* ─── 4 KPI cards ─── */
  const KPI = [
    { id: 'total_apps', label: 'Total Applications', value: totalAppsCount, iconBg: '#2563eb', icon: <ClipboardList size={22} color="white" />, path: '/applications', trend: '+3%' },
    { id: 'new_apps', label: 'New Applications', value: submittedApps, iconBg: '#f59e0b', icon: <FileText size={22} color="white" />, path: '/applications?type=new', trend: '0%' },
    { id: 'active_certs', label: 'Active Certificates', value: activeCerts, iconBg: '#00c853', icon: <CheckCircle2 size={22} color="white" />, path: '/certificates', trend: '+5%' },
    { id: 'renewal_apps', label: 'Renewal Applications', value: renewalApps, iconBg: '#008744', icon: <RefreshCw size={22} color="white" />, path: '/applications?type=renewal', trend: '+7%' },
  ];

  /* ─── Application statistics derived metrics ─── */
  const appApprovedPercent = totalAppsCount ? Math.round((acceptedAppsCount / totalAppsCount) * 100) : 0;
  const appPendingPercent = totalAppsCount ? Math.round((pendingAppsCount / totalAppsCount) * 100) : 0;
  const appRejectedPercent = totalAppsCount ? Math.round((rejectedAppsCount / totalAppsCount) * 100) : 0;

  /* ─── Loading skeleton ─── */
  if (loading && !data.stats?.totalApps && pipelineList.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, fontFamily: 'Inter, "Segoe UI", sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #dcfce7', borderTop: '3px solid #008744', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Loading dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24, fontFamily: 'Inter, "Segoe UI", sans-serif' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Dashboard Overview
          </h1>
          <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 4, fontWeight: 500 }}>
            Real-time overview of applications, products, and certificates
            {lastUpdated && (
              <span style={{ marginLeft: 12, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                Last updated: {lastUpdated}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#008744', color: 'white', border: 'none',
              borderRadius: 8, padding: '10px 18px', fontWeight: 600,
              fontSize: 13.5, cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,135,68,0.2)'
            }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh Data
          </button>
        </div>
      </div>



      {/* ── 4 KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {KPI.map(k => (
          <div
            key={k.id}
            onClick={() => navigate(k.path)}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 22,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                {k.label}
              </span>
              <div
                style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: k.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                {k.icon}
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1.1, marginTop: 10 }}>
              {loading ? '—' : k.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, fontWeight: 600, color: '#059669' }}>
              <TrendingUp size={14} />
              <span>{k.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── ACTION REQUIRED TRIGGER BANNER (CLICK TO POP-UP) ───────────────── */}
      <div
        onClick={() => setShowAdminActionModal(true)}
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: urgentAdminCount > 0 ? '1.5px solid #fecaca' : adminActionItems.length > 0 ? '1.5px solid #fed7aa' : '1px solid #bbf7d0',
          boxShadow: urgentAdminCount > 0 ? '0 4px 16px -2px rgba(220, 38, 38, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
          padding: '14px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: urgentAdminCount > 0 ? '#dc2626' : adminActionItems.length > 0 ? '#ea580c' : '#008744',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}>
            {urgentAdminCount > 0 ? <AlertTriangle size={22} /> : adminActionItems.length > 0 ? <BellRing size={22} /> : <CheckCircle2 size={22} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Action Required &amp; Operational Triage
              </span>
              <span style={{
                fontSize: 11.5,
                fontWeight: 800,
                padding: '2px 9px',
                borderRadius: 12,
                background: urgentAdminCount > 0 ? '#dc2626' : adminActionItems.length > 0 ? '#ea580c' : '#008744',
                color: '#ffffff'
              }}>
                {adminActionItems.length === 0 ? '0 Queues Clear' : `${adminActionItems.length} ${adminActionItems.length === 1 ? 'Action Pending' : 'Actions Pending'}`}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: 500 }}>
              {adminActionItems.length === 0
                ? 'All staff queues, applications, logsheets, and support tickets are clear. Click to view status.'
                : `${urgentAdminCount > 0 ? `${urgentAdminCount} urgent task(s) require immediate staff action.` : 'Tasks awaiting internal review, countersignature, or reply.'} Click here to open pop-up.`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowAdminActionModal(true); }}
          style={{
            background: urgentAdminCount > 0 ? '#dc2626' : adminActionItems.length > 0 ? '#008744' : '#ffffff',
            color: adminActionItems.length > 0 ? '#ffffff' : '#334155',
            border: adminActionItems.length > 0 ? 'none' : '1px solid #cbd5e1',
            fontWeight: 700,
            fontSize: 12.5,
            padding: '8px 16px',
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
            cursor: 'pointer'
          }}
        >
          {adminActionItems.length > 0 ? <BellRing size={13} /> : <CheckCircle size={13} />}
          {adminActionItems.length > 0 ? 'Open Action Pop-Up' : 'View Queues'}
          <ArrowRight size={13} />
        </button>
      </div>

      {/* ── ACTION REQUIRED POP-UP MODAL (ADMIN) ─────────────────────────────── */}
      {showAdminActionModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1400,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowAdminActionModal(false)}
        >
          <div
            className="modal"
            style={{
              maxWidth: 860,
              width: '100%',
              maxHeight: 'min(90vh, 780px)',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.15)',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: urgentAdminCount > 0
                ? 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #093b3b 0%, #008744 50%, #047857 100%)',
              padding: '22px 28px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  {urgentAdminCount > 0 ? <AlertTriangle size={24} /> : <BellRing size={24} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>
                      Action Required &amp; Operational Triage
                    </h2>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 9px',
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}>
                      {adminActionItems.length === 0 ? '0 Queues Clear' : `${adminActionItems.length} Actions Pending`}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                    {adminActionItems.length === 0
                      ? 'All staff processing queues, countersignatures, logsheets, and support tickets are clear.'
                      : `${urgentAdminCount > 0 ? `${urgentAdminCount} urgent task(s) require immediate staff action.` : 'Tasks awaiting internal review, countersignature, or reply.'}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdminActionModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#ffffff',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter & Search Bar in Modal */}
            {adminActionItems.length > 0 && (
              <div style={{
                padding: '12px 24px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}>
                {/* Search & Timeline Filter Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 200 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search company, app #, timeline status..."
                      value={actionSearchQuery}
                      onChange={e => setActionSearchQuery(e.target.value)}
                      style={{
                        padding: '6px 28px 6px 30px',
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        width: '100%',
                        outline: 'none',
                        fontWeight: 500
                      }}
                    />
                    {actionSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setActionSearchQuery('')}
                        style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Processing Timeline Status Selector */}
                  <div style={{ minWidth: 210 }}>
                    <select
                      value={actionTimelineFilter}
                      onChange={e => setActionTimelineFilter(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontWeight: 600,
                        color: actionTimelineFilter !== 'all' ? '#15803d' : '#0f172a',
                        outline: 'none',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      <option value="all">Timeline: All Stages ({adminActionItems.length})</option>
                      {availableTimelineStages.map(stage => (
                        <option key={stage.status} value={stage.status}>
                          Timeline: {stage.label} ({stage.count})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
                  {[
                    { id: 'all', label: `All (${adminActionItems.length})` },
                    ...(urgentAdminCount > 0 ? [{ id: 'urgent', label: `Urgent (${urgentAdminCount})` }] : []),
                    { id: 'renewals', label: 'Renewals' },
                    { id: 'addons', label: 'Add-Ons' },
                    { id: 'extensions', label: 'Extensions' },
                    { id: 'surveillance', label: 'Surveillance' },
                    { id: 'initial_products', label: 'Initial Products' },
                    { id: 'applications', label: 'New Apps' },
                    { id: 'agreements', label: 'Agmts & Logs' },
                    { id: 'finance', label: 'Finance' },
                    { id: 'tickets', label: 'Support' },
                  ].map(t => {
                    const countForCat = t.id === 'all'
                      ? adminActionItems.length
                      : t.id === 'urgent'
                        ? urgentAdminCount
                        : adminActionItems.filter(i => i.category === t.id || i.appType === t.id).length;
                    if (t.id !== 'all' && t.id !== 'urgent' && countForCat === 0) return null;
                    const displayLabel = (t.id === 'all' || t.id === 'urgent') ? t.label : `${t.label} (${countForCat})`;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActionCategoryTab(t.id)}
                        style={{
                          background: actionCategoryTab === t.id ? '#0f172a' : '#ffffff',
                          color: actionCategoryTab === t.id ? '#ffffff' : '#475569',
                          border: '1px solid',
                          borderColor: actionCategoryTab === t.id ? '#0f172a' : '#cbd5e1',
                          padding: '4px 10px',
                          borderRadius: 16,
                          fontSize: 11,
                          fontWeight: actionCategoryTab === t.id ? 700 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.12s'
                        }}
                      >
                        {displayLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Scrollable Items List */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {adminActionItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle size={28} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    All Queues Clear! Operations are up to date.
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, maxWidth: 440, margin: '6px auto 0' }}>
                    No submitted applications, client-signed agreements, pending logsheet signatures, or open tickets currently require action.
                  </div>
                </div>
              ) : filteredAdminActions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 13.5 }}>
                  No pending action items match the selected filter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredAdminActions.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                        padding: '14px 18px',
                        borderRadius: 12,
                        background: item.urgency === 'urgent' ? '#fffaf9' : '#fcfcfc',
                        border: item.urgency === 'urgent' ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 280 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: item.badgeColor,
                          color: item.badgeTextColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2
                        }}>
                          {item.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 8,
                              background: item.badgeColor,
                              color: item.badgeTextColor,
                              letterSpacing: '0.02em',
                              textTransform: 'uppercase'
                            }}>
                              {item.urgencyLabel}
                            </span>
                            {item.appTypeLabel && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 8,
                                background: item.appTypeBadgeBg || '#f1f5f9',
                                color: item.appTypeBadgeColor || '#334155',
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase',
                                border: `1px solid ${item.appTypeBadgeColor ? item.appTypeBadgeColor + '33' : '#cbd5e1'}`
                              }}>
                                {item.appTypeLabel}
                              </span>
                            )}
                            {item.timelineStage && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                <Clock size={10} style={{ color: '#64748b' }} />
                                Timeline: {item.timelineStage}
                              </span>
                            )}
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                              {item.title}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3, lineHeight: 1.45 }}>
                            {item.description}
                          </div>
                          {item.meta && (
                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, fontWeight: 500 }}>
                              {item.meta}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAdminActionModal(false);
                            navigate(item.actionUrl);
                          }}
                          style={{
                            background: item.urgency === 'urgent' ? '#dc2626' : '#008744',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 12,
                            padding: '8px 16px',
                            borderRadius: 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                            cursor: 'pointer',
                            border: 'none'
                          }}
                        >
                          {item.actionLabel}
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {adminActionItems.length > 0 ? `${adminActionItems.length} operational task(s) currently open` : 'All queues clear'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={fetchData}
                  style={{
                    background: 'transparent',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdminActionModal(false)}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close Pop-Up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Middle Row: Application Pipeline (Left) & Application Statistics (Right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* Card 1 (LEFT): Application Pipeline */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexShrink: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                Application Pipeline
              </div>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {pipelineTotal} items
              </span>
              <span style={{
                background: '#dbeafe', color: '#1d4ed8',
                fontSize: 11, fontWeight: 600, padding: '2px 8px',
                borderRadius: 10, whiteSpace: 'nowrap', flexShrink: 0
              }}>
                Applications &amp; Certificates
              </span>
            </div>
            <Link
              to="/applications"
              style={{ fontSize: 12.5, fontWeight: 700, color: '#008744', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 'auto' }}
            >
              View all <ChevronRight size={13} />
            </Link>
          </div>

          <div style={{ width: '100%', overflowX: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ width: '27%', padding: '10px 12px', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    SITE / COMPANY
                  </th>
                  <th style={{ width: '21%', padding: '10px 8px', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    TYPE
                  </th>
                  <th style={{ width: '30%', padding: '10px 8px', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    STATUS
                  </th>
                  <th style={{ width: '22%', padding: '10px 12px', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>
                    DATE
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>
                      <div className="spinner" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : pipelineList.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: 13.5 }}>
                      No applications yet
                    </td>
                  </tr>
                ) : pipelineList.map((a, idx) => {
                  const siteName = a.establishment_name || a.site_name || 'Main Facility';
                  const companyName = a.profiles?.company_name || a.company_name || a.client_id?.company_name || '';
                  return (
                    <tr
                      key={a._id || idx}
                      onClick={() => navigate(`/applications/${a._id}/processing`)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {siteName}
                        </div>
                        {companyName && (
                          <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                            {companyName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 10, textTransform: 'capitalize', whiteSpace: 'nowrap', display: 'inline-block' }}>
                          {(a.application_type || 'New').replace(/ application$/i, '')}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                        <StatusBadge status={a.status} type={a.application_type} />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 500 }}>
                          {formatDate(a.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2 (RIGHT): Application Statistics */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 22 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Application Statistics
              </div>
              <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3, fontWeight: 500 }}>
                Status distribution of applications
              </div>
            </div>
            <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>
              Total: {totalAppsCount}
            </span>
          </div>

          {/* Section 1: All Applications Progress Bar */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                All Applications
              </span>
              <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>
                Total: {totalAppsCount}
              </span>
            </div>

            {/* Progress track */}
            <div style={{ height: 10, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden', display: 'flex', marginTop: 10 }}>
              <div style={{ width: `${appApprovedPercent}%`, background: '#00c853', transition: 'width 0.3s' }} title={`Accepted: ${acceptedAppsCount}`} />
              <div style={{ width: `${appPendingPercent}%`, background: '#f59e0b', transition: 'width 0.3s' }} title={`Pending: ${pendingAppsCount}`} />
              <div style={{ width: `${appRejectedPercent}%`, background: '#ef4444', transition: 'width 0.3s' }} title={`Rejected: ${rejectedAppsCount}`} />
            </div>

            {/* Legend dots */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, fontSize: 12, color: '#334155' }}>
              <div
                onClick={() => navigate('/applications?status=approved')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                title="View Accepted Applications"
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#00c853', display: 'inline-block' }} />
                <span>Accepted: <span style={{ fontWeight: 700 }}>{acceptedAppsCount}</span></span>
              </div>
              <div
                onClick={() => navigate('/applications?type=new')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                title="View Pending Applications"
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span>Pending: <span style={{ fontWeight: 700 }}>{pendingAppsCount}</span></span>
              </div>
              <div
                onClick={() => navigate('/applications?status=rejected')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                title="View Rejected Applications"
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span>Rejected: <span style={{ fontWeight: 700 }}>{rejectedAppsCount}</span></span>
              </div>
            </div>
          </div>

          {/* Section 2: Certificates Metric Cards */}
          <div style={{ marginTop: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                Certificates
              </span>
              <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>
                Total: {certTotal}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {/* Active Box */}
              <div
                onClick={() => navigate('/certificates?status=active')}
                style={{ background: '#e6f4ea', borderRadius: 12, padding: '16px 12px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                title="View Active Certificates"
              >
                <div style={{ fontSize: 22, fontWeight: 800, color: '#008744' }}>
                  {activeCerts}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#008744', marginTop: 2 }}>
                  Active
                </div>
              </div>

              {/* Pending Review Box */}
              <div
                onClick={() => navigate('/certificates?status=under_review')}
                style={{ background: '#fef8e0', borderRadius: 12, padding: '16px 12px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                title="View Certificates Awaiting Review"
              >
                <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309' }}>
                  {pendingCertsCount}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginTop: 2 }}>
                  Pending Review
                </div>
              </div>

              {/* Expired Box */}
              <div
                onClick={() => navigate('/certificates?status=expired')}
                style={{ background: '#fef2f2', borderRadius: 12, padding: '16px 12px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                title="View Expired Certificates"
              >
                <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c' }}>
                  {expiredCerts}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', marginTop: 2 }}>
                  Expired
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Summary Stats Footer ── */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { 
              label: 'Total Applications', 
              value: totalAppsCount, 
              sub: `${submitted + underReview} pending`, 
              path: '/applications' 
            },
            { 
              label: 'Total Products', 
              value: productsCount, 
              sub: 'Registered in system', 
              path: '/products' 
            },
            { 
              label: 'Total Certificates', 
              value: certTotal, 
              sub: `${activeCerts} active`, 
              path: '/certificates' 
            },
            {
              label: 'Accepted',
              value: acceptedAppsCount,
              sub: `${appApprovedPercent}% success rate`,
              path: '/reports'
            },
          ].map((b, i, arr) => (
            <div
              key={b.label}
              onClick={() => navigate(b.path)}
              style={{
                padding: '24px 24px',
                textAlign: 'center',
                borderRight: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {loading ? '—' : b.value}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 4 }}>{b.label}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', marginTop: 2 }}>{b.sub}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
