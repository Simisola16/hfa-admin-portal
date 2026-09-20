import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Award, ArrowLeft, Save, RefreshCw, Send, FileText, CheckCircle2,
  AlertTriangle, Building, MapPin, Calendar, Package, Plus, Trash2,
  ExternalLink, Download, Check, X, Lock, ShieldCheck, Eye, UploadCloud,
  Search, CheckSquare, Square, Filter, Layers, Info, CheckCircle
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { generateHfaId, normalizeHfaTypeCode } from '../lib/idGenerator';

const getPdfUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';
  const cleanApi = API_URL.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanApi}${cleanPath}`;
};

const PRODUCT_CATEGORIES = [
  'Meat & Poultry',
  'Dairy & Eggs',
  'Bakery & Confectionery',
  'Beverages',
  'Prepared Meals & Snacks',
  'Sauces & Condiments',
  'Ingredients & Flavours',
  'Oils & Fats',
  'Packaging & Processing Aids',
  'General Food Products'
];

export default function AdminReviewCertificate() {
  const { id: certId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState(null);
  const [clientUser, setClientUser] = useState(null);
  const [siteData, setSiteData] = useState(null);
  const [siteProducts, setSiteProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [logsheetCategory, setLogsheetCategory] = useState('');

  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [applicationData, setApplicationData] = useState(null);

  // Form State
  const [form, setForm] = useState({
    certificate_number: '',
    certificate_type: 'Halal Certification',
    company_name: '',
    product_category: '',
    company_address: '',
    manufacturing_address: '',
    scope: '',
    issue_date: '',
    current_cycle_start_date: '',
    original_cycle_start_date: '',
    certification_start_date: '',
    expiry_date: '',
    products_covered: [],
    product_details: [],
    review_notes: '',
    checklist: {
      company_verified: false,
      site_verified: false,
      scope_verified: false,
      dates_verified: false
    }
  });

  const [previewTimestamp, setPreviewTimestamp] = useState(Date.now());

  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdCat, setNewProdCat] = useState('');
  const [showAddCustomProduct, setShowAddCustomProduct] = useState(false);

  // Fetch certificate details & associated client site products with robust multi-tier fallback
  const fetchCertificate = async () => {
    setLoading(true);
    setLoadingProducts(true);
    try {
      const [certRes, siteProdRes] = await Promise.all([
        api.get(`/api/certificates/${certId}`),
        api.get(`/api/certificates/${certId}/site-products`).catch(err => {
          console.warn('Notice: site-products endpoint returned:', err?.response?.status || err?.message);
          return { data: null };
        })
      ]);

      const c = certRes.data?.data || certRes.data;
      const client = certRes.data?.client || null;
      const siteFromCert = certRes.data?.site || null;

      if (!c) {
        toast.error('Certificate not found.');
        navigate('/certificates');
        return;
      }

      setCert(c);

      const clientId = c.client_id || c.application_id?.client_id;
      const targetSiteId = c.site_id?._id || c.site_id || c.application_id?.site_id;
      const appId = c.application_id?._id || c.application_id;

      // Robust client resolution (company_name, full_name, email, phone, address)
      let resolvedClient = client;
      const clientIdStr = (clientId && typeof clientId === 'object') ? (clientId._id || clientId.id) : clientId;
      if ((!resolvedClient || !resolvedClient.email || !resolvedClient.full_name) && clientIdStr) {
        try {
          const uRes = await api.get(`/api/users/${clientIdStr}`).catch(() => null);
          const uData = uRes?.data?.data || uRes?.data;
          if (uData) {
            resolvedClient = { ...(resolvedClient || {}), ...uData };
          }
        } catch (_) { }
      }

      let fetchedAppData = null;
      if (appId) {
        try {
          const aRes = await api.get(`/api/applications/${appId}`).catch(() => api.get(`/api/add-on-applications/${appId}`));
          fetchedAppData = aRes?.data?.data || aRes?.data || null;
          if (fetchedAppData) {
            setApplicationData(fetchedAppData);
            const aClient = fetchedAppData.client_id;
            if (!resolvedClient || !resolvedClient.email || !resolvedClient.full_name) {
              if (aClient && typeof aClient === 'object') {
                resolvedClient = {
                  company_name: aClient.company_name || fetchedAppData.establishment_name || aClient.full_name,
                  full_name: aClient.full_name || fetchedAppData.contact_name,
                  email: aClient.email || fetchedAppData.contact_email,
                  phone: aClient.phone || fetchedAppData.contact_phone,
                  address: aClient.address || fetchedAppData.establishment_address,
                  ...(resolvedClient || {})
                };
              } else if (fetchedAppData.contact_name || fetchedAppData.contact_email) {
                resolvedClient = {
                  company_name: fetchedAppData.establishment_name || c.company_name,
                  full_name: fetchedAppData.contact_name,
                  email: fetchedAppData.contact_email,
                  phone: fetchedAppData.contact_phone,
                  address: fetchedAppData.establishment_address || c.company_address,
                  ...(resolvedClient || {})
                };
              }
            }
          }
        } catch (_) { }
      }

      if (resolvedClient) {
        if (!resolvedClient.company_name && c.company_name) resolvedClient.company_name = c.company_name;
        if (!resolvedClient.address && c.company_address) resolvedClient.address = c.company_address;
      } else {
        resolvedClient = {
          company_name: c.company_name || 'Client Company',
          full_name: '',
          email: '',
          phone: '',
          address: c.company_address || ''
        };
      }
      setClientUser(resolvedClient);

      // Category detection from ApplicationLogsheet (available in full function scope)
      let detectedLogsheetCat = '';
      if (appId) {
        try {
          const logsheetRes = await api.get(`/api/application-logsheets/application/${appId}`).catch(() => null);
          const logsheetData = logsheetRes?.data?.data || logsheetRes?.data;
          const logsheets = Array.isArray(logsheetData) ? logsheetData : (logsheetData ? [logsheetData] : []);
          logsheets.forEach(l => {
            if (l.product_category || l.productCategory) {
              detectedLogsheetCat = l.product_category || l.productCategory;
            }
          });
        } catch (err) {
          console.warn('Logsheet category check notice:', err?.message);
        }
      }

      if (!detectedLogsheetCat && clientIdStr) {
        try {
          const logsheetRes2 = await api.get(`/api/application-logsheets?client_id=${clientIdStr}&limit=1`).catch(() => null);
          const logsheetData2 = logsheetRes2?.data?.data || logsheetRes2?.data;
          const logsheets2 = Array.isArray(logsheetData2) ? logsheetData2 : (logsheetData2 ? [logsheetData2] : []);
          if (logsheets2.length > 0 && (logsheets2[0].product_category || logsheets2[0].productCategory)) {
            detectedLogsheetCat = logsheets2[0].product_category || logsheets2[0].productCategory;
          }
        } catch (err) {
          console.warn('Fallback client logsheet check notice:', err?.message);
        }
      }
      setLogsheetCategory(detectedLogsheetCat);

      // Initial products from siteProdRes
      const siteProdData = siteProdRes?.data || {};
      let fetchedSiteProducts = Array.isArray(siteProdData.products) ? [...siteProdData.products] : [];

      // Multi-tier Fallback if site-products endpoint returned 0 products
      if (fetchedSiteProducts.length === 0) {
        const fallbackMap = new Map();

        const addCandidate = (p, source = 'site_product') => {
          if (!p) return;
          const name = (p.name || p.title || p.product_name || '').trim();
          if (!name) return;
          const key = name.toLowerCase();
          if (!fallbackMap.has(key)) {
            fallbackMap.set(key, {
              id: p._id ? (p._id.toString ? p._id.toString() : p._id) : (p.id || `p_${Math.random().toString(36).substr(2, 8)}`),
              name,
              code: p.code || p.barcode || '',
              category: p.category || 'Halal Certified',
              product_type: p.product_type || p.type || 'Processed',
              description: p.description || '',
              barcode: p.barcode || p.code || '',
              source,
              status: p.status || 'active',
              site_id: p.site_id || targetSiteId || null
            });
          } else {
            const existing = fallbackMap.get(key);
            if (!existing.code && (p.code || p.barcode)) existing.code = p.code || p.barcode;
            if (!existing.category && p.category) existing.category = p.category;
            if (!existing.description && p.description) existing.description = p.description;
            if (!existing.barcode && p.barcode) existing.barcode = p.barcode;
          }
        };

        // Fallback A: Query /api/products?all=true (standard admin catalog endpoint)
        try {
          const prodsRes = await api.get('/api/products?all=true').catch(() => null);
          const allProds = prodsRes?.data?.data || prodsRes?.data || [];
          if (Array.isArray(allProds) && allProds.length > 0) {
            const targetSiteStr = targetSiteId ? (targetSiteId._id ? targetSiteId._id.toString() : targetSiteId.toString()) : '';

            // Filter products for this client
            const clientMatched = allProds.filter(p => {
              if (!clientIdStr) return true;
              const pClient = p.client_id;
              if (!pClient) return false;
              const pClientIdStr = (typeof pClient === 'object' && pClient._id) ? pClient._id.toString() : pClient.toString();
              return pClientIdStr === clientIdStr;
            });

            // If any product specifically matches the site, prioritize site match
            const siteMatched = clientMatched.filter(p => {
              if (!targetSiteStr) return false;
              const pSite = p.site_id;
              if (!pSite) return false;
              const pSiteIdStr = (typeof pSite === 'object' && pSite._id) ? pSite._id.toString() : pSite.toString();
              return pSiteIdStr === targetSiteStr;
            });

            const prodsToAdd = siteMatched.length > 0 ? siteMatched : clientMatched;
            prodsToAdd.forEach(p => addCandidate(p, siteMatched.length > 0 ? 'site_inventory' : 'client_inventory'));
          }
        } catch (err) {
          console.warn('Fallback /api/products query failed:', err);
        }

        // Fallback B: Products from populated application_id
        if (c.application_id?.products && Array.isArray(c.application_id.products)) {
          c.application_id.products.forEach(p => addCandidate(p, 'application'));
        }

        // Fallback C: Products from ApplicationLogsheet
        if (appId) {
          try {
            const logsheetRes = await api.get(`/api/application-logsheets/application/${appId}`).catch(() => null);
            const logsheetData = logsheetRes?.data?.data || logsheetRes?.data;
            const logsheets = Array.isArray(logsheetData) ? logsheetData : (logsheetData ? [logsheetData] : []);
            logsheets.forEach(l => {
              if (Array.isArray(l.products_list)) {
                l.products_list.forEach(p => addCandidate(p, 'logsheet'));
              }
              if (l.product_name) {
                addCandidate({ name: l.product_name }, 'logsheet');
              }
            });
          } catch (err) {
            console.warn('Fallback logsheet check notice:', err?.message);
          }
        }

        // Fallback D: Products currently recorded on certificate
        if (Array.isArray(c.product_details)) {
          c.product_details.forEach(p => addCandidate(p, 'certificate'));
        }
        if (Array.isArray(c.products_covered)) {
          c.products_covered.forEach(p => {
            if (typeof p === 'string') addCandidate({ name: p }, 'certificate');
            else if (typeof p === 'object') addCandidate(p, 'certificate');
          });
        }

        fetchedSiteProducts = Array.from(fallbackMap.values());
      }

      setSiteProducts(fetchedSiteProducts);

      // Resolve site data
      let resolvedSite = siteProdData.site || siteFromCert || c.site_id || (c.application_id?.site_name ? { name: c.application_id.site_name } : null);
      if (!resolvedSite && clientId) {
        try {
          const sitesRes = await api.get('/api/sites').catch(() => null);
          const allSites = sitesRes?.data?.data || sitesRes?.data || [];
          if (Array.isArray(allSites)) {
            const clientIdStr = clientId._id ? clientId._id.toString() : clientId.toString();
            const clientSite = allSites.find(s => s.client_id && s.client_id.toString() === clientIdStr);
            if (clientSite) resolvedSite = clientSite;
          }
        } catch (_) { }
      }
      setSiteData(resolvedSite);

      const resolvedProducts = Array.isArray(c.products_covered) ? c.products_covered : [];
      let resolvedDetails = Array.isArray(c.product_details) && c.product_details.length > 0
        ? c.product_details
        : (resolvedProducts.length > 0
          ? resolvedProducts.map((p, idx) => ({
            name: typeof p === 'string' ? p : p.name,
            code: typeof p === 'object' && p.code ? p.code : `GEN-${String(idx + 1).padStart(2, '0')}`,
            category: typeof p === 'object' && p.category ? p.category : 'Halal Certified',
            barcode: typeof p === 'object' && p.barcode ? p.barcode : ''
          }))
          : []
        );

      // If certificate has NO products recorded yet, but site products are available, default to selecting all site products
      if (resolvedDetails.length === 0 && fetchedSiteProducts.length > 0) {
        resolvedDetails = fetchedSiteProducts.map((p, idx) => ({
          name: p.name,
          code: p.code || `PRD-${String(idx + 1).padStart(2, '0')}`,
          category: p.category || 'Halal Certified',
          barcode: p.barcode || ''
        }));
      }

      const finalProductsCovered = resolvedDetails.map(p => p.name);

      const resolvedCategory = detectedLogsheetCat ||
        (c.scope && c.scope !== 'Halal Food and Consumer Products Certification' && c.scope !== 'Halal Food Certification' ? c.scope : '') ||
        c.application_id?.scope ||
        'Meat & Poultry';

      const isAddOnCert = Boolean(
        c.is_add_on ||
        c.certificate_type?.toLowerCase().includes('add') ||
        c.application_id?.is_add_on ||
        c.application_id?.application_type === 'addon' ||
        c.application_id?.application_type === 'add-on' ||
        c.application_id?.application_type === 'add_on' ||
        c.application_id?.application_number?.includes('-AD-') ||
        c.application_id?.application_number?.startsWith('ADD-') ||
        c.certificate_number?.includes('-AD-') ||
        fetchedAppData?.is_add_on ||
        fetchedAppData?.application_type === 'addon' ||
        fetchedAppData?.application_type === 'add-on' ||
        fetchedAppData?.application_type === 'add_on' ||
        fetchedAppData?.application_number?.includes('-AD-') ||
        fetchedAppData?.application_number?.startsWith('ADD-')
      );

      let resolvedCertNo = c.certificate_number || '';
      if (isAddOnCert && resolvedCertNo.includes('-NE-')) {
        resolvedCertNo = resolvedCertNo.replace('-NE-', '-AD-');
      }

      setForm({
        certificate_number: resolvedCertNo,
        certificate_type: c.certificate_type || 'Halal Certification',
        company_name: c.company_name || client?.company_name || client?.full_name || c.application_id?.establishment_name || '',
        product_category: resolvedCategory,
        company_address: c.company_address || client?.address || c.application_id?.establishment_address || '',
        manufacturing_address: c.manufacturing_address || resolvedSite?.address_1 || resolvedSite?.address || c.application_id?.manufacturer_address || c.company_address || '',
        scope: resolvedCategory,
        issue_date: c.issue_date ? new Date(c.issue_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        current_cycle_start_date: c.current_cycle_start_date ? new Date(c.current_cycle_start_date).toISOString().split('T')[0] : (c.issue_date ? new Date(c.issue_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        original_cycle_start_date: c.original_cycle_start_date ? new Date(c.original_cycle_start_date).toISOString().split('T')[0] : (c.issue_date ? new Date(c.issue_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        certification_start_date: c.certification_start_date ? new Date(c.certification_start_date).toISOString().split('T')[0] : (c.issue_date ? new Date(c.issue_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        expiry_date: c.expiry_date ? new Date(c.expiry_date).toISOString().split('T')[0] : '',
        products_covered: finalProductsCovered,
        product_details: resolvedDetails,
        review_notes: c.review_notes || '',
        checklist: {
          company_verified: true,
          site_verified: true,
          scope_verified: true,
          dates_verified: true
        }
      });
    } catch (err) {
      toast.error('Failed to load certificate: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (certId) {
      fetchCertificate();
    }
  }, [certId]);

  // Check if a site product is currently picked for certificate
  const isProductSelected = (prodName) => {
    if (!prodName) return false;
    const target = prodName.trim().toLowerCase();
    return form.product_details.some(p => (p.name || '').trim().toLowerCase() === target);
  };

  // Toggle selection of a product from the site inventory
  const handleToggleProduct = (prod) => {
    const prodName = (prod.name || '').trim();
    if (!prodName) return;
    const target = prodName.toLowerCase();
    const alreadySelected = form.product_details.some(p => (p.name || '').trim().toLowerCase() === target);

    if (alreadySelected) {
      // Deselect / Remove
      const updatedDetails = form.product_details.filter(p => (p.name || '').trim().toLowerCase() !== target);
      const updatedCovered = updatedDetails.map(p => p.name);
      setForm(f => ({
        ...f,
        product_details: updatedDetails,
        products_covered: updatedCovered
      }));
    } else {
      // Select / Add
      const newCode = prod.code || `PRD-${String(form.product_details.length + 1).padStart(2, '0')}`;
      const newCat = prod.category || 'Halal Certified';
      const newItem = {
        name: prodName,
        code: newCode,
        category: newCat,
        barcode: prod.barcode || '',
        description: prod.description || ''
      };
      const updatedDetails = [...form.product_details, newItem];
      const updatedCovered = updatedDetails.map(p => p.name);
      setForm(f => ({
        ...f,
        product_details: updatedDetails,
        products_covered: updatedCovered
      }));
    }
  };

  // Select all products visible in the site inventory list
  const handleSelectAllSiteProducts = (productsToSelect) => {
    const list = productsToSelect || siteProducts;
    if (list.length === 0) return;

    const currentMap = new Map();
    form.product_details.forEach(p => {
      if (p.name) currentMap.set(p.name.trim().toLowerCase(), p);
    });

    list.forEach((p) => {
      const name = (p.name || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!currentMap.has(key)) {
        currentMap.set(key, {
          name,
          code: p.code || `PRD-${String(currentMap.size + 1).padStart(2, '0')}`,
          category: p.category || 'Halal Certified',
          barcode: p.barcode || '',
          description: p.description || ''
        });
      }
    });

    const updatedDetails = Array.from(currentMap.values());
    const updatedCovered = updatedDetails.map(p => p.name);
    setForm(f => ({
      ...f,
      product_details: updatedDetails,
      products_covered: updatedCovered
    }));
    toast.success(`Selected all ${list.length} site products.`);
  };

  // Deselect all products from certificate
  const handleDeselectAllSiteProducts = () => {
    setForm(f => ({
      ...f,
      product_details: [],
      products_covered: []
    }));
    toast.success('Deselected all products from certificate.');
  };

  // Update specific field on a selected product (e.g. code or category)
  const handleUpdateProductDetail = (index, field, value) => {
    const updated = [...form.product_details];
    updated[index] = { ...updated[index], [field]: value };
    const updatedCovered = updated.map(p => p.name);
    setForm(f => ({
      ...f,
      product_details: updated,
      products_covered: updatedCovered
    }));
  };

  // Handle Add Empty Product Row for manual entry
  const handleAddProductRow = () => {
    const nextIndex = form.product_details.length + 1;
    const newItem = {
      name: '',
      code: `PRD-${String(nextIndex).padStart(2, '0')}`,
      category: form.product_category || 'Halal Certified',
      barcode: ''
    };
    const updatedDetails = [...form.product_details, newItem];
    setForm(f => ({
      ...f,
      product_details: updatedDetails,
      products_covered: updatedDetails.map(p => p.name).filter(Boolean)
    }));
  };

  // Handle Add Custom Product manually
  const handleAddProduct = () => {
    if (!newProdName.trim()) {
      toast.error('Please enter product name.');
      return;
    }
    const newCode = newProdCode.trim() || `PRD-${String(form.product_details.length + 1).padStart(2, '0')}`;
    const newCat = newProdCat.trim() || form.product_category || 'Halal Certified';

    const newItem = {
      name: newProdName.trim(),
      code: newCode,
      category: newCat,
      barcode: '',
      source: 'custom'
    };

    setSiteProducts(prev => [newItem, ...prev]);
    const updatedDetails = [...form.product_details, newItem];
    const updatedCovered = [...form.products_covered, newProdName.trim()];

    setForm(f => ({
      ...f,
      product_details: updatedDetails,
      products_covered: updatedCovered
    }));

    setNewProdName('');
    setNewProdCode('');
    setNewProdCat('');
    setShowAddCustomProduct(false);
    toast.success('Product added to certificate.');
  };

  // Handle Remove Product from Certificate
  const handleRemoveProduct = (index) => {
    const updatedDetails = form.product_details.filter((_, i) => i !== index);
    const updatedCovered = updatedDetails.map(p => p.name);
    setForm(f => ({
      ...f,
      product_details: updatedDetails,
      products_covered: updatedCovered
    }));
    toast.success('Product removed from certificate.');
  };

  // Set date helpers
  const handleSetYears = (years) => {
    if (!form.issue_date) return;
    const isFour = form.certificate_type === 'GSO MEAT' || form.certificate_type === 'GSO NON MEAT' || form.certificate_type === 'SMIIC' || (form.certificate_type && (form.certificate_type.includes('GSO') || form.certificate_type.includes('SMIIC')));
    const enforcedYears = isFour ? 3 : 1;
    const d = new Date(form.issue_date);
    d.setFullYear(d.getFullYear() + enforcedYears);
    setForm(f => ({ ...f, expiry_date: d.toISOString().split('T')[0] }));
  };

  // Save changes (Draft / Review)
  const handleSave = async (silent = false) => {
    setSaving(true);
    try {
      const payload = {
        certificate_number: form.certificate_number,
        certificate_type: form.certificate_type,
        company_name: form.company_name,
        company_address: form.company_address,
        manufacturing_address: form.manufacturing_address,
        scope: form.product_category || form.scope,
        product_category: form.product_category || form.scope,
        issue_date: form.issue_date,
        current_cycle_start_date: form.current_cycle_start_date,
        original_cycle_start_date: form.original_cycle_start_date,
        certification_start_date: form.certification_start_date,
        expiry_date: form.expiry_date,
        products_covered: form.products_covered,
        product_details: form.product_details,
        review_notes: form.review_notes
      };

      const res = await api.put(`/api/certificates/${certId}`, payload);
      setCert(res.data?.data || res.data);
      if (!silent) toast.success('Certificate changes saved.');
      return true;
    } catch (err) {
      toast.error('Failed to save certificate: ' + (err.response?.data?.error || err.message));
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Regenerate PDF Preview with updated details & selected products
  const handleRegeneratePdf = async () => {
    setRegenerating(true);
    try {
      // First save current inputs
      await handleSave(true);

      const res = await api.post(`/api/certificates/${certId}/regenerate`, {
        certificate_number: form.certificate_number,
        certificate_type: form.certificate_type,
        company_name: form.company_name,
        company_address: form.company_address,
        manufacturing_address: form.manufacturing_address,
        scope: form.product_category || form.scope,
        product_category: form.product_category || form.scope,
        issue_date: form.issue_date,
        current_cycle_start_date: form.current_cycle_start_date,
        original_cycle_start_date: form.original_cycle_start_date,
        certification_start_date: form.certification_start_date,
        expiry_date: form.expiry_date,
        products_covered: form.products_covered,
        product_details: form.product_details
      });

      const newCertUrl = res.certificateUrl || res.data?.certificateUrl || res.data?.data?.certificate_url;
      if (newCertUrl) {
        setCert(prev => ({
          ...prev,
          certificate_url: newCertUrl
        }));
        setPreviewTimestamp(Date.now());
        toast.success('Certificate PDF regenerated successfully!');
      } else {
        fetchCertificate();
        setPreviewTimestamp(Date.now());
        toast.success('Certificate preview refreshed!');
      }
    } catch (err) {
      toast.error('PDF Regeneration failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setRegenerating(false);
    }
  };

  // Handle Upload custom PDF
  const handleUploadCustomPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a valid PDF document.');
      return;
    }

    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('certificate_file', file);
      formData.append('certificate_number', form.certificate_number);

      const res = await api.put(`/api/certificates/${certId}`, formData, true);
      setCert(res.data?.data || res.data);
      toast.success('Custom certificate PDF uploaded.');
    } catch (err) {
      toast.error('Failed to upload PDF: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingPdf(false);
    }
  };

  // Open confirmation modal for approval & sending
  const handleOpenApproveModal = () => {
    if (!form.certificate_number?.trim()) {
      toast.error('Certificate Number is required.');
      return;
    }
    if (!form.company_name?.trim()) {
      toast.error('Company Name is required.');
      return;
    }
    if (!form.issue_date || !form.expiry_date) {
      toast.error('Issue and Expiry dates are required.');
      return;
    }
    setShowConfirmModal(true);
  };

  // Final Approve and Send to Client
  const handleApproveAndSend = async () => {
    setApproving(true);
    try {
      const payload = {
        certificate_number: form.certificate_number,
        certificate_type: form.certificate_type,
        company_name: form.company_name,
        company_address: form.company_address,
        manufacturing_address: form.manufacturing_address,
        scope: form.product_category || form.scope,
        product_category: form.product_category || form.scope,
        issue_date: form.issue_date,
        current_cycle_start_date: form.current_cycle_start_date,
        original_cycle_start_date: form.original_cycle_start_date,
        certification_start_date: form.certification_start_date,
        expiry_date: form.expiry_date,
        products_covered: form.products_covered,
        product_details: form.product_details,
        review_notes: form.review_notes
      };

      const res = await api.post(`/api/certificates/${certId}/approve-and-send`, payload);

      toast.success('🏅 Certificate approved & successfully issued to client!');
      setShowConfirmModal(false);

      // Redirect back to certificates
      setTimeout(() => {
        navigate('/certificates');
      }, 1200);
    } catch (err) {
      toast.error('Failed to approve certificate: ' + (err.response?.data?.error || err.message));
    } finally {
      setApproving(false);
    }
  };

  const uniqueCategories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(siteProducts.map(p => p.category).filter(Boolean)))];
  }, [siteProducts]);

  const filteredSiteProducts = useMemo(() => {
    return siteProducts.filter(p => {
      const q = productSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));
      const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [siteProducts, productSearch, categoryFilter]);

  const selectedSiteCount = useMemo(() => {
    return siteProducts.filter(p => isProductSelected(p.name)).length;
  }, [siteProducts, form.product_details]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Loading Certificate for Review...</div>
      </div>
    );
  }

  const isUnderReview = cert?.status === 'under_review' || cert?.status === 'draft';
  const isGso = form.certificate_type === 'GSO MEAT' || form.certificate_type === 'GSO NON MEAT' || form.certificate_type === 'SMIIC' || (form.certificate_type && (form.certificate_type.includes('GSO') || form.certificate_type.includes('SMIIC')));
  const rawPdfUrl = getPdfUrl(cert?.certificate_url);
  const pdfUrl = rawPdfUrl ? (rawPdfUrl.includes('?') ? `${rawPdfUrl}&t=${previewTimestamp}` : `${rawPdfUrl}?t=${previewTimestamp}`) : '';

  return (
    <div style={{ padding: '24px 32px 100px', maxWidth: 1600, margin: '0 auto' }}>

      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Link to="/certificates" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              <ArrowLeft size={16} /> Back to Certificates
            </Link>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ fontSize: 13, color: '#047857', fontWeight: 700 }}>Review &amp; QA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={24} style={{ color: '#047857' }} />
              Certificate Review &amp; Quality Check
            </h1>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 20,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: isUnderReview ? '#ffedd5' : '#dcfce7',
              color: isUnderReview ? '#c2410c' : '#15803d',
              border: `1px solid ${isUnderReview ? '#fed7aa' : '#bbf7d0'}`
            }}>
              {isUnderReview ? '⏳ Under Review' : '✓ Active & Issued'}
            </span>
          </div>
        </div>

        {/* Quick meta details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#ffffff', padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <strong>Client:</strong> {form.company_name || '—'}
          </div>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <strong>Cert #:</strong> <span style={{ color: '#0f172a', fontWeight: 700 }}>{form.certificate_number}</span>
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 45%) 1fr', gap: 24, alignItems: 'start' }}>

        {/* LEFT PANE: Live Certificate Document Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} style={{ color: '#047857' }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Live Certificate Document</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleRegeneratePdf}
                  disabled={regenerating}
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, color: '#047857', borderColor: '#d1fae5' }}
                  title="Re-render PDF with current form values"
                >
                  <RefreshCw size={13} className={regenerating ? 'spinner' : ''} />
                  {regenerating ? 'Regenerating...' : 'Sync & Refresh'}
                </button>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, color: '#334155' }}
                  >
                    <ExternalLink size={13} /> Fullscreen
                  </a>
                )}
              </div>
            </div>

            {/* Document Viewer Frame */}
            <div style={{
              background: '#f8fafc',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              height: '620px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  title="Certificate PDF Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  <Award size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>No PDF Generated Yet</div>
                  <p style={{ fontSize: 12, margin: '6px 0 16px' }}>Click "Regenerate PDF" to render the official certificate document with your details.</p>
                  <button
                    type="button"
                    onClick={handleRegeneratePdf}
                    disabled={regenerating}
                    className="btn btn-primary"
                    style={{ fontSize: 12 }}
                  >
                    <RefreshCw size={13} /> Generate Preview PDF
                  </button>
                </div>
              )}
            </div>

            {/* Document details strip */}
            <div style={{ display: 'grid', gridTemplateColumns: isGso ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 10, marginTop: 14, fontSize: 12 }}>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Scheme</div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {form.certificate_type}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Issue Date</div>
                <div style={{ fontWeight: 700, color: '#047857', marginTop: 2 }}>{form.issue_date || '—'}</div>
              </div>
              {isGso && (
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Cycle Start</div>
                  <div style={{ fontWeight: 700, color: '#2563eb', marginTop: 2 }}>{form.current_cycle_start_date || form.issue_date || '—'}</div>
                </div>
              )}
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Expiry Date</div>
                <div style={{ fontWeight: 700, color: '#dc2626', marginTop: 2 }}>{form.expiry_date || '—'}</div>
              </div>
            </div>
          </div>

          {/* Upload Custom Replacement PDF Box */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UploadCloud size={16} style={{ color: '#047857' }} />
              Upload Custom / Stamped Certificate PDF (Optional)
            </div>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
              If you have an externally generated or signed PDF file, you can upload it directly to replace the system-generated document.
            </p>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px',
              borderRadius: 8,
              border: '1.5px dashed #cbd5e1',
              background: '#f8fafc',
              cursor: uploadingPdf ? 'not-allowed' : 'pointer',
              color: '#334155',
              fontSize: 12,
              fontWeight: 700
            }}>
              <UploadCloud size={16} color="#047857" />
              {uploadingPdf ? 'Uploading Custom PDF...' : 'Choose Replacement PDF Document'}
              <input type="file" accept="application/pdf" disabled={uploadingPdf} onChange={handleUploadCustomPdf} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* RIGHT PANE: Review & Correction Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Card 1: Assigned Company & Manufacturing Facility */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  <Building size={16} style={{ color: '#047857' }} />
                  1. Assigned Company &amp; Manufacturing Facility
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                  The verified organization and facility site this certificate is assigned to, and where products are sourced from.
                </p>
              </div>
              <span style={{ fontSize: 11, background: '#f0fdf4', color: '#166534', fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid #bbf7d0' }}>
                ✓ Assignment Verified
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Company Info Box */}
              <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building size={15} />
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Client Organization</span>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a' }}>
                      {clientUser?.company_name || form.company_name || 'Client Company'}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                  {(clientUser?.full_name || cert?.contact_name) && (
                    <div><strong style={{ color: '#334155' }}>Contact:</strong> {clientUser?.full_name || cert?.contact_name}</div>
                  )}
                  {(clientUser?.email || cert?.contact_email) && (
                    <div><strong style={{ color: '#334155' }}>Email:</strong> {clientUser?.email || cert?.contact_email}</div>
                  )}
                  {(clientUser?.phone || cert?.contact_phone) && (
                    <div><strong style={{ color: '#334155' }}>Phone:</strong> {clientUser?.phone || cert?.contact_phone}</div>
                  )}
                  {(clientUser?.address || form.company_address || cert?.company_address) && (
                    <div style={{ marginTop: 2 }}><strong style={{ color: '#334155' }}>Address:</strong> {clientUser?.address || form.company_address || cert?.company_address}</div>
                  )}
                </div>
              </div>

              {/* Site / Facility Info Box */}
              <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={15} />
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Manufacturing Site</span>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a' }}>
                      {siteData?.name || siteData?.trading_name || 'Manufacturing Facility'}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                  <div>
                    <strong style={{ color: '#334155' }}>Facility Address:</strong> {siteData?.address_1 || siteData?.address || form.manufacturing_address || 'Same as business address'}
                  </div>
                  {(siteData?.city || siteData?.postcode || siteData?.country) && (
                    <div>
                      <strong style={{ color: '#334155' }}>Location:</strong> {[siteData?.city, siteData?.postcode, siteData?.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div style={{ marginTop: 4, color: '#166534', fontWeight: 600, fontSize: 11 }}>
                    ✓ Source of {siteProducts.length} approved site products
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Certificate Details & Document Schedule */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  <Award size={16} style={{ color: '#047857' }} />
                  2. Certificate Details &amp; Printed Schedule
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                  All fields below print directly onto the official certificate document and can be modified.
                </p>
              </div>
              <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                Editable Fields
              </span>
            </div>

            {/* Sub-section: Company Information on Certificate */}
            <div style={{ marginBottom: 20, background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building size={14} style={{ color: '#047857' }} />
                Company Information on Certificate
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Company Name */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                      Company Name on Certificate <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    {clientUser?.company_name && form.company_name !== clientUser.company_name && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, company_name: clientUser.company_name }))}
                        style={{ background: 'none', border: 'none', color: '#047857', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Reset to "{clientUser.company_name}"
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={form.company_name}
                    onChange={e => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Official registered company name printed on certificate"
                    style={{ fontWeight: 700, fontSize: 13.5 }}
                  />
                </div>

                {/* Product Category (auto-filled from logsheet) */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                      Product Category <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    {logsheetCategory ? (
                      <span style={{ fontSize: 10.5, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                        ✓ Auto-filled from Logsheet ({logsheetCategory})
                      </span>
                    ) : (
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>Printed under Product Category</span>
                    )}
                  </div>
                  <input
                    type="text"
                    list="review-cert-category-list"
                    className="form-control"
                    placeholder="e.g. Meat & Poultry, Dairy & Eggs, etc."
                    value={form.product_category || form.scope || ''}
                    onChange={e => setForm({ ...form, product_category: e.target.value, scope: e.target.value })}
                    style={{ fontWeight: 600, fontSize: 13 }}
                  />
                  <datalist id="review-cert-category-list">
                    {PRODUCT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                {/* Registered Business Address */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Registered Business Address <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    className="form-control"
                    value={form.company_address}
                    onChange={e => setForm({ ...form, company_address: e.target.value })}
                    placeholder="Head office / registered legal business address"
                  />
                </div>

                {/* Manufacturing Site Address */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Manufacturing Site <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    className="form-control"
                    value={form.manufacturing_address}
                    onChange={e => setForm({ ...form, manufacturing_address: e.target.value })}
                    placeholder="Physical site location where certified products are manufactured"
                  />
                </div>
              </div>
            </div>

            {/* Sub-section: Certificate Reference & Validity Schedule */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} style={{ color: '#047857' }} />
                Certificate Reference &amp; Validity Schedule {isGso && <span style={{ fontSize: 10.5, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>4 {form.certificate_type?.includes('SMIIC') ? 'SMIIC' : 'GSO'} Dates</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Certificate Number <span style={{ color: '#dc2626' }}>*</span></label>
                    <button
                      type="button"
                      onClick={() => {
                        const isAddOn = Boolean(
                          cert?.is_add_on ||
                          cert?.certificate_type?.toLowerCase().includes('add') ||
                          cert?.application_id?.is_add_on ||
                          cert?.application_id?.application_type === 'addon' ||
                          cert?.application_id?.application_type === 'add-on' ||
                          cert?.application_id?.application_type === 'add_on' ||
                          cert?.application_id?.application_number?.includes('-AD-') ||
                          cert?.application_id?.application_number?.startsWith('ADD-') ||
                          cert?.certificate_number?.includes('-AD-') ||
                          applicationData?.is_add_on ||
                          applicationData?.application_type === 'addon' ||
                          applicationData?.application_type === 'add-on' ||
                          applicationData?.application_type === 'add_on' ||
                          applicationData?.application_number?.includes('-AD-') ||
                          applicationData?.application_number?.startsWith('ADD-')
                        );
                        const isRenew = Boolean(
                          cert?.certificate_type?.toLowerCase().includes('renew') ||
                          cert?.application_id?.application_type === 'renewal' ||
                          cert?.application_id?.application_number?.includes('-RE-') ||
                          applicationData?.application_type === 'renewal' ||
                          applicationData?.application_number?.includes('-RE-')
                        );
                        const isExt = Boolean(
                          cert?.certificate_type?.toLowerCase().includes('ext') ||
                          cert?.application_id?.application_type === 'extension' ||
                          cert?.application_id?.application_number?.includes('-EX-') ||
                          applicationData?.application_type === 'extension' ||
                          applicationData?.application_number?.includes('-EX-')
                        );
                        const isSurv = Boolean(
                          cert?.certificate_type?.toLowerCase().includes('surv') ||
                          cert?.application_id?.application_type === 'surveillance' ||
                          cert?.application_id?.application_number?.includes('-SU-')
                        );
                        const typeCode = isAddOn ? 'AD' : (isRenew ? 'RE' : (isExt ? 'EX' : (isSurv ? 'SU' : 'NE')));
                        const newId = generateHfaId(form.company_name || 'HFA', typeCode);
                        setForm(f => ({ ...f, certificate_number: newId }));
                        toast.success(`Generated ID: ${newId}`);
                      }}
                      style={{ background: 'none', border: 'none', color: '#047857', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Regenerate ID
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={form.certificate_number}
                    onChange={e => setForm({ ...form, certificate_number: e.target.value })}
                    style={{ fontWeight: 700, color: '#0f172a' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Certificate Type / Scheme <span style={{ color: '#dc2626' }}>*</span></label>
                  <select
                    className="form-control"
                    value={form.certificate_type}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(f => ({
                        ...f,
                        certificate_type: val,
                        expiry_date: val.includes('GSO') ? (() => {
                          const d = new Date(f.issue_date || new Date());
                          d.setFullYear(d.getFullYear() + 3);
                          return d.toISOString().split('T')[0];
                        })() : f.expiry_date
                      }));
                    }}
                    style={{ fontWeight: 600 }}
                  >
                    <option value="GSO MEAT">GSO MEAT</option>
                    <option value="GSO NON MEAT">GSO NON MEAT</option>
                    <option value="HFA SCHEME MEAT">HFA SCHEME MEAT</option>
                    <option value="HFA SCHEME NON MEAT">HFA SCHEME NON MEAT</option>
                    <option value="COSMETICS">COSMETICS</option>
                    <option value="SMIIC">SMIIC</option>
                  </select>
                </div>
              </div>

              {/* Dates Grid */}
              {isGso ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* 1. Issue Date */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Issue Date <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={form.issue_date}
                      onChange={e => setForm({ ...form, issue_date: e.target.value })}
                    />
                  </div>

                  {/* 2. Current Cycle Start Date */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Current Cycle Start Date <span style={{ color: '#dc2626' }}>*</span></label>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, current_cycle_start_date: f.issue_date }))}
                        style={{ background: 'none', border: 'none', color: '#047857', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Match Issue Date
                      </button>
                    </div>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={form.current_cycle_start_date || form.issue_date}
                      onChange={e => setForm({ ...form, current_cycle_start_date: e.target.value })}
                    />
                  </div>

                  {/* 3. Expiry Date */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Expiry Date <span style={{ color: '#dc2626' }}>*</span></label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleSetYears(3)}
                          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}
                        >
                          +3 Yrs (Standard)
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={form.expiry_date}
                      onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                      style={{ fontWeight: 700, color: '#dc2626' }}
                    />
                  </div>

                  {/* 4. Original Cycle Start Date */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Original Cycle Start Date <span style={{ color: '#dc2626' }}>*</span></label>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, original_cycle_start_date: f.issue_date }))}
                        style={{ background: 'none', border: 'none', color: '#047857', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Match Issue Date
                      </button>
                    </div>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={form.original_cycle_start_date || form.issue_date}
                      onChange={e => setForm({ ...form, original_cycle_start_date: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Issue Date <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={form.issue_date}
                      onChange={e => setForm({ ...form, issue_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Expiry Date <span style={{ color: '#dc2626' }}>*</span></label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleSetYears(1)}
                          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}
                        >
                          +1 Yr (Standard)
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={form.expiry_date}
                      onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                      style={{ fontWeight: 700, color: '#dc2626' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Certification Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.certification_start_date || form.issue_date}
                      onChange={e => setForm({ ...form, certification_start_date: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Certified Products Schedule */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>3. Certified Products Schedule</h3>
                    <span style={{ background: '#dcfce7', color: '#166534', fontSize: 11.5, fontWeight: 800, padding: '2px 9px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Check size={12} strokeWidth={3} />
                      {form.product_details.filter(p => p.name && p.name.trim()).length} Product(s) Selected
                    </span>
                    {siteProducts.length > 0 && (
                      <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 12 }}>
                        {selectedSiteCount} / {siteProducts.length} Client Items Picked
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                    {siteProducts.length > 0
                      ? `Select products from ${(siteData?.name || clientUser?.company_name || 'client')}'s catalog to include on this certificate:`
                      : 'Add and certify products directly covered under this certificate'}
                  </p>
                </div>
              </div>

              {siteProducts.length > 0 ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleSelectAllSiteProducts(filteredSiteProducts)}
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                  >
                    Select All ({filteredSiteProducts.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleDeselectAllSiteProducts}
                    style={{ fontSize: 11.5, padding: '4px 10px', color: '#dc2626' }}
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowAddCustomProduct(prev => !prev)}
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                  >
                    <Plus size={13} style={{ marginRight: 3 }} /> Add Custom Product
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleAddProductRow}
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                  >
                    <Plus size={13} style={{ marginRight: 3 }} /> Add Product Row
                  </button>
                </div>
              )}
            </div>

            {/* SEARCH & FILTER BAR FOR CLIENT CATALOG PRODUCTS */}
            {siteProducts.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: 30, fontSize: 12, height: 32 }}
                      placeholder="Search site catalog by product name or code..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                    />
                  </div>
                  {uniqueCategories.length > 2 && (
                    <select
                      className="form-control"
                      style={{ width: 150, fontSize: 12, height: 32 }}
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                    >
                      {uniqueCategories.map(c => (
                        <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* CUSTOM PRODUCT ADDER INLINE FORM (WHEN TOGGLED) */}
            {showAddCustomProduct && (
              <div style={{ marginBottom: 14, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Custom product name..."
                  className="form-control"
                  style={{ fontSize: 12, height: 32, flex: 2 }}
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddProduct(); } }}
                />
                <input
                  type="text"
                  placeholder="Code (optional)"
                  className="form-control"
                  style={{ fontSize: 12, height: 32, flex: 1 }}
                  value={newProdCode}
                  onChange={e => setNewProdCode(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddProduct(); } }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleAddProduct}
                  style={{ fontSize: 11.5, height: 32, padding: '0 12px' }}
                >
                  <Plus size={13} style={{ marginRight: 2 }} /> Add
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddCustomProduct(false)}
                  style={{ fontSize: 11.5, height: 32, padding: '0 8px', color: '#64748b' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* CLIENT CATALOG CHECKBOX SELECTION TABLE */}
            {siteProducts.length > 0 ? (
              <div className="table-wrap" style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                maxHeight: 280,
                overflowY: 'auto',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <tr style={{ color: '#475569', textAlign: 'left' }}>
                      <th style={{ width: 40, padding: '8px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredSiteProducts.length > 0 && filteredSiteProducts.every(item => isProductSelected(item.name))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleSelectAllSiteProducts(filteredSiteProducts);
                            } else {
                              handleDeselectAllSiteProducts();
                            }
                          }}
                          style={{ cursor: 'pointer', accentColor: '#16a34a', width: 15, height: 15 }}
                          title="Select/Deselect All Displayed Products"
                        />
                      </th>
                      <th style={{ width: 36, padding: '8px 6px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '8px 6px' }}>Product Name</th>
                      <th style={{ width: '28%', padding: '8px 6px' }}>Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSiteProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                          No products found matching "{productSearch}".
                        </td>
                      </tr>
                    ) : (
                      filteredSiteProducts.map((prod, index) => {
                        const selected = isProductSelected(prod.name);
                        return (
                          <tr
                            key={prod._id || prod.id || index}
                            onClick={() => handleToggleProduct(prod)}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: selected ? '#f0fdf4' : (index % 2 === 0 ? '#ffffff' : '#fafafa'),
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                          >
                            <td style={{ textAlign: 'center', padding: '8px 10px' }} onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => handleToggleProduct(prod)}
                                style={{ cursor: 'pointer', accentColor: '#16a34a', width: 15, height: 15 }}
                              />
                            </td>
                            <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>{index + 1}</td>
                            <td style={{ padding: '6px 8px', fontWeight: selected ? 700 : 500, color: selected ? '#14532d' : '#0f172a' }}>
                              {prod.name}
                            </td>
                            <td style={{ padding: '6px 8px', color: '#64748b', fontFamily: 'monospace', fontSize: 11.5 }}>
                              {prod.code || prod.barcode || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* FALLBACK EDITABLE TABLE FOR CLIENTS / SITES WITHOUT CATALOG */
              <div className="table-wrap" style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                maxHeight: 280,
                overflowY: 'auto',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <tr style={{ color: '#475569', textAlign: 'left' }}>
                      <th style={{ width: 36, padding: '8px 6px', textAlign: 'center' }}>#</th>
                      <th style={{ width: '34%', padding: '8px 6px' }}>Product Name <span>*</span></th>
                      <th style={{ width: '18%', padding: '8px 6px' }}>Code</th>
                      <th style={{ width: 40, padding: '8px 6px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.product_details.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                          No products added yet. Click "+ Add Product Row" above to add products.
                        </td>
                      </tr>
                    ) : (
                      form.product_details.map((prod, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                          <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>{index + 1}</td>
                          <td style={{ padding: '4px 6px' }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: '4px 8px', fontSize: 12, height: 30 }}
                              placeholder="e.g. Frozen Halal Beef Burger"
                              value={prod.name}
                              onChange={e => handleUpdateProductDetail(index, 'name', e.target.value)}
                              required
                            />
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: '4px 8px', fontSize: 12, height: 30 }}
                              placeholder="e.g. PRD-001"
                              value={prod.code}
                              onChange={e => handleUpdateProductDetail(index, 'code', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'center', padding: '4px 6px' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(index)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                              title="Remove row"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                💡 Printed on certificate: <strong>{form.product_details.filter(p => p.name && p.name.trim()).length}</strong> item(s).
              </span>
              {siteProducts.length > 0 ? (
                <span style={{ fontSize: 11.5, color: '#166534', fontWeight: 600 }}>
                  ✓ Selecting from official client portal catalog
                </span>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {form.product_details.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, color: '#ef4444', padding: '2px 6px' }}
                      onClick={handleDeselectAllSiteProducts}
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleAddProductRow}
                    style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, padding: '2px 6px' }}
                  >
                    + Add Product Row
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Quality Review Checklist & Remarks */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <CheckCircle2 size={16} style={{ color: '#047857' }} />
              4. Reviewer Quality Verification Checklist
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { key: 'company_verified', label: 'Company name and registered address verified' },
                { key: 'site_verified', label: 'Manufacturing site matches audit & logsheet' },
                { key: 'scope_verified', label: 'Product formulations & specifications approved' },
                { key: 'dates_verified', label: 'Issue & expiry dates correctly aligned' },
              ].map(chk => (
                <label key={chk.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer', background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    checked={form.checklist[chk.key]}
                    onChange={e => setForm({
                      ...form,
                      checklist: { ...form.checklist, [chk.key]: e.target.checked }
                    })}
                    style={{ marginTop: 2 }}
                  />
                  <span style={{ fontWeight: 600 }}>{chk.label}</span>
                </label>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Reviewer Audit Notes / Internal Remarks</label>
              <input
                type="text"
                className="form-control"
                value={form.review_notes}
                onChange={e => setForm({ ...form, review_notes: e.target.value })}
                placeholder="Optional remarks regarding this review or corrections made..."
              />
            </div>
          </div>

        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '14px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/certificates" className="btn btn-ghost" style={{ fontSize: 13 }}>
            <ArrowLeft size={15} /> Back
          </Link>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Status: <strong style={{ color: isUnderReview ? '#c2410c' : '#15803d' }}>{isUnderReview ? 'Under Review' : 'Active'}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Save Changes button */}
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving || regenerating || approving}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          {/* Regenerate PDF button */}
          <button
            type="button"
            onClick={handleRegeneratePdf}
            disabled={saving || regenerating || approving}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#047857', borderColor: '#bbf7d0', background: '#f0fdf4' }}
          >
            <RefreshCw size={15} className={regenerating ? 'spinner' : ''} />
            {regenerating ? 'Regenerating PDF...' : 'Regenerate PDF'}
          </button>

          {/* Approve & Send to Client button */}
          <button
            type="button"
            onClick={handleOpenApproveModal}
            disabled={saving || regenerating || approving}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 800,
              padding: '10px 22px',
              fontSize: 14,
              background: '#047857',
              borderColor: '#047857',
              boxShadow: '0 2px 8px rgba(4,120,87,0.3)'
            }}
          >
            <Send size={16} />
            {isUnderReview ? 'Approve & Send to Client' : 'Update & Re-send Certificate'}
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL: Ask if they are sure and don't want to change anything */}
      {showConfirmModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 540, borderRadius: 16, overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '18px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#dcfce7', color: '#15803d', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#166534' }}>
                    Confirm Certificate Approval &amp; Issuance
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#15803d' }}>
                    Ready to send the final official certificate to the client
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 10, padding: '14px 16px', marginBottom: 18, color: '#854d0e', fontSize: 13, lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, marginBottom: 4 }}>
                  <AlertTriangle size={16} color="#d97706" /> Are you sure and don't want to change anything?
                </div>
                Please make sure all information (Company Name, Addresses, Dates, and Products) is accurate. Once approved, the certificate will be immediately published to the client portal and an official email will be sent to the client.
              </div>

              {/* Summary verification box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Certificate Number:</span>
                  <strong style={{ color: '#0f172a' }}>{form.certificate_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Company Name:</span>
                  <strong style={{ color: '#0f172a' }}>{form.company_name}</strong>
                </div>
                {(form.product_category || form.scope) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Product Category:</span>
                    <strong style={{ color: '#0369a1' }}>{form.product_category || form.scope}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Scheme:</span>
                  <strong style={{ color: '#0f172a' }}>{form.certificate_type}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Validity:</span>
                  <strong style={{ color: '#047857' }}>{form.issue_date} ➔ {form.expiry_date}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Products:</span>
                  <strong style={{ color: '#0f172a' }}>{form.product_details.length} Certified Products</strong>
                </div>
                {clientUser?.email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                    <span style={{ color: '#64748b' }}>Recipient Client Email:</span>
                    <strong style={{ color: '#047857' }}>{clientUser.email}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowConfirmModal(false)}
                disabled={approving}
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                Cancel / Keep Editing
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApproveAndSend}
                disabled={approving}
                style={{
                  background: '#047857',
                  borderColor: '#047857',
                  fontSize: 13,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Send size={15} />
                {approving ? 'Issuing & Sending to Client...' : 'Yes, Approve & Send to Client'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
