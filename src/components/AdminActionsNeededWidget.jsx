import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert, FileText, Receipt, Calendar, PenTool,
  CheckCircle, ArrowRight, Award, ClipboardList, X,
  Search, RefreshCw, Layers, CheckCircle2, AlertTriangle,
  Clock, DollarSign, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

// Shared Admin Modals
import ProposalModal from './ProposalModal';
import InvoiceModal from './InvoiceModal';
import AgreementModal from './AgreementModal';
import FinalAgreementModal from './FinalAgreementModal';
import CertificateModal from './CertificateModal';
import AuditManageModal from './AuditManageModal';
import ConfirmPaymentModal from './ConfirmPaymentModal';

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

export default function AdminActionsNeededWidget({ onActionCompleted }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [hasInitializedAutoOpen, setHasInitializedAutoOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'applications' | 'invoices' | 'initial_products' | 'addons'

  // Active modal target
  const [activeModal, setActiveModal] = useState(null); // { type, app, invoice }

  const fetchAdminActions = useCallback(async () => {
    try {
      const [appRes, invRes, addOnRes, initProdRes] = await Promise.all([
        api.get('/api/applications').catch(() => ({ data: [] })),
        api.get('/api/invoices').catch(() => ({ data: [] })),
        api.get('/api/add-on-applications').catch(() => ({ data: [] })),
        api.get('/api/initial-products').catch(() => ({ data: [] }))
      ]);

      const allApps = appRes.data?.data || (Array.isArray(appRes.data) ? appRes.data : []);
      const allInvoices = invRes.data?.data || (Array.isArray(invRes.data) ? invRes.data : []);
      const allAddOns = addOnRes.data?.data || (Array.isArray(addOnRes.data) ? addOnRes.data : []);
      const allInitProds = initProdRes.data?.data || (Array.isArray(initProdRes.data) ? initProdRes.data : []);

      const actionList = [];

      // ─────────────────────────────────────────────────────────────
      // 1. INVOICES: Client Proof Submitted (status: 'client_paid')
      // ─────────────────────────────────────────────────────────────
      const clientPaidInvoices = allInvoices.filter(inv => inv.status === 'client_paid');
      for (const inv of clientPaidInvoices) {
        const linkedApp = allApps.find(a => String(a._id || a.id) === String(inv.application_id?._id || inv.application_id));
        const companyName = linkedApp?.profiles?.company_name || linkedApp?.establishment_name || inv.client_id?.company_name || inv.client_id?.full_name || 'Client';

        actionList.push({
          id: `inv-${inv._id || inv.id}`,
          category: 'invoices',
          app: linkedApp || { _id: inv.application_id, application_number: inv.invoice_number ? `INV-${inv.invoice_number}` : 'N/A', establishment_name: companyName },
          invoice: inv,
          type: 'confirm_payment',
          title: 'Client Payment Proof Submitted',
          tag: 'Payment Proof',
          desc: `Confirm receipt of £${Number(inv.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })} for ${companyName}`,
          buttonText: 'Confirm Payment',
          buttonBg: '#16a34a',
          isFullPage: false,
          icon: <Receipt size={16} />
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 2. APPLICATIONS: Actionable Lifecycle Stages
      // ─────────────────────────────────────────────────────────────
      for (const app of allApps) {
        const appId = app._id || app.id;
        const appNum = app.application_number || 'N/A';
        const estName = app.establishment_name || app.profiles?.company_name || 'Client Facility';
        const isRenewal = app.application_type === 'renewal';

        switch (app.status) {
          case 'submitted':
          case 'under_review':
            actionList.push({
              id: `app-sub-${appId}`,
              category: 'applications',
              app,
              type: 'review_app',
              title: isRenewal ? 'Renewal Application Submitted' : 'New Application Submitted',
              tag: 'Review',
              desc: `Review initial submission & documents for ${estName}`,
              buttonText: 'Review App',
              buttonBg: '#2563eb',
              isFullPage: true,
              link: `/applications/${appId}/processing`,
              icon: <FileText size={16} />
            });
            break;

          case 'approved':
            if (isRenewal) {
              actionList.push({
                id: `app-audit-prop-${appId}`,
                category: 'applications',
                app,
                type: 'manage_audit',
                title: 'Renewal Accepted: Schedule Audit',
                tag: 'Audit Schedule',
                desc: `Propose 3 audit dates for renewal of ${estName}`,
                buttonText: 'Schedule Audit',
                buttonBg: '#ea580c',
                isFullPage: false,
                icon: <Calendar size={16} />
              });
            } else {
              actionList.push({
                id: `app-prop-${appId}`,
                category: 'proposals',
                app,
                type: 'send_proposal',
                title: 'Application Accepted: Send Proposal',
                tag: 'Proposal',
                desc: `Upload & issue certification proposal for ${estName}`,
                buttonText: 'Send Proposal',
                buttonBg: '#6b21a8',
                isFullPage: false,
                icon: <FileText size={16} />
              });
            }
            break;

          case 'proposal_rejected':
            actionList.push({
              id: `app-proprej-${appId}`,
              category: 'proposals',
              app,
              type: 'send_proposal',
              title: 'Proposal Rejected: Send Revision',
              tag: 'Proposal',
              desc: `Client requested changes on proposal for ${estName}`,
              buttonText: 'Send Revision',
              buttonBg: '#b91c1c',
              isFullPage: false,
              icon: <FileText size={16} />
            });
            break;

          case 'proposal_approved':
          case 'proposal_accepted':
            actionList.push({
              id: `app-inv-${appId}`,
              category: 'invoices',
              app,
              type: 'send_initial_invoice',
              title: 'Proposal Accepted: Issue Initial Invoice',
              tag: 'Initial Invoice',
              desc: `Issue initial certification fee invoice to ${estName}`,
              buttonText: 'Send Invoice',
              buttonBg: '#854d0e',
              isFullPage: false,
              icon: <Receipt size={16} />
            });
            break;

          case 'payment_received':
            if (isRenewal) {
              actionList.push({
                id: `app-payrec-renewal-${appId}`,
                category: 'applications',
                app,
                type: 'issue_certificate',
                title: 'Renewal Fee Paid: Issue Certificate',
                tag: 'Certificate',
                desc: `Issue renewed Halal Certificate for ${estName}`,
                buttonText: 'Issue Certificate',
                buttonBg: '#16a34a',
                isFullPage: false,
                icon: <Award size={16} />
              });
            } else {
              actionList.push({
                id: `app-payrec-${appId}`,
                category: 'applications',
                app,
                type: 'manage_audit',
                title: 'Initial Payment Received: Schedule Audit',
                tag: 'Audit Schedule',
                desc: `Propose 3 possible audit visit dates for ${estName}`,
                buttonText: 'Propose Audit Dates',
                buttonBg: '#ea580c',
                isFullPage: false,
                icon: <Calendar size={16} />
              });
            }
            break;

          case 'dates_rejected':
            actionList.push({
              id: `app-datesrej-${appId}`,
              category: 'applications',
              app,
              type: 'manage_audit',
              title: 'Dates Rejected: Propose New Options',
              tag: 'Audit Schedule',
              desc: `Client unavailable on previous dates for ${estName}. Propose new options.`,
              buttonText: 'Propose New Dates',
              buttonBg: '#ea580c',
              isFullPage: false,
              icon: <Calendar size={16} />
            });
            break;

          case 'dates_accepted':
            actionList.push({
              id: `app-datesacc-${appId}`,
              category: 'applications',
              app,
              type: 'manage_audit',
              title: 'Dates Accepted: Finalize Audit Date',
              tag: 'Audit Finalize',
              desc: `Client accepted date options. Finalize official audit date for ${estName}`,
              buttonText: 'Finalize Date',
              buttonBg: '#059669',
              isFullPage: false,
              icon: <CheckCircle size={16} />
            });
            break;

          case 'date_finalized':
            actionList.push({
              id: `app-auditassign-${appId}`,
              category: 'applications',
              app,
              type: 'manage_audit',
              title: 'Date Finalized: Assign Lead Auditor',
              tag: 'Auditor Assign',
              desc: `Assign qualified lead auditor & technical experts for ${estName}`,
              buttonText: 'Assign Auditor',
              buttonBg: '#7c3aed',
              isFullPage: false,
              icon: <PenTool size={16} />
            });
            break;

          case 'audit_assigned':
            actionList.push({
              id: `app-audassigned-${appId}`,
              category: 'applications',
              app,
              type: 'manage_audit',
              title: 'Audit Assigned: Awaiting Completion',
              tag: 'Audit Execution',
              desc: `Audit is assigned and scheduled for execution at ${estName}`,
              buttonText: 'Manage Audit',
              buttonBg: '#0e7490',
              isFullPage: false,
              icon: <Clock size={16} />
            });
            break;

          case 'audit_successful':
          case 'audit_completed':
            actionList.push({
              id: `app-auditdone-${appId}`,
              category: 'applications',
              app,
              type: 'review_app',
              title: isRenewal ? 'Renewal Audit Complete: Review & LogSheet' : 'Audit Complete: Review & LogSheet',
              tag: 'Audit Complete',
              desc: `Audit completed successfully for ${estName}. Proceed with logsheet.`,
              buttonText: 'Process LogSheet',
              buttonBg: '#16a34a',
              isFullPage: true,
              link: `/applications/${appId}/logsheet`,
              icon: <CheckCircle size={16} />
            });
            break;

          case 'nc_flagged':
            actionList.push({
              id: `app-ncflag-${appId}`,
              category: 'applications',
              app,
              type: 'review_app',
              title: 'NC Flagged: Review Responses',
              tag: 'NC Review',
              desc: `Review client corrective responses and close NCs for ${estName}`,
              buttonText: 'Review NCs',
              buttonBg: '#dc2626',
              isFullPage: true,
              link: `/applications/${appId}/processing`,
              icon: <AlertTriangle size={16} />
            });
            break;

          case 'nc_closed':
          case 'audit_report_submitted':
            actionList.push({
              id: `app-logsheet-${appId}`,
              category: 'applications',
              app,
              type: 'create_logsheet',
              title: isRenewal ? 'Renewal Audit Complete: Create LogSheet' : 'Audit Complete: Create LogSheet',
              tag: 'LogSheet',
              desc: `Generate & submit official logsheet for ${estName}`,
              buttonText: 'Create LogSheet',
              buttonBg: '#0e7490',
              isFullPage: true,
              link: `/applications/${appId}/logsheet`,
              icon: <ClipboardList size={16} />
            });
            break;

          case 'logsheet_created':
          case 'logsheet_sign_requested':
            actionList.push({
              id: `app-logcreated-${appId}`,
              category: 'applications',
              app,
              type: 'create_logsheet',
              title: 'LogSheet Created: Awaiting Signatures',
              tag: 'Signatures',
              desc: `Logsheet is awaiting required signatory approvals for ${estName}`,
              buttonText: 'Manage LogSheet',
              buttonBg: '#0e7490',
              isFullPage: true,
              link: `/applications/${appId}/logsheet`,
              icon: <ClipboardList size={16} />
            });
            break;

          case 'logsheet_signed':
          case 'application_successful':
            if (isRenewal) {
              actionList.push({
                id: `app-reninv-${appId}`,
                category: 'invoices',
                app,
                type: 'send_initial_invoice',
                title: 'Renewal Application Successful: Issue Renewal Invoice',
                tag: 'Renewal Invoice',
                desc: `Issue renewal certification fee invoice to ${estName}`,
                buttonText: 'Send Invoice',
                buttonBg: '#854d0e',
                isFullPage: false,
                icon: <Receipt size={16} />
              });
            } else {
              actionList.push({
                id: `app-ag-${appId}`,
                category: 'applications',
                app,
                type: 'send_agreement',
                title: 'LogSheet Signed: Send Agreement',
                tag: 'Agreement',
                desc: `Issue certification agreement contract to ${estName}`,
                buttonText: 'Send Agreement',
                buttonBg: '#2563eb',
                isFullPage: false,
                icon: <FileText size={16} />
              });
            }
            break;

          case 'agreement_signed':
            actionList.push({
              id: `app-agfinal-${appId}`,
              category: 'applications',
              app,
              type: 'send_final_agreement',
              title: 'Agreement Signed: Send Countersigned Copy',
              tag: 'Agreement Final',
              desc: `Upload official countersigned agreement PDF for ${estName}`,
              buttonText: 'Send Final Copy',
              buttonBg: '#0284c7',
              isFullPage: false,
              icon: <FileText size={16} />
            });
            break;

          case 'agreement_finalised':
            actionList.push({
              id: `app-finalinv-${appId}`,
              category: 'applications',
              app,
              type: 'send_final_invoice',
              title: 'Final Agreement Sent: Issue Final Invoice',
              tag: 'Final Invoice',
              desc: `Issue final certification fee invoice to ${estName}`,
              buttonText: 'Send Final Invoice',
              buttonBg: '#854d0e',
              isFullPage: false,
              icon: <Receipt size={16} />
            });
            break;

          case 'final_invoice_paid':
            actionList.push({
              id: `app-readycert-${appId}`,
              category: 'applications',
              app,
              type: 'mark_ready_certificate',
              title: 'Final Payment Confirmed: Mark Ready',
              tag: 'Certificate Ready',
              desc: `Mark ${estName} ready for certificate issuance`,
              buttonText: 'Mark Ready',
              buttonBg: '#9333ea',
              isFullPage: false,
              icon: <Award size={16} />
            });
            break;

          case 'ready_for_certificate':
            actionList.push({
              id: `app-cert-${appId}`,
              category: 'applications',
              app,
              type: 'issue_certificate',
              title: 'Application Ready: Issue Halal Certificate',
              tag: 'Certificate',
              desc: `Generate & issue Halal Certificate to ${estName}`,
              buttonText: 'Issue Certificate',
              buttonBg: '#16a34a',
              isFullPage: false,
              icon: <Award size={16} />
            });
            break;

          default:
            break;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 3. INITIAL PRODUCTS: Actionable Stages
      // ─────────────────────────────────────────────────────────────
      for (const ip of allInitProds) {
        const ipId = ip._id || ip.id;
        const prodName = ip.product?.name || 'Initial Product';
        const clientName = ip.client_id?.company_name || ip.client_id?.full_name || ip.contact_name || 'Client';
        const appNum = ip.application_id?.application_number || `APP-${String(ip.application_id?._id || ip.application_id || '').slice(-6).toUpperCase()}`;

        if (ip.status === 'submitted') {
          actionList.push({
            id: `initprod-sub-${ipId}`,
            category: 'initial_products',
            app: { _id: ipId, application_number: appNum, establishment_name: clientName },
            type: 'review_init_prod',
            title: 'New Initial Product: Assign FT Staff',
            tag: 'Assign FT',
            desc: `Assign Food Tech staff to review "${prodName}" for ${clientName}`,
            buttonText: 'Assign FT',
            buttonBg: '#0284c7',
            isFullPage: true,
            link: `/initial-products/${ipId}/processing`,
            icon: <Layers size={16} />
          });
        } else if (ip.status === 'ft_assigned') {
          actionList.push({
            id: `initprod-ft-${ipId}`,
            category: 'initial_products',
            app: { _id: ipId, application_number: appNum, establishment_name: clientName },
            type: 'enable_init_prod_form',
            title: 'Initial Product: Enable Approval Form',
            tag: 'Enable Form',
            desc: `Enable Product Approval Form for "${prodName}" (${clientName})`,
            buttonText: 'Enable Form',
            buttonBg: '#2563eb',
            isFullPage: true,
            link: `/initial-products/${ipId}/processing`,
            icon: <ClipboardList size={16} />
          });
        } else if (ip.status === 'all_forms_received') {
          actionList.push({
            id: `initprod-forms-${ipId}`,
            category: 'initial_products',
            app: { _id: ipId, application_number: appNum, establishment_name: clientName },
            type: 'create_init_prod_logsheet',
            title: 'Initial Product Form Received: Create Logsheet',
            tag: 'Logsheet',
            desc: `Review product specs & create logsheet for "${prodName}" (${clientName})`,
            buttonText: 'Create Logsheet',
            buttonBg: '#0e7490',
            isFullPage: true,
            link: `/initial-products/${ipId}/logsheet`,
            icon: <ClipboardList size={16} />
          });
        } else if (ip.status === 'client_replied') {
          actionList.push({
            id: `initprod-reply-${ipId}`,
            category: 'initial_products',
            app: { _id: ipId, application_number: appNum, establishment_name: clientName },
            type: 'review_init_prod_reply',
            title: 'Initial Product: Client Replied to Questions',
            tag: 'Review Reply',
            desc: `Client provided clarification for "${prodName}" (${clientName})`,
            buttonText: 'Review Reply',
            buttonBg: '#d97706',
            isFullPage: true,
            link: `/initial-products/${ipId}/processing`,
            icon: <FileText size={16} />
          });
        } else if (ip.status === 'logsheet_created' || ip.status === 'waiting_sharia_signature') {
          actionList.push({
            id: `initprod-sig-${ipId}`,
            category: 'initial_products',
            app: { _id: ipId, application_number: appNum, establishment_name: clientName },
            type: 'manage_init_prod_logsheet',
            title: 'Initial Product Logsheet: Awaiting Signatures',
            tag: 'Signatures',
            desc: `Logsheet for "${prodName}" is awaiting Shari'a committee sign-off`,
            buttonText: 'Manage Logsheet',
            buttonBg: '#0e7490',
            isFullPage: true,
            link: `/initial-products/${ipId}/logsheet`,
            icon: <ClipboardList size={16} />
          });
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 4. ADD-ON APPLICATIONS: Actionable Stages
      // ─────────────────────────────────────────────────────────────
      for (const addon of allAddOns) {
        const addonId = addon._id || addon.id;
        const clientName = addon.client_id?.company_name || addon.client_id?.full_name || 'Client';
        const productCount = addon.products?.length || 1;
        const addonNum = `ADDON-${String(addonId).slice(-6).toUpperCase()}`;

        if (addon.status === 'submitted') {
          actionList.push({
            id: `addon-sub-${addonId}`,
            category: 'addons',
            app: { _id: addonId, application_number: addonNum, establishment_name: clientName },
            type: 'review_addon',
            title: 'New Add-on Application: Assign FT',
            tag: 'Add-on Review',
            desc: `Review ${productCount} product addition(s) from ${clientName}`,
            buttonText: 'Review Add-on',
            buttonBg: '#2563eb',
            isFullPage: true,
            link: `/addon-applications/${addonId}/processing`,
            icon: <Layers size={16} />
          });
        } else if (addon.status === 'ft_assigned') {
          actionList.push({
            id: `addon-ft-${addonId}`,
            category: 'addons',
            app: { _id: addonId, application_number: addonNum, establishment_name: clientName },
            type: 'enable_addon_form',
            title: 'Add-on: Enable Product Approval Form',
            tag: 'Enable Form',
            desc: `Enable approval form for ${productCount} product(s) from ${clientName}`,
            buttonText: 'Enable Form',
            buttonBg: '#0284c7',
            isFullPage: true,
            link: `/addon-applications/${addonId}/approval-form`,
            icon: <ClipboardList size={16} />
          });
        } else if (addon.status === 'all_forms_received') {
          actionList.push({
            id: `addon-forms-${addonId}`,
            category: 'addons',
            app: { _id: addonId, application_number: addonNum, establishment_name: clientName },
            type: 'create_addon_logsheet',
            title: 'Add-on Forms Received: Create Logsheet',
            tag: 'Add-on Logsheet',
            desc: `Client submitted specifications for ${productCount} item(s)`,
            buttonText: 'Create Logsheet',
            buttonBg: '#0e7490',
            isFullPage: true,
            link: `/addon-applications/${addonId}/logsheet`,
            icon: <ClipboardList size={16} />
          });
        } else if (addon.status === 'client_replied') {
          actionList.push({
            id: `addon-reply-${addonId}`,
            category: 'addons',
            app: { _id: addonId, application_number: addonNum, establishment_name: clientName },
            type: 'review_addon_reply',
            title: 'Add-on: Client Replied to Info Request',
            tag: 'Review Reply',
            desc: `Client provided answers regarding ${productCount} product addition(s)`,
            buttonText: 'Review Reply',
            buttonBg: '#d97706',
            isFullPage: true,
            link: `/addon-applications/${addonId}/processing`,
            icon: <FileText size={16} />
          });
        } else if (addon.status === 'waiting_sharia_signature' || addon.status === 'logsheet_created') {
          actionList.push({
            id: `addon-sig-${addonId}`,
            category: 'addons',
            app: { _id: addonId, application_number: addonNum, establishment_name: clientName },
            type: 'manage_addon_logsheet',
            title: 'Add-on Logsheet: Awaiting Signatures',
            tag: 'Signatures',
            desc: `Add-on logsheet is awaiting Shari'a committee sign-off`,
            buttonText: 'Manage Logsheet',
            buttonBg: '#0e7490',
            isFullPage: true,
            link: `/addon-applications/${addonId}/logsheet`,
            icon: <ClipboardList size={16} />
          });
        } else if (addon.status === 'ready_for_certificate') {
          actionList.push({
            id: `addon-cert-${addonId}`,
            category: 'addons',
            app: { _id: addonId, application_number: addonNum, establishment_name: clientName },
            type: 'update_addon_certificate',
            title: 'Add-on Approved: Issue Certificate',
            tag: 'Issue Cert',
            desc: `Add ${productCount} approved product(s) to Halal Certificate for ${clientName}`,
            buttonText: 'Issue Certificate',
            buttonBg: '#16a34a',
            isFullPage: true,
            link: `/addon-applications/${addonId}/processing`,
            icon: <Award size={16} />
          });
        }
      }

      setItems(actionList);

      // Auto-open modal once on initial load if items exist and not previously dismissed in this session
      const isDismissed = sessionStorage.getItem('admin_actions_dismissed') === 'true';
      if (actionList.length > 0 && !isDismissed && !hasInitializedAutoOpen) {
        setIsOpen(true);
      }
      setHasInitializedAutoOpen(true);
    } catch (err) {
      console.error('Failed to fetch admin actions:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hasInitializedAutoOpen]);

  useEffect(() => {
    fetchAdminActions();
  }, [fetchAdminActions]);

  const handleRefresh = () => {
    fetchAdminActions();
    if (onActionCompleted) onActionCompleted();
  };

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('admin_actions_dismissed', 'true');
  };

  const handleManualOpen = () => {
    setIsOpen(true);
  };

  const handleMarkReady = async (app) => {
    try {
      const targetId = getCleanId(app._id || app.id || app);
      await api.put(`/api/applications/${targetId}/ready-for-certificate`);
      toast.success('Application marked Ready for Certificate!');
      handleRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update status.');
    }
  };

  // Filtered action items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const appNum = String(item.app?.application_number || '').toLowerCase();
      const estName = String(item.app?.establishment_name || '').toLowerCase();
      const title = String(item.title || '').toLowerCase();
      const desc = String(item.desc || '').toLowerCase();
      return appNum.includes(q) || estName.includes(q) || title.includes(q) || desc.includes(q);
    });
  }, [items, activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    return {
      all: items.length,
      applications: items.filter(i => i.category === 'applications').length,
      proposals: items.filter(i => i.category === 'proposals').length,
      invoices: items.filter(i => i.category === 'invoices').length,
      initial_products: items.filter(i => i.category === 'initial_products').length,
      addons: items.filter(i => i.category === 'addons').length,
    };
  }, [items]);

  if (loading && items.length === 0) return null;
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* ── Persistent Banner Trigger on Dashboard ── */}
      <div
        onClick={handleManualOpen}
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          border: '1.5px solid #bfdbfe',
          borderRadius: 16,
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(37,99,235,0.08)',
          transition: 'all 0.2s ease-in-out'
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.14)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 3px 10px rgba(37,99,235,0.08)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 10 }}>
              Admin Action Required
              <span style={{
                background: '#2563eb', color: 'white',
                borderRadius: 12, padding: '2px 10px',
                fontSize: 12, fontWeight: 800, letterSpacing: '0.02em'
              }}>
                {items.length} {items.length === 1 ? 'Task' : 'Tasks'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#3b82f6', marginTop: 3, fontWeight: 500 }}>
              {items.length === 1 ? '1 task requires immediate administrative action' : `${items.length} tasks require immediate administrative action`} &middot; Click to review &amp; process
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-primary"
            style={{
              gap: 8, fontWeight: 700, background: '#2563eb',
              borderColor: '#2563eb', padding: '9px 18px', borderRadius: 8,
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
            onClick={(e) => { e.stopPropagation(); handleManualOpen(); }}
          >
            View Action Items <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Pop-Up Modal ── */}
      {isOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={handleDismiss}>
          <div
            className="modal"
            style={{
              maxWidth: 780, width: '94%', borderRadius: 16,
              padding: 0, overflow: 'hidden', maxHeight: '88vh',
              display: 'flex', flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Admin Action Required
                    <span style={{ background: '#2563eb', color: 'white', borderRadius: 12, padding: '2px 9px', fontSize: 12, fontWeight: 800 }}>
                      {items.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                    Process pending applications, invoices, and certificates directly
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="btn btn-ghost btn-sm"
                  title="Refresh Action Items"
                  style={{ color: '#475569', padding: '6px 10px', borderRadius: 8 }}
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  className="modal-close"
                  onClick={handleDismiss}
                  title="Close Modal"
                  style={{ padding: 6 }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div style={{ padding: '12px 24px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              {/* Category Pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All Tasks', count: categoryCounts.all },
                  { id: 'applications', label: 'Applications', count: categoryCounts.applications },
                  { id: 'proposals', label: 'Proposals', count: categoryCounts.proposals },
                  { id: 'invoices', label: 'Payments / Invoices', count: categoryCounts.invoices },
                  { id: 'initial_products', label: 'Initial Products', count: categoryCounts.initial_products },
                  { id: 'addons', label: 'Add-Ons', count: categoryCounts.addons },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: '1px solid',
                      borderColor: activeCategory === cat.id ? '#2563eb' : '#e2e8f0',
                      background: activeCategory === cat.id ? '#eff6ff' : '#ffffff',
                      color: activeCategory === cat.id ? '#1d4ed8' : '#64748b',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s'
                    }}
                  >
                    <span>{cat.label}</span>
                    <span style={{
                      background: activeCategory === cat.id ? '#2563eb' : '#f1f5f9',
                      color: activeCategory === cat.id ? '#ffffff' : '#64748b',
                      borderRadius: 10,
                      padding: '1px 6px',
                      fontSize: 11,
                      fontWeight: 800
                    }}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Quick Search */}
              <div style={{ position: 'relative', minWidth: 200, flex: 1, maxWidth: 260 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ paddingLeft: 30, fontSize: 12, borderRadius: 8, height: 32 }}
                  placeholder="Filter company or #..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Action Items List */}
            <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {filteredItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <CheckCircle2 size={40} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                    {searchQuery ? 'No matching action items found' : 'All Caught Up!'}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    {searchQuery ? 'Try clearing your search keyword.' : 'There are no pending administrative tasks requiring your immediate attention.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'transform 0.15s ease, border-color 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                            {item.title}
                          </span>
                          <span style={{
                            background: '#f1f5f9', color: '#475569',
                            borderRadius: 6, padding: '2px 7px',
                            fontSize: 11.5, fontWeight: 700
                          }}>
                            #{item.app?.application_number || 'N/A'}
                          </span>
                          {item.tag && (
                            <span style={{
                              background: '#eff6ff', color: '#1d4ed8',
                              borderRadius: 6, padding: '2px 7px',
                              fontSize: 11, fontWeight: 700
                            }}>
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.4 }}>
                          {item.desc}
                        </div>
                      </div>

                      <div>
                        {item.isFullPage ? (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{
                              gap: 6, fontWeight: 700,
                              borderColor: '#cbd5e1',
                              padding: '8px 16px', borderRadius: 8
                            }}
                            onClick={() => {
                              handleDismiss();
                              navigate(item.link || `/applications/${item.app._id || item.app.id}/processing`);
                            }}
                          >
                            {item.icon} {item.buttonText} <ArrowRight size={14} />
                          </button>
                        ) : item.type === 'mark_ready_certificate' ? (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{
                              background: item.buttonBg || '#9333ea',
                              borderColor: item.buttonBg || '#9333ea',
                              gap: 6, fontWeight: 700,
                              padding: '8px 16px', borderRadius: 8
                            }}
                            onClick={() => handleMarkReady(item.app)}
                          >
                            {item.icon} {item.buttonText}
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{
                              background: item.buttonBg || '#2563eb',
                              borderColor: item.buttonBg || '#2563eb',
                              gap: 6, fontWeight: 700,
                              padding: '8px 16px', borderRadius: 8
                            }}
                            onClick={() => setActiveModal({ type: item.type, app: item.app, invoice: item.invoice })}
                          >
                            {item.icon} {item.buttonText}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> pending action {items.length === 1 ? 'item' : 'items'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleDismiss}
                  style={{ fontWeight: 600, color: '#64748b' }}
                >
                  Dismiss for this Session
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleDismiss}
                  style={{ fontWeight: 700 }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Shared Modals Triggered Directly from Widget ── */}
      {activeModal?.type === 'confirm_payment' && (
        <ConfirmPaymentModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          invoice={activeModal.invoice}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'send_proposal' && (
        <ProposalModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'send_initial_invoice' && (
        <InvoiceModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          invoiceType="initial"
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'send_final_invoice' && (
        <InvoiceModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          invoiceType="final"
          onSuccess={handleRefresh}
        />
      )}

      {(activeModal?.type === 'finalize_audit_date' || activeModal?.type === 'manage_audit') && (
        <AuditManageModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'send_agreement' && (
        <AgreementModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'send_final_agreement' && (
        <FinalAgreementModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'issue_certificate' && (
        <CertificateModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
