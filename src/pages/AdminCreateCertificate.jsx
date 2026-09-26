import { getPdfUrl } from '../lib/pdfUtils';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Award, ArrowLeft, RefreshCw, Send, FileText,
  AlertTriangle, Building, Building2, MapPin, Calendar, Package, Plus, Trash2,
  ExternalLink, Download, Check, X, ShieldCheck, Eye,
  Search, CheckSquare, Square, Filter, Layers, Info, CheckCircle,
  CheckCircle2, ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { generateHfaId, normalizeHfaTypeCode } from '../lib/idGenerator';
import { useAuth } from '../context/AuthContext';

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

const CERTIFICATE_TYPES = [
  'HFA SCHEME MEAT',
  'HFA SCHEME NON MEAT',
  'GSO MEAT',
  'GSO NON MEAT',
  'COSMETICS',
  'SMIIC'
];

export default function AdminCreateCertificate() {
  const { appId } = useParams();
  const navigate = useNavigate();

  const { user, profile } = useAuth();
  const currentUser = profile || user;
  const userRoles = Array.isArray(currentUser?.roles) && currentUser.roles.length > 0
    ? currentUser.roles
    : (currentUser?.role ? [currentUser.role] : []);
  const isSuperAdmin = userRoles.includes('superadmin') || currentUser?.role === 'superadmin';
  const canReviewCertificate = isSuperAdmin || Boolean(currentUser?.can_review_certificate);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [app, setApp] = useState(null);
  const [clientUser, setClientUser] = useState(null);
  const [siteData, setSiteData] = useState(null);
  const [suggestedCertType, setSuggestedCertType] = useState('');
  const [existingCert, setExistingCert] = useState(null);

  // Client & Site Selection (Direct Certificate Pattern)
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [customSiteAddress, setCustomSiteAddress] = useState('');

  // Products
  const [siteProducts, setSiteProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAddCustomProduct, setShowAddCustomProduct] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdCat, setNewProdCat] = useState('General Food Products');

  // Live PDF Preview
  const [livePreviewUrl, setLivePreviewUrl] = useState(null);
  const [previewTimestamp, setPreviewTimestamp] = useState(Date.now());
  const [generatingPreview, setGeneratingPreview] = useState(false);

  // Form State
  const [form, setForm] = useState({
    certificate_number: '',
    certificate_type: 'HFA SCHEME MEAT',
    company_name: '',
    product_category: '',
    company_address: '',
    manufacturing_address: '',
    scope: 'Halal Food Certification',
    issue_date: new Date().toISOString().split('T')[0],
    current_cycle_start_date: new Date().toISOString().split('T')[0],
    original_cycle_start_date: new Date().toISOString().split('T')[0],
    certification_start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    products_covered: [],
    product_details: [],
    product_table_columns: 1,
    review_notes: ''
  });

  const isGso = form.certificate_type.includes('GSO') || form.certificate_type.includes('SMIIC');
  const isAddOn = Boolean(app?.application_type === 'addon' || app?.is_add_on || app?.addon_application_id);
  const isSurveillance = Boolean(app?.application_type === 'surveillance' || app?.category === 'Surveillance');

  // 1. Fetch Application & Associated Data
  useEffect(() => {
    let isMounted = true;

    const fetchAppData = async () => {
      setLoading(true);
      try {
        let appData = null;
        try {
          const res = await api.get(`/api/applications/${appId}`);
          appData = res.data?.data || res.data;
        } catch (_) {
          try {
            const addRes = await api.get(`/api/add-on-applications/${appId}`);
            appData = addRes.data?.data || addRes.data;
          } catch (e) {
            console.error('Could not find application:', e);
          }
        }

        if (!appData) {
          toast.error('Application not found.');
          navigate('/certificates');
          return;
        }

        if (!isMounted) return;
        setApp(appData);

        // Check if certificate already exists for this application
        try {
          const certsRes = await api.get('/api/certificates');
          const allCerts = Array.isArray(certsRes.data?.data) ? certsRes.data.data : (Array.isArray(certsRes.data) ? certsRes.data : []);
          const existing = allCerts.find(c => String(c.application_id?._id || c.application_id) === String(appId));
          if (existing) {
            setExistingCert(existing);
          }
        } catch (_) {}

        // Fetch all clients & sites for company/site selector
        let clientAccounts = [];
        let siteList = [];
        try {
          const [usersRes, sitesRes] = await Promise.all([
            api.get('/api/users').catch(() => ({ data: [] })),
            api.get('/api/sites').catch(() => ({ data: [] }))
          ]);
          const userList = Array.isArray(usersRes) ? usersRes : (Array.isArray(usersRes?.data) ? usersRes.data : []);
          siteList = Array.isArray(sitesRes) ? sitesRes : (Array.isArray(sitesRes?.data) ? sitesRes.data : []);
          clientAccounts = userList.filter(u => u.role === 'client');
          if (isMounted) {
            setClients(clientAccounts);
            setSites(siteList);
          }
        } catch (_) {}

        // Resolve client details
        const clientId = appData.client_id?._id || appData.client_id?.id || appData.client_id || appData.profiles?._id || appData.profiles?.id || appData.profiles;
        let resolvedClient = appData.client_id && typeof appData.client_id === 'object' ? appData.client_id : (appData.profiles || null);

        if (clientId && typeof clientId === 'string') {
          const foundClientInList = clientAccounts.find(c => String(c._id || c.id) === String(clientId));
          if (foundClientInList) {
            resolvedClient = foundClientInList;
          } else {
            try {
              const userRes = await api.get(`/api/users/${clientId}`);
              resolvedClient = userRes.data?.data || userRes.data || resolvedClient;
            } catch (_) {}
          }
        }
        setClientUser(resolvedClient);
        if (resolvedClient) {
          setSelectedClient(resolvedClient);
          setClientSearchQuery(resolvedClient.company_name || resolvedClient.full_name || '');
        }

        // Resolve Site
        let siteId = appData.site_id?._id || appData.site_id?.id || appData.site_id;
        const isAppAddOn = Boolean(appData.application_type === 'addon' || appData.is_add_on || appData.addon_application_id || appData.type === 'addon');

        // If site is not directly on add-on, resolve from parent application or linked certificate
        let parentCertData = null;
        if (!siteId && (appData.application_id || appData.original_application_id || appData.certificate_id)) {
          const parentAppId = appData.application_id?._id || appData.application_id || appData.original_application_id?._id || appData.original_application_id;
          if (parentAppId) {
            try {
              const pAppRes = await api.get(`/api/applications/${parentAppId}`);
              const pAppData = pAppRes.data?.data || pAppRes.data;
              if (pAppData?.site_id) {
                siteId = pAppData.site_id?._id || pAppData.site_id?.id || pAppData.site_id;
              }
            } catch (_) {}
          }
          if (!siteId && appData.certificate_id) {
            const certId = appData.certificate_id?._id || appData.certificate_id;
            try {
              const certRes = await api.get(`/api/certificates/${certId}`);
              parentCertData = certRes.data?.data || certRes.data;
              if (parentCertData?.site_id) {
                siteId = parentCertData.site_id?._id || parentCertData.site_id?.id || parentCertData.site_id;
              }
            } catch (_) {}
          }
        }

        let resolvedSite = null;
        if (siteId && typeof siteId === 'string') {
          const foundSiteInList = siteList.find(s => String(s._id || s.id) === String(siteId));
          if (foundSiteInList) {
            resolvedSite = foundSiteInList;
            setSiteData(resolvedSite);
            setSelectedSiteId(String(siteId));
          } else {
            try {
              const siteRes = await api.get(`/api/sites/${siteId}`);
              resolvedSite = siteRes.data?.data || siteRes.data;
              setSiteData(resolvedSite);
              setSelectedSiteId(String(siteId));
            } catch (_) {}
          }
        } else if (appData.site_id && typeof appData.site_id === 'object') {
          resolvedSite = appData.site_id;
          setSiteData(resolvedSite);
          if (resolvedSite._id || resolvedSite.id) {
            setSelectedSiteId(String(resolvedSite._id || resolvedSite.id));
          }
        }

        // Fetch Logsheet for reviewer suggestion
        try {
          const logsRes = await api.get('/api/application-logsheets');
          const allLogs = logsRes.data?.data || logsRes.data || [];
          const matchedLog = allLogs.find(l => String(l.application_id?._id || l.application_id) === String(appId));
          if (matchedLog?.suggested_certificate_type) {
            setSuggestedCertType(matchedLog.suggested_certificate_type);
          }
        } catch (_) {}

        // Fetch Site Products (for add-on applications, must load all site products)
        let prodList = [];
        try {
          const prodRes = await api.get('/api/products');
          const allProds = prodRes.data?.data || prodRes.data || [];
          if (Array.isArray(allProds)) {
            const curSiteId = String(resolvedSite?._id || resolvedSite?.id || siteId?._id || siteId || '');
            const curClientId = String(clientId || '');

            if (curSiteId) {
              prodList = allProds.filter(p => {
                const pSiteId = String(p.site_id?._id || p.site_id || '');
                return pSiteId === curSiteId;
              });
            }

            // Fallback for standard (non-addon) apps to client ID if site had no products
            if (prodList.length === 0 && !isAppAddOn && curClientId) {
              prodList = allProds.filter(p => {
                const pClientId = String(p.client_id?._id || p.client_id || '');
                return pClientId === curClientId;
              });
            }
          }
        } catch (_) {}

        // For add-on apps, if catalog query yielded 0, check the linked certificate's certified_products
        if (isAppAddOn && prodList.length === 0) {
          if (!parentCertData && appData.certificate_id) {
            try {
              const certId = appData.certificate_id?._id || appData.certificate_id;
              const certRes = await api.get(`/api/certificates/${certId}`);
              parentCertData = certRes.data?.data || certRes.data;
            } catch (_) {}
          }
          if (Array.isArray(parentCertData?.certified_products) && parentCertData.certified_products.length > 0) {
            prodList = parentCertData.certified_products.map((p, idx) => ({
              _id: p._id || `cert-prod-${idx}`,
              name: p.name || p.product_name || `Product ${idx + 1}`,
              code: p.code || p.product_code || `PRD-${idx + 1}`,
              category: p.category || 'General Food Products'
            }));
          }
        }

        // If no catalog products, use products from application form ONLY for non-add-on applications
        if (!isAppAddOn && prodList.length === 0 && Array.isArray(appData.products) && appData.products.length > 0) {
          prodList = appData.products.map((p, idx) => ({
            _id: `app-prod-${idx}`,
            name: typeof p === 'string' ? p : (p.name || p.product_name || `Product ${idx + 1}`),
            code: p.code || p.product_code || `PRD-${idx + 1}`,
            category: p.category || 'General Food Products'
          }));
        }

        const scheduledProds = prodList.map(p => ({
          _id: p._id || p.id,
          name: p.name || p.product_name || '',
          code: p.code || p.product_code || '',
          category: p.category || 'General Food Products',
          isSelected: true
        }));

        setSiteProducts(scheduledProds);

        // Prepopulate form
        const compName = appData.establishment_name || resolvedClient?.company_name || resolvedClient?.full_name || '';
        const compAddr = appData.establishment_address || resolvedClient?.address || '';
        const mfgAddr = appData.site_id?.address || appData.site_address || appData.manufacturer_address || compAddr;
        const initialScope = appData.scope || 'Halal Food Certification';
        const typeCode = isAddOn ? 'AD' : normalizeHfaTypeCode(appData.application_type);
        const certNum = generateHfaId(compName || 'HFA', typeCode);

        const enforcedYears = (appData.category?.includes('GSO') || appData.category?.includes('SMIIC')) ? 3 : 1;
        const today = new Date();
        const expDate = new Date(today);
        expDate.setFullYear(expDate.getFullYear() + enforcedYears);

        const initialCertType = appData.suggested_certificate_type || appData.certificate_type || (appData.category?.includes('GSO') ? 'GSO NON MEAT' : 'HFA SCHEME NON MEAT');
        const isInitGso = initialCertType.includes('GSO') || initialCertType.includes('SMIIC');

        setForm(f => ({
          ...f,
          certificate_number: certNum,
          certificate_type: initialCertType,
          company_name: compName,
          company_address: compAddr,
          manufacturing_address: mfgAddr,
          scope: initialScope,
          product_category: initialScope,
          expiry_date: expDate.toISOString().split('T')[0],
          product_table_columns: isInitGso ? 2 : 1,
          product_details: scheduledProds,
          products_covered: scheduledProds.map(p => p.name).filter(Boolean)
        }));

      } catch (err) {
        console.error('Failed to load application data:', err);
        toast.error('Failed to load application details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAppData();

    return () => { isMounted = false; };
  }, [appId, navigate]);

  const formatSiteAddress = (site) => {
    if (!site) return '';
    const parts = [site.address_1 || site.address, site.address_2, site.city, site.state, site.postcode, site.country].map(p => (p || '').trim()).filter(Boolean);
    return parts.join(', ');
  };

  const formatClientAddress = (client) => {
    if (!client) return '';
    const parts = [client.address, client.postcode, client.country].map(p => (p || '').trim()).filter(Boolean);
    return parts.join(', ');
  };

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return [];
    const q = clientSearchQuery.toLowerCase();
    return clients.filter(c =>
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [clients, clientSearchQuery]);

  const clientSites = useMemo(() => {
    if (!selectedClient) return [];
    const clientId = String(selectedClient._id || selectedClient.id || '');
    return sites.filter(s => {
      const sClientId = s.client_id ? (typeof s.client_id === 'object' ? (s.client_id._id || s.client_id.id) : s.client_id) : null;
      return String(sClientId) === clientId;
    });
  }, [sites, selectedClient]);

  const availableSites = useMemo(() => {
    const list = [...clientSites];
    if (siteData && (siteData._id || siteData.id)) {
      const sId = String(siteData._id || siteData.id);
      if (!list.some(s => String(s._id || s.id) === sId)) {
        list.unshift(siteData);
      }
    }
    return list;
  }, [clientSites, siteData]);

  const selectedSite = useMemo(() => {
    if (!selectedSiteId) return null;
    return availableSites.find(s => String(s._id || s.id) === String(selectedSiteId)) || null;
  }, [selectedSiteId, availableSites]);

  const handleSelectClient = async (c) => {
    setSelectedClient(c);
    setClientSearchQuery(c.company_name || c.full_name || '');
    const cAddr = formatClientAddress(c);
    const compName = c.company_name || c.full_name || '';
    const typeCode = isAddOn ? 'AD' : normalizeHfaTypeCode(app?.application_type);
    const newCertNum = generateHfaId(compName || 'HFA', typeCode);

    setForm(f => ({
      ...f,
      certificate_number: newCertNum,
      company_name: compName,
      company_address: cAddr || f.company_address,
      manufacturing_address: cAddr || f.manufacturing_address
    }));
    setSelectedSiteId('');
    setCustomSiteAddress('');

    const cId = c._id || c.id;
    if (cId) {
      try {
        const pRes = await api.get(`/api/products?client_id=${cId}`);
        const pList = Array.isArray(pRes.data?.data) ? pRes.data.data : (Array.isArray(pRes.data) ? pRes.data : (Array.isArray(pRes) ? pRes : []));
        if (pList.length > 0) {
          const mapped = pList.map(p => ({
            _id: p._id || p.id,
            name: p.name || p.product_name || '',
            code: p.code || p.product_code || '',
            category: p.category || 'General Food Products',
            isSelected: true
          }));
          setSiteProducts(mapped);
        }
      } catch (_) {}
    }
  };

  const handleSiteChange = (sId) => {
    setSelectedSiteId(sId);
    const foundSite = availableSites.find(s => String(s._id || s.id) === String(sId));
    if (foundSite) {
      const siteAddr = formatSiteAddress(foundSite);
      const mfgText = foundSite.name ? `${foundSite.name}, ${siteAddr}` : siteAddr;
      setCustomSiteAddress(siteAddr);
      setForm(f => ({
        ...f,
        manufacturing_address: mfgText,
        company_address: f.company_address || siteAddr
      }));
    } else {
      setCustomSiteAddress('');
    }
  };

  // Apply validity preset
  const applyValidityPreset = (years, months = 0) => {
    const start = form.issue_date ? new Date(form.issue_date) : new Date();
    const end = new Date(start);
    if (years !== undefined) end.setFullYear(end.getFullYear() + years);
    if (months) end.setMonth(end.getMonth() + months);
    setForm(f => ({ ...f, expiry_date: end.toISOString().split('T')[0] }));
  };

  // Switch Scheme
  const handleTypeChange = (newType) => {
    const isNewTypeGso = newType.includes('GSO') || newType.includes('SMIIC');
    const enforcedYears = isNewTypeGso ? 3 : 1;
    const start = form.issue_date ? new Date(form.issue_date) : new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + enforcedYears);

    setForm(f => ({
      ...f,
      certificate_type: newType,
      expiry_date: end.toISOString().split('T')[0],
      product_table_columns: isNewTypeGso ? 2 : 1
    }));
  };

  // Product Selection Toggle
  const toggleProductSelect = (idx) => {
    setSiteProducts(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], isSelected: !next[idx].isSelected };
      const selectedNames = next.filter(p => p.isSelected).map(p => p.name);
      setForm(f => ({
        ...f,
        products_covered: selectedNames,
        product_details: next
      }));
      return next;
    });
  };

  // Select/Deselect All Products
  const toggleAllProducts = (select) => {
    setSiteProducts(prev => {
      const next = prev.map(p => ({ ...p, isSelected: select }));
      const selectedNames = next.filter(p => p.isSelected).map(p => p.name);
      setForm(f => ({
        ...f,
        products_covered: selectedNames,
        product_details: next
      }));
      return next;
    });
  };

  // Add Custom Product Row
  const handleAddCustomProduct = () => {
    if (!newProdName.trim()) {
      return toast.error('Product Name is required.');
    }
    const newP = {
      _id: `custom-${Date.now()}`,
      name: newProdName.trim(),
      code: newProdCode.trim() || `PRD-${siteProducts.length + 1}`,
      category: newProdCat || 'General Food Products',
      isSelected: true
    };
    const updated = [newP, ...siteProducts];
    setSiteProducts(updated);
    setForm(f => ({
      ...f,
      products_covered: updated.filter(p => p.isSelected).map(p => p.name),
      product_details: updated
    }));
    setNewProdName('');
    setNewProdCode('');
    setShowAddCustomProduct(false);
    toast.success('Product added to certificate schedule!');
  };

  // Filtered Products for Display
  const filteredProducts = useMemo(() => {
    return siteProducts.filter(p => {
      const matchesSearch = !productSearch.trim() ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase()));
      const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [siteProducts, productSearch, categoryFilter]);

  // Live PDF Preview Generator
  const generateLivePreview = async (silent = false) => {
    if (!form.company_name?.trim() && !selectedClient) {
      if (!silent) toast.error('Please specify company details first.');
      return;
    }

    setGeneratingPreview(true);
    try {
      const selectedProds = siteProducts.filter(p => p.isSelected);
      const validProducts = selectedProds.map((p, idx) => ({
        name: (p.name || '').trim(),
        code: (p.code || '').trim() || `PRD-${String(idx + 1).padStart(2, '0')}`,
        category: p.category || form.product_category || 'Halal Certified',
        barcode: p.barcode || ''
      })).filter(p => p.name);

      const compName = (form.company_name || selectedClient?.company_name || selectedClient?.full_name || 'Valued Halal Client').trim();
      const compAddr = (form.company_address || formatClientAddress(selectedClient) || '').trim() || 'Registered Business Address';
      const mfgAddr = (form.manufacturing_address || compAddr).trim() || 'Manufacturing Facility Address';

      const payload = {
        certificate_number: (form.certificate_number || 'HFA-PREVIEW-001').trim(),
        certificate_type: form.certificate_type || 'HFA SCHEME MEAT',
        company_name: compName,
        company_address: compAddr,
        manufacturing_address: mfgAddr,
        scope: form.product_category || form.scope || 'Halal Food Certification',
        product_category: form.product_category || form.scope || 'Halal Food Certification',
        issue_date: form.issue_date || new Date().toISOString().split('T')[0],
        expiry_date: form.expiry_date || '',
        current_cycle_start_date: isGso ? (form.current_cycle_start_date || form.issue_date) : form.issue_date,
        original_cycle_start_date: isGso ? (form.original_cycle_start_date || form.issue_date) : form.issue_date,
        certification_start_date: form.certification_start_date || form.issue_date,
        product_table_columns: Number(form.product_table_columns) || (isGso ? 2 : 1),
        products: validProducts.length > 0 ? validProducts : [{ name: 'Certified Halal Products Schedule', code: 'PRD-01', category: 'Halal Certified' }],
        product_details: validProducts.length > 0 ? validProducts : [{ name: 'Certified Halal Products Schedule', code: 'PRD-01', category: 'Halal Certified' }]
      };

      const res = await api.post('/api/certificates/preview-live', payload);

      const url = res?.previewUrl || res?.data?.previewUrl || res?.certificateUrl || res?.data?.certificateUrl || res?.url;
      if (url) {
        setLivePreviewUrl(url);
        setPreviewTimestamp(Date.now());
        if (!silent) toast.success('Live certificate preview updated!');
      } else {
        if (!silent) toast.error('Preview generated but no URL returned.');
      }
    } catch (err) {
      console.error('PDF preview error:', err);
      if (!silent) toast.error('PDF Preview failed: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleRegeneratePdf = () => generateLivePreview(false);

  // Auto-generate preview on initial load once application & client data are loaded
  useEffect(() => {
    if (!loading && form.company_name && !livePreviewUrl) {
      generateLivePreview(true);
    }
  }, [loading, form.company_name, livePreviewUrl]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) return toast.error('Company name is required.');
    if (!form.issue_date || !form.expiry_date) return toast.error('Validity dates are required.');

    setSubmitting(true);
    try {
      const selectedProds = siteProducts.filter(p => p.isSelected);
      const clientId = selectedClient?._id || selectedClient?.id || clientUser?._id || clientUser?.id || app?.client_id?._id || app?.client_id || app?.profiles?._id || app?.profiles;
      const siteId = selectedSiteId || siteData?._id || siteData?.id || app?.site_id?._id || app?.site_id;

      const formData = new FormData();
      formData.append('application_id', appId);
      if (clientId) formData.append('client_id', clientId);
      if (siteId) formData.append('site_id', siteId);
      formData.append('certificate_number', form.certificate_number);
      formData.append('certificate_type', form.certificate_type);
      formData.append('company_name', form.company_name);
      formData.append('company_address', form.company_address);
      formData.append('manufacturing_address', form.manufacturing_address);
      formData.append('scope', form.scope);
      formData.append('issue_date', form.issue_date);
      formData.append('expiry_date', form.expiry_date);
      formData.append('current_cycle_start_date', form.current_cycle_start_date || form.issue_date);
      formData.append('original_cycle_start_date', form.original_cycle_start_date || form.issue_date);
      formData.append('certification_start_date', form.certification_start_date || form.issue_date);
      formData.append('product_table_columns', form.product_table_columns);
      formData.append('status', 'under_review');
      formData.append('products_covered', JSON.stringify(selectedProds.map(p => p.name)));
      formData.append('product_details', JSON.stringify(selectedProds));
      if (form.review_notes) formData.append('notes', form.review_notes);
      if (isAddOn) formData.append('is_add_on', 'true');

      const certRes = await api.post('/api/certificates', formData, true);

      toast.success('Certificate created successfully! Opening Review Studio...');
      const createdCertId = certRes?.certificate?._id || certRes?.certificate?.id || certRes?._id || certRes?.id || certRes?.data?._id || certRes?.data?.id || certRes?.data?.certificate?._id;
      if (createdCertId) {
        navigate(`/certificates/${createdCertId}/review`);
      } else {
        navigate('/certificates?status=under_review');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <RefreshCw size={36} className="spin" style={{ color: '#16a34a' }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>Loading Certificate Studio...</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: 'Inter, sans-serif' }}>
        <AlertTriangle size={40} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Application Not Found</h2>
        <p style={{ color: '#64748b', fontSize: 13.5, margin: '8px 0 20px' }}>The requested application could not be loaded or does not exist.</p>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/certificates')}
        >
          Back to Certificates
        </button>
      </div>
    );
  }

  const selectedCount = siteProducts.filter(p => p.isSelected).length;
  const rawPdfUrl = getPdfUrl(livePreviewUrl);
  const pdfUrl = rawPdfUrl ? (rawPdfUrl.includes('?') ? `${rawPdfUrl}&t=${previewTimestamp}` : `${rawPdfUrl}?t=${previewTimestamp}`) : '';
  const regenerating = generatingPreview;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      <style>{`
        .spinner {
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .custom-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.03);
          overflow: hidden;
          margin-bottom: 20px;
        }
        .custom-card-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
        }
        .custom-card-body {
          padding: 20px;
        }
        .form-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 6px;
        }
        .form-control {
          width: 100%;
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13.5px;
          color: #0f172a;
          outline: none;
          transition: all 0.15s ease;
        }
        .form-control:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
        }
        .btn-preset {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-preset:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
      `}</style>

      {/* Top Breadcrumbs and Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Link to={isAddOn ? `/addon-applications/${appId}/processing` : `/applications/${appId}/processing`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
              <ArrowLeft size={14} /> Back to Application
            </Link>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>Issue Certificate Studio</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={24} style={{ color: '#16a34a' }} />
              Issue &amp; Generate Certificate
            </h1>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 20,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a'
            }}>
              Draft &bull; Ready for Review
            </span>
          </div>
        </div>

        {/* Quick meta details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#ffffff', padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <strong>Client:</strong> {form.company_name || '—'}
          </div>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <strong>App #:</strong> <span style={{ color: '#0f172a', fontWeight: 700 }}>{app?.application_number || '—'}</span>
            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginTop: 1 }}>
              Type: {app?.application_type ? (app.application_type.charAt(0).toUpperCase() + app.application_type.slice(1)) : (isAddOn ? 'Addon' : 'New')}
            </div>
          </div>
        </div>
      </div>

      {/* Existing Certificate Banner if already created */}
      {existingCert && (
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: 12,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Info size={20} style={{ color: '#d97706', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>
                Certificate Already Generated for this Application
              </div>
              <div style={{ fontSize: 12.5, color: '#b45309', marginTop: 2 }}>
                Certificate <strong>{existingCert.certificate_number}</strong> ({existingCert.status}) already exists. You can review or edit it directly.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/certificates/${existingCert._id || existingCert.id}/review`)}
            className="btn btn-primary"
            style={{ background: '#d97706', borderColor: '#b45309', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
          >
            Open in Review Studio <Eye size={14} />
          </button>
        </div>
      )}

      {/* Main Dual-Pane Layout */}
      <form onSubmit={handleSubmit}>
        <div className="dual-pane-grid" style={{ gap: 24, alignItems: 'start' }}>

          {/* LEFT PANE: Live Certificate Document Preview — STICKY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 'calc(var(--topbar-h, 64px) + 20px)' }}>
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
                    key={pdfUrl}
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
          </div>

          {/* RIGHT PANE: Certificate Configuration Form Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Suggested Scheme Banner from Logsheet */}
            {suggestedCertType && (
              <div style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: 12,
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Award size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                      Auditor Recommended Scheme: <span style={{ background: '#dcfce7', padding: '2px 8px', borderRadius: 6, color: '#15803d' }}>{suggestedCertType}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#15803d', opacity: 0.9, marginTop: 2 }}>
                      Recommended during technical review and committee sign-off
                    </div>
                  </div>
                </div>
                {form.certificate_type !== suggestedCertType && (
                  <button
                    type="button"
                    onClick={() => handleTypeChange(suggestedCertType)}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#16a34a', borderColor: '#16a34a', fontSize: 12 }}
                  >
                    Apply Scheme
                  </button>
                )}
              </div>
            )}

            {/* CARD 1: Certificate & Scheme Details */}
            <div className="custom-card">
              <div className="custom-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Award size={18} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>1. Certificate Details &amp; Type</span>
                </div>
              </div>
              <div className="custom-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  <div>
                    <label className="form-label">
                      Certificate Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.certificate_number}
                      onChange={e => setForm(f => ({ ...f, certificate_number: e.target.value }))}
                      required
                      placeholder="e.g. HFA-NE-2026-102"
                      style={{ fontWeight: 700, color: '#047857' }}
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Certificate Type <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={form.certificate_type}
                      onChange={e => handleTypeChange(e.target.value)}
                      style={{ fontWeight: 600 }}
                    >
                      {CERTIFICATE_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Certification Scope</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    value={form.scope}
                    onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                    placeholder="e.g. Halal Food Production, Processing and Packaging"
                  />
                </div>
              </div>
            </div>

            {/* CARD 2: Company & Facility Information — READ ONLY (locked from application) */}
            <div className="custom-card">
              <div className="custom-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Building2 size={18} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>2. Company &amp; Facility Information</span>
                </div>
                {/* Locked badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: 20, padding: '4px 10px',
                  fontSize: 11.5, fontWeight: 700, color: '#64748b'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Linked from Application
                </div>
              </div>
              <div className="custom-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Read-only client info strip */}
                <div style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: 12,
                  overflow: 'hidden'
                }}>
                  {/* Company row */}
                  <div style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    borderBottom: '1px solid #dcfce7'
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: '#dcfce7', color: '#15803d',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Building2 size={20} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                        Certified Company
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#14532d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedClient?.company_name || selectedClient?.full_name || clientUser?.company_name || clientUser?.full_name || form.company_name || '—'}
                      </div>
                      {(selectedClient?.email || clientUser?.email) && (
                        <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
                          {selectedClient?.email || clientUser?.email}
                          {(selectedClient?.country || clientUser?.country) ? ` · ${selectedClient?.country || clientUser?.country}` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{
                      background: '#dcfce7', border: '1px solid #86efac',
                      borderRadius: 8, padding: '4px 10px',
                      fontSize: 11, fontWeight: 700, color: '#15803d',
                      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <CheckCircle2 size={12} /> Confirmed
                    </div>
                  </div>

                  {/* Site row */}
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, background: '#f8fffe' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: '#ecfdf5', color: '#059669',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <MapPin size={20} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                        Certified Facility / Site
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                        {selectedSite?.name || siteData?.name || '—'}
                      </div>
                      {(selectedSite || siteData) && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {formatSiteAddress(selectedSite || siteData)}
                        </div>
                      )}
                    </div>
                    {selectedSiteId && (
                      <div style={{
                        background: '#ecfdf5', border: '1px solid #6ee7b7',
                        borderRadius: 8, padding: '4px 10px',
                        fontSize: 11, fontWeight: 700, color: '#059669',
                        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <CheckCircle2 size={12} /> Assigned
                      </div>
                    )}
                  </div>
                </div>

                {/* Note explaining lock */}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#64748b'
                }}>
                  <Info size={14} style={{ color: '#94a3b8', marginTop: 1, flexShrink: 0 }} />
                  <span>Company and site are <strong>linked from the original application</strong> and cannot be changed here. The certificate addresses below can be adjusted if needed for printing.</span>
                </div>

                {/* Editable Document Fields — address formatting for the PDF */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="form-label">
                      Certified Company Legal Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.company_name}
                      onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                      required
                      placeholder="Official Registered Company Name"
                      style={{ fontWeight: 600 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <div>
                      <label className="form-label">Company Registered Address</label>
                      <textarea
                        rows={2}
                        className="form-control"
                        value={form.company_address}
                        onChange={e => setForm(f => ({ ...f, company_address: e.target.value }))}
                        placeholder="Headquarters / Registered Address"
                      />
                    </div>

                    <div>
                      <label className="form-label">Manufacturing / Facility Address</label>
                      <textarea
                        rows={2}
                        className="form-control"
                        value={form.manufacturing_address}
                        onChange={e => setForm(f => ({ ...f, manufacturing_address: e.target.value }))}
                        placeholder="Site production facility address"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: Validity & Lifecycle Dates */}
            <div className="custom-card">
              <div className="custom-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Calendar size={18} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>3. Validity &amp; Lifecycle Dates</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Presets:</span>
                  <button type="button" className="btn-preset" onClick={() => applyValidityPreset(1)}>+1 Year</button>
                  <button type="button" className="btn-preset" onClick={() => applyValidityPreset(2)}>+2 Years</button>
                  <button type="button" className="btn-preset" onClick={() => applyValidityPreset(3)}>+3 Years</button>
                </div>
              </div>
              <div className="custom-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div>
                    <label className="form-label">
                      Issue Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.issue_date}
                      onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Expiry Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.expiry_date}
                      onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                      required
                      style={{ fontWeight: 700, color: '#b91c1c' }}
                    />
                  </div>

                  {isGso && (
                    <>
                      <div>
                        <label className="form-label">Current Cycle Start</label>
                        <input
                          type="date"
                          className="form-control"
                          value={form.current_cycle_start_date}
                          onChange={e => setForm(f => ({ ...f, current_cycle_start_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="form-label">Original Cycle Start</label>
                        <input
                          type="date"
                          className="form-control"
                          value={form.original_cycle_start_date}
                          onChange={e => setForm(f => ({ ...f, original_cycle_start_date: e.target.value }))}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 4: Certified Product Schedule */}
            <div className="custom-card">
              <div className="custom-card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Package size={18} style={{ color: '#16a34a' }} />
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>4. Certified Product Schedule</span>
                    <span style={{ fontSize: 12, background: '#f0fdf4', color: '#166534', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                      {selectedCount} Selected
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleAllProducts(true)}
                    style={{ fontSize: 12, color: '#16a34a' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleAllProducts(false)}
                    style={{ fontSize: 12, color: '#64748b' }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="custom-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Table Layout Selector (All 3 on one line) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
                    Schedule Table Column Format:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {[
                      { cols: 1, label: '1 Column (Name Only)' },
                      { cols: 2, label: '2 Columns (Code + Desc)' },
                      { cols: 3, label: '3 Columns (+ Category)' }
                    ].map(({ cols, label }) => (
                      <button
                        key={cols}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, product_table_columns: cols }))}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: form.product_table_columns === cols ? 700 : 500,
                          border: form.product_table_columns === cols ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                          background: form.product_table_columns === cols ? '#eff6ff' : '#ffffff',
                          color: form.product_table_columns === cols ? '#1d4ed8' : '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Custom Product Form (collapsible) */}
                {showAddCustomProduct && (
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#166534', marginBottom: 10 }}>
                      Add Custom Product to Schedule
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 180px auto', gap: 10, alignItems: 'end' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: 11.5 }}>Product Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Pure Halal Beef Patty"
                          value={newProdName}
                          onChange={e => setNewProdName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: 11.5 }}>Product Code</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. PRD-01"
                          value={newProdCode}
                          onChange={e => setNewProdCode(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: 11.5 }}>Category</label>
                        <select
                          className="form-control"
                          value={newProdCat}
                          onChange={e => setNewProdCat(e.target.value)}
                        >
                          {PRODUCT_CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomProduct}
                        className="btn btn-primary"
                        style={{ background: '#16a34a', borderColor: '#16a34a', height: 38 }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Search and Category Filter */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search scheduled products..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      style={{ paddingLeft: 32, fontSize: 12.5 }}
                    />
                  </div>
                  <select
                    className="form-control"
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    style={{ width: 180, fontSize: 12.5 }}
                  >
                    <option value="ALL">All Categories</option>
                    {PRODUCT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Products List with Checkboxes */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  maxHeight: 280,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: 8
                }}>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p, idx) => {
                      const actualIdx = siteProducts.findIndex(sp => sp._id === p._id || (sp.name === p.name && sp.code === p.code));
                      const isChecked = p.isSelected !== false;
                      return (
                        <div
                          key={p._id || idx}
                          onClick={() => actualIdx !== -1 && toggleProductSelect(actualIdx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isChecked ? '#ffffff' : '#f1f5f9',
                            border: isChecked ? '1px solid #16a34a' : '1px solid #cbd5e1',
                            borderRadius: 8,
                            padding: '8px 12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => actualIdx !== -1 && toggleProductSelect(actualIdx)}
                              onClick={e => e.stopPropagation()}
                              style={{ accentColor: '#16a34a', width: 16, height: 16, cursor: 'pointer' }}
                            />
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 13, color: isChecked ? '#0f172a' : '#64748b' }}>
                                {p.name}
                              </span>
                              {p.code && (
                                <span style={{ marginLeft: 8, fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                                  {p.code}
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500 }}>
                            {p.category || 'General Food Products'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      <Package size={28} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
                      <div style={{ fontSize: 13, fontWeight: 600 }}>No products matched filter</div>
                      <div style={{ fontSize: 11.5, marginTop: 2 }}>Select certified products from the schedule list above.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>



            {/* Bottom Action Buttons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              padding: '16px 24px',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              position: 'sticky',
              bottom: 20,
              zIndex: 40
            }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-ghost"
                style={{ fontWeight: 700, padding: '10px 20px' }}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 800,
                    fontSize: 14,
                    padding: '11px 26px',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    borderColor: '#15803d',
                    borderRadius: 10,
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                  }}
                >
                  {submitting ? (
                    <>
                      <span className="spin"><RefreshCw size={16} /></span>
                      Creating Certificate...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Submit to Review
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>
      </form>
    </div>
  );
}
