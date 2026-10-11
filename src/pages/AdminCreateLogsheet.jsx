import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  UploadCloud, ChevronLeft, Building, FileText, Award, MessageSquare,
  Clock, CheckCircle2, CheckCircle, CheckSquare, PenTool, Check, ShieldCheck,
  X, AlertTriangle, ArrowRight, Calendar, Download, Eye, Package, Lock, RotateCcw,
  Search, Trash2
} from 'lucide-react';
import { getPdfUrl } from '../lib/pdfUtils';
import { useAuth } from '../context/AuthContext';
import ProductApprovalModal from '../components/ProductApprovalModal';
import NextSurveillanceDateModal from '../components/NextSurveillanceDateModal';
import { getLogsheetEffectiveRef, isLogsheetOwnRef } from '../lib/idGenerator';
import { canManageAddOnProducts } from '../lib/permissions';

export default function AdminCreateLogsheet() {
  const { appId, addonId, initialProductId, id } = useParams();
  const location = useLocation();
  const isInitialProduct = !!initialProductId || window.location.pathname.includes('/initial-products/');
  const resolvedInitialProductId = initialProductId || (isInitialProduct ? (id || appId) : null);
  const isAddon = !!addonId;
  const isProductLogsheet = isAddon || isInitialProduct;
  const entityId = isInitialProduct ? resolvedInitialProductId : (isAddon ? addonId : appId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const isDirectLogsheetRoute = window.location.pathname.startsWith('/logsheets/') ||
    window.location.pathname.startsWith('/logsheet/direct') ||
    window.location.pathname.startsWith('/superadmin/direct-logsheet');
  const queryLogsheetId = new URLSearchParams(location.search).get('logsheet_id');
  const directLogsheetId = isDirectLogsheetRoute ? (id || queryLogsheetId) : queryLogsheetId;

  const [directClients, setDirectClients] = useState([]);
  const [directSites, setDirectSites] = useState([]);
  const [selectedDirectClientId, setSelectedDirectClientId] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [availableCompanySites, setAvailableCompanySites] = useState([]);
  const [directLogsheetType, setDirectLogsheetType] = useState(() => {
    const sp = new URLSearchParams(location.search);
    const t = sp.get('type')?.toLowerCase();
    if (t === 'surveillance' || t === 'extension' || t === 'product' || t === 'normal') return t;
    return 'normal';
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRedoing, setIsRedoing] = useState(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get('redo') === '1' || sp.get('redo') === 'true';
  });
  const [activeTab, setActiveTab] = useState(1);
  const [application, setApplication] = useState(null);
  const [hasOpenNc, setHasOpenNc] = useState(false);
  const [openNcCount, setOpenNcCount] = useState(0);
  const [viewProductModal, setViewProductModal] = useState({ isOpen: false, formData: null, product: null, company: null });

  const [signatures, setSignatures] = useState([]);
  const [currentLogsheet, setCurrentLogsheet] = useState(null);
  const [sigRole, setSigRole] = useState('');
  const [sigComment, setSigComment] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  // isSendingWithoutSig removed — flow handled via signing modal
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [clientProducts, setClientProducts] = useState([]);
  const [showNextSurvModal, setShowNextSurvModal] = useState(false);

  // Signing Modal State
  const [showSignModal, setShowSignModal] = useState(false);
  const [modalConfirmed, setModalConfirmed] = useState(false);

  // Approve Products Modal State (Add-on Logsheet Only)
  const [showApproveProductsModal, setShowApproveProductsModal] = useState(false);
  const [selectedApproveProducts, setSelectedApproveProducts] = useState([]);

  // Initial Product Editable Name & Code State
  const [initialProductName, setInitialProductName] = useState('');
  const [initialProductCode, setInitialProductCode] = useState('');
  const [savingProductDetails, setSavingProductDetails] = useState(false);

  const rawAddonType = String(
    application?.addon_type ||
    application?.action_type ||
    currentLogsheet?.addon_type ||
    currentLogsheet?.addon_application_id?.addon_type ||
    currentLogsheet?.addon_application_id?.action_type ||
    ''
  ).toLowerCase().trim().replace(/[-\s]/g, '_');

  const hasRemoveProductItem = Array.isArray(application?.products) && application.products.some(p => String(p.type || '').toLowerCase().includes('remove'));
  const hasChangeIngredientItem = Array.isArray(application?.products) && application.products.some(p => String(p.type || '').toLowerCase().includes('change'));

  const isRemoveProduct = rawAddonType === 'remove_product' || rawAddonType === 'remove' || hasRemoveProductItem;
  const isChangeIngredients = rawAddonType === 'change_ingredients' || rawAddonType === 'change_ingredient' || rawAddonType === 'change' || hasChangeIngredientItem;
  const canManageProducts = canManageAddOnProducts(user);

  // Form State declared before any derived variables that reference form
  const [form, setForm] = useState({
    site_name: '', company_name: '', company_address: '', manufacturing_address: '',
    contact_person: '', contact_email: '', issue_date: '', expiry_date: '',
    nature_of_business: '', product_category: '', current_cycle_start: '',
    original_cycle_start: '', next_surveillance_due_date: '', document_url: '', document_urls: [], audit_reports: [],

    audit_type: 'New', audit_date: '', auditors: '', ncs_close: '',
    docs_satisfactory: '', pork_free_statement: '', reviewed_by: '',
    reviewer_name: '', review_date: '',

    certificate_type: '', certificate_standard: '',
    suggested_certificate_type: '',
    annual_certificate: 'Yes', batch_certificate: 'No', new_products_only: 'No',
    new_site_line: 'No', new_client: 'No', agreement_signed: 'Yes', status_date: '',

    // Extension Specific Fields
    existing_certificate_number: '',
    extension_duration_type: '',
    extension_days: '',
    extension_reason: '',
    extended_expiry_date: '',

    // Product Specific Fields
    product_sub_type: 'initial', // 'initial' | 'addon'
    product_name: '',
    product_code: '',
    products_list: [],
    raw_materials_approved: 'Yes',
    cross_contamination_risk: 'None',
    formulation_checked: 'Yes',
    lab_test_required: 'No',
    initial_approval_stage: 'Stage 1 - Desk Review',

    comment: '', confirmed: false
  });

  const [uploadingReport, setUploadingReport] = useState(false);

  const userSignature = signatures.find(s =>
    (s.user_id && (s.user_id === user?.id || s.user_id === user?._id)) ||
    (s.username && user?.email && s.username.toLowerCase() === user.email.split('@')[0].toLowerCase()) ||
    (s.name && user?.full_name && s.name.toLowerCase() === user.full_name.toLowerCase())
  );
  const userRole = (user?.role || '').toLowerCase();
  const userRoles = Array.isArray(user?.roles) && user.roles.length > 0 ? user.roles : (user?.role ? [user.role] : []);
  const isSuperAdmin = userRoles.includes('superadmin') || user?.role === 'superadmin';
  const hasSignaturePrivilege = isSuperAdmin || Boolean(user?.can_sign_logsheet);
  const userUsername = (user?.username || '').toLowerCase();
  const userFullName = (user?.full_name || '').toLowerCase();
  const isMuftiUser = userRole === 'mufti' || userRole === 'shariah' || userUsername.includes('mufti') || userFullName.includes('mufti');

  const appCategoryStr = String(application?.category || application?.application_type || application?.type || '').toLowerCase();
  const formCertTypeStr = String(form?.certificate_type || form?.certificate_standard || '').toLowerCase();

  const isSurveillance = Boolean(
    appCategoryStr.includes('surveillance') ||
    application?.application_number?.includes('-SU-') ||
    application?.is_surveillance ||
    form?.audit_type === 'Surveillance' ||
    formCertTypeStr.includes('surveillance')
  );

  const isGSO = Boolean(
    appCategoryStr.includes('gso') ||
    appCategoryStr.includes('uae') ||
    appCategoryStr.includes('dual') ||
    formCertTypeStr.includes('gso') ||
    String(form?.category || '').toLowerCase().includes('gso') ||
    String(form?.audit_type || '').toLowerCase().includes('gso') ||
    String(form?.audit_type || '').toLowerCase().includes('surveillance') ||
    isSurveillance
  );

  const isDirectCreation = isDirectLogsheetRoute && !directLogsheetId && !currentLogsheet?._id;

  const effectiveLogsheetType = currentLogsheet
    ? (currentLogsheet.logsheet_type === 'initial_product' || currentLogsheet.logsheet_type === 'addon_application'
        ? 'product'
        : (currentLogsheet.logsheet_type === 'surveillance' || currentLogsheet.certificate_type === 'Surveillance Letter'
            ? 'surveillance'
            : (currentLogsheet.logsheet_type === 'extension' || (currentLogsheet.audit_type?.toLowerCase().includes('extension') && !currentLogsheet.logsheet_type)
                ? 'extension'
                : 'normal')))
    : directLogsheetType;

  // STRICT SIGNATORY RULES:
  // Normal Logsheet: ALWAYS 4 signatures (Mufti, CEO, Manager, Mufti 2)
  // Product Logsheet: ALWAYS 4 signatures
  // Surveillance Logsheet: ALWAYS 4 signatures
  // Extension Logsheet:
  //   - Exactly 30 Days Extension: 1 signature (CEO / Authorized Officer)
  //   - More than 30 Days Extension: 4 signatures (Mufti, CEO, Manager, Mufti 2)
  const isExtensionLogsheet = Boolean(
    (isDirectCreation && directLogsheetType === 'extension') ||
    (!isDirectCreation && (effectiveLogsheetType === 'extension' || currentLogsheet?.logsheet_type === 'extension')) ||
    (currentLogsheet && currentLogsheet.logsheet_type === 'extension')
  );

  const is30DaysExtension = Boolean(
    isExtensionLogsheet &&
    (form.extension_duration_type === '30_days' || (Number(form.extension_days) === 30 && form.extension_duration_type !== 'more_than_30_days'))
  );

  const signatories = is30DaysExtension ? [
    {
      roleKey: 'Ceo',
      label: 'Authorized Officer / CEO Signature (30-Day Extension)',
      btnRole: 'CEO / Authorized Officer',
      signature: currentLogsheet?.single_signature || currentLogsheet?.ceo_signature,
      name: currentLogsheet?.single_sign_name || currentLogsheet?.ceo_sign_name,
      date: currentLogsheet?.single_sign_date || currentLogsheet?.ceo_sign_date
    }
  ] : [
    { roleKey: 'Mufti', label: 'Mufti / Shariah Signatory', btnRole: 'Mufti', signature: currentLogsheet?.mufti_signature, name: currentLogsheet?.mufti_sign_name, date: currentLogsheet?.mufti_sign_date },
    { roleKey: 'Ceo', label: 'CEO / Executive Signatory', btnRole: 'CEO', signature: currentLogsheet?.ceo_signature, name: currentLogsheet?.ceo_sign_name, date: currentLogsheet?.ceo_sign_date },
    { roleKey: 'Manager', label: 'Manager / Technical Signatory', btnRole: 'Manager', signature: currentLogsheet?.manager_signature, name: currentLogsheet?.manager_sign_name, date: currentLogsheet?.manager_sign_date },
    { roleKey: 'Mufti2', label: 'Mufti 2 / Secondary Shariah', btnRole: 'Mufti 2', signature: currentLogsheet?.mufti2_signature, name: currentLogsheet?.mufti2_sign_name, date: currentLogsheet?.mufti2_sign_date },
  ];

  const totalSignedCount = signatories.filter(s => !!s.signature).length;
  const isFullySigned = totalSignedCount === signatories.length || currentLogsheet?.status === 'Signed' || currentLogsheet?.status === 'Completed';
  const isReadOnly = Boolean(currentLogsheet) && !isRedoing;

  const handleSwitchDirectType = (typeId) => {
    setDirectLogsheetType(typeId);
    setActiveTab(1);
    const todayStr = new Date().toISOString().split('T')[0];
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (typeId === 'surveillance') {
      setForm(prev => ({
        ...prev,
        audit_type: 'Surveillance',
        certificate_type: 'Surveillance Letter',
        suggested_certificate_type: 'Surveillance Letter',
        certificate_standard: 'Surveillance Letter',
        issue_date: prev.issue_date || todayStr,
        expiry_date: prev.expiry_date || oneYearLater,
        audit_date: prev.audit_date || todayStr,
        ncs_close: 'No NCs Flagged',
        docs_satisfactory: 'Satisfactory',
        pork_free_statement: 'Verified Compliant',
        reviewed_by: user?.full_name || 'HFA Lead Auditor',
        reviewer_name: user?.full_name || 'HFA Lead Auditor',
        review_date: todayStr,
        status_date: todayStr
      }));
    } else if (typeId === 'extension') {
      setForm(prev => ({
        ...prev,
        audit_type: 'Facility Extension Review',
        extension_duration_type: '30_days',
        extension_days: 30,
        extended_expiry_date: thirtyDaysLater,
        certificate_type: '',
        suggested_certificate_type: '',
        certificate_standard: '',
        status_date: todayStr,
        review_date: todayStr
      }));
    } else if (typeId === 'product') {
      const subType = form.product_sub_type || 'initial';
      setForm(prev => ({
        ...prev,
        product_sub_type: subType,
        audit_type: subType === 'addon' ? 'Add-on Products Certification' : 'Initial Product Evaluation',
        raw_materials_approved: 'Yes',
        cross_contamination_risk: 'None',
        formulation_checked: 'Yes',
        lab_test_required: 'No',
        initial_approval_stage: 'Stage 1 - Desk Review',
        auditors: user?.full_name || 'HFA Food Technologist',
        reviewed_by: user?.full_name || 'HFA Food Technologist',
        reviewer_name: user?.full_name || 'HFA Food Technologist',
        status_date: todayStr,
        review_date: todayStr,
        comment: prev.comment || (subType === 'addon' ? 'Recommended for add-on product certification endorsement.' : 'Recommended for initial product approval endorsement.')
      }));
    } else {
      setForm(prev => ({
        ...prev,
        audit_type: 'New',
        extension_duration_type: '',
        extension_days: '',
        extended_expiry_date: '',
        existing_certificate_number: '',
        certificate_type: prev.certificate_type === 'Surveillance Letter' ? '' : prev.certificate_type,
        suggested_certificate_type: prev.suggested_certificate_type === 'Surveillance Letter' ? '' : prev.suggested_certificate_type,
        certificate_standard: prev.certificate_standard === 'Surveillance Letter' ? '' : prev.certificate_standard,
        issue_date: prev.issue_date || todayStr,
        expiry_date: prev.expiry_date || oneYearLater,
        current_cycle_start: prev.current_cycle_start || todayStr,
        original_cycle_start: prev.original_cycle_start || todayStr,
        audit_date: prev.audit_date || todayStr,
        review_date: prev.review_date || todayStr,
        status_date: prev.status_date || todayStr,
        annual_certificate: 'Yes',
        batch_certificate: 'No',
        new_products_only: 'No',
        new_site_line: 'No',
        new_client: 'No',
        agreement_signed: 'Yes'
      }));
    }
  };

  const handleExtensionDurationChange = (durationType, customDays = null) => {
    const baseDate = form.expiry_date ? new Date(form.expiry_date) : new Date();
    const days = durationType === '30_days'
      ? 30
      : (customDays !== null ? (parseInt(customDays, 10) || 60) : (form.extension_days > 30 ? form.extension_days : 60));
    const newDate = new Date(baseDate.getTime() + (days || 30) * 24 * 60 * 60 * 1000);
    const newDateStr = newDate.toISOString().split('T')[0];

    setForm(prev => ({
      ...prev,
      extension_duration_type: durationType, // '30_days' | 'more_than_30_days'
      extension_days: days,
      extended_expiry_date: newDateStr
    }));
  };

  const getAvailableTabs = () => {
    if (isDirectCreation) {
      if (directLogsheetType === 'surveillance') {
        return [
          { id: 1, label: '1. Company Details', icon: Building },
          { id: 2, label: '2. Comment / Reason', icon: MessageSquare }
        ];
      }
      if (directLogsheetType === 'extension') {
        return [
          { id: 1, label: '1. Facility & Extension Details', icon: Building },
          { id: 2, label: '2. Comment / Reason', icon: MessageSquare }
        ];
      }
      if (directLogsheetType === 'product') {
        return [
          { id: 1, label: '1. Product Evaluation', icon: Package },
          { id: 2, label: '2. Comment / Reason', icon: MessageSquare }
        ];
      }
    }
    return [
      { id: 1, label: '1. Company & Site Details', icon: Building },
      { id: 2, label: '2. Review of Application', icon: FileText },
      { id: 3, label: '3. Certificate Status', icon: Award },
      { id: 4, label: '4. Comment / Reason', icon: MessageSquare }
    ];
  };

  const resolveSiteDisplayAddress = (site, client = null, fallbackAddress = '') => {
    const isPlaceholder = (val) => {
      if (!val || typeof val !== 'string') return true;
      const lower = val.trim().toLowerCase();
      return lower === '' || lower === 'address on file' || lower === 'on file' || lower === 'n/a' || lower === 'undefined';
    };

    const companyAddr = (client?.address || client?.registered_address || client?.head_office_address || fallbackAddress || '').trim();

    if (!site) return isPlaceholder(companyAddr) ? '' : companyAddr;

    // 1. If explicit address string is valid and not placeholder
    if (!isPlaceholder(site.address)) {
      return site.address.trim();
    }

    // 2. Gather specific site address components
    const street1 = !isPlaceholder(site.address_1) ? site.address_1.trim() : '';
    const street2 = !isPlaceholder(site.address_2) ? site.address_2.trim() : '';
    const city = !isPlaceholder(site.city) ? site.city.trim() : '';
    const state = !isPlaceholder(site.state) ? site.state.trim() : '';
    const postcode = !isPlaceholder(site.postcode) ? site.postcode.trim() : '';
    const country = !isPlaceholder(site.country) ? site.country.trim() : '';

    // If street1 is a real street address:
    if (street1) {
      return [street1, street2, city, state, postcode, country].filter(Boolean).join(', ');
    }

    // If site has a valid head office address:
    if (!isPlaceholder(site.head_office_address)) {
      return site.head_office_address.trim();
    }

    // If street1 was placeholder or empty (like "Address on file" in legacy db), but we have company address:
    if (!isPlaceholder(companyAddr)) {
      const cityPostal = [city, postcode].filter(Boolean).join(' ');
      if (cityPostal && !companyAddr.toLowerCase().includes(city.toLowerCase())) {
        return `${companyAddr}, ${cityPostal}`;
      }
      return companyAddr;
    }

    // If no company address, construct from whatever parts exist (city, postcode, country):
    const remainingParts = [street2, city, state, postcode, country].filter(Boolean);
    if (remainingParts.length > 0) {
      return remainingParts.join(', ');
    }

    return '';
  };

  const handleDirectClientSelect = (clientId) => {
    setSelectedDirectClientId(clientId);
    if (!clientId) {
      setAvailableCompanySites([]);
      return;
    }
    const client = directClients.find(c => c._id === clientId || c.id === clientId);
    if (!client) return;

    const companyName = client.company_name || client.full_name || '';
    setCompanySearchQuery(companyName);

    const clientSites = directSites.filter(s =>
      String(s.client_id?._id || s.client_id) === String(client._id)
    );
    setAvailableCompanySites(clientSites);
    const firstSite = clientSites[0];
    const companyAddress = client.address || client.registered_address || client.head_office_address || '';

    setForm(prev => ({
      ...prev,
      client_id: client._id,
      company_name: companyName || prev.company_name,
      contact_person: client.full_name || prev.contact_person,
      contact_email: client.email || prev.contact_email,
      company_address: companyAddress || prev.company_address,
      site_name: firstSite?.name || firstSite?.site_name || prev.site_name || 'Main Manufacturing Site',
      manufacturing_address: resolveSiteDisplayAddress(firstSite, client, companyAddress || prev.company_address),
      site_id: firstSite?._id || prev.site_id
    }));
  };

  const handleDirectSiteSelect = (siteId) => {
    if (!siteId) return;
    const site = directSites.find(s => s._id === siteId || s.id === siteId);
    if (!site) return;

    const matchedClient = directClients.find(c => String(c._id) === String(site.client_id?._id || site.client_id));

    setForm(prev => ({
      ...prev,
      site_id: site._id,
      site_name: site.name || site.site_name || prev.site_name,
      manufacturing_address: resolveSiteDisplayAddress(site, matchedClient, prev.company_address)
    }));
  };

  const filteredClients = directClients.filter(c => {
    if (!companySearchQuery || companySearchQuery.trim() === '') return true;
    const q = companySearchQuery.toLowerCase();
    const cName = (c.company_name || '').toLowerCase();
    const fName = (c.full_name || '').toLowerCase();
    const email = (c.email || '').toLowerCase();
    return cName.includes(q) || fName.includes(q) || email.includes(q);
  }).slice(0, 10);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get('redo') === '1' || sp.get('redo') === 'true') {
      setIsRedoing(true);
      setActiveTab(1);
    }
  }, [location.search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (directLogsheetId) {
        try {
          const logRes = await api.get(`/api/application-logsheets/${directLogsheetId}`);
          const logDoc = logRes.data?.data || logRes.data;
          if (logDoc && logDoc._id) {
            setCurrentLogsheet(logDoc);
            if (logDoc.addon_application_id && typeof logDoc.addon_application_id === 'object') {
              setApplication(logDoc.addon_application_id);
            } else if (logDoc.addon_application_id && typeof logDoc.addon_application_id === 'string') {
              try {
                const aoRes = await api.get(`/api/add-on-applications/${logDoc.addon_application_id}`);
                const aoData = aoRes.data?.data || aoRes.data;
                if (aoData) setApplication(aoData);
              } catch (_) {}
            } else if (logDoc.application_id && typeof logDoc.application_id === 'object') {
              setApplication(logDoc.application_id);
            }
            if (logDoc.logsheet_type) {
              setDirectLogsheetType(
                logDoc.logsheet_type === 'initial_product' || logDoc.logsheet_type === 'addon_application'
                  ? 'product'
                  : (logDoc.logsheet_type === 'application' ? 'normal' : logDoc.logsheet_type)
              );
            } else if (logDoc.certificate_type === 'Surveillance Letter') {
              setDirectLogsheetType('surveillance');
            } else if (logDoc.audit_type?.toLowerCase().includes('extension')) {
              setDirectLogsheetType('extension');
            } else if (logDoc.product_name) {
              setDirectLogsheetType('product');
            } else {
              setDirectLogsheetType('normal');
            }
            setForm(f => ({
              ...f,
              ...logDoc,
              certificate_type: logDoc.certificate_type || logDoc.suggested_certificate_type || logDoc.certificate_standard || '',
              certificate_standard: logDoc.certificate_standard || logDoc.certificate_type || '',
              suggested_certificate_type: logDoc.suggested_certificate_type || logDoc.certificate_type || '',
              next_surveillance_due_date: logDoc.next_surveillance_due_date ? new Date(logDoc.next_surveillance_due_date).toISOString().split('T')[0] : '',
              confirmed: false
            }));

            // Fetch signatures for signing panel
            try {
              const sigsRes = await api.get('/api/signatures');
              setSignatures(Array.isArray(sigsRes) ? sigsRes : (sigsRes?.data?.data || sigsRes?.data || []));
            } catch (e) {
              console.log('Failed to fetch signatures', e);
            }
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Failed to fetch logsheet by ID:', err);
        }
      }

      if (isDirectLogsheetRoute) {
        // Direct Creation Mode
        const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setForm(f => ({
          ...f,
          issue_date: f.issue_date || todayStr,
          expiry_date: f.expiry_date || oneYearLater,
          current_cycle_start: f.current_cycle_start || todayStr,
          original_cycle_start: f.original_cycle_start || todayStr,
          audit_date: f.audit_date || todayStr,
          review_date: f.review_date || todayStr,
          status_date: f.status_date || todayStr,
          site_name: f.site_name || 'Main Manufacturing Site',
          audit_type: directLogsheetType === 'surveillance' ? 'Surveillance' : (directLogsheetType === 'extension' ? 'Facility Extension Review' : (directLogsheetType === 'product' ? 'Initial Product Evaluation' : 'New')),
          annual_certificate: 'Yes',
          batch_certificate: 'No',
          new_products_only: 'No',
          new_site_line: 'No',
          new_client: 'No',
          agreement_signed: 'Yes',
          certificate_type: directLogsheetType === 'surveillance' ? 'Surveillance Letter' : '',
          suggested_certificate_type: directLogsheetType === 'surveillance' ? 'Surveillance Letter' : '',
          certificate_standard: directLogsheetType === 'surveillance' ? 'Surveillance Letter' : '',
          nature_of_business: f.nature_of_business || 'Food Manufacturing & Packaging',
          product_category: f.product_category || 'Halal Food & Consumables',
          ncs_close: 'No NCs Flagged',
          reviewed_by: user?.full_name || 'HFA Lead Auditor',
          reviewer_name: user?.full_name || 'HFA Lead Auditor',
          extension_duration_type: directLogsheetType === 'extension' ? '30_days' : '',
          extension_days: directLogsheetType === 'extension' ? 30 : '',
          extended_expiry_date: directLogsheetType === 'extension' ? thirtyDaysLater : ''
        }));

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
          setDirectClients(clientAccounts);
          setDirectSites(siteList);
          setSignatures(sigList);
        } catch (e) {
          console.log('Failed fetching direct lookup data', e);
        }

        setLoading(false);
        return;
      }

      if (!entityId || entityId === 'undefined') {
        toast.error('Invalid application reference.');
        setLoading(false);
        return;
      }

      if (isAddon) {
        if (!addonId || addonId === 'undefined') {
          toast.error('Invalid Add-on application reference.');
          setLoading(false);
          return;
        }
        const addonRes = await api.get(`/api/add-on-applications/${addonId}`);
        const addonData = addonRes.data?.data || addonRes.data;
        setApplication(addonData);

        let addonClient = addonData.client_id;
        if (typeof addonClient === 'string' || (addonClient && !addonClient.address)) {
          try {
            const uId = addonClient?._id || addonClient;
            if (uId) {
              const uRes = await api.get(`/api/users/${uId}`).catch(() => null);
              if (uRes?.data?.data || uRes?.data) {
                addonClient = { ...(typeof addonClient === 'object' ? addonClient : {}), ...(uRes.data.data || uRes.data) };
              }
            }
          } catch { /* client fetch failed — use partial data */ }
        }

        const addonClientAddr = addonClient?.address || '';

        const addonSite = addonData.site_id;
        const addonSiteAddr = addonSite?.address || '';

        const autoSiteName = addonSite?.name
          || addonData?.site_name
          || addonData?.site_id?.name
          || addonData?.establishment_name
          || addonSite?.est_name
          || 'Main Manufacturing Site';

        const autoCompanyName = addonClient?.company_name
          || addonData?.profiles?.company_name
          || addonData?.company_name
          || addonClient?.business_name
          || addonClient?.full_name
          || '';
        const autoContactPerson = addonData.contact_name || addonClient?.full_name || '';
        const autoContactEmail = addonData.contact_email || addonClient?.email || '';

        let autoCompanyAddress = addonClientAddr
          || addonSite?.head_office_address
          || addonData.establishment_address
          || addonData.application_id?.establishment_address
          || '';

        let autoManufacturingAddress = addonData.manufacturer_address
          || addonSiteAddr
          || addonData.application_id?.manufacturer_address
          || '';

        const autoNature = addonData.category || addonData.application_type || 'Add-on Product Certification';
        const autoProductCat = addonData.products?.length > 0 ? addonData.products.map(p => p.name || p.title).filter(Boolean).join(', ') : (addonData.category || 'Add-on Products');

        // FT Assignment extraction for Product Logsheet
        const assignedFTsList = Array.isArray(addonData.assigned_food_techs) && addonData.assigned_food_techs.length > 0
          ? addonData.assigned_food_techs.map(ft => ft.full_name || ft.name || ft.email).filter(Boolean).join(', ')
          : (addonData.assigned_food_tech?.full_name || addonData.assigned_food_tech?.name || '');

        const autoFTs = assignedFTsList || (user?.full_name ? `${user.full_name} (Food Technologist)` : 'Food Technologist');
        const autoAuditType = addonData.application_type || 'Add-on Products Certification';

        // Check if logsheet already exists
        let addonLogsheet = null;
        try {
          const logRes = await api.get(`/api/add-on-applications/${addonId}/logsheet`);
          addonLogsheet = logRes.data?.data || logRes.data;
        } catch { /* No logsheet yet */ }

        if (addonLogsheet && addonLogsheet._id) {
          setCurrentLogsheet(addonLogsheet);

          let resolvedCompanyName = addonLogsheet.company_name;
          if (!resolvedCompanyName || (resolvedCompanyName === autoSiteName && autoCompanyName && autoCompanyName !== autoSiteName)) {
            resolvedCompanyName = autoCompanyName;
          }

          setForm(f => ({
            ...f,
            ...addonLogsheet,
            site_name: (addonLogsheet.site_name && addonLogsheet.site_name.trim()) ? addonLogsheet.site_name : autoSiteName,
            company_name: (resolvedCompanyName && resolvedCompanyName.trim()) ? resolvedCompanyName : autoCompanyName,
            company_address: (addonLogsheet.company_address && addonLogsheet.company_address.trim()) ? addonLogsheet.company_address : autoCompanyAddress,
            manufacturing_address: (addonLogsheet.manufacturing_address != null ? addonLogsheet.manufacturing_address : autoManufacturingAddress),
            audit_type: addonLogsheet.audit_type || autoAuditType,
            auditors: addonLogsheet.auditors || autoFTs,
            ncs_close: addonLogsheet.ncs_close || 'N/A - Product Evaluation',
            confirmed: false
          }));
        } else {
          setForm(f => ({
            ...f,
            site_name: autoSiteName,
            company_name: autoCompanyName,
            company_address: autoCompanyAddress,
            manufacturing_address: autoManufacturingAddress,
            contact_person: autoContactPerson,
            contact_email: autoContactEmail,
            nature_of_business: autoNature,
            product_category: autoProductCat,
            issue_date: todayStr,
            expiry_date: oneYearLater,
            current_cycle_start: todayStr,
            original_cycle_start: addonData.created_at ? new Date(addonData.created_at).toISOString().split('T')[0] : todayStr,

            audit_type: autoAuditType,
            audit_date: todayStr,
            auditors: autoFTs,
            ncs_close: 'N/A - Product Evaluation',
            docs_satisfactory: 'Satisfactory - all product specifications and formulations verified',
            pork_free_statement: 'Confirmed - signed pork-free declaration in place',
            reviewed_by: user?.full_name || 'HFA Food Technology Dept',
            reviewer_name: user?.full_name || 'Food Technologist Reviewer',
            review_date: todayStr,
            annual_certificate: 'No',
            batch_certificate: 'No',
            new_products_only: 'Yes',
            new_site_line: 'No',
            new_client: 'No',
            agreement_signed: 'Yes',
            status_date: todayStr,
            comment: 'Recommended for add-on product certification endorsement.',
            confirmed: false
          }));
        }
      } else if (isInitialProduct) {
        if (!resolvedInitialProductId || resolvedInitialProductId === 'undefined') {
          toast.error('Invalid Initial Product reference.');
          setLoading(false);
          return;
        }

        const ipRes = await api.get(`/api/initial-products/${resolvedInitialProductId}`);
        const ipData = ipRes.data?.data || ipRes.data;
        setApplication(ipData);

        let ipClient = ipData.client_id;
        if (typeof ipClient === 'string' || (ipClient && !ipClient.address)) {
          try {
            const uId = ipClient?._id || ipClient;
            if (uId) {
              const uRes = await api.get(`/api/users/${uId}`).catch(() => null);
              if (uRes?.data?.data || uRes?.data) {
                ipClient = { ...(typeof ipClient === 'object' ? ipClient : {}), ...(uRes.data.data || uRes.data) };
              }
            }
          } catch { /* client fetch failed — use partial data */ }
        }

        const ipClientAddr = ipClient?.address || '';

        const ipSite = ipData.site_id;
        const ipSiteAddr = ipSite ? ipSite?.address || '' : '';

        const autoSiteName = ipSite?.name
          || ipData?.site_name
          || ipData?.application_id?.site_name
          || ipData?.application_id?.establishment_name
          || 'Main Manufacturing Site';

        const autoCompanyName = ipClient?.company_name
          || ipData?.company_name
          || ipClient?.business_name
          || ipClient?.full_name
          || '';
        const autoContactPerson = ipData.contact_name || ipClient?.full_name || '';
        const autoContactEmail = ipData.contact_email || ipClient?.email || '';

        let autoCompanyAddress = ipClientAddr
          || ipSite?.head_office_address
          || ipData.application_id?.establishment_address
          || '';

        let autoManufacturingAddress = ipSiteAddr
          || ipData.application_id?.manufacturer_address
          || '';

        const autoNature = ipData.product?.category || ipData.application_id?.category || 'Initial Product Certification';
        const autoProductCat = ipData.product?.name ? `${ipData.product.name}${ipData.product.code ? ` (${ipData.product.code})` : ''}` : 'Initial Product';

        // FT Assignment extraction for Product Logsheet
        const assignedFTsList = Array.isArray(ipData.assigned_food_techs) && ipData.assigned_food_techs.length > 0
          ? ipData.assigned_food_techs.map(ft => ft.full_name || ft.name || ft.email).filter(Boolean).join(', ')
          : (ipData.assigned_food_tech?.full_name || ipData.assigned_food_tech?.name || ipData.assigned_ft_custom?.name || ipData.assigned_ft_details || '');

        const autoFTs = assignedFTsList || (user?.full_name ? `${user.full_name} (Food Technologist)` : 'Food Technologist');
        const autoAuditType = 'Initial Product Evaluation';

        // Check if logsheet already exists
        let ipLogsheet = (ipData.logsheet_id && typeof ipData.logsheet_id === 'object' && ipData.logsheet_id._id) ? ipData.logsheet_id : null;
        if (!ipLogsheet) {
          try {
            const logRes = await api.get(`/api/application-logsheets?initial_product_application_id=${resolvedInitialProductId}`);
            const list = Array.isArray(logRes.data?.data) ? logRes.data.data : (Array.isArray(logRes.data) ? logRes.data : []);
            ipLogsheet = list[0] || null;
          } catch { /* No logsheet yet */ }
        }
        if (!ipLogsheet && ipData.logsheet_id) {
          try {
            const logsheetId = ipData.logsheet_id._id || ipData.logsheet_id;
            const logRes = await api.get(`/api/application-logsheets/${logsheetId}`);
            ipLogsheet = logRes.data?.data || logRes.data;
          } catch { /* logsheet fetch fallback */ }
        }

        const hasFT = Boolean(
          (Array.isArray(ipData.assigned_food_techs) && ipData.assigned_food_techs.length > 0) ||
          ipData.assigned_food_tech ||
          ipData.assigned_ft_custom?.name ||
          ipData.assigned_ft_details ||
          assignedFTsList
        );

        if (!hasFT && !ipLogsheet) {
          toast.error('Food Technologist is not assigned yet. Please assign a Food Technologist before creating the Logsheet.');
          navigate(`/admin/initial-products/${resolvedInitialProductId}/processing`);
          setLoading(false);
          return;
        }

        if (ipLogsheet && ipLogsheet._id) {
          setCurrentLogsheet(ipLogsheet);

          let resolvedCompanyName = ipLogsheet.company_name;
          if (!resolvedCompanyName || (resolvedCompanyName === autoSiteName && autoCompanyName && autoCompanyName !== autoSiteName)) {
            resolvedCompanyName = autoCompanyName;
          }

          const loadedProdName = ipLogsheet.product_name || ipData.product?.name || '';
          const loadedProdCode = ipLogsheet.product_code !== undefined ? ipLogsheet.product_code : (ipData.product?.code || '');
          setInitialProductName(loadedProdName);
          setInitialProductCode(loadedProdCode);

          setForm(f => ({
            ...f,
            ...ipLogsheet,
            site_name: (ipLogsheet.site_name && ipLogsheet.site_name.trim()) ? ipLogsheet.site_name : autoSiteName,
            company_name: (resolvedCompanyName && resolvedCompanyName.trim()) ? resolvedCompanyName : autoCompanyName,
            company_address: (ipLogsheet.company_address && ipLogsheet.company_address.trim()) ? ipLogsheet.company_address : autoCompanyAddress,
            manufacturing_address: (ipLogsheet.manufacturing_address != null ? ipLogsheet.manufacturing_address : autoManufacturingAddress),
            audit_type: ipLogsheet.audit_type || autoAuditType,
            auditors: ipLogsheet.auditors || autoFTs,
            ncs_close: ipLogsheet.ncs_close || 'N/A - Initial Product Evaluation',
            confirmed: false
          }));
        } else {
          const loadedProdName = ipData.product?.name || '';
          const loadedProdCode = ipData.product?.code || '';
          setInitialProductName(loadedProdName);
          setInitialProductCode(loadedProdCode);

          setForm(f => ({
            ...f,
            site_name: autoSiteName,
            company_name: autoCompanyName,
            company_address: autoCompanyAddress,
            manufacturing_address: autoManufacturingAddress,
            contact_person: autoContactPerson,
            contact_email: autoContactEmail,
            nature_of_business: autoNature,
            product_category: autoProductCat,
            issue_date: todayStr,
            expiry_date: oneYearLater,
            current_cycle_start: todayStr,
            original_cycle_start: ipData.createdAt ? new Date(ipData.createdAt).toISOString().split('T')[0] : todayStr,

            audit_type: autoAuditType,
            audit_date: todayStr,
            auditors: autoFTs,
            ncs_close: 'N/A - Initial Product Evaluation',
            docs_satisfactory: 'Satisfactory - all product specifications and formulations verified',
            pork_free_statement: 'Confirmed - signed pork-free declaration in place',
            reviewed_by: user?.full_name || 'HFA Food Technology Dept',
            reviewer_name: user?.full_name || 'Food Technologist Reviewer',
            review_date: todayStr,
            annual_certificate: 'No',
            batch_certificate: 'No',
            new_products_only: 'Yes',
            new_site_line: 'No',
            new_client: 'No',
            agreement_signed: 'Yes',
            status_date: todayStr,
            comment: 'Recommended for initial product approval endorsement.',
            confirmed: false
          }));
        }
      } else {
        // ── Main application flow ─────────────────────────────────────────
        if (!appId || appId === 'undefined') {
          toast.error('Invalid Application reference.');
          setLoading(false);
          return;
        }

        // 1. Fetch application details
        const appRes = await api.get(`/api/applications/${appId}`);
        const appData = appRes.data?.data || appRes.data;
        setApplication(appData);

        // 2. Fetch audit details (if any)
        let auditData = null;
        try {
          const auditRes = await api.get(`/api/audits/application/${appId}`);
          auditData = auditRes.data?.data || auditRes.data;
        } catch {
          // No audit found yet for this application
        }

        // Fetch client products
        try {
          const cId = appData?.client_id?._id || appData?.client_id;
          if (cId) {
            const pRes = await api.get(`/api/products?client_id=${cId}`).catch(() => ({ data: [] }));
            const pList = Array.isArray(pRes) ? pRes : (Array.isArray(pRes?.data?.data) ? pRes.data.data : (Array.isArray(pRes?.data) ? pRes.data : []));
            setClientProducts(pList);
          }
        } catch { /* products fetch failed */ }

        // Automatic extraction of Company & Site details from application & audits & user profile
        let clientData = appData?.client_id;
        const clientIdStr = (typeof clientData === 'object' && clientData?._id)
          ? clientData._id
          : (typeof clientData === 'string' ? clientData : (appData?.profiles?._id || null));

        if (clientIdStr) {
          try {
            const uRes = await api.get(`/api/users/${clientIdStr}`).catch(() => null);
            if (uRes?.data?.data || uRes?.data) {
              clientData = { ...(typeof clientData === 'object' ? clientData : {}), ...(uRes.data.data || uRes.data) };
            }
          } catch { /* user enrichment failed */ }
        }

        let siteData = appData?.site
          || (typeof appData?.site_id === 'object' && appData.site_id ? appData.site_id : null)
          || appData?.sites?.[0]
          || null;

        const siteIdStr = siteData?._id
          || (typeof appData?.site_id === 'string' ? appData.site_id : null);

        if (!siteData && siteIdStr) {
          try {
            const sRes = await api.get(`/api/sites/${siteIdStr}`).catch(() => null);
            if (sRes?.data?.data || sRes?.data) {
              siteData = sRes.data.data || sRes.data;
            }
          } catch { /* site fetch failed */ }
        }

        const clientFullAddr = clientData?.address || appData?.profiles?.address || clientData?.registered_address || clientData?.head_office_address || clientData?.street;

        const siteFullAddr = siteData ? siteData?.address : '';

        const siteHeadOffice = siteData?.head_office_address || siteData?.head_office || '';

        const autoSiteName = siteData?.name
          || appData?.site_name
          || appData?.site_id?.name
          || appData?.establishment_name
          || appData?.site_id?.est_name
          || 'Main Manufacturing Site';

        const autoCompanyName = clientData?.company_name
          || appData?.profiles?.company_name
          || appData?.company_name
          || clientData?.business_name
          || clientData?.full_name
          || appData?.profiles?.full_name
          || '';

        let autoManufacturingAddress = appData?.manufacturer_address
          || siteFullAddr
          || '';

        let autoCompanyAddress = clientFullAddr
          || siteHeadOffice
          || clientData?.address
          || clientData?.registered_address
          || appData?.establishment_address
          || appData?.profiles?.address
          || autoManufacturingAddress
          || siteFullAddr
          || '';

        if (!autoCompanyAddress) {
          autoCompanyAddress = autoManufacturingAddress || (autoCompanyName ? `${autoCompanyName}, United Kingdom` : 'United Kingdom');
        }

        // 3. See if main facility logsheet exists
        let logsheetObj = null;
        if (queryLogsheetId) {
          try {
            const specificLogRes = await api.get(`/api/application-logsheets/${queryLogsheetId}`);
            const specificRaw = specificLogRes.data?.data || specificLogRes.data;
            if (specificRaw && specificRaw._id) {
              logsheetObj = specificRaw;
            }
          } catch {
            // fallback
          }
        }
        if (!logsheetObj) {
          try {
            const logRes = await api.get(`/api/application-logsheets/application/${appId}`);
            const raw = logRes.data?.data || logRes.data;
            if (
              raw &&
              !raw.error &&
              raw._id &&
              raw.source_type !== 'initial_product_application' &&
              raw.source_type !== 'addon_application' &&
              !raw.initial_product_application_id &&
              !raw.addon_application_id &&
              raw.audit_type !== 'Initial Product Evaluation'
            ) {
              logsheetObj = raw;
            }
          } catch {
            // Logsheet not found yet
          }
        }

        if (logsheetObj && logsheetObj._id) {
          setCurrentLogsheet(logsheetObj);

          let resolvedCompanyName = logsheetObj.company_name;
          if (!resolvedCompanyName || (resolvedCompanyName === autoSiteName && autoCompanyName && autoCompanyName !== autoSiteName)) {
            resolvedCompanyName = autoCompanyName;
          }

          setForm(f => ({
            ...f,
            ...logsheetObj,
            certificate_type: logsheetObj.certificate_type || logsheetObj.suggested_certificate_type || logsheetObj.certificate_standard || appData?.suggested_certificate_type || appData?.certificate_type || '',
            certificate_standard: logsheetObj.certificate_standard || logsheetObj.certificate_type || '',
            suggested_certificate_type: logsheetObj.suggested_certificate_type || logsheetObj.certificate_type || logsheetObj.certificate_standard || appData?.suggested_certificate_type || '',
            next_surveillance_due_date: logsheetObj.next_surveillance_due_date ? new Date(logsheetObj.next_surveillance_due_date).toISOString().split('T')[0] : (appData?.next_surveillance_due_date ? new Date(appData.next_surveillance_due_date).toISOString().split('T')[0] : ''),
            site_name: (logsheetObj.site_name != null) ? logsheetObj.site_name : autoSiteName,
            company_name: (resolvedCompanyName && resolvedCompanyName.trim()) ? resolvedCompanyName : autoCompanyName,
            company_address: (logsheetObj.company_address != null) ? logsheetObj.company_address : autoCompanyAddress,
            manufacturing_address: (logsheetObj.manufacturing_address != null) ? logsheetObj.manufacturing_address : autoManufacturingAddress,
            confirmed: false
          }));
        } else {
          const autoContactPerson = appData?.halal_coordinator || appData?.qa_contact || appData?.managing_director || clientData?.full_name || appData?.profiles?.full_name || '';
          const autoContactEmail = clientData?.email || appData?.profiles?.email || appData?.finance_contact || '';
          const autoNature = appData?.scope || appData?.business_type || appData?.category || 'Halal Food Production & Processing';
          const autoProductCategory = appData?.category || appData?.product_category || (appData?.products?.length > 0 ? appData.products.map(p => p.name || p.category).filter(Boolean).slice(0, 5).join(', ') : '') || '';

          let autoAuditType = 'New';
          if (appData?.application_type) {
            const lt = appData.application_type.toLowerCase();
            if (lt.includes('initial') || lt.includes('new')) autoAuditType = 'New';
            else if (lt.includes('surveillance')) autoAuditType = 'Surveillance';
            else if (lt.includes('renewal') || lt.includes('re-audit')) autoAuditType = 'Re-audit';
          }

          const auditsArr = Array.isArray(auditData) ? auditData : (auditData ? [auditData] : []);
          const primaryAudit = auditsArr[0] || null;

          // Gather all NC reports from application and audits
          const appNcReports = Array.isArray(appData?.nc_reports) ? appData.nc_reports : [];
          const auditNcReports = auditsArr.flatMap(a => Array.isArray(a.nc_reports) ? a.nc_reports : []);
          const allNcs = [...appNcReports];
          auditNcReports.forEach(aNc => {
            const exists = allNcs.some(c =>
              (c._id && aNc._id && String(c._id) === String(aNc._id)) ||
              (c.text && aNc.text && c.text.trim().toLowerCase() === aNc.text.trim().toLowerCase())
            );
            if (!exists) allNcs.push(aNc);
          });

          const unclosedNcs = allNcs.filter(nc => nc.status && nc.status !== 'closed');
          const isNcBlocked = appData?.status === 'nc_flagged' ||
            unclosedNcs.length > 0 ||
            auditsArr.some(a => Boolean(a.nc_text && !a.nc_closed) || a.status === 'nc_flagged');

          setHasOpenNc(isNcBlocked);
          setOpenNcCount(unclosedNcs.length || (appData?.status === 'nc_flagged' ? 1 : 0));

          let autoAuditDate = '';
          let autoAuditors = '';
          let autoNcsClose = isNcBlocked
            ? `${unclosedNcs.length || 1} NC(s) outstanding - Must resolve before LogSheet`
            : (allNcs.length > 0 ? 'All NCs closed and verified' : 'No NCs flagged');

          if (primaryAudit) {
            if (primaryAudit.finalized_date) {
              autoAuditDate = new Date(primaryAudit.finalized_date).toISOString().split('T')[0];
            } else if (primaryAudit.scheduled_date) {
              autoAuditDate = new Date(primaryAudit.scheduled_date).toISOString().split('T')[0];
            } else if (primaryAudit.selected_dates && primaryAudit.selected_dates.length > 0) {
              autoAuditDate = new Date(primaryAudit.selected_dates[0]).toISOString().split('T')[0];
            }

            if (primaryAudit.auditors && primaryAudit.auditors.length > 0) {
              autoAuditors = primaryAudit.auditors.map(a => a.name || a.full_name).filter(Boolean).join(', ');
            }
          } else if (appData?.audit_date) {
            autoAuditDate = new Date(appData.audit_date).toISOString().split('T')[0];
          }

          const existingReports = appData?.audit_reports?.map(r => ({ name: r.name || 'Audit_Report.pdf', url: r.url, uploaded_at: r.uploaded_at })) || [];

          setForm(f => ({
            ...f,
            site_name: autoSiteName,
            company_name: autoCompanyName,
            company_address: autoCompanyAddress,
            manufacturing_address: autoManufacturingAddress,
            contact_person: autoContactPerson,
            contact_email: autoContactEmail,
            nature_of_business: autoNature,
            product_category: autoProductCategory,
            certificate_type: appData?.suggested_certificate_type || appData?.certificate_type || '',
            certificate_standard: appData?.certificate_type || '',
            suggested_certificate_type: appData?.suggested_certificate_type || appData?.certificate_type || '',
            issue_date: todayStr,
            expiry_date: oneYearLater,
            current_cycle_start: autoAuditDate || todayStr,
            original_cycle_start: appData?.created_at ? new Date(appData.created_at).toISOString().split('T')[0] : todayStr,
            next_surveillance_due_date: appData?.next_surveillance_due_date ? new Date(appData.next_surveillance_due_date).toISOString().split('T')[0] : '',

            audit_type: autoAuditType,
            audit_date: autoAuditDate || todayStr,
            auditors: autoAuditors || (user?.full_name ? `${user.full_name}` : ''),
            ncs_close: autoNcsClose,
            docs_satisfactory: 'Satisfactory - all documentation verified',
            pork_free_statement: 'Confirmed - signed pork-free declaration in place',
            reviewed_by: user?.full_name || '',
            reviewer_name: user?.full_name || '',
            review_date: todayStr,

            annual_certificate: 'Yes',
            batch_certificate: 'No',
            new_products_only: 'No',
            new_site_line: 'No',
            new_client: (autoAuditType === 'New' || autoAuditType === 'Initial') ? 'Yes' : 'No',
            agreement_signed: 'Yes',
            status_date: todayStr,

            comment: 'Recommended for Halal certification approval following successful audit and compliance review.',
            confirmed: false,

            document_urls: existingReports,
            audit_reports: existingReports,
            document_url: existingReports[0]?.url || ''
          }));
        }
      }

      // Fetch signatures for signing panel (shared for both modes)
      try {
        const sigsRes = await api.get('/api/signatures');
        setSignatures(Array.isArray(sigsRes) ? sigsRes : []);
      } catch (e) {
        console.log('Failed to fetch signatures', e);
      }
    } catch (err) {
      toast.error('Failed to load application data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingReport(true);
    const toastId = toast.loading(`Uploading ${files.length} document(s)...`);
    try {
      const uploadedDocs = [];
      const folder = isProductLogsheet ? 'product_specifications' : 'audit_reports';
      for (const file of files) {
        const url = await api.uploadPdf(file, folder);
        if (!url) throw new Error(`Upload failed for file "${file.name}"`);
        uploadedDocs.push({
          name: file.name,
          url,
          uploaded_at: new Date()
        });
      }

      const existing = Array.isArray(form.document_urls) ? form.document_urls : [];
      const combined = [...existing, ...uploadedDocs];

      setForm(prev => ({
        ...prev,
        document_url: combined[0]?.url || '',
        document_urls: combined,
        audit_reports: combined
      }));

      // If currentLogsheet exists on server, persist immediately
      if (currentLogsheet?._id) {
        try {
          await api.put(`/api/application-logsheets/${currentLogsheet._id}/documents`, {
            document_urls: combined,
            audit_reports: combined,
            document_url: combined[0]?.url || ''
          });
          setCurrentLogsheet(prev => ({
            ...prev,
            document_urls: combined,
            audit_reports: combined,
            document_url: combined[0]?.url || ''
          }));
        } catch (saveErr) {
          console.error('Failed to auto-save uploaded documents to server:', saveErr);
        }
      }

      const docLabel = isProductLogsheet ? 'additional document(s)' : 'audit report document(s)';
      toast.success(`${files.length} ${docLabel} uploaded successfully!`, { id: toastId });
    } catch (err) {
      console.error('Document upload error:', err);
      toast.error(err.message || 'Upload failed. Please try again.', { id: toastId });
    } finally {
      setUploadingReport(false);
      e.target.value = '';
    }
  };

  const handleRemoveDocument = async (idx) => {
    const existing = Array.isArray(form.document_urls) ? form.document_urls : [];
    const updated = existing.filter((_, i) => i !== idx);
    setForm(prev => ({
      ...prev,
      document_urls: updated,
      document_url: updated[0]?.url || '',
      audit_reports: updated
    }));

    if (currentLogsheet?._id) {
      try {
        await api.put(`/api/application-logsheets/${currentLogsheet._id}/documents`, {
          document_urls: updated,
          audit_reports: updated,
          document_url: updated[0]?.url || ''
        });
        setCurrentLogsheet(prev => ({
          ...prev,
          document_urls: updated,
          audit_reports: updated,
          document_url: updated[0]?.url || ''
        }));
        toast.success('Document removed successfully');
      } catch (err) {
        console.error('Failed to remove document from server:', err);
        toast.error('Failed to remove document from server');
      }
    }
  };

  const openSigningModal = (roleToPreselect = null) => {
    if (!hasSignaturePrivilege) {
      toast.error('Access denied. You do not have the Signature Privilege required to sign logsheets. Please contact Superadmin.');
      return;
    }

    if (!userSignature) {
      toast.error('Your authenticated user account does not have an uploaded digital signature. Please upload one under Signatures first.');
      return;
    }

    if (isMuftiUser && (roleToPreselect === 'Ceo' || roleToPreselect === 'Manager')) {
      toast.error('Mufti / Shariah Scholar signatories cannot sign for CEO or Technical Auditor / Manager roles.');
      return;
    }

    if (is30DaysExtension) {
      setSigRole('Ceo');
    } else {
      const unsignedRoles = [
        { key: 'Mufti', isSigned: !!currentLogsheet?.mufti_signature },
        { key: 'Ceo', isSigned: !!currentLogsheet?.ceo_signature },
        { key: 'Manager', isSigned: !!currentLogsheet?.manager_signature },
        { key: 'Mufti2', isSigned: !!currentLogsheet?.mufti2_signature },
      ].filter(r => !r.isSigned && (!isMuftiUser || (r.key === 'Mufti' || r.key === 'Mufti2'))).map(r => r.key);

      if (roleToPreselect && unsignedRoles.includes(roleToPreselect)) {
        setSigRole(roleToPreselect);
      } else if (unsignedRoles.length > 0) {
        setSigRole(unsignedRoles[0]);
      } else {
        setSigRole('');
      }
    }
    setModalConfirmed(false);
    setShowSignModal(true);
  };

  const handleConfirmApplySignature = async () => {
    if (!hasSignaturePrivilege) {
      toast.error('Access denied. Signature Privilege required.');
      return;
    }
    if (!sigRole) {
      toast.error('Please select a single signatory role to sign');
      return;
    }
    if (!modalConfirmed) {
      toast.error('Please check the confirmation box before applying signature');
      return;
    }

    if (!userSignature) {
      toast.error('No authenticated digital signature available.');
      return;
    }

    if (isMuftiUser && (sigRole === 'Ceo' || sigRole === 'Manager')) {
      toast.error('Mufti signatories cannot sign for CEO or Technical Auditor roles.');
      return;
    }

    setIsSigning(true);
    try {
      const signerFullName = user?.full_name || userSignature?.name || user?.username || 'Authorized Signatory';

      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        role: sigRole,
        signature_url: userSignature.signature_url,
        signature_name: signerFullName,
        comment: sigComment
      });
      toast.success(`Logsheet signed successfully as ${sigRole}!`);
      setShowSignModal(false);
      setModalConfirmed(false);
      fetchData();
      setSigRole('');
      setSigComment('');
    } catch (err) {
      toast.error(err.message || 'Failed to apply signature');
    } finally {
      setIsSigning(false);
    }
  };

  // handleSendToReview removed — replaced by signing modal flow


  const handleFinalizeApplicationSuccessful = async () => {
    const requiredSigs = is30DaysExtension ? 1 : 3;
    if (totalSignedCount < requiredSigs) {
      toast.error(is30DaysExtension
        ? 'Requires 1 Authorized Officer / CEO signature for 30-Day Extension.'
        : `Requires at least 3 of 4 committee signatures — currently ${totalSignedCount}/4 signed.`);
      return;
    }

    const INVALID_SCHEMES = ['', '-- select certificate type / scheme (required) --'];
    const resolvedCertType = (form.certificate_type || form.certificate_standard || form.suggested_certificate_type || '').trim();
    if (!resolvedCertType || INVALID_SCHEMES.includes(resolvedCertType.toLowerCase())) {
      toast.error('⚠️ Please select a valid Certificate Type / Scheme. "-- Select Certificate Type / Scheme (Required) --" is not a certificate type.');
      setActiveTab(3);
      return;
    }

    if (isGSO) {
      setShowNextSurvModal(true);
      return;
    }

    const isConfirmed = window.confirm('Are you sure you want to mark this application as Successful and complete committee sign-off?');
    if (!isConfirmed) return;

    setIsFinalizing(true);
    try {
      const chosenCertType = currentLogsheet?.certificate_type || currentLogsheet?.certificate_standard || form.certificate_type || form.certificate_standard;
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        finalizeSignOff: true,
        certificate_type: chosenCertType,
        suggested_certificate_type: chosenCertType
      });

      toast.success('🎉 Application marked Successful! Committee Signatures finalized.');
      fetchData();
      const targetAppId = appId || application?._id || currentLogsheet?.application_id?._id || currentLogsheet?.application_id;
      if (isAddon || currentLogsheet?.addon_application_id) {
        const targetAddonId = addonId || currentLogsheet?.addon_application_id?._id || currentLogsheet?.addon_application_id;
        navigate(targetAddonId ? `/addon-applications/${targetAddonId}/processing` : '/addon-applications');
      } else if (isInitialProduct) {
        navigate(`/admin/initial-products/${resolvedInitialProductId}/processing`);
      } else if (targetAppId) {
        navigate(`/applications/${targetAppId}/processing`);
      } else {
        navigate('/logsheet/direct');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to finalize application');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleConfirmNextSurveillanceFromLogsheet = async ({ next_surveillance_due_date, admin_name, notes }) => {
    const INVALID_SCHEMES = ['', '-- select certificate type / scheme (required) --'];
    const resolvedCertType = (form.certificate_type || form.certificate_standard || form.suggested_certificate_type || '').trim();
    if (!resolvedCertType || INVALID_SCHEMES.includes(resolvedCertType.toLowerCase())) {
      toast.error('⚠️ Please select a valid Certificate Type / Scheme. "-- Select Certificate Type / Scheme (Required) --" is not a certificate type.');
      setShowNextSurvModal(false);
      setActiveTab(3);
      return;
    }
    setIsFinalizing(true);
    try {
      const chosenCertType = currentLogsheet?.certificate_type || currentLogsheet?.certificate_standard || form.certificate_type || form.certificate_standard;
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        finalizeSignOff: true,
        certificate_type: chosenCertType,
        suggested_certificate_type: chosenCertType,
        next_surveillance_due_date,
        admin_name,
        notes
      });

      toast.success('🎉 Application marked Successful! Next surveillance due date recorded.');
      setShowNextSurvModal(false);
      fetchData();
      const targetAppId = appId || application?._id || currentLogsheet?.application_id?._id || currentLogsheet?.application_id;
      if (targetAppId) {
        navigate(`/applications/${targetAppId}/processing`);
      } else {
        navigate('/logsheet/direct');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to finalize application');
    } finally {
      setIsFinalizing(false);
    }
  };

  const openApproveProductsModal = () => {
    if (isRemoveProduct && !canManageProducts) {
      toast.error('Access denied. Only Food Tech, Food Tech Manager, or Admin can remove products.');
      return;
    }
    if (isAddon && !canManageProducts) {
      toast.error('Access denied. Only Food Tech, Food Tech Manager, or Admin can approve add-on products.');
      return;
    }
    if (totalSignedCount < 3) {
      toast.error(`Requires at least 3 of 4 committee signatures — currently ${totalSignedCount}/4 signed.`);
      return;
    }
    const productsList = isInitialProduct
      ? (application?.product ? [application.product] : [])
      : (application?.products || clientProducts || []);
    // Default all products selected
    setSelectedApproveProducts(productsList.map((_, idx) => idx));
    setShowApproveProductsModal(true);
  };

  const handleAcceptIngredients = async () => {
    if (!canManageProducts) {
      toast.error('Access denied. Only Food Tech, Food Tech Manager, or Admin can accept modified ingredients.');
      return;
    }
    if (totalSignedCount < 3) {
      toast.error(`Requires at least 3 of 4 committee signatures — currently ${totalSignedCount}/4 signed.`);
      return;
    }
    const isConfirmed = window.confirm(
      'Are you sure you want to accept the modified ingredients? This will complete the application without generating a new certificate.'
    );
    if (!isConfirmed) return;

    setIsFinalizing(true);
    try {
      const targetAddonId = addonId || currentLogsheet?.addon_application_id?._id || currentLogsheet?.addon_application_id;
      if (!targetAddonId) throw new Error('Add-on application ID not found.');

      // 1. Accept ingredients in AddOnApplication FIRST
      await api.put(`/api/add-on-applications/${targetAddonId}/accept-ingredients`);

      // 2. Finalize logsheet sign-off only after successful acceptance
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        finalizeSignOff: true
      }).catch(() => {});

      toast.success('🎉 Ingredients accepted! Add-on application completed.');
      navigate(`/addon-applications/${targetAddonId}/processing-ingredients`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to accept ingredients');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSendHighlightedProductsToClient = async () => {
    const productsList = isInitialProduct
      ? (application?.product ? [application.product] : [])
      : (application?.products || clientProducts || []);
    if (productsList.length > 0 && selectedApproveProducts.length === 0) {
      toast.error(isRemoveProduct ? 'Please select at least one product to remove.' : 'Please select at least one product to approve.');
      return;
    }

    const countToApprove = selectedApproveProducts.length > 0 ? selectedApproveProducts.length : productsList.length;

    if (isRemoveProduct) {
      if (!canManageProducts) {
        toast.error('Access denied. Only Food Tech, Food Tech Manager, or Admin can remove products.');
        return;
      }
      const isConfirmed = window.confirm(
        `Are you sure you want to remove the selected ${countToApprove} product(s) from the client's active Halal certification?`
      );
      if (!isConfirmed) return;

      setIsFinalizing(true);
      try {
        const targetAddonId = addonId || currentLogsheet?.addon_application_id?._id || currentLogsheet?.addon_application_id;
        const toRemove = selectedApproveProducts.map(idx => productsList[idx]).filter(Boolean);

        // 1. Remove products from DB and certificate FIRST (enforces requireFoodTechManagerOrAdmin)
        await api.put(`/api/add-on-applications/${targetAddonId}/remove-products`, {
          selected_products: toRemove
        });

        // 2. Finalize logsheet sign-off only after successful product removal
        await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
          finalizeSignOff: true,
          approved_products: toRemove
        }).catch(() => {});

        toast.success(`🎉 ${toRemove.length} product(s) removed successfully! Ready for updated certificate.`);
        setShowApproveProductsModal(false);
        navigate(`/addon-applications/${targetAddonId}/processing-remove`);
      } catch (err) {
        toast.error(err.response?.data?.error || err.message || 'Failed to remove products');
      } finally {
        setIsFinalizing(false);
      }
      return;
    }

    if (isAddon && !canManageProducts) {
      toast.error('Access denied. Only Food Tech, Food Tech Manager, or Admin can approve add-on products.');
      return;
    }

    const isConfirmed = window.confirm(
      isInitialProduct
        ? 'Are you sure you want to approve this Initial Product and send for facility audit?'
        : `Are you sure you want to approve and send ${countToApprove} highlighted product(s) to the client dashboard?`
    );
    if (!isConfirmed) return;

    setIsFinalizing(true);
    try {
      const approvedProductsList = productsList.length > 0 && selectedApproveProducts.length > 0
        ? productsList.filter((_, idx) => selectedApproveProducts.includes(idx))
        : productsList;

      // 1. Finalize logsheet sign-off with approved products
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        finalizeSignOff: true,
        approved_products: approvedProductsList
      });

      // 2. If Initial Product, call initial-products approve-form
      if (isInitialProduct) {
        const targetIpId = resolvedInitialProductId || currentLogsheet?.initial_product_application_id?._id || currentLogsheet?.initial_product_application_id;
        if (targetIpId) {
          try {
            await api.put(`/api/initial-products/${targetIpId}/approve-form`);
          } catch (e) {
            console.warn('Initial product approve-form sync note:', e.message);
          }
        }
      }

      // 3. Also call add-on approve-form if linked
      const targetAddonId = addonId || currentLogsheet?.addon_application_id?._id || currentLogsheet?.addon_application_id;
      if (targetAddonId) {
        try {
          await api.put(`/api/add-on-applications/${targetAddonId}/approve-form`, {
            approved_products: approvedProductsList
          });
        } catch (e) {
          console.warn('Add-on approve-form sync note:', e.message);
        }
      }

      toast.success(
        isInitialProduct
          ? '🎉 Initial Product Approved! Main Application is now ready for Audit.'
          : `🎉 ${approvedProductsList.length} product(s) approved successfully!`
      );
      setShowApproveProductsModal(false);
      fetchData();
      if (isInitialProduct) {
        navigate(`/admin/initial-products/${resolvedInitialProductId}/processing`);
      } else if (isAddon || addonId || currentLogsheet?.addon_application_id) {
        const targetAddonId = addonId || currentLogsheet?.addon_application_id?._id || currentLogsheet?.addon_application_id;
        navigate(targetAddonId ? `/addon-applications/${targetAddonId}/processing` : '/addon-applications');
      } else {
        const targetAppId = appId || application?._id || currentLogsheet?.application_id?._id || currentLogsheet?.application_id;
        if (targetAppId) {
          navigate(`/applications/${targetAppId}/processing`);
        } else {
          navigate('/logsheet/direct');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to approve products');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSaveInitialProductDetails = async () => {
    if (!initialProductName.trim()) {
      return toast.error('Initial Product Name is required.');
    }
    setSavingProductDetails(true);
    try {
      await api.put(`/api/initial-products/${resolvedInitialProductId}/product-info`, {
        name: initialProductName.trim(),
        code: initialProductCode.trim()
      });
      toast.success('Initial Product name & code updated successfully!');
      setApplication(prev => prev ? ({
        ...prev,
        product: {
          ...(prev.product || {}),
          name: initialProductName.trim(),
          code: initialProductCode.trim()
        }
      }) : prev);
      setForm(prev => ({
        ...prev,
        product_category: `${initialProductName.trim()}${initialProductCode.trim() ? ` (${initialProductCode.trim()})` : ''}`
      }));
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update product details');
    } finally {
      setSavingProductDetails(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // CRITICAL: NC must be done before LogSheet
    if (!isProductLogsheet && hasOpenNc && !currentLogsheet?._id) {
      toast.error('All Non-Conformances (NC) must be completed and closed before creating a LogSheet.');
      return;
    }

    if (isDirectCreation && directLogsheetType === 'surveillance') {
      // Surveillance Letter Validation (matching screenshot: 1. Company Details, 2. Comment / Reason)
      if (!form.company_name?.trim()) {
        toast.error('Company Name is required (1. Company Details)');
        setActiveTab(1);
        return;
      }
      if (!form.company_address?.trim()) {
        toast.error('Company Address is required (1. Company Details)');
        setActiveTab(1);
        return;
      }
      if (!form.contact_person?.trim()) {
        toast.error('Contact Person is required (1. Company Details)');
        setActiveTab(1);
        return;
      }
      if (!form.contact_email?.trim()) {
        toast.error('Contact E-mail is required (1. Company Details)');
        setActiveTab(1);
        return;
      }
      if (!form.issue_date) {
        toast.error('Issue date of certificate is required (1. Company Details)');
        setActiveTab(1);
        return;
      }
      if (!form.expiry_date) {
        toast.error('Expiry date of certificate is required (1. Company Details)');
        setActiveTab(1);
        return;
      }
      if (!form.audit_date) {
        toast.error('Audit Date is required (1. Company Details)');
        setActiveTab(1);
        return;
      }
      if (!form.comment?.trim()) {
        toast.error('Comment / Reason for Decision is required (2. Comment / Reason)');
        setActiveTab(2);
        return;
      }
      if (!form.confirmed) {
        toast.error('Please confirm the verification checkbox before creating Surveillance Letter');
        setActiveTab(2);
        return;
      }
      form.certificate_type = 'Surveillance Letter';
      form.certificate_standard = 'Surveillance Letter';
      form.suggested_certificate_type = 'Surveillance Letter';
      form.audit_type = 'Surveillance';
    } else if (isDirectCreation && directLogsheetType === 'extension') {
      // Extension Logsheet Validation (1. Facility & Extension Details, 2. Comment / Reason)
      if (!form.company_name?.trim()) {
        toast.error('Company Name is required (1. Facility & Extension Details)');
        setActiveTab(1);
        return;
      }
      if (!form.company_address?.trim()) {
        toast.error('Company Address is required (1. Facility & Extension Details)');
        setActiveTab(1);
        return;
      }
      if (!form.contact_person?.trim()) {
        toast.error('Contact Person is required (1. Facility & Extension Details)');
        setActiveTab(1);
        return;
      }
      if (!form.contact_email?.trim()) {
        toast.error('Contact E-mail is required (1. Facility & Extension Details)');
        setActiveTab(1);
        return;
      }
      if (!form.existing_certificate_number?.trim()) {
        toast.error('Existing Certificate Number is required (1. Facility & Extension Details)');
        setActiveTab(1);
        return;
      }
      if (!form.extension_reason?.trim()) {
        toast.error('Reason for Extension Request is required (1. Facility & Extension Details)');
        setActiveTab(1);
        return;
      }
      if (!form.comment?.trim()) {
        toast.error('Comment / Reason is required (2. Comment / Reason)');
        setActiveTab(2);
        return;
      }
      if (!form.confirmed) {
        toast.error('Please confirm the verification checkbox before creating Extension Logsheet');
        setActiveTab(2);
        return;
      }
      form.audit_type = 'Facility Extension Review';
    } else if (isDirectCreation && directLogsheetType === 'product') {
      // Product Logsheet Validation (1. Product Evaluation, 2. Comment / Reason)
      if (!form.company_name?.trim()) {
        toast.error('Company Name is required (1. Product Evaluation)');
        setActiveTab(1);
        return;
      }
      if (!form.product_name?.trim()) {
        toast.error('Product Name is required (1. Product Evaluation)');
        setActiveTab(1);
        return;
      }
      if (!form.contact_person?.trim()) {
        toast.error('Contact Person is required (1. Product Evaluation)');
        setActiveTab(1);
        return;
      }
      if (!form.contact_email?.trim()) {
        toast.error('Contact E-mail is required (1. Product Evaluation)');
        setActiveTab(1);
        return;
      }
      if (!form.comment?.trim()) {
        toast.error('Comment / Reason is required (2. Comment / Reason)');
        setActiveTab(2);
        return;
      }
      if (!form.confirmed) {
        toast.error('Please confirm the verification checkbox before creating Product Logsheet');
        setActiveTab(2);
        return;
      }
      form.audit_type = form.product_sub_type === 'addon' ? 'Add-on Products Certification' : 'Initial Product Evaluation';
    } else {
      // Normal Logsheet Validation (Tabs 1, 2, 3, 4)
      // 1. Validate Tab 1: Company & Site Details
      if (!form.company_name?.trim()) {
        toast.error('Company Name is required (Tab 1)');
        setActiveTab(1);
        return;
      }
      if (!form.contact_person?.trim()) {
        toast.error('Contact Person is required (Tab 1)');
        setActiveTab(1);
        return;
      }
      if (!form.company_address?.trim()) {
        toast.error('Company Address is required (Tab 1)');
        setActiveTab(1);
        return;
      }

      if (!form.contact_email?.trim()) {
        toast.error('Contact Email is required (Tab 1)');
        setActiveTab(1);
        return;
      }
      if (!form.nature_of_business?.trim()) {
        toast.error('Nature of Business is required (Tab 1)');
        setActiveTab(1);
        return;
      }
      if (!form.product_category?.trim()) {
        toast.error('Product Category is required (Tab 1)');
        setActiveTab(1);
        return;
      }
      if (!form.issue_date) {
        toast.error('Issue Date of Certificate is required (Tab 1)');
        setActiveTab(1);
        return;
      }
      if (!form.expiry_date) {
        toast.error('Expiry Date of Certificate is required (Tab 1)');
        setActiveTab(1);
        return;
      }
      if (!form.current_cycle_start) {
        toast.error('Current Cycle Start Date is required (Tab 1)');
        setActiveTab(1);
        return;
      }
      if (!form.original_cycle_start) {
        toast.error('Original Cycle Start Date is required (Tab 1)');
        setActiveTab(1);
        return;
      }

      const hasAuditReports = (form.document_urls && form.document_urls.length > 0) || form.document_url || (form.audit_reports && form.audit_reports.length > 0);
      if (!isAddon && !isInitialProduct && !isDirectCreation && !hasAuditReports) {
        toast.error('Please upload at least 1 Audit Report document before creating the logsheet (Tab 1).');
        setActiveTab(1);
        return;
      }

      // 2. Validate Tab 2: Review of Application
      if (!form.audit_type?.trim()) {
        toast.error('Audit Type is required (Tab 2)');
        setActiveTab(2);
        return;
      }
      if (!form.audit_date) {
        toast.error('Audit Date is required (Tab 2)');
        setActiveTab(2);
        return;
      }
      if (!form.auditors?.trim()) {
        toast.error((isAddon || isInitialProduct) ? 'Assigned FT is required (Tab 2)' : 'Auditor(s) are required (Tab 2)');
        setActiveTab(2);
        return;
      }
      if (!isAddon && !isInitialProduct && !form.ncs_close?.trim()) {
        toast.error('NCS Close status is required (Tab 2)');
        setActiveTab(2);
        return;
      }
      if (!form.docs_satisfactory?.trim()) {
        toast.error('Documentation Review Status is required (Tab 2)');
        setActiveTab(2);
        return;
      }
      if (!form.pork_free_statement?.trim()) {
        toast.error('Pork Free Statement is required (Tab 2)');
        setActiveTab(2);
        return;
      }
      if (!form.reviewed_by?.trim()) {
        toast.error('Reviewed By is required (Tab 2)');
        setActiveTab(2);
        return;
      }
      if (!form.reviewer_name?.trim()) {
        toast.error('Reviewer Name is required (Tab 2)');
        setActiveTab(2);
        return;
      }
      if (!form.review_date) {
        toast.error('Date of Review is required (Tab 2)');
        setActiveTab(2);
        return;
      }

      // 3. Validate Tab 3: Certificate Status
      const INVALID_SCHEMES = ['', '-- select certificate type / scheme (required) --'];
      const resolvedCertType = (form.certificate_type || form.certificate_standard || form.suggested_certificate_type || '').trim();
      if (!resolvedCertType || INVALID_SCHEMES.includes(resolvedCertType.toLowerCase())) {
        toast.error('⚠️ Please select a valid Certificate Type / Scheme. "-- Select Certificate Type / Scheme (Required) --" is not a certificate type.');
        setActiveTab(3);
        return;
      }
      if (!form.certificate_type || form.certificate_type !== resolvedCertType) {
        form.certificate_type = resolvedCertType;
        form.certificate_standard = resolvedCertType;
        form.suggested_certificate_type = resolvedCertType;
      }
      if (isGSO && !form.next_surveillance_due_date) {
        toast.error('Next Surveillance Due Date is required for GSO logsheet (Tab 1)');
        setActiveTab(1);
        return;
      }
      if (!form.status_date) {
        toast.error('Status Date is required (Tab 3)');
        setActiveTab(3);
        return;
      }

      // 4. Validate Tab 4: Comment
      if (!form.comment?.trim()) {
        toast.error('Comment / Reason for Decision is required (Tab 4)');
        setActiveTab(4);
        return;
      }

      // 5. Confirmation
      if (!form.confirmed) {
        toast.error('Please confirm the verification checkbox at the bottom');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Bug fix: only clear signatures when actually in redo mode, not just because a logsheet exists
      const isRedoingSave = isRedoing;
      const redoPayload = isRedoingSave ? {
        clear_signatures: true,
        is_redo: true,
        mufti_signature: null,
        mufti_sign_name: null,
        mufti_sign_date: null,
        ceo_signature: null,
        ceo_sign_name: null,
        ceo_sign_date: null,
        manager_signature: null,
        manager_sign_name: null,
        manager_sign_date: null,
        mufti2_signature: null,
        mufti2_sign_name: null,
        mufti2_sign_date: null,
        status: 'Waiting for Signature'
      } : {};

      if (isInitialProduct) {
        const { _id: _fId, id: _fIntId, __v: _fV, createdAt: _fCa, updatedAt: _fUa, created_at: _fCat, updated_at: _fUat, ...cleanForm } = form;
        void _fId; void _fIntId; void _fV; void _fCa; void _fUa; void _fCat; void _fUat;
        await api.post(`/api/initial-products/${resolvedInitialProductId}/create-logsheet`, {
          ...cleanForm,
          ...redoPayload,
          product_name: initialProductName.trim(),
          product_code: initialProductCode.trim(),
          document_urls: form.document_urls || [],
          audit_reports: form.audit_reports || form.document_urls || [],
          client_id: application?.client_id?._id || application?.client_id,
        });
        if (isRedoing) {
          toast.success('Logsheet updated! All previous signatures cleared.');
          setIsRedoing(false);
          // Small delay to ensure server write is committed before re-fetching
          await new Promise(resolve => setTimeout(resolve, 400));
          await fetchData();
        } else {
          toast.success('Logsheet created for Initial Product!');
          navigate(`/admin/initial-products/${resolvedInitialProductId}/processing`);
        }
      } else if (isAddon) {
        // For add-on applications — use the dedicated add-on logsheet route
        const { _id: _fId, id: _fIntId, __v: _fV, createdAt: _fCa, updatedAt: _fUa, created_at: _fCat, updated_at: _fUat, ...cleanForm } = form;
        void _fId; void _fIntId; void _fV; void _fCa; void _fUa; void _fCat; void _fUat;
        await api.post(`/api/add-on-applications/${addonId}/create-logsheet`, {
          ...cleanForm,
          ...redoPayload,
          document_urls: form.document_urls || [],
          audit_reports: form.audit_reports || form.document_urls || [],
          client_id: application?.client_id?._id || application?.client_id,
        });
        if (isRedoing) {
          toast.success('Logsheet updated! All previous signatures cleared.');
          setIsRedoing(false);
          // Small delay to ensure server write is committed before re-fetching
          await new Promise(resolve => setTimeout(resolve, 400));
          await fetchData();
        } else {
          toast.success('Logsheet created for add-on application!');
          navigate('/addon-applications');
        }
      } else if (isDirectLogsheetRoute || (!targetAppId && currentLogsheet?._id)) {
        const logId = directLogsheetId || currentLogsheet?._id;
        const { _id: _fId, id: _fIntId, __v: _fV, createdAt: _fCa, updatedAt: _fUa, created_at: _fCat, updated_at: _fUat, initial_product_application_id: _ipId, addon_application_id: _aoId, source_type: _srcType, ...cleanForm } = form;
        void _fId; void _fIntId; void _fV; void _fCa; void _fUa; void _fCat; void _fUat; void _ipId; void _aoId; void _srcType;

        const payloadToSave = {
          ...cleanForm
        };
        if (directLogsheetType !== 'extension') {
          delete payloadToSave.extension_duration_type;
          delete payloadToSave.extension_days;
          delete payloadToSave.extended_expiry_date;
          delete payloadToSave.existing_certificate_number;
        }

        if (logId) {
          await api.put(`/api/application-logsheets/${logId}`, {
            ...payloadToSave,
            ...redoPayload
          });
          if (isRedoing) {
            toast.success('Direct Logsheet updated successfully! All previous signatures cleared.');
            setIsRedoing(false);
            await new Promise(resolve => setTimeout(resolve, 400));
            await fetchData();
          } else {
            toast.success('Direct Logsheet updated successfully!');
            navigate(`/logsheet/direct/${logId}`);
          }
        } else {
          const effectiveBackendType = (isDirectCreation && directLogsheetType === 'surveillance')
            ? 'surveillance'
            : (isDirectCreation && directLogsheetType === 'extension')
              ? 'extension'
              : (isDirectCreation && directLogsheetType === 'product')
                ? (form.product_sub_type === 'addon' ? 'addon_application' : 'initial_product')
                : 'application';

          const effectiveCertType = (isDirectCreation && directLogsheetType === 'surveillance')
            ? 'Surveillance Letter'
            : (form.certificate_type || form.suggested_certificate_type || form.certificate_standard || 'Surveillance Letter');

          const createRes = await api.post('/api/application-logsheets/direct', {
            ...payloadToSave,
            source_type: 'direct',
            logsheet_type: effectiveBackendType,
            product_sub_type: form.product_sub_type || 'initial',
            products_list: form.products_list || [],
            certificate_type: effectiveCertType,
            certificate_standard: effectiveCertType,
            suggested_certificate_type: effectiveCertType,
            document_urls: form.document_urls || [],
            audit_reports: form.audit_reports || form.document_urls || [],
            client_id: form.client_id || selectedDirectClientId || undefined,
            site_id: form.site_id || undefined,
            application_no: form.application_no || `APP-${directLogsheetType.toUpperCase()}-${Date.now().toString().slice(-6)}`
          });
          const createdDoc = createRes.data?.data || createRes.data;
          const toastMsg = directLogsheetType === 'surveillance'
            ? 'Surveillance Letter created successfully!'
            : (directLogsheetType === 'extension'
                ? 'Extension Logsheet created successfully!'
                : (directLogsheetType === 'product'
                    ? (form.product_sub_type === 'addon' ? 'Add-on Product Logsheet created successfully!' : 'Initial Product Logsheet created successfully!')
                    : 'Normal Logsheet created successfully!'));
          toast.success(toastMsg);
          navigate(`/logsheet/direct/${createdDoc?._id || ''}`);
        }
      } else {
        const targetAppId = appId || application?._id || application?.id;
        // Strip internal/relational fields before posting
        const { _id: _fId, id: _fIntId, __v: _fV, createdAt: _fCa, updatedAt: _fUa, created_at: _fCat, updated_at: _fUat, initial_product_application_id: _ipId, addon_application_id: _aoId, source_type: _srcType, ...cleanForm } = form;
        void _fId; void _fIntId; void _fV; void _fCa; void _fUa; void _fCat; void _fUat; void _ipId; void _aoId; void _srcType;
        const postRes = await api.post('/api/application-logsheets', {
          ...cleanForm,
          ...redoPayload,
          source_type: 'application',
          document_urls: form.document_urls || [],
          audit_reports: form.audit_reports || form.document_urls || [],
          application_id: targetAppId,
          client_id: application?.client_id?._id || application?.client_id,
          site_id: application?.site_id?._id || application?.site_id
        });

        // Explicitly update application status in DB to logsheet_created
        await api.put(`/api/applications/${targetAppId}/status`, {
          status: 'logsheet_created',
          note: isRedoing ? 'LogSheet updated and redone. Signatures reset, awaiting signatures.' : 'LogSheet created. Awaiting signatory signatures.'
        }).catch(() => {});

        const savedLogsheetId = postRes.data?.data?._id || postRes.data?._id;
        if (savedLogsheetId) {
          await api.put(`/api/applications/${targetAppId}`, {
            logsheet_id: savedLogsheetId
          }).catch(() => {});
        }

        if (isRedoing) {
          toast.success('LogSheet updated successfully! All previous signatures cleared.');
          setIsRedoing(false);
          // Small delay to ensure server write is committed before re-fetching
          await new Promise(resolve => setTimeout(resolve, 400));
          await fetchData();
        } else {
          toast.success('LogSheet saved and status updated successfully!');
          navigate(`/applications/${targetAppId}/processing`);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save logsheet');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => isInitialProduct ? navigate(`/admin/initial-products/${resolvedInitialProductId}/processing`) : (isDirectLogsheetRoute ? (currentLogsheet ? navigate('/logsheet/direct') : navigate('/logsheet/manage')) : navigate(-1))} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <ChevronLeft size={16} /> {isInitialProduct ? 'Back to Initial Product' : (isDirectLogsheetRoute ? (currentLogsheet ? 'New Direct Logsheet' : 'Back to Logsheets') : 'Back')}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {Boolean(currentLogsheet) && !isRedoing && currentLogsheet?.status !== 'Completed' && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                if (window.confirm('Are you sure you want to redo this logsheet? You will be able to edit all details, and saving will reset all existing signatures.')) {
                  setIsRedoing(true);
                  setActiveTab(1);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                color: '#b45309',
                borderColor: '#f59e0b',
                background: '#fffbeb',
                padding: '6px 14px',
                borderRadius: 8
              }}
              title="Edit logsheet and reset signatures"
            >
              <RotateCcw size={14} /> Redo Logsheet
            </button>
          )}

          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Logsheet Ref: <strong style={{ color: '#0f172a' }}>#{getLogsheetEffectiveRef(currentLogsheet || form)}</strong>
          </div>
        </div>
      </div>

      {/* OVERALL SIGNING PROGRESS HEADER BANNER */}
      {isReadOnly && (
        <div style={{
          background: isFullySigned ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)',
          border: `1px solid ${isFullySigned ? '#bbf7d0' : '#fed7aa'}`,
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: isFullySigned ? '#dcfce7' : '#ffedd5',
                color: isFullySigned ? '#16a34a' : '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isFullySigned ? <ShieldCheck size={24} /> : <Clock size={24} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isFullySigned ? '#14532d' : '#9a3412' }}>
                  {isFullySigned ? 'Fully Executed Halal Certification Logsheet' : 'Logsheet Sign-Off Review in Progress'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: isFullySigned ? '#166534' : '#c2410c' }}>
                  {isFullySigned
                    ? 'All committee signatures have been verified and sealed on this decision record.'
                    : `${totalSignedCount} of 4 committee signatories have signed this document.`}
                </p>
              </div>
            </div>

            {/* Header Signing Action if pending */}
            {!isFullySigned && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {currentLogsheet?.status !== 'Waiting For Certificate' && currentLogsheet?.status !== 'Completed' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to redo this logsheet? You will be able to edit all details, and saving will reset all existing signatures.')) {
                        setIsRedoing(true);
                        setActiveTab(1);
                      }
                    }}
                    className="btn btn-outline btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700,
                      color: '#b45309',
                      borderColor: '#f59e0b',
                      background: '#fffbeb',
                      padding: '8px 16px',
                      borderRadius: 8
                    }}
                  >
                    <RotateCcw size={14} /> Redo Logsheet
                  </button>
                )}
                <button
                  onClick={() => openSigningModal()}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '8px 16px', boxShadow: '0 2px 4px rgba(21,128,61,0.2)' }}
                >
                  <PenTool size={14} /> Apply My Signature
                </button>
              </div>
            )}
          </div>

          {/* Quick 4-step signatory status line */}
          <div style={{ borderTop: `1px solid ${isFullySigned ? '#dcfce7' : '#fed7aa'}`, paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: isFullySigned ? '#15803d' : '#9a3412', letterSpacing: '0.05em', marginBottom: 6 }}>
              Committee Signatory Roster (Minimum 3 Signatures to Complete Review)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 4 }}>
              {signatories.map((s, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: s.signature ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  borderRadius: 8,
                  border: `1px solid ${s.signature ? (isFullySigned ? '#86efac' : '#fed7aa') : '#e2e8f0'}`,
                  fontSize: 12
                }}>
                  {s.signature ? (
                    <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                  ) : (
                    <Clock size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, color: s.signature ? '#0f172a' : '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {s.label.split('/')[0].trim()}
                    </div>
                    <div style={{ fontSize: 11, color: s.signature ? '#15803d' : '#94a3b8' }}>
                      {s.signature ? (s.name || 'Signed') : 'Awaiting'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REDO LOGSHEET MODE BANNER */}
      {isRedoing && (
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1.5px solid #f59e0b',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: '#fde68a',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309', flexShrink: 0
            }}>
              <RotateCcw size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#92400e' }}>
                Redo Logsheet Mode Active
              </div>
              <div style={{ fontSize: 12.5, color: '#b45309', marginTop: 2 }}>
                You can now edit any details across all tabs. When you click <strong>Save &amp; Update Logsheet</strong> below, any signed signatures will be removed and the logsheet will return to Waiting for Signature.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setIsRedoing(false)}
            style={{ fontWeight: 700, color: '#64748b', background: '#fff', borderColor: '#cbd5e1' }}
          >
            Cancel Redo
          </button>
        </div>
      )}

      {/* DIRECT LOGSHEET TYPE SELECTION CARDS */}
      {isDirectCreation && !currentLogsheet?._id && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Select Logsheet Category
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Choose which logsheet you want to prepare. The form structure and official committee decision record will automatically adapt to your selection.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            {[
              {
                id: 'normal',
                title: 'Normal Logsheet',
                subtitle: 'Application / Renewal',
                desc: 'Standard 4-part halal certification audit logsheet with technical compliance review.',
                badge: 'Normal Logsheet',
                color: '#059669',
                bg: '#ecfdf5',
                border: '#10b981',
                icon: FileText
              },
              {
                id: 'surveillance',
                title: 'Surveillance Logsheet',
                subtitle: 'Surveillance Letter Record',
                desc: 'Official Surveillance Letter decision record for annual audit review and surveillance monitoring.',
                badge: 'Surveillance Letter',
                color: '#0284c7',
                bg: '#f0f9ff',
                border: '#0284c7',
                icon: CheckSquare
              },
              {
                id: 'extension',
                title: 'Extension Logsheet',
                subtitle: 'Validity & Facility Extension',
                desc: 'Official extension decision record for facility and certificate validity extensions.',
                badge: 'Extension',
                color: '#d97706',
                bg: '#fffbeb',
                border: '#f59e0b',
                icon: Clock
              },
              {
                id: 'product',
                title: 'Product Logsheet',
                subtitle: 'Initial Product / Formulation',
                desc: 'Technical evaluation and Shariah clearance record for new product recipes and formulations.',
                badge: 'Product Clearance',
                color: '#4f46e5',
                bg: '#eef2ff',
                border: '#6366f1',
                icon: Package
              }
            ].map(typeCard => {
              const isSelected = directLogsheetType === typeCard.id;
              const IconComponent = typeCard.icon;
              return (
                <div
                  key={typeCard.id}
                  onClick={() => handleSwitchDirectType(typeCard.id)}
                  style={{
                    background: isSelected ? '#ffffff' : '#f8fafc',
                    border: `2px solid ${isSelected ? typeCard.border : '#e2e8f0'}`,
                    borderRadius: 12,
                    padding: '16px 18px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? `0 8px 20px -4px ${typeCard.color}30` : 'none',
                    transform: isSelected ? 'translateY(-2px)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: isSelected ? typeCard.bg : '#f1f5f9',
                      color: isSelected ? typeCard.color : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <IconComponent size={20} />
                    </div>
                    {isSelected ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: typeCard.color, color: '#fff',
                        fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20
                      }}>
                        <Check size={12} strokeWidth={3} /> Selected
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: '#f1f5f9', color: '#64748b'
                      }}>
                        {typeCard.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: isSelected ? '#0f172a' : '#334155' }}>
                    {typeCard.title}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? typeCard.color : '#64748b', marginTop: 1 }}>
                    {typeCard.subtitle}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                    {typeCard.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DOCUMENT-STYLE PRESENTATION CARD */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', background: '#fff' }}>

        {/* Official Document Header */}
        <div style={{
          background: effectiveLogsheetType === 'surveillance'
            ? 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)'
            : effectiveLogsheetType === 'extension'
              ? 'linear-gradient(135deg, #b45309 0%, #d97706 100%)'
              : effectiveLogsheetType === 'product'
                ? 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)'
                : 'linear-gradient(135deg, #047857 0%, #0d9488 100%)',
          color: 'white',
          padding: '24px 30px',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
                marginBottom: 8,
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <CheckSquare size={12} />
                {effectiveLogsheetType === 'surveillance'
                  ? 'REVIEW AND CERTIFICATION COMMITTEE DECISION RECORD'
                  : effectiveLogsheetType === 'extension'
                    ? 'OFFICIAL EXTENSION DECISION RECORD'
                    : effectiveLogsheetType === 'product'
                      ? 'OFFICIAL PRODUCT EVALUATION RECORD'
                      : 'OFFICIAL CERTIFICATION DECISION RECORD'}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                {effectiveLogsheetType === 'surveillance'
                  ? (isReadOnly ? 'Surveillance Letter' : 'Create Surveillance Letter')
                  : effectiveLogsheetType === 'extension'
                    ? (isReadOnly ? 'Extension Logsheet' : 'Create Extension Logsheet')
                    : effectiveLogsheetType === 'product'
                      ? (isReadOnly ? 'Halal Product Certification Logsheet' : 'Create Product Logsheet')
                      : (isDirectLogsheetRoute ? 'Normal Logsheet' : 'Halal Certification Audit Logsheet')}
              </h2>
              <p style={{ fontSize: 13, color: '#e0f2fe', margin: '4px 0 0' }}>
                {effectiveLogsheetType === 'surveillance'
                  ? 'Halal Food Authority — Surveillance Letter & Annual Monitoring Decision Record'
                  : effectiveLogsheetType === 'extension'
                    ? 'Halal Food Authority — Certificate Validity Extension Decision Record'
                    : effectiveLogsheetType === 'product'
                      ? 'Halal Food Authority — Product Evaluation & Formulation Clearance'
                      : (isDirectLogsheetRoute
                          ? 'Halal Food Authority — Direct Halal Certification Decision Record'
                          : 'Halal Food Authority — Technical & Shariah Committee Decision File')}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Logsheet Reference
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
                #{getLogsheetEffectiveRef(currentLogsheet || form)}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
                {effectiveLogsheetType === 'surveillance' ? 'Document Type:' : (effectiveLogsheetType === 'product' ? 'Evaluation Type:' : 'Audit Type:')}{' '}
                <strong>{effectiveLogsheetType === 'surveillance' ? 'Surveillance Letter' : (form.audit_type || (isInitialProduct ? 'Initial Product Evaluation' : 'New'))}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation if creating or editing */}
        {!isReadOnly && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: effectiveLogsheetType === 'surveillance' ? '#f0f9ff' : '#f8fafc'
          }}>
            {getAvailableTabs().map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const activeColor = effectiveLogsheetType === 'surveillance'
                ? '#0284c7'
                : (effectiveLogsheetType === 'extension'
                    ? '#d97706'
                    : (effectiveLogsheetType === 'product'
                        ? '#4f46e5'
                        : 'var(--primary)'));
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 16px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? activeColor : '#64748b',
                    background: isActive ? '#fff' : 'transparent',
                    border: 'none',
                    borderBottom: isActive ? `2.5px solid ${activeColor}` : '2.5px solid transparent',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  <Icon size={15} /> {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* UNIFIED READ-ONLY DOCUMENT VIEW */}
        {isReadOnly ? (
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Section 1: Company & Site Details */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <Building size={16} style={{ color: '#047857' }} />
                1. Site &amp; Company Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Site Name</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>
                    {form.site_name || application?.site_id?.name || application?.site_name || 'Main Manufacturing Site'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company Name</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>{form.company_name || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Person</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>{form.contact_person || '—'}</div>
                  <div style={{ fontSize: 12, color: '#047857', fontWeight: 500, marginTop: 1 }}>{form.contact_email || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company Registered Address</div>
                  <div style={{ fontSize: 13, color: '#1e293b', marginTop: 3, fontWeight: 500 }}>{form.company_address || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Manufacturing Site Address <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8', textTransform: 'none' }}>(Optional)</span></div>
                  <div style={{ fontSize: 13, color: '#1e293b', marginTop: 3, fontWeight: 500 }}>{form.manufacturing_address || '— (Optional)'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nature of Business</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.nature_of_business || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product Category</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.product_category || '—'}</div>
                </div>
              </div>
            </div>

            {/* Section 2: Certification Validity & Cycle Dates */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <Calendar size={16} style={{ color: '#047857' }} />
                2. Certification Validity &amp; Cycle Dates
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Certificate Issue Date</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#047857', marginTop: 3 }}>{form.issue_date ? new Date(form.issue_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Certificate Expiry Date</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginTop: 3 }}>{form.expiry_date ? new Date(form.expiry_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Cycle Start Date</div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 3 }}>{form.current_cycle_start ? new Date(form.current_cycle_start).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Original Cycle Start Date</div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 3 }}>{form.original_cycle_start ? new Date(form.original_cycle_start).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                {(form.next_surveillance_due_date || currentLogsheet?.next_surveillance_due_date || application?.next_surveillance_due_date) && (
                  <div style={{ background: '#f0f9ff', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #bae6fd' }}>
                    <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Next Surveillance Due Date</div>
                    <div style={{ fontSize: 13, color: '#0284c7', fontWeight: 800, marginTop: 3 }}>
                      {new Date(form.next_surveillance_due_date || currentLogsheet?.next_surveillance_due_date || application?.next_surveillance_due_date).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Audit & Technical Compliance Review */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <FileText size={16} style={{ color: '#047857' }} />
                3. Audit &amp; Technical Compliance Review
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audit Type</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0d9488', marginTop: 3 }}>{form.audit_type || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audit Date</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.audit_date ? new Date(form.audit_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{isAddon ? 'FT(s) Assigned' : 'Auditor(s) Assigned'}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.auditors || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Non-Conformances (NCS Close)</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: form.ncs_close?.toLowerCase().includes('closed') || form.ncs_close?.toLowerCase().includes('no') ? '#15803d' : '#b45309', marginTop: 3 }}>
                    {form.ncs_close || (isAddon ? 'N/A - Product Evaluation' : 'No NCs Flagged')}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Documentation Review Status</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 3 }}>{form.docs_satisfactory || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pork Free Policy Statement</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 3 }}>{form.pork_free_statement || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reviewed By (Role / Dept)</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.reviewed_by || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reviewer Name</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.reviewer_name || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date of Review</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.review_date ? new Date(form.review_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>
              </div>
            </div>

            {/* Section 4: Certificate Status Checks */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <Award size={16} style={{ color: '#047857' }} />
                4. Scheme &amp; Certificate Status Checks
              </h4>
              <div style={{ background: '#f0fdfa', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #99f6e4', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#0d9488', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Suggested Certificate Scheme</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {form.certificate_type || form.certificate_standard || currentLogsheet?.certificate_type || currentLogsheet?.certificate_standard || application?.suggested_certificate_type || application?.certificate_type || '—'}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', background: '#ccfbf1', padding: '3px 9px', borderRadius: 20 }}>
                  Recommended Scheme for Issuer
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
                {[
                  { label: 'Annual Certificate', val: form.annual_certificate },
                  { label: 'Batch Certificate', val: form.batch_certificate },
                  { label: 'Only Addition of New Products', val: form.new_products_only },
                  { label: 'Addition of New Site / Line', val: form.new_site_line },
                  { label: 'New Client Application', val: form.new_client },
                  { label: 'Certification Agreement Signed', val: form.agreement_signed },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{item.label}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 12,
                      background: item.val === 'Yes' ? '#dcfce7' : '#f1f5f9',
                      color: item.val === 'Yes' ? '#15803d' : '#64748b',
                      border: `1px solid ${item.val === 'Yes' ? '#bbf7d0' : '#e2e8f0'}`
                    }}>
                      {item.val || 'No'}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Status Effective Date:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{form.status_date ? new Date(form.status_date).toLocaleDateString('en-GB') : '—'}</span>
              </div>
            </div>

            {/* Section 5: Committee Comments & Recommendation Notes */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <MessageSquare size={16} style={{ color: '#047857' }} />
                5. Committee Comments &amp; Recommendation Notes
              </h4>
              <div style={{
                background: '#f8fafc',
                padding: '16px 20px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 13.5,
                color: form.comment ? '#1e293b' : '#64748b',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                fontStyle: form.comment ? 'normal' : 'italic'
              }}>
                {form.comment || 'No additional committee notes or conditions recorded.'}
              </div>
            </div>

            {/* Section 6: Attached Audit Reports OR Filled Product Approval Request Forms */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <FileText size={16} style={{ color: '#047857' }} />
                {isRemoveProduct
                  ? '6. Products Requested for Removal'
                  : isChangeIngredients
                  ? '6. Products with Formulation / Ingredient Changes'
                  : isProductLogsheet
                  ? '6. Filled Product Approval Request Forms & Declarations'
                  : '6. Attached Audit Reports'}
              </h4>

              {isProductLogsheet ? (
                <div>
                  <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 14 }}>
                    {isRemoveProduct
                      ? 'Products requested to be removed from the active Halal certification upon Committee sign-off:'
                      : isChangeIngredients
                      ? 'Products undergoing formulation or ingredient changes for Committee technical verification:'
                      : 'Official client-submitted 3-page Halal Certification Product Approval Request Forms with full ingredient declarations, porcine segregation checks, and technical sign-offs:'}
                  </div>

                  <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                    {(isInitialProduct ? (application?.product ? [application.product] : []) : (application?.products || currentLogsheet?.products_list || form?.products_list || [])).map((p, pIdx) => {
                      const resp = isInitialProduct
                        ? (application?.product_approval_form?.product_response || {})
                        : (application?.product_approval_form?.product_responses || []).find(r => r.product_index === pIdx);
                      const isSaved = resp?.is_saved || Boolean(resp?.response_url) || (resp?.form_data && Object.keys(resp.form_data).length > 0);
                      const formData = resp?.form_data || {};
                      const displayName = isInitialProduct ? (initialProductName || p.name) : p.name;
                      const displayCode = isInitialProduct ? (initialProductCode !== undefined ? initialProductCode : p.code) : p.code;

                      const isThisRemove = isRemoveProduct || String(p.type || '').toLowerCase().includes('remove');
                      const isThisChange = isChangeIngredients || String(p.type || '').toLowerCase().includes('change');

                      if (isThisRemove || isThisChange) {
                        return (
                          <div
                            key={pIdx}
                            style={{
                              background: isRemoveProduct ? '#fef2f2' : '#f5f3ff',
                              border: `1.5px solid ${isRemoveProduct ? '#fecaca' : '#ddd6fe'}`,
                              borderRadius: 10,
                              padding: '14px 18px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 12
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: 8,
                                background: isRemoveProduct ? '#fee2e2' : '#ede9fe',
                                color: isRemoveProduct ? '#dc2626' : '#7c3aed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: 13
                              }}>
                                #{pIdx + 1}
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                                  {displayName} {displayCode ? `(${displayCode})` : ''}
                                </div>
                                <div style={{ fontSize: 12, color: isRemoveProduct ? '#dc2626' : '#6d28d9', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                  {isRemoveProduct ? (
                                    <>
                                      <Trash2 size={13} />
                                      <span>Action: Remove from Halal Certificate</span>
                                    </>
                                  ) : (
                                    <>
                                      <RotateCcw size={13} />
                                      <span>Action: Ingredient / Formulation Modification</span>
                                    </>
                                  )}
                                </div>
                                {p.notes && (
                                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                                    <strong>Notes:</strong> {p.notes}
                                  </div>
                                )}
                                {p.ingredient_changes && (
                                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                                    <strong>Changes:</strong> {p.ingredient_changes}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                              <span className={`badge ${isRemoveProduct ? 'badge-red' : 'badge-purple'}`} style={{ fontSize: 11, fontWeight: 700 }}>
                                {isRemoveProduct ? 'To Be Removed' : 'Ingredient Changes'}
                              </span>
                              {p.file_url && (
                                <a
                                  href={getPdfUrl(p.file_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-outline btn-sm"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                                >
                                  <Download size={13} /> Supporting Doc
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={pIdx}
                          style={{
                            background: '#f8fafc',
                            border: `1.5px solid ${isSaved ? '#bbf7d0' : '#e2e8f0'}`,
                            borderRadius: 10,
                            padding: '14px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: 8,
                              background: isSaved ? '#dcfce7' : '#f1f5f9',
                              color: isSaved ? '#166534' : '#64748b',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: 13
                            }}>
                              #{pIdx + 1}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                                {displayName} {displayCode ? `(${displayCode})` : ''}
                              </div>
                              <div style={{ fontSize: 11.5, color: isSaved ? '#15803d' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                {isSaved ? (
                                  <>
                                    <CheckCircle2 size={13} style={{ color: '#16a34a' }} />
                                    <span>Form Completed &amp; Signed by Client ({formData.print_name || 'Signatory'})</span>
                                  </>
                                ) : (
                                  <span>Awaiting Client Form Completion</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{
                                background: '#164e63',
                                borderColor: '#164e63',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                fontWeight: 700
                              }}
                              onClick={() => {
                                setViewProductModal({
                                  isOpen: true,
                                  formData: formData && Object.keys(formData).length > 0 ? formData : {
                                    product_name: displayName,
                                    product_code: displayCode,
                                    company_name_address: form.company_name
                                  },
                                  product: { ...p, name: displayName, code: displayCode },
                                  company: application?.client_id
                                });
                              }}
                            >
                              <Eye size={14} /> View Filled Product Form
                            </button>

                            {resp?.response_url && (
                              <a
                                href={getPdfUrl(resp.response_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                              >
                                <Download size={13} /> Attached PDF
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {((Array.isArray(form.document_urls) && form.document_urls.length > 0) || form.document_url) && (
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Additional Supporting Documents:</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {Array.isArray(form.document_urls) && form.document_urls.length > 0 ? (
                          form.document_urls.map((doc, idx) => (
                            <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '5px 10px' }}>
                              <a
                                href={getPdfUrl(doc.url)}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, textDecoration: 'none', color: '#0369a1', fontWeight: 600 }}
                                onClick={e => {
                                  e.preventDefault();
                                  const fullUrl = getPdfUrl(doc.url);
                                  if (fullUrl && fullUrl !== '#') window.open(fullUrl, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                <Download size={13} /> {doc.name || `Document_${idx + 1}`}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveDocument(idx)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                                title="Remove document"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))
                        ) : form.document_url ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '5px 10px' }}>
                            <a
                              href={getPdfUrl(form.document_url)}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, textDecoration: 'none', color: '#0369a1', fontWeight: 600 }}
                              onClick={e => {
                                e.preventDefault();
                                const fullUrl = getPdfUrl(form.document_url);
                                if (fullUrl && fullUrl !== '#') window.open(fullUrl, '_blank', 'noopener,noreferrer');
                              }}
                            >
                              <Download size={13} /> Attached Document
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveDocument(0)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                              title="Remove document"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Upload additional document in read-only mode */}
                  <div style={{ marginTop: 14, paddingTop: 10 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: uploadingReport ? '#94a3b8' : '#0284c7', fontWeight: 700, cursor: uploadingReport ? 'not-allowed' : 'pointer', background: '#f0f9ff', border: '1px dashed #7dd3fc', padding: '7px 14px', borderRadius: 8 }}>
                      <UploadCloud size={14} /> {uploadingReport ? 'Uploading...' : '+ Attach Additional Product Document'}
                      <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                    {Array.isArray(form.document_urls) && form.document_urls.length > 0 ? (
                      form.document_urls.map((doc, idx) => (
                        <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px' }}>
                          <a
                            key={idx}
                            href={getPdfUrl(doc.url)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '2px 4px', fontWeight: 600, fontSize: 13, textDecoration: 'none', color: '#047857' }}
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              const fullUrl = getPdfUrl(doc.url);
                              if (fullUrl && fullUrl !== '#') {
                                window.open(fullUrl, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <Download size={14} style={{ color: '#047857' }} /> {doc.name || `Audit Report Document ${idx + 1}`}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                            title="Remove document"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))
                    ) : form.document_url ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px' }}>
                        <a
                          href={getPdfUrl(form.document_url)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '2px 4px', fontWeight: 600, fontSize: 13, textDecoration: 'none', color: '#047857' }}
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            const fullUrl = getPdfUrl(form.document_url);
                            if (fullUrl && fullUrl !== '#') {
                              window.open(fullUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          <Download size={14} style={{ color: '#047857' }} /> Audit Report Document
                        </a>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                        No audit report files attached.
                      </div>
                    )}
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: uploadingReport ? '#94a3b8' : 'var(--primary)', fontWeight: 700, cursor: uploadingReport ? 'not-allowed' : 'pointer', background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '7px 14px', borderRadius: 8 }}>
                    <UploadCloud size={14} /> {uploadingReport ? 'Uploading...' : '+ Upload Additional Audit Report'}
                    <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
                </div>
              )}
            </div>

            {/* SECTION F: FORMAL SIGNATURE MATRIX BLOCK */}
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 24, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PenTool size={18} style={{ color: 'var(--primary)' }} />
                    Committee Signatures
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Official digital signatures applied by authorized Shariah &amp; Management signatories.
                  </p>
                </div>
                {totalSignedCount < 4 && hasSignaturePrivilege && (
                  <button
                    onClick={() => openSigningModal()}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                  >
                    <PenTool size={14} /> Add Signature
                  </button>
                )}
              </div>

              {/* 4-Role Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {signatories.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: `1.5px solid ${s.signature ? '#86efac' : '#e2e8f0'}`,
                      borderRadius: 10,
                      padding: 16,
                      background: s.signature ? '#f0fdf4' : '#fafafa',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 170
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: s.signature ? '#166534' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {s.label}
                        </span>
                        {s.signature ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 10 }}>
                            <Check size={12} /> Signed
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                            Pending
                          </span>
                        )}
                      </div>

                      {s.signature ? (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 50, marginBottom: 8 }}>
                            <img
                              src={getPdfUrl(s.signature)}
                              alt={`${s.label} Signature`}
                              style={{ maxHeight: 40, maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{s.name || 'Authorised Signatory'}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {s.date ? new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed #cbd5e1', borderRadius: 6, margin: '8px 0', background: '#fff' }}>
                          <PenTool size={18} style={{ color: '#94a3b8', marginBottom: 4 }} />
                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Awaiting Signature</span>
                        </div>
                      )}
                    </div>

                    {!s.signature && (
                      <div style={{ marginTop: 8 }}>
                        {!hasSignaturePrivilege ? (
                          <button
                            type="button"
                            disabled
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: 11, padding: '6px 10px', opacity: 0.5, cursor: 'not-allowed', background: '#f8fafc', color: '#64748b', borderColor: '#cbd5e1' }}
                            title="Signature Privilege required to sign logsheets"
                          >
                            <Lock size={12} style={{ marginRight: 4 }} /> Privilege Required
                          </button>
                        ) : isMuftiUser && (s.roleKey === 'Ceo' || s.roleKey === 'Manager') ? (
                          <button
                            type="button"
                            disabled
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: 11, padding: '6px 10px', opacity: 0.5, cursor: 'not-allowed', background: '#fef2f2', color: '#991b1b', borderColor: '#fca5a5' }}
                            title="Mufti signatories cannot sign for CEO or Technical Manager roles"
                          >
                            Restricted (Mufti)
                          </button>
                        ) : userSignature ? (
                          <button
                            type="button"
                            onClick={() => openSigningModal(s.roleKey)}
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--primary)', borderColor: 'var(--primary)' }}
                          >
                            <PenTool size={13} /> Sign as {s.roleKey}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: 11, padding: '6px 10px', opacity: 0.6 }}
                            title="Upload signature in Signatures page first"
                          >
                            Sign as {s.roleKey}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Inline Certificate Type Selection — shown after signatures, before Application Successful */}
              {(isRedoing || (currentLogsheet?.status !== 'Waiting For Certificate' && currentLogsheet?.status !== 'Signed' && currentLogsheet?.status !== 'Completed')) && !isProductLogsheet && (
                <div
                  style={{
                    marginTop: 20,
                    padding: '16px 18px',
                    background: form.certificate_type ? '#f0fdfa' : '#fafafa',
                    borderRadius: 10,
                    border: `1.5px solid ${form.certificate_type ? '#0e7490' : '#e2e8f0'}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Award size={15} style={{ color: '#0e7490' }} />
                    Recommended Certificate Type / Scheme
                    <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>* Required</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                    Select the halal certification scheme to recommend. This suggestion will be shown to whoever issues the certificate.
                  </div>
                  <select
                    required
                    className="form-control"
                    value={form.certificate_type || form.suggested_certificate_type || form.certificate_standard || ''}
                    onChange={e => setForm({ ...form, certificate_type: e.target.value, certificate_standard: e.target.value, suggested_certificate_type: e.target.value })}
                    style={{ fontWeight: 700, fontSize: 13.5, maxWidth: 340, background: form.certificate_type ? '#f0fdfa' : '#fff', borderColor: form.certificate_type ? '#0e7490' : '#cbd5e1', color: '#0f172a' }}
                  >
                    <option value="" disabled>-- Select Certificate Type / Scheme (Required) --</option>
                    <option value="Surveillance Letter">Surveillance Letter (Official Surveillance Confirmation)</option>
                    <option value="HFA SCHEME NON MEAT">HFA SCHEME NON MEAT (Food & General Manufacturing)</option>
                    <option value="HFA SCHEME MEAT">HFA SCHEME MEAT (Meat & Poultry Processing)</option>
                    <option value="GSO NON MEAT">GSO NON MEAT (UAE / GCC Scheme - Non-Meat Food)</option>
                    <option value="GSO MEAT">GSO MEAT (UAE / GCC Scheme - Meat Processing)</option>
                    <option value="COSMETICS">COSMETICS (Personal Care & Cosmetics Scheme)</option>
                    <option value="SMIIC">SMIIC (OIC / SMIIC Halal Scheme)</option>
                  </select>
                  {form.certificate_type && (
                    <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0e7490', fontWeight: 700 }}>
                      <CheckCircle2 size={14} />
                      Scheme selected: <strong>{form.certificate_type}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Mark as Done Action Block */}
              {currentLogsheet?.status !== 'Waiting For Certificate' && currentLogsheet?.status !== 'Signed' && currentLogsheet?.status !== 'Completed' && (() => {
                const thresholdMet = is30DaysExtension ? totalSignedCount >= 1 : totalSignedCount >= 3;
                return (
                <div
                  style={{
                    marginTop: 24,
                    padding: 16,
                    background: thresholdMet ? '#f0fdf4' : '#fffbeb',
                    borderRadius: 10,
                    border: `1.5px solid ${thresholdMet ? '#bbf7d0' : '#fde68a'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: thresholdMet ? '#14532d' : '#92400e' }}>
                      {thresholdMet ? 'Committee Review & Signatures Ready' : 'Signature Threshold Pending'}
                    </div>
                    <div style={{ fontSize: 12, color: thresholdMet ? '#166534' : '#b45309', marginTop: 2 }}>
                      {thresholdMet
                        ? (is30DaysExtension
                            ? '1 of 1 CEO / Authorized Officer signature collected. Click "Application Successful" to complete sign-off.'
                            : isRemoveProduct
                            ? `${totalSignedCount} of 4 committee signatures collected. Click "Remove Product" to finalize removal and ready the certificate.`
                            : isChangeIngredients
                            ? `${totalSignedCount} of 4 committee signatures collected. Click "Ingredients Accepted" to complete review.`
                            : ((isProductLogsheet || currentLogsheet?.source_type === 'initial_product_application' || currentLogsheet?.source_type === 'addon_application' || !!currentLogsheet?.addon_application_id || !!currentLogsheet?.initial_product_application_id || form.audit_type?.toLowerCase().includes('product') || form.audit_type?.toLowerCase().includes('add-on') || form.audit_type?.toLowerCase().includes('addon'))
                                ? `${totalSignedCount} of 4 committee signatures collected. Click "Approve Product" to complete review and approve product for client.`
                                : `${totalSignedCount} of 4 committee signatures collected. Click "Application Successful" to complete committee sign-off and advance application.`))
                        : (is30DaysExtension
                            ? 'Requires 1 Authorized Officer / CEO signature for 30-Day Extension.'
                            : `Requires at least 3 of 4 signatures — currently ${totalSignedCount}/4 signed.`)}
                    </div>
                  </div>

                  {isChangeIngredients ? (
                    <button
                      onClick={() => {
                        if (!canManageProducts) {
                          toast.error('Access denied. Only Food Tech, Food Tech Manager, or Admin can accept modified ingredients.');
                          return;
                        }
                        handleAcceptIngredients();
                      }}
                      disabled={isFinalizing || !thresholdMet || !canManageProducts}
                      title={!canManageProducts ? 'Only Food Tech, Food Tech Manager, or Admin can accept modified ingredients' : ''}
                      className="btn btn-primary"
                      style={{
                        background: (thresholdMet && canManageProducts) ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#cbd5e1',
                        borderColor: (thresholdMet && canManageProducts) ? '#7c3aed' : '#cbd5e1',
                        color: (thresholdMet && canManageProducts) ? '#fff' : '#64748b',
                        fontWeight: 800,
                        padding: '10px 22px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 10,
                        boxShadow: (thresholdMet && canManageProducts) ? '0 4px 12px rgba(124, 58, 237, 0.25)' : 'none',
                        cursor: (thresholdMet && canManageProducts) ? 'pointer' : 'not-allowed',
                        opacity: !canManageProducts ? 0.6 : 1
                      }}
                    >
                      {isFinalizing ? <span className="spinner-white" /> : <><CheckCircle2 size={16} strokeWidth={2.5} /> Ingredients Accepted</>}
                    </button>
                  ) : isRemoveProduct ? (
                    <button
                      onClick={() => {
                        if (!canManageProducts) {
                          toast.error('Access denied. Only Food Tech, Food Tech Manager, or Admin can remove products.');
                          return;
                        }
                        openApproveProductsModal();
                      }}
                      disabled={isFinalizing || !thresholdMet || !canManageProducts}
                      title={!canManageProducts ? 'Only Food Tech, Food Tech Manager, or Admin can remove products' : ''}
                      className="btn btn-primary"
                      style={{
                        background: (thresholdMet && canManageProducts) ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#cbd5e1',
                        borderColor: (thresholdMet && canManageProducts) ? '#dc2626' : '#cbd5e1',
                        color: (thresholdMet && canManageProducts) ? '#fff' : '#64748b',
                        fontWeight: 800,
                        padding: '10px 22px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 10,
                        boxShadow: (thresholdMet && canManageProducts) ? '0 4px 12px rgba(220, 38, 38, 0.25)' : 'none',
                        cursor: (thresholdMet && canManageProducts) ? 'pointer' : 'not-allowed',
                        opacity: !canManageProducts ? 0.6 : 1
                      }}
                    >
                      {isFinalizing ? <span className="spinner-white" /> : <><Trash2 size={16} strokeWidth={2.5} /> Remove Product</>}
                    </button>
                  ) : (isProductLogsheet || currentLogsheet?.source_type === 'initial_product_application' || currentLogsheet?.source_type === 'addon_application' || !!currentLogsheet?.addon_application_id || !!currentLogsheet?.initial_product_application_id || form.audit_type?.toLowerCase().includes('product') || form.audit_type?.toLowerCase().includes('add-on') || form.audit_type?.toLowerCase().includes('addon')) ? (
                    <button
                      onClick={() => {
                        if (isAddon && !canManageProducts) {
                          toast.error('Access denied. Only Food Tech, Food Tech Manager, or Admin can approve add-on products.');
                          return;
                        }
                        openApproveProductsModal();
                      }}
                      disabled={isFinalizing || !thresholdMet || (isAddon && !canManageProducts)}
                      title={(isAddon && !canManageProducts) ? 'Only Food Tech, Food Tech Manager, or Admin can approve add-on products' : ''}
                      className="btn btn-primary"
                      style={{
                        background: (thresholdMet && (!isAddon || canManageProducts)) ? 'linear-gradient(135deg, #15803d, #16a34a)' : '#cbd5e1',
                        borderColor: (thresholdMet && (!isAddon || canManageProducts)) ? '#15803d' : '#cbd5e1',
                        color: (thresholdMet && (!isAddon || canManageProducts)) ? '#fff' : '#64748b',
                        fontWeight: 800,
                        padding: '10px 22px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 10,
                        boxShadow: (thresholdMet && (!isAddon || canManageProducts)) ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
                        cursor: (thresholdMet && (!isAddon || canManageProducts)) ? 'pointer' : 'not-allowed',
                        opacity: (isAddon && !canManageProducts) ? 0.6 : 1
                      }}
                    >
                      {isFinalizing ? <span className="spinner-white" /> : <><CheckCircle2 size={16} strokeWidth={2.5} /> {isInitialProduct ? 'Approve Initial Product' : 'Approve Product'}</>}
                    </button>
                  ) : (
                    <button
                      onClick={handleFinalizeApplicationSuccessful}
                      disabled={isFinalizing || !thresholdMet}
                      className="btn btn-primary"
                      style={{
                        background: thresholdMet ? 'linear-gradient(135deg, #15803d, #16a34a)' : '#cbd5e1',
                        borderColor: thresholdMet ? '#15803d' : '#cbd5e1',
                        color: thresholdMet ? '#fff' : '#64748b',
                        fontWeight: 800,
                        padding: '10px 22px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 10,
                        boxShadow: thresholdMet ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
                        cursor: thresholdMet ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {isFinalizing ? <span className="spinner-white" /> : <><CheckCircle2 size={16} strokeWidth={2.5} /> Application Successful</>}
                    </button>
                  )}
                </div>
              );
              })()}
            </div>
          </div>
        ) : (
          /* FORM VIEW FOR CREATING NEW LOGSHEET */
          <form onSubmit={handleSubmit} noValidate style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* NC Blocking Warning Banner */}
            {hasOpenNc && !currentLogsheet?._id && !isProductLogsheet && (
              <div style={{
                background: '#fef2f2',
                border: '1.5px solid #f87171',
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: '0 2px 8px rgba(220,38,38,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: '#dc2626', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: '#991b1b' }}>
                      Non-Conformance (NC) Resolution Required Before LogSheet
                    </div>
                    <div style={{ fontSize: 13, color: '#b91c1c', marginTop: 2, lineHeight: 1.4 }}>
                      This facility has {openNcCount > 0 ? `${openNcCount} active Non-Conformance(s)` : 'active Non-Conformances'} that must be completed and closed before an official LogSheet can be generated.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/applications/${appId}/processing`)}
                  style={{
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '9px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap'
                  }}
                >
                  Review &amp; Close NCs <ArrowRight size={14} />
                </button>
              </div>
            )}

            {activeTab === 1 && (
              isDirectCreation && directLogsheetType === 'surveillance' ? (
                /* SURVEILLANCE LOGSHEET TAB 1 (matching official layout in user screenshot) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Top Context Row with Searchable Company & Site Picker */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                      {/* Searchable Company Name */}
                      <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#334155', margin: 0 }}>Company:</label>
                          {selectedDirectClientId && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDirectClientId('');
                                setCompanySearchQuery('');
                                setAvailableCompanySites([]);
                                setForm(prev => ({ ...prev, company_name: '', client_id: '', site_name: '', manufacturing_address: '' }));
                              }}
                              style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="form-control"
                            value={companySearchQuery || form.company_name || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setCompanySearchQuery(val);
                              setForm(prev => ({ ...prev, company_name: val }));
                              setShowCompanySuggestions(true);
                            }}
                            onFocus={() => setShowCompanySuggestions(true)}
                            placeholder="Type to search company..."
                            style={{ paddingLeft: 30, fontSize: 13, fontWeight: 600, background: '#fff' }}
                          />
                          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        </div>

                        {showCompanySuggestions && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
                            background: '#ffffff', borderRadius: 8, border: '1.5px solid #0284c7',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', maxHeight: 220, overflowY: 'auto', marginTop: 4
                          }}>
                            {filteredClients.length > 0 ? (
                              filteredClients.map(client => (
                                <div
                                  key={client._id}
                                  onMouseDown={e => {
                                    e.preventDefault();
                                    handleDirectClientSelect(client._id);
                                    setShowCompanySuggestions(false);
                                  }}
                                  style={{
                                    padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                    background: selectedDirectClientId === client._id ? '#f0f9ff' : '#fff'
                                  }}
                                >
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{client.company_name || client.full_name}</div>
                                  <div style={{ fontSize: 11.5, color: '#64748b' }}>{client.email || 'No email'}</div>
                                </div>
                              ))
                            ) : (
                              <div style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>No matching registered clients found.</div>
                            )}
                            <div onMouseDown={e => { e.preventDefault(); setShowCompanySuggestions(false); }} style={{ padding: '4px 10px', background: '#f8fafc', fontSize: 11, textAlign: 'right', cursor: 'pointer', color: '#64748b' }}>Close ✕</div>
                          </div>
                        )}
                      </div>

                      {/* Site Selection */}
                      <div>
                        <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          Site Name: {availableCompanySites.length > 0 && <span style={{ color: '#0284c7' }}>({availableCompanySites.length})</span>}
                        </label>
                        {availableCompanySites.length > 0 ? (
                          <select
                            className="form-control"
                            value={form.site_id || ''}
                            onChange={e => handleDirectSiteSelect(e.target.value)}
                            style={{ fontSize: 13, fontWeight: 600, background: '#fff' }}
                          >
                            <option value="">-- Choose Registered Site --</option>
                            {availableCompanySites.map(s => {
                              const sAddr = resolveSiteDisplayAddress(s, null, form.company_address);
                              return (
                                <option key={s._id} value={s._id}>
                                  {s.name || s.site_name || 'Main Site'}{sAddr ? ` (${sAddr})` : ''}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-control"
                            value={form.site_name || ''}
                            onChange={e => setForm({ ...form, site_name: e.target.value })}
                            placeholder="Site Name"
                            style={{ fontSize: 13, fontWeight: 600 }}
                          />
                        )}
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Application :</label>
                        <select
                          className="form-control"
                          value={form.audit_type || 'Surveillance'}
                          onChange={e => setForm({ ...form, audit_type: e.target.value })}
                          style={{ fontSize: 13, fontWeight: 600 }}
                        >
                          <option value="Surveillance">Surveillance</option>
                          <option value="Application">Application</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Certificate Type :</label>
                        <select
                          className="form-control"
                          value="Surveillance Letter"
                          disabled
                          style={{ fontSize: 13, fontWeight: 700, background: '#f0fdf4', color: '#166534', borderColor: '#86efac' }}
                        >
                          <option value="Surveillance Letter">Surveillance Letter</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Application No:</label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.application_no || ''}
                          onChange={e => setForm({ ...form, application_no: e.target.value })}
                          placeholder="e.g. APP-SURV-001"
                          style={{ fontSize: 13, fontWeight: 600 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Title */}
                  <div style={{ textAlign: 'center', margin: '10px 0 6px' }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      1. Company Details
                    </h3>
                  </div>

                  {/* 8 Field Form Layout (Matching Screenshot) */}
                  <div style={{ maxWidth: 880, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: 0 }}>Company Name: <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        required
                        type="text"
                        className="form-control"
                        value={form.company_name || ''}
                        onChange={e => setForm({ ...form, company_name: e.target.value })}
                        placeholder="Registered Company Name"
                        style={{ fontWeight: 600 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: 0 }}>Company Address: <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        required
                        type="text"
                        className="form-control"
                        value={form.company_address || ''}
                        onChange={e => setForm({ ...form, company_address: e.target.value })}
                        placeholder="Registered company address"
                        style={{ fontWeight: 600 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: 0 }}>Manufacturing Address:</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.manufacturing_address || ''}
                        onChange={e => setForm({ ...form, manufacturing_address: e.target.value })}
                        placeholder="Manufacturing site address"
                        style={{ fontWeight: 600 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: 0 }}>Contact Person: <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        required
                        type="text"
                        className="form-control"
                        value={form.contact_person || ''}
                        onChange={e => setForm({ ...form, contact_person: e.target.value })}
                        placeholder="Full Name of Contact"
                        style={{ fontWeight: 600 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: 0 }}>Contact E-mail: <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        required
                        type="email"
                        className="form-control"
                        value={form.contact_email || ''}
                        onChange={e => setForm({ ...form, contact_email: e.target.value })}
                        placeholder="contact@company.com"
                        style={{ fontWeight: 600 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: 0 }}>Issue date of certificate: <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        required
                        type="date"
                        className="form-control"
                        value={form.issue_date?.split('T')[0] || ''}
                        onChange={e => setForm({ ...form, issue_date: e.target.value })}
                        style={{ fontWeight: 600 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: 0 }}>Expiry date of certificate: <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        required
                        type="date"
                        className="form-control"
                        value={form.expiry_date?.split('T')[0] || ''}
                        onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                        style={{ fontWeight: 600 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: 0 }}>Audit Date: <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        required
                        type="date"
                        className="form-control"
                        value={form.audit_date?.split('T')[0] || ''}
                        onChange={e => setForm({ ...form, audit_date: e.target.value })}
                        style={{ fontWeight: 600 }}
                      />
                    </div>

                    {/* File Upload with SELECT FILES Button (Purple theme from screenshot) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', alignItems: 'flex-start', gap: 16, marginTop: 4 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '8px 0 0' }}>File:</label>
                      <div>
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                          color: '#ffffff',
                          padding: '9px 20px',
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: 12.5,
                          cursor: uploadingReport ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                          letterSpacing: '0.04em'
                        }}>
                          <UploadCloud size={16} />
                          {uploadingReport ? 'UPLOADING...' : 'SELECT FILES'}
                          <input
                            type="file"
                            multiple
                            disabled={uploadingReport}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                          />
                        </label>

                        {Array.isArray(form.document_urls) && form.document_urls.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                            {form.document_urls.map((doc, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: 8,
                                  padding: '8px 14px',
                                  maxWidth: 480
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                  <CheckCircle2 size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
                                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {doc.name || `Surveillance_Document_${idx + 1}`}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDocument(idx)}
                                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2 }}
                                  title="Remove file"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                            Attach surveillance audit report, checklists, or surveillance letter drafts (PDF, DOCX).
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setActiveTab(2)}
                        style={{
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          borderColor: '#0284c7',
                          color: '#fff',
                          fontWeight: 700,
                          padding: '10px 22px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          borderRadius: 8
                        }}
                      >
                        Continue to Comment / Reason <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : isDirectCreation && directLogsheetType === 'extension' ? (
                /* EXTENSION LOGSHEET TAB 1 (Matches AdminExtensionLogsheet from Application) */
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Searchable Direct Company & Site Picker */}
                  <div style={{
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '1.5px solid #fde68a',
                    borderRadius: 12,
                    padding: '16px 20px',
                    gridColumn: '1 / -1',
                    marginBottom: 4,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={17} style={{ color: '#b45309' }} />
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: '#92400e' }}>
                          Extension Logsheet · Search Company &amp; Choose Site
                        </span>
                        <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 12, fontWeight: 700, border: '1px solid #fde68a' }}>
                          Direct Generation
                        </span>
                      </div>
                      {selectedDirectClientId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDirectClientId('');
                            setCompanySearchQuery('');
                            setAvailableCompanySites([]);
                            setForm(prev => ({
                              ...prev,
                              client_id: '',
                              company_name: '',
                              site_name: '',
                              manufacturing_address: '',
                              company_address: '',
                              contact_person: '',
                              contact_email: ''
                            }));
                          }}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <X size={13} /> Clear Selection
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: availableCompanySites.length > 0 ? '1.2fr 1fr' : '1fr', gap: 16 }}>
                      {/* Searchable Company Input */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#92400e', display: 'block', marginBottom: 4 }}>
                          Type Company Name to Search:
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="form-control"
                            value={companySearchQuery || form.company_name || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setCompanySearchQuery(val);
                              setForm(prev => ({ ...prev, company_name: val }));
                              setShowCompanySuggestions(true);
                            }}
                            onFocus={() => setShowCompanySuggestions(true)}
                            placeholder="Start typing company name to search..."
                            style={{
                              paddingLeft: 34,
                              fontWeight: 700,
                              fontSize: 13.5,
                              background: '#fff',
                              borderColor: selectedDirectClientId ? '#f59e0b' : '#cbd5e1'
                            }}
                          />
                          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                          {companySearchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setCompanySearchQuery('');
                                setForm(prev => ({ ...prev, company_name: '' }));
                                setSelectedDirectClientId('');
                                setAvailableCompanySites([]);
                              }}
                              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Floating Suggestions */}
                        {showCompanySuggestions && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
                            background: '#ffffff', borderRadius: 8, border: '1.5px solid #f59e0b',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', maxHeight: 240, overflowY: 'auto', marginTop: 4
                          }}>
                            {filteredClients.length > 0 ? (
                              filteredClients.map(client => {
                                const clientSitesCount = directSites.filter(s => String(s.client_id?._id || s.client_id) === String(client._id)).length;
                                const isSelected = selectedDirectClientId === client._id;
                                return (
                                  <div
                                    key={client._id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleDirectClientSelect(client._id);
                                      setShowCompanySuggestions(false);
                                    }}
                                    style={{
                                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                      background: isSelected ? '#fffbeb' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                                    onMouseLeave={e => e.currentTarget.style.background = isSelected ? '#fffbeb' : '#ffffff'}
                                  >
                                    <div>
                                      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>{client.company_name || client.full_name}</div>
                                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                        {client.full_name && client.full_name !== client.company_name ? `${client.full_name} • ` : ''}{client.email || 'No email'}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {clientSitesCount > 0 && (
                                        <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                                          {clientSitesCount} {clientSitesCount === 1 ? 'Site' : 'Sites'}
                                        </span>
                                      )}
                                      {isSelected && <Check size={16} color="#d97706" strokeWidth={3} />}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                                No matching registered client. You can type company details directly below.
                              </div>
                            )}
                            <div
                              onMouseDown={(e) => { e.preventDefault(); setShowCompanySuggestions(false); }}
                              style={{ padding: '6px 14px', background: '#f8fafc', fontSize: 11.5, fontWeight: 600, color: '#64748b', textAlign: 'right', borderTop: '1px solid #e2e8f0', cursor: 'pointer' }}
                            >
                              Close ✕
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Choose Site for Selected Company */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#92400e', display: 'block', marginBottom: 4 }}>
                          Choose Site: {availableCompanySites.length > 0 && <span style={{ color: '#b45309' }}>({availableCompanySites.length} registered)</span>}
                        </label>
                        {availableCompanySites.length > 0 ? (
                          <select
                            className="form-control"
                            value={form.site_id || ''}
                            onChange={e => handleDirectSiteSelect(e.target.value)}
                            style={{ fontWeight: 700, fontSize: 13, background: '#fff', borderColor: form.site_id ? '#f59e0b' : '#cbd5e1' }}
                          >
                            <option value="">-- Select Registered Site --</option>
                            {availableCompanySites.map(s => {
                              const sAddr = resolveSiteDisplayAddress(s, null, form.company_address);
                              return (
                                <option key={s._id} value={s._id}>
                                  {s.name || s.site_name || 'Main Site'}{sAddr ? ` (${sAddr})` : ''}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div style={{ fontSize: 12.5, color: '#64748b', background: '#fff', border: '1px dashed #cbd5e1', padding: '9px 12px', borderRadius: 7 }}>
                            {selectedDirectClientId ? 'No registered sites for this client. Enter site name below.' : 'Search company above to select its sites.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Header Banner - Matches AdminExtensionLogsheet */}
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 14, marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#008744', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      HALAL FOOD AUTHORITY
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '4px 0 0', textTransform: 'uppercase' }}>
                      Halal Certificate Extension Logsheet
                    </h2>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Direct Facility Extension Decision Record
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Company Name: <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      required
                      type="text"
                      className="form-control"
                      value={form.company_name || ''}
                      onChange={e => setForm({ ...form, company_name: e.target.value })}
                      placeholder="e.g. British Foods Ltd"
                      style={{ fontWeight: 700 }}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">
                      Address of certificated facility: <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.manufacturing_address || form.facility_address || ''}
                      onChange={e => setForm({ ...form, manufacturing_address: e.target.value, facility_address: e.target.value })}
                      placeholder="Full address of the manufacturing / processing facility (Optional)"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Person of the company: <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      required
                      type="text"
                      className="form-control"
                      value={form.contact_person || ''}
                      onChange={e => setForm({ ...form, contact_person: e.target.value })}
                      placeholder="Full name of representative"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact E-mail: <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      required
                      type="email"
                      className="form-control"
                      value={form.contact_email || ''}
                      onChange={e => setForm({ ...form, contact_email: e.target.value })}
                      placeholder="representative@company.com"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Product category: <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      required
                      type="text"
                      className="form-control"
                      value={form.product_category || ''}
                      onChange={e => setForm({ ...form, product_category: e.target.value })}
                      placeholder="e.g. Meat & Poultry / Confectionery / Flavours"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Existing Certificate Number (if any):</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.existing_certificate_number || ''}
                      onChange={e => setForm({ ...form, existing_certificate_number: e.target.value })}
                      placeholder="e.g. HFA/UK/2025/104"
                      style={{ fontWeight: 600 }}
                    />
                  </div>

                  {/* Recommended Certificate Scheme / Standard with dynamic GSO & HFA indicators */}
                  <div style={{
                    gridColumn: '1 / -1',
                    background: '#f0fdfa',
                    padding: '16px 20px',
                    borderRadius: 12,
                    border: '1.5px solid #99f6e4',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <label style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                        <Award size={16} style={{ color: '#0d9488' }} />
                        <span>Recommended Certificate Scheme:</span>
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>* (Required)</span>
                      </label>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: '#0f766e',
                        background: '#ccfbf1', padding: '3px 10px', borderRadius: 20,
                        border: '1px solid #5eead4'
                      }}>
                        Recommended Scheme for Issuer
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <select
                        required
                        className="form-control"
                        value={form.suggested_certificate_type || form.certificate_type || ''}
                        onChange={e => {
                          const val = e.target.value;
                          let detectedScheme = '';
                          const u = val.toUpperCase();
                          if (u.includes('GSO') && u.includes('HFA')) detectedScheme = 'Both';
                          else if (u.includes('GSO') || u.includes('UAE') || u.includes('GCC')) detectedScheme = 'GSO';
                          else if (u.includes('HFA')) detectedScheme = 'HFA';
                          setForm(prev => ({
                            ...prev,
                            certificate_type: val,
                            suggested_certificate_type: val,
                            certificate_standard: val,
                            scheme: detectedScheme
                          }));
                        }}
                        style={{
                          maxWidth: 380,
                          fontWeight: 700,
                          fontSize: 13.5,
                          background: '#ffffff',
                          borderColor: (form.suggested_certificate_type || form.certificate_type) ? '#0d9488' : '#cbd5e1'
                        }}
                      >
                        <option value="" disabled>-- Select Certificate Type / Scheme (Required) --</option>
                        <option value="HFA SCHEME NON MEAT">HFA SCHEME NON MEAT (Food &amp; General Manufacturing)</option>
                        <option value="HFA SCHEME MEAT">HFA SCHEME MEAT (Meat &amp; Poultry Processing)</option>
                        <option value="GSO NON MEAT">GSO NON MEAT (UAE / GCC Scheme - Non-Meat Food)</option>
                        <option value="GSO MEAT">GSO MEAT (UAE / GCC Scheme - Meat Processing)</option>
                        <option value="COSMETICS">COSMETICS (Personal Care &amp; Cosmetics Scheme)</option>
                        <option value="SMIIC">SMIIC (OIC / SMIIC Halal Scheme)</option>
                      </select>

                      {/* Dynamic Scheme Indicators */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <label style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
                          color: (form.scheme === 'GSO' || form.scheme === 'Both' || (form.certificate_type || '').includes('GSO')) ? '#0f172a' : '#94a3b8'
                        }}>
                          <input
                            type="checkbox"
                            checked={form.scheme === 'GSO' || form.scheme === 'Both' || (form.certificate_type || '').includes('GSO')}
                            readOnly
                            style={{ width: 16, height: 16, accentColor: '#008744' }}
                          />
                          GSO
                        </label>
                        <label style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
                          color: (form.scheme === 'HFA' || form.scheme === 'Both' || (form.certificate_type || '').includes('HFA')) ? '#0f172a' : '#94a3b8'
                        }}>
                          <input
                            type="checkbox"
                            checked={form.scheme === 'HFA' || form.scheme === 'Both' || (form.certificate_type || '').includes('HFA')}
                            readOnly
                            style={{ width: 16, height: 16, accentColor: '#008744' }}
                          />
                          HFA
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Expiry Date */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Certificate expiry date: <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      required
                      type="date"
                      className="form-control"
                      value={form.expiry_date?.split('T')[0] || ''}
                      onChange={e => {
                        const newExp = e.target.value;
                        setForm(f => {
                          const baseDate = newExp ? new Date(newExp) : new Date();
                          const days = f.extension_days || 30;
                          const extDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                          return { ...f, expiry_date: newExp, extended_expiry_date: extDate };
                        });
                      }}
                      style={{ maxWidth: 260 }}
                    />
                  </div>

                  {/* Justification for extension */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Justification for extension: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      className="form-control"
                      value={form.extension_reason || form.comment || ''}
                      onChange={e => setForm({ ...form, extension_reason: e.target.value, comment: e.target.value })}
                      placeholder="State the detailed operational, technical, or auditing justification for granting the certificate extension..."
                      style={{ fontSize: 13.5, lineHeight: 1.6 }}
                    />
                  </div>

                  {/* Extension Duration Toggle - Strictly 30 Days and More than 30 Days */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px dashed #cbd5e1',
                    borderRadius: 12,
                    padding: '18px 22px',
                    gridColumn: '1 / -1'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                          Extension required for:
                        </span>
                        {form.extension_duration_type === 'more_than_30_days' ? (
                          <input
                            type="number"
                            min="31"
                            max="365"
                            value={form.extension_days || 60}
                            onChange={e => handleExtensionDurationChange('more_than_30_days', e.target.value)}
                            style={{
                              width: 90, padding: '6px 10px', borderRadius: 6,
                              border: '2px solid #2563eb',
                              backgroundColor: '#ffffff',
                              fontSize: 15, fontWeight: 800,
                              textAlign: 'center', color: '#2563eb'
                            }}
                          />
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            width: 60, padding: '6px 10px', borderRadius: 6,
                            background: '#ecfdf5', border: '1.5px solid #008744',
                            fontSize: 15, fontWeight: 800, textAlign: 'center', color: '#008744'
                          }}>
                            30
                          </span>
                        )}
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                          days
                        </span>
                      </div>

                      {/* Only 30 Days and More than 30 Days buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => handleExtensionDurationChange('30_days')}
                          style={{
                            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                            border: form.extension_duration_type === '30_days' ? '2px solid #008744' : '1px solid #cbd5e1',
                            background: form.extension_duration_type === '30_days' ? '#ecfdf5' : '#ffffff',
                            color: form.extension_duration_type === '30_days' ? '#008744' : '#64748b',
                            cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            boxShadow: form.extension_duration_type === '30_days' ? '0 2px 8px rgba(0,135,68,0.15)' : 'none'
                          }}
                        >
                          ✓ 30 Days Extension (1 Signature)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExtensionDurationChange('more_than_30_days', form.extension_days > 30 ? form.extension_days : 60)}
                          style={{
                            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                            border: form.extension_duration_type === 'more_than_30_days' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                            background: form.extension_duration_type === 'more_than_30_days' ? '#eff6ff' : '#ffffff',
                            color: form.extension_duration_type === 'more_than_30_days' ? '#2563eb' : '#64748b',
                            cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            boxShadow: form.extension_duration_type === 'more_than_30_days' ? '0 2px 8px rgba(37,99,235,0.15)' : 'none'
                          }}
                        >
                          ✓ more than 30 Days Extension (4 Signatures)
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 14, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                          Current Certificate Expiry Date:
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={form.expiry_date?.split('T')[0] || ''}
                          onChange={e => {
                            const newExp = e.target.value;
                            setForm(f => {
                              const baseDate = newExp ? new Date(newExp) : new Date();
                              const days = f.extension_days || 30;
                              const extDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                              return { ...f, expiry_date: newExp, extended_expiry_date: extDate };
                            });
                          }}
                          style={{ fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 800, color: '#0f766e', display: 'block', marginBottom: 4 }}>
                          Extended Expiry Date (Auto-calculated):
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={form.extended_expiry_date?.split('T')[0] || ''}
                          onChange={e => setForm({ ...form, extended_expiry_date: e.target.value })}
                          style={{ fontWeight: 800, background: '#f0fdfa', borderColor: '#99f6e4', color: '#0f766e', fontSize: 13.5 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document upload */}
                  <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0, marginBottom: 8 }}>
                      Attach Extension Justification / Supporting Documents (Optional)
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', background: '#fff', border: '1px dashed #cbd5e1', padding: '8px 16px', borderRadius: 8 }}>
                      <UploadCloud size={15} /> {uploadingReport ? 'Uploading...' : '+ Upload Supporting Documents'}
                      <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                    </label>
                    {Array.isArray(form.document_urls) && form.document_urls.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                        {form.document_urls.map((doc, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{doc.name}</span>
                            <button type="button" onClick={() => handleRemoveDocument(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', paddingTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setActiveTab(2)}
                      style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', borderColor: '#d97706', fontWeight: 700 }}
                    >
                      Continue to Comment / Reason <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              ) : isDirectCreation && directLogsheetType === 'product' ? (
                /* PRODUCT LOGSHEET TAB 1 (Initial Product & Add-on Evaluation) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Searchable Direct Company & Site Picker Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                    border: '1.5px solid #a5b4fc',
                    borderRadius: 12,
                    padding: '16px 20px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Package size={17} style={{ color: '#4338ca' }} />
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: '#3730a3' }}>
                          Product Logsheet · Search Company &amp; Choose Site
                        </span>
                        <span style={{ fontSize: 11, background: '#c7d2fe', color: '#312e81', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                          Direct Generation
                        </span>
                      </div>
                      {selectedDirectClientId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDirectClientId('');
                            setCompanySearchQuery('');
                            setAvailableCompanySites([]);
                            setForm(prev => ({
                              ...prev,
                              client_id: '',
                              company_name: '',
                              site_name: '',
                              manufacturing_address: '',
                              company_address: '',
                              contact_person: '',
                              contact_email: ''
                            }));
                          }}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <X size={13} /> Clear Selection
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: availableCompanySites.length > 0 ? '1.2fr 1fr' : '1fr', gap: 16 }}>
                      {/* Searchable Company Name */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#3730a3', display: 'block', marginBottom: 4 }}>
                          Type Company Name to Search:
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="form-control"
                            value={companySearchQuery || form.company_name || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setCompanySearchQuery(val);
                              setForm(prev => ({ ...prev, company_name: val }));
                              setShowCompanySuggestions(true);
                            }}
                            onFocus={() => setShowCompanySuggestions(true)}
                            placeholder="Start typing company name to search..."
                            style={{
                              paddingLeft: 34,
                              fontWeight: 700,
                              fontSize: 13.5,
                              background: '#fff',
                              borderColor: selectedDirectClientId ? '#6366f1' : '#cbd5e1'
                            }}
                          />
                          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#818cf8' }} />
                          {companySearchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setCompanySearchQuery('');
                                setForm(prev => ({ ...prev, company_name: '' }));
                                setSelectedDirectClientId('');
                                setAvailableCompanySites([]);
                              }}
                              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Floating Suggestions */}
                        {showCompanySuggestions && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
                            background: '#ffffff', borderRadius: 8, border: '1.5px solid #6366f1',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', maxHeight: 240, overflowY: 'auto', marginTop: 4
                          }}>
                            {filteredClients.length > 0 ? (
                              filteredClients.map(client => {
                                const clientSitesCount = directSites.filter(s => String(s.client_id?._id || s.client_id) === String(client._id)).length;
                                const isSelected = selectedDirectClientId === client._id;
                                return (
                                  <div
                                    key={client._id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleDirectClientSelect(client._id);
                                      setShowCompanySuggestions(false);
                                    }}
                                    style={{
                                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                      background: isSelected ? '#eef2ff' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'}
                                    onMouseLeave={e => e.currentTarget.style.background = isSelected ? '#eef2ff' : '#ffffff'}
                                  >
                                    <div>
                                      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>{client.company_name || client.full_name}</div>
                                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                        {client.full_name && client.full_name !== client.company_name ? `${client.full_name} • ` : ''}{client.email || 'No email'}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {clientSitesCount > 0 && (
                                        <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                                          {clientSitesCount} {clientSitesCount === 1 ? 'Site' : 'Sites'}
                                        </span>
                                      )}
                                      {isSelected && <Check size={16} color="#4f46e5" strokeWidth={3} />}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                                No matching registered client. You can type company details directly below.
                              </div>
                            )}
                            <div
                              onMouseDown={(e) => { e.preventDefault(); setShowCompanySuggestions(false); }}
                              style={{ padding: '6px 14px', background: '#f8fafc', fontSize: 11.5, fontWeight: 600, color: '#64748b', textAlign: 'right', borderTop: '1px solid #e2e8f0', cursor: 'pointer' }}
                            >
                              Close ✕
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Choose Site for Selected Company */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#3730a3', display: 'block', marginBottom: 4 }}>
                          Choose Site: {availableCompanySites.length > 0 && <span style={{ color: '#4338ca' }}>({availableCompanySites.length} registered)</span>}
                        </label>
                        {availableCompanySites.length > 0 ? (
                          <select
                            className="form-control"
                            value={form.site_id || ''}
                            onChange={e => handleDirectSiteSelect(e.target.value)}
                            style={{ fontWeight: 700, fontSize: 13, background: '#fff', borderColor: form.site_id ? '#6366f1' : '#cbd5e1' }}
                          >
                            <option value="">-- Select Registered Site --</option>
                            {availableCompanySites.map(s => {
                              const sAddr = resolveSiteDisplayAddress(s, null, form.company_address);
                              return (
                                <option key={s._id} value={s._id}>
                                  {s.name || s.site_name || 'Main Site'}{sAddr ? ` (${sAddr})` : ''}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div style={{ fontSize: 12.5, color: '#64748b', background: '#fff', border: '1px dashed #cbd5e1', padding: '9px 12px', borderRadius: 7 }}>
                            {selectedDirectClientId ? 'No registered sites for this client. Enter site name below.' : 'Search company above to select its sites.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sub-type Selection: Initial Product vs Add-on Product */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                        Product Evaluation Category
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Select whether this logsheet is for an <strong>Initial Product Evaluation</strong> or an <strong>Add-on Products Certification</strong>.
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            product_sub_type: 'initial',
                            audit_type: 'Initial Product Evaluation',
                            comment: prev.comment || 'Recommended for initial product approval endorsement.'
                          }));
                        }}
                        style={{
                          padding: '9px 18px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          border: form.product_sub_type === 'initial' ? '2px solid #059669' : '1px solid #cbd5e1',
                          background: form.product_sub_type === 'initial' ? '#ecfdf5' : '#ffffff',
                          color: form.product_sub_type === 'initial' ? '#059669' : '#64748b',
                          boxShadow: form.product_sub_type === 'initial' ? '0 2px 8px rgba(5,150,105,0.15)' : 'none'
                        }}
                      >
                        <CheckCircle2 size={15} /> Initial Product Evaluation
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            product_sub_type: 'addon',
                            audit_type: 'Add-on Products Certification',
                            comment: prev.comment || 'Recommended for add-on product certification endorsement.'
                          }));
                        }}
                        style={{
                          padding: '9px 18px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          border: form.product_sub_type === 'addon' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                          background: form.product_sub_type === 'addon' ? '#f5f3ff' : '#ffffff',
                          color: form.product_sub_type === 'addon' ? '#7c3aed' : '#64748b',
                          boxShadow: form.product_sub_type === 'addon' ? '0 2px 8px rgba(124,58,237,0.15)' : 'none'
                        }}
                      >
                        <Package size={15} /> Add-on Products Certification
                      </button>
                    </div>
                  </div>

                  {/* FORM GRID */}
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="form-group">
                      <label className="form-label">Company Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        required
                        type="text"
                        className="form-control"
                        value={form.company_name || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setForm({ ...form, company_name: val });
                          setCompanySearchQuery(val);
                        }}
                        style={{ fontWeight: 700 }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Manufacturing Site Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        required
                        type="text"
                        className="form-control"
                        value={form.site_name || ''}
                        onChange={e => setForm({ ...form, site_name: e.target.value })}
                        style={{ fontWeight: 600 }}
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Manufacturing Site Address <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>(Optional)</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.manufacturing_address || ''}
                        onChange={e => setForm({ ...form, manufacturing_address: e.target.value })}
                        placeholder="Full facility address"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Contact Person <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        required
                        type="text"
                        className="form-control"
                        value={form.contact_person || ''}
                        onChange={e => setForm({ ...form, contact_person: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Contact E-mail <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        required
                        type="email"
                        className="form-control"
                        value={form.contact_email || ''}
                        onChange={e => setForm({ ...form, contact_email: e.target.value })}
                      />
                    </div>

                    {/* INITIAL PRODUCT EVALUATION FIELDS */}
                    {form.product_sub_type !== 'addon' ? (
                      <>
                        <div className="form-group">
                          <label className="form-label">Product Name <span style={{ color: '#dc2626' }}>*</span></label>
                          <input
                            required
                            type="text"
                            className="form-control"
                            value={form.product_name || ''}
                            onChange={e => setForm({ ...form, product_name: e.target.value, product_category: `${e.target.value}${form.product_code ? ` (${form.product_code})` : ''}` })}
                            placeholder="e.g. Halal Vanilla Extract"
                            style={{ fontWeight: 800 }}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Product Code / SKU</label>
                          <input
                            type="text"
                            className="form-control"
                            value={form.product_code || ''}
                            onChange={e => setForm({ ...form, product_code: e.target.value, product_category: `${form.product_name || 'Product'}${e.target.value ? ` (${e.target.value})` : ''}` })}
                            placeholder="e.g. PRD-1029"
                          />
                        </div>
                      </>
                    ) : (
                      /* ADD-ON PRODUCTS SCHEDULE */
                      <div className="form-group" style={{ gridColumn: '1 / -1', background: '#faf5ff', padding: 18, borderRadius: 10, border: '1.5px solid #e9d5ff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#6b21a8' }}>
                              Add-on Products Schedule ({Array.isArray(form.products_list) ? form.products_list.length : 0} items)
                            </div>
                            <div style={{ fontSize: 12, color: '#7e22ce' }}>
                              Add the product formulations requested for add-on certificate inclusion.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const curr = Array.isArray(form.products_list) ? [...form.products_list] : [];
                              curr.push({ name: '', code: '', category: '' });
                              setForm(prev => ({
                                ...prev,
                                products_list: curr,
                                product_category: curr.map(p => p.name).filter(Boolean).join(', ') || prev.product_category
                              }));
                            }}
                            className="btn btn-sm btn-primary"
                            style={{ background: '#7e22ce', borderColor: '#7e22ce', fontSize: 12, fontWeight: 700 }}
                          >
                            + Add Product to Schedule
                          </button>
                        </div>

                        {/* Primary / Lead Product Input */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                          <div>
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#581c87' }}>Lead / Main Product Name <span style={{ color: '#dc2626' }}>*</span></label>
                            <input
                              required
                              type="text"
                              className="form-control"
                              value={form.product_name || ''}
                              onChange={e => setForm({ ...form, product_name: e.target.value, product_category: `${e.target.value}${form.product_code ? ` (${form.product_code})` : ''}` })}
                              placeholder="e.g. Premium Chocolate Spread"
                              style={{ fontWeight: 800 }}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#581c87' }}>Product Code / SKU</label>
                            <input
                              type="text"
                              className="form-control"
                              value={form.product_code || ''}
                              onChange={e => setForm({ ...form, product_code: e.target.value, product_category: `${form.product_name || 'Product'}${e.target.value ? ` (${e.target.value})` : ''}` })}
                              placeholder="e.g. ADD-701"
                            />
                          </div>
                        </div>

                        {/* List of Additional Scheduled Products */}
                        {Array.isArray(form.products_list) && form.products_list.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                            {form.products_list.map((item, idx) => (
                              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'center', background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #d8b4fe' }}>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={item.name || ''}
                                  onChange={e => {
                                    const nextList = [...form.products_list];
                                    nextList[idx] = { ...nextList[idx], name: e.target.value };
                                    setForm(prev => ({
                                      ...prev,
                                      products_list: nextList,
                                      product_category: nextList.map(p => p.name).filter(Boolean).join(', ')
                                    }));
                                  }}
                                  placeholder={`Product #${idx + 1} Name`}
                                  style={{ fontSize: 12.5, fontWeight: 600 }}
                                />
                                <input
                                  type="text"
                                  className="form-control"
                                  value={item.code || ''}
                                  onChange={e => {
                                    const nextList = [...form.products_list];
                                    nextList[idx] = { ...nextList[idx], code: e.target.value };
                                    setForm(prev => ({ ...prev, products_list: nextList }));
                                  }}
                                  placeholder="SKU / Code"
                                  style={{ fontSize: 12.5 }}
                                />
                                <input
                                  type="text"
                                  className="form-control"
                                  value={item.category || ''}
                                  onChange={e => {
                                    const nextList = [...form.products_list];
                                    nextList[idx] = { ...nextList[idx], category: e.target.value };
                                    setForm(prev => ({ ...prev, products_list: nextList }));
                                  }}
                                  placeholder="Category / Notes"
                                  style={{ fontSize: 12.5 }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextList = form.products_list.filter((_, i) => i !== idx);
                                    setForm(prev => ({ ...prev, products_list: nextList }));
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Raw Materials Verified &amp; Approved?</label>
                      <select
                        className="form-control"
                        value={form.raw_materials_approved || 'Yes'}
                        onChange={e => setForm({ ...form, raw_materials_approved: e.target.value })}
                      >
                        <option value="Yes">Yes - All raw materials verified</option>
                        <option value="Pending">Pending supplier halal certificates</option>
                        <option value="No">No - NC flagged</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Cross-Contamination Risk</label>
                      <select
                        className="form-control"
                        value={form.cross_contamination_risk || 'None'}
                        onChange={e => setForm({ ...form, cross_contamination_risk: e.target.value })}
                      >
                        <option value="None">None (Dedicated halal equipment)</option>
                        <option value="Low">Low (Documented CIP cleaning validation)</option>
                        <option value="Medium">Medium (Shared production line)</option>
                        <option value="High">High (Porcine/alcohol on site)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Formulation Checked?</label>
                      <select
                        className="form-control"
                        value={form.formulation_checked || 'Yes'}
                        onChange={e => setForm({ ...form, formulation_checked: e.target.value })}
                      >
                        <option value="Yes">Yes - Recipe checked by Food Technologist</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Laboratory Testing Required?</label>
                      <select
                        className="form-control"
                        value={form.lab_test_required || 'No'}
                        onChange={e => setForm({ ...form, lab_test_required: e.target.value })}
                      >
                        <option value="No">No - Desk review sufficient</option>
                        <option value="Yes">Yes - DNA / Ethanol testing requested</option>
                      </select>
                    </div>

                    {/* Document upload */}
                    <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <label className="form-label" style={{ fontWeight: 700, margin: 0, marginBottom: 8 }}>
                        Attach Product Specifications / Ingredient Statements &amp; Halal Declarations
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4f46e5', fontWeight: 700, cursor: 'pointer', background: '#fff', border: '1px dashed #cbd5e1', padding: '8px 16px', borderRadius: 8 }}>
                        <UploadCloud size={15} /> {uploadingReport ? 'Uploading...' : '+ Upload Specifications & Statements'}
                        <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                      </label>
                      {Array.isArray(form.document_urls) && form.document_urls.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                          {form.document_urls.map((doc, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{doc.name}</span>
                              <button type="button" onClick={() => handleRemoveDocument(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', paddingTop: 10 }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setActiveTab(2)}
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', borderColor: '#4f46e5', fontWeight: 700 }}
                      >
                        Continue to Comment / Reason <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* NORMAL LOGSHEET TAB 1 (Standard 4-Tab Workflow) */
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Auto-populated Indicator Banner / Searchable Direct Company & Site Picker */}
                {isDirectCreation ? (
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                    border: '1.5px solid #86efac',
                    borderRadius: 12,
                    padding: '16px 20px',
                    gridColumn: '1 / -1',
                    marginBottom: 4,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building size={17} style={{ color: '#166534' }} />
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: '#166534' }}>
                          Normal Logsheet · Search Company &amp; Choose Site
                        </span>
                        <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                          Direct Creation
                        </span>
                      </div>
                      {selectedDirectClientId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDirectClientId('');
                            setCompanySearchQuery('');
                            setAvailableCompanySites([]);
                            setForm(prev => ({
                              ...prev,
                              client_id: '',
                              company_name: '',
                              site_name: '',
                              manufacturing_address: '',
                              company_address: '',
                              contact_person: '',
                              contact_email: ''
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <X size={13} /> Clear Selection
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: availableCompanySites.length > 0 ? '1.2fr 1fr' : '1fr', gap: 16 }}>
                      {/* Searchable Company Name */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Type Company Name to Search:
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="form-control"
                            value={companySearchQuery || form.company_name || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setCompanySearchQuery(val);
                              setForm(prev => ({ ...prev, company_name: val }));
                              setShowCompanySuggestions(true);
                            }}
                            onFocus={() => setShowCompanySuggestions(true)}
                            placeholder="Start typing company name to search..."
                            style={{
                              paddingLeft: 34,
                              fontWeight: 700,
                              fontSize: 13.5,
                              background: '#fff',
                              borderColor: selectedDirectClientId ? '#16a34a' : '#cbd5e1'
                            }}
                          />
                          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                          {companySearchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setCompanySearchQuery('');
                                setForm(prev => ({ ...prev, company_name: '' }));
                                setSelectedDirectClientId('');
                                setAvailableCompanySites([]);
                              }}
                              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Floating Suggestions */}
                        {showCompanySuggestions && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              zIndex: 60,
                              background: '#ffffff',
                              borderRadius: 8,
                              border: '1.5px solid #16a34a',
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                              maxHeight: 240,
                              overflowY: 'auto',
                              marginTop: 4
                            }}
                          >
                            {filteredClients.length > 0 ? (
                              filteredClients.map(client => {
                                const clientSitesCount = directSites.filter(s => String(s.client_id?._id || s.client_id) === String(client._id)).length;
                                const isSelected = selectedDirectClientId === client._id;
                                return (
                                  <div
                                    key={client._id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleDirectClientSelect(client._id);
                                      setShowCompanySuggestions(false);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid #f1f5f9',
                                      background: isSelected ? '#f0fdf4' : '#ffffff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                                    onMouseLeave={e => e.currentTarget.style.background = isSelected ? '#f0fdf4' : '#ffffff'}
                                  >
                                    <div>
                                      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                                        {client.company_name || client.full_name}
                                      </div>
                                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                        {client.full_name && client.full_name !== client.company_name ? `${client.full_name} • ` : ''}{client.email || 'No email'}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {clientSitesCount > 0 && (
                                        <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                                          {clientSitesCount} {clientSitesCount === 1 ? 'Site' : 'Sites'}
                                        </span>
                                      )}
                                      {isSelected && <Check size={16} color="#16a34a" strokeWidth={3} />}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                                No matching registered client. You can type company details directly.
                              </div>
                            )}
                            <div
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setShowCompanySuggestions(false);
                              }}
                              style={{
                                padding: '6px 14px',
                                background: '#f8fafc',
                                fontSize: 11.5,
                                fontWeight: 600,
                                color: '#64748b',
                                textAlign: 'right',
                                borderTop: '1px solid #e2e8f0',
                                cursor: 'pointer'
                              }}
                            >
                              Close ✕
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Choose Site for Selected Company */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Choose Site: {availableCompanySites.length > 0 && <span style={{ color: '#16a34a' }}>({availableCompanySites.length} registered)</span>}
                        </label>
                        {availableCompanySites.length > 0 ? (
                          <select
                            className="form-control"
                            value={form.site_id || ''}
                            onChange={e => handleDirectSiteSelect(e.target.value)}
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              background: '#fff',
                              borderColor: form.site_id ? '#16a34a' : '#cbd5e1'
                            }}
                          >
                            <option value="">-- Select Registered Site --</option>
                            {availableCompanySites.map(s => {
                              const sAddr = resolveSiteDisplayAddress(s, null, form.company_address);
                              return (
                                <option key={s._id} value={s._id}>
                                  {s.name || s.site_name || 'Main Site'}{sAddr ? ` (${sAddr})` : ''}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div style={{ fontSize: 12.5, color: '#64748b', background: '#fff', border: '1px dashed #cbd5e1', padding: '9px 12px', borderRadius: 7 }}>
                            {selectedDirectClientId ? 'No registered sites for this client. Enter site name below.' : 'Search company above to select from its sites.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, gridColumn: '1 / -1', marginBottom: 4 }}>
                    <CheckCircle2 size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 500 }}>
                      <strong>Fields Pre-filled from Application:</strong> All fields below have been pre-populated from the verified application record. You can edit any field before saving.
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Site Name <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Pre-filled · Editable
                    </span>
                  </div>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.site_name || ''}
                    onChange={e => setForm({ ...form, site_name: e.target.value })}
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Company Name <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Pre-filled · Editable
                    </span>
                  </div>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.company_name || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setForm({ ...form, company_name: val });
                      if (isDirectCreation) {
                        setCompanySearchQuery(val);
                        setShowCompanySuggestions(true);
                      }
                    }}
                    onFocus={() => {
                      if (isDirectCreation) setShowCompanySuggestions(true);
                    }}
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Contact Person <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Pre-filled · Editable
                    </span>
                  </div>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.contact_person || ''}
                    onChange={e => setForm({ ...form, contact_person: e.target.value })}
                    style={{ fontWeight: 700 }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Company Address <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Pre-filled · Editable
                    </span>
                  </div>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.company_address || ''}
                    onChange={e => setForm({ ...form, company_address: e.target.value })}
                    placeholder="Registered company address"
                    style={{ fontWeight: 600 }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Manufacturing Site Address <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>(Optional)</span></label>
                    <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Pre-filled · Editable
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    value={form.manufacturing_address || ''}
                    onChange={e => setForm({ ...form, manufacturing_address: e.target.value })}
                    placeholder="Physical facility address where products are manufactured (Optional)"
                    style={{ fontWeight: 600 }}
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Contact E-mail <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Pre-filled · Editable
                    </span>
                  </div>
                  <input
                    required
                    type="email"
                    className="form-control"
                    value={form.contact_email || ''}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })}
                    placeholder="name@company.com"
                    style={{ fontWeight: 600 }}
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Nature of the business <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Pre-filled · Editable
                    </span>
                  </div>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.nature_of_business || ''}
                    onChange={e => setForm({ ...form, nature_of_business: e.target.value })}
                    placeholder="e.g. Halal Food Production"
                    style={{ fontWeight: 600 }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Product Category <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="text" className="form-control" value={form.product_category} onChange={e => setForm({ ...form, product_category: e.target.value })} placeholder="e.g. Category C - Food Manufacturing" />
                </div>

                <div className="form-group">
                  <label className="form-label">Issue date of certificate <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" value={form.issue_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, issue_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry date of certificate <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" value={form.expiry_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Cycle Start Date <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" value={form.current_cycle_start?.split('T')[0] || ''} onChange={e => setForm({ ...form, current_cycle_start: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Original Cycle Start Date <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" value={form.original_cycle_start?.split('T')[0] || ''} onChange={e => setForm({ ...form, original_cycle_start: e.target.value })} />
                </div>

                {isGSO && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ fontWeight: 800, color: '#0f172a' }}>
                      Next Surveillance Due Date <span style={{ color: '#dc2626' }}>* (Required for GSO)</span>
                    </label>
                    <input
                      required
                      type="date"
                      className="form-control"
                      style={{ maxWidth: 300, background: form.next_surveillance_due_date ? '#f0fdf4' : '#fff', fontWeight: 700 }}
                      value={form.next_surveillance_due_date?.split('T')[0] || ''}
                      onChange={e => setForm({ ...form, next_surveillance_due_date: e.target.value })}
                    />
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                      Milestone surveillance audit due date required for GSO 3-year certification cycle
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  {isProductLogsheet ? (
                    <div>
                      {/* Initial Product Editable Name & Code Card */}
                      {isInitialProduct && (
                        <div style={{ background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 12, padding: '18px 20px', marginBottom: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Package size={18} style={{ color: '#059669' }} />
                              <div>
                                <span style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                                  Initial Product Details
                                </span>
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                  You can edit the Product Name and Code here before Shari'a Committee review.
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              disabled={savingProductDetails || !initialProductName.trim()}
                              onClick={handleSaveInitialProductDetails}
                              style={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                            >
                              {savingProductDetails ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Check size={14} />}
                              Save Product Details
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>
                                Product Name <span style={{ color: '#dc2626' }}>*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={initialProductName}
                                onChange={e => {
                                  const val = e.target.value;
                                  setInitialProductName(val);
                                  setForm(prev => ({
                                    ...prev,
                                    product_category: `${val}${initialProductCode ? ` (${initialProductCode})` : ''}`
                                  }));
                                }}
                                placeholder="e.g. Organic Black Tea"
                                required
                                style={{ fontSize: 13, fontWeight: 600 }}
                              />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>
                                Product CODE
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={initialProductCode}
                                onChange={e => {
                                  const val = e.target.value;
                                  setInitialProductCode(val);
                                  setForm(prev => ({
                                    ...prev,
                                    product_category: `${initialProductName}${val ? ` (${val})` : ''}`
                                  }));
                                }}
                                placeholder="e.g. OBT-2024-01"
                                style={{ fontSize: 13, fontWeight: 600 }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <label className="form-label" style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a', margin: 0 }}>
                          {isRemoveProduct ? 'Products Requested for Removal' : isChangeIngredients ? 'Products with Ingredient Changes' : 'Client Product Approval Request Forms & Specifications'}
                        </label>
                        <span className="badge badge-teal" style={{ fontSize: 11, fontWeight: 700 }}>
                          {isInitialProduct ? '1 PRODUCT IN INITIAL EVALUATION' : (isRemoveProduct ? `${application?.products?.length || 0} PRODUCTS TO REMOVE` : (isChangeIngredients ? `${application?.products?.length || 0} PRODUCTS WITH INGREDIENT CHANGES` : `${application?.products?.length || 0} PRODUCTS IN ADD-ON`))}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                        {isRemoveProduct
                          ? 'Products requested to be removed from the active Halal certification upon Committee sign-off.'
                          : isChangeIngredients
                          ? 'Products undergoing formulation or ingredient changes for Committee technical verification.'
                          : 'Official 3-page Halal Certification Product Approval Request Forms submitted by the client (Ingredients, Porcine Segregation, Processing Aids, Ethanol, Packaging specs & Signatures).'}
                      </div>

                      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                        {(isInitialProduct ? (application?.product ? [application.product] : []) : (application?.products || currentLogsheet?.products_list || form?.products_list || [])).map((p, pIdx) => {
                          const resp = isInitialProduct
                            ? (application?.product_approval_form?.product_response || {})
                            : (application?.product_approval_form?.product_responses || []).find(r => r.product_index === pIdx);
                          const isSaved = resp?.is_saved || Boolean(resp?.response_url) || (resp?.form_data && Object.keys(resp.form_data).length > 0);
                          const formData = resp?.form_data || {};
                          const displayName = isInitialProduct ? (initialProductName || p.name) : p.name;
                          const displayCode = isInitialProduct ? (initialProductCode !== undefined ? initialProductCode : p.code) : p.code;

                          const isThisRemove = isRemoveProduct || String(p.type || '').toLowerCase().includes('remove');
                          const isThisChange = isChangeIngredients || String(p.type || '').toLowerCase().includes('change');

                          if (isThisRemove || isThisChange) {
                            return (
                              <div key={pIdx} style={{ background: isRemoveProduct ? '#fef2f2' : '#f5f3ff', border: `1.5px solid ${isRemoveProduct ? '#fecaca' : '#ddd6fe'}`, borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: 6, background: isRemoveProduct ? '#fee2e2' : '#ede9fe', color: isRemoveProduct ? '#dc2626' : '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                                    #{pIdx + 1}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                      {displayName} {displayCode ? `(${displayCode})` : ''}
                                    </div>
                                    <div style={{ fontSize: 11.5, color: isRemoveProduct ? '#dc2626' : '#6d28d9', fontWeight: 600 }}>
                                      {isRemoveProduct ? 'Action: Remove Product from Halal Certificate' : 'Action: Ingredient / Formulation Modification'}
                                    </div>
                                    {p.notes && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Notes: {p.notes}</div>}
                                    {p.ingredient_changes && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Changes: {p.ingredient_changes}</div>}
                                  </div>
                                </div>
                                <span className={`badge ${isRemoveProduct ? 'badge-red' : 'badge-purple'}`} style={{ fontSize: 11, fontWeight: 700 }}>
                                  {isRemoveProduct ? 'To Be Removed' : 'Ingredient Changes'}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div key={pIdx} style={{ background: '#fff', border: `1.5px solid ${isSaved ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: isSaved ? '#dcfce7' : '#f1f5f9', color: isSaved ? '#166534' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                                  #{pIdx + 1}
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                    {displayName} {displayCode ? `(${displayCode})` : ''}
                                  </div>
                                  <div style={{ fontSize: 11, color: isSaved ? '#16a34a' : '#94a3b8' }}>
                                    {isSaved ? '✓ Form Filled & Signed by Client' : 'Awaiting Client Form Completion'}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ background: '#164e63', borderColor: '#164e63', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                onClick={() => setViewProductModal({
                                  isOpen: true,
                                  formData: formData && Object.keys(formData).length > 0 ? formData : {
                                    product_name: displayName,
                                    product_code: displayCode,
                                    company_name_address: form.company_name
                                  },
                                  product: { ...p, name: displayName, code: displayCode },
                                  company: application?.client_id
                                })}
                              >
                                <Eye size={13} /> View Filled Product Form
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: uploadingReport ? '#94a3b8' : '#0284c7', fontWeight: 700, cursor: uploadingReport ? 'not-allowed' : 'pointer' }}>
                            <UploadCloud size={14} /> {uploadingReport ? 'Uploading...' : 'Attach Additional Product Specifications / Documents (Optional)'}
                            <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                          </label>
                        </div>

                        {Array.isArray(form.document_urls) && form.document_urls.length > 0 ? (
                          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                            {form.document_urls.map((doc, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0f9ff', padding: '10px 14px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <CheckCircle2 size={16} color="#0284c7" />
                                  <a
                                    href={getPdfUrl(doc.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#0369a1', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
                                    onClick={e => {
                                      e.preventDefault();
                                      const fullUrl = getPdfUrl(doc.url);
                                      if (fullUrl && fullUrl !== '#') window.open(fullUrl, '_blank', 'noopener,noreferrer');
                                    }}
                                  >
                                    {doc.name || `Product_Document_${idx + 1}.pdf`}
                                  </a>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <a
                                    href={getPdfUrl(doc.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '2px 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    onClick={e => {
                                      e.preventDefault();
                                      const fullUrl = getPdfUrl(doc.url);
                                      if (fullUrl && fullUrl !== '#') window.open(fullUrl, '_blank', 'noopener,noreferrer');
                                    }}
                                  >
                                    <Download size={12} /> View
                                  </a>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: '#dc2626', padding: '2px 8px' }}
                                    onClick={() => handleRemoveDocument(idx)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : form.document_url ? (
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f0f9ff', padding: '10px 14px', borderRadius: 8, border: '1px solid #bae6fd', marginTop: 8 }}>
                            <CheckCircle2 size={16} color="#0284c7" />
                            <a
                              href={getPdfUrl(form.document_url)}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#0369a1', fontWeight: 600, flex: 1, textDecoration: 'none', fontSize: 13 }}
                            >
                              Additional Product Specification Attached
                            </a>
                            <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => handleRemoveDocument(0)}>Remove</button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: 0 }}>
                          Upload Audit Reports <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: uploadingReport ? '#94a3b8' : 'var(--primary)', fontWeight: 600, cursor: uploadingReport ? 'not-allowed' : 'pointer' }}>
                          <UploadCloud size={14} /> {uploadingReport ? 'Uploading...' : 'Add Audit Reports'}
                          <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                        </label>
                      </div>

                      {Array.isArray(form.document_urls) && form.document_urls.length > 0 ? (
                        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                          {form.document_urls.map((doc, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '10px 14px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle2 size={16} color="#16a34a" />
                                <a href={getPdfUrl(doc.url)} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                                  {doc.name || `Audit_Report_${idx + 1}.pdf`}
                                </a>
                              </div>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#dc2626', padding: '2px 8px' }}
                                onClick={() => handleRemoveDocument(idx)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                            <UploadCloud size={14} /> + Upload another document
                            <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                          </label>
                        </div>
                      ) : form.document_url ? (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f0fdf4', padding: '10px 14px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                          <CheckCircle2 size={16} color="#16a34a" />
                          <a href={getPdfUrl(form.document_url)} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 600, flex: 1, textDecoration: 'none' }}>
                            Audit Report Uploaded Successfully
                          </a>
                          <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => setForm({ ...form, document_url: '', document_urls: [], audit_reports: [] })}>Remove</button>
                        </div>
                      ) : (
                        <label style={{ display: 'flex', flexDirection: 'column', padding: 22, alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', borderRadius: 10, cursor: uploadingReport ? 'not-allowed' : 'pointer', background: '#fff' }}>
                          <UploadCloud size={26} color="#0d9488" style={{ marginBottom: 6 }} />
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                            {uploadingReport ? 'Uploading Documents...' : 'Click or Drag to Upload Audit Reports (Required)'}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Select 1 or more files (PDF, DOCX, PNG)</div>
                          <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

            {activeTab === 2 && (
              isDirectCreation && directLogsheetType !== 'normal' ? (
                /* TAB 2: COMMENT / REASON FOR DIRECT SPECIALIZED LOGSHEETS */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        2. Comment / Reason
                      </h3>
                      <span style={{ fontSize: 12, background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
                        {directLogsheetType === 'surveillance' ? 'Surveillance Decision Record' : directLogsheetType === 'extension' ? 'Extension Decision Record' : 'Product Evaluation Record'}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                      {directLogsheetType === 'surveillance'
                        ? 'Provide official review committee comments, surveillance audit verification details, and rationale for issuing the Surveillance Letter.'
                        : directLogsheetType === 'extension'
                        ? 'Provide justification, operational conditions, and committee rationale for extending halal certificate validity.'
                        : 'Provide formulation clearance comments, laboratory analysis notes, and committee rationale for product certification.'}
                    </p>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>
                        Comment / Reason for Decision <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <textarea
                        required
                        className="form-control"
                        rows={8}
                        style={{ fontSize: 14, padding: 14, lineHeight: 1.6 }}
                        placeholder={
                          directLogsheetType === 'surveillance'
                            ? 'Enter committee findings, audit observations, and confirmation notes for Surveillance Letter issuance...'
                            : directLogsheetType === 'extension'
                            ? 'Enter official reasons and risk assessment for granting certificate extension...'
                            : 'Enter technical review notes and formulation clearance remarks...'
                        }
                        value={form.comment || ''}
                        onChange={e => setForm({ ...form, comment: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setActiveTab(1)}
                        style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569' }}
                      >
                        <ChevronLeft size={16} /> Back to Details
                      </button>
                      <div style={{ fontSize: 12.5, color: '#0d9488', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={16} /> All section details completed
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Audit Type <span style={{ color: '#dc2626' }}>*</span></label>
                      <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Pre-filled · Editable
                      </span>
                    </div>
                    {isProductLogsheet ? (
                      <input
                        required
                        type="text"
                        className="form-control"
                        value={form.audit_type || (isInitialProduct ? 'Initial Product Evaluation' : 'Add-on Products Certification')}
                        onChange={e => setForm({ ...form, audit_type: e.target.value })}
                        style={{ fontWeight: 700 }}
                      />
                    ) : (
                      <select required className="form-control" value={form.audit_type} onChange={e => setForm({ ...form, audit_type: e.target.value })}>
                        <option value="New">New</option>
                        <option value="Surveillance">Surveillance</option>
                        <option value="Re-audit">Re-audit</option>
                        <option value="Add-on Product Review">Add-on Product Review</option>
                      </select>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Audit Date <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required type="date" className="form-control" value={form.audit_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, audit_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>{isProductLogsheet ? 'FTs' : 'Auditors'} <span style={{ color: '#dc2626' }}>*</span></label>
                      {isProductLogsheet && (
                        <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          Pre-filled · Editable
                        </span>
                      )}
                    </div>
                    <input
                      required
                      type="text"
                      className="form-control"
                      placeholder={isProductLogsheet ? 'Assigned Food Technologist(s)' : 'e.g. John Doe, Jane Smith'}
                      value={form.auditors || ''}
                      onChange={e => setForm({ ...form, auditors: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      NCS Close (if any) {!isProductLogsheet && <span style={{ color: '#dc2626' }}>*</span>}
                    </label>
                    <input
                      required={!isProductLogsheet}
                      type="text"
                      className="form-control"
                      value={form.ncs_close || ''}
                      onChange={e => setForm({ ...form, ncs_close: e.target.value })}
                      placeholder={isProductLogsheet ? 'e.g. N/A - Product Evaluation (Optional)' : 'e.g. No NCs flagged / All NCs closed'}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Audit Documentation reviewed and found satisfactory <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required type="text" className="form-control" value={form.docs_satisfactory} onChange={e => setForm({ ...form, docs_satisfactory: e.target.value })} placeholder="e.g. Satisfactory - all documentation verified" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Pork free statement / signed pork policy submitted <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required type="text" className="form-control" value={form.pork_free_statement} onChange={e => setForm({ ...form, pork_free_statement: e.target.value })} placeholder="e.g. Confirmed - signed pork-free declaration in place" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reviewed By <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required type="text" className="form-control" value={form.reviewed_by} onChange={e => setForm({ ...form, reviewed_by: e.target.value })} placeholder="e.g. HFA Technical Committee" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reviewer Name <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required type="text" className="form-control" value={form.reviewer_name} onChange={e => setForm({ ...form, reviewer_name: e.target.value })} placeholder="e.g. Lead Technical Reviewer" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Date of Review <span style={{ color: '#dc2626' }}>*</span></label>
                    <input required type="date" className="form-control" style={{ maxWidth: 300 }} value={form.review_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, review_date: e.target.value })} />
                  </div>
                </div>
              )
            )}

            {activeTab === 3 && (!isDirectCreation || directLogsheetType === 'normal') && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Certificate Type / Scheme Selection */}
                <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '16px 18px', borderRadius: 12, border: '1.5px solid #cbd5e1' }}>
                  <label className="form-label" style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a', marginBottom: 6, display: 'block' }}>
                    Certificate Type / Scheme <span style={{ color: '#dc2626' }}>* (Required)</span>
                  </label>
                  <select
                    required
                    className="form-control"
                    value={form.certificate_type || form.suggested_certificate_type || form.certificate_standard || ''}
                    onChange={e => setForm({ ...form, certificate_type: e.target.value, certificate_standard: e.target.value, suggested_certificate_type: e.target.value })}
                    style={{ fontWeight: 700, fontSize: 13.5, background: form.certificate_type ? '#f0fdfa' : '#fff', borderColor: form.certificate_type ? '#0e7490' : '#cbd5e1' }}
                  >
                    <option value="" disabled>-- Select Certificate Type / Scheme (Required) --</option>
                    <option value="Surveillance Letter">Surveillance Letter (Official Surveillance Confirmation)</option>
                    <option value="HFA SCHEME NON MEAT">HFA SCHEME NON MEAT (Food & General Manufacturing)</option>
                    <option value="HFA SCHEME MEAT">HFA SCHEME MEAT (Meat & Poultry Processing)</option>
                    <option value="GSO NON MEAT">GSO NON MEAT (UAE / GCC Scheme - Non-Meat Food)</option>
                    <option value="GSO MEAT">GSO MEAT (UAE / GCC Scheme - Meat Processing)</option>
                    <option value="COSMETICS">COSMETICS (Personal Care & Cosmetics Scheme)</option>
                    <option value="SMIIC">SMIIC (OIC / SMIIC Halal Scheme)</option>
                  </select>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                    💡 <strong>{isSurveillance ? 'Surveillance Document:' : 'Certificate Suggestion:'}</strong> {isSurveillance ? 'Surveillance audits result in an official Surveillance Confirmation Letter rather than a new certificate.' : 'This scheme is saved with the logsheet and suggested to the officer during final certificate issuance.'}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Annual certificate <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.annual_certificate} onChange={e => setForm({ ...form, annual_certificate: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Batch certificate <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.batch_certificate} onChange={e => setForm({ ...form, batch_certificate: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Only addition of new products <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.new_products_only} onChange={e => setForm({ ...form, new_products_only: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Addition of new site (or line) <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.new_site_line} onChange={e => setForm({ ...form, new_site_line: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">New Client <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.new_client} onChange={e => setForm({ ...form, new_client: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Agreement Signed <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.agreement_signed} onChange={e => setForm({ ...form, agreement_signed: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Status Date <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" style={{ maxWidth: 300 }} value={form.status_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, status_date: e.target.value })} />
                </div>
              </div>
            )}

            {activeTab === 4 && (!isDirectCreation || directLogsheetType === 'normal') && (
              <div className="form-group">
                <label className="form-label">Comment / Reason for Decision <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea
                  required
                  className="form-control"
                  rows={8}
                  style={{ fontSize: 14, padding: 14 }}
                  placeholder="Enter final review comments, conditions, or recommendations..."
                  value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                />
              </div>
            )}

            {/* Bottom Footer Submit */}
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.confirmed}
                  onChange={e => setForm({ ...form, confirmed: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  I confirm that all product and audit compliance details above have been verified. <span style={{ color: '#dc2626' }}>*</span>
                </span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14 }}>
                {isRedoing && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setIsRedoing(false)}
                    style={{ fontWeight: 600, color: '#64748b' }}
                  >
                    Cancel Redo
                  </button>
                )}
                {hasOpenNc && !currentLogsheet?._id && !isProductLogsheet && (
                  <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={15} /> All NCs must be resolved and closed before creating LogSheet
                  </span>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !form.confirmed || (hasOpenNc && !currentLogsheet?._id && !isProductLogsheet)}
                  style={{
                    padding: '10px 24px',
                    fontSize: 14,
                    fontWeight: 700,
                    opacity: (hasOpenNc && !currentLogsheet?._id && !isProductLogsheet) ? 0.6 : 1,
                    cursor: (hasOpenNc && !currentLogsheet?._id && !isProductLogsheet) ? 'not-allowed' : 'pointer',
                    background: isRedoing
                      ? '#b45309'
                      : directLogsheetType === 'surveillance'
                      ? 'linear-gradient(135deg, #0d9488 0%, #059669 100%)'
                      : directLogsheetType === 'extension'
                      ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                      : directLogsheetType === 'product'
                      ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)'
                      : undefined,
                    borderColor: isRedoing
                      ? '#b45309'
                      : directLogsheetType === 'surveillance'
                      ? '#0d9488'
                      : directLogsheetType === 'extension'
                      ? '#d97706'
                      : directLogsheetType === 'product'
                      ? '#4f46e5'
                      : undefined
                  }}
                >
                  {submitting
                    ? (isRedoing ? 'Saving & Resetting Signatures...' : 'Saving Record...')
                    : (isRedoing
                      ? 'Save & Update Logsheet'
                      : isDirectCreation && directLogsheetType === 'surveillance'
                      ? 'Create Surveillance Letter'
                      : isDirectCreation && directLogsheetType === 'extension'
                      ? 'Create Extension Logsheet'
                      : isDirectCreation && directLogsheetType === 'product'
                      ? 'Create Product Logsheet'
                      : 'Create & Save Logsheet')}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* INTERACTIVE SIGNATURE MODAL WITH DOUBLE-CONFIRMATION STEP */}
      {showSignModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            width: '100%',
            maxWidth: 520,
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'slideDown 0.2s ease-out'
          }}>
            {/* Modal Header - Emerald Gradient Theme */}
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #047857 0%, #0d9488 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PenTool size={20} style={{ color: '#ffffff' }} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Apply Committee Electronic Signature</h3>
              </div>
              <button
                onClick={() => setShowSignModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Step 1: Select Single Role */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    1. Select Signatory Role to Execute (Sign One by One)
                  </label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                    Single Role Sign
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'Mufti', label: 'Mufti / Shariah Signatory', isSigned: Boolean(currentLogsheet?.mufti_signature) },
                    { key: 'Ceo', label: 'CEO / Executive Signatory', isSigned: Boolean(currentLogsheet?.ceo_signature) },
                    { key: 'Manager', label: 'Manager (Technical Auditor)', isSigned: Boolean(currentLogsheet?.manager_signature) },
                    { key: 'Mufti2', label: 'Mufti 2 / Secondary Shariah', isSigned: Boolean(currentLogsheet?.mufti2_signature) },
                  ].map(r => {
                    const isSelected = sigRole === r.key;
                    const isAlreadySigned = r.isSigned;
                    const isRestrictedForMufti = isMuftiUser && (r.key === 'Ceo' || r.key === 'Manager');
                    const isDisabled = isAlreadySigned || isRestrictedForMufti;

                    return (
                      <button
                        key={r.key}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          setSigRole(r.key);
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: `1.5px solid ${isDisabled ? '#e2e8f0' : isSelected ? 'var(--primary)' : '#e2e8f0'}`,
                          background: isAlreadySigned ? '#f1f5f9' : isRestrictedForMufti ? '#fef2f2' : isSelected ? '#f0fdf4' : '#f8fafc',
                          color: isAlreadySigned ? '#94a3b8' : isRestrictedForMufti ? '#991b1b' : isSelected ? 'var(--primary-dark)' : '#334155',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: 13,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: isDisabled ? 0.6 : 1,
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: isSelected ? 800 : 600 }}>{r.label}</div>
                          {isAlreadySigned && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>(Already Signed)</span>}
                          {isRestrictedForMufti && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>(Mufti Restricted)</span>}
                        </div>
                        {isSelected && !isDisabled && (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={12} />
                          </div>
                        )}
                        {isAlreadySigned && <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Signature Preview */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                  2. Authenticated Digital Signature Preview
                </label>
                {userSignature ? (
                  <div style={{ padding: '14px 18px', border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>AUTHENTICATED USER</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{userSignature.name}</div>
                    </div>
                    <img
                      src={getPdfUrl(userSignature.signature_url)}
                      alt="Digital Signature"
                      style={{ maxHeight: 42, maxWidth: 140, objectFit: 'contain', background: 'white', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: 14, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
                    No digital signature image found for your account. Please upload one in the Signatures management page.
                  </div>
                )}
              </div>

              {/* Step 3: Optional Comment */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                  3. Signature Comment / Note (Optional)
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Enter comments or conditions regarding this signature..."
                  value={sigComment}
                  onChange={e => setSigComment(e.target.value)}
                  style={{ fontSize: 13, padding: 10 }}
                />
              </div>

              {/* Step 4: EXPLICIT DOUBLE CONFIRMATION CHECKBOX */}
              <div style={{ padding: '12px 14px', background: modalConfirmed ? '#f0fdf4' : '#fffbeb', border: `1px solid ${modalConfirmed ? '#86efac' : '#fed7aa'}`, borderRadius: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={modalConfirmed}
                    onChange={e => setModalConfirmed(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: modalConfirmed ? '#14532d' : '#9a3412' }}>
                    I explicitly confirm that I am applying my authorized electronic signature to this logsheet decision record.
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowSignModal(false)}
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmApplySignature}
                disabled={isSigning || !sigRole || !modalConfirmed || !userSignature}
                className="btn btn-primary"
                style={{
                  padding: '9px 24px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: (!modalConfirmed || isSigning || !sigRole || !userSignature) ? 0.6 : 1
                }}
              >
                {isSigning ? 'Applying Signature...' : 'Confirm & Apply Signature'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD-ON ONLY: APPROVE CLIENT PRODUCTS MODAL ─── */}
      {showApproveProductsModal && (
        <div className="modal-overlay" style={{ zIndex: 1260 }} onClick={() => setShowApproveProductsModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 720, width: '95%', maxHeight: '90vh', padding: 0, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: isRemoveProduct ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isRemoveProduct ? '#fecaca' : '#bbf7d0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isRemoveProduct ? <Trash2 size={20} style={{ color: '#dc2626' }} /> : <Package size={20} style={{ color: '#16a34a' }} />}
                </div>
                <div>
                  <div className="modal-title" style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                    {isRemoveProduct ? 'Remove Products from Halal Certification' : (isInitialProduct ? 'Initial Product Approved' : 'Approve Add-on Products')}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {isInitialProduct
                      ? (application?.product?.name ? `${application.product.name} • Initial Product Halal Evaluation` : 'Initial Product Halal Evaluation')
                      : `${application?.profiles?.company_name || form.company_name} • Site: ${form.site_name || 'Main Site'}`}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowApproveProductsModal(false)} style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, background: '#fafafa' }}>
              {/* Guidance Notice */}
              <div style={{ background: isRemoveProduct ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isRemoveProduct ? '#fecaca' : '#bbf7d0'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                {isRemoveProduct ? <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} /> : <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />}
                <div style={{ fontSize: 13, color: isRemoveProduct ? '#991b1b' : '#166534' }}>
                  {isRemoveProduct
                    ? 'Confirm the products to be removed from the active Halal certification. Highlighted products will be permanently removed from the client dashboard and database, and the certificate will be queued for updating.'
                    : isInitialProduct
                    ? 'Confirm committee approval for this Initial Product. Once approved and sent for audit, the Initial Product status will be marked as Initial Product Approved and the main facility application will unlock audit scheduling.'
                    : 'Select the verified products to approve. Highlighted products will be pushed to the client dashboard and approved for certification.'}
                </div>
              </div>

              {/* Selection Summary & Select All Toolbar */}
              {(() => {
                const productsList = isInitialProduct
                  ? (application?.product ? [application.product] : [])
                  : (application?.products || clientProducts || []);
                const allSelected = productsList.length > 0 && selectedApproveProducts.length === productsList.length;

                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {isRemoveProduct ? `Products to Remove (${selectedApproveProducts.length} of ${productsList.length} highlighted)` : `Products to Approve (${selectedApproveProducts.length} of ${productsList.length} highlighted)`}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          if (allSelected) {
                            setSelectedApproveProducts([]);
                          } else {
                            setSelectedApproveProducts(productsList.map((_, i) => i));
                          }
                        }}
                        style={{ fontSize: 12, fontWeight: 700, color: isRemoveProduct ? '#dc2626' : 'var(--primary)', padding: '2px 8px' }}
                      >
                        {allSelected ? 'Deselect All' : 'Select All Products'}
                      </button>
                    </div>

                    {/* Products Checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {productsList.map((p, idx) => {
                        const isSelected = selectedApproveProducts.includes(idx);
                        const resp = isInitialProduct
                          ? (application?.product_approval_form?.product_response || {})
                          : application?.product_approval_form?.product_responses?.find(r => r.product_index === idx);
                        const formData = resp?.form_data || {};
                        const isSaved = resp?.is_saved || Boolean(resp?.response_url) || Object.keys(formData).length > 0;

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedApproveProducts(prev =>
                                prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                              );
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 14,
                              padding: '14px 16px',
                              borderRadius: 12,
                              border: `2px solid ${isSelected ? (isRemoveProduct ? '#dc2626' : '#16a34a') : '#e2e8f0'}`,
                              background: isSelected ? (isRemoveProduct ? '#fef2f2' : '#f0fdf4') : '#fff',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? (isRemoveProduct ? '0 2px 8px rgba(220, 38, 38, 0.12)' : '0 2px 8px rgba(22, 163, 74, 0.12)') : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // Handled by parent onClick
                                style={{ width: 18, height: 18, accentColor: isRemoveProduct ? '#dc2626' : '#16a34a', cursor: 'pointer', flexShrink: 0 }}
                              />
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  background: isSelected ? (isRemoveProduct ? '#dc2626' : '#16a34a') : '#f1f5f9',
                                  color: isSelected ? '#fff' : '#475569',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: 12,
                                  flexShrink: 0
                                }}
                              >
                                #{idx + 1}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 13.5, color: isSelected ? '#14532d' : '#0f172a' }}>
                                  {p.name || p.title} {p.code ? `(${p.code})` : ''}
                                </div>
                                <div style={{ fontSize: 11.5, color: isSelected ? '#15803d' : '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569' }}>
                                    {p.type || 'Initial product'}
                                  </span>
                                  {!(isRemoveProduct || isChangeIngredients) && (
                                    isSaved ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#16a34a', fontWeight: 600 }}>
                                        <CheckCircle2 size={12} /> Form Signed
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>Awaiting Signatory</span>
                                    )
                                  )}
                                  {isRemoveProduct && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#dc2626', fontWeight: 600 }}>
                                      <Trash2 size={12} /> Marked for Removal
                                    </span>
                                  )}
                                  {isChangeIngredients && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#7c3aed', fontWeight: 600 }}>
                                      <CheckCircle2 size={12} /> Formulation Update
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* View Filled Form Link (Add-product / Initial product only) */}
                            {!(isRemoveProduct || isChangeIngredients) && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewProductModal({
                                    isOpen: true,
                                    formData: formData && Object.keys(formData).length > 0 ? formData : {
                                      product_name: p.name,
                                      product_code: p.code,
                                      company_name_address: form.company_name
                                    },
                                    product: p,
                                    company: application?.client_id
                                  });
                                }}
                                style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', padding: '4px 8px', flexShrink: 0 }}
                              >
                                <Eye size={13} style={{ marginRight: 4 }} /> View Form
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowApproveProductsModal(false)}
                disabled={isFinalizing}
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSendHighlightedProductsToClient}
                disabled={isFinalizing || selectedApproveProducts.length === 0 || ((isRemoveProduct || isAddon) && !canManageProducts)}
                title={((isRemoveProduct || isAddon) && !canManageProducts) ? 'Only Food Tech, Food Tech Manager, or Admin can perform this action' : ''}
                className="btn btn-primary"
                style={{
                  background: isRemoveProduct ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #15803d, #16a34a)',
                  borderColor: isRemoveProduct ? '#dc2626' : '#15803d',
                  color: '#fff',
                  fontWeight: 800,
                  padding: '10px 22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 10,
                  boxShadow: isRemoveProduct ? '0 4px 12px rgba(220, 38, 38, 0.25)' : '0 4px 12px rgba(22, 163, 74, 0.25)',
                  opacity: (isFinalizing || selectedApproveProducts.length === 0 || ((isRemoveProduct || isAddon) && !canManageProducts)) ? 0.6 : 1
                }}
              >
                {isFinalizing ? (
                  <>
                    <span className="spinner-white" /> {isRemoveProduct ? 'Removing Products...' : (isInitialProduct ? 'Sending for Audit...' : 'Sending to Client Dashboard...')}
                  </>
                ) : (
                  <>
                    {isRemoveProduct ? <Trash2 size={16} strokeWidth={2.5} /> : <CheckCircle2 size={16} strokeWidth={2.5} />}
                    {isRemoveProduct ? 'Confirm Remove Selected Products' : (isInitialProduct ? 'Send for Audit' : 'Send highlighted products to client dashboard')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Approval Request Form Full 3-Page Modal Viewer */}
      <ProductApprovalModal
        isOpen={viewProductModal.isOpen}
        onClose={() => setViewProductModal(prev => ({ ...prev, isOpen: false }))}
        formData={viewProductModal.formData}
        product={viewProductModal.product}
        company={viewProductModal.company}
      />

      <NextSurveillanceDateModal
        isOpen={showNextSurvModal}
        onClose={() => setShowNextSurvModal(false)}
        onConfirm={handleConfirmNextSurveillanceFromLogsheet}
        app={application || form}
        submitting={isFinalizing}
      />
    </div>
  );
}
