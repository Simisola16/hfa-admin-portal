import { getPdfUrl } from '../lib/pdfUtils';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, FileText, Award, ShieldCheck, Download, ExternalLink, 
  RefreshCw, Eye, Calendar, Building2, MapPin, Package, 
  Check, Sparkles, AlertTriangle, Layers, Info, CheckCircle2, ChevronRight
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { generateHfaId, normalizeHfaTypeCode } from '../lib/idGenerator';

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};


export const resolveCertificateType = (loadedApp, existingCert = null, procDetails = null, targetLogsheet = null) => {
  if (!loadedApp && !existingCert) return 'GSO MEAT';

  const checkAddOn = (item) => {
    if (!item) return false;
    if (item.is_add_on) return true;
    const typeStr = (item.application_type || '').toLowerCase();
    if (typeStr.includes('add')) return true;
    const num = item.application_number || '';
    if (num.startsWith('ADD-') || num.includes('-AD-')) return true;
    return false;
  };

  const isAddOn = checkAddOn(loadedApp);
  const isSurv = !isAddOn && (
    loadedApp?.application_type === 'surveillance' ||
    loadedApp?.type === 'surveillance' ||
    Boolean(loadedApp?.is_surveillance) ||
    String(loadedApp?.application_number || '').includes('-SU-') ||
    String(loadedApp?.category || '').toLowerCase().includes('surveillance')
  );

  // 1. Check explicit raw type from certificate, logsheet or application (prioritize reviewer suggested type)
  const candidateTypes = [
    existingCert?.certificate_type,
    targetLogsheet?.suggested_certificate_type,
    targetLogsheet?.certificate_type,
    targetLogsheet?.certificate_standard,
    loadedApp?.suggested_certificate_type,
    procDetails?.app?.suggested_certificate_type,
    procDetails?.logsheet?.suggested_certificate_type,
    procDetails?.logsheet?.certificate_type,
    procDetails?.logsheet?.certificate_standard,
    procDetails?.logsheets?.[0]?.suggested_certificate_type,
    procDetails?.logsheets?.[0]?.certificate_type,
    procDetails?.logsheets?.[0]?.certificate_standard,
    (typeof loadedApp?.certificate_id === 'object' ? loadedApp?.certificate_id?.certificate_type : null),
    (typeof loadedApp?.renewed_certificate_id === 'object' ? loadedApp?.renewed_certificate_id?.certificate_type : null),
    loadedApp?.certificate_type,
    loadedApp?.scheme,
    loadedApp?.standard_scheme,
    loadedApp?.standard,
    procDetails?.app?.certificate_type,
    procDetails?.app?.scheme,
    procDetails?.certificate?.certificate_type,
    procDetails?.agreement?.certificate_type,
    procDetails?.agreement?.scheme
  ].filter(Boolean);

  if (isSurv) {
    for (const raw of candidateTypes) {
      if (typeof raw === 'string' && raw.trim()) {
        const u = raw.toUpperCase().trim();
        if (u === 'GSO MEAT' || (u.includes('GSO') && u.includes('MEAT') && !u.includes('NON'))) return 'GSO MEAT';
        if (u === 'GSO NON MEAT' || (u.includes('GSO') && (u.includes('NON') || u.includes('FOOD')))) return 'GSO NON MEAT';
        if (u === 'HFA SCHEME MEAT' || (u.includes('HFA') && u.includes('MEAT') && !u.includes('NON'))) return 'HFA SCHEME MEAT';
        if (u === 'HFA SCHEME NON MEAT' || (u.includes('HFA') && (u.includes('NON') || u.includes('FOOD') || u.includes('GENERAL')))) return 'HFA SCHEME NON MEAT';
        if (u === 'COSMETICS' || u.includes('COSMETIC')) return 'COSMETICS';
        if (u === 'SMIIC' || u.includes('SMIIC')) return 'SMIIC';
      }
    }
    return 'UAE/GSO Halal Surveillance Letter';
  }

  for (const raw of candidateTypes) {
    if (typeof raw === 'string' && raw.trim()) {
      const u = raw.toUpperCase().trim();
      if (u === 'GSO MEAT' || u === 'GSO SCHEME (MEAT)' || u === 'GSO (MEAT)' || (u.includes('GSO') && u.includes('MEAT') && !u.includes('NON'))) {
        return 'GSO MEAT';
      }
      if (u === 'GSO NON MEAT' || u === 'GSO NON-MEAT' || u === 'GSO SCHEME (NON-MEAT)' || u === 'GSO (NON-MEAT)' || u === 'GSO SCHEME NON MEAT' || (u.includes('GSO') && (u.includes('NON') || u.includes('FOOD')))) {
        return 'GSO NON MEAT';
      }
      if (u === 'HFA SCHEME MEAT' || u === 'HFA SCHEME (MEAT)' || u === 'HFA MEAT SCHEME' || u === 'HFA MEAT' || (u.includes('HFA') && u.includes('MEAT') && !u.includes('NON'))) {
        return 'HFA SCHEME MEAT';
      }
      if (u === 'HFA SCHEME NON MEAT' || u === 'HFA SCHEME (NON-MEAT)' || u === 'HFA NON-MEAT SCHEME' || u === 'HFA SCHEME NON-MEAT' || u === 'HFA NON MEAT' || (u.includes('HFA') && (u.includes('NON') || u.includes('FOOD') || u.includes('GENERAL')))) {
        return 'HFA SCHEME NON MEAT';
      }
      if (u === 'COSMETICS' || u.includes('COSMETIC')) {
        return 'COSMETICS';
      }
      if (u === 'SMIIC' || u.includes('SMIIC')) {
        return 'SMIIC';
      }
    }
  }

  // 2. Deduce accurately from category, scope, nature of business, products, and route context
  const cat = String(loadedApp?.category || '').toLowerCase();
  const scope = String(loadedApp?.scope || '').toLowerCase();
  const foodNature = String(loadedApp?.food_nature || '').toLowerCase();
  const nonfoodNature = String(loadedApp?.nonfood_nature || '').toLowerCase();
  const appType = String(loadedApp?.application_type || '').toLowerCase();
  const appNum = String(loadedApp?.application_number || '').toUpperCase();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';

  const combined = `${cat} ${scope} ${foodNature} ${nonfoodNature}`;

  if (nonfoodNature.includes('cosmetic') || combined.includes('cosmetic')) {
    return 'COSMETICS';
  }

  if (combined.includes('smiic')) {
    return 'SMIIC';
  }

  const isGSO = (
    cat.includes('gso') ||
    cat.includes('uae') ||
    cat.includes('dual') ||
    scope.includes('gso') ||
    scope.includes('uae') ||
    appType.includes('gso') ||
    appNum.includes('-GS-') ||
    appNum.includes('-GSO-') ||
    currentPath.includes('/gso/')
  );

  const hasMeatSignal = (
    (cat.includes('meat') && !cat.includes('non')) ||
    foodNature.includes('meat') ||
    (scope.includes('meat') && !scope.includes('non')) ||
    scope.includes('slaughter') ||
    scope.includes('abattoir') ||
    scope.includes('poultry') ||
    scope.includes('beef') ||
    scope.includes('lamb') ||
    scope.includes('chicken')
  );

  let prodsMeat = false;
  const prods = loadedApp?.products || [];
  if (Array.isArray(prods) && prods.length > 0) {
    prodsMeat = prods.some(p => {
      const pText = `${p?.name || ''} ${p?.category || ''} ${p?.description || ''}`.toLowerCase();
      return (pText.includes('meat') && !pText.includes('non')) || pText.includes('beef') || pText.includes('poultry') || pText.includes('chicken') || pText.includes('lamb');
    });
  }

  const isMeat = hasMeatSignal || prodsMeat;

  if (isGSO) {
    return isMeat ? 'GSO MEAT' : 'GSO NON MEAT';
  }

  // HFA standard schemes (Annual Certification - Food & General vs Meat Processing)
  if (isMeat) {
    return 'HFA SCHEME MEAT';
  }
  return 'HFA SCHEME NON MEAT';
};

export default function CertificateModal({ isOpen, onClose, app: propApp, appId: propAppId, isAddOn: propIsAddOn, logsheet: propLogsheet, onSuccess }) {
  const navigate = useNavigate();
  const [app, setApp] = useState(propApp || null);
  const [logsheet, setLogsheet] = useState(propLogsheet || null);
  const [loading, setLoading] = useState(false);
  const [currentTypeCode, setCurrentTypeCode] = useState('NE');
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'products' | 'upload'

  // Live preview state
  const [livePreviewUrl, setLivePreviewUrl] = useState('');
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [suggestedCertType, setSuggestedCertType] = useState('');
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (propLogsheet) setLogsheet(propLogsheet);
  }, [propLogsheet]);

  const isFourDateType = (type) => {
    if (!type) return false;
    const t = type.toUpperCase().trim();
    return t.includes('GSO') || t === 'SMIIC' || t.includes('SMIIC');
  };

  const [certificateForm, setCertificateForm] = useState(() => ({
    certificate_number: '',
    certificate_type: resolveCertificateType(propApp, null, null, propLogsheet),
    company_name: '',
    company_address: '',
    manufacturing_address: '',
    scope: '',
    issue_date: '',
    current_cycle_start_date: '',
    original_cycle_start_date: '',
    certification_start_date: '',
    expiry_date: '',
    products_covered: '',
    product_table_columns: 1,
    file: null
  }));
  const [scheduledProducts, setScheduledProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [underReviewPopup, setUnderReviewPopup] = useState(null);

  const checkIsAddOn = (item) => {
    if (!item) return Boolean(propIsAddOn);
    if (propIsAddOn || item.is_add_on) return true;
    const typeStr = (item.application_type || '').toLowerCase();
    if (typeStr.includes('add')) return true;
    const num = item.application_number || '';
    if (num.startsWith('ADD-') || num.includes('-AD-')) return true;
    if (Array.isArray(item.products) && item.products.some(p => p && p.type && typeof p.type === 'string' && (p.type.includes('Add') || p.type.includes('Remove') || p.type.includes('Change')))) return true;
    return false;
  };

  const isSurveillance = Boolean(
    app?.application_type === 'surveillance' ||
    propApp?.application_type === 'surveillance' ||
    app?.type === 'surveillance' ||
    app?.is_surveillance ||
    String(app?.application_number || propApp?.application_number || '').includes('-SU-') ||
    String(app?.category || propApp?.category || '').toLowerCase().includes('surveillance')
  );
  const targetAppId = getCleanId(propAppId) || getCleanId(propApp);

  const initForm = (loadedApp, existingCert = null, loadedInitProd = null, procDetails = null, clientProducts = [], targetLogsheet = null) => {
    if (!loadedApp) return;
    const activeLogsheet = targetLogsheet || propLogsheet || logsheet || procDetails?.logsheet || null;
    const isAddOn = checkIsAddOn(loadedApp) || checkIsAddOn(propApp);
    const isSurv = !isAddOn && (
      loadedApp.application_type === 'surveillance' ||
      loadedApp.type === 'surveillance' ||
      Boolean(loadedApp.is_surveillance) ||
      String(loadedApp.application_number || '').includes('-SU-') ||
      String(loadedApp.category || '').toLowerCase().includes('surveillance')
    );
    const isRenApp = Boolean(
      String(loadedApp.application_type || '').toLowerCase().includes('renewal') ||
      String(loadedApp.type || '').toLowerCase().includes('renewal') ||
      Boolean(loadedApp.is_renewal) ||
      Boolean(loadedApp.renewed_certificate_id) ||
      String(loadedApp.application_number || '').includes('-RE-') ||
      String(loadedApp.category || '').toLowerCase().includes('renewal')
    );
    const isNewApp = !isRenApp && !isAddOn && !isSurv;

    // Extract reviewer suggested certificate type if present
    const rawSuggested =
      activeLogsheet?.suggested_certificate_type ||
      activeLogsheet?.certificate_type ||
      activeLogsheet?.certificate_standard ||
      loadedApp?.suggested_certificate_type ||
      procDetails?.app?.suggested_certificate_type ||
      procDetails?.logsheets?.[0]?.suggested_certificate_type ||
      procDetails?.logsheets?.[0]?.certificate_type ||
      procDetails?.logsheets?.[0]?.certificate_standard ||
      procDetails?.logsheet?.suggested_certificate_type ||
      procDetails?.logsheet?.certificate_type ||
      procDetails?.logsheet?.certificate_standard ||
      loadedApp?.certificate_type ||
      '';

    let matchedSuggested = '';
    if (rawSuggested) {
      const u = String(rawSuggested).toUpperCase().trim();
      if (u === 'GSO MEAT' || (u.includes('GSO') && u.includes('MEAT') && !u.includes('NON'))) matchedSuggested = 'GSO MEAT';
      else if (u === 'GSO NON MEAT' || (u.includes('GSO') && (u.includes('NON') || u.includes('FOOD')))) matchedSuggested = 'GSO NON MEAT';
      else if (u === 'HFA SCHEME MEAT' || (u.includes('HFA') && u.includes('MEAT') && !u.includes('NON'))) matchedSuggested = 'HFA SCHEME MEAT';
      else if (u === 'HFA SCHEME NON MEAT' || (u.includes('HFA') && (u.includes('NON') || u.includes('FOOD') || u.includes('GENERAL')))) matchedSuggested = 'HFA SCHEME NON MEAT';
      else if (u.includes('COSMETIC')) matchedSuggested = 'COSMETICS';
      else if (u.includes('SMIIC')) matchedSuggested = 'SMIIC';
      else matchedSuggested = rawSuggested;
      setSuggestedCertType(matchedSuggested);
    } else {
      setSuggestedCertType('');
    }

    // Automatically resolve Certificate Type strictly from application data & reviewer suggestion
    const resolvedCertType = (matchedSuggested && !isSurv)
      ? matchedSuggested
      : resolveCertificateType(loadedApp, existingCert, procDetails, activeLogsheet);

    const isFour = isFourDateType(resolvedCertType);
    const yearsToAdd = isSurv ? 1 : (isFour ? 3 : 1);

    const resolvedIssueDate = existingCert?.issue_date
      ? new Date(existingCert.issue_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const expDate = new Date(resolvedIssueDate);
    expDate.setFullYear(expDate.getFullYear() + yearsToAdd);
    const resolvedExpiryDate = existingCert?.expiry_date
      ? new Date(existingCert.expiry_date).toISOString().split('T')[0]
      : expDate.toISOString().split('T')[0];

    const resolvedCurrentCycle = existingCert?.current_cycle_start_date
      ? new Date(existingCert.current_cycle_start_date).toISOString().split('T')[0]
      : (existingCert?.issue_date ? new Date(existingCert.issue_date).toISOString().split('T')[0] : resolvedIssueDate);

    const resolvedOrigCycle = existingCert?.original_cycle_start_date
      ? new Date(existingCert.original_cycle_start_date).toISOString().split('T')[0]
      : (existingCert?.issue_date ? new Date(existingCert.issue_date).toISOString().split('T')[0] : resolvedIssueDate);

    const resolvedCertStart = existingCert?.certification_start_date
      ? new Date(existingCert.certification_start_date).toISOString().split('T')[0]
      : (existingCert?.issue_date ? new Date(existingCert.issue_date).toISOString().split('T')[0] : resolvedIssueDate);

    const companyName = existingCert?.company_name || loadedApp.establishment_name || loadedApp.client_id?.company_name || loadedApp.profiles?.company_name || loadedApp.client_id?.full_name || 'HFA Client';
    const companyAddress = existingCert?.company_address || loadedApp.establishment_address || loadedApp.client_id?.address || loadedApp.profiles?.address || '';
    const manufacturingAddress = existingCert?.manufacturing_address || loadedApp.manufacturer_address || loadedApp.site_id?.address || loadedApp.establishment_address || companyAddress;
    const scope = existingCert?.scope || loadedApp.scope || loadedApp.category || 'Production & Supply of Halal Certified Products';

    // Resolve certified products strictly based on application type
    let resolvedProductItems = [];

    if (isRenApp) {
      // 1. For Renewal applications: Show products belonging specifically to the renewal site
      const appSiteIdStr = String(
        (loadedApp.site_id && typeof loadedApp.site_id === 'object' ? loadedApp.site_id._id : loadedApp.site_id) ||
        (loadedApp.site && typeof loadedApp.site === 'object' ? loadedApp.site._id : loadedApp.site) ||
        ''
      );

      const allProductSources = [
        ...(Array.isArray(clientProducts) ? clientProducts : []),
        ...(Array.isArray(procDetails?.products) ? procDetails.products : []),
        ...(Array.isArray(procDetails?.allProducts) ? procDetails.allProducts : []),
        ...(Array.isArray(loadedApp?.products) ? loadedApp.products : []),
        ...(Array.isArray(loadedApp?.site?.products) ? loadedApp.site.products : []),
        ...(Array.isArray(procDetails?.app?.site?.products) ? procDetails.app.site.products : []),
        ...(Array.isArray(loadedApp?.site_id?.products) ? loadedApp.site_id.products : [])
      ];

      // Filter products belonging to this specific renewal site if site ID exists
      let candidateProducts = allProductSources;
      if (appSiteIdStr) {
        const siteSpecific = allProductSources.filter(p => {
          if (!p) return false;
          const pSiteId = String(
            (p.site_id && typeof p.site_id === 'object' ? p.site_id._id : p.site_id) || ''
          );
          return pSiteId === appSiteIdStr;
        });
        if (siteSpecific.length > 0) {
          candidateProducts = siteSpecific;
        }
      }

      candidateProducts.forEach((p, idx) => {
        if (!p) return;
        const pName = (p.name || p.title || p.new_name || '').trim();
        if (pName && !resolvedProductItems.some(r => r.name.toLowerCase() === pName.toLowerCase())) {
          resolvedProductItems.push({
            id: p._id ? String(p._id) : (p.id ? String(p.id) : `prd-${idx}`),
            name: pName,
            code: p.code || p.barcode || `PRD-${String(resolvedProductItems.length + 1).padStart(2, '0')}`,
            category: p.category || loadedApp?.category || 'Halal Certified',
            ingredients: Array.isArray(p.ingredients) ? p.ingredients.join(', ') : (p.ingredients || ''),
            description: p.description || '',
            isSelected: true
          });
        }
      });

      // Fallback to previous/existing certificate products_covered if no product documents found
      if (resolvedProductItems.length === 0 && existingCert?.products_covered) {
        let ep = existingCert.products_covered;
        let epList = [];
        if (Array.isArray(ep)) {
          epList = ep;
        } else if (typeof ep === 'string' && ep.trim()) {
          try {
            const parsed = JSON.parse(ep);
            epList = Array.isArray(parsed) ? parsed : ep.split(',').map(s => s.trim()).filter(Boolean);
          } catch (_) {
            epList = ep.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
        epList.forEach((item, idx) => {
          const pName = typeof item === 'string' ? item.trim() : (item.name || item.title || '').trim();
          if (pName && !resolvedProductItems.some(r => r.name.toLowerCase() === pName.toLowerCase())) {
            resolvedProductItems.push({
              id: `ep-${idx}`,
              name: pName,
              code: typeof item === 'object' && item.code ? item.code : `PRD-${String(idx + 1).padStart(2, '0')}`,
              category: typeof item === 'object' && item.category ? item.category : (loadedApp?.category || 'Halal Certified'),
              isSelected: true
            });
          }
        });
      }
    } else if (isNewApp) {
      // 2. For New applications: Strictly show Initial Product Schedule
      const initProd = loadedInitProd || loadedApp?.initial_product || loadedApp?.initialProduct || procDetails?.initialProduct || propApp?.initial_product || propApp?.initialProduct;
      if (initProd) {
        if (initProd.product && (initProd.product.name || initProd.product.title)) {
          resolvedProductItems.push({
            id: 'init-0',
            name: (initProd.product.name || initProd.product.title).trim(),
            code: initProd.product.code || 'PRD-01',
            category: initProd.product.category || loadedApp?.category || 'Halal Certified',
            ingredients: Array.isArray(initProd.product.ingredients) ? initProd.product.ingredients.join(', ') : (initProd.product.ingredients || ''),
            description: initProd.product.description || '',
            isSelected: true
          });
        }
        if (Array.isArray(initProd.products) && initProd.products.length > 0) {
          initProd.products.forEach((p, idx) => {
            const pName = (p.name || p.title || '').trim();
            if (pName && !resolvedProductItems.some(r => r.name.toLowerCase() === pName.toLowerCase())) {
              resolvedProductItems.push({
                id: `init-${idx + 1}`,
                name: pName,
                code: p.code || `PRD-${String(resolvedProductItems.length + 1).padStart(2, '0')}`,
                category: p.category || loadedApp?.category || 'Halal Certified',
                ingredients: Array.isArray(p.ingredients) ? p.ingredients.join(', ') : (p.ingredients || ''),
                description: p.description || '',
                isSelected: true
              });
            }
          });
        }
      }
    } else if (isAddOn) {
      // 3. For Add-On applications: Show updated product changes
      if (Array.isArray(loadedApp?.products) && loadedApp.products.length > 0) {
        for (const p of loadedApp.products) {
          if (!p) continue;
          const pType = p.type || 'Add product';
          const pName = (p.new_name || p.name || p.title || '').trim();
          const origName = (p.original_name || p.name || '').trim();

          if (pType === 'Add product' || !p.type) {
            if (pName && !resolvedProductItems.some(r => r.name.toLowerCase() === pName.toLowerCase())) {
              resolvedProductItems.push({
                id: p._id ? String(p._id) : `addon-${resolvedProductItems.length}`,
                name: pName,
                code: p.code || `PRD-${String(resolvedProductItems.length + 1).padStart(2, '0')}`,
                category: p.category || loadedApp?.category || 'Halal Certified',
                isSelected: true
              });
            }
          } else if (pType === 'Remove product') {
            if (origName) {
              resolvedProductItems = resolvedProductItems.filter(item => item.name.toLowerCase() !== origName.toLowerCase());
            }
          } else if (pType === 'Change name/code') {
            if (origName && pName) {
              const idx = resolvedProductItems.findIndex(r => r.name.toLowerCase() === origName.toLowerCase());
              if (idx !== -1) {
                resolvedProductItems[idx].name = pName;
                if (p.code) resolvedProductItems[idx].code = p.code;
              } else if (!resolvedProductItems.some(r => r.name.toLowerCase() === pName.toLowerCase())) {
                resolvedProductItems.push({
                  id: p._id ? String(p._id) : `addon-${resolvedProductItems.length}`,
                  name: pName,
                  code: p.code || `PRD-${String(resolvedProductItems.length + 1).padStart(2, '0')}`,
                  category: p.category || loadedApp?.category || 'Halal Certified',
                  isSelected: true
                });
              }
            }
          }
        }
      }
    }

    setScheduledProducts(resolvedProductItems);
    const prods = resolvedProductItems.filter(p => p.isSelected !== false).map(p => p.name).join(', ');

    const certTypeCode = isAddOn ? 'AD' : normalizeHfaTypeCode(loadedApp.application_type);
    setCurrentTypeCode(certTypeCode);

    // Only reuse existingCert.certificate_number if it is an in-progress draft/under-review certificate created for THIS specific application
    const isDraftForThisApp = existingCert && 
      String(existingCert.application_id?._id || existingCert.application_id) === String(loadedApp._id || loadedApp.id) && 
      ['under_review', 'draft'].includes(existingCert.status);

    let resolvedCertNo = '';
    if (isDraftForThisApp && existingCert?.certificate_number) {
      resolvedCertNo = existingCert.certificate_number;
      if (isAddOn && resolvedCertNo.includes('-NE-')) {
        resolvedCertNo = resolvedCertNo.replace('-NE-', '-AD-');
      }
    } else {
      // Always generate a fresh unique certificate number for renewals and new certificate issuances
      resolvedCertNo = generateHfaId(companyName, isRenApp ? 'RE' : certTypeCode);
    }

    const initialFormData = {
      certificate_number: resolvedCertNo,
      certificate_type: resolvedCertType,
      company_name: companyName,
      company_address: companyAddress,
      manufacturing_address: manufacturingAddress,
      scope,
      issue_date: resolvedIssueDate,
      expiry_date: resolvedExpiryDate,
      current_cycle_start_date: resolvedCurrentCycle,
      original_cycle_start_date: resolvedOrigCycle,
      certification_start_date: resolvedCertStart,
      products_covered: prods,
      product_table_columns: Number(existingCert?.product_table_columns || 1),
      file: null
    };

    setCertificateForm(initialFormData);

    // If existing cert has a rendered URL, use it as default preview
    if (existingCert?.certificate_url) {
      setLivePreviewUrl(getPdfUrl(existingCert.certificate_url));
    }
  };

  const handleSetYears = (years) => {
    const isFour = isFourDateType(certificateForm.certificate_type);
    const enforcedYears = isFour ? 3 : 1;
    const baseDate = certificateForm.issue_date ? new Date(certificateForm.issue_date) : new Date();
    if (isNaN(baseDate.getTime())) return;
    const d = new Date(baseDate);
    d.setFullYear(d.getFullYear() + enforcedYears);
    setCertificateForm(f => ({ ...f, expiry_date: d.toISOString().split('T')[0] }));
  };

  const handleTypeChange = (newType) => {
    const isFour = isFourDateType(newType);
    const years = isFour ? 3 : 1;
    const baseDate = certificateForm.issue_date ? new Date(certificateForm.issue_date) : new Date();
    let newExpiry = certificateForm.expiry_date;
    if (!isNaN(baseDate.getTime())) {
      const d = new Date(baseDate);
      d.setFullYear(d.getFullYear() + years);
      newExpiry = d.toISOString().split('T')[0];
    }

    setCertificateForm(f => ({
      ...f,
      certificate_type: newType,
      expiry_date: newExpiry,
      current_cycle_start_date: f.current_cycle_start_date || f.issue_date,
      original_cycle_start_date: f.original_cycle_start_date || f.issue_date,
      certification_start_date: f.certification_start_date || f.issue_date
    }));
  };

  const toggleProductSelect = (idx) => {
    setScheduledProducts(prev => {
      const next = prev.map((item, i) => i === idx ? { ...item, isSelected: !item.isSelected } : item);
      const selectedNames = next.filter(p => p.isSelected !== false).map(p => p.name).join(', ');
      setCertificateForm(f => ({ ...f, products_covered: selectedNames }));
      return next;
    });
  };

  const toggleSelectAllProducts = () => {
    setScheduledProducts(prev => {
      const anySelected = prev.some(p => p.isSelected !== false);
      const next = prev.map(item => ({ ...item, isSelected: !anySelected }));
      const selectedNames = next.filter(p => p.isSelected !== false).map(p => p.name).join(', ');
      setCertificateForm(f => ({ ...f, products_covered: selectedNames }));
      return next;
    });
  };

  // Generate Live PDF Preview function
  const generateLivePreview = useCallback(async (silent = false) => {
    if (isSurveillance) return; // Surveillance uses letter upload
    if (!certificateForm.certificate_number) return;

    setGeneratingPreview(true);
    setPreviewError('');

    try {
      const selectedItems = scheduledProducts.filter(p => p.isSelected !== false);
      const parsedProducts = selectedItems.length > 0
        ? selectedItems
        : (certificateForm.products_covered
            ? certificateForm.products_covered.split(',').map((p, idx) => ({
                name: p.trim(),
                code: `PRD-${String(idx + 1).padStart(2, '0')}`,
                category: 'Halal Certified'
              })).filter(p => p.name)
            : [{ name: 'Certified Halal Products Schedule', code: 'PRD-01', category: 'Halal Certified' }]);

      const isFour = isFourDateType(certificateForm.certificate_type);

      const res = await api.post('/api/certificates/preview-live', {
        certificate_type: certificateForm.certificate_type,
        certificate_number: certificateForm.certificate_number,
        company_name: certificateForm.company_name || app?.establishment_name || 'Valued Halal Client',
        company_address: certificateForm.company_address || app?.establishment_address || 'Registered Business Address',
        manufacturing_address: certificateForm.manufacturing_address || certificateForm.company_address || 'Manufacturing Facility Address',
        scope: certificateForm.scope || app?.scope || 'Production & Supply of Halal Certified Products',
        product_category: certificateForm.scope || app?.category || 'Halal Certified',
        issue_date: certificateForm.issue_date,
        expiry_date: certificateForm.expiry_date,
        certification_start_date: certificateForm.certification_start_date || certificateForm.issue_date,
        current_cycle_start_date: isFour ? certificateForm.current_cycle_start_date : certificateForm.issue_date,
        original_cycle_start_date: isFour ? certificateForm.original_cycle_start_date : certificateForm.issue_date,
        product_table_columns: certificateForm.product_table_columns,
        products: parsedProducts.length > 0 ? parsedProducts : [{ name: 'Certified Halal Products Schedule' }]
      });

      const url = res.previewUrl || res.data?.previewUrl;
      if (url) {
        setLivePreviewUrl(getPdfUrl(url));
        setPreviewKey(Date.now());
        if (!silent) toast.success('Live certificate preview updated!');
      }
    } catch (err) {
      console.warn('Live preview generation warning:', err.message);
      setPreviewError(err.response?.data?.error || err.message || 'Failed to render live preview');
    } finally {
      setGeneratingPreview(false);
    }
  }, [certificateForm, app, isSurveillance, scheduledProducts]);

  const hasInitializedRef = useRef(false);
  const currentAppIdRef = useRef(null);

  // Initial Load
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      currentAppIdRef.current = null;
      setUnderReviewPopup(null);
      setLivePreviewUrl('');
      setPreviewError('');
      return;
    }

    const appIdToUse = targetAppId || getCleanId(propApp?._id || propApp?.id);
    if (hasInitializedRef.current && currentAppIdRef.current === appIdToUse) {
      return;
    }

    hasInitializedRef.current = true;
    currentAppIdRef.current = appIdToUse;

    if (appIdToUse) {
      setLoading(true);
      const appFetchPromise = propApp
        ? Promise.resolve({ data: propApp })
        : api.get(`/api/applications/${appIdToUse}`).catch(() => api.get(`/api/add-on-applications/${appIdToUse}`));

      Promise.all([
        appFetchPromise,
        api.get(`/api/certificates/application/${appIdToUse}`).catch(() => ({ data: null })),
        api.get(`/api/initial-products/by-application/${appIdToUse}`).catch(() => ({ data: null })),
        api.get(`/api/applications/${appIdToUse}/processing-details`).catch(() => ({ data: null })),
        api.get(`/api/products`).catch(() => ({ data: [] })),
        api.get(`/api/application-logsheets/application/${appIdToUse}`)
          .catch(() => api.get(`/api/application-logsheets?application_id=${appIdToUse}`))
          .catch(() => ({ data: null }))
      ])
        .then(([appRes, certRes, initProdRes, procRes, prodsRes, logsheetRes]) => {
          const loadedApp = appRes.data?.data || appRes.data || null;
          let loadedCert = certRes.data?.data || certRes.data || null;
          const loadedInitProd = initProdRes.data?.data !== undefined ? initProdRes.data.data : (initProdRes.data || null);
          const procDetails = procRes.data?.data || procRes.data || null;
          const allDbProducts = prodsRes.data?.data || prodsRes.data || [];

          let loadedLogsheet = logsheetRes?.data?.data || logsheetRes?.data || null;
          if (Array.isArray(loadedLogsheet)) {
            loadedLogsheet = loadedLogsheet.find(l => l.source_type !== 'initial_product_application' && l.audit_type !== 'Initial Product Evaluation') || loadedLogsheet[0];
          }
          const activeLogsheet = propLogsheet || loadedLogsheet || procDetails?.logsheet || null;
          if (activeLogsheet) setLogsheet(activeLogsheet);

          if (!loadedCert && loadedApp?.certificate_id) {
            if (typeof loadedApp.certificate_id === 'object' && loadedApp.certificate_id.certificate_number) {
              loadedCert = loadedApp.certificate_id;
            }
          }

          const finalApp = loadedApp || propApp;
          const cId = finalApp?.client_id?._id || finalApp?.client_id;
          const sId = finalApp?.site_id?._id || finalApp?.site_id;

          const clientProducts = (Array.isArray(allDbProducts) ? allDbProducts : []).filter(p => {
            if (!p) return false;
            const pCId = p.client_id?._id || p.client_id;
            const pSId = p.site_id?._id || p.site_id;
            return (cId && String(pCId) === String(cId)) || (sId && String(pSId) === String(sId));
          });

          setApp(finalApp);
          initForm(finalApp, loadedCert, loadedInitProd || procDetails?.initialProduct, procDetails, clientProducts, activeLogsheet);
        })
        .catch((err) => {
          console.error("Failed to load certificate modal details:", err);
          const fallbackApp = propApp || null;
          setApp(fallbackApp);
          if (fallbackApp) {
            initForm(fallbackApp, fallbackApp.certificate_id, null, null, [], propLogsheet || logsheet);
          }
        })
        .finally(() => setLoading(false));
    } else if (propApp) {
      setApp(propApp);
      initForm(propApp, propApp.certificate_id, null, null, [], propLogsheet || logsheet);
    }
  }, [isOpen, targetAppId]);

  // Auto trigger preview generation on initial load when certificate number is ready
  useEffect(() => {
    if (isOpen && !loading && certificateForm.certificate_number && !isSurveillance && !livePreviewUrl) {
      const timer = setTimeout(() => {
        generateLivePreview(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, loading, certificateForm.certificate_number, isSurveillance, livePreviewUrl, generateLivePreview]);

  if (!isOpen) return null;

  if (underReviewPopup) {
    return (
      <div className="modal-overlay" style={{ zIndex: 1250, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)' }} onClick={() => { setUnderReviewPopup(null); onClose(); }}>
        <div className="modal" style={{ maxWidth: 480, borderRadius: 20, padding: 0, overflow: 'hidden', textAlign: 'center', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', padding: '36px 28px 24px', borderBottom: '1px solid #fde68a' }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#ffffff',
              border: '3px solid #f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#d97706',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)'
            }}>
              <ShieldCheck size={32} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#78350f', margin: '0 0 8px' }}>
              Certificate is Under Committee Review
            </h3>
            <p style={{ fontSize: 14, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
              Official Certificate <strong>{underReviewPopup.certNumber}</strong> for <strong>{underReviewPopup.companyName}</strong> has been created and submitted for QA & Committee Review.
            </p>
          </div>
          <div style={{ padding: '24px 28px', display: 'flex', gap: 12, justifyContent: 'center', background: 'white' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '12px 32px', fontWeight: 800, background: '#d97706', borderColor: '#b45309', borderRadius: 10, fontSize: 14 }}
              onClick={() => {
                setUnderReviewPopup(null);
                onClose();
              }}
            >
              OK, Got It
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="modal-overlay" style={{ zIndex: 1200, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="modal" style={{ maxWidth: 500, padding: 48, textAlign: 'center', borderRadius: 16 }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }} />
        <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 16 }}>Preparing Certificate Studio...</div>
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Loading application information and certificate parameters</div>
      </div>
    </div>
  );
  if (!app) return (
    <div className="modal-overlay" style={{ zIndex: 1200, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 450, padding: 32, textAlign: 'center', borderRadius: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <AlertTriangle size={24} />
        </div>
        <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 16 }}>Application Information Unavailable</div>
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 6, marginBottom: 20 }}>
          Unable to retrieve application details for certificate generation.
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );

  const normAppStatus = (app?.status || '').toLowerCase().replace(/ /g, '_');
  const isRen = (
    String(app?.application_type || '').toLowerCase().includes('renewal') ||
    String(app?.type || '').toLowerCase().includes('renewal') ||
    Boolean(app?.is_renewal) ||
    Boolean(app?.renewed_certificate_id) ||
    String(app?.application_number || '').includes('-RE-') ||
    String(app?.category || '').toLowerCase().includes('renewal')
  );
  const isSurv = isSurveillance || (
    String(app?.application_type || '').toLowerCase().includes('surveillance') ||
    String(app?.type || '').toLowerCase().includes('surveillance') ||
    Boolean(app?.is_surveillance) ||
    String(app?.application_number || '').includes('-SU-') ||
    String(app?.category || '').toLowerCase().includes('surveillance')
  );
  const isRenApp = isRen;
  const isNewApp = !isRen && !isSurv && !checkIsAddOn(app || propApp);
  const isFastTrack = isRen || isSurv;
  const isFastTrackPaid = isFastTrack && (normAppStatus === 'payment_received' || Boolean(app?.initial_payment_confirmed || app?.initial_invoice_paid));
  const isFinalFeePaid = normAppStatus === 'final_invoice_paid' || Boolean(app?.final_payment_confirmed || app?.final_invoice_paid);
  const isAppReadyForCert = isFinalFeePaid || isFastTrackPaid || ['final_invoice_paid', 'ready_for_certificate', 'certificate_issued', 'waiting_for_certificate', 'payment_received'].includes(normAppStatus);

  const handleSubmit = async () => {
    if (!isSurveillance && !isAppReadyForCert) {
      toast.error('Certificate issuance unlocks once initial processing, evaluations, and approvals are complete.');
      return;
    }
    const isFour = isFourDateType(certificateForm.certificate_type);
    if (!certificateForm.certificate_number.trim()) {
      toast.error(isSurveillance ? 'Please enter a Surveillance Letter reference number.' : 'Please enter a certificate number.');
      return;
    }
    if (!certificateForm.issue_date) {
      toast.error('Please enter the issue date.');
      return;
    }
    if (!certificateForm.expiry_date) {
      toast.error(isSurveillance ? 'Please enter the next audit / milestone date.' : 'Please enter the expiry date.');
      return;
    }

    if (!isSurveillance) {
      if (isFour) {
        if (!certificateForm.current_cycle_start_date) {
          toast.error('Please enter the current cycle start date for GSO/SMIIC scheme.');
          return;
        }
        if (!certificateForm.original_cycle_start_date) {
          toast.error('Please enter the original cycle start date for GSO/SMIIC scheme.');
          return;
        }
      } else {
        if (!certificateForm.certification_start_date) {
          toast.error('Please enter the certification start date.');
          return;
        }
      }
    }

    if (isSurveillance && !certificateForm.file) {
      toast.error('Please upload the official Surveillance Letter PDF document.');
      return;
    }

    setSubmitting(true);
    try {
      const appId = getCleanId(app._id || app.id || app);

      if (isSurveillance) {
        try {
          const formData = new FormData();
          formData.append('letter_number', certificateForm.certificate_number);
          formData.append('issue_date', certificateForm.issue_date);
          formData.append('next_due_date', certificateForm.expiry_date);
          if (certificateForm.file) {
            formData.append('letter_file', certificateForm.file);
          }

          await api.post(`/api/applications/${appId}/issue-surveillance-letter`, formData, true);
        } catch (postErr) {
          console.warn('POST /issue-surveillance-letter error, attempting resilient status update fallback:', postErr);
          
          if (certificateForm.file) {
            try {
              await api.uploadPdf(certificateForm.file, 'surveillance-letters');
            } catch (uErr) {
              console.error('File upload error:', uErr);
            }
          }

          await api.put(`/api/applications/${appId}/status`, {
            status: 'certificate_issued',
            note: `Official Surveillance Letter issued (${certificateForm.certificate_number}). UAE/GSO 3-Year Halal Certification confirmed active.`
          });
        }

        toast.success('🎉 Official Surveillance Letter issued successfully!');
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      // Standard Certificate creation flow
      const formData = new FormData();
      formData.append('certificate_number', certificateForm.certificate_number);
      formData.append('certificate_type', certificateForm.certificate_type);
      formData.append('issue_date', certificateForm.issue_date);
      formData.append('expiry_date', certificateForm.expiry_date);

      if (isFour) {
        formData.append('current_cycle_start_date', certificateForm.current_cycle_start_date || certificateForm.issue_date);
        formData.append('original_cycle_start_date', certificateForm.original_cycle_start_date || certificateForm.issue_date);
        formData.append('certification_start_date', certificateForm.current_cycle_start_date || certificateForm.issue_date);
      } else {
        formData.append('certification_start_date', certificateForm.certification_start_date || certificateForm.issue_date);
        formData.append('current_cycle_start_date', certificateForm.certification_start_date || certificateForm.issue_date);
        formData.append('original_cycle_start_date', certificateForm.certification_start_date || certificateForm.issue_date);
      }

      const selectedItems = scheduledProducts.filter(p => p.isSelected !== false);
      const selectedProdsStr = selectedItems.map(p => p.name).join(', ');

      formData.append('products_covered', selectedProdsStr || certificateForm.products_covered || '');
      formData.append('product_details', JSON.stringify(selectedItems));
      if (certificateForm.product_table_columns) {
        formData.append('product_table_columns', certificateForm.product_table_columns);
      }
      if (certificateForm.file) {
        formData.append('certificate_file', certificateForm.file);
      }

      const clientId = getCleanId(app.client_id?._id || app.client_id?.id || app.client_id || app.profiles?._id || app.profiles?.id || app.profiles);
      if (!clientId) {
        throw new Error('Could not identify client ID for this application.');
      }
      formData.append('application_id', appId);
      formData.append('client_id', clientId);
      const siteId = getCleanId(app.site_id?._id || app.site_id?.id || app.site_id || app.certificate_id?.site_id || app.application_id?.site_id);
      if (!siteId) {
        throw new Error('Site selection is compulsory. This application has no associated site.');
      }
      formData.append('site_id', siteId);
      formData.append('company_name', certificateForm.company_name || app.establishment_name || app.client_id?.company_name || app.profiles?.company_name || app.client_id?.full_name || '');
      formData.append('company_address', certificateForm.company_address || app.establishment_address || app.client_id?.address || app.profiles?.address || '');
      formData.append('manufacturing_address', certificateForm.manufacturing_address || app.manufacturer_address || app.site_id?.address || app.establishment_address || '');
      formData.append('scope', certificateForm.scope || app.scope || app.application_id?.scope || 'Halal Food Certification');
      formData.append('status', 'under_review');
      if (checkIsAddOn(app)) {
        formData.append('is_add_on', 'true');
      }

      const certRes = await api.post('/api/certificates', formData, true);

      toast.success('Certificate created! Opening review studio...');
      if (onSuccess) onSuccess();
      // Navigate directly to the review page instead of showing a popup
      const createdCertId = certRes?.certificate?._id || certRes?.certificate?.id || certRes?._id || certRes?.id || certRes?.data?._id || certRes?.data?.id;
      if (createdCertId) {
        navigate(`/certificates/${createdCertId}/review`);
      } else {
        // Fallback: reload the page so the new cert status is reflected
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || (isSurveillance ? 'Failed to issue surveillance letter.' : 'Failed to issue certificate.'));
    } finally {
      setSubmitting(false);
    }
  };

  const isModalAddOn = checkIsAddOn(app);
  const displayCompanyName = certificateForm.company_name || app.establishment_name || app.profiles?.company_name || app.client_id?.company_name || app.client_id?.full_name || 'HFA Client';
  const displayCategory = isSurveillance
    ? 'UAE/GSO 3-Year Halal Scheme'
    : (app.category || app.application_id?.category || app.certificate_id?.certificate_type || certificateForm.certificate_type || 'Halal Certification');
  const isCurrentFourDate = isFourDateType(certificateForm.certificate_type);
  const isSubmitDisabled = submitting || (!isSurveillance && !isAppReadyForCert);

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        zIndex: 1200, 
        background: 'rgba(15, 23, 42, 0.75)', 
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }} 
      onClick={onClose}
    >
      <div 
        className="modal" 
        style={{ 
          maxWidth: 1240, 
          width: '96vw', 
          maxHeight: '94vh', 
          borderRadius: 20, 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.4)',
          background: '#f8fafc',
          padding: 0
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          style={{ 
            padding: '18px 28px', 
            background: isSurveillance ? 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)' : 'linear-gradient(135deg, #065f46 0%, #047857 100%)', 
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.18)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {isSurveillance ? <FileText size={24} /> : <Award size={24} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  {isSurveillance ? 'Issue Official Surveillance Letter' : 'Certificate Generation & Issuance Studio'}
                </h2>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 9px',
                  borderRadius: 20,
                  background: 'rgba(255, 255, 255, 0.22)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  letterSpacing: '0.04em'
                }}>
                  {app.application_number}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 9px',
                  borderRadius: 20,
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff'
                }}>
                  {displayCategory}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.85)', marginTop: 2 }}>
                {displayCompanyName} &bull; {app.site_name || app.site_id?.name || app.establishment_address || 'Main Facility Site'}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              cursor: 'pointer', 
              background: 'rgba(255, 255, 255, 0.15)', 
              border: 'none', 
              color: '#ffffff', 
              width: 34, 
              height: 34, 
              borderRadius: 8, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Split 2-Column Studio */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          
          {/* LEFT COLUMN: Configuration Controls (42% width) */}
          <div style={{ width: '42%', minWidth: 380, maxWidth: 520, borderRight: '1.5px solid #e2e8f0', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
            
            {/* Left Header / Notice */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: isSurveillance ? '#f0f9ff' : '#f8fafc' }}>
              <div style={{ fontSize: 12, color: isSurveillance ? '#0369a1' : '#15803d', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                <ShieldCheck size={16} />
                {isSurveillance ? 'Surveillance Letter Parameters' : 'Official Halal Certificate Configuration'}
              </div>
            </div>

            {/* Top Reviewer Recommendation Banner if available */}
            {suggestedCertType && (
              <div style={{
                background: '#f0fdf4',
                borderBottom: '1.5px solid #86efac',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: '#166534' }}>
                    <span style={{ fontWeight: 800 }}>Suggested Scheme: </span>
                    <strong style={{ color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 6 }}>
                      {suggestedCertType}
                    </strong>
                    <div style={{ fontSize: 10.5, color: '#15803d', opacity: 0.9, marginTop: 1 }}>
                      (Recommended during logsheet sign-off)
                    </div>
                  </div>
                </div>
                {certificateForm.certificate_type !== suggestedCertType && (
                  <button
                    type="button"
                    onClick={() => handleTypeChange(suggestedCertType)}
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Apply
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Form Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* 1. Certificate Reference */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 800, fontSize: 12.5, color: '#0f172a' }}>
                    {isSurveillance ? 'Letter Reference Number' : 'Certificate Number'} <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  {!isSurveillance && (
                    <button
                      type="button"
                      onClick={() => {
                        const newId = generateHfaId(displayCompanyName || 'HFA', currentTypeCode);
                        setCertificateForm(f => ({ ...f, certificate_number: newId }));
                      }}
                      style={{ background: 'none', border: 'none', color: '#047857', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: 0 }}
                    >
                      ↻ Regenerate ID
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="form-control"
                  value={certificateForm.certificate_number}
                  onChange={e => setCertificateForm(f => ({ ...f, certificate_number: e.target.value }))}
                  placeholder={isSurveillance ? 'e.g. HFA-SURV-2026-001' : (isModalAddOn ? 'e.g. HFA-AN-AD-45029' : 'e.g. HFA-CERT-2026-001')}
                  style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: '0.02em' }}
                />
              </div>

              {/* 2. Scheme / Type Selection */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label className="form-label" style={{ fontWeight: 800, fontSize: 12.5, color: '#0f172a', margin: 0 }}>
                    {isSurveillance ? 'Surveillance Scheme / Certificate Type' : 'Certificate Type / Scheme'} <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  {suggestedCertType && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Sparkles size={12} /> Reviewer suggestion available
                    </span>
                  )}
                </div>

                {/* Suggestion banner from the person that marked application successful */}
                {suggestedCertType && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                      <div style={{ fontSize: 12, color: '#166534' }}>
                        <span style={{ fontWeight: 800 }}>Suggested Type: </span>
                        <strong style={{ color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 6 }}>
                          {suggestedCertType}
                        </strong>
                        <div style={{ fontSize: 11, color: '#15803d', opacity: 0.9, marginTop: 2 }}>
                          (Suggestion provided when marking application successful)
                        </div>
                      </div>
                    </div>
                    {certificateForm.certificate_type !== suggestedCertType && (
                      <button
                        type="button"
                        onClick={() => handleTypeChange(suggestedCertType)}
                        style={{
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Use Suggestion
                      </button>
                    )}
                  </div>
                )}

                <select
                  className="form-control"
                  value={certificateForm.certificate_type}
                  onChange={e => handleTypeChange(e.target.value)}
                  style={{ fontWeight: 700, fontSize: 13 }}
                >
                  <option value="GSO MEAT">GSO MEAT</option>
                  <option value="GSO NON MEAT">GSO NON MEAT</option>
                  <option value="SMIIC">SMIIC</option>
                  <option value="HFA SCHEME MEAT">HFA SCHEME MEAT</option>
                  <option value="HFA SCHEME NON MEAT">HFA SCHEME NON MEAT</option>
                  <option value="COSMETICS">COSMETICS</option>
                  {isSurveillance && (
                    <option value="UAE/GSO Halal Surveillance Letter">UAE/GSO Halal Surveillance Letter</option>
                  )}
                </select>
              </div>

              {/* 3. Company & Addresses */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Company &amp; Facility Details On Certificate
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={certificateForm.company_name}
                    onChange={e => setCertificateForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="Company name as it will appear on certificate"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Registered Business Address
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={certificateForm.company_address}
                    onChange={e => setCertificateForm(f => ({ ...f, company_address: e.target.value }))}
                    placeholder="Registered business address"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Manufacturing Facility Address
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={certificateForm.manufacturing_address}
                    onChange={e => setCertificateForm(f => ({ ...f, manufacturing_address: e.target.value }))}
                    placeholder="Physical manufacturing site address"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Product Category
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={certificateForm.scope}
                    onChange={e => setCertificateForm(f => ({ ...f, scope: e.target.value }))}
                    placeholder="e.g. Food and Beverage, Meat Processing, etc."
                  />
                </div>
              </div>

              {/* 4. Dates Section */}
              {isSurveillance ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800, fontSize: 12 }}>
                      Letter Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={certificateForm.issue_date}
                      onChange={e => setCertificateForm(f => ({ ...f, issue_date: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800, fontSize: 12 }}>
                      Next Audit Due Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={certificateForm.expiry_date}
                      onChange={e => setCertificateForm(f => ({ ...f, expiry_date: e.target.value }))}
                    />
                  </div>
                </div>
              ) : isCurrentFourDate ? (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 6 }}>
                      4 Dates &bull; 3-Year GSO Cycle
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSetYears(3)}
                      style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '1px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}
                    >
                      +3 Yrs Validity
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 11.5, marginBottom: 3 }}>Issue Date *</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={certificateForm.issue_date}
                        onChange={e => {
                          const val = e.target.value;
                          setCertificateForm(f => ({
                            ...f,
                            issue_date: val,
                            current_cycle_start_date: f.current_cycle_start_date || val,
                            original_cycle_start_date: f.original_cycle_start_date || val
                          }));
                        }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 11.5, marginBottom: 3 }}>Expiry Date *</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={certificateForm.expiry_date}
                        onChange={e => setCertificateForm(f => ({ ...f, expiry_date: e.target.value }))}
                        style={{ fontWeight: 800, color: '#dc2626' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 11.5, marginBottom: 3 }}>Current Cycle Start *</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={certificateForm.current_cycle_start_date || certificateForm.issue_date}
                        onChange={e => setCertificateForm(f => ({ ...f, current_cycle_start_date: e.target.value }))}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 11.5, marginBottom: 3 }}>Original Cycle Start *</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={certificateForm.original_cycle_start_date || certificateForm.issue_date}
                        onChange={e => setCertificateForm(f => ({ ...f, original_cycle_start_date: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 6 }}>
                      3 Dates &bull; 1-Year Cycle
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSetYears(1)}
                      style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '1px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}
                    >
                      +1 Yr Validity
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 11.5, marginBottom: 3 }}>Issue Date *</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={certificateForm.issue_date}
                        onChange={e => {
                          const val = e.target.value;
                          setCertificateForm(f => ({
                            ...f,
                            issue_date: val,
                            certification_start_date: f.certification_start_date || val
                          }));
                        }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 11.5, marginBottom: 3 }}>Certification Start *</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={certificateForm.certification_start_date || certificateForm.issue_date}
                        onChange={e => setCertificateForm(f => ({ ...f, certification_start_date: e.target.value }))}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 11.5, marginBottom: 3 }}>Expiry Date *</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={certificateForm.expiry_date}
                        onChange={e => setCertificateForm(f => ({ ...f, expiry_date: e.target.value }))}
                        style={{ fontWeight: 800, color: '#dc2626' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Products Covered & Schedule Layout */}
              {!isSurveillance && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <label className="form-label" style={{ margin: 0, fontWeight: 800, fontSize: 12.5, color: '#0f172a' }}>
                        {isRenApp ? 'Products' : (isNewApp ? 'Initial Products' : 'Products')}
                      </label>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>
                          {scheduledProducts.filter(p => p.isSelected !== false).length} of {scheduledProducts.length} product{scheduledProducts.length !== 1 ? 's' : ''} selected
                        </span>
                        {scheduledProducts.length > 0 && (
                          <button
                            type="button"
                            onClick={toggleSelectAllProducts}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: '#047857',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            {scheduledProducts.every(p => p.isSelected !== false) ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Layout:</span>
                      {[1, 2, 3].map(cols => (
                        <button
                          key={cols}
                          type="button"
                          onClick={() => setCertificateForm(f => ({ ...f, product_table_columns: cols }))}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 800,
                            border: '1px solid',
                            cursor: 'pointer',
                            background: certificateForm.product_table_columns === cols ? '#047857' : '#f8fafc',
                            borderColor: certificateForm.product_table_columns === cols ? '#047857' : '#cbd5e1',
                            color: certificateForm.product_table_columns === cols ? '#ffffff' : '#475569'
                          }}
                        >
                          {cols} Col{cols > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scheduled Products Container with Selection Checkboxes */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '8px 10px',
                    maxHeight: 200,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    {scheduledProducts.length > 0 ? (
                      scheduledProducts.map((p, idx) => {
                        const isChecked = p.isSelected !== false;
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleProductSelect(idx)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: isChecked ? '#ffffff' : '#f1f5f9',
                              border: isChecked ? '1px solid #047857' : '1px solid #cbd5e1',
                              borderRadius: 6,
                              padding: '6px 10px',
                              fontSize: 12,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              opacity: isChecked ? 1 : 0.65
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleProductSelect(idx)}
                                onClick={e => e.stopPropagation()}
                                style={{
                                  accentColor: '#047857',
                                  width: 15,
                                  height: 15,
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                              />
                              <span style={{
                                fontWeight: 800,
                                fontSize: 10.5,
                                color: isChecked ? '#047857' : '#64748b',
                                background: isChecked ? '#ecfdf5' : '#e2e8f0',
                                border: isChecked ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                                borderRadius: 4,
                                padding: '1px 6px',
                                flexShrink: 0
                              }}>
                                {p.code || `PRD-${String(idx + 1).padStart(2, '0')}`}
                              </span>
                              <span style={{
                                fontWeight: isChecked ? 700 : 500,
                                color: isChecked ? '#0f172a' : '#64748b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {p.name}
                              </span>
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>
                              {p.category || 'Halal Certified'}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '12px 8px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                        <Package size={20} style={{ margin: '0 auto 4px', color: '#94a3b8' }} />
                        <div style={{ fontWeight: 600 }}>
                          {isRenApp ? 'No Site Products Found' : (isNewApp ? 'Initial Product Schedule' : 'Products Schedule')}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {isRenApp
                            ? 'No products registered under this renewal site.'
                            : (isNewApp
                                ? 'Initial product details from this application will be printed on the certificate schedule.'
                                : 'Product details will be printed on the certificate schedule.')}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={12} style={{ color: '#047857' }} /> Check or uncheck products to select which items are included on this certificate.
                  </div>
                </div>
              )}

              {/* 6. Custom Upload Option */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: 12.5, color: '#0f172a' }}>
                  {isSurveillance ? (
                    <span>Surveillance Letter PDF Document <span style={{ color: '#dc2626' }}>*</span></span>
                  ) : (
                    'Custom PDF Override (Optional)'
                  )}
                </label>
                <div
                  onClick={() => document.getElementById('certificate-file-shared').click()}
                  style={{
                    border: certificateForm.file ? '1.5px solid #10b981' : (isSurveillance ? '1.5px dashed #0284c7' : '1.5px dashed #cbd5e1'),
                    padding: '16px 14px', borderRadius: '10px',
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                    background: certificateForm.file ? '#f0fdf4' : (isSurveillance ? '#f0f9ff' : '#f8fafc')
                  }}
                >
                  <FileText size={24} style={{ color: certificateForm.file ? '#16a34a' : (isSurveillance ? '#0284c7' : '#94a3b8'), margin: '0 auto 6px' }} />
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: certificateForm.file ? '#15803d' : (isSurveillance ? '#0369a1' : '#334155') }}>
                    {certificateForm.file ? certificateForm.file.name : (isSurveillance ? 'Upload official Surveillance Letter PDF *' : 'Click to upload custom PDF (or leave blank for auto-generation)')}
                  </div>
                  <input
                    id="certificate-file-shared"
                    type="file"
                    hidden
                    accept=".pdf"
                    onChange={e => setCertificateForm(f => ({ ...f, file: e.target.files[0] }))}
                  />
                </div>
              </div>

            </div>

            {/* Left Footer Action: Refresh Preview */}
            {!isSurveillance && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11.5, color: '#64748b' }}>Updated parameters?</span>
                <button
                  type="button"
                  onClick={() => generateLivePreview(false)}
                  disabled={generatingPreview}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}
                >
                  <RefreshCw size={13} className={generatingPreview ? 'spin' : ''} />
                  {generatingPreview ? 'Rendering...' : 'Update Live Preview'}
                </button>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Live Visual Certificate Preview (58% width) */}
          <div style={{ flex: 1, background: '#f1f5f9', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            {/* Preview Toolbar */}
            <div style={{
              padding: '12px 20px',
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={18} style={{ color: '#047857' }} />
                <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                  Live Certificate Document Preview
                </span>
                {generatingPreview && (
                  <span style={{ fontSize: 11, color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={10} className="spin" /> Generating...
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {livePreviewUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => window.open(livePreviewUrl, '_blank')}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px' }}
                      title="Open full screen in new tab"
                    >
                      <ExternalLink size={13} /> Fullscreen
                    </button>
                    <a
                      href={livePreviewUrl}
                      download={`Certificate-${certificateForm.certificate_number || 'Preview'}.pdf`}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', textDecoration: 'none' }}
                      title="Download preview PDF"
                    >
                      <Download size={13} /> Download
                    </a>
                  </>
                )}
                {!isSurveillance && (
                  <button
                    type="button"
                    onClick={() => generateLivePreview(false)}
                    disabled={generatingPreview}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontWeight: 700 }}
                  >
                    <RefreshCw size={13} className={generatingPreview ? 'spin' : ''} /> Refresh
                  </button>
                )}
              </div>
            </div>

            {/* Iframe Preview Body */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isSurveillance ? (
                certificateForm.file ? (
                  <iframe
                    src={`${URL.createObjectURL(certificateForm.file)}#toolbar=0&navpanes=0&scrollbar=1`}
                    title="Surveillance Letter Preview"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#cbd5e1', padding: 32 }}>
                    <FileText size={48} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>Surveillance Letter Mode</div>
                    <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 360, margin: '8px auto 0' }}>
                      Upload the official signed Surveillance Letter PDF on the left to preview it here before publication.
                    </p>
                  </div>
                )
              ) : livePreviewUrl ? (
                <iframe
                  key={previewKey}
                  src={`${livePreviewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  title="Official Certificate Preview"
                  style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff' }}
                />
              ) : generatingPreview ? (
                <div style={{ textAlign: 'center', color: '#cbd5e1', padding: 32 }}>
                  <div className="spinner" style={{ margin: '0 auto 16px', width: 36, height: 36 }} />
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#f8fafc' }}>Rendering Certificate Document...</div>
                  <p style={{ fontSize: 12.5, color: '#94a3b8', maxWidth: 320, margin: '6px auto 0' }}>
                    Compiling official certificate styling, security seal, QR code, and products schedule.
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#cbd5e1', padding: 32 }}>
                  <Award size={52} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>Official Certificate Preview</div>
                  <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 360, margin: '8px auto 16px' }}>
                    Click below to generate and render the official live PDF preview for this application.
                  </p>
                  <button
                    type="button"
                    onClick={() => generateLivePreview(false)}
                    className="btn btn-primary"
                    style={{ background: '#10b981', borderColor: '#059669', fontWeight: 800, fontSize: 13 }}
                  >
                    <Sparkles size={15} /> Render Live Certificate Preview
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div 
          style={{ 
            padding: '16px 28px', 
            background: '#ffffff', 
            borderTop: '1px solid #e2e8f0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: 12.5, color: '#64748b' }}>
            Issuing this certificate will generate the official document and send it to <strong>Review Certificates (Pending Review)</strong> for QA verification.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={onClose} 
              disabled={submitting}
              style={{ fontWeight: 700, padding: '9px 20px' }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 800,
                fontSize: 13.5,
                padding: '10px 24px',
                background: isSurveillance ? '#0284c7' : 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                borderColor: isSurveillance ? '#0284c7' : '#047857',
                borderRadius: 10,
                boxShadow: '0 4px 12px rgba(6, 95, 70, 0.25)'
              }}
            >
              {submitting ? (
                <>
                  <span className="spinner-white" style={{ width: 16, height: 16 }} />
                  {isSurveillance ? 'Issuing Letter...' : 'Issuing Certificate...'}
                </>
              ) : (
                <>
                  {isSurveillance ? <FileText size={17} /> : <ShieldCheck size={17} />}
                  {isSurveillance ? 'Issue Surveillance Letter' : 'Issue Certificate'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
