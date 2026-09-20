import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { generateHfaId } from '../lib/idGenerator';
import {
  Award, Shield, ShieldCheck, Plus, Trash2, Copy, Download, Search,
  CheckCircle2, AlertTriangle, FileText, Sparkles, Building2, Package,
  Calendar, Check, X, ArrowRight, RefreshCw, Upload, Eye, FileCheck2,
  Lock, ExternalLink, HelpCircle, Layers, AlertCircle, Info,
  CheckSquare, Square, Filter, ListChecks, CheckCheck
} from 'lucide-react';

const CERTIFICATE_TYPES = [
  'GSO MEAT',
  'GSO NON MEAT',
  'HFA SCHEME MEAT',
  'HFA SCHEME NON MEAT',
  'COSMETICS',
  'SMIIC'
];



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

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';
  const cleanApi = API_URL.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanApi}${cleanPath}`;
};

export default function SuperAdminDirectCertificate() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Role & Privilege Security Check
  const userRoles = Array.isArray(profile?.roles) && profile.roles.length > 0 ? profile.roles : (profile?.role ? [profile.role] : (Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean)));
  const isSuperAdmin = userRoles.includes('superadmin');
  const isCertificateOfficer = userRoles.includes('certificate_officer');
  const hasDirectCertPrivilege = isSuperAdmin || isCertificateOfficer || profile?.can_issue_direct_certificate === true || user?.can_issue_direct_certificate === true;

  // Tabs: 'create' | 'history'
  const [activeTab, setActiveTab] = useState('create');

  // Loading States
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Data Collections
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [directHistory, setDirectHistory] = useState([]);

  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Client Catalog State (Registered Products for Selected Client)
  const [clientCatalog, setClientCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL');

  // Facility / Site Details
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [customSiteName, setCustomSiteName] = useState('');
  const [customSiteAddress, setCustomSiteAddress] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [manufacturerAddress, setManufacturerAddress] = useState('');

  // Certificate Detail Fields (Section 2) - editable
  const [certCompanyName, setCertCompanyName] = useState('');
  const [certCompanyAddress, setCertCompanyAddress] = useState('');
  const [certManufacturingFacility, setCertManufacturingFacility] = useState('');
  const [certProductCategory, setCertProductCategory] = useState('');
  const [loadingLogsheet, setLoadingLogsheet] = useState(false);

  // Certificate Parameters
  const generateRandomCertNo = (companyName, type = 'NE') => {
    return generateHfaId(companyName || 'UK', type);
  };

  const [certNumber, setCertNumber] = useState(generateRandomCertNo());
  const [certType, setCertType] = useState('GSO MEAT');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentCycleStartDate, setCurrentCycleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [originalCycleStartDate, setOriginalCycleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [certificationStartDate, setCertificationStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 3);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('Directly issued with certified products by Superadmin.');

  const isGso = certType === 'GSO MEAT' || certType === 'GSO NON MEAT' || certType === 'SMIIC' || (certType && (certType.includes('GSO') || certType.includes('SMIIC')));

  // Product Builder State
  const [products, setProducts] = useState([
    { id: 1, name: '', code: 'PRD-01', category: 'Meat & Poultry', product_type: 'Processed', barcode: '', ingredients: '' }
  ]);

  // Existing Products for selected client
  const [clientExistingProducts, setClientExistingProducts] = useState([]);

  useEffect(() => {
    if (selectedClient?._id || selectedClient?.id) {
      const cId = selectedClient._id || selectedClient.id;
      api.get(`/api/products?client_id=${cId}`)
        .then(res => {
          const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
          setClientExistingProducts(list);
        })
        .catch(() => setClientExistingProducts([]));
    } else {
      setClientExistingProducts([]);
    }
  }, [selectedClient]);

  const handleImportClientProducts = () => {
    if (!clientExistingProducts.length) return;
    const imported = clientExistingProducts.map((p, idx) => ({
      id: Date.now() + idx,
      _sourceId: p._id || p.id,
      name: p.name || '',
      code: p.code || `PRD-${String(idx + 1).padStart(2, '0')}`,
      category: p.category || 'General Food Products',
      product_type: p.product_type || 'Processed',
      barcode: p.barcode || '',
      ingredients: Array.isArray(p.ingredients) ? p.ingredients.join(', ') : (p.ingredients || '')
    }));
    setProducts(imported);
    toast.success(`Loaded ${imported.length} existing products for ${selectedClient.company_name || selectedClient.full_name}!`);
  };

  // Bulk Import Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');



  // Live Preview State
  const [livePreviewUrl, setLivePreviewUrl] = useState('');
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewTimestamp, setPreviewTimestamp] = useState(Date.now());
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Success Modal State
  const [successResult, setSuccessResult] = useState(null);

  // History Inspect Modal
  const [inspectCert, setInspectCert] = useState(null);
  const [historySearch, setHistorySearch] = useState('');

  // Live Certificate Document Preview Generator
  const generateLivePreview = async (silent = false) => {
    const validProducts = products.filter(p => p.name && p.name.trim());
    const companyName = certCompanyName ||
      (selectedClient?.company_name || selectedClient?.full_name || 'Valued Halal Client');
    const businessAddr = (certCompanyAddress || customSiteAddress || resolvedBusinessAddress || '').trim();
    const mfgAddr = (certManufacturingFacility || businessAddr).trim();

    setGeneratingPreview(true);
    try {
      const res = await api.post('/api/certificates/preview-live', {
        certificate_type: certType,
        certificate_number: certNumber,
        company_name: companyName,
        company_address: businessAddr || 'Registered Business Address',
        manufacturing_address: mfgAddr || businessAddr || 'Manufacturing Facility Address',
        scope: certProductCategory || 'PRODUCTION AND SUPPLY OF HALAL CERTIFIED PRODUCTS',
        product_category: certProductCategory,
        issue_date: issueDate,
        current_cycle_start_date: isGso ? currentCycleStartDate : issueDate,
        original_cycle_start_date: isGso ? originalCycleStartDate : issueDate,
        certification_start_date: certificationStartDate || issueDate,
        expiry_date: expiryDate,
        product_table_columns: productTableColumns,
        products: validProducts.length > 0 ? validProducts : [{ name: 'Certified Halal Products Schedule' }]
      });

      const url = res.previewUrl || res.data?.previewUrl;
      if (url) {
        setLivePreviewUrl(getPdfUrl(url));
        setPreviewTimestamp(Date.now());
        if (!silent) toast.success('Live certificate preview updated!');
      }
    } catch (err) {
      if (!silent) toast.error('Preview generation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setGeneratingPreview(false);
    }
  };

  // Fetch Existing Clients & Sites
  const fetchInitialData = async () => {
    setLoadingData(true);
    try {
      const [usersRes, sitesRes] = await Promise.all([
        api.get('/api/users').catch(() => ({ data: [] })),
        api.get('/api/sites').catch(() => ({ data: [] }))
      ]);

      const userList = Array.isArray(usersRes) ? usersRes : (Array.isArray(usersRes?.data) ? usersRes.data : []);
      const siteList = Array.isArray(sitesRes) ? sitesRes : (Array.isArray(sitesRes?.data) ? sitesRes.data : []);

      // Filter only client users
      const clientAccounts = userList.filter(u => u.role === 'client');
      setClients(clientAccounts);
      setSites(siteList);
    } catch (err) {
      toast.error('Failed to load initial data');
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch Direct Issuance History
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/api/certificates/direct-history');
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setDirectHistory(list);
    } catch (err) {
      toast.error('Failed to load issuance history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchInitialData();
      if (activeTab === 'history') {
        fetchHistory();
      }
    }
  }, [isSuperAdmin, activeTab]);

  // Validity Preset Helper
  const applyValidityPreset = (years, months = 0) => {
    const isFour = certType.includes('GSO') || certType.includes('SMIIC');
    const enforcedYears = isFour ? 3 : 1;
    const start = issueDate ? new Date(issueDate) : new Date();
    const end = new Date(start);
    if (years !== undefined) end.setFullYear(end.getFullYear() + enforcedYears);
    if (months) end.setMonth(end.getMonth() + months);
    setExpiryDate(end.toISOString().split('T')[0]);
  };

  // Client Filtered List — only show results when user has typed a query
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return []; // hide all until user searches
    const q = clientSearchQuery.toLowerCase();
    return clients.filter(c =>
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [clients, clientSearchQuery]);

  // Sites belonging to selected client
  const clientSites = useMemo(() => {
    if (!selectedClient) return [];
    const clientId = selectedClient._id || selectedClient.id;
    return sites.filter(s => {
      const sClientId = s.client_id ? (typeof s.client_id === 'object' ? s.client_id._id : s.client_id) : null;
      return String(sClientId) === String(clientId);
    });
  }, [sites, selectedClient]);

  const formatSiteAddress = (site) => {
    if (!site) return '';
    const parts = [site.address_1, site.address_2, site.city, site.state, site.postcode, site.country].map(p => (p || '').trim()).filter(Boolean);
    return parts.join(', ');
  };

  const formatClientAddress = (client) => {
    if (!client) return '';
    const parts = [client.address, client.postcode, client.country].map(p => (p || '').trim()).filter(Boolean);
    return parts.join(', ');
  };

  const selectedSite = useMemo(() => {
    if (!selectedSiteId) return null;
    return clientSites.find(s => String(s._id) === String(selectedSiteId)) || sites.find(s => String(s._id) === String(selectedSiteId)) || null;
  }, [selectedSiteId, clientSites, sites]);

  const defaultSite = useMemo(() => {
    return selectedSite || (clientSites.length > 0 ? clientSites[0] : null);
  }, [selectedSite, clientSites]);

  const resolvedBusinessAddress = useMemo(() => {
    if (selectedSite) {
      return formatSiteAddress(selectedSite);
    }
    const clientAddr = formatClientAddress(selectedClient);
    if (clientAddr) return clientAddr;
    if (defaultSite) {
      return formatSiteAddress(defaultSite);
    }
    return '';
  }, [selectedSite, selectedClient, defaultSite]);

  // Fetch Client Products Catalog
  const fetchClientCatalog = async (clientId) => {
    if (!clientId) {
      setClientCatalog([]);
      return;
    }
    setLoadingCatalog(true);
    try {
      const res = await api.get(`/api/products?client_id=${clientId}`);
      const rawList = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));

      // Deduplicate rawList by product name & code
      const uniqueCatalog = [];
      const seenCatalogKeys = new Set();
      for (const p of rawList) {
        const nameStr = (p.name || '').trim();
        if (!nameStr) continue;
        const codeStr = (p.code || p.barcode || '').trim();
        const key = `${nameStr.toLowerCase()}|${codeStr.toLowerCase()}`;
        if (!seenCatalogKeys.has(key)) {
          seenCatalogKeys.add(key);
          uniqueCatalog.push(p);
        }
      }

      setClientCatalog(uniqueCatalog);
      if (uniqueCatalog.length > 0) {
        const catalogItems = uniqueCatalog.map((p, idx) => ({
          id: Date.now() + idx + Math.random(),
          _sourceId: p._id || p.id,
          name: p.name || '',
          code: p.code || p.barcode || `PRD-${String(idx + 1).padStart(2, '0')}`,
          category: p.category || 'Meat & Poultry',
          product_type: p.product_type || 'Processed',
          barcode: p.barcode || '',
          ingredients: Array.isArray(p.ingredients) ? p.ingredients.join(', ') : (p.ingredients || '')
        }));
        setProducts(catalogItems);
      }
    } catch (err) {
      console.error('Failed to load client products:', err);
      setClientCatalog([]);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    if (selectedClient?._id) {
      fetchClientCatalog(selectedClient._id);
    } else {
      setClientCatalog([]);
    }
  }, [selectedClient?._id]);

  // Auto-populate Section 2 fields when a client is selected
  useEffect(() => {
    if (selectedClient) {
      const name = selectedClient.company_name || selectedClient.full_name || '';
      const addr = formatClientAddress(selectedClient);
      setCertCompanyName(name);
      setCertCompanyAddress(addr);
      setCertManufacturingFacility('');
      // Fetch product_category from the client's latest logsheet
      const cId = selectedClient._id || selectedClient.id;
      if (cId) {
        setLoadingLogsheet(true);
        api.get(`/api/application-logsheets?client_id=${cId}&limit=1`)
          .then(res => {
            const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []));
            if (list.length > 0) {
              const logsheet = list[0];
              const cat = logsheet.product_category || logsheet.productCategory || '';
              if (cat) setCertProductCategory(cat);
            }
          })
          .catch(() => { })
          .finally(() => setLoadingLogsheet(false));
      }
    } else {
      setCertCompanyName('');
      setCertCompanyAddress('');
      setCertManufacturingFacility('');
      setCertProductCategory('');
    }
  }, [selectedClient]);

  // Sync certCompanyAddress when site changes
  useEffect(() => {
    if (selectedSite) {
      const siteAddr = formatSiteAddress(selectedSite);
      setCertCompanyAddress(siteAddr);
      setCertManufacturingFacility(siteAddr);
    }
  }, [selectedSite]);

  // Catalog Helper: Check if a client catalog product is currently selected
  const isProductSelected = (catalogItem) => {
    const cId = catalogItem._id || catalogItem.id;
    const cName = (catalogItem.name || '').trim().toLowerCase();
    return products.some(p => {
      if (p._sourceId && cId && String(p._sourceId) === String(cId)) return true;
      if (cName && (p.name || '').trim().toLowerCase() === cName) return true;
      return false;
    });
  };

  // Toggle single catalog product selection
  const toggleCatalogProduct = (catalogItem) => {
    const selected = isProductSelected(catalogItem);
    const cId = catalogItem._id || catalogItem.id;
    const cName = (catalogItem.name || '').trim().toLowerCase();

    if (selected) {
      // Deselect: remove from products table
      setProducts(prev => {
        const filtered = prev.filter(p => {
          if (p._sourceId && cId && String(p._sourceId) === String(cId)) return false;
          if (cName && (p.name || '').trim().toLowerCase() === cName) return false;
          return true;
        });
        return filtered.length > 0
          ? filtered
          : [{ id: Date.now(), name: '', code: 'PRD-01', category: 'Meat & Poultry', product_type: 'Processed', barcode: '', ingredients: '' }];
      });
    } else {
      // Select: add to products table
      const newProductItem = {
        id: Date.now(),
        _sourceId: cId,
        name: catalogItem.name || '',
        code: catalogItem.code || catalogItem.barcode || `PRD-${String(products.length + 1).padStart(2, '0')}`,
        category: catalogItem.category || 'Meat & Poultry',
        product_type: catalogItem.product_type || 'Processed',
        barcode: catalogItem.barcode || '',
        ingredients: Array.isArray(catalogItem.ingredients) ? catalogItem.ingredients.join(', ') : (catalogItem.ingredients || '')
      };

      setProducts(prev => {
        // If the only product row is empty placeholder, replace it cleanly
        if (prev.length === 1 && (!prev[0].name || !prev[0].name.trim())) {
          return [newProductItem];
        }
        return [...prev, newProductItem];
      });
    }
  };

  // Bulk Select all displayed catalog products
  const handleSelectAllCatalog = (itemsToSelect) => {
    const targetItems = itemsToSelect || filteredCatalog;
    const toAdd = [];
    targetItems.forEach((catItem, idx) => {
      if (!isProductSelected(catItem)) {
        toAdd.push({
          id: Date.now() + idx + Math.random(),
          _sourceId: catItem._id || catItem.id,
          name: catItem.name || '',
          code: catItem.code || catItem.barcode || `PRD-${String(products.length + toAdd.length + 1).padStart(2, '0')}`,
          category: catItem.category || 'Meat & Poultry',
          product_type: catItem.product_type || 'Processed',
          barcode: catItem.barcode || '',
          ingredients: Array.isArray(catItem.ingredients) ? catItem.ingredients.join(', ') : (catItem.ingredients || '')
        });
      }
    });

    if (toAdd.length === 0) {
      toast('All displayed products are already selected.', { icon: 'ℹ️' });
      return;
    }

    setProducts(prev => {
      const nonBlank = prev.filter(p => p.name && p.name.trim());
      return [...nonBlank, ...toAdd];
    });
    toast.success(`Selected ${toAdd.length} product(s) for this certificate.`);
  };

  // Deselect all catalog products
  const handleDeselectAllCatalog = () => {
    const catalogIds = new Set(clientCatalog.map(c => String(c._id || c.id)));
    const catalogNames = new Set(clientCatalog.map(c => (c.name || '').trim().toLowerCase()));

    setProducts(prev => {
      const remaining = prev.filter(p => {
        if (p._sourceId && catalogIds.has(String(p._sourceId))) return false;
        if (p.name && catalogNames.has(p.name.trim().toLowerCase())) return false;
        return true;
      });
      return remaining.length > 0
        ? remaining
        : [{ id: Date.now(), name: '', code: 'PRD-01', category: 'Meat & Poultry', product_type: 'Processed', barcode: '', ingredients: '' }];
    });
    toast.success('Deselected all client catalog products.');
  };

  // Filtered Catalog Memo
  const filteredCatalog = useMemo(() => {
    let list = clientCatalog;
    if (catalogCategoryFilter !== 'ALL') {
      list = list.filter(p => p.category === catalogCategoryFilter);
    }
    if (catalogSearchQuery.trim()) {
      const q = catalogSearchQuery.toLowerCase().trim();
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [clientCatalog, catalogCategoryFilter, catalogSearchQuery]);

  const catalogCategories = useMemo(() => {
    const cats = new Set(clientCatalog.map(p => p.category).filter(Boolean));
    return ['ALL', ...Array.from(cats)];
  }, [clientCatalog]);

  const selectedCatalogCount = useMemo(() => {
    return clientCatalog.filter(c => isProductSelected(c)).length;
  }, [clientCatalog, products]);

  // Product Handlers
  const addProductRow = () => {
    const newId = Date.now();
    const nextIndex = products.length + 1;
    setProducts(prev => [
      ...prev,
      {
        id: newId,
        name: '',
        code: `PRD-${String(nextIndex).padStart(2, '0')}`,
        category: 'Meat & Poultry',
        product_type: 'Processed',
        barcode: '',
        ingredients: ''
      }
    ]);
  };

  const updateProductRow = (id, field, value) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProductRow = (id) => {
    if (products.length === 1) {
      toast.error('You must include at least one product for this certificate.');
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const duplicateProductRow = (item) => {
    const nextIndex = products.length + 1;
    const newId = Date.now();
    setProducts(prev => [
      ...prev,
      {
        ...item,
        id: newId,
        name: `${item.name} (Copy)`,
        code: `PRD-${String(nextIndex).padStart(2, '0')}`
      }
    ]);
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map((line, idx) => {
      const parts = line.split(/[|,;\t]/).map(p => p.trim());
      const name = parts[0] || `Product Line ${idx + 1}`;
      const code = parts[1] || `PRD-${String(products.length + idx + 1).padStart(2, '0')}`;
      const category = parts[2] || 'Meat & Poultry';
      const barcode = parts[3] || '';
      return {
        id: Date.now() + idx,
        name,
        code,
        category,
        product_type: 'Processed',
        barcode,
        ingredients: ''
      };
    });

    setProducts(prev => [...prev.filter(p => p.name.trim() !== ''), ...parsed]);
    setShowBulkModal(false);
    setBulkText('');
    toast.success(`Imported ${parsed.length} product line(s)!`);
  };

  const handleLoadSampleProducts = () => {
    setProducts([
      { id: Date.now() + 1, name: 'Premium Halal Beef Patty 150g', code: 'PRD-BF-01', category: 'Meat & Poultry', product_type: 'Frozen', barcode: '506012345001', ingredients: '100% Halal Certified Beef, Salt, Natural Spices' },
      { id: Date.now() + 2, name: 'Fresh Halal Chicken Breast Fillets 1kg', code: 'PRD-CK-02', category: 'Meat & Poultry', product_type: 'Chilled', barcode: '506012345002', ingredients: '100% Fresh Halal Chicken' },
      { id: Date.now() + 3, name: 'Halal Gourmet Lamb Sausages 400g', code: 'PRD-LM-03', category: 'Meat & Poultry', product_type: 'Chilled', barcode: '506012345003', ingredients: 'Halal Lamb (85%), Herbs, Sea Salt, Collagen Casing' },
      { id: Date.now() + 4, name: 'Halal Artisan Garlic Mayo Sauce 250ml', code: 'PRD-SC-04', category: 'Sauces & Condiments', product_type: 'Ambient', barcode: '506012345004', ingredients: 'Rapeseed Oil, Water, Pasteurised Egg Yolk, Garlic, Vinegar' }
    ]);
    toast.success('Sample products loaded!');
  };

  // Form Submission
  const handleSubmitDirectCertificate = async (e) => {
    e.preventDefault();

    // Validations
    if (!selectedClient) {
      return toast.error('Please select an existing client company.');
    }
    if (clientSites.length > 0 && !selectedSiteId) {
      return toast.error('Site selection is compulsory. Please select a specific registered site for this certificate.');
    }
    if (clientSites.length === 0 && !selectedSiteId && !customSiteAddress.trim()) {
      return toast.error('Site selection is compulsory. Please specify the facility/site address for this certificate.');
    }

    if (!certNumber.trim()) {
      return toast.error('Certificate number is required.');
    }

    // Deduplicate products by normalized name
    const validProducts = [];
    const seenProductKeys = new Set();
    for (const p of products) {
      const nameStr = (p.name || '').trim();
      if (!nameStr) continue;
      const key = nameStr.toLowerCase();
      if (!seenProductKeys.has(key)) {
        seenProductKeys.add(key);
        validProducts.push(p);
      }
    }

    if (validProducts.length === 0) {
      return toast.error('Please specify at least one product name to certify.');
    }


    setSubmitting(true);
    const toastId = toast.loading('Generating official certificate & registering products...');

    try {
      const formData = new FormData();

      // Client info
      formData.append('client_id', selectedClient._id || selectedClient.id);

      // Facility info
      const effectiveAddress = (certCompanyAddress || customSiteAddress || resolvedBusinessAddress || '').trim();
      const effectiveMfgAddress = (certManufacturingFacility || effectiveAddress).trim();
      if (selectedSiteId) {
        formData.append('site_id', selectedSiteId);
      }
      if (customSiteName || selectedSite?.name) {
        formData.append('site_name', customSiteName || selectedSite?.name);
      }
      if (effectiveAddress) {
        formData.append('site_address', effectiveAddress);
      }
      if (effectiveMfgAddress) {
        formData.append('manufacturer_address', effectiveMfgAddress);
      }
      // Company name override from Section 2
      if (certCompanyName) {
        formData.append('company_name_override', certCompanyName);
      }
      // Product category from logsheet
      if (certProductCategory) {
        formData.append('product_category', certProductCategory);
      }

      // Certificate details
      formData.append('certificate_number', certNumber.trim());
      formData.append('certificate_type', certType);
      formData.append('issue_date', issueDate);
      formData.append('expiry_date', expiryDate);
      formData.append('current_cycle_start_date', isGso ? (currentCycleStartDate || issueDate) : issueDate);
      formData.append('original_cycle_start_date', isGso ? (originalCycleStartDate || issueDate) : issueDate);
      formData.append('certification_start_date', !isGso ? (certificationStartDate || issueDate) : issueDate);
      formData.append('status', 'active');
      formData.append('notes', notes);

      // Products JSON
      formData.append('products', JSON.stringify(validProducts));
      formData.append('product_table_columns', productTableColumns);

      // Options — certificate PDF is always auto-generated
      formData.append('auto_generate_pdf', true);

      const res = await api.post('/api/certificates/direct-issue', formData, true);

      toast.success('Certificate and products issued successfully!', { id: toastId });
      setSuccessResult({
        certificate: res.certificate,
        products: res.products || validProducts,
        certificateUrl: res.certificateUrl,
        certificateNumber: res.certificateNumber || certNumber
      });

      // Refresh data
      fetchInitialData();
    } catch (err) {
      toast.error(err.message || 'Failed to issue certificate', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke Handler in History
  const handleRevokeCert = async (certId) => {
    const reason = prompt('Please enter the reason for revoking this certificate:');
    if (!reason) return;

    try {
      await api.put(`/api/certificates/${certId}/revoke`, { reason });
      toast.success('Certificate revoked successfully');
      fetchHistory();
    } catch (err) {
      toast.error(err.message || 'Failed to revoke certificate');
    }
  };

  // Reset Studio
  const handleResetForm = () => {
    setCertNumber(generateRandomCertNo());
    setSuccessResult(null);
    setProducts([{ id: 1, name: '', code: 'PRD-01', category: 'Meat & Poultry', product_type: 'Processed', barcode: '', ingredients: '' }]);
    setLivePreviewUrl('');
    setNotes('Directly issued with certified products by Superadmin.');
    setCertCompanyName('');
    setCertCompanyAddress('');
    setCertManufacturingFacility('');
    setCertProductCategory('');
    setSelectedClient(null);
    setSelectedSiteId('');
    setCustomSiteAddress('');
    setClientSearchQuery('');
    const today = new Date().toISOString().split('T')[0];
    setIssueDate(today);
    setCurrentCycleStartDate(today);
    setOriginalCycleStartDate(today);
    setCertificationStartDate(today);
    const d = new Date();
    d.setFullYear(d.getFullYear() + (certType.includes('GSO') || certType.includes('SMIIC') ? 3 : 1));
    setExpiryDate(d.toISOString().split('T')[0]);
  };

  // Guard: Unauthorized view if not superadmin and has no privilege
  if (!hasDirectCertPrivilege) {
    return (
      <div style={{ maxWidth: 680, margin: '40px auto', padding: '32px 24px', textAlign: 'center', background: '#fff', borderRadius: 16, border: '1.5px solid #fee2e2', boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.1)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#991b1b', marginBottom: 8 }}>Privilege Required</h2>
        <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          This studio is restricted to <strong>Superadmin</strong> accounts or authorized staff members who have been granted <strong>Direct Certificate Studio</strong> privilege. Please contact a Superadmin to request access.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ margin: '0 auto' }}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── Top Superadmin Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #15803d 50%, #166534 100%)',
        borderRadius: 16,
        padding: '24px 30px',
        color: '#ffffff',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px -5px rgba(21, 128, 61, 0.3)'
      }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(255, 255, 255, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fef08a'
            }}>
              <ShieldCheck size={30} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  background: '#fef08a', color: '#854d0e',
                  fontSize: 10.5, fontWeight: 800, padding: '2px 8px',
                  borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5
                }}>
                  👑 Superadmin Console
                </span>
                <span style={{ fontSize: 12, color: '#bbf7d0', fontWeight: 600 }}>• Instant Issuance Bypass Mode</span>
              </div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Direct Certificate & Product Issuance
              </h1>
              <p style={{ margin: '4px 0 0', color: '#dcfce7', fontSize: 13, maxWidth: 620 }}>
                Issue official Halal certificates and register certified products directly into the database without requiring an application flow.
              </p>
            </div>
          </div>

          {/* Tab Navigation Controls */}
          <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'create' ? '#ffffff' : 'transparent',
                color: activeTab === 'create' ? '#15803d' : '#dcfce7',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
            >
              <Plus size={15} /> Direct Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'history' ? '#ffffff' : 'transparent',
                color: activeTab === 'history' ? '#15803d' : '#dcfce7',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
            >
              <Layers size={15} /> Issuance History
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 1: DIRECT CERTIFICATE & PRODUCT ISSUANCE STUDIO          */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmitDirectCertificate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 24, alignItems: 'start' }}>
            {/* Left Column: Form Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* CARD 1: Client & Company Information */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>1. Client & Facility Details</h3>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Target company and production facility information</p>
                    </div>
                  </div>


                </div>

                <div>
                  {/* ── Search Bar ── */}
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>
                    Search Registered Company <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type company name or email to search..."
                      value={clientSearchQuery}
                      onChange={e => {
                        setClientSearchQuery(e.target.value);
                        // Clear selection if they start a new search
                        if (selectedClient && e.target.value.trim() !== (selectedClient.company_name || selectedClient.full_name)) {
                          setSelectedClient(null);
                          setSelectedSiteId('');
                          setCustomSiteAddress('');
                        }
                      }}
                      style={{ paddingLeft: 40, height: 44, fontSize: 14, fontWeight: 500 }}
                      autoComplete="off"
                    />
                    {clientSearchQuery && (
                      <button
                        type="button"
                        onClick={() => { setClientSearchQuery(''); setSelectedClient(null); setSelectedSiteId(''); setCustomSiteAddress(''); }}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* ── Search Results List (only when query is active and no client selected) ── */}
                  {clientSearchQuery.trim() && !selectedClient && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                      {filteredClients.length === 0 ? (
                        <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                          <Search size={20} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
                          No companies found matching "{clientSearchQuery}"
                        </div>
                      ) : (
                        filteredClients.map((c, idx) => (
                          <div
                            key={c._id}
                            onClick={() => {
                              setSelectedClient(c);
                              setClientSearchQuery(c.company_name || c.full_name || '');
                              setCertNumber(generateHfaId(c.company_name || c.full_name, 'NE'));
                              setProducts([{ id: Date.now(), name: '', code: 'PRD-01', category: 'Meat & Poultry', product_type: 'Processed', barcode: '', ingredients: '' }]);
                              setSelectedSiteId('');
                              setCustomSiteAddress('');
                            }}
                            style={{
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              borderBottom: idx < filteredClients.length - 1 ? '1px solid #f1f5f9' : 'none',
                              background: '#ffffff',
                              cursor: 'pointer',
                              transition: 'background 0.12s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Building2 size={17} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {c.company_name || c.full_name}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                                  {c.email}{c.country ? ` · ${c.country}` : ''}
                                </div>
                              </div>
                            </div>
                            <ArrowRight size={14} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ── Selected Company Row + Site Picker ── */}
                  {selectedClient && (
                    <div style={{ border: '1.5px solid #16a34a', borderRadius: 12, overflow: 'hidden', background: '#f0fdf4', marginTop: 4 }}>
                      {/* Selected company row */}
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #dcfce7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CheckCircle2 size={18} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#15803d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {selectedClient.company_name || selectedClient.full_name}
                            </div>
                            <div style={{ fontSize: 12, color: '#16a34a', marginTop: 1 }}>
                              {selectedClient.email}{selectedClient.country ? ` · ${selectedClient.country}` : ''}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClient(null);
                            setClientSearchQuery('');
                            setSelectedSiteId('');
                            setCustomSiteAddress('');
                          }}
                          style={{ background: '#dcfce7', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: '#15803d', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, whiteSpace: 'nowrap' }}
                        >
                          <X size={13} /> Change
                        </button>
                      </div>

                      {/* Site picker */}
                      <div style={{ padding: '14px 16px', background: '#ffffff' }}>
                        <label className="form-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block', fontSize: 12.5 }}>
                          Assign Certified Site / Facility <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        {clientSites.length > 0 ? (
                          <select
                            className="form-control"
                            style={{ borderColor: !selectedSiteId ? '#fca5a5' : '#86efac', background: selectedSiteId ? '#f0fdf4' : undefined }}
                            value={selectedSiteId}
                            onChange={e => {
                              const sId = e.target.value;
                              setSelectedSiteId(sId);
                              const foundSite = clientSites.find(s => String(s._id) === String(sId));
                              if (foundSite) {
                                const siteAddr = formatSiteAddress(foundSite);
                                setCustomSiteAddress(siteAddr);
                                setCertCompanyAddress(siteAddr);
                                setCertManufacturingFacility(foundSite.name ? `${foundSite.name}, ${siteAddr}` : siteAddr);
                              } else {
                                setCustomSiteAddress('');
                              }
                            }}
                            required
                          >
                            <option value="">-- Select a registered site for this certificate *</option>
                            {clientSites.map(s => (
                              <option key={s._id} value={s._id}>
                                {s.name}{s.address_1 ? ` — ${s.address_1}` : ''}{s.city ? `, ${s.city}` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div>
                            <p style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                              ⚠️ No registered sites found for this company. Enter the facility address below.
                            </p>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. Unit 4, Greenfield Industrial Estate, Birmingham, B12 4AB"
                              value={customSiteAddress}
                              onChange={e => { setCustomSiteAddress(e.target.value); setCertCompanyAddress(e.target.value); setCertManufacturingFacility(e.target.value); }}
                            />
                          </div>
                        )}
                        {selectedSiteId && selectedSite && (
                          <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle2 size={13} />
                            <span>{formatSiteAddress(selectedSite)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prompt when no query yet */}
                  {!clientSearchQuery.trim() && !selectedClient && (
                    <div style={{ textAlign: 'center', padding: '24px 16px', color: '#94a3b8', border: '1.5px dashed #e2e8f0', borderRadius: 12, marginTop: 4 }}>
                      <Search size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                      <p style={{ fontSize: 13, margin: 0, fontWeight: 500 }}>Start typing to search for a registered company</p>
                      <p style={{ fontSize: 12, margin: '4px 0 0', opacity: 0.7 }}>Search by company name or email address</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 2: Certificate Details (what appears on the certificate) */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>2. Certificate Details</h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Information that will appear on the official certificate document</p>
                  </div>
                </div>

                {/* Company Info that goes on the certificate */}
                <div style={{ marginBottom: 20, background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Company Information on Certificate</div>
                  <div className="form-grid" style={{ rowGap: 14 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 12.5 }}>Company Name on Certificate <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Company name as it will appear on the certificate"
                        value={certCompanyName}
                        onChange={e => setCertCompanyName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 12.5 }}>Product Category</label>
                      <div style={{ position: 'relative' }}>
                        {loadingLogsheet && (
                          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#94a3b8' }}>Loading...</div>
                        )}
                        <input
                          type="text"
                          className="form-control"
                          list="direct-cert-category-list"
                          placeholder="e.g. Meat & Poultry, Dairy, etc."
                          value={certProductCategory}
                          onChange={e => setCertProductCategory(e.target.value)}
                          style={{ background: certProductCategory ? '#f0fdf4' : undefined, borderColor: certProductCategory ? '#86efac' : undefined }}
                        />
                        <datalist id="direct-cert-category-list">
                          {PRODUCT_CATEGORIES.map(cat => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>
                      {certProductCategory && (
                        <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={11} /> Auto-filled from logsheet (editable)
                        </div>
                      )}
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: 12.5 }}>Registered Business Address</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Company registered address as it will appear on the certificate"
                        value={certCompanyAddress}
                        onChange={e => setCertCompanyAddress(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: 12.5 }}>Manufacturing Facilities</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Manufacturing facility address(es) as they will appear on the certificate"
                        value={certManufacturingFacility}
                        onChange={e => setCertManufacturingFacility(e.target.value)}
                        style={{ resize: 'vertical', minHeight: 52 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Certificate Number & Type */}
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Certificate Reference</div>

                <div className="form-grid" style={{ rowGap: 16 }}>
                  {/* Certificate Number */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Certificate Number <span>*</span></label>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0 4px', fontSize: 11, color: '#16a34a', height: 'auto' }}
                        onClick={() => {
                          const compName = selectedClient?.company_name || selectedClient?.full_name || 'UK';
                          setCertNumber(generateHfaId(compName, 'NE'));
                        }}
                      >
                        <RefreshCw size={11} style={{ marginRight: 3 }} /> Generate New
                      </button>
                    </div>
                    <input
                      type="text"
                      className="form-control"
                      value={certNumber}
                      onChange={e => setCertNumber(e.target.value)}
                      style={{ fontWeight: 700, letterSpacing: '0.5px', color: '#15803d' }}
                      required
                    />
                  </div>

                  {/* Certificate Type */}
                  <div className="form-group">
                    <label className="form-label">Certificate Type <span>*</span></label>
                    <select
                      className="form-control"
                      value={certType}
                      onChange={e => {
                        const val = e.target.value;
                        setCertType(val);
                        if (val.includes('GSO') || val.includes('SMIIC')) {
                          applyValidityPreset(3);
                          setProductTableColumns(2);
                        } else {
                          applyValidityPreset(1);
                          setProductTableColumns(1);
                        }
                      }}
                      required
                    >
                      {CERTIFICATE_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Dates: 4 dates for GSO MEAT / GSO NON MEAT / SMIIC, Standard dates for Non-GSO */}
                  {isGso ? (
                    <>
                      {/* 1. Issue Date */}
                      <div className="form-group">
                        <label className="form-label">Issue Date <span>*</span></label>
                        <input
                          type="date"
                          className="form-control"
                          value={issueDate}
                          onChange={e => setIssueDate(e.target.value)}
                          required
                        />
                      </div>

                      {/* 2. Current Cycle Start Date */}
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="form-label">Current Cycle Start Date <span>*</span></label>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0 4px', fontSize: 10.5, color: '#16a34a' }}
                            onClick={() => setCurrentCycleStartDate(issueDate)}
                          >
                            Match Issue Date
                          </button>
                        </div>
                        <input
                          type="date"
                          className="form-control"
                          value={currentCycleStartDate}
                          onChange={e => setCurrentCycleStartDate(e.target.value)}
                          required
                        />
                      </div>

                      {/* 3. Expiry Date */}
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="form-label">Expiry Date <span>*</span></label>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0 6px', fontSize: 10.5, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', fontWeight: 700 }}
                              onClick={() => applyValidityPreset(3)}
                            >
                              +3 Years (Standard)
                            </button>
                          </div>
                        </div>
                        <input
                          type="date"
                          className="form-control"
                          value={expiryDate}
                          onChange={e => setExpiryDate(e.target.value)}
                          required
                        />
                      </div>

                      {/* 4. Original Cycle Start Date */}
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="form-label">Original Cycle Start Date <span>*</span></label>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0 4px', fontSize: 10.5, color: '#16a34a' }}
                            onClick={() => setOriginalCycleStartDate(issueDate)}
                          >
                            Match Issue Date
                          </button>
                        </div>
                        <input
                          type="date"
                          className="form-control"
                          value={originalCycleStartDate}
                          onChange={e => setOriginalCycleStartDate(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Issue Date */}
                      <div className="form-group">
                        <label className="form-label">Issue Date <span>*</span></label>
                        <input
                          type="date"
                          className="form-control"
                          value={issueDate}
                          onChange={e => setIssueDate(e.target.value)}
                          required
                        />
                      </div>

                      {/* Expiry Date */}
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="form-label">Expiry Date <span>*</span></label>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0 6px', fontSize: 10.5, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', fontWeight: 700 }}
                              onClick={() => applyValidityPreset(1)}
                            >
                              +1 Year (Standard)
                            </button>
                          </div>
                        </div>
                        <input
                          type="date"
                          className="form-control"
                          value={expiryDate}
                          onChange={e => setExpiryDate(e.target.value)}
                          required
                        />
                      </div>

                      {/* Certification Start Date */}
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="form-label">Certification Start Date</label>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0 4px', fontSize: 10.5, color: '#16a34a' }}
                            onClick={() => setCertificationStartDate(issueDate)}
                          >
                            Match Issue Date
                          </button>
                        </div>
                        <input
                          type="date"
                          className="form-control"
                          value={certificationStartDate}
                          onChange={e => setCertificationStartDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* CARD 3: Multi-Product Certification Builder */}
              <div className="card" style={{ padding: 24 }}>
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
                          {products.filter(p => p.name && p.name.trim()).length} Product(s) Selected
                        </span>
                        {clientCatalog.length > 0 && (
                          <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 12 }}>
                            {selectedCatalogCount} / {clientCatalog.length} Client Items Picked
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                        {selectedClient && clientCatalog.length > 0
                          ? `Select products from ${selectedClient.company_name || selectedClient.full_name}'s catalog to include on this certificate:`
                          : 'Add and certify products directly covered under this certificate'}
                      </p>
                    </div>
                  </div>

                  {clientCatalog.length > 0 ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleSelectAllCatalog(filteredCatalog)}
                        style={{ fontSize: 11.5, padding: '4px 10px' }}
                      >
                        Select All ({filteredCatalog.length})
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleDeselectAllCatalog}
                        style={{ fontSize: 11.5, padding: '4px 10px', color: '#dc2626' }}
                      >
                        Deselect All
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleLoadSampleProducts}
                        style={{ fontSize: 11.5, padding: '4px 8px' }}
                      >
                        <Sparkles size={13} style={{ marginRight: 3 }} /> Sample Items
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setShowBulkModal(true)}
                        style={{ fontSize: 11.5, padding: '4px 8px' }}
                      >
                        <Upload size={13} style={{ marginRight: 3 }} /> Bulk Paste
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={addProductRow}
                        style={{ fontSize: 11.5, padding: '4px 10px' }}
                      >
                        <Plus size={13} style={{ marginRight: 3 }} /> Add Product Row
                      </button>
                    </div>
                  )}
                </div>

                {/* 1, 2, or 3 COLUMN SELECTOR */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                      <Layers size={15} style={{ color: '#2563eb' }} />
                      <span>Product Schedule Table Layout</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                      Configure printed column layout on official certificate attachment
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {/* Option 1: 1 Value Column (NO. + NAME) */}
                    <button
                      type="button"
                      onClick={() => setProductTableColumns(1)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: productTableColumns === 1 ? 700 : 500,
                        border: productTableColumns === 1 ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: productTableColumns === 1 ? '#eff6ff' : '#ffffff',
                        color: productTableColumns === 1 ? '#1d4ed8' : '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>1 Column (Name Only)</span>
                      {!isGso && (
                        <span style={{ fontSize: 10, background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                          Recommended
                        </span>
                      )}
                    </button>

                    {/* Option 2: 2 Value Columns (NO. + CODE + DESCRIPTION) */}
                    <button
                      type="button"
                      onClick={() => setProductTableColumns(2)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: productTableColumns === 2 ? 700 : 500,
                        border: productTableColumns === 2 ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: productTableColumns === 2 ? '#eff6ff' : '#ffffff',
                        color: productTableColumns === 2 ? '#1d4ed8' : '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>2 Columns (Code + Desc)</span>
                      {isGso && (
                        <span style={{ fontSize: 10, background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                          Recommended
                        </span>
                      )}
                    </button>

                    {/* Option 3: 3 Value Columns (NO. + CODE + DESCRIPTION + CATEGORY) */}
                    <button
                      type="button"
                      onClick={() => setProductTableColumns(3)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: productTableColumns === 3 ? 700 : 500,
                        border: productTableColumns === 3 ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: productTableColumns === 3 ? '#eff6ff' : '#ffffff',
                        color: productTableColumns === 3 ? '#1d4ed8' : '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>3 Columns (+ Category)</span>
                    </button>
                  </div>
                </div>

                {/* SEARCH & FILTER BAR FOR CLIENT CATALOG PRODUCTS */}
                {clientCatalog.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          type="text"
                          className="form-control"
                          style={{ paddingLeft: 30, fontSize: 12, height: 32 }}
                          placeholder="Search client catalog by product name or SKU..."
                          value={catalogSearchQuery}
                          onChange={e => setCatalogSearchQuery(e.target.value)}
                        />
                      </div>
                      {catalogCategories.length > 2 && (
                        <select
                          className="form-control"
                          style={{ width: 150, fontSize: 12, height: 32 }}
                          value={catalogCategoryFilter}
                          onChange={e => setCatalogCategoryFilter(e.target.value)}
                        >
                          {catalogCategories.map(c => (
                            <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* CLIENT CATALOG CHECKBOX SELECTION TABLE */}
                {clientCatalog.length > 0 ? (
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
                              checked={filteredCatalog.length > 0 && filteredCatalog.every(item => isProductSelected(item))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleSelectAllCatalog(filteredCatalog);
                                } else {
                                  handleDeselectAllCatalog();
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
                        {filteredCatalog.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                              No products found matching "{catalogSearchQuery}".
                            </td>
                          </tr>
                        ) : (
                          filteredCatalog.map((prod, index) => {
                            const selected = isProductSelected(prod);
                            return (
                              <tr
                                key={prod._id || prod.id || index}
                                onClick={() => toggleCatalogProduct(prod)}
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
                                    onChange={() => toggleCatalogProduct(prod)}
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
                  /* FALLBACK EDITABLE TABLE FOR NEW CLIENTS / CLIENTS WITHOUT CATALOG */
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
                          {productTableColumns >= 2 && (
                            <th style={{ width: productTableColumns === 3 ? '16%' : '20%', padding: '8px 6px' }}>Code</th>
                          )}
                          <th style={{ padding: '8px 6px' }}>Product Name / Description <span>*</span></th>
                          {productTableColumns === 3 && (
                            <th style={{ width: '22%', padding: '8px 6px' }}>Category</th>
                          )}
                          <th style={{ width: 50, padding: '8px 6px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((prod, index) => (
                          <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9', background: prod._sourceId ? '#f0fdf4' : (index % 2 === 0 ? '#ffffff' : '#fafafa') }}>
                            <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>{index + 1}</td>
                            {productTableColumns >= 2 && (
                              <td style={{ padding: '4px 6px' }}>
                                <input
                                  type="text"
                                  className="form-control"
                                  style={{ padding: '4px 8px', fontSize: 12, height: 30 }}
                                  placeholder="e.g. PRD-001"
                                  value={prod.code || ''}
                                  onChange={e => updateProductRow(prod.id, 'code', e.target.value)}
                                />
                              </td>
                            )}
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                className="form-control"
                                style={{ padding: '4px 8px', fontSize: 12, height: 30 }}
                                placeholder="e.g. Frozen Halal Beef Burger"
                                value={prod.name}
                                onChange={e => updateProductRow(prod.id, 'name', e.target.value)}
                                required
                              />
                            </td>
                            {productTableColumns === 3 && (
                              <td style={{ padding: '4px 6px' }}>
                                <select
                                  className="form-control"
                                  style={{ padding: '4px 8px', fontSize: 12, height: 30 }}
                                  value={prod.category || 'Meat & Poultry'}
                                  onChange={e => updateProductRow(prod.id, 'category', e.target.value)}
                                >
                                  {PRODUCT_CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </td>
                            )}
                            <td style={{ textAlign: 'center', padding: '4px 6px' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#ef4444', padding: '4px 6px' }}
                                onClick={() => removeProductRow(prod.id)}
                                title="Remove row"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>
                    💡 Printed on certificate: <strong>{products.filter(p => p.name && p.name.trim()).length}</strong> item(s).
                  </span>
                  {clientCatalog.length > 0 ? (
                    <span style={{ fontSize: 11.5, color: '#166534', fontWeight: 600 }}>
                      ✓ Selecting from official client portal catalog
                    </span>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {products.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, color: '#ef4444', padding: '2px 6px' }}
                          onClick={() => {
                            setProducts([{ id: Date.now(), name: '', code: 'PRD-01', category: 'Meat & Poultry', product_type: 'Processed', barcode: '', ingredients: '' }]);
                            toast.success('Product list cleared.');
                          }}
                        >
                          Clear All
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={addProductRow}
                        style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, padding: '2px 6px' }}
                      >
                        + Add Product Row
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* Right Column: Live Certificate Document Review & Summary Action Bar */}
            <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Document Review Pane */}
              <div className="card" style={{ padding: 18, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={17} style={{ color: '#16a34a' }} />
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>Live Certificate Document</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => generateLivePreview(false)}
                      disabled={generatingPreview}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11.5, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', borderColor: '#dcfce7' }}
                      title="Re-render PDF with current form values"
                    >
                      <RefreshCw size={12} className={generatingPreview ? 'spinner' : ''} />
                      {generatingPreview ? 'Syncing...' : 'Sync & Refresh'}
                    </button>
                    {livePreviewUrl && (
                      <button
                        type="button"
                        onClick={() => setShowPreviewModal(true)}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11.5, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, color: '#334155' }}
                        title="View Fullscreen Preview"
                      >
                        <ExternalLink size={12} /> Fullscreen
                      </button>
                    )}
                  </div>
                </div>

                {/* Document Viewer Frame */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  height: '460px',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {livePreviewUrl ? (
                    <iframe
                      key={`${livePreviewUrl}-${previewTimestamp}`}
                      src={`${livePreviewUrl}${livePreviewUrl.includes('?') ? '&' : '?'}t=${previewTimestamp}#toolbar=0&navpanes=0&scrollbar=1`}
                      title="Direct Certificate Live Preview"
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                      <Award size={40} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#334155' }}>Live Review Not Loaded</div>
                      <p style={{ fontSize: 11.5, margin: '4px 0 14px', lineHeight: 1.4 }}>
                        Click below to generate and preview how this certificate and product schedule will look.
                      </p>
                      <button
                        type="button"
                        onClick={() => generateLivePreview(false)}
                        disabled={generatingPreview}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <RefreshCw size={12} className={generatingPreview ? 'spinner' : ''} />
                        {generatingPreview ? 'Rendering Preview...' : 'Generate Live Preview'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Document details strip */}
                <div style={{ display: 'grid', gridTemplateColumns: isGso ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 8, marginTop: 12, fontSize: 11.5 }}>
                  <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' }}>Scheme</div>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {certType}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' }}>Issue Date</div>
                    <div style={{ fontWeight: 700, color: '#16a34a', marginTop: 2 }}>{issueDate || '—'}</div>
                  </div>
                  {isGso && (
                    <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' }}>Cycle Start</div>
                      <div style={{ fontWeight: 700, color: '#2563eb', marginTop: 2 }}>{currentCycleStartDate || issueDate || '—'}</div>
                    </div>
                  )}
                  <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' }}>Expiry Date</div>
                    <div style={{ fontWeight: 700, color: '#dc2626', marginTop: 2 }}>{expiryDate || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Summary & Issue Card */}
              <div className="card" style={{ padding: 20, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Certificate Summary
                  </span>
                  <span className="badge badge-green">DIRECT ISSUANCE</span>
                </div>

                {/* Summary Box */}
                <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14, marginBottom: 16 }}>
                  <div style={{ textAlign: 'center', paddingBottom: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Certificate Number</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d', letterSpacing: 0.5 }}>{certNumber}</div>
                    <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600, marginTop: 2 }}>{certType}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Client Company:</span>
                      <strong style={{ color: '#0f172a', maxWidth: 170, textAlign: 'right', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {certCompanyName || selectedClient?.company_name || 'Select Client'}
                      </strong>
                    </div>
                    {certProductCategory && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Product Category:</span>
                        <strong style={{ color: '#0369a1', maxWidth: 170, textAlign: 'right', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {certProductCategory}
                        </strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Products Covered:</span>
                      <strong style={{ color: '#16a34a' }}>{products.filter(p => p.name).length} Product(s)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Issue Date:</span>
                      <span>{issueDate ? new Date(issueDate).toLocaleDateString('en-GB') : '—'}</span>
                    </div>
                    {isGso ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Current Cycle Start:</span>
                          <span>{currentCycleStartDate ? new Date(currentCycleStartDate).toLocaleDateString('en-GB') : '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Original Cycle Start:</span>
                          <span>{originalCycleStartDate ? new Date(originalCycleStartDate).toLocaleDateString('en-GB') : '—'}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Certification Start:</span>
                        <span>{certificationStartDate ? new Date(certificationStartDate).toLocaleDateString('en-GB') : '—'}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Expiry Date:</span>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>{expiryDate ? new Date(expiryDate).toLocaleDateString('en-GB') : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>PDF Mode:</span>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>⚡ Auto-Generated</span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: 14,
                    fontWeight: 700,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(21, 128, 61, 0.3)'
                  }}
                >
                  {submitting ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />
                      <span>Issuing Certificate...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Issue Certificate & Products</span>
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    🔒 Superadmin bypass action recorded in audit log.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 2: DIRECT ISSUANCE HISTORY ARCHIVE                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>Direct Issuance Archive</h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>All certificates and product batches issued directly by Superadmins</p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div className="search-box" style={{ width: 280 }}>
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search certificate or company..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                />
              </div>
              <button className="btn btn-outline" onClick={fetchHistory}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          <div className="table-wrap">
            {historyLoading ? (
              <div className="loading-overlay" style={{ height: 200 }}><div className="spinner" /></div>
            ) : directHistory.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon"><Award /></div>
                <div className="empty-state-title">No Direct Certificates Issued Yet</div>
                <div className="empty-state-desc">Use the Direct Studio tab to create your first application-free certificate.</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Certificate No.</th>
                    <th>Company Name</th>
                    <th>Certificate Type</th>
                    <th>Products</th>
                    <th>Issued Date</th>
                    <th>Expiry Date</th>
                    <th>Issued By</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {directHistory
                    .filter(c => {
                      if (!historySearch) return true;
                      const q = historySearch.toLowerCase();
                      return (
                        c.certificate_number?.toLowerCase().includes(q) ||
                        c.client?.company_name?.toLowerCase().includes(q) ||
                        c.client?.full_name?.toLowerCase().includes(q)
                      );
                    })
                    .map(cert => (
                      <tr key={cert._id}>
                        <td style={{ fontWeight: 800, color: '#15803d' }}>{cert.certificate_number}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          {cert.client?.company_name || cert.client?.full_name || '—'}
                        </td>
                        <td style={{ fontSize: 12.5 }}>{cert.certificate_type}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ background: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: 11.5, padding: '3px 8px', borderRadius: 6 }}
                            onClick={() => setInspectCert(cert)}
                          >
                            <Package size={12} style={{ marginRight: 4 }} />
                            {(cert.products && cert.products.length > 0) ? cert.products.length : (cert.products_covered?.length || 0)} Products
                          </button>
                        </td>
                        <td style={{ fontSize: 12 }}>{cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB') : '—'}</td>
                        <td style={{ fontSize: 12 }}>{cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB') : '—'}</td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{cert.issued_by?.full_name || 'Superadmin'}</td>
                        <td>
                          <span className={`badge ${cert.status === 'active' ? 'badge-green' : cert.status === 'revoked' ? 'badge-red' : 'badge-gray'}`}>
                            {cert.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {cert.certificate_url && (
                              <a
                                href={getPdfUrl(cert.certificate_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost btn-sm"
                                title="Download PDF"
                              >
                                <Download size={13} />
                              </a>
                            )}
                            {cert.status === 'active' && (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#dc2626', fontSize: 12 }}
                                onClick={() => handleRevokeCert(cert._id)}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* SUCCESS MODAL                                               */}
      {/* ──────────────────────────────────────────────────────────── */}
      {successResult && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSuccessResult(null)}>
          <div className="modal" style={{ maxWidth: 540, textAlign: 'center', padding: '32px 28px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#f0fdf4', color: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', border: '2px solid #bbf7d0'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Certificate Successfully Issued!
            </h2>
            <p style={{ color: '#64748b', fontSize: 13.5, marginBottom: 20 }}>
              The certificate and all registered products are now active across the portal.
            </p>

            <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, marginBottom: 24, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Certificate No:</span>
                <strong style={{ fontSize: 14, color: '#15803d' }}>{successResult.certificateNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Products Certified:</span>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{successResult.products?.length || 0} product(s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Status:</span>
                <span className="badge badge-green">ACTIVE & CERTIFIED</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {successResult.certificateUrl && (
                <a
                  href={getPdfUrl(successResult.certificateUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={15} /> Download PDF Certificate
                </a>
              )}
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleResetForm}
              >
                Issue Another Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* BULK PASTE MODAL                                            */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBulkModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Bulk Paste Product List</span>
              <button className="modal-close" onClick={() => setShowBulkModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                Paste product names one per line. You can optionally include CODE and Category separated by a pipe (<code>|</code>) or comma:
              </p>
              <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, fontSize: 11, fontFamily: 'monospace', color: '#475569', marginBottom: 12 }}>
                Halal Beef Sausage | PRD-01 | Meat & Poultry<br />
                Halal Chicken Nuggets | PRD-02 | Meat & Poultry<br />
                Spicy Peri Peri Sauce | PRD-03 | Sauces & Condiments
              </div>
              <textarea
                className="form-control"
                rows={8}
                placeholder="Paste your product list here..."
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowBulkModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleBulkImport}>Import Products</button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* INSPECT PRODUCTS MODAL (From History)                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      {inspectCert && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setInspectCert(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div>
                <span className="modal-title">Certified Products Schedule</span>
                <div style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>#{inspectCert.certificate_number}</div>
              </div>
              <button className="modal-close" onClick={() => setInspectCert(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: 420, overflowY: 'auto' }}>
              {inspectCert.products && inspectCert.products.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product Name</th>
                        <th>Code</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectCert.products.map((p, idx) => (
                        <tr key={p._id || idx}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                          <td><code>{p.code || p.barcode || '—'}</code></td>
                          <td>{p.category || 'General Food'}</td>
                          <td>{p.product_type || 'Processed'}</td>
                          <td><span className="badge badge-green">ACTIVE</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '16px 0' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Products Covered List:</div>
                  <ul style={{ paddingLeft: 20, color: '#0f172a', fontSize: 13.5 }}>
                    {(inspectCert.products_covered || []).map((item, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setInspectCert(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* FULLSCREEN LIVE PREVIEW MODAL                                */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showPreviewModal && livePreviewUrl && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPreviewModal(false)}>
          <div className="modal" style={{ maxWidth: 960, width: '92vw', height: '88vh', display: 'flex', flexDirection: 'column', padding: 20 }}>
            <div className="modal-header" style={{ paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} style={{ color: '#16a34a' }} />
                <span className="modal-title">Live Certificate Document Preview ({certNumber})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={livePreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a' }}
                >
                  <ExternalLink size={13} /> Open in New Tab
                </a>
                <button className="modal-close" onClick={() => setShowPreviewModal(false)}><X size={16} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, padding: 0, overflow: 'hidden', borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <iframe
                src={`${livePreviewUrl}#toolbar=1&navpanes=0`}
                title="Fullscreen Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between', marginTop: 12, paddingTop: 12 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Scheme: <strong>{certType}</strong> • Issue: <strong>{issueDate}</strong> • Expiry: <strong>{expiryDate}</strong>
              </span>
              <button type="button" className="btn btn-primary" onClick={() => setShowPreviewModal(false)}>Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
