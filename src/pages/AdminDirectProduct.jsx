import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  Package, Plus, Trash2, Copy, Search, CheckCircle2,
  AlertTriangle, FileText, Sparkles, Building2, MapPin,
  Check, X, ArrowRight, RefreshCw, Upload, Eye, FileCheck2,
  Lock, Layers, AlertCircle, Info, ChevronDown, CheckSquare,
  FileSpreadsheet, ArrowLeftRight, ExternalLink, ShieldCheck,
  Building, User, Mail, Tag, Clock, HelpCircle, Filter, Edit3
} from 'lucide-react';

const PRODUCT_CATEGORIES = [
  'General Food Products',
  'Meat & Poultry',
  'Dairy & Eggs',
  'Bakery & Confectionery',
  'Beverages',
  'Prepared Meals & Snacks',
  'Sauces & Condiments',
  'Ingredients & Flavours',
  'Oils & Fats',
  'Packaging & Processing Aids',
  'Cosmetics & Personal Care',
  'Pharmaceuticals & Nutraceuticals'
];

const PRODUCT_TYPES = [
  'Processed',
  'Raw / Chilled',
  'Frozen',
  'Bulk / Intermediate',
  'Formulation',
  'Packaging',
  'Finished Product',
  'Other'
];

const APPLICATION_TYPES = [
  'New',
  'Renewal',
  'Extension',
  'Direct'
];

export default function AdminDirectProduct() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Role permissions
  const userRoles = Array.isArray(profile?.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? [profile.role] : (Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean)));
  const isSuperAdmin = userRoles.includes('superadmin');
  const isAdminOrStaff = isSuperAdmin || userRoles.some(r =>
    ['admin', 'scheme_manager', 'certificate_officer', 'food_tech_manager', 'food_tech', 'audit_manager'].includes(r)
  );

  // Active Tab: 'manage' | 'create'
  const [activeTab, setActiveTab] = useState('manage');

  // Loading States
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Collections
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [historyProducts, setHistoryProducts] = useState([]);

  // Client Selection
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Site Selection
  const [selectedSiteId, setSelectedSiteId] = useState('');

  // Product Builder Rows
  const [products, setProducts] = useState([
    { id: 1, name: '', code: 'PRD-01', category: 'General Food Products', product_type: 'Processed', application_type: 'Direct', status: 'approved', description: '' }
  ]);

  // Bulk Import Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Options
  const [sendNotification, setSendNotification] = useState(true);
  const [adminNotes, setAdminNotes] = useState('Directly registered by administrator.');

  // Success Modal State
  const [successResult, setSuccessResult] = useState(null);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    category: 'General Food Products',
    product_type: 'Processed',
    application_type: 'Direct',
    site_id: '',
    source: 'admin',
    description: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete Product Confirmation State
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Manage Tab Search & Site Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historySiteFilter, setHistorySiteFilter] = useState('');

  // Load clients and sites
  const fetchInitialData = async () => {
    setLoadingData(true);
    try {
      const [usersRes, sitesRes] = await Promise.all([
        api.get('/api/users').catch(() => ({ data: [] })),
        api.get('/api/sites').catch(() => ({ data: [] }))
      ]);

      const userList = Array.isArray(usersRes) ? usersRes : (Array.isArray(usersRes?.data) ? usersRes.data : []);
      const siteList = Array.isArray(sitesRes) ? sitesRes : (Array.isArray(sitesRes?.data) ? sitesRes.data : []);

      const clientAccounts = userList.filter(u => u.role === 'client');
      setClients(clientAccounts);
      setSites(siteList);
    } catch (err) {
      toast.error('Failed to load companies and sites');
    } finally {
      setLoadingData(false);
    }
  };

  // Load products for history tab
  const fetchProductsHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/api/products?all=true');
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setHistoryProducts(list);
    } catch (err) {
      toast.error('Failed to load product history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchProductsHistory();
  }, []);

  // Filtered Client Suggestions
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return [];
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
    const cId = selectedClient._id || selectedClient.id;
    return sites.filter(s => {
      const sClientId = s.client_id?._id || s.client_id;
      return String(sClientId) === String(cId);
    });
  }, [sites, selectedClient]);

  const formatSiteAddress = (site) => {
    if (!site) return '';
    const parts = [site.address_1, site.address_2, site.city, site.state, site.postcode, site.country].map(p => (p || '').trim()).filter(Boolean);
    return parts.join(', ');
  };

  const selectedSite = useMemo(() => {
    if (!selectedSiteId) return null;
    return clientSites.find(s => String(s._id || s.id) === String(selectedSiteId)) || sites.find(s => String(s._id || s.id) === String(selectedSiteId)) || null;
  }, [selectedSiteId, clientSites, sites]);

  // Auto-select site if client has exactly 1 site, or reset if invalid
  useEffect(() => {
    if (!selectedClient || clientSites.length === 0) {
      setSelectedSiteId('');
    } else if (clientSites.length === 1) {
      setSelectedSiteId(clientSites[0]._id || clientSites[0].id);
    } else if (!clientSites.some(s => String(s._id || s.id) === String(selectedSiteId))) {
      setSelectedSiteId('');
    }
  }, [selectedClient, clientSites]);

  // Handle Client Selection
  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSelectedSiteId('');
    setClientSearchQuery(client.company_name || client.full_name || '');
  };

  // Row Manipulation
  const addProductRow = () => {
    const nextIndex = products.length + 1;
    setProducts(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        name: '',
        code: `PRD-${String(nextIndex).padStart(2, '0')}`,
        category: 'General Food Products',
        product_type: 'Processed',
        application_type: 'Direct',
        status: 'approved',
        description: ''
      }
    ]);
  };

  const updateProductRow = (id, field, value) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProductRow = (id) => {
    if (products.length === 1) {
      toast.error('You must include at least one product.');
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const duplicateProductRow = (item) => {
    const nextIndex = products.length + 1;
    setProducts(prev => [
      ...prev,
      {
        ...item,
        id: Date.now() + Math.random(),
        name: `${item.name} (Copy)`,
        code: `PRD-${String(nextIndex).padStart(2, '0')}`,
        application_type: item.application_type || 'Direct'
      }
    ]);
  };

  // Bulk Import Handler
  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map((line, idx) => {
      // Split by |, comma, tab, or semicolon
      const parts = line.split(/[|,;\t]/).map(p => p.trim());
      const name = parts[0] || `Product Line ${idx + 1}`;
      const code = parts[1] || `PRD-${String(products.length + idx + 1).padStart(2, '0')}`;
      const category = parts[2] || 'General Food Products';
      const product_type = parts[3] || 'Processed';
      return {
        id: Date.now() + idx + Math.random(),
        name,
        code,
        category: PRODUCT_CATEGORIES.includes(category) ? category : 'General Food Products',
        product_type: PRODUCT_TYPES.includes(product_type) ? product_type : 'Processed',
        application_type: 'Direct',
        status: 'approved',
        description: ''
      };
    });

    if (products.length === 1 && !products[0].name.trim()) {
      setProducts(parsed);
    } else {
      setProducts(prev => [...prev, ...parsed]);
    }

    setBulkText('');
    setShowBulkModal(false);
    toast.success(`Added ${parsed.length} products to the list!`);
  };

  // Submit Batch Products
  const handleSubmitDirectProducts = async (e) => {
    e.preventDefault();

    if (!selectedClient) {
      return toast.error('Please select a company.');
    }

    if (!selectedSiteId) {
      return toast.error('Please select a specific site for these products.');
    }

    const validProducts = products.filter(p => p.name && p.name.trim());
    if (validProducts.length === 0) {
      return toast.error('Please specify at least one product name.');
    }

    setSubmitting(true);
    const toastId = toast.loading(`Registering ${validProducts.length} product(s)...`);

    try {
      const payload = {
        client_id: selectedClient._id || selectedClient.id,
        site_id: selectedSiteId,
        source: 'admin',
        products: validProducts.map(p => ({
          name: p.name.trim(),
          code: p.code ? p.code.trim() : '',
          category: p.category,
          product_type: p.product_type,
          application_type: p.application_type || 'Direct',
          source: 'admin',
          status: p.status || 'approved',
          description: p.description || '',
          notes: adminNotes
        })),
        send_notification: sendNotification,
        notes: adminNotes
      };

      const res = await api.post('/api/products/direct-batch', payload);

      toast.success(`Successfully registered ${validProducts.length} products!`, { id: toastId });

      const targetSite = clientSites.find(s => String(s._id || s.id) === String(selectedSiteId));

      setSuccessResult({
        count: validProducts.length,
        client: selectedClient,
        site: targetSite,
        products: res.data || validProducts
      });

      // Refresh catalog list
      fetchProductsHistory();

      // Reset form
      setProducts([
        { id: Date.now(), name: '', code: 'PRD-01', category: 'General Food Products', product_type: 'Processed', application_type: 'Direct', status: 'approved', description: '' }
      ]);
    } catch (err) {
      toast.error(err.message || 'Failed to register products', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Product Handlers
  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    const pSiteId = prod.site_id?._id || prod.site_id?.id || (typeof prod.site_id === 'string' ? prod.site_id : '');
    const currentAppType = prod.application_type || (prod.notes?.toLowerCase().includes('renewal') ? 'Renewal' : (prod.notes?.toLowerCase().includes('addon') ? 'Extension' : (prod.notes?.toLowerCase().includes('direct') ? 'Direct' : 'New')));
    const currentSource = prod.source || (prod.notes?.toLowerCase().includes('administrator') || prod.notes?.toLowerCase().includes('direct') ? 'admin' : 'client');

    setEditForm({
      name: prod.name || '',
      code: prod.code || prod.barcode || '',
      category: prod.category || 'General Food Products',
      product_type: prod.product_type || 'Processed',
      application_type: currentAppType,
      site_id: String(pSiteId),
      source: currentSource,
      description: prod.description || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return toast.error('Product name is required');
    const id = editingProduct._id || editingProduct.id;
    setEditSubmitting(true);
    const toastId = toast.loading('Saving product changes...');
    try {
      const payload = {
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        barcode: editForm.code.trim(),
        category: editForm.category,
        product_type: editForm.product_type,
        application_type: editForm.application_type,
        site_id: editForm.site_id || undefined,
        source: editForm.source,
        description: editForm.description
      };

      await api.put(`/api/products/${id}`, payload);

      const targetSite = sites.find(s => String(s._id || s.id) === String(editForm.site_id)) || editingProduct.site_id;

      setHistoryProducts(prev => prev.map(p => {
        if (String(p._id || p.id) === String(id)) {
          return {
            ...p,
            ...payload,
            site_id: targetSite
          };
        }
        return p;
      }));

      toast.success('Product updated successfully!', { id: toastId });
      setEditingProduct(null);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update product', { id: toastId });
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete Product Handler
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    const id = deletingProduct._id || deletingProduct.id;
    setDeleteSubmitting(true);
    const toastId = toast.loading('Removing product...');
    try {
      await api.delete(`/api/products/${id}`);
      setHistoryProducts(prev => prev.filter(p => String(p._id || p.id) !== String(id)));
      toast.success(`Product "${deletingProduct.name}" removed successfully!`, { id: toastId });
      setDeletingProduct(null);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to remove product', { id: toastId });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Filtered Products Search & Site Filter (Lists products one by one)
  const filteredHistory = useMemo(() => {
    return historyProducts.filter(p => {
      const siteObj = p.site_id;
      const sId = siteObj?._id || siteObj?.id || (typeof siteObj === 'string' ? siteObj : '');
      const clientName = p.client_id?.company_name || p.client_id?.full_name || p.profiles?.company_name || '';
      const siteName = siteObj?.name || siteObj?.est_name || siteObj?.trading_name || '';
      const codeStr = p.code || p.barcode || '';
      const q = historySearch.toLowerCase().trim();

      // Filter by specific site
      if (historySiteFilter && String(sId) !== String(historySiteFilter)) {
        return false;
      }

      if (!q) return true;

      return (
        p.name?.toLowerCase().includes(q) ||
        codeStr.toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q) ||
        siteName.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.application_type?.toLowerCase().includes(q) ||
        p.source?.toLowerCase().includes(q)
      );
    });
  }, [historyProducts, historySearch, historySiteFilter]);

  const selectedSiteObj = useMemo(() => {
    if (!historySiteFilter) return null;
    return sites.find(s => String(s._id || s.id) === String(historySiteFilter));
  }, [sites, historySiteFilter]);

  // Dynamic Sites Dropdown: If company is searched, show only sites for that company
  const filteredSitesForDropdown = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    if (!q) return sites;

    // Collect matched client IDs
    const matchedClientIds = new Set();
    clients.forEach(c => {
      const cName = c.company_name || c.full_name || '';
      if (cName.toLowerCase().includes(q)) {
        matchedClientIds.add(String(c._id || c.id));
      }
    });

    historyProducts.forEach(p => {
      const pComp = p.client_id?.company_name || p.profiles?.company_name || p.client_id?.full_name || '';
      if (pComp.toLowerCase().includes(q)) {
        const cId = p.client_id?._id || p.client_id?.id || (typeof p.client_id === 'string' ? p.client_id : '');
        if (cId) matchedClientIds.add(String(cId));
      }
    });

    const matchingSites = sites.filter(s => {
      const sClientObj = s.client_id;
      const sClientId = String(sClientObj?._id || sClientObj?.id || (typeof sClientObj === 'string' ? sClientObj : ''));
      const sComp = s.company_name || s.profiles?.company_name || (typeof sClientObj === 'object' ? sClientObj?.company_name : '') || '';

      // Direct company match
      if (sComp.toLowerCase().includes(q)) return true;
      // Linked client match
      if (matchedClientIds.has(sClientId)) return true;

      return false;
    });

    if (matchingSites.length > 0) {
      return matchingSites;
    }

    // Direct site name match fallback
    const siteNameMatches = sites.filter(s => {
      const sName = s.name || s.est_name || s.trading_name || '';
      return sName.toLowerCase().includes(q);
    });
    if (siteNameMatches.length > 0) {
      return siteNameMatches;
    }

    return sites;
  }, [sites, clients, historyProducts, historySearch]);

  // Reset selected site filter if it doesn't belong to the newly filtered company sites
  useEffect(() => {
    if (historySiteFilter && filteredSitesForDropdown.length > 0) {
      const exists = filteredSitesForDropdown.some(s => String(s._id || s.id) === String(historySiteFilter));
      if (!exists) {
        setHistorySiteFilter('');
      }
    }
  }, [filteredSitesForDropdown, historySiteFilter]);

  // Unique Company Names for autocomplete
  const uniqueCompanyNames = useMemo(() => {
    const set = new Set();
    clients.forEach(c => {
      const name = c.company_name || c.full_name;
      if (name && name.trim()) set.add(name.trim());
    });
    sites.forEach(s => {
      const name = s.company_name || s.profiles?.company_name || (typeof s.client_id === 'object' ? s.client_id?.company_name : '');
      if (name && name.trim()) set.add(name.trim());
    });
    historyProducts.forEach(p => {
      const name = p.client_id?.company_name || p.profiles?.company_name || p.client_id?.full_name;
      if (name && name.trim()) set.add(name.trim());
    });
    return Array.from(set).sort();
  }, [clients, sites, historyProducts]);

  if (!loadingData && !isAdminOrStaff) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: '#fef2f2',
          color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <ShieldCheck size={28} />
        </div>
        <h2 style={{ color: '#0f172a', fontWeight: 800, margin: '0 0 8px' }}>Access Restricted</h2>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
          You do not have administrative privileges to directly register products.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', fontFamily: 'inherit' }}>

      {/* Top Banner / Breadcrumb */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              background: '#ecfdf5',
              color: '#059669',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              border: '1px solid #a7f3d0'
            }}>
              <Sparkles size={12} /> PRODUCT MANAGEMENT
            </span>
            <span style={{ fontSize: 13, color: '#64748b' }}>•</span>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Per-Site Product Catalog &amp; Actions</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package style={{ color: '#059669' }} size={28} /> Manage Product
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
            List, edit, remove, and register certified products organized per site and company.
          </p>
        </div>

        {/* Action Tabs Header */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          borderRadius: 10,
          padding: 4,
          gap: 4
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'manage' ? '#ffffff' : 'transparent',
              color: activeTab === 'manage' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'manage' ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: activeTab === 'manage' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s'
            }}
          >
            <Layers size={15} /> Manage Products by Site ({historyProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'create' ? '#ffffff' : 'transparent',
              color: activeTab === 'create' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'create' ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: activeTab === 'create' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s'
            }}
          >
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {/* ─── TAB 1: CREATE DIRECT PRODUCTS ─── */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmitDirectProducts}>
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>

            {/* LEFT COLUMN: COMPANY & SITE SELECTION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* CARD 1: Client & Facility Details */}
              <div style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                padding: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>1. Client &amp; Facility Details</h3>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Target company and production facility information</p>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Search Bar */}
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 8, display: 'block' }}>
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
                        if (selectedClient && e.target.value.trim() !== (selectedClient.company_name || selectedClient.full_name)) {
                          setSelectedClient(null);
                          setSelectedSiteId('');
                        }
                      }}
                      style={{ paddingLeft: 40, height: 44, fontSize: 13.5, fontWeight: 500 }}
                      autoComplete="off"
                    />
                    {clientSearchQuery && (
                      <button
                        type="button"
                        onClick={() => { setClientSearchQuery(''); setSelectedClient(null); setSelectedSiteId(''); }}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* Search Results List (only when query is active and no client selected) */}
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
                            key={c._id || c.id || idx}
                            onClick={() => handleSelectClient(c)}
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
                                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
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

                  {/* Selected Company Row + Site Picker */}
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
                            <div style={{ fontSize: 11.5, color: '#16a34a', marginTop: 1 }}>
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
                          }}
                          style={{ background: '#dcfce7', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: '#15803d', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, whiteSpace: 'nowrap' }}
                        >
                          <X size={13} /> Change
                        </button>
                      </div>

                      {/* Site picker */}
                      <div style={{ padding: '14px 16px', background: '#ffffff' }}>
                        <label style={{ fontWeight: 700, marginBottom: 6, display: 'block', fontSize: 12.5, color: '#334155' }}>
                          Assign Certified Site / Facility <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        {clientSites.length > 0 ? (
                          <select
                            className="form-control"
                            style={{ borderColor: !selectedSiteId ? '#fca5a5' : '#86efac', background: selectedSiteId ? '#f0fdf4' : undefined, fontWeight: 500 }}
                            value={selectedSiteId}
                            onChange={e => setSelectedSiteId(e.target.value)}
                            required
                          >
                            <option value="">-- Select a registered site for this product *</option>
                            {clientSites.map(s => (
                              <option key={s._id || s.id} value={s._id || s.id}>
                                {s.name || s.est_name || s.trading_name}{s.address_1 ? ` — ${s.address_1}` : ''}{s.city ? `, ${s.city}` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div>
                            <p style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                              ⚠️ No registered sites found for this company. Please register a facility site in Sites Management first.
                            </p>
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

              {/* OPTIONS CARD */}
              <div style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                padding: 20
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Direct Creation Options</h4>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#334155', marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    checked={sendNotification}
                    onChange={e => setSendNotification(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#059669' }}
                  />
                  <span>Send in-app notification to client</span>
                </label>

                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Admin Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Internal audit notes for this direct batch..."
                    style={{
                      width: '100%',
                      padding: 8,
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: MULTI-PRODUCT BUILDER TABLE */}
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              padding: 24
            }}>
              {/* Product Table Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', background: '#059669', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700
                    }}>3</div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                      Products to Register ({products.length})
                    </h2>
                  </div>
                  <p style={{ margin: '4px 0 0 34px', color: '#64748b', fontSize: 13 }}>
                    Add as many products as needed. Fill in name, code, category, and type.
                  </p>
                </div>

                {/* Bulk & Add Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(true)}
                    style={{
                      background: '#f8fafc',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <FileSpreadsheet size={15} style={{ color: '#059669' }} /> Bulk Add Products
                  </button>

                  <button
                    type="button"
                    onClick={addProductRow}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 1px 2px rgba(5,150,105,0.2)'
                    }}
                  >
                    <Plus size={15} /> Add Row
                  </button>
                </div>
              </div>

              {/* PRODUCTS TABLE */}
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', width: 36, color: '#64748b', fontWeight: 600 }}>#</th>
                      <th style={{ padding: '10px 12px', color: '#334155', fontWeight: 700 }}>Product Name <span style={{ color: '#ef4444' }}>*</span></th>
                      <th style={{ padding: '10px 12px', width: 130, color: '#334155', fontWeight: 700 }}>Code</th>
                      <th style={{ padding: '10px 12px', width: 170, color: '#334155', fontWeight: 700 }}>Category</th>
                      <th style={{ padding: '10px 12px', width: 130, color: '#334155', fontWeight: 700 }}>Product Type</th>
                      <th style={{ padding: '10px 12px', width: 130, color: '#334155', fontWeight: 700 }}>Type of Application</th>
                      <th style={{ padding: '10px 12px', width: 90, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Index */}
                        <td style={{ padding: '8px 12px', color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>
                          {idx + 1}
                        </td>

                        {/* Product Name */}
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="text"
                            placeholder="e.g. Halal Whole Beef Roast"
                            value={item.name}
                            onChange={e => updateProductRow(item.id, 'name', e.target.value)}
                            required
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 13,
                              fontWeight: 500,
                              boxSizing: 'border-box'
                            }}
                          />
                        </td>

                        {/* Code */}
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="text"
                            placeholder="PRD-01"
                            value={item.code}
                            onChange={e => updateProductRow(item.id, 'code', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 12,
                              fontFamily: 'monospace',
                              boxSizing: 'border-box'
                            }}
                          />
                        </td>

                        {/* Category */}
                        <td style={{ padding: '8px 12px' }}>
                          <select
                            value={item.category}
                            onChange={e => updateProductRow(item.id, 'category', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 12,
                              boxSizing: 'border-box',
                              background: '#fff'
                            }}
                          >
                            {PRODUCT_CATEGORIES.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>

                        {/* Product Type */}
                        <td style={{ padding: '8px 12px' }}>
                          <select
                            value={item.product_type}
                            onChange={e => updateProductRow(item.id, 'product_type', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 12,
                              boxSizing: 'border-box',
                              background: '#fff'
                            }}
                          >
                            {PRODUCT_TYPES.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>

                        {/* Type of Application */}
                        <td style={{ padding: '8px 12px' }}>
                          <select
                            value={item.application_type || 'Direct'}
                            onChange={e => updateProductRow(item.id, 'application_type', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 12,
                              boxSizing: 'border-box',
                              background: '#fff'
                            }}
                          >
                            {APPLICATION_TYPES.map(a => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => duplicateProductRow(item)}
                              title="Duplicate row"
                              style={{
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: 4,
                                padding: 6,
                                cursor: 'pointer',
                                color: '#475569'
                              }}
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProductRow(item.id)}
                              title="Remove row"
                              style={{
                                background: '#fef2f2',
                                border: 'none',
                                borderRadius: 4,
                                padding: 6,
                                cursor: 'pointer',
                                color: '#ef4444'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Submit Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={addProductRow}
                    style={{
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px dashed #cbd5e1',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Plus size={14} /> Add Another Row
                  </button>

                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Total valid products: <strong>{products.filter(p => p.name.trim()).length}</strong>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedClient || !selectedSiteId}
                  style={{
                    background: (submitting || !selectedClient || !selectedSiteId) ? '#94a3b8' : '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 28px',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: (submitting || !selectedClient || !selectedSiteId) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                  }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Registering Products...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Register & Assign {products.filter(p => p.name.trim()).length || ''} Product(s)
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </form>
      )}

      {/* ─── TAB 2: MANAGE PRODUCTS (LISTED ONE BY ONE) ─── */}
      {activeTab === 'manage' && (
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: 24
        }}>
          {/* Search & Site Filter Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 320, flexWrap: 'wrap' }}>
              {/* Search by Company, Product Name, Code */}
              <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 400 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                <input
                  type="text"
                  list="manage-product-company-suggestions"
                  placeholder="Search company name, product, code..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
                <datalist id="manage-product-company-suggestions">
                  {uniqueCompanyNames.map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filter by Site Dropdown (Filtered to Searched Company's Sites) */}
              <div style={{ position: 'relative', width: 280 }}>
                <select
                  value={historySiteFilter}
                  onChange={e => setHistorySiteFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: historySiteFilter ? '#f0fdf4' : '#ffffff',
                    borderColor: historySiteFilter ? '#86efac' : '#cbd5e1',
                    color: '#0f172a',
                    fontWeight: historySiteFilter ? 600 : 400,
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">
                    {filteredSitesForDropdown.length < sites.length
                      ? `Filter by Site (${filteredSitesForDropdown.length} for searched company)`
                      : `Filter by Site (All Sites)`}
                  </option>
                  {filteredSitesForDropdown.map(s => {
                    const sName = s.name || s.est_name || s.trading_name || 'Site';
                    const cName = s.company_name || s.profiles?.company_name || (typeof s.client_id === 'object' ? s.client_id?.company_name : '');
                    return (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {sName} {cName ? `(${cName})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {(historySearch || historySiteFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearch('');
                    setHistorySiteFilter('');
                  }}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={fetchProductsHistory}
                style={{
                  background: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '9px 15px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <RefreshCw size={14} className={historyLoading ? 'animate-spin' : ''} /> Refresh Catalog
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('create')}
                style={{
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 16px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Plus size={14} /> Add Product
              </button>
            </div>
          </div>

          {/* Unified Products Table (Listed one by one) */}
          {filteredHistory.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', border: '1.5px dashed #e2e8f0', borderRadius: 10 }}>
              <Package size={36} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#64748b' }}>
                {historyLoading ? 'Loading products...' : 'No products found matching your search or site filter.'}
              </p>
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
              {/* Table Top Info Bar */}
              <div style={{
                padding: '12px 18px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                    All Products
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: '#f0fdf4', color: '#166534',
                    border: '1px solid #bbf7d0', borderRadius: 10,
                    padding: '2px 9px'
                  }}>
                    {filteredHistory.length} product{filteredHistory.length === 1 ? '' : 's'}
                  </span>
                  {historySiteFilter && selectedSiteObj && (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      background: '#eff6ff', color: '#1e40af',
                      border: '1px solid #bfdbfe', borderRadius: 10,
                      padding: '2px 8px',
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      <MapPin size={11} /> Site: {selectedSiteObj.name || selectedSiteObj.est_name || 'Selected Site'}
                      <button
                        type="button"
                        onClick={() => setHistorySiteFilter('')}
                        style={{ background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                        title="Clear site filter"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {historySearch && (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      background: '#f8fafc', color: '#475569',
                      border: '1px solid #cbd5e1', borderRadius: 10,
                      padding: '2px 8px',
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      Search: "{historySearch}"
                      <button
                        type="button"
                        onClick={() => setHistorySearch('')}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                        title="Clear search"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {/* Products Table (One by One) */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '11px 14px', width: 44, color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>#</th>
                      <th style={{ padding: '11px 14px', color: '#334155', fontWeight: 700 }}>Product Name</th>
                      <th style={{ padding: '11px 14px', width: 110, color: '#334155', fontWeight: 700 }}>Code</th>
                      <th style={{ padding: '11px 14px', width: 140, color: '#334155', fontWeight: 700 }}>Category</th>
                      <th style={{ padding: '11px 14px', width: 160, color: '#334155', fontWeight: 700 }}>Company</th>
                      <th style={{ padding: '11px 14px', width: 160, color: '#334155', fontWeight: 700 }}>Site</th>
                      <th style={{ padding: '11px 14px', width: 140, color: '#334155', fontWeight: 700 }}>Type of Application</th>
                      <th style={{ padding: '11px 14px', width: 120, color: '#334155', fontWeight: 700 }}>Source</th>
                      <th style={{ padding: '11px 14px', width: 150, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((p, pIdx) => {
                      const isByAdmin = p.source === 'admin' || (!p.source && (p.notes?.toLowerCase().includes('administrator') || p.notes?.toLowerCase().includes('direct')));
                      const appType = p.application_type || (p.notes?.toLowerCase().includes('renewal') ? 'Renewal' : (p.notes?.toLowerCase().includes('addon') ? 'Extension' : (p.notes?.toLowerCase().includes('direct') ? 'Direct' : 'New')));
                      const siteName = p.site_id?.name || p.site_id?.est_name || p.site_id?.trading_name || 'Unassigned';
                      const companyName = p.client_id?.company_name || p.client_id?.full_name || p.profiles?.company_name || '—';

                      return (
                        <tr key={p._id || p.id || pIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>
                            {pIdx + 1}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                            <div>{p.name}</div>
                            {p.description && (
                              <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 400, marginTop: 2 }}>
                                {p.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>
                            {p.code || p.barcode || '—'}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>
                            {p.category || 'General'}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155', fontSize: 12 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                              <Building size={12} style={{ color: '#059669', flexShrink: 0 }} />
                              {companyName}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155', fontSize: 12 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={12} style={{ color: '#0284c7', flexShrink: 0 }} />
                              {siteName}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: appType === 'Renewal' ? '#faf5ff' : (appType === 'Extension' ? '#fffbeb' : (appType === 'New' ? '#eff6ff' : '#ecfdf5')),
                              color: appType === 'Renewal' ? '#7e22ce' : (appType === 'Extension' ? '#b45309' : (appType === 'New' ? '#1d4ed8' : '#047857')),
                              border: `1px solid ${appType === 'Renewal' ? '#e9d5ff' : (appType === 'Extension' ? '#fde68a' : (appType === 'New' ? '#bfdbfe' : '#a7f3d0'))}`
                            }}>
                              {appType}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isByAdmin ? '#eff6ff' : '#f0fdf4',
                              color: isByAdmin ? '#1d4ed8' : '#15803d',
                              border: `1px solid ${isByAdmin ? '#bfdbfe' : '#bbf7d0'}`
                            }}>
                              {isByAdmin ? 'Source: Admin' : 'Source: Client'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                title="Edit product details"
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: 6,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  color: '#1d4ed8',
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Edit3 size={12} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingProduct(p)}
                                title="Remove product"
                                style={{
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  borderRadius: 6,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  color: '#dc2626',
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Trash2 size={12} /> Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL 1: BULK ADD PRODUCTS MODAL ─── */}
      {showBulkModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 640,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={20} style={{ color: '#059669' }} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Bulk Add Products</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 12, color: '#475569', marginBottom: 14 }}>
                <strong style={{ color: '#0f172a' }}>Format guidelines:</strong>
                <p style={{ margin: '4px 0 0' }}>
                  Enter or paste product names line by line. You can optionally include code and category separated by a pipe (<code>|</code>) or comma (<code>,</code>).
                </p>
                <div style={{ background: '#e2e8f0', padding: 6, borderRadius: 4, fontFamily: 'monospace', marginTop: 6 }}>
                  Halal Whole Beef Roast | PRD-01 | Meat & Poultry<br />
                  Halal Chicken Breast | PRD-02 | Meat & Poultry<br />
                  Halal Burger Patties
                </div>
              </div>

              <textarea
                rows={10}
                placeholder="Enter products here line by line..."
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={!bulkText.trim()}
                style={{
                  background: !bulkText.trim() ? '#94a3b8' : '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !bulkText.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                Add Products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT PRODUCT MODAL ─── */}
      {editingProduct && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 580,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <form onSubmit={handleSaveEdit}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit3 size={18} style={{ color: '#1d4ed8' }} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    Edit Product
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Product Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Product Code / Barcode
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.code}
                      onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Category
                    </label>
                    <select
                      className="form-control"
                      value={editForm.category}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                    >
                      {PRODUCT_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Product Type
                    </label>
                    <select
                      className="form-control"
                      value={editForm.product_type}
                      onChange={e => setEditForm(f => ({ ...f, product_type: e.target.value }))}
                    >
                      {PRODUCT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Type of Application
                    </label>
                    <select
                      className="form-control"
                      value={editForm.application_type}
                      onChange={e => setEditForm(f => ({ ...f, application_type: e.target.value }))}
                    >
                      {APPLICATION_TYPES.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Assigned Site
                    </label>
                    <select
                      className="form-control"
                      value={editForm.site_id}
                      onChange={e => setEditForm(f => ({ ...f, site_id: e.target.value }))}
                    >
                      <option value="">-- No Specific Site --</option>
                      {sites.map(s => (
                        <option key={s._id || s.id} value={s._id || s.id}>
                          {s.name || s.est_name || s.trading_name || 'Site'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Source Attribution
                    </label>
                    <select
                      className="form-control"
                      value={editForm.source}
                      onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}
                    >
                      <option value="admin">Source: Admin</option>
                      <option value="client">Source: Client</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Description / Notes
                  </label>
                  <textarea
                    rows={2}
                    className="form-control"
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional product notes..."
                  />
                </div>
              </div>

              <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  style={{
                    background: '#1d4ed8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: editSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {editSubmitting ? <RefreshCw size={14} className="animate-spin" /> : null}
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: REMOVE PRODUCT CONFIRMATION MODAL ─── */}
      {deletingProduct && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 440,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            textAlign: 'center',
            padding: '24px 20px'
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: '#fef2f2', color: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px'
            }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              Remove Product?
            </h3>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13.5, lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>"{deletingProduct.name}"</strong>? This will permanently remove it from the certified site catalog.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                disabled={deleteSubmitting}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: deleteSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {deleteSubmitting ? <RefreshCw size={14} className="animate-spin" /> : null}
                {deleteSubmitting ? 'Removing...' : 'Yes, Remove Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SUCCESS CELEBRATION MODAL ─── */}
      {successResult && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 520,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            textAlign: 'center',
            padding: '32px 28px'
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5',
              color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
              Products Successfully Registered!
            </h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>
              <strong>{successResult.count} product(s)</strong> have been registered and assigned directly to{' '}
              <strong>{successResult.site?.name || 'facility site'}</strong> for{' '}
              <strong>{successResult.client?.company_name || successResult.client?.full_name}</strong>.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 16,
              textAlign: 'left',
              marginBottom: 24,
              fontSize: 13
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Company:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{successResult.client?.company_name || successResult.client?.full_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Site:</span>
                <span style={{ fontWeight: 600, color: '#059669' }}>{successResult.site?.name || 'Site'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setSuccessResult(null);
                  setActiveTab('manage');
                }}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                View in Catalog
              </button>

              <button
                type="button"
                onClick={() => setSuccessResult(null)}
                style={{
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Create More Products
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
