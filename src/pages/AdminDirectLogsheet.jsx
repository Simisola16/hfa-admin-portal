import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ResendLogsheetEmailModal from '../components/ResendLogsheetEmailModal';
import {
  ClipboardList, Shield, ShieldCheck, Plus, Trash2, Copy, Download, Search,
  CheckCircle2, AlertTriangle, FileText, Sparkles, Building2, Package,
  Calendar, Check, X, ArrowRight, RefreshCw, Upload, Eye, FileCheck2,
  Lock, ExternalLink, HelpCircle, Layers, AlertCircle, Info, ChevronDown,
  Building, MapPin, User, Mail, PenTool, Clock, Tag, MessageSquare, Award,
  UploadCloud, ChevronRight, Printer, CheckSquare, FileSpreadsheet, ArrowLeftRight
} from 'lucide-react';

const CERTIFICATE_STANDARDS = [
  'GSO MEAT',
  'GSO NON MEAT',
  'HFA SCHEME MEAT',
  'HFA SCHEME NON MEAT',
  'COSMETICS',
  'SMIIC'
];

const AUDIT_TYPE_OPTIONS = [
  'Direct Logsheet Review',
  'Annual Halal Audit',
  'Surveillance Audit',
  'Renewal Evaluation',
  'Initial Product Evaluation',
  'Facility Extension Review',
  'Add-on Product Review',
  'Special Product Assessment'
];

const NATURE_OF_BUSINESS_PRESETS = [
  'Halal Meat & Poultry Processing',
  'Food Manufacturing & Packaging',
  'Bakery & Confectionery Production',
  'Dairy & Beverage Processing',
  'Flavourings & Food Ingredients Supply',
  'Cosmetics & Personal Care Formulation',
  'Pharmaceutical & Nutraceutical Processing',
  'Warehousing, Storage & Logistics'
];

const LOGSHEET_TYPES = [
  {
    id: 'application',
    title: 'Application Logsheet',
    shortTitle: 'Application',
    subtitle: 'Standard Halal Certification & Annual Renewal',
    icon: FileText,
    badge: 'Full Certification',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeBorder: '#bfdbfe',
    description: 'Evaluate new certification or renewal applications, standards compliance, full product schedules, and committee sign-offs.'
  },
  {
    id: 'initial_product',
    title: 'Initial Product Logsheet',
    shortTitle: 'Initial Product',
    subtitle: 'Pre-production Formulation & Raw Material Clearance',
    icon: Package,
    badge: 'Product Clearance',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    badgeBorder: '#ddd6fe',
    description: 'Technical evaluation of initial product formulations, raw material halal sources, E-numbers/additives, and lab test verification.'
  },
  {
    id: 'addon',
    title: 'Add-on Logsheet',
    shortTitle: 'Add-on',
    subtitle: 'Mid-cycle Product & Facility Expansion',
    icon: Plus,
    badge: 'Product Expansion',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    badgeBorder: '#a7f3d0',
    description: 'Add new products, manufacturing lines, or site locations to an existing active Halal certificate.'
  },
  {
    id: 'extension',
    title: 'Extension Logsheet',
    shortTitle: 'Extension',
    subtitle: 'Certificate Validity & Audit Extension Approval',
    icon: Clock,
    badge: 'Validity Extension',
    badgeColor: '#d97706',
    badgeBg: '#fffbeb',
    badgeBorder: '#fde68a',
    description: 'Authorize a temporary 30, 60, 90, or 180-day validity extension on an existing certificate pending re-audit or corrective action closure.'
  }
];

export default function AdminDirectLogsheet() {
  const { id: routeDirectId } = useParams();
  const { user, profile } = useAuth();
  const currentUser = profile || user;
  const navigate = useNavigate();

  // Role permissions
  const userRoles = Array.isArray(profile?.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? [profile.role] : (Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean)));
  const isSuperAdmin = userRoles.includes('superadmin');
  const isStaff = isSuperAdmin || userRoles.some(r => ['admin', 'scheme_manager', 'certificate_officer', 'food_tech_manager', 'food_tech', 'audit_manager'].includes(r));

  // Active View Tab: 'create' | 'history'
  const [activeTab, setActiveTab] = useState(routeDirectId ? 'history' : 'create');

  // Selected Logsheet Type
  const [selectedType, setSelectedType] = useState('application');

  // Loading States
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Collections
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [directHistory, setDirectHistory] = useState([]);

  // Client Selection Mode: 'existing' | 'new'
  const [clientMode, setClientMode] = useState('existing');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Quick Client Creation Form
  const [newClient, setNewClient] = useState({
    company_name: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
    postcode: '',
    country: 'United Kingdom'
  });

  // Site / Facility Selection
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [customSiteName, setCustomSiteName] = useState('');
  const [customSiteAddress, setCustomSiteAddress] = useState('');
  const [customManufacturingAddress, setCustomManufacturingAddress] = useState('');

  // 4-Tab Stepper for Direct Logsheet Creation
  const [createStep, setCreateStep] = useState(1);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const oneYearLaterStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thirtyDaysLaterStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [form, setForm] = useState({
    logsheet_type: 'application',
    certificate_standard: 'GSO MEAT',
    scope: 'Halal Food Certification & Processing Operations',
    nature_of_business: NATURE_OF_BUSINESS_PRESETS[0],
    product_category: 'General Food Products',
    product_name: '',
    product_code: '',
    issue_date: todayStr,
    expiry_date: oneYearLaterStr,
    current_cycle_start: todayStr,
    original_cycle_start: todayStr,

    // Extension Specific Fields
    existing_certificate_number: '',
    extension_duration_type: '30_days',
    extension_days: 30,
    extension_reason: 'Scheduled re-audit pending completion; production parameters unchanged.',
    extended_expiry_date: thirtyDaysLaterStr,

    // Add-on Specific Fields
    addon_type: 'New Products',
    raw_materials_approved: 'Yes',
    cross_contamination_risk: 'None',

    // Initial Product Specific Fields
    formulation_checked: 'Yes',
    lab_test_required: 'No',
    initial_approval_stage: 'Stage 1 - Desk Review',
    decision_type: 'Approved',
    
    // Tab 2: Review of Application
    audit_type: 'Direct Logsheet Review',
    audit_date: todayStr,
    auditors: currentUser?.full_name ? `${currentUser.full_name} (Lead Auditor)` : 'Lead Auditor',
    ncs_close: 'N/A - Direct Logsheet Review',
    docs_satisfactory: 'Satisfactory - all product specifications, formulas, and halal statements verified',
    pork_free_statement: 'Confirmed - signed pork-free declaration in place',
    reviewed_by: currentUser?.full_name || 'HFA Technical Committee',
    reviewer_name: currentUser?.full_name || 'HFA Technical Reviewer',
    review_date: todayStr,

    // Tab 3: Certificate Status
    annual_certificate: 'Yes',
    batch_certificate: 'No',
    new_products_only: 'No',
    new_site_line: 'No',
    new_client: 'No',
    agreement_signed: 'Yes',
    status_date: todayStr,

    // Tab 4: Comments
    comment: 'Direct logsheet verified and submitted for Shari\'a & Technical Committee review.',

    // Supporting Files
    document_urls: [],
    audit_reports: [],
    nc_reports_files: []
  });

  // Handle Type Change
  const handleTypeSelect = (typeId) => {
    setSelectedType(typeId);
    setForm(prev => {
      let updatedAuditType = 'Direct Logsheet Review';
      let defaultComment = 'Direct logsheet verified and submitted for Shari\'a & Technical Committee review.';
      
      if (typeId === 'extension') {
        updatedAuditType = 'Certificate Extension Review';
        defaultComment = 'Certificate extension evaluated and recommended based on satisfactory compliance history.';
      } else if (typeId === 'addon') {
        updatedAuditType = 'Add-on Product Review';
        defaultComment = 'Add-on products evaluated and verified compliant with Halal scheme standards.';
      } else if (typeId === 'initial_product') {
        updatedAuditType = 'Initial Product Evaluation';
        defaultComment = 'Initial product formulations and ingredients cleared for Halal processing.';
      }

      return {
        ...prev,
        logsheet_type: typeId,
        audit_type: updatedAuditType,
        comment: defaultComment
      };
    });
  };

  // Product List Builder
  const [products, setProducts] = useState([
    { id: 1, name: '', code: 'PRD-01', category: 'General Food Products', product_type: 'Processed', barcode: '', ingredients: '', e_numbers: '', halal_status: 'Halal Certified' }
  ]);

  // Bulk Product Paste State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Initial Sign on Create (Optional)
  const [signOnCreate, setSignOnCreate] = useState(false);
  const [initialRole, setInitialRole] = useState('manager');
  const [sendNotifications, setSendNotifications] = useState(true);

  // Modals & Inspect
  const [inspectLogsheet, setInspectLogsheet] = useState(null);
  const [reviewSignModal, setReviewSignModal] = useState(null);
  const [showResendModal, setShowResendModal] = useState(false);
  const [selectedLogsheetForEmail, setSelectedLogsheetForEmail] = useState(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState('all');
  const [historyFilterType, setHistoryFilterType] = useState('all');

  // Load Initial Resources
  const fetchInitialData = async () => {
    setLoadingData(true);
    try {
      const [usersRes, sitesRes, sigsRes] = await Promise.all([
        api.get('/api/users').catch(() => ({ data: [] })),
        api.get('/api/sites').catch(() => ({ data: [] })),
        api.get('/api/signatures').catch(() => ({ data: [] }))
      ]);

      const userList = Array.isArray(usersRes) ? usersRes : (Array.isArray(usersRes?.data) ? usersRes.data : []);
      const siteList = Array.isArray(sitesRes) ? sitesRes : (Array.isArray(sitesRes?.data) ? sitesRes.data : []);
      const sigList = Array.isArray(sigsRes) ? sigsRes : (Array.isArray(sigsRes?.data) ? sigsRes.data : (sigsRes?.data?.data || []));

      const clientAccounts = userList.filter(u => u.role === 'client');
      setClients(clientAccounts);
      setSites(siteList);
      setSignatures(sigList);
    } catch (err) {
      toast.error('Failed to load portal resources');
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch Direct History
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/api/application-logsheets/direct-history');
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setDirectHistory(list);

      // If route has specific direct ID, open inspection or review
      if (routeDirectId) {
        const found = list.find(l => l._id === routeDirectId);
        if (found) {
          setInspectLogsheet(found);
        }
      }
    } catch (err) {
      toast.error('Failed to load direct logsheets history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchHistory();
  }, []);

  // Update extension extended date based on days or duration type
  const handleExtensionDurationChange = (durationType, days = 30) => {
    const baseDate = form.expiry_date ? new Date(form.expiry_date) : new Date();
    const targetDays = durationType === '30_days' ? 30 : durationType === '60_days' ? 60 : durationType === '90_days' ? 90 : durationType === '180_days' ? 180 : days;
    const newDate = new Date(baseDate.getTime() + targetDays * 24 * 60 * 60 * 1000);
    const newDateStr = newDate.toISOString().split('T')[0];

    setForm(prev => ({
      ...prev,
      extension_duration_type: durationType,
      extension_days: targetDays,
      extended_expiry_date: newDateStr
    }));
  };

  // Filtered Client Suggestions
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients.slice(0, 10);
    const q = clientSearchQuery.toLowerCase();
    return clients.filter(c =>
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [clients, clientSearchQuery]);

  // Handle Client Selection
  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setClientSearchQuery(client.company_name || client.full_name || '');
    
    // Auto-fill addresses
    const clientAddress = client.address || client.company_address || '';
    setCustomSiteAddress(clientAddress);
    setCustomManufacturingAddress(clientAddress);
    setForm(prev => ({
      ...prev,
      company_name: client.company_name || client.full_name,
      contact_person: client.full_name || client.contact_person || '',
      contact_email: client.email || '',
      company_address: clientAddress,
      manufacturing_address: clientAddress
    }));

    // Check if client has sites
    const clientSites = sites.filter(s => s.client_id === client._id || s.client_id?._id === client._id);
    if (clientSites.length > 0) {
      setSelectedSiteId(clientSites[0]._id);
      setCustomSiteName(clientSites[0].name || clientSites[0].site_name || 'Main Facility');
    } else {
      setSelectedSiteId('');
      setCustomSiteName(client.company_name ? `${client.company_name} - Main Site` : 'Main Production Facility');
    }
  };

  // Product Row Management
  const addProductRow = () => {
    const nextIdx = products.length + 1;
    setProducts(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        name: '',
        code: `PRD-${String(nextIdx).padStart(2, '0')}`,
        category: form.product_category || 'General Food Products',
        product_type: 'Processed',
        barcode: '',
        ingredients: '',
        e_numbers: '',
        halal_status: 'Halal Certified'
      }
    ]);
  };

  const removeProductRow = (rowId) => {
    if (products.length <= 1) {
      toast.error('At least one product item is required.');
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== rowId));
  };

  const updateProductRow = (rowId, field, val) => {
    setProducts(prev => prev.map(p => p.id === rowId ? { ...p, [field]: val } : p));
  };

  // Parse Bulk Products
  const handleBulkParse = () => {
    if (!bulkText.trim()) {
      setShowBulkModal(false);
      return;
    }
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map((line, idx) => {
      const parts = line.split(/[,\t|]/).map(s => s.trim());
      return {
        id: Date.now() + idx + Math.random(),
        code: parts.length > 1 && parts[0].length <= 15 ? parts[0] : `PRD-${String(products.length + idx + 1).padStart(2, '0')}`,
        name: parts.length > 1 && parts[0].length <= 15 ? parts[1] : parts[0],
        category: parts[2] || form.product_category || 'General Food Products',
        product_type: parts[3] || 'Processed',
        barcode: parts[4] || '',
        ingredients: parts[5] || '',
        e_numbers: '',
        halal_status: 'Halal Certified'
      };
    });

    setProducts(prev => {
      const initialEmpty = prev.length === 1 && !prev[0].name.trim();
      return initialEmpty ? parsed : [...prev, ...parsed];
    });

    setBulkText('');
    setShowBulkModal(false);
    toast.success(`Imported ${parsed.length} products successfully`);
  };

  // Submit Direct Logsheet
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);

    try {
      const validProducts = products.filter(p => p.name && p.name.trim()).map((p, idx) => ({
        name: p.name.trim(),
        code: p.code?.trim() || `PRD-${String(idx + 1).padStart(2, '0')}`,
        category: p.category || form.product_category,
        product_type: p.product_type || 'Processed',
        barcode: p.barcode || '',
        ingredients: p.ingredients || '',
        e_numbers: p.e_numbers || '',
        halal_status: p.halal_status || 'Halal Certified'
      }));

      if (validProducts.length === 0 && selectedType !== 'extension') {
        toast.error('Please enter at least one product name in the products schedule.');
        setSubmitting(false);
        setCreateStep(1);
        return;
      }

      const compName = clientMode === 'existing'
        ? (selectedClient?.company_name || form.company_name)
        : (newClient.company_name || form.company_name);

      if (!compName || !compName.trim()) {
        toast.error('Company Name is required.');
        setSubmitting(false);
        setCreateStep(1);
        return;
      }

      // Check user signature if signOnCreate is checked
      let sigUrl = null;
      let sigName = null;
      if (signOnCreate) {
        const foundSig = signatures.find(s => s.role === initialRole || s.user_id === currentUser?._id);
        sigUrl = foundSig?.signature_url || currentUser?.signature_url || 'digital_auth_signature';
        sigName = foundSig?.signer_name || currentUser?.full_name || currentUser?.username || 'Authorized Signatory';
      }

      const payload = {
        ...form,
        logsheet_type: selectedType,
        company_name: compName.trim(),
        company_address: form.company_address || customSiteAddress || '—',
        manufacturing_address: customManufacturingAddress || customSiteAddress || form.company_address || '—',
        site_name: customSiteName || 'Main Manufacturing Facility',
        client_id: clientMode === 'existing' ? selectedClient?._id : undefined,
        new_client: clientMode === 'new' ? newClient : undefined,
        site_id: selectedSiteId || undefined,
        products_list: validProducts,
        role: signOnCreate ? initialRole : undefined,
        signature_url: signOnCreate ? sigUrl : undefined,
        signature_name: signOnCreate ? sigName : undefined,
        send_signatory_notifications: sendNotifications
      };

      const res = await api.post('/api/application-logsheets/direct', payload);
      const created = res.data?.data;

      toast.success(res.data?.message || 'Direct Logsheet created successfully!');
      
      // Refresh direct history and switch to history view
      await fetchHistory();
      setActiveTab('history');
      if (created?._id) {
        setInspectLogsheet(created);
      }

      // Reset step
      setCreateStep(1);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create direct logsheet');
    } finally {
      setSubmitting(false);
    }
  };

  // Sign Direct Logsheet Modal Submit
  const handleReviewSign = async (logsheetId, signatureRole, signatureName, signatureUrl) => {
    try {
      const res = await api.put(`/api/application-logsheets/${logsheetId}/sign`, {
        role: signatureRole,
        signature_name: signatureName,
        signature_url: signatureUrl
      });
      toast.success(res.data?.message || 'Signature applied successfully!');
      setReviewSignModal(null);
      fetchHistory();
      if (inspectLogsheet && inspectLogsheet._id === logsheetId) {
        setInspectLogsheet(res.data?.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to sign logsheet');
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return directHistory.filter(l => {
      // Type Filter
      if (historyFilterType !== 'all') {
        const itemType = l.logsheet_type || 'application';
        if (itemType !== historyFilterType) return false;
      }

      // Status Filter
      if (historyFilterStatus === 'signed' && l.status !== 'Signed' && l.status !== 'Completed') return false;
      if (historyFilterStatus === 'waiting' && l.status !== 'Waiting for Signature') return false;

      // Search Query
      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase();
      return (
        (l.direct_ref && l.direct_ref.toLowerCase().includes(q)) ||
        (l.company_name && l.company_name.toLowerCase().includes(q)) ||
        (l.existing_certificate_number && l.existing_certificate_number.toLowerCase().includes(q)) ||
        (l.contact_person && l.contact_person.toLowerCase().includes(q)) ||
        (l.certificate_standard && l.certificate_standard.toLowerCase().includes(q)) ||
        (l.audit_type && l.audit_type.toLowerCase().includes(q))
      );
    });
  }, [directHistory, historySearch, historyFilterStatus, historyFilterType]);

  const activeTypeObj = LOGSHEET_TYPES.find(t => t.id === selectedType) || LOGSHEET_TYPES[0];

  return (
    <div className="animate-in" style={{ maxWidth: 1380, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        color: '#fff',
        marginBottom: 24,
        boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ maxWidth: 750 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 10, backdropFilter: 'blur(4px)' }}>
            <Sparkles size={13} />
            HFA Certification Authority • Direct Studio
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Direct Halal Logsheet Studio
          </h1>
          <p style={{ fontSize: 13.5, color: '#d1fae5', margin: 0, lineHeight: 1.5 }}>
            Create and process official Decision Logsheets directly across all 4 certification modules: <strong>Application</strong>, <strong>Initial Product</strong>, <strong>Add-on</strong>, and <strong>Extension</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 13.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              border: activeTab === 'create' ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
              background: activeTab === 'create' ? '#fff' : 'rgba(255,255,255,0.1)',
              color: activeTab === 'create' ? '#065f46' : '#fff',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'create' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            <Plus size={16} />
            Create Direct Logsheet
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('history'); fetchHistory(); }}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 13.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              border: activeTab === 'history' ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
              background: activeTab === 'history' ? '#fff' : 'rgba(255,255,255,0.1)',
              color: activeTab === 'history' ? '#065f46' : '#fff',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'history' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            <Clock size={16} />
            Direct History ({directHistory.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW TAB 1: CREATE DIRECT LOGSHEET WIZARD                                 */}
      {/* ========================================================================= */}
      {activeTab === 'create' && (
        <div style={{ display: 'grid', gap: 24 }}>

          {/* 1. LOGSHEET TYPE SELECTION CARDS (All 4 Types) */}
          <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} style={{ color: 'var(--primary)' }} />
                  Select Logsheet Type / Workflow
                </h3>
                <p style={{ fontSize: 12.5, color: '#64748b', margin: '2px 0 0' }}>
                  Choose the exact certification evaluation type you want to create directly.
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: activeTypeObj.badgeBg, color: activeTypeObj.badgeColor, border: `1px solid ${activeTypeObj.badgeBorder}` }}>
                Current: {activeTypeObj.title}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              {LOGSHEET_TYPES.map(t => {
                const IconComponent = t.icon;
                const isSelected = selectedType === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleTypeSelect(t.id)}
                    style={{
                      padding: 18,
                      borderRadius: 14,
                      cursor: 'pointer',
                      border: isSelected ? `2px solid ${t.badgeColor}` : '1px solid #e2e8f0',
                      background: isSelected ? t.badgeBg : '#f8fafc',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: isSelected ? t.badgeColor : '#e2e8f0',
                        color: isSelected ? '#fff' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IconComponent size={20} />
                      </div>
                      {isSelected && (
                        <span style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: t.badgeColor,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 800
                        }}>
                          ✓
                        </span>
                      )}
                    </div>

                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: isSelected ? t.badgeColor : '#0f172a' }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                        {t.subtitle}
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4, marginTop: 'auto', paddingTop: 6 }}>
                      {t.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. 4-STEP WIZARD STEPPER */}
          <div className="card" style={{ padding: '16px 24px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
              {[
                {
                  step: 1,
                  title: selectedType === 'extension' ? '1. Certificate & Company' : selectedType === 'addon' ? '1. Add-on & Company' : selectedType === 'initial_product' ? '1. Company & Products' : '1. Company & Facility',
                  sub: selectedType === 'extension' ? 'Client & Expiry' : 'Details & Standards'
                },
                {
                  step: 2,
                  title: selectedType === 'extension' ? '2. Extension Duration' : selectedType === 'addon' ? '2. Add-on Schedule' : selectedType === 'initial_product' ? '2. Formulation & Specs' : '2. Audit Evaluation',
                  sub: selectedType === 'extension' ? 'Days & Expiry' : 'Compliance Review'
                },
                {
                  step: 3,
                  title: selectedType === 'extension' ? '3. Justification & Terms' : selectedType === 'addon' ? '3. Evaluation Decision' : selectedType === 'initial_product' ? '3. Product Clearance' : '3. Certificate Status',
                  sub: 'Recommendation'
                },
                {
                  step: 4,
                  title: '4. Signatures & Dispatch',
                  sub: 'Committee Sign-off'
                }
              ].map((s, idx) => {
                const isActive = createStep === s.step;
                const isPassed = createStep > s.step;
                return (
                  <div
                    key={s.step}
                    onClick={() => setCreateStep(s.step)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: isActive ? '#f0fdf4' : 'transparent',
                      border: isActive ? '1px solid #bbf7d0' : '1px solid transparent'
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: isPassed ? '#16a34a' : isActive ? 'var(--primary)' : '#e2e8f0',
                      color: isPassed || isActive ? '#fff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                      flexShrink: 0
                    }}>
                      {isPassed ? <Check size={16} /> : s.step}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#065f46' : '#0f172a' }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {s.sub}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WIZARD STEP CONTENTS */}
          <form onSubmit={handleSubmit}>

            {/* ================================================================= */}
            {/* STEP 1: COMPANY, FACILITY & STANDARD DETAILS                      */}
            {/* ================================================================= */}
            {createStep === 1 && (
              <div style={{ display: 'grid', gap: 20 }}>
                <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
                  
                  {/* Extension / Add-on Existing Certificate Header */}
                  {(selectedType === 'extension' || selectedType === 'addon') && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309', fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
                        <Award size={18} />
                        Active Certificate Reference Information
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                            Existing Certificate Number <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. HFA-UK-2025-00412"
                            value={form.existing_certificate_number}
                            onChange={e => setForm(f => ({ ...f, existing_certificate_number: e.target.value }))}
                            style={{ height: 40, borderRadius: 8, fontWeight: 700, background: '#fff' }}
                            required={selectedType === 'extension' || selectedType === 'addon'}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                            Current Certificate Expiry Date <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="date"
                            className="form-control"
                            value={form.expiry_date}
                            onChange={e => {
                              const val = e.target.value;
                              setForm(f => ({ ...f, expiry_date: val }));
                              if (selectedType === 'extension') {
                                handleExtensionDurationChange(form.extension_duration_type, form.extension_days);
                              }
                            }}
                            style={{ height: 40, borderRadius: 8, background: '#fff' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Client Selection Switcher */}
                  <div style={{ marginBottom: 20 }}>
                    <label className="form-label" style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, display: 'block' }}>
                      Client Account Selection
                    </label>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      <button
                        type="button"
                        className={`btn ${clientMode === 'existing' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setClientMode('existing')}
                        style={{ borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700 }}
                      >
                        <Building2 size={15} style={{ marginRight: 6 }} />
                        Select Existing Client
                      </button>
                      <button
                        type="button"
                        className={`btn ${clientMode === 'new' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setClientMode('new')}
                        style={{ borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700 }}
                      >
                        <Plus size={15} style={{ marginRight: 6 }} />
                        Quick Create New Client
                      </button>
                    </div>

                    {clientMode === 'existing' ? (
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search existing registered company by name or email..."
                          value={clientSearchQuery}
                          onChange={e => {
                            setClientSearchQuery(e.target.value);
                            if (selectedClient && e.target.value !== selectedClient.company_name) {
                              setSelectedClient(null);
                            }
                          }}
                          style={{ height: 42, borderRadius: 10, paddingLeft: 38 }}
                        />
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />

                        {clientSearchQuery && !selectedClient && (
                          <div style={{
                            position: 'absolute',
                            top: 48,
                            left: 0,
                            right: 0,
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            maxHeight: 220,
                            overflowY: 'auto',
                            zIndex: 50,
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                          }}>
                            {filteredClients.length === 0 ? (
                              <div style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>No matching clients found</div>
                            ) : (
                              filteredClients.map(c => (
                                <div
                                  key={c._id}
                                  onClick={() => handleSelectClient(c)}
                                  style={{
                                    padding: '10px 16px',
                                    borderBottom: '1px solid #f1f5f9',
                                    cursor: 'pointer',
                                    fontSize: 13
                                  }}
                                  className="dropdown-item"
                                >
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.company_name || c.full_name}</div>
                                  <div style={{ fontSize: 11.5, color: '#64748b' }}>{c.email} • {c.address || 'Address not specified'}</div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                        <div>
                          <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Company Name *</label>
                          <input className="form-control" value={newClient.company_name} onChange={e => setNewClient(n => ({ ...n, company_name: e.target.value }))} placeholder="e.g. Pure Halal Meats Ltd" required />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Contact Person Name *</label>
                          <input className="form-control" value={newClient.full_name} onChange={e => setNewClient(n => ({ ...n, full_name: e.target.value }))} placeholder="e.g. Sarah Jenkins" required />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Email Address *</label>
                          <input type="email" className="form-control" value={newClient.email} onChange={e => setNewClient(n => ({ ...n, email: e.target.value }))} placeholder="contact@company.com" required />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Registered Address</label>
                          <input className="form-control" value={newClient.address} onChange={e => setNewClient(n => ({ ...n, address: e.target.value }))} placeholder="123 Industrial Way, London" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Standard, Scope, Facility Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                        Halal Certification Standard / Scheme <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        className="form-control"
                        value={form.certificate_standard}
                        onChange={e => setForm(f => ({ ...f, certificate_standard: e.target.value }))}
                        style={{ height: 42, borderRadius: 8, fontWeight: 700 }}
                      >
                        {CERTIFICATE_STANDARDS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                        Facility / Manufacturing Site Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={customSiteName}
                        onChange={e => setCustomSiteName(e.target.value)}
                        placeholder="e.g. Unit 4 Slaughterhouse & Cutting Plant"
                        style={{ height: 42, borderRadius: 8 }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                        Operational Category / Evaluation
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.scope}
                        onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                        placeholder="e.g. Slaughtering, deboning, packaging and storage of Halal meat"
                        style={{ height: 42, borderRadius: 8 }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                        Facility Physical Address
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={customSiteAddress}
                        onChange={e => {
                          setCustomSiteAddress(e.target.value);
                          setCustomManufacturingAddress(e.target.value);
                        }}
                        placeholder="Factory address where certified operations take place"
                        style={{ height: 42, borderRadius: 8 }}
                      />
                    </div>
                  </div>

                  {/* Products Schedule for Application, Addon, and Initial Product */}
                  {selectedType !== 'extension' && (
                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Package size={16} style={{ color: 'var(--primary)' }} />
                            {selectedType === 'initial_product' ? 'Initial Products & Ingredients Specifications' : selectedType === 'addon' ? 'Add-on Products Schedule' : 'Certified Products Schedule'} ({products.length})
                          </h4>
                          <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                            {selectedType === 'initial_product' ? 'Enter individual product formulas, E-numbers, and ingredient sources.' : 'Add all product names covered by this logsheet.'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowBulkModal(true)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}>
                            <FileSpreadsheet size={14} style={{ marginRight: 4 }} /> Bulk Import / Paste
                          </button>
                          <button type="button" className="btn btn-primary btn-sm" onClick={addProductRow} style={{ borderRadius: 8, fontSize: 12 }}>
                            <Plus size={14} style={{ marginRight: 4 }} /> Add Product Row
                          </button>
                        </div>
                      </div>

                      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b' }}>Code</th>
                              <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b' }}>Product Name *</th>
                              <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b' }}>Category</th>
                              {selectedType === 'initial_product' && (
                                <>
                                  <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b' }}>Key Ingredients</th>
                                  <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b' }}>E-Numbers / Additives</th>
                                </>
                              )}
                              <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'right' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map((p, idx) => (
                              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 14px', width: 120 }}>
                                  <input
                                    className="form-control"
                                    value={p.code}
                                    onChange={e => updateProductRow(p.id, 'code', e.target.value)}
                                    placeholder="PRD-01"
                                    style={{ height: 36, fontSize: 12, fontWeight: 700 }}
                                  />
                                </td>
                                <td style={{ padding: '8px 14px' }}>
                                  <input
                                    className="form-control"
                                    value={p.name}
                                    onChange={e => updateProductRow(p.id, 'name', e.target.value)}
                                    placeholder="e.g. Whole Frozen Halal Chicken 1200g"
                                    style={{ height: 36, fontSize: 13, fontWeight: 600 }}
                                    required={idx === 0 && selectedType !== 'extension'}
                                  />
                                </td>
                                <td style={{ padding: '8px 14px', width: 180 }}>
                                  <input
                                    className="form-control"
                                    value={p.category}
                                    onChange={e => updateProductRow(p.id, 'category', e.target.value)}
                                    placeholder="Poultry"
                                    style={{ height: 36, fontSize: 12 }}
                                  />
                                </td>
                                {selectedType === 'initial_product' && (
                                  <>
                                    <td style={{ padding: '8px 14px', width: 220 }}>
                                      <input
                                        className="form-control"
                                        value={p.ingredients || ''}
                                        onChange={e => updateProductRow(p.id, 'ingredients', e.target.value)}
                                        placeholder="Water, Sugar, Flavours..."
                                        style={{ height: 36, fontSize: 12 }}
                                      />
                                    </td>
                                    <td style={{ padding: '8px 14px', width: 150 }}>
                                      <input
                                        className="form-control"
                                        value={p.e_numbers || ''}
                                        onChange={e => updateProductRow(p.id, 'e_numbers', e.target.value)}
                                        placeholder="E150d, E330..."
                                        style={{ height: 36, fontSize: 12 }}
                                      />
                                    </td>
                                  </>
                                )}
                                <td style={{ padding: '8px 14px', textAlign: 'right', width: 60 }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: '#dc2626', padding: 6 }}
                                    onClick={() => removeProductRow(p.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                    <button type="button" className="btn btn-primary" onClick={() => setCreateStep(2)} style={{ padding: '10px 24px', fontWeight: 700, borderRadius: 10 }}>
                      Next: {selectedType === 'extension' ? 'Extension Duration' : selectedType === 'addon' ? 'Add-on Details' : selectedType === 'initial_product' ? 'Formulation Review' : 'Audit Evaluation'} →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* STEP 2: EVALUATION / DURATION / ADD-ON PARAMETERS                 */}
            {/* ================================================================= */}
            {createStep === 2 && (
              <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
                  {selectedType === 'extension' ? 'Certificate Extension Duration & Parameters' : selectedType === 'addon' ? 'Add-on Products & Raw Material Evaluation' : selectedType === 'initial_product' ? 'Initial Product Formulation & Lab Checklist' : 'Audit Review & Technical Evaluation'}
                </h3>

                {/* EXTENSION SPECIFIC DURATION STEP */}
                {selectedType === 'extension' && (
                  <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                      <label className="form-label" style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, display: 'block' }}>
                        Select Extension Period Duration
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        {[
                          { id: '30_days', label: '30 Days', sub: 'Standard 1-Month Extension', days: 30 },
                          { id: '60_days', label: '60 Days', sub: '2-Month Extension', days: 60 },
                          { id: '90_days', label: '90 Days', sub: '3-Month Comprehensive', days: 90 },
                          { id: '180_days', label: '180 Days', sub: '6-Month Maximum Allowed', days: 180 }
                        ].map(d => (
                          <div
                            key={d.id}
                            onClick={() => handleExtensionDurationChange(d.id, d.days)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: 10,
                              cursor: 'pointer',
                              border: form.extension_duration_type === d.id ? '2px solid #d97706' : '1px solid #cbd5e1',
                              background: form.extension_duration_type === d.id ? '#fffbeb' : '#fff'
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: 14, color: form.extension_duration_type === d.id ? '#b45309' : '#0f172a' }}>{d.label}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{d.sub}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Calculated New Extended Expiry Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={form.extended_expiry_date}
                          onChange={e => setForm(f => ({ ...f, extended_expiry_date: e.target.value }))}
                          style={{ height: 42, borderRadius: 8, fontWeight: 800, color: '#b45309' }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Evaluation Type</label>
                        <input className="form-control" value="Certificate Validity Extension Review" disabled style={{ height: 42, borderRadius: 8, background: '#f1f5f9' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ADD-ON SPECIFIC EVALUATION STEP */}
                {selectedType === 'addon' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Add-on Classification Type</label>
                      <select className="form-control" value={form.addon_type} onChange={e => setForm(f => ({ ...f, addon_type: e.target.value }))} style={{ height: 42, borderRadius: 8, fontWeight: 600 }}>
                        <option value="New Products">New Products Addition</option>
                        <option value="New Production Line">New Production Line Addition</option>
                        <option value="Site Addition">Manufacturing Site Addition</option>
                        <option value="Brand Amendment">Brand / Formulation Amendment</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Raw Materials Halal Certification Validated?</label>
                      <select className="form-control" value={form.raw_materials_approved} onChange={e => setForm(f => ({ ...f, raw_materials_approved: e.target.value }))} style={{ height: 42, borderRadius: 8, fontWeight: 600 }}>
                        <option value="Yes">Yes — All supplier certificates valid & cross-referenced</option>
                        <option value="No">No — Pending supplier clarification</option>
                        <option value="N/A">N/A — Same raw material inventory</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Cross-Contamination Risk Level</label>
                      <select className="form-control" value={form.cross_contamination_risk} onChange={e => setForm(f => ({ ...f, cross_contamination_risk: e.target.value }))} style={{ height: 42, borderRadius: 8, fontWeight: 600 }}>
                        <option value="None">None — Dedicated Halal facility</option>
                        <option value="Low">Low — Validated CIP & sanitation schedules</option>
                        <option value="Medium">Medium — Production schedule segregation required</option>
                        <option value="High">High — Physical segregation audit mandatory</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* INITIAL PRODUCT SPECIFIC EVALUATION STEP */}
                {selectedType === 'initial_product' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Formulation & Recipe Checked?</label>
                      <select className="form-control" value={form.formulation_checked} onChange={e => setForm(f => ({ ...f, formulation_checked: e.target.value }))} style={{ height: 42, borderRadius: 8, fontWeight: 600 }}>
                        <option value="Yes">Yes — 100% ingredients and processing aids verified</option>
                        <option value="No">No — Formula undergoing technical query</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Laboratory Testing / DNA Analysis Required?</label>
                      <select className="form-control" value={form.lab_test_required} onChange={e => setForm(f => ({ ...f, lab_test_required: e.target.value }))} style={{ height: 42, borderRadius: 8, fontWeight: 600 }}>
                        <option value="No">No — Desk review of certified ingredients sufficient</option>
                        <option value="Yes">Yes — Ethanol / Porcine DNA testing requested</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Initial Evaluation Stage</label>
                      <select className="form-control" value={form.initial_approval_stage} onChange={e => setForm(f => ({ ...f, initial_approval_stage: e.target.value }))} style={{ height: 42, borderRadius: 8, fontWeight: 600 }}>
                        <option value="Stage 1 - Desk Review">Stage 1 - Desk Review & Specification Clearance</option>
                        <option value="Stage 2 - Sample Testing">Stage 2 - Sample Analysis & Lab Clearance</option>
                        <option value="Stage 3 - Production Trial">Stage 3 - Production Trial & Final Clearance</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* GENERAL AUDIT / REVIEW FIELDS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Audit / Review Date</label>
                    <input type="date" className="form-control" value={form.audit_date} onChange={e => setForm(f => ({ ...f, audit_date: e.target.value }))} style={{ height: 42, borderRadius: 8 }} />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Auditor / Technical Officer Name</label>
                    <input className="form-control" value={form.auditors} onChange={e => setForm(f => ({ ...f, auditors: e.target.value }))} placeholder="Lead Auditor" style={{ height: 42, borderRadius: 8 }} />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>NCs Closure & Corrective Actions</label>
                    <input className="form-control" value={form.ncs_close} onChange={e => setForm(f => ({ ...f, ncs_close: e.target.value }))} style={{ height: 42, borderRadius: 8 }} />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Documentation & Specifications</label>
                    <input className="form-control" value={form.docs_satisfactory} onChange={e => setForm(f => ({ ...f, docs_satisfactory: e.target.value }))} style={{ height: 42, borderRadius: 8 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setCreateStep(1)} style={{ borderRadius: 8 }}>
                    ← Back
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => setCreateStep(3)} style={{ padding: '10px 24px', fontWeight: 700, borderRadius: 10 }}>
                    Next: {selectedType === 'extension' ? 'Justification & Terms' : selectedType === 'addon' ? 'Evaluation Decision' : selectedType === 'initial_product' ? 'Product Clearance' : 'Certificate Status'} →
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* STEP 3: DECISION & RECOMMENDATION                                 */}
            {/* ================================================================= */}
            {createStep === 3 && (
              <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={18} style={{ color: 'var(--primary)' }} />
                  {selectedType === 'extension' ? 'Extension Justification & Authorization Terms' : selectedType === 'addon' ? 'Add-on Approval Decision & Validity Dates' : selectedType === 'initial_product' ? 'Initial Product Approval Decision' : 'Certificate Status & Committee Recommendation'}
                </h3>

                {/* EXTENSION JUSTIFICATION */}
                {selectedType === 'extension' ? (
                  <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                        Justification / Reason for Validity Extension <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={form.extension_reason}
                        onChange={e => setForm(f => ({ ...f, extension_reason: e.target.value }))}
                        placeholder="State technical justification (e.g. Scheduled re-audit date confirmed, raw material audit continuity, minor NC closure in progress)..."
                        style={{ borderRadius: 10 }}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                      <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Current Certificate Expiry</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{form.expiry_date}</div>
                      </div>
                      <div style={{ background: '#fffbeb', padding: 14, borderRadius: 10, border: '1px solid #fde68a' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>New Authorized Expiry Date</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#b45309', marginTop: 4 }}>{form.extended_expiry_date} ({form.extension_days} Days)</div>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 10, border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Extension Official Decision</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#15803d', marginTop: 4 }}>Approved & Letter Issued</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Official Decision Recommendation</label>
                      <select className="form-control" value={form.decision_type} onChange={e => setForm(f => ({ ...f, decision_type: e.target.value }))} style={{ height: 42, borderRadius: 8, fontWeight: 700 }}>
                        <option value="Approved">Approved / Cleared for Certification</option>
                        <option value="Conditional Approval">Conditional Approval (Minor NC / Spec Clarification)</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Issue Date of Decision</label>
                      <input type="date" className="form-control" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} style={{ height: 42, borderRadius: 8 }} />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Expiry / Valid Until Date</label>
                      <input type="date" className="form-control" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} style={{ height: 42, borderRadius: 8 }} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Committee Executive Comments & Technical Endorsement</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.comment}
                    onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                    style={{ borderRadius: 10 }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setCreateStep(2)} style={{ borderRadius: 8 }}>
                    ← Back
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => setCreateStep(4)} style={{ padding: '10px 24px', fontWeight: 700, borderRadius: 10 }}>
                    Next: Signatures & Dispatch →
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* STEP 4: SIGNATURES & DISPATCH                                     */}
            {/* ================================================================= */}
            {createStep === 4 && (
              <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PenTool size={18} style={{ color: 'var(--primary)' }} />
                  Official Signatures & Committee Dispatch
                </h3>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
                    4-Committee Signatory Allocation ({activeTypeObj.title})
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {[
                      { role: 'Mufti / Shari\'a Auditor', sub: 'Islamic Compliance Sign-off' },
                      { role: 'CEO / Chairman', sub: 'Executive Board Approval' },
                      { role: 'Technical Certification Manager', sub: 'HACCP & Standards Clearance' },
                      { role: 'Mufti 2 / Independent Expert', sub: 'Secondary Shari\'a Review' }
                    ].map((s, idx) => (
                      <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 14, borderRadius: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{s.role}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.sub}</div>
                        <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 6 }}>
                          <Clock size={11} /> Queued for Signature
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instant Sign on Creation Option */}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#1e40af' }}>
                    <input
                      type="checkbox"
                      checked={signOnCreate}
                      onChange={e => setSignOnCreate(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                    />
                    Sign on submission as current user ({currentUser?.full_name || 'Admin'})
                  </label>

                  {signOnCreate && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1e40af' }}>Sign as Role:</span>
                      {['manager', 'ceo', 'mufti', 'mufti2'].map(r => (
                        <label key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>
                          <input
                            type="radio"
                            name="initialRole"
                            value={r}
                            checked={initialRole === r}
                            onChange={() => setInitialRole(r)}
                          />
                          {r === 'mufti2' ? 'Mufti 2' : r}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Email Notification Toggle */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={sendNotifications}
                      onChange={e => setSendNotifications(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                    />
                    Dispatch email review alerts to remaining required signatories immediately
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setCreateStep(3)} style={{ borderRadius: 8 }}>
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ padding: '12px 32px', fontWeight: 800, fontSize: 14, borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    {submitting ? (
                      <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating Direct Logsheet...</>
                    ) : (
                      <><FileCheck2 size={18} /> Submit &amp; Create {activeTypeObj.title}</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW TAB 2: DIRECT HISTORY TABLE & MODALS                                 */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div style={{ display: 'grid', gap: 20 }}>
          
          {/* Filter Bar */}
          <div className="card" style={{ padding: '16px 20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              
              {/* Type Filter Chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setHistoryFilterType('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: historyFilterType === 'all' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                    background: historyFilterType === 'all' ? '#0f172a' : '#f8fafc',
                    color: historyFilterType === 'all' ? '#fff' : '#475569'
                  }}
                >
                  All Types ({directHistory.length})
                </button>

                {LOGSHEET_TYPES.map(t => {
                  const count = directHistory.filter(l => (l.logsheet_type || 'application') === t.id).length;
                  const isSel = historyFilterType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setHistoryFilterType(t.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isSel ? `1px solid ${t.badgeColor}` : '1px solid #e2e8f0',
                        background: isSel ? t.badgeBg : '#fff',
                        color: isSel ? t.badgeColor : '#475569'
                      }}
                    >
                      {t.shortTitle} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Search & Status Filter */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 320 }}>
                <select
                  className="form-control"
                  value={historyFilterStatus}
                  onChange={e => setHistoryFilterStatus(e.target.value)}
                  style={{ height: 38, fontSize: 12, borderRadius: 8, width: 140, fontWeight: 600 }}
                >
                  <option value="all">All Statuses</option>
                  <option value="waiting">Waiting Sign</option>
                  <option value="signed">Fully Signed</option>
                </select>

                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search history by ref, company..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    style={{ height: 38, fontSize: 12.5, borderRadius: 8, paddingLeft: 34 }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="card" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', overflow: 'hidden' }}>
            <div className="table-wrap" style={{ overflowX: 'auto', minHeight: 300 }}>
              {historyLoading ? (
                <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto 12px' }} /><span style={{ color: '#64748b', fontSize: 13 }}>Loading direct logsheets history...</span></div>
              ) : filteredHistory.length === 0 ? (
                <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <ClipboardList size={28} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>No Direct Logsheets Found</div>
                  <div style={{ fontSize: 13, color: '#64748b', margin: '4px 0 16px' }}>Create your first direct logsheet using the wizard above.</div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setActiveTab('create')}>+ Create Direct Logsheet</button>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Ref &amp; Type</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Company &amp; Site</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Standard / Category</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Signatory Progress</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map(l => {
                      const sigs = [
                        { role: 'Mufti', signed: !!l.mufti_signature, name: l.mufti_sign_name },
                        { role: 'CEO', signed: !!l.ceo_signature, name: l.ceo_sign_name },
                        { role: 'Manager', signed: !!l.manager_signature, name: l.manager_sign_name },
                        { role: 'Mufti 2', signed: !!l.mufti2_signature, name: l.mufti2_sign_name }
                      ];
                      const signedCount = sigs.filter(s => s.signed).length;
                      const typeObj = LOGSHEET_TYPES.find(t => t.id === (l.logsheet_type || 'application')) || LOGSHEET_TYPES[0];

                      return (
                        <tr key={l._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 13.5 }}>
                              #{l.direct_ref || l._id?.slice(-6).toUpperCase()}
                            </div>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              marginTop: 4,
                              background: typeObj.badgeBg,
                              color: typeObj.badgeColor,
                              border: `1px solid ${typeObj.badgeBorder}`
                            }}>
                              {typeObj.shortTitle}
                            </span>
                          </td>

                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{l.company_name}</div>
                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{l.site_name || l.manufacturing_address || 'Main Site'}</div>
                            {l.existing_certificate_number && (
                              <div style={{ fontSize: 11, color: '#d97706', fontWeight: 600, marginTop: 2 }}>
                                Cert Ref: {l.existing_certificate_number}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#047857' }}>{l.certificate_standard || 'GSO MEAT'}</div>
                            <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {l.scope || l.nature_of_business || 'Halal Food Production'}
                            </div>
                          </td>

                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700 }}>
                                <span style={{ color: signedCount === 4 ? '#15803d' : '#d97706' }}>{signedCount} of 4 Signed</span>
                                <span style={{ color: '#64748b' }}>{Math.round((signedCount / 4) * 100)}%</span>
                              </div>
                              <div style={{ height: 5, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                                <div style={{ width: `${(signedCount / 4) * 100}%`, background: signedCount === 4 ? '#16a34a' : '#f59e0b', height: '100%' }} />
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '14px 20px', fontSize: 12, color: '#64748b' }}>
                            {l.created_at ? new Date(l.created_at).toLocaleDateString('en-GB') : '—'}
                          </td>

                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setInspectLogsheet(l)}
                                style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#2563eb' }}
                              >
                                <Eye size={13} style={{ marginRight: 4 }} /> View &amp; Print
                              </button>

                              {signedCount < 4 && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => setReviewSignModal(l)}
                                  style={{ borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}
                                >
                                  <PenTool size={13} style={{ marginRight: 4 }} /> Sign
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BULK PRODUCT PASTE                                               */}
      {/* ========================================================================= */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBulkModal(false)}>
          <div className="modal" style={{ maxWidth: 580, borderRadius: 16 }}>
            <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={20} style={{ color: 'var(--primary)' }} />
                <h3 className="modal-title" style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Bulk Import Products</h3>
              </div>
              <button className="modal-close" onClick={() => setShowBulkModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 14 }}>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
                Paste product names or lines (one per row, optionally separated by commas, tabs or pipes):
              </p>
              <textarea
                rows={8}
                className="form-control"
                placeholder={`PRD-01, Fresh Chicken Breast 500g, Poultry\nPRD-02, Beef Burgers 4pk, Beef\nPRD-03, Lamb Sausages 400g, Lamb`}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>
            <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowBulkModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleBulkParse}>Import Products</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INSPECT / PRINT DECISION SHEET MODAL                             */}
      {/* ========================================================================= */}
      {inspectLogsheet && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setInspectLogsheet(null)}>
          <div className="modal" style={{ maxWidth: 880, maxHeight: '90vh', overflowY: 'auto', borderRadius: 16 }}>
            <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={20} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 className="modal-title" style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                    Official Halal Decision Sheet — #{inspectLogsheet.direct_ref || inspectLogsheet._id?.slice(-6).toUpperCase()}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Type: {(LOGSHEET_TYPES.find(t => t.id === (inspectLogsheet.logsheet_type || 'application')) || LOGSHEET_TYPES[0]).title}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => window.print()}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                >
                  <Printer size={14} style={{ marginRight: 4 }} /> Print Sheet
                </button>
                <button className="modal-close" onClick={() => setInspectLogsheet(null)}><X size={18} /></button>
              </div>
            </div>

            <div className="modal-body" style={{ padding: 28, display: 'grid', gap: 20, color: '#0f172a' }}>
              {/* Official Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '2px solid #047857' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#047857' }}>HALAL FOOD AUTHORITY (HFA)</div>
                  <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Official Certification &amp; Technical Decision Record</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>REF: #{inspectLogsheet.direct_ref}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Standard: {inspectLogsheet.certificate_standard}</div>
                </div>
              </div>

              {/* Company & Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Company / Client</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{inspectLogsheet.company_name}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{inspectLogsheet.company_address}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Manufacturing Site</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{inspectLogsheet.site_name}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{inspectLogsheet.manufacturing_address}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Audit Category</div>
                  <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, marginTop: 2 }}>{inspectLogsheet.nature_of_business || inspectLogsheet.product_category || 'Halal Operations'}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Audit / Evaluation Date</div>
                  <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, marginTop: 2 }}>
                    {inspectLogsheet.audit_date ? new Date(inspectLogsheet.audit_date).toLocaleDateString('en-GB') : '—'}
                  </div>
                </div>

                {inspectLogsheet.existing_certificate_number && (
                  <div style={{ gridColumn: 'span 2', background: '#fffbeb', padding: '10px 14px', borderRadius: 8, border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Existing Certificate Reference</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#b45309', marginTop: 2 }}>
                      {inspectLogsheet.existing_certificate_number} • Extended To: {inspectLogsheet.extended_expiry_date ? new Date(inspectLogsheet.extended_expiry_date).toLocaleDateString('en-GB') : '—'} ({inspectLogsheet.extension_days || 30} Days)
                    </div>
                  </div>
                )}
              </div>

              {/* Products List Table */}
              {inspectLogsheet.products_list && inspectLogsheet.products_list.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                    Approved Product Schedule ({inspectLogsheet.products_list.length} Items)
                  </div>
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 700 }}>Code</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700 }}>Product Description</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700 }}>Category</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectLogsheet.products_list.map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--primary)' }}>{p.code || `PRD-${String(idx + 1).padStart(2, '0')}`}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.name}</td>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>{p.category || 'General'}</td>
                            <td style={{ padding: '8px 12px', color: '#15803d', fontWeight: 700 }}>Approved</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Signatures Block */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                  Committee Signatures &amp; Endorsement
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { role: 'Mufti / Shariah Lead', name: inspectLogsheet.mufti_sign_name, date: inspectLogsheet.mufti_sign_date, signed: !!inspectLogsheet.mufti_signature },
                    { role: 'CEO / Chairman', name: inspectLogsheet.ceo_sign_name, date: inspectLogsheet.ceo_sign_date, signed: !!inspectLogsheet.ceo_signature },
                    { role: 'Technical Manager', name: inspectLogsheet.manager_sign_name, date: inspectLogsheet.manager_sign_date, signed: !!inspectLogsheet.manager_signature },
                    { role: 'Mufti 2 / Auditor', name: inspectLogsheet.mufti2_sign_name, date: inspectLogsheet.mufti2_sign_date, signed: !!inspectLogsheet.mufti2_signature }
                  ].map((s, idx) => (
                    <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: s.signed ? '#f0fdf4' : '#fff' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{s.role}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: s.signed ? '#15803d' : '#94a3b8', marginTop: 4 }}>
                        {s.signed ? (s.name || 'Signed') : 'Pending Signature'}
                      </div>
                      {s.date && (
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                          {new Date(s.date).toLocaleDateString('en-GB')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setInspectLogsheet(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REVIEW & SIGN DIGITAL PAD MODAL                                  */}
      {/* ========================================================================= */}
      {reviewSignModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReviewSignModal(null)}>
          <div className="modal" style={{ maxWidth: 520, borderRadius: 16 }}>
            <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PenTool size={20} style={{ color: 'var(--primary)' }} />
                <h3 className="modal-title" style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                  Apply Committee Signature
                </h3>
              </div>
              <button className="modal-close" onClick={() => setReviewSignModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 14 }}>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{reviewSignModal.company_name}</div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>Logsheet Ref: #{reviewSignModal.direct_ref}</div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Select Signatory Role</label>
                <select id="directSigRole" className="form-control" defaultValue="manager" style={{ height: 40, borderRadius: 8, fontWeight: 600 }}>
                  <option value="manager">Technical Certification Manager</option>
                  <option value="mufti">Mufti / Shariah Lead Auditor</option>
                  <option value="ceo">CEO / Chairman</option>
                  <option value="mufti2">Mufti 2 / Independent Expert</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Signer Full Name</label>
                <input id="directSigName" className="form-control" defaultValue={currentUser?.full_name || ''} placeholder="Full Name" style={{ height: 40, borderRadius: 8 }} />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setReviewSignModal(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const role = document.getElementById('directSigRole').value;
                  const name = document.getElementById('directSigName').value;
                  handleReviewSign(reviewSignModal._id, role, name, 'digital_committee_signature');
                }}
              >
                Confirm &amp; Apply Signature
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
