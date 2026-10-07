import React, { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Search, Eye, X, Calendar, MoreVertical, CheckCircle, Trash2, ExternalLink, FileSearch, Shield, FileText, ChevronRight, Package, UserCheck, Check, Filter, RefreshCw, Settings, Activity, Download, Receipt, AlertCircle, MapPin, RotateCcw, CreditCard } from 'lucide-react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { STATUS_ORDER, STATUS_LABELS, STATUS_BADGE, getEffectiveApplicationStatus, getApplicationWorkflowInfo } from '../lib/applicationStatuses';
import ProposalModal from '../components/ProposalModal';
import AgreementModal from '../components/AgreementModal';
import CertificateModal from '../components/CertificateModal';
import AuditManageModal from '../components/AuditManageModal';
import InvoiceModal from '../components/InvoiceModal';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal';
import { generateHfaId, normalizeHfaTypeCode } from '../lib/idGenerator';
import Pagination from '../components/Pagination';
import SearchWithSuggestions from '../components/SearchWithSuggestions';
import useCompanyDirectory from '../lib/useCompanyDirectory';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';
import RestoreModal from '../components/RestoreModal';


// STATUS_BADGE and STATUS_LABELS are now imported from applicationStatuses.js
// (kept here as fallback for any old status strings that may appear)
const LEGACY_BADGE = {
  'PROPOSAL SENT': 'badge-purple',
  'PROPOSAL ACCEPTED/REJECTED': 'badge-blue',
  'PROPOSAL REJECTED': 'badge-red',
};

const ALL_STATUSES = [
  'APPLICATION RECEIVED',
  'APPLICATION ACCEPTED/REJECT',
  'PROPOSAL SENT',
  'PROPOSAL ACCEPTED/REJECTED',
  'INVOICE SENT',
  'PAYMENT RECEIVED',
  'PROPOSE AUDIT DATE',
  'AUDIT DATE FINALIZED',
  'ASSIGN AUDITOR',
  'Audit Complete',
  'NC REPORTS',
  'NC REPORTS CLOSED',
  'AUDIT REPORT SUBMITTED',
  'APPLICATION SUCCESSFUL/UNSUCCESSFUL',
  'Create Logsheet',
  'AGREEMENT SENT',
  'SIGNED COPY OF AGREEMENT SENT',
  'AGREEMENT SIGNED COPY RECEIVED',
  'INVOICE FOR FINAL PAYMENT SENT',
  'FINAL PAYMENT RECEIVED',
  'CERTIFICATE PROCESSING',
  'SEND CERTIFICATE'
];

export default function AdminApplications() {
  const { companies: directoryCompanies } = useCompanyDirectory();
  const [apps, setApps] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedApp, setSelectedApp] = useState(null); 
  const [manageModal, setManageModal] = useState(null); 
  const [actionForm, setActionForm] = useState({ status:'', notes:'', inspector_id:'', audit_date:'' });
  const [submitting, setSubmitting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [modalTab, setModalTab] = useState('details');
  const navigate = useNavigate();
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalForm, setProposalForm] = useState({ type: 'upload', title: '', estimated_cost: '', details: '', admin_comment: '', file: null });
  const [existingProposal, setExistingProposal] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ title: '', amount: '', due_date: '', notes: '', file: null, target_status: 'INVOICE SENT' });
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [showInvoicePdf, setShowInvoicePdf] = useState(false);
  const [existingAudit, setExistingAudit] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditForm, setAuditForm] = useState({ dates: ['', '', ''], auditors: [], nc_text: '', nc_file: null });
  const [auditSubmitting, setAuditSubmitting] = useState(false);
  const [auditModalTab, setAuditModalTab] = useState('dates'); // 'dates' or 'nc'
  const [existingAgreement, setExistingAgreement] = useState(null);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementForm, setAgreementForm] = useState({ type: 'upload', title: '', details: '', admin_comment: '', file: null });
  const [agreementSubmitting, setAgreementSubmitting] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateForm, setCertificateForm] = useState({ certificate_type: 'Halal Certification', issue_date: '', expiry_date: '', products_covered: '', certificate_number: '', file: null });
  const [certificateSubmitting, setCertificateSubmitting] = useState(false);
  const [existingCertificate, setExistingCertificate] = useState(null);
  const [restoreModalApp, setRestoreModalApp] = useState(null);

  // Accounts state & modals
  const [invoices, setInvoices] = useState([]);
  const [accountActionFilter, setAccountActionFilter] = useState('all'); // 'all' | 'send_invoice' | 'confirm_payment'
  const [accountsInvoiceModal, setAccountsInvoiceModal] = useState({ isOpen: false, app: null, invoiceType: 'initial' });
  const [accountsPaymentModal, setAccountsPaymentModal] = useState({ isOpen: false, app: null, invoice: null });

  const { user, profile } = useAuth();
  const currentUser = profile || user;
  const isSuperAdmin = currentUser?.role === 'superadmin' || (Array.isArray(currentUser?.roles) && currentUser.roles.includes('superadmin'));
  const hasDonePrivilege = isSuperAdmin || Boolean(currentUser?.can_mark_done);
  const hasChangeStatusPrivilege = isSuperAdmin || Boolean(currentUser?.can_change_application_status);

  // Change Application Status Modal State (Super Grant)
  const [statusChangeModalApp, setStatusChangeModalApp] = useState(null);
  const [selectedTargetStatus, setSelectedTargetStatus] = useState('');
  const [statusChangeNote, setStatusChangeNote] = useState('');
  const [statusChangeConfirming, setStatusChangeConfirming] = useState(false);
  const [statusChangeSubmitting, setStatusChangeSubmitting] = useState(false);
  const [statusSearchQuery, setStatusSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, i, inv] = await Promise.all([
        api.get('/api/applications').catch(() => ({ data: [] })),
        api.get('/api/inspectors').catch(() => ({ data: [] })),
        api.get('/api/invoices').catch(() => ({ data: [] }))
      ]);
      const rawApps = Array.isArray(a) ? a : (Array.isArray(a?.data?.data) ? a.data.data : (Array.isArray(a?.data) ? a.data : []));
      const rawInspectors = Array.isArray(i) ? i : (Array.isArray(i?.data?.data) ? i.data.data : (Array.isArray(i?.data) ? i.data : []));
      const rawInvoices = Array.isArray(inv) ? inv : (Array.isArray(inv?.data?.data) ? inv.data.data : (Array.isArray(inv?.data) ? inv.data : []));
      setApps(rawApps);
      setInspectors(rawInspectors);
      setInvoices(rawInvoices);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkApplicationDone = async (appId, companyName) => {
    if (!window.confirm(`Mark the application for "${companyName}" as Done?`)) return;
    try {
      await api.put(`/api/applications/${appId}/mark-done`);
      toast.success('Application marked as Done');
      setOpenDropdown(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to mark as done');
    }
  };

  const openChangeStatusModal = (app) => {
    setStatusChangeModalApp(app);
    setSelectedTargetStatus(app.status || 'submitted');
    setStatusChangeNote('');
    setStatusChangeConfirming(false);
    setStatusSearchQuery('');
  };

  const closeChangeStatusModal = () => {
    setStatusChangeModalApp(null);
    setSelectedTargetStatus('');
    setStatusChangeNote('');
    setStatusChangeConfirming(false);
    setStatusSearchQuery('');
  };

  const handleConfirmChangeStatus = async () => {
    if (!statusChangeModalApp || !selectedTargetStatus) return;
    setStatusChangeSubmitting(true);
    try {
      const res = await api.put(`/api/applications/${statusChangeModalApp._id}/change-status`, {
        status: selectedTargetStatus,
        note: statusChangeNote,
      });

      const updatedApp = res?.data?.data || res?.data;
      toast.success(res?.data?.message || `Application status changed to ${STATUS_LABELS[selectedTargetStatus] || selectedTargetStatus}`);

      // Immediate local state update for instant UI feedback
      setApps(prev => prev.map(a => (a._id === statusChangeModalApp._id ? { ...a, status: selectedTargetStatus, ...updatedApp } : a)));

      closeChangeStatusModal();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to change application status');
    } finally {
      setStatusChangeSubmitting(false);
    }
  };

  const handleRestoreApplication = (app, companyName) => {
    if (!app) return;
    setRestoreModalApp({
      id: app._id,
      companyName: companyName || app.profiles?.company_name || app.establishment_name || app.company_name || 'Application',
      previous_status: app.previous_status
    });
  };

  const handleConfirmRestoreApplication = async (targetStatus) => {
    if (!restoreModalApp) return;
    try {
      const res = await api.put(`/api/applications/${restoreModalApp.id}/restore`, { targetStatus });
      toast.success(res.data?.message || `Application restored to "${targetStatus}" successfully`);
      setRestoreModalApp(null);
      setOpenDropdown(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to restore application');
      throw err;
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => { 
    fetchData(); 
    
    // Close dropdown when clicking outside
    const handleGlobalClick = () => setOpenDropdown(null);
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setFilterStatus(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const appId = searchParams.get('appId');
    if (appId) {
      navigate(`/applications/${appId}/processing`, { replace: true });
    }
  }, [searchParams, navigate]);

  const typeParam = searchParams.get('type') || (location.pathname.includes('/certified') ? 'certified' : (location.pathname.includes('/accounts') ? 'accounts' : null));
  const isAccountsView = typeParam === 'accounts' || location.pathname.includes('/accounts');
  const isProgressView = typeParam === 'inprogress' || typeParam === 'in_progress' || typeParam === 'renewal';
  const subType = searchParams.get('subType') || null;

  const isTypeRenewal = (t) => {
    if (!t) return false;
    const s = t.toLowerCase().trim();
    return s === 'renewal' || s === 'renewal application' || s.includes('renewal');
  };

  const isTypeSurveillance = (t) => {
    if (!t) return false;
    const s = t.toLowerCase().trim();
    return s === 'surveillance' || s === 'surveillance application' || s.includes('surveillance');
  };

  const isTypeNew = (t) => {
    if (!t) return true;
    const s = t.toLowerCase().trim();
    if (isTypeRenewal(s) || isTypeSurveillance(s)) return false;
    return s === 'new' || s === 'new application' || s === 'standard' || s === 'initial' || s.includes('new');
  };

  // Helper to determine if an application has an Accounts-actionable next step
  const getAccountsActionInfo = (app, allInvoices = []) => {
    if (!app) return null;
    const appId = String(app._id || app.id || '');
    const status = String(app.status || '').toLowerCase().trim();
    const effStatus = String(getEffectiveApplicationStatus(app) || '').toLowerCase().trim();

    const isRenewal = (
      String(app.application_type || '').toLowerCase().includes('renewal') ||
      String(app.type || '').toLowerCase().includes('renewal') ||
      Boolean(app.is_renewal) ||
      Boolean(app.renewed_certificate_id) ||
      String(app.application_number || '').includes('-RE-') ||
      String(app.category || '').toLowerCase().includes('renewal')
    );
    const isSurveillance = (
      String(app.application_type || '').toLowerCase().includes('surveillance') ||
      String(app.type || '').toLowerCase().includes('surveillance') ||
      String(app.application_number || '').includes('-SV-') ||
      String(app.category || '').toLowerCase().includes('surveillance')
    );

    // Linked invoices
    const linkedInvoices = (allInvoices || []).filter(inv => {
      const invAppId = String(inv.application_id?._id || inv.application_id?.id || inv.application_id || '');
      return invAppId && invAppId === appId;
    });

    const clientPaidInvoice = linkedInvoices.find(inv =>
      inv.status === 'client_paid' ||
      Boolean(inv.proof_url || inv.payment_proof)
    );

    // 1. Client submitted payment proof -> Confirm Payment
    if (clientPaidInvoice && clientPaidInvoice.status !== 'paid') {
      const isFinal = clientPaidInvoice.invoice_type === 'final' || clientPaidInvoice.stage === 'final' || clientPaidInvoice.target_status === 'final_invoice_sent' || status === 'final_invoice_sent';
      return {
        type: 'confirm_payment',
        actionLabel: isFinal ? 'Confirm Final Payment' : 'Confirm Payment',
        badgeText: 'Payment Proof Submitted',
        badgeVariant: 'badge-blue',
        desc: `Client uploaded payment proof (£${Number(clientPaidInvoice.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })})`,
        invoice: clientPaidInvoice,
        invoiceType: isFinal ? 'final' : 'initial'
      };
    }

    // 2. Initial Invoice Sent stage -> Awaiting initial payment / Confirm Payment
    if (status === 'invoice_sent' || effStatus === 'invoice_sent') {
      const inv = linkedInvoices.find(i => i.invoice_type !== 'final' && i.stage !== 'final') || linkedInvoices[0];
      const hasProof = inv?.status === 'client_paid' || Boolean(inv?.proof_url || inv?.payment_proof);
      return {
        type: 'confirm_payment',
        actionLabel: 'Confirm Payment',
        badgeText: hasProof ? 'Payment Proof Submitted' : 'Awaiting Payment',
        badgeVariant: hasProof ? 'badge-blue' : 'badge-purple',
        desc: inv?.amount ? `Initial invoice sent (£${Number(inv.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })})` : 'Awaiting client payment confirmation',
        invoice: inv,
        invoiceType: 'initial'
      };
    }

    // 3. Final Invoice Sent stage -> Awaiting final payment / Confirm Final Payment
    if (status === 'final_invoice_sent' || effStatus === 'final_invoice_sent') {
      const inv = linkedInvoices.find(i => i.invoice_type === 'final' || i.stage === 'final') || linkedInvoices[0];
      const hasProof = inv?.status === 'client_paid' || Boolean(inv?.proof_url || inv?.payment_proof);
      return {
        type: 'confirm_payment',
        actionLabel: 'Confirm Final Payment',
        badgeText: hasProof ? 'Final Payment Proof' : 'Awaiting Final Payment',
        badgeVariant: hasProof ? 'badge-blue' : 'badge-purple',
        desc: inv?.amount ? `Final invoice sent (£${Number(inv.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })})` : 'Awaiting client final payment',
        invoice: inv,
        invoiceType: 'final'
      };
    }

    // 4. Send Initial Invoice
    // Proposal accepted / approved (New / Standard applications)
    if (['proposal_approved', 'proposal_accepted'].includes(status) || ['proposal_approved', 'proposal_accepted'].includes(effStatus)) {
      return {
        type: 'send_invoice',
        actionLabel: 'Send Initial Invoice',
        badgeText: 'Send Initial Invoice',
        badgeVariant: 'badge-yellow',
        desc: 'Proposal accepted by client. Ready for initial invoice.',
        invoiceType: 'initial',
        isFinal: false
      };
    }

    // Renewal / Surveillance approved after logsheet signed
    if ((isRenewal || isSurveillance) && (['logsheet_signed', 'application_successful'].includes(status) || ['logsheet_signed', 'application_successful'].includes(effStatus))) {
      return {
        type: 'send_invoice',
        actionLabel: isRenewal ? 'Send Renewal Invoice' : 'Send Surveillance Invoice',
        badgeText: isRenewal ? 'Send Renewal Invoice' : 'Send Surveillance Invoice',
        badgeVariant: 'badge-yellow',
        desc: isRenewal ? 'Renewal approved. Ready for renewal fee invoice.' : 'Surveillance approved. Ready for surveillance invoice.',
        invoiceType: 'initial',
        isFinal: false
      };
    }

    // 5. Send Final Invoice
    // Agreement finalised / countersigned
    if (['agreement_finalised', 'agreement_finalized'].includes(status) || ['agreement_finalised', 'agreement_finalized'].includes(effStatus)) {
      return {
        type: 'send_invoice',
        actionLabel: 'Send Final Invoice',
        badgeText: 'Send Final Invoice',
        badgeVariant: 'badge-yellow',
        desc: 'Final agreement completed. Ready for final certification invoice.',
        invoiceType: 'final',
        isFinal: true
      };
    }

    return null;
  };

  // Applications that have status "Application Submitted" only
  const isSubmittedOnly = (statusStr) => {
    if (!statusStr) return false;
    const s = statusStr.toLowerCase().replace(/ /g, '_');
    return s === 'submitted' || s === 'application_submitted';
  };

  // Applications that HAVE been accepted and certificate has NOT been issued
  const isInProgress = (statusStr) => {
    if (!statusStr) return false;
    const s = statusStr.toLowerCase().replace(/ /g, '_');
    if (s === 'submitted' || s === 'under_review' || s === 'application_received' || s === 'received') return false;
    if (s === 'rejected' || s === 'application_rejected' || s === 'proposal_rejected' || s === 'dates_rejected') return false;
    if (s === 'certificate_issued' || s === 'send_certificate') return false;
    return true;
  };

  const isTerminalStatus = (statusStr) => {
    if (!statusStr) return false;
    const s = statusStr.toLowerCase().replace(/ /g, '_');
    return s === 'certificate_issued' || s === 'send_certificate' || s === 'rejected';
  };

  const isCertifiedStatus = (statusStr) => {
    if (!statusStr) return false;
    const s = statusStr.toLowerCase().replace(/ /g, '_');
    return s === 'certificate_issued' || s === 'send_certificate' || s === 'certificate_processing';
  };

  const safeApps = Array.isArray(apps) ? apps : [];

  // Active company filter: explicit selection or exact typed match
  const activeCompany = useMemo(() => {
    if (selectedCompany) return selectedCompany;
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const exact = directoryCompanies.find(c => c.name.trim().toLowerCase() === q);
    return exact ? exact.name : null;
  }, [selectedCompany, search, directoryCompanies]);

  // Dynamic available sites based on company search (only populated when company is searched)
  const availableSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return []; // Do not show any sites unless a company is searched/picked

    const companySitesMap = new Map();

    if (activeCompany) {
      // EXACT COMPANY SELECTED: Only show sites for THIS specific company!
      const targetLower = activeCompany.trim().toLowerCase();

      // 1. From all companies directory
      directoryCompanies.forEach(c => {
        if (c.name.trim().toLowerCase() === targetLower) {
          (c.sites || []).forEach(s => {
            if (s.name && !companySitesMap.has(s.name.toLowerCase())) {
              companySitesMap.set(s.name.toLowerCase(), { name: s.name, company: c.name });
            }
          });
        }
      });

      // 2. Filter sites to those matching the selected company from loaded applications
      safeApps.forEach(a => {
        const comp = (a.profiles?.company_name || a.company_name || a.establishment_name || '').trim().toLowerCase();
        if (comp === targetLower) {
          const site = a.site_name || a.site_id?.name || a.site?.name || a.establishment_name;
          if (site && !companySitesMap.has(site.toLowerCase())) {
            companySitesMap.set(site.toLowerCase(), { name: site, company: a.company_name || a.profiles?.company_name });
          }
        }
      });
    } else {
      // 1. From all companies directory
      directoryCompanies.forEach(c => {
        if (c.name.toLowerCase().includes(q)) {
          (c.sites || []).forEach(s => {
            if (s.name && !companySitesMap.has(s.name.toLowerCase())) {
              companySitesMap.set(s.name.toLowerCase(), { name: s.name, company: c.name });
            }
          });
        }
      });

      // 2. Filter sites to those matching the searched company from loaded applications
      safeApps.forEach(a => {
        const comp = (a.profiles?.company_name || a.company_name || a.establishment_name || '').toLowerCase();
        if (comp.includes(q)) {
          const site = a.site_name || a.site_id?.name || a.site?.name || a.establishment_name;
          if (site && !companySitesMap.has(site.toLowerCase())) {
            companySitesMap.set(site.toLowerCase(), { name: site, company: a.company_name });
          }
        }
      });
    }

    return Array.from(companySitesMap.values());
  }, [search, activeCompany, directoryCompanies, safeApps]);

  // Automatically reset site filter if search is cleared
  useEffect(() => {
    if (!search.trim() && filterSite) {
      setFilterSite('');
    }
  }, [search, filterSite]);

  // Autocomplete search suggestions (ALL registered companies, sites, and application IDs)
  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const companiesMap = new Map();
    const sitesMap = new Map();
    const appsMap = new Map();

    // 1. ALL registered companies and their sites from directory
    directoryCompanies.forEach(c => {
      if (c.name.toLowerCase().includes(q) && !companiesMap.has(c.name.toLowerCase())) {
        companiesMap.set(c.name.toLowerCase(), {
          label: c.name,
          type: 'Company',
          subtext: `${c.sites?.length || 0} registered site${(c.sites?.length || 0) === 1 ? '' : 's'}`
        });
      }
      (c.sites || []).forEach(s => {
        if (s.name && s.name.toLowerCase().includes(q) && !sitesMap.has(s.name.toLowerCase())) {
          sitesMap.set(s.name.toLowerCase(), {
            label: s.name,
            type: 'Site',
            subtext: c.name
          });
        }
      });
    });

    // 2. Fallback to loaded applications
    safeApps.forEach(a => {
      const comp = a.profiles?.company_name || a.company_name || a.establishment_name;
      if (comp && comp.toLowerCase().includes(q) && !companiesMap.has(comp.toLowerCase())) {
        companiesMap.set(comp.toLowerCase(), {
          label: comp,
          type: 'Company',
          subtext: 'Applicant Company'
        });
      }
      const site = a.site_name || a.site_id?.name || a.site?.name || a.establishment_name;
      if (site && site.toLowerCase().includes(q) && !sitesMap.has(site.toLowerCase())) {
        sitesMap.set(site.toLowerCase(), {
          label: site,
          type: 'Site',
          subtext: comp || 'Facility'
        });
      }
      const appRef = a.hfa_id || a.application_number || a._id;
      if (appRef && String(appRef).toLowerCase().includes(q) && !appsMap.has(String(appRef).toLowerCase())) {
        appsMap.set(String(appRef).toLowerCase(), {
          label: String(appRef),
          type: 'Application',
          subtext: comp || 'Application Ref'
        });
      }
    });

    const matchingCompanies = Array.from(companiesMap.values());
    const matchingSites = Array.from(sitesMap.values());
    const matchingApps = Array.from(appsMap.values());

    return [
      ...matchingCompanies.slice(0, 8),
      ...matchingSites.slice(0, 5),
      ...matchingApps.slice(0, 4)
    ];
  }, [search, directoryCompanies, safeApps]);

  const filtered = safeApps.filter(a => {
    if (!a) return false;
    // 1. View Type Filter
    if (isAccountsView) {
      const accountsAction = getAccountsActionInfo(a, invoices);
      if (!accountsAction) return false;
      if (accountActionFilter === 'send_invoice' && accountsAction.type !== 'send_invoice') return false;
      if (accountActionFilter === 'confirm_payment' && accountsAction.type !== 'confirm_payment') return false;
      // Sub-type filter (New, Renewal, Surveillance)
      if (subType === 'new' && !isTypeNew(a.application_type)) return false;
      if (subType === 'renewal' && !isTypeRenewal(a.application_type)) return false;
      if (subType === 'surveillance' && !isTypeSurveillance(a.application_type)) return false;
    } else if (typeParam === 'new') {
      // New Applications view: show all applications that the application status is in application submitted only
      if (!isSubmittedOnly(a.status)) return false;
      // Sub-type filter (New, Renewal, Surveillance)
      if (subType === 'new' && !isTypeNew(a.application_type)) return false;
      if (subType === 'renewal' && !isTypeRenewal(a.application_type)) return false;
      if (subType === 'surveillance' && !isTypeSurveillance(a.application_type)) return false;
    } else if (isProgressView) {
      // In-Progress Applications view: applications that have been accepted and not certified yet
      if (!isInProgress(a.status)) return false;
      // Sub-type filter (New, Renewal, Surveillance)
      if (subType === 'new' && !isTypeNew(a.application_type)) return false;
      if (subType === 'renewal' && !isTypeRenewal(a.application_type)) return false;
      if (subType === 'surveillance' && !isTypeSurveillance(a.application_type)) return false;
    } else if (typeParam === 'certified') {
      // Certified Applications view: show only certified applications
      if (!isCertifiedStatus(a.status)) return false;
    } else if (typeParam === 'surveillance') {
      if (!isTypeSurveillance(a.application_type)) return false;
    }

    // 2. Search / Company Filter
    if (activeCompany) {
      const comp = (a.profiles?.company_name || a.company_name || a.establishment_name || '').trim().toLowerCase();
      if (comp !== activeCompany.trim().toLowerCase()) {
        return false;
      }
    } else if (search.trim()) {
      const q = search.toLowerCase();
      const matchSearch = 
        a.application_number?.toLowerCase().includes(q) || 
        a.profiles?.company_name?.toLowerCase().includes(q) ||
        a.establishment_name?.toLowerCase().includes(q) ||
        (a.site_name || a.site_id?.name || a.site?.name || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // 3. Dropdown Status Filter
    const matchStatus = !filterStatus || a.status === filterStatus;

    // 4. Site Filter
    const appSite = (a.site_name || a.site_id?.name || a.site?.name || a.establishment_name || '').toLowerCase();
    const matchSite = !filterSite || appSite === filterSite.toLowerCase();

    return matchStatus && matchSite;
  });

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterSite, typeParam, subType, accountActionFilter]);

  const paginatedApps = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Dynamic counts for the 3 sub-type buttons (New, Renewal, Surveillance)
  const { newCount, renewalCount, surveillanceCount, totalViewCount } = useMemo(() => {
    let baseApps = [];
    if (isAccountsView) {
      baseApps = safeApps.filter(a => {
        const info = getAccountsActionInfo(a, invoices);
        if (!info) return false;
        if (accountActionFilter === 'send_invoice') return info.type === 'send_invoice';
        if (accountActionFilter === 'confirm_payment') return info.type === 'confirm_payment';
        return true;
      });
    } else if (typeParam === 'new') {
      baseApps = safeApps.filter(a => isSubmittedOnly(a?.status));
    } else if (isProgressView) {
      baseApps = safeApps.filter(a => isInProgress(a?.status));
    }

    return {
      newCount: baseApps.filter(a => isTypeNew(a?.application_type)).length,
      renewalCount: baseApps.filter(a => isTypeRenewal(a?.application_type)).length,
      surveillanceCount: baseApps.filter(a => isTypeSurveillance(a?.application_type)).length,
      totalViewCount: baseApps.length
    };
  }, [safeApps, typeParam, isProgressView, isAccountsView, invoices, accountActionFilter]);

  // Accounts Action specific counts
  const { accountsSendInvoiceCount, accountsConfirmPaymentCount, accountsTotalCount } = useMemo(() => {
    const allAccounts = safeApps.filter(a => Boolean(getAccountsActionInfo(a, invoices)));
    return {
      accountsSendInvoiceCount: allAccounts.filter(a => getAccountsActionInfo(a, invoices)?.type === 'send_invoice').length,
      accountsConfirmPaymentCount: allAccounts.filter(a => getAccountsActionInfo(a, invoices)?.type === 'confirm_payment').length,
      accountsTotalCount: allAccounts.length
    };
  }, [safeApps, invoices]);

  const handleSubTypeClick = (clickedType) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (subType === clickedType) {
        next.delete('subType');
      } else {
        next.set('subType', clickedType);
      }
      return next;
    });
    setPage(1);
  };

  const getPageTitleAndSub = () => {
    if (isAccountsView) {
      let subText = 'Applications where the next action is to send invoice or confirm payment';
      if (accountActionFilter === 'send_invoice') subText = 'Applications awaiting invoice issuance (Initial, Renewal, Surveillance, or Final)';
      if (accountActionFilter === 'confirm_payment') subText = 'Applications awaiting payment receipt or verification of client payment proof';
      return {
        title: 'Accounts Applications',
        sub: subText
      };
    }
    if (typeParam === 'new') {
      let subText = 'Applications with status Application Submitted';
      if (subType === 'new') subText = 'New certification applications with status Application Submitted';
      if (subType === 'renewal') subText = 'Renewal applications with status Application Submitted';
      if (subType === 'surveillance') subText = 'Surveillance applications with status Application Submitted';
      return {
        title: 'New Applications',
        sub: subText
      };
    }
    if (isProgressView) {
      let subText = 'Accepted applications currently undergoing certification and compliance review';
      if (subType === 'new') subText = 'Accepted new certification applications undergoing certification and compliance review';
      if (subType === 'renewal') subText = 'Accepted renewal applications undergoing certification and compliance review';
      if (subType === 'surveillance') subText = 'Accepted surveillance applications undergoing certification and compliance review';
      return {
        title: 'In-Progress Applications',
        sub: subText
      };
    }
    if (typeParam === 'certified') {
      return {
        title: 'Certified Applications',
        sub: 'Applications that have successfully completed certification and been issued certificates'
      };
    }
    if (typeParam === 'surveillance') {
      return {
        title: 'Surveillance Applications',
        sub: 'Ongoing surveillance and compliance review applications'
      };
    }
    return {
      title: 'All Applications',
      sub: 'All certification applications submitted across all stages and history'
    };
  };

  const pageMeta = getPageTitleAndSub();

  const handleUpdateStatus = async (appId, data) => {
    setSubmitting(true);
    try {
      await api.put(`/api/applications/${appId}/status`, data);
      toast.success('Status updated successfully');
      setManageModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application? This cannot be undone.')) return;
    try {
      await api.delete(`/api/applications/${id}`);
      toast.success('Application deleted');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const markAsDone = async (app) => {
    if (!window.confirm(`Mark ${app.application_number} as Accepted / Processing Done?`)) return;
    await handleUpdateStatus(app._id, { status: 'approved', notes: 'Application review completed. Status updated to Accepted.' });
  };

  return (
    <div className="page-content">

      <div className="toolbar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchWithSuggestions
          value={search}
          onChange={val => {
            setSearch(val);
            if (selectedCompany && val.trim().toLowerCase() !== selectedCompany.trim().toLowerCase()) {
              setSelectedCompany(null);
            }
            setPage(1);
          }}
          onSelect={item => {
            if (item.type === 'Company') {
              setSelectedCompany(item.label);
              setSearch(item.label);
            } else {
              setSelectedCompany(null);
              setSearch(item.label);
            }
            setPage(1);
          }}
          suggestions={searchSuggestions}
          placeholder="Search by app no. or client..."
        />

        {/* Filter by Site (dynamically narrowed to searched company) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={15} style={{ color: search.trim() ? 'var(--primary, #2563eb)' : '#94a3b8' }} />
          <select
            className="form-control"
            style={{ 
              width: 240, 
              minWidth: 240,
              maxWidth: 240,
              fontWeight: 600,
              backgroundColor: search.trim() ? '#ffffff' : '#f8fafc',
              cursor: search.trim() ? 'pointer' : 'not-allowed',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}
            value={filterSite}
            disabled={!search.trim()}
            onChange={e => {
              setFilterSite(e.target.value);
              setPage(1);
            }}
          >
            {!search.trim() ? (
              <option value="">Select a company first to filter sites</option>
            ) : availableSites.length === 0 ? (
              <option value="">No sites found for "{search.trim()}"</option>
            ) : (
              <>
                <option value="">
                  {`All Sites for "${search.trim()}" (${availableSites.length})`}
                </option>
                {availableSites.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </>
            )}
          </select>
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
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} applications</span>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="card-title">{pageMeta.title}</div>
            <div className="card-subtitle">{pageMeta.sub}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Accounts Quick Action Filters */}
            {isAccountsView && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#f8fafc',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                gap: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => { setAccountActionFilter('all'); setPage(1); }}
                  style={{
                    padding: '5px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: accountActionFilter === 'all' ? '#0f766e' : '#ffffff',
                    color: accountActionFilter === 'all' ? '#ffffff' : '#334155',
                    boxShadow: accountActionFilter === 'all' ? '0 1px 3px rgba(15,118,110,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                    border: accountActionFilter === 'all' ? '1px solid #0f766e' : '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Show all actionable Accounts applications"
                >
                  <span>All Accounts</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: accountActionFilter === 'all' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: accountActionFilter === 'all' ? '#ffffff' : '#475569',
                    fontWeight: 800
                  }}>
                    {accountsTotalCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setAccountActionFilter('send_invoice'); setPage(1); }}
                  style={{
                    padding: '5px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: accountActionFilter === 'send_invoice' ? '#854d0e' : '#ffffff',
                    color: accountActionFilter === 'send_invoice' ? '#ffffff' : '#334155',
                    boxShadow: accountActionFilter === 'send_invoice' ? '0 1px 3px rgba(133,77,14,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                    border: accountActionFilter === 'send_invoice' ? '1px solid #854d0e' : '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Filter to applications where next action is Send Invoice"
                >
                  <Receipt size={13} />
                  <span>Send Invoice</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: accountActionFilter === 'send_invoice' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: accountActionFilter === 'send_invoice' ? '#ffffff' : '#475569',
                    fontWeight: 800
                  }}>
                    {accountsSendInvoiceCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setAccountActionFilter('confirm_payment'); setPage(1); }}
                  style={{
                    padding: '5px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: accountActionFilter === 'confirm_payment' ? '#16a34a' : '#ffffff',
                    color: accountActionFilter === 'confirm_payment' ? '#ffffff' : '#334155',
                    boxShadow: accountActionFilter === 'confirm_payment' ? '0 1px 3px rgba(22,163,74,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                    border: accountActionFilter === 'confirm_payment' ? '1px solid #16a34a' : '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Filter to applications where next action is Confirm Payment"
                >
                  <CreditCard size={13} />
                  <span>Confirm Payment</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: accountActionFilter === 'confirm_payment' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: accountActionFilter === 'confirm_payment' ? '#ffffff' : '#475569',
                    fontWeight: 800
                  }}>
                    {accountsConfirmPaymentCount}
                  </span>
                </button>
              </div>
            )}

            {/* Sub-type buttons (New, Renewal, Surveillance) */}
            {(typeParam === 'new' || isProgressView || isAccountsView) && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#f8fafc',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                gap: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => handleSubTypeClick('new')}
                  style={{
                    padding: '5px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: subType === 'new' ? '#047857' : '#ffffff',
                    color: subType === 'new' ? '#ffffff' : '#334155',
                    boxShadow: subType === 'new' ? '0 1px 3px rgba(4,120,87,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                    border: subType === 'new' ? '1px solid #047857' : '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Filter by New Applications (click to toggle)"
                >
                  <span>New</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: subType === 'new' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: subType === 'new' ? '#ffffff' : '#475569',
                    fontWeight: 800
                  }}>
                    {newCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSubTypeClick('renewal')}
                  style={{
                    padding: '5px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: subType === 'renewal' ? '#047857' : '#ffffff',
                    color: subType === 'renewal' ? '#ffffff' : '#334155',
                    boxShadow: subType === 'renewal' ? '0 1px 3px rgba(4,120,87,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                    border: subType === 'renewal' ? '1px solid #047857' : '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Filter by Renewal Applications (click to toggle)"
                >
                  <span>Renewal</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: subType === 'renewal' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: subType === 'renewal' ? '#ffffff' : '#475569',
                    fontWeight: 800
                  }}>
                    {renewalCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSubTypeClick('surveillance')}
                  style={{
                    padding: '5px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: subType === 'surveillance' ? '#047857' : '#ffffff',
                    color: subType === 'surveillance' ? '#ffffff' : '#334155',
                    boxShadow: subType === 'surveillance' ? '0 1px 3px rgba(4,120,87,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                    border: subType === 'surveillance' ? '1px solid #047857' : '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Filter by Surveillance Applications (click to toggle)"
                >
                  <span>Surveillance</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: subType === 'surveillance' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: subType === 'surveillance' ? '#ffffff' : '#475569',
                    fontWeight: 800
                  }}>
                    {surveillanceCount}
                  </span>
                </button>
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={fetchData} title="Refresh"><RefreshCw size={13}/></button>
          </div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner"/></div>
          ) : (
            <table>
              <thead><tr>
                <th style={{ width: 50, textAlign: 'center' }}>S/N</th>
                <th>Company Name</th>
                <th>Primary Contact</th>
                <th>Site Name</th>
                <th>Type &amp; Category</th>
                <th>Date</th>
                <th>Status</th>
                {isAccountsView && <th style={{ minWidth: 180 }}>Accounts Action</th>}
                <th style={{ textAlign: 'center', minWidth: isAccountsView ? 140 : 80 }}>Actions</th>
              </tr></thead>
              <tbody>
                {paginatedApps.map((app, index) => {
                  const accountsAction = isAccountsView ? getAccountsActionInfo(app, invoices) : null;
                  return (
                  <tr key={app._id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13 }}>
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td style={{fontWeight: 700, color: '#0f172a', fontSize: 13.5}}>
                      <div>{app.profiles?.company_name || app.company_name || app.establishment_name || 'Company Facility'}</div>
                    </td>
                    <td>
                      <div style={{fontWeight:600,fontSize:13}}>{app.profiles?.full_name || app.managing_director || '—'}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{app.profiles?.email || '—'}</div>
                    </td>
                    <td style={{fontSize:12}}>{app.site_name || app.site_id?.name || app.site?.name || app.establishment_name || '—'}</td>
                    <td>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--primary)',textTransform:'uppercase',marginBottom:2}}>{app.application_type}</div>
                      <div style={{fontSize:12,color:'var(--text-muted)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{app.category}</div>
                    </td>
                    <td style={{fontSize:12}}>{new Date(app.submission_date || app.created_at || app.createdAt || Date.now()).toLocaleDateString('en-GB')}</td>
                    <td style={{textAlign:'center'}}>
                      {(() => {
                        const effStatus = getEffectiveApplicationStatus(app);
                        const isRenewal = (app.application_type || '').toLowerCase() === 'renewal' || (app.application_type || '').toLowerCase() === 'surveillance';
                        const label = (effStatus === 'payment_received' && isRenewal)
                          ? 'Renewal Fee Paid'
                          : (STATUS_LABELS[effStatus] || effStatus?.replace(/_/g, ' '));
                        return (
                          <span className={`badge ${STATUS_BADGE[effStatus] || LEGACY_BADGE[effStatus] || 'badge-gray'}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    {isAccountsView && (
                      <td>
                        {accountsAction ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <span className={`badge ${accountsAction.badgeVariant}`} style={{ fontSize: 11, fontWeight: 700 }}>
                                {accountsAction.badgeText}
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.25 }}>
                              {accountsAction.desc}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                    )}
                    <td style={{textAlign:'center', position:'relative'}}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        {isAccountsView && accountsAction?.type === 'send_invoice' && (
                          <button
                            type="button"
                            className="action-btn action-btn-accounts-inv"
                            onClick={() => setAccountsInvoiceModal({
                              isOpen: true,
                              app,
                              invoiceType: accountsAction.invoiceType
                            })}
                            title={accountsAction.actionLabel}
                          >
                            <Receipt size={13} />
                            <span>Send Invoice</span>
                          </button>
                        )}
                        {isAccountsView && accountsAction?.type === 'confirm_payment' && (
                          <button
                            type="button"
                            className="action-btn action-btn-accounts-pay"
                            onClick={() => setAccountsPaymentModal({
                              isOpen: true,
                              app,
                              invoice: accountsAction.invoice
                            })}
                            title={accountsAction.actionLabel}
                          >
                            <CreditCard size={13} />
                            <span>Confirm Payment</span>
                          </button>
                        )}
                        <ActionTriggerButton
                          onClick={() => setOpenDropdown(app._id)}
                          title="Application Actions"
                        />
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-title">No Applications Found</div>
              <div className="empty-state-text">No applications match your current search or filter.</div>
            </div>
          )}
        </div>

        <Pagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="applications"
        />
      </div>

      {/* Action Menu Pop-up Modal */}
      {openDropdown && (() => {
        const app = apps.find(a => a._id === openDropdown);
        if (!app) return null;
        const effStatus = getEffectiveApplicationStatus(app);
        const companyName = app.profiles?.company_name || app.establishment_name || app.company_name || 'Company Facility';
        const isDone = app.status === 'done';
        const accountsAction = getAccountsActionInfo(app, invoices);

        const actions = [];

        // Direct accounts action if applicable
        if (accountsAction?.type === 'send_invoice') {
          actions.push({
            label: accountsAction.actionLabel,
            description: accountsAction.desc || 'Issue certification or fee invoice to client',
            icon: Receipt,
            variant: 'primary',
            onClick: () => {
              setOpenDropdown(null);
              setAccountsInvoiceModal({
                isOpen: true,
                app,
                invoiceType: accountsAction.invoiceType
              });
            }
          });
        } else if (accountsAction?.type === 'confirm_payment') {
          actions.push({
            label: accountsAction.actionLabel,
            description: accountsAction.desc || 'Verify and confirm receipt of client payment',
            icon: CreditCard,
            variant: 'success',
            onClick: () => {
              setOpenDropdown(null);
              setAccountsPaymentModal({
                isOpen: true,
                app,
                invoice: accountsAction.invoice
              });
            }
          });
        }

        actions.push({
          label: 'Application Processing',
          description: 'Open full application processing workflow & timeline',
          icon: Settings,
          variant: 'secondary',
          onClick: () => {
            setOpenDropdown(null);
            navigate(`/applications/${app._id}/processing`);
          }
        });

        if (hasChangeStatusPrivilege) {
          actions.push({
            label: 'Change Status',
            description: 'Super Grant: Manually change application status',
            icon: RefreshCw,
            variant: 'warning',
            onClick: () => {
              setOpenDropdown(null);
              openChangeStatusModal(app);
            }
          });
        }

        if (hasDonePrivilege && !isDone) {
          actions.push({
            label: 'Mark as Done',
            description: 'Mark this application as completed / Done',
            icon: CheckCircle,
            variant: 'success',
            onClick: () => {
              setOpenDropdown(null);
              handleMarkApplicationDone(app._id, companyName);
            }
          });
        }

        if (hasDonePrivilege && isDone) {
          actions.push({
            label: 'Restore Application',
            description: 'Restore this application back to active status',
            icon: RotateCcw,
            variant: 'warning',
            onClick: () => {
              setOpenDropdown(null);
              handleRestoreApplication(app, companyName);
            }
          });
        }

        return (
          <ActionModal
            isOpen={Boolean(openDropdown)}
            onClose={() => setOpenDropdown(null)}
            title="Application Actions"
            subtitle={companyName}
            badge={`Status: ${STATUS_LABELS[effStatus] || effStatus?.replace(/_/g, ' ')}`}
            badgeVariant={STATUS_BADGE[effStatus] || 'badge-blue'}
            actions={actions}
          />
        );
      })()}

      {/* Super Grant: Change Application Status Modal */}
      {statusChangeModalApp && (() => {
        const app = statusChangeModalApp;
        const currentEffStatus = app.status || 'submitted';
        const companyName = app.profiles?.company_name || app.establishment_name || app.company_name || 'Company Facility';
        const workflowInfo = getApplicationWorkflowInfo(app);
        const statusLabels = workflowInfo.labels || STATUS_LABELS;
        const allStatusOptions = Array.from(new Set([...workflowInfo.statuses, currentEffStatus, 'done']));
        const filteredStatuses = allStatusOptions.filter(s => {
          if (!statusSearchQuery.trim()) return true;
          const q = statusSearchQuery.toLowerCase();
          const label = (statusLabels[s] || STATUS_LABELS[s] || '').toLowerCase();
          return s.toLowerCase().includes(q) || label.includes(q);
        });

        const isUnchanged = selectedTargetStatus === currentEffStatus;

        return (
          <div
            className="modal-overlay"
            style={{
              zIndex: 1400,
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16
            }}
            onClick={closeChangeStatusModal}
          >
            <div
              className="modal"
              style={{
                maxWidth: 640,
                width: '100%',
                borderRadius: 18,
                overflow: 'hidden',
                padding: 0,
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #e2e8f0',
                background: '#ffffff'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                  borderBottom: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: '#d97706',
                        color: '#ffffff',
                        fontSize: 10.5,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 6,
                        letterSpacing: '0.04em'
                      }}
                    >
                      Super Grant
                    </span>
                    <span
                      style={{
                        background: workflowInfo.badgeBg,
                        color: workflowInfo.badgeColor,
                        border: `1px solid ${workflowInfo.badgeBorder}`,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 9px',
                        borderRadius: 6
                      }}
                    >
                      {workflowInfo.workflowName}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                      App #{app.application_number}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#78350f', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RefreshCw size={19} style={{ color: '#d97706' }} />
                    Change Application Status
                  </h3>
                  <div style={{ fontSize: 13, color: '#92400e', marginTop: 3, fontWeight: 500 }}>
                    {companyName} {app.establishment_name && app.establishment_name !== companyName ? `· ${app.establishment_name}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeChangeStatusModal}
                  style={{
                    border: 'none',
                    background: '#fde68a',
                    color: '#78350f',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <X size={17} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Current Status Pill */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                      Current Application Status
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                      {statusLabels[currentEffStatus] || STATUS_LABELS[currentEffStatus] || currentEffStatus}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[currentEffStatus] || 'badge-gray'}`} style={{ fontSize: 12, padding: '4px 10px' }}>
                    {currentEffStatus}
                  </span>
                </div>

                {!statusChangeConfirming ? (
                  /* Step 1: Select Status */
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                        Select Desired Status for {workflowInfo.workflowName} <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      
                      {/* Search Filter for Statuses */}
                      <div style={{ position: 'relative', marginBottom: 10 }}>
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          type="text"
                          className="form-control"
                          placeholder={`Filter ${workflowInfo.workflowName} statuses...`}
                          value={statusSearchQuery}
                          onChange={e => setStatusSearchQuery(e.target.value)}
                          style={{ paddingLeft: 34, fontSize: 13, height: 38 }}
                        />
                        {statusSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setStatusSearchQuery('')}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Status List */}
                      <div
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          maxHeight: 250,
                          overflowY: 'auto',
                          background: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1
                        }}
                      >
                        {filteredStatuses.length === 0 ? (
                          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                            No matching statuses found for "{statusSearchQuery}"
                          </div>
                        ) : (
                          filteredStatuses.map(s => {
                            const isSelected = selectedTargetStatus === s;
                            const isCurrent = currentEffStatus === s;
                            const label = statusLabels[s] || STATUS_LABELS[s] || s.replace(/_/g, ' ');
                            const badgeClass = STATUS_BADGE[s] || 'badge-gray';

                            return (
                              <div
                                key={s}
                                onClick={() => setSelectedTargetStatus(s)}
                                style={{
                                  padding: '10px 14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  cursor: 'pointer',
                                  background: isSelected ? '#fffbeb' : '#ffffff',
                                  borderLeft: isSelected ? '4px solid #d97706' : '4px solid transparent',
                                  borderBottom: '1px solid #f1f5f9',
                                  transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={e => {
                                  if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                                }}
                                onMouseLeave={e => {
                                  if (!isSelected) e.currentTarget.style.background = '#ffffff';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                  <div
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: '50%',
                                      border: isSelected ? '5px solid #d97706' : '2px solid #cbd5e1',
                                      background: '#ffffff',
                                      flexShrink: 0,
                                      boxSizing: 'border-box',
                                      transition: 'all 0.15s ease'
                                    }}
                                  />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: isSelected ? 800 : 600, color: isSelected ? '#78350f' : '#1e293b' }}>
                                      {label}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                      Key: <code style={{ fontSize: 10.5, background: '#f1f5f9', padding: '1px 4px', borderRadius: 4 }}>{s}</code>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                  {isCurrent && (
                                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                                      Current
                                    </span>
                                  )}
                                  <span className={`badge ${badgeClass}`} style={{ fontSize: 10.5, padding: '2px 8px' }}>
                                    {label}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Showing {filteredStatuses.length} of {allStatusOptions.length} statuses in this workflow</span>
                        {selectedTargetStatus && (
                          <span style={{ fontWeight: 600, color: '#d97706' }}>
                            Selected: {statusLabels[selectedTargetStatus] || STATUS_LABELS[selectedTargetStatus] || selectedTargetStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Optional Reason / Audit Note */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                        Reason / Audit Note <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>(Optional — recorded in status history)</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="e.g. Manually overridden per scheme manager request; advancing workflow after manual verification..."
                        value={statusChangeNote}
                        onChange={e => setStatusChangeNote(e.target.value)}
                        style={{ fontSize: 12.5 }}
                      />
                    </div>
                  </>
                ) : (
                  /* Step 2: Confirmation Screen */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div
                      style={{
                        padding: '14px 16px',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12
                      }}
                    >
                      <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#92400e' }}>
                          Confirmation Required
                        </div>
                        <div style={{ fontSize: 12.5, color: '#78350f', marginTop: 3, lineHeight: 1.5 }}>
                          You are about to exercise your <strong>Super Grant Privilege</strong> to manually change the application status for <strong>{workflowInfo.workflowName}</strong>. This change will immediately update client timeline tracking and application state.
                        </div>
                      </div>
                    </div>

                    {/* Transition Comparison Box */}
                    <div
                      style={{
                        padding: 18,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        gap: 12
                      }}
                    >
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                          From
                        </div>
                        <span className={`badge ${STATUS_BADGE[currentEffStatus] || 'badge-gray'}`} style={{ fontSize: 12, padding: '5px 12px' }}>
                          {statusLabels[currentEffStatus] || STATUS_LABELS[currentEffStatus] || currentEffStatus}
                        </span>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                          <code>{currentEffStatus}</code>
                        </div>
                      </div>

                      <div style={{ fontSize: 24, fontWeight: 900, color: '#d97706' }}>
                        ➔
                      </div>

                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                          To
                        </div>
                        <span className={`badge ${STATUS_BADGE[selectedTargetStatus] || 'badge-gray'}`} style={{ fontSize: 12, padding: '5px 12px' }}>
                          {statusLabels[selectedTargetStatus] || STATUS_LABELS[selectedTargetStatus] || selectedTargetStatus}
                        </span>
                        <div style={{ fontSize: 11, color: '#d97706', marginTop: 4, fontWeight: 700 }}>
                          <code>{selectedTargetStatus}</code>
                        </div>
                      </div>
                    </div>

                    {/* Note Preview if entered */}
                    {statusChangeNote.trim() && (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                          Audit Trail Note:
                        </div>
                        <div style={{ fontSize: 12.5, color: '#1e293b', marginTop: 3, fontStyle: 'italic' }}>
                          "{statusChangeNote.trim()}"
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '16px 24px',
                  background: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                {!statusChangeConfirming ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={closeChangeStatusModal}
                      style={{ fontSize: 13 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!selectedTargetStatus || isUnchanged}
                      onClick={() => setStatusChangeConfirming(true)}
                      style={{
                        background: isUnchanged
                          ? '#cbd5e1'
                          : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        borderColor: '#b45309',
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 700,
                        padding: '9px 20px',
                        cursor: isUnchanged ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isUnchanged ? 'Select a New Status' : 'Proceed to Confirmation →'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setStatusChangeConfirming(false)}
                      disabled={statusChangeSubmitting}
                      style={{ fontSize: 13 }}
                    >
                      ← Back to Status List
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConfirmChangeStatus}
                      disabled={statusChangeSubmitting}
                      style={{
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        borderColor: '#047857',
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 800,
                        padding: '9px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {statusChangeSubmitting ? (
                        <>
                          <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                          Updating Status...
                        </>
                      ) : (
                        <>
                          <Check size={16} /> Confirm &amp; Apply Status Change
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}


      {/* View Details Modal */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal modal-glass" style={{ maxWidth: 1000 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'transparent' }}>
              <div>
                <h2 className="modal-title" style={{ fontSize: 24 }}>{selectedApp.profiles?.company_name || selectedApp.establishment_name || selectedApp.company_name || 'Company Facility'}</h2>
                <div className="text-sm text-muted">Submitted on {new Date(selectedApp.created_at).toLocaleString('en-GB')}</div>
              </div>
              <button className="modal-close" onClick={() => setSelectedApp(null)}><X size={24}/></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '0 32px 32px' }}>
              <div className="grid grid-cols-12 gap-6">
                {/* Profile Card */}
                <div className="col-span-8">
                  <div className="detail-card mb-6">
                    <h4 className="section-title"><Shield size={18}/> Company Info</h4>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                      <div className="detail-item">
                        <label>Registered Company</label>
                        <div style={{ fontSize: 16 }}>{selectedApp.profiles?.company_name || selectedApp.establishment_name || '—'}</div>
                        <div className="text-sm text-muted">{selectedApp.profiles?.full_name || 'No contact name'}</div>
                      </div>
                      <div className="detail-item">
                        <label>Application Type</label>
                        <div className="capitalize">{selectedApp.application_type} Certification</div>
                      </div>
                      <div className="detail-item">
                        <label>Establishment</label>
                        <div>{selectedApp.establishment_name}</div>
                        <div className="text-sm font-normal text-muted">{selectedApp.establishment_address}</div>
                      </div>
                      <div className="detail-item">
                        <label>Operational Stats</label>
                        <div>{selectedApp.employee_count} Employees</div>
                        {selectedApp.production_schedule && (
                          <div className="text-xs font-normal">Schedule: {selectedApp.production_schedule}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="detail-card">
                    <h4 className="section-title"><Package size={18}/> Product List</h4>
                    <div className="table-wrap" style={{ border: '1px solid #f1f5f9', borderRadius: 12 }}>
                      <table className="table-sm">
                        <thead style={{ background: '#f8fafc' }}>
                          <tr>
                            <th style={{ width: 44, textAlign: 'center' }}>S/N</th>
                            <th>Product Name</th>
                            <th>Brand / Label</th>
                            <th className="text-right">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedApp.products || []).map((p, idx) => (
                            <tr key={idx}>
                              <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>{idx + 1}</td>
                              <td className="font-bold">{p.name}</td>
                              <td>{p.brand}</td>
                              <td className="text-right text-muted">{p.category || 'General'}</td>
                            </tr>
                          ))}
                          {(!selectedApp.products || selectedApp.products.length === 0) && (
                            <tr><td colSpan="4" className="text-center py-8 opacity-40 italic">No products submitted with this application</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="col-span-4">
                  <div className="detail-card mb-6" style={{ background: '#111827', color: 'white' }}>
                    <h4 className="section-title" style={{ color: '#86efac', borderColor: 'rgba(255,255,255,0.1)' }}><UserCheck size={18}/> Key Contacts</h4>
                    <div className="space-y-4">
                      <div className="detail-item">
                        <label style={{ color: 'rgba(255,255,255,0.5)' }}>Halal Coordinator</label>
                        <div style={{ color: 'white' }}>{selectedApp.halal_coordinator || '—'}</div>
                      </div>
                      <div className="detail-item">
                        <label style={{ color: 'rgba(255,255,255,0.5)' }}>QA Manager</label>
                        <div style={{ color: 'white' }}>{selectedApp.qa_contact || '—'}</div>
                      </div>
                      <div className="detail-item">
                        <label style={{ color: 'rgba(255,255,255,0.5)' }}>Finance Contact</label>
                        <div style={{ color: 'white' }}>{selectedApp.finance_contact || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {selectedApp.notes && (
                    <div className="detail-card mb-6">
                      <h4 className="section-title"><FileText size={18}/> Additional Notes</h4>
                      <div style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {selectedApp.notes}
                      </div>
                    </div>
                  )}

                  <div className="detail-card mb-6">
                    <h4 className="section-title"><FileText size={18}/> Documents</h4>
                    <div className="space-y-3">
                      {selectedApp.documents && Object.entries(selectedApp.documents).map(([key, url]) => (
                        url && typeof url === 'string' && (
                          <a key={key} href={getPdfUrl(url)} target="_blank" rel="noreferrer" className="doc-link">
                            <FileText size={18} />
                            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                          </a>
                        )
                      ))}
                    </div>
                  </div>

                  <div className="detail-card" style={{ background: '#fffbeb', borderColor: '#fef3c7' }}>
                    <h4 className="section-title" style={{ color: '#92400e', borderColor: '#fde68a' }}><Shield size={18}/> Compliance</h4>
                    <div className="space-y-4">
                      <div className={`flex items-center gap-2 font-bold ${selectedApp.has_porcine ? 'text-red' : 'text-green'}`}>
                        {selectedApp.has_porcine ? <X size={16}/> : <Check size={16}/>}
                        Porcine Handling: {selectedApp.has_porcine ? 'YES' : 'NO'}
                      </div>
                      <div className={`flex items-center gap-2 font-bold ${selectedApp.has_intoxicants ? 'text-red' : 'text-green'}`}>
                        {selectedApp.has_intoxicants ? <X size={16}/> : <Check size={16}/>}
                        Intoxicants: {selectedApp.has_intoxicants ? 'YES' : 'NO'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ background: '#f8fafc' }}>
              <button className="btn btn-ghost" onClick={() => setSelectedApp(null)}>Dismiss</button>
              <button className="btn btn-primary" onClick={() => {
                const appId = selectedApp?._id || selectedApp?.id;
                setSelectedApp(null);
                if (appId) {
                  navigate(`/applications/${appId}/processing`);
                }
              }}>
                Proceed to Processing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Manage Modal */}
      {manageModal && (
        <div className="modal-overlay" onClick={() => setManageModal(null)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Application Management</div>
                  <h2 className="modal-title">{manageModal.application_number}</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{manageModal.profiles?.company_name} &middot; {new Date(manageModal.created_at).toLocaleDateString('en-GB')}</div>
                </div>
                <button className="modal-close" onClick={() => setManageModal(null)}><X size={20}/></button>
              </div>
              {/* Tabs */}
              <div style={{ display:'flex', gap: 0, borderBottom: '2px solid #f1f5f9', width: '100%', marginBottom: -20 }}>
                {[{id:'details', label:'View Details'}, {id:'processing', label:'Processing'}, {id:'audit', label:'Audit Date'}].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id)}
                    style={{
                      padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 700,
                      color: modalTab === tab.id ? 'var(--primary)' : '#94a3b8',
                      borderBottom: modalTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                      marginBottom: -2, transition: 'all 0.15s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {/* ── DETAILS TAB ── */}
              {modalTab === 'details' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div className="detail-item">
                      <label>Company</label>
                      <div>{manageModal.profiles?.company_name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{manageModal.profiles?.full_name}</div>
                    </div>
                    <div className="detail-item">
                      <label>Application Type</label>
                      <div className="capitalize">{manageModal.application_type} Certification</div>
                    </div>
                    <div className="detail-item">
                      <label>Establishment</label>
                      <div>{manageModal.establishment_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>{manageModal.establishment_address}</div>
                    </div>
                    <div className="detail-item">
                      <label>{manageModal.production_schedule ? 'Employees / Schedule' : 'Employees'}</label>
                      <div>{manageModal.employee_count} staff</div>
                      {manageModal.production_schedule && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>{manageModal.production_schedule}</div>
                      )}
                    </div>
                  </div>



                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div className="detail-item">
                      <label>Halal Coordinator</label>
                      <div>{manageModal.halal_coordinator || '—'}</div>
                    </div>
                    <div className="detail-item">
                      <label>QA Manager</label>
                      <div>{manageModal.qa_contact || '—'}</div>
                    </div>
                    <div className="detail-item">
                      <label>Finance</label>
                      <div>{manageModal.finance_contact || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <span className={`badge ${manageModal.has_porcine ? 'badge-red' : 'badge-green'}`}>
                      {manageModal.has_porcine ? '⚠ Porcine Handling' : '✓ No Porcine'}
                    </span>
                    <span className={`badge ${manageModal.has_intoxicants ? 'badge-red' : 'badge-green'}`}>
                      {manageModal.has_intoxicants ? '⚠ Intoxicants Used' : '✓ No Intoxicants'}
                    </span>
                  </div>

                  {manageModal.notes && (
                    <div className="detail-item" style={{ marginBottom: 20 }}>
                      <label>Additional Notes</label>
                      <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {manageModal.notes}
                      </div>
                    </div>
                  )}

                  <div className="detail-item">
                    <label>Documents</label>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                      {manageModal.documents && Object.entries(manageModal.documents).map(([key, url]) => (
                        url && typeof url === 'string' && (
                          <a key={key} href={getPdfUrl(url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ textTransform: 'capitalize' }}>
                            <FileText size={14} /> {key.replace(/_/g, ' ')}
                          </a>
                        )
                      ))}
                      {(!manageModal.documents || Object.keys(manageModal.documents).length === 0) && (
                        <div style={{ fontSize: 13, color: '#94a3b8' }}>No documents uploaded.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PROCESSING TAB ── */}
              {modalTab === 'processing' && (
                <form id="process-form" onSubmit={(e) => { e.preventDefault(); handleUpdateStatus(manageModal._id, actionForm); }}>
                  <div className="detail-card mb-6" style={{ border: '1px solid #e2e8f0', background: '#f8fafc', padding: '24px' }}>
                    
                    {/* 15-Step Progress Tracker */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '40px' }}>
                      {ALL_STATUSES.map((step, idx) => {
                        const currentStatus = actionForm.status || manageModal.status || 'APPLICATION RECEIVED';
                        let currentIndex = ALL_STATUSES.indexOf(currentStatus);
                        
                        // Handle Alternative status names
                        if (currentStatus === 'PROPOSAL REJECTED') currentIndex = 3; // Index of PROPOSAL ACCEPTED/REJECTED
                        
                        const isCompleted = idx <= currentIndex;
                        const isProposalRejected = step === 'PROPOSAL SENT' && existingProposal?.status === 'rejected';
                        
                        let barColor = '#cbd5e1'; 
                        let textColor = '#64748b';
                        let bgColor = '#f1f5f9';
                        let borderColor = '#e2e8f0';
                        
                        if (isCompleted) {
                          barColor = '#22c55e';
                          textColor = '#0f172a';
                          bgColor = '#f0fdf4';
                          borderColor = '#bbf7d0';
                        }

                        // Special case: PROPOSAL SENT and it was rejected — override with red
                        if (isProposalRejected) {
                          barColor = '#ef4444';
                          bgColor = '#fef2f2';
                          borderColor = '#fecaca';
                          textColor = '#dc2626';
                        }

                        return (
                          <div 
                            key={step}
                            onClick={() => {
                              if (step === 'PROPOSAL SENT' && (!existingProposal || existingProposal.status === 'rejected')) {
                                setProposalForm({
                                  type: 'upload',
                                  title: `Proposal for ${manageModal.application_number}`,
                                  estimated_cost: '',
                                  details: '',
                                  admin_comment: '',
                                  file: null
                                });
                                setShowProposalModal(true);
                                return;
                              }
                              if (step === 'INVOICE SENT' && !existingInvoice) {
                                setInvoiceForm({
                                  title: `Invoice for ${manageModal.application_number}`,
                                  amount: existingProposal?.estimated_cost || '',
                                  due_date: '',
                                  notes: '',
                                  file: null,
                                  target_status: 'INVOICE SENT'
                                });
                                setShowInvoiceModal(true);
                                return;
                              }
                              if (step === 'INVOICE FOR FINAL PAYMENT SENT') {
                                setInvoiceForm({
                                  title: `Final Invoice for ${manageModal.application_number}`,
                                  amount: '',
                                  due_date: '',
                                  notes: '',
                                  file: null,
                                  target_status: 'INVOICE FOR FINAL PAYMENT SENT'
                                });
                                setShowInvoiceModal(true);
                                return;
                              }
                              if (['PROPOSE AUDIT DATE', 'AUDIT DATE FINALIZED', 'ASSIGN AUDITOR'].includes(step)) {
                                setAuditModalTab('dates');
                                setShowAuditModal(true);
                                return;
                              }
                              if (step === 'NC REPORTS') {
                                setAuditModalTab('nc');
                                setShowAuditModal(true);
                                return;
                              }
                              if (step === 'AGREEMENT SENT' && !existingAgreement) {
                                setAgreementForm({
                                  type: 'upload',
                                  title: `Certification Agreement for ${manageModal.application_number}`,
                                  details: '',
                                  admin_comment: '',
                                  file: null
                                });
                                setShowAgreementModal(true);
                                return;
                              }
                              if (step === 'SEND CERTIFICATE') {
                                const targetId = manageModal?.id || manageModal?._id;
                                setManageModal(null);
                                navigate(`/applications/${targetId}/issue-certificate`);
                                return;
                              }
                              setActionForm(f => ({...f, status: step}));
                            }}
                            style={{
                              background: bgColor,
                              border: `2px solid ${borderColor}`,
                              borderRadius: '8px',
                              cursor: ((step === 'PROPOSAL SENT' && (!existingProposal || existingProposal.status === 'rejected')) || (step === 'INVOICE SENT' && !existingInvoice) || (step === 'AUDIT DATE FINALIZED')) ? 'pointer' : 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              textAlign: 'center',
                              padding: '12px 6px',
                              transition: 'all 0.2s',
                              minHeight: '75px',
                              position: 'relative',
                              boxShadow: isProposalRejected ? '0 0 0 3px rgba(239,68,68,0.15)' : 'none'
                            }}
                          >
                            <div style={{ width: '90%', height: '8px', background: barColor, borderRadius: '4px', marginBottom: '10px' }}></div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: textColor, textTransform: 'uppercase', display: 'flex', gap: '4px', alignItems: 'center', lineHeight: '1.2' }}>
                              {isProposalRejected ? <X size={12} style={{ color: '#ef4444', minWidth: '12px' }}/> : isCompleted && <CheckCircle size={12} style={{ color: '#22c55e', minWidth: '12px' }}/>}
                              {step}
                            </div>
                            {isProposalRejected && (
                              <div style={{ position:'absolute', bottom: 4, fontSize: '8px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>REJECTED</div>
                            )}
                            {step === 'PROPOSAL SENT' && existingProposal && existingProposal.status !== 'rejected' && (
                              <div style={{ position:'absolute', bottom: 4, right: 4, color: '#22c55e' }}>
                                <Shield size={12} title="Proposal exists" />
                              </div>
                            )}
                            {step === 'INVOICE SENT' && existingInvoice && (
                              <div style={{ position:'absolute', bottom: 4, right: 4, color: '#22c55e' }}>
                                <Receipt size={12} title="Invoice sent" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Rejected Proposal Alert Banner */}
                    {existingProposal?.status === 'rejected' && (
                      <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '18px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 40, height: 40, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <X size={20} style={{ color: '#dc2626' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#991b1b', marginBottom: 3 }}>Proposal Rejected by Client</div>
                            <div style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.4 }}>
                              {existingProposal.client_comment ? `"${existingProposal.client_comment}"` : 'The client has declined the previous proposal. Please review and send a revised proposal.'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: 'none', whiteSpace: 'nowrap', fontSize: 13, padding: '10px 20px' }}
                          onClick={() => {
                            setProposalForm({ type: 'upload', title: `Revised Proposal for ${manageModal.application_number}`, estimated_cost: '', details: '', admin_comment: '', file: null });
                            setShowProposalModal(true);
                          }}
                        >
                          ↗ Resend New Proposal
                        </button>
                      </div>
                    )}

                    {/* Invoice Viewer */}
                    {existingInvoice && (
                      <div style={{ border: `1.5px solid ${existingInvoice.status === 'client_paid' ? '#60a5fa' : '#86efac'}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: existingInvoice.status === 'client_paid' ? '0 4px 16px rgba(59,130,246,0.08)' : '0 4px 16px rgba(22,163,74,0.08)' }}>

                        {/* Header bar */}
                        <div style={{ background: existingInvoice.status === 'client_paid' ? 'linear-gradient(135deg,#eff6ff,#f8fafc)' : 'linear-gradient(135deg,#f0fdf4,#f7fef9)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 42, height: 42, background: existingInvoice.status === 'client_paid' ? '#dbeafe' : '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Receipt size={20} style={{ color: existingInvoice.status === 'client_paid' ? '#2563eb' : '#16a34a' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 14, color: existingInvoice.status === 'client_paid' ? '#1d4ed8' : '#166534', marginBottom: 3 }}>
                                {existingInvoice.status === 'client_paid' ? `⚠️ Client Submitted Payment — ${existingInvoice.invoice_number}` : `✓ Invoice — ${existingInvoice.invoice_number}`}
                              </div>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: existingInvoice.status === 'client_paid' ? '#1e40af' : '#15803d', fontWeight: 700 }}>£{parseFloat(existingInvoice.amount || 0).toFixed(2)}</span>
                                {existingInvoice.due_date && <span style={{ fontSize: 12, color: '#64748b' }}>{new Date(existingInvoice.due_date).toLocaleDateString('en-GB')}</span>}
                                <span style={{
                                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                  background: existingInvoice.status === 'paid' ? '#dcfce7' : existingInvoice.status === 'client_paid' ? '#bfdbfe' : '#fef3c7',
                                  color: existingInvoice.status === 'paid' ? '#15803d' : existingInvoice.status === 'client_paid' ? '#1e3a8a' : '#92400e',
                                  padding: '2px 8px', borderRadius: 4
                                }}>{existingInvoice.status.replace(/_/g, ' ')}</span>
                              </div>
                              {existingInvoice.notes && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>{existingInvoice.notes}</div>}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {existingInvoice.payment_proof_url && (
                              <a
                                href={getPdfUrl(existingInvoice.payment_proof_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline btn-sm"
                                style={{ borderColor: '#60a5fa', color: '#2563eb', fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
                                title="View client's uploaded payment proof"
                              >
                                <FileSearch size={13} /> View Proof
                              </a>
                            )}
                            {existingInvoice.invoice_url && (
                              <button
                                type="button"
                                onClick={() => setShowInvoicePdf(v => !v)}
                                className="btn btn-outline btn-sm"
                                style={{ borderColor: '#86efac', color: '#16a34a', fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
                              >
                                <FileText size={13} />
                                {showInvoicePdf ? 'Hide Invoice' : 'View Invoice'}
                              </button>
                            )}
                            {existingInvoice.status !== 'paid' && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', border: 'none', fontSize: 12, whiteSpace: 'nowrap' }}
                                onClick={async () => {
                                  try {
                                    const isFinal = manageModal.status === 'INVOICE FOR FINAL PAYMENT SENT' || manageModal.status === 'FINAL PAYMENT RECEIVED';
                                    const nextStatus = isFinal ? 'FINAL PAYMENT RECEIVED' : 'PAYMENT RECEIVED';

                                    await api.put(`/api/invoices/${existingInvoice._id || existingInvoice.id}`, { status: 'paid', payment_date: new Date().toISOString() });
                                    await api.put(`/api/applications/${manageModal._id || manageModal.id}/status`, { status: nextStatus });
                                    setExistingInvoice(prev => ({ ...prev, status: 'paid' }));
                                    setManageModal(prev => ({ ...prev, status: nextStatus }));
                                    setActionForm(prev => ({ ...prev, status: nextStatus }));
                                    toast.success(`Payment verified & status updated to ${nextStatus}!`);
                                  } catch (err) {
                                    toast.error(err.message || 'Failed to mark as paid');
                                  }
                                }}
                              >
                                <CheckCircle size={13} /> Verify Payment
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline PDF Viewer */}
                        {showInvoicePdf && existingInvoice.invoice_url && (
                          <div style={{ borderTop: '1.5px solid #bbf7d0', background: '#f8fafc' }}>
                            <div style={{ padding: '8px 16px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #dcfce7' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileText size={11} /> Invoice Document Preview
                              </span>
                              <a
                                href={getPdfUrl(existingInvoice.invoice_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                <Download size={11} /> Open full PDF
                              </a>
                            </div>
                            <iframe
                              src={`${getPdfUrl(existingInvoice.invoice_url)}#toolbar=0&view=FitH`}
                              title="Invoice PDF"
                              style={{ width: '100%', height: 480, border: 'none', display: 'block' }}
                            />
                          </div>
                        )}
                      </div>
                    )}


                    {/* Agreement Viewer */}
                    {existingAgreement && (
                      <div style={{ border: `1.5px solid ${existingAgreement.status === 'approved' ? '#10b981' : existingAgreement.status === 'signed' ? '#3b82f6' : '#64748b'}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                        
                        {/* Header bar */}
                        <div style={{ background: existingAgreement.status === 'approved' ? 'linear-gradient(135deg,#ecfdf5,#f8fafc)' : existingAgreement.status === 'signed' ? 'linear-gradient(135deg,#eff6ff,#f8fafc)' : 'linear-gradient(135deg,#f8fafc,#fff)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 42, height: 42, background: existingAgreement.status === 'approved' ? '#d1fae5' : existingAgreement.status === 'signed' ? '#dbeafe' : '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <FileText size={20} style={{ color: existingAgreement.status === 'approved' ? '#10b981' : existingAgreement.status === 'signed' ? '#3b82f6' : '#64748b' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 3 }}>
                                {existingAgreement.title}
                              </div>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                  background: existingAgreement.status === 'approved' ? '#d1fae5' : existingAgreement.status === 'signed' ? '#dbeafe' : '#f3f4f6',
                                  color: existingAgreement.status === 'approved' ? '#065f46' : existingAgreement.status === 'signed' ? '#1e40af' : '#374151',
                                  padding: '2px 8px', borderRadius: 4
                                }}>
                                  Agreement Status: {existingAgreement.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {existingAgreement.agreement_url && (
                              <a href={getPdfUrl(existingAgreement.agreement_url)} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ borderColor: '#64748b', color: '#475569', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FileText size={13} /> View Sent Agreement
                              </a>
                            )}
                            {existingAgreement.signed_agreement_url && (
                              <a href={getPdfUrl(existingAgreement.signed_agreement_url)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ background: '#2563eb', borderColor: '#2563eb', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FileText size={13} /> View Signed Copy
                              </a>
                            )}
                            {existingAgreement.status === 'signed' && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', fontSize: 12 }}
                                onClick={async () => {
                                  if (window.confirm('Do you want to approve this signed agreement? This will transition status to AGREEMENT SIGNED COPY RECEIVED.')) {
                                    try {
                                      const res = await api.put(`/api/agreements/${existingAgreement._id || existingAgreement.id}`, { status: 'approved' });
                                      setExistingAgreement(res.data);
                                      setManageModal(prev => ({ ...prev, status: 'AGREEMENT SIGNED COPY RECEIVED' }));
                                      setActionForm(prev => ({ ...prev, status: 'AGREEMENT SIGNED COPY RECEIVED' }));
                                      toast.success('Agreement approved successfully!');
                                      fetchData();
                                    } catch (err) {
                                      toast.error(err.message || 'Failed to approve agreement');
                                    }
                                  }
                                }}
                              >
                                Approve Agreement
                              </button>
                            )}
                          </div>
                        </div>

                        {existingAgreement.details && (
                          <div style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Agreement Written Details</div>
                            <div style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                              {existingAgreement.details}
                            </div>
                          </div>
                        )}
                      </div>
                    )}


                    {/* Application Details Table */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', padding: '40px 32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <h3 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 800, color: '#334155', marginBottom: '32px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {actionForm.status || manageModal.status || 'APPLICATION RECEIVED'}
                      </h3>
                      
                      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>Application Details</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
                          <tbody>
                            <tr>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', width: '35%', background: '#f8fafc', color: '#475569' }}>Application Number:</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', color: '#0f172a' }}>{manageModal.application_number}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Registered Company:</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', color: '#0f172a' }}>{manageModal.profiles?.company_name || manageModal.establishment_name || '—'}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Application Date:</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', color: '#0f172a' }}>{new Date(manageModal.submission_date || manageModal.created_at || manageModal.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Application Category:</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', color: '#0f172a' }}>{manageModal.application_type} Certification – {manageModal.category}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Application Status:</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{actionForm.status || manageModal.status || 'APPLICATION RECEIVED'}</td>
                            </tr>
                            {existingProposal && (
                              <>
                                <tr>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Latest Proposal Status:</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: existingProposal.status === 'rejected' ? '#ef4444' : '#16a34a' }}>
                                    {existingProposal.status?.replace(/_/g, ' ').toUpperCase()}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Estimated Cost:</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>£{existingProposal.estimated_cost || '—'}</td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                  </div>
                </form>
              )}

              {/* ── AUDIT DATE TAB ── */}
              {modalTab === 'audit' && (
                <div>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 20, minHeight: 300 }}>
                    {existingAudit ? (
                      <div>
                        {/* Status Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                          <h4 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', margin: 0 }}>Audit Summary</h4>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className={`badge ${
                              existingAudit.status === 'dates_accepted' || existingAudit.status === 'auditors_assigned' || existingAudit.status === 'audit_completed' ? 'badge-green' :
                              existingAudit.status === 'dates_rejected' ? 'badge-red' : 'badge-yellow'
                            }`} style={{ fontSize: 12, padding: '4px 12px' }}>
                              {existingAudit.status === 'dates_proposed' ? '⏳ Dates Proposed' :
                               existingAudit.status === 'dates_accepted' ? '✓ Client Accepted Dates' :
                               existingAudit.status === 'auditors_assigned' ? '✓ Auditors Assigned' :
                               existingAudit.status === 'audit_completed' ? '✓ Audit Completed' :
                               existingAudit.status === 'dates_rejected' ? '✗ Unavailable' : '⏳ Awaiting Scheduling'}
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ padding: '6px 12px', fontSize: 12 }}
                              onClick={() => {
                                setShowAuditModal(true);
                              }}
                            >
                              <Calendar size={13} style={{ marginRight: 4 }} /> Manage Audit Session
                            </button>
                          </div>
                        </div>

                        {/* Audit Dates Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
                          {existingAudit.selected_dates?.length > 0 && (
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 20, borderRadius: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={14} /> Finalized Audit Dates
                              </div>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                {existingAudit.selected_dates.map((d, i) => (
                                  <div key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontWeight: 700, padding: '8px 16px', borderRadius: 8, fontSize: 14 }}>
                                    {new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {existingAudit.status === 'dates_proposed' && existingAudit.proposed_dates?.length > 0 && (
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 20, borderRadius: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={14} /> Proposed Audit Dates (Awaiting Client Selection)
                              </div>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                {existingAudit.proposed_dates.map((d, i) => (
                                  <div key={i} style={{ background: '#fbf7f0', border: '1px solid #fde68a', color: '#b45309', fontWeight: 600, padding: '8px 16px', borderRadius: 8, fontSize: 13 }}>
                                    {new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Assigned Auditors Section */}
                        {existingAudit.auditors?.length > 0 && (
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                              👨💼 Assigned Auditor(s)
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                              {existingAudit.auditors.map((a, i) => (
                                <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{a.name}</div>
                                    <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                                      {a.purpose || 'Lead Auditor'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 12, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div>📧 {a.email}</div>
                                    <div>📞 {a.contact_number}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Non-Conformity (NC) Reports Section */}
                        <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: 20 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#dc2626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            ⚠️ Flagged NC Reports ({existingAudit.nc_reports?.length || 0})
                          </div>
                          {existingAudit.nc_reports?.length > 0 ? (
                            <div style={{ display: 'grid', gap: 12 }}>
                              {existingAudit.nc_reports.map((nc, i) => (
                                <div key={i} style={{ background: nc.status === 'corrected' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${nc.status === 'corrected' ? '#bbf7d0' : '#fecaca'}`, padding: '16px', borderRadius: '12px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: nc.status === 'corrected' ? '#166534' : '#b91c1c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      {nc.status === 'corrected' ? '✓ Corrected' : '⚠️ Outstanding NC'}
                                    </span>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(nc.flagged_at).toLocaleDateString('en-GB')}</span>
                                  </div>
                                  <p style={{ fontSize: 13, margin: '0 0 12px 0', color: '#334155', lineHeight: 1.5 }}>{nc.text}</p>
                                  
                                  {nc.document_url && nc.document_url !== '#' && nc.document_url !== 'undefined' ? (
                                    <a
                                      href={getPdfUrl(nc.document_url)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-outline btn-sm"
                                      style={{ fontSize: 11, padding: '6px 12px', width: 'fit-content' }}
                                      onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const fullUrl = getPdfUrl(nc.document_url);
                                        if (fullUrl && fullUrl !== '#') {
                                          window.open(fullUrl, '_blank', 'noopener,noreferrer');
                                        }
                                      }}
                                    >
                                      View Attached Document
                                    </a>
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: 11, padding: '6px 12px', borderRadius: '6px',
                                        background: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1',
                                        display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'not-allowed', fontWeight: 600, width: 'fit-content'
                                      }}
                                      title="No document file was uploaded for this NC report"
                                    >
                                      Document Unavailable
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '24px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, color: '#64748b', fontSize: 13 }}>
                              No NC reports have been flagged for this session.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Calendar size={48} style={{ color: '#94a3b8', margin: '0 auto 16px' }} />
                        <h3 style={{ fontSize: 16, color: '#334155', marginBottom: 8 }}>No Audit Scheduled</h3>
                        <p style={{ fontSize: 13, color: '#64748b', maxWidth: 360, margin: '0 auto', marginBottom: 20 }}>
                          An audit has not been initialized for this application yet.
                        </p>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setShowAuditModal(true);
                          }}
                        >
                          <Calendar size={14} style={{ marginRight: 6 }} /> Start Audit Scheduling
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              {/* Left: Danger + Proposal + Logsheet */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ef4444', borderColor: '#fecaca' }}
                  onClick={() => { setManageModal(null); handleDelete(manageModal._id); }}
                >
                  <Trash2 size={14} /> Delete
                </button>
                <Link
                  to={`/proposals?appId=${manageModal._id}`}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#7c3aed', borderColor: '#e9d5ff' }}
                  onClick={() => setManageModal(null)}
                >
                  <ExternalLink size={14} /> View Proposal
                </Link>
                {(manageModal.status === 'Create Logsheet' || (modalTab === 'processing' && actionForm?.status === 'Create Logsheet')) && (
                  <Link
                    to={`/applications/${manageModal._id}/logsheet`}
                    className="btn btn-primary btn-sm"
                    onClick={() => setManageModal(null)}
                  >
                    📝 Create Logsheet
                  </Link>
                )}
              </div>
              {/* Right: Main actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setManageModal(null)}>Close</button>
                {modalTab === 'details' && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { markAsDone(manageModal); }}>
                    <CheckCircle size={14} /> Processing Done
                  </button>
                )}
                {modalTab === 'processing' && (
                  <button type="submit" form="process-form" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Update Status'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Send / Resend Proposal Modal (Extracted) */}
      <ProposalModal
        isOpen={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        app={manageModal}
        proposal={existingProposal}
        onSuccess={() => {
          fetchData();
          if (manageModal) {
            setManageModal(null);
          }
        }}
      />

      {/* Invoice Modal for Admin */}
      {showInvoiceModal && manageModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #f0fdf4, #fff)', borderBottom: '2px solid #86efac' }}>
              <div>
                <span className="modal-title" style={{ color: '#166534' }}>🧾 Send Invoice</span>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 4, fontWeight: 600 }}>
                  {manageModal.application_number}
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowInvoiceModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Upload the invoice for this application. This will notify the client and update the status to INVOICE SENT.
              </p>

              <div className="form-group">
                <label className="form-label">Invoice Title <span>*</span></label>
                <input
                  className="form-control"
                  value={invoiceForm.title}
                  onChange={e => setInvoiceForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Halal Certification Invoice"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Amount Due (£) <span>*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className="form-control"
                    value={invoiceForm.amount}
                    onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 850.00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={invoiceForm.due_date}
                    onChange={e => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Invoice Document (PDF) <span>*</span></label>
                <div
                  onClick={() => document.getElementById('admin-invoice-file-input').click()}
                  style={{
                    border: '2px dashed #e2e8f0', padding: '28px 24px', borderRadius: '12px',
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                    background: invoiceForm.file ? '#f0fdf4' : '#fff'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#16a34a'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <FileText size={36} style={{ color: invoiceForm.file ? '#16a34a' : '#94a3b8', marginBottom: 10, margin: '0 auto' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginTop: 8 }}>
                    {invoiceForm.file ? invoiceForm.file.name : 'Click to upload invoice PDF'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>PDF, DOCX accepted</div>
                  <input
                    id="admin-invoice-file-input"
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx"
                    onChange={e => setInvoiceForm(f => ({ ...f, file: e.target.files[0] }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={invoiceForm.notes}
                  onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes for the client..."
                />
              </div>
            </div>
            <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexDirection:'column', gap:12, alignItems:'stretch' }}>
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#166534', display:'flex', alignItems:'center', gap:8 }}>
                <CheckCircle size={14} style={{ color:'#16a34a', flexShrink:0 }} />
                <span>Uploading will update the application status to <strong>{invoiceForm.target_status || 'INVOICE SENT'}</strong> and send an email to the client.</span>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', padding:'10px 24px' }}
                  disabled={invoiceSubmitting || !invoiceForm.title || !invoiceForm.amount || !invoiceForm.file}
                  onClick={async () => {
                    setInvoiceSubmitting(true);
                    try {
                      const formData = new FormData();
                      formData.append('title', invoiceForm.title);
                      formData.append('amount', invoiceForm.amount);
                      if (invoiceForm.due_date) formData.append('due_date', invoiceForm.due_date);
                      if (invoiceForm.notes) formData.append('notes', invoiceForm.notes);
                      if (invoiceForm.file) formData.append('invoice_file', invoiceForm.file);
                      formData.append('target_status', invoiceForm.target_status || 'INVOICE SENT');
                      
                      const appId = manageModal._id || manageModal.id;
                      const clientId = manageModal.client_id || manageModal.profiles?._id || manageModal.profiles?.id;
                      if (!clientId) {
                        toast.error('Error: Could not identify client ID for this application.');
                        setInvoiceSubmitting(false);
                        return;
                      }
                      
                      formData.append('application_id', appId);
                      formData.append('client_id', clientId);

                      const res = await api.post('/api/invoices', formData, true);
                      setExistingInvoice(res.data);

                      const targetStatus = invoiceForm.target_status || 'INVOICE SENT';
                      // Automatically update application status
                      await api.put(`/api/applications/${appId}/status`, { status: targetStatus });
                      
                      // Update local UI states
                      setManageModal(prev => ({ ...prev, status: targetStatus }));
                      setActionForm(prev => ({ ...prev, status: targetStatus }));

                      toast.success(`🧾 Invoice sent! Status updated to ${targetStatus}.`);
                      setShowInvoiceModal(false);
                      fetchData();
                    } catch (err) {
                      toast.error(err.message || 'Failed to send invoice');
                    } finally {
                      setInvoiceSubmitting(false);
                    }
                  }}
                >
                  {invoiceSubmitting
                    ? <><span className="spinner-white" style={{ width:14, height:14 }} /> Sending...</>
                    : <><Receipt size={15} /> Send Invoice &amp; Update Status</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Agreement Modal (Extracted) */}
      <AgreementModal
        isOpen={showAgreementModal}
        onClose={() => setShowAgreementModal(false)}
        app={manageModal}
        agreement={existingAgreement}
        onSuccess={() => {
          fetchData();
          if (manageModal) {
            setManageModal(null);
          }
        }}
      />

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        app={manageModal}
        onSuccess={() => {
          fetchData();
          if (manageModal) {
            setManageModal(null);
          }
        }}
      />

      <RestoreModal
        isOpen={Boolean(restoreModalApp)}
        onClose={() => setRestoreModalApp(null)}
        itemName={restoreModalApp?.companyName || 'Application'}
        itemType="application"
        defaultStatus={restoreModalApp?.previous_status}
        onConfirm={handleConfirmRestoreApplication}
      />

      {/* Accounts View: Direct Invoice Modal */}
      <InvoiceModal
        isOpen={accountsInvoiceModal.isOpen}
        onClose={() => setAccountsInvoiceModal({ isOpen: false, app: null, invoiceType: 'initial' })}
        app={accountsInvoiceModal.app}
        invoiceType={accountsInvoiceModal.invoiceType}
        onSuccess={() => {
          setAccountsInvoiceModal({ isOpen: false, app: null, invoiceType: 'initial' });
          fetchData();
        }}
      />

      {/* Accounts View: Direct Confirm Payment Modal */}
      <ConfirmPaymentModal
        isOpen={accountsPaymentModal.isOpen}
        onClose={() => setAccountsPaymentModal({ isOpen: false, app: null, invoice: null })}
        app={accountsPaymentModal.app}
        invoice={accountsPaymentModal.invoice}
        onSuccess={() => {
          setAccountsPaymentModal({ isOpen: false, app: null, invoice: null });
          fetchData();
        }}
      />

      <style>{`
        .action-btn-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }
        .action-btn-accounts-inv {
          background: #fefce8;
          color: #854d0e;
          border-color: #fef08a;
        }
        .action-btn-accounts-inv:hover {
          background: #fef08a;
          color: #713f12;
          border-color: #fde047;
        }
        .action-btn-accounts-pay {
          background: #f0fdf4;
          color: #15803d;
          border-color: #bbf7d0;
        }
        .action-btn-accounts-pay:hover {
          background: #dcfce7;
          color: #166534;
          border-color: #86efac;
        }
        .action-btn-view {
          background: #f1f5f9;
          color: #475569;
          border-color: #e2e8f0;
        }
        .action-btn-view:hover {
          background: #e2e8f0;
          color: #1e293b;
          border-color: #cbd5e1;
        }
        .action-btn-process {
          background: #eff6ff;
          color: #2563eb;
          border-color: #bfdbfe;
        }
        .action-btn-process:hover {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .action-btn-done {
          background: #f0fdf4;
          color: #16a34a;
          border-color: #bbf7d0;
        }
        .action-btn-done:hover {
          background: #dcfce7;
          color: #15803d;
        }
        .action-btn-proposal {
          background: #faf5ff;
          color: #7c3aed;
          border-color: #e9d5ff;
        }
        .action-btn-proposal:hover {
          background: #f3e8ff;
          color: #6d28d9;
        }
        .action-btn-delete {
          background: transparent;
          color: #94a3b8;
          border-color: transparent;
          padding: 5px 6px;
        }
        .action-btn-delete:hover {
          background: #fef2f2;
          color: #ef4444;
          border-color: #fecaca;
        }
      `}</style>
    </div>
  );
}
