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
  Building, User, Mail, Tag, Clock, HelpCircle, Filter
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

  // Active Tab: 'create' | 'history'
  const [activeTab, setActiveTab] = useState('create');

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
    { id: 1, name: '', code: 'PRD-01', category: 'General Food Products', product_type: 'Processed', status: 'active', description: '' }
  ]);

  // Bulk Import Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Options
  const [sendNotification, setSendNotification] = useState(true);
  const [adminNotes, setAdminNotes] = useState('Directly registered by administrator.');

  // Success Modal State
  const [successResult, setSuccessResult] = useState(null);

  // History Tab Filter States
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterSite, setHistoryFilterSite] = useState('');
  const [historyFilterCategory, setHistoryFilterCategory] = useState('');

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
      const res = await api.get('/api/products');
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
    if (!clientSearchQuery.trim()) return clients.slice(0, 8);
    const q = clientSearchQuery.toLowerCase();
    return clients.filter(c =>
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 12);
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
        status: 'active',
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
        code: `PRD-${String(nextIndex).padStart(2, '0')}`
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
        status: 'active',
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
    toast.success(`Imported ${parsed.length} products to the list!`);
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
        products: validProducts.map(p => ({
          name: p.name.trim(),
          code: p.code ? p.code.trim() : '',
          category: p.category,
          product_type: p.product_type,
          status: p.status || 'active',
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

      // Refresh list
      fetchProductsHistory();

      // Reset form
      setProducts([
        { id: Date.now(), name: '', code: 'PRD-01', category: 'General Food Products', product_type: 'Processed', status: 'active', description: '' }
      ]);
    } catch (err) {
      toast.error(err.message || 'Failed to register products', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // History Tab Filtered Products
  const filteredHistory = useMemo(() => {
    return historyProducts.filter(p => {
      const clientName = p.client_id?.company_name || p.client_id?.full_name || p.profiles?.company_name || '';
      const siteName = p.site_id?.name || p.site_id?.est_name || '';
      const codeStr = p.code || p.barcode || '';
      const q = historySearch.toLowerCase();

      const matchSearch = !historySearch ||
        p.name?.toLowerCase().includes(q) ||
        codeStr.toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q) ||
        siteName.toLowerCase().includes(q);

      const prodSiteId = p.site_id?._id || p.site_id?.id || p.site_id;
      const matchSite = !historyFilterSite || String(prodSiteId) === String(historyFilterSite);

      const matchCategory = !historyFilterCategory || p.category === historyFilterCategory;

      return matchSearch && matchSite && matchCategory;
    });
  }, [historyProducts, historySearch, historyFilterSite, historyFilterCategory]);

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
              <Sparkles size={12} /> DIRECT PRODUCT CREATOR
            </span>
            <span style={{ fontSize: 13, color: '#64748b' }}>•</span>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Bypass Application Pipeline</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package style={{ color: '#059669' }} size={28} /> Direct Product
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
            Directly register, certify, and assign multiple products in bulk to a specific site of a company.
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
            <Plus size={15} /> Create Direct Products
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'history' ? '#ffffff' : 'transparent',
              color: activeTab === 'history' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'history' ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s'
            }}
          >
            <FileSpreadsheet size={15} /> Product Catalog & History ({historyProducts.length})
          </button>
        </div>
      </div>

      {/* ─── TAB 1: CREATE DIRECT PRODUCTS ─── */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmitDirectProducts}>
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>

            {/* LEFT COLUMN: COMPANY & SITE SELECTION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* STEP 1: SELECT COMPANY */}
              <div style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                padding: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: '#059669', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700
                  }}>1</div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Select Company</h3>
                </div>

                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search company by name or email..."
                    value={clientSearchQuery}
                    onChange={e => {
                      setClientSearchQuery(e.target.value);
                      if (selectedClient && e.target.value !== (selectedClient.company_name || selectedClient.full_name)) {
                        setSelectedClient(null);
                        setSelectedSiteId('');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Client selection results list */}
                {!selectedClient && (
                  <div style={{
                    maxHeight: 220,
                    overflowY: 'auto',
                    border: '1px solid #f1f5f9',
                    borderRadius: 8,
                    background: '#f8fafc'
                  }}>
                    {filteredClients.length === 0 ? (
                      <div style={{ padding: 14, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                        No matching companies found.
                      </div>
                    ) : (
                      filteredClients.map(c => (
                        <div
                          key={c._id || c.id}
                          onClick={() => handleSelectClient(c)}
                          style={{
                            padding: '10px 12px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            transition: 'background 0.1s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                            {c.company_name || c.full_name || 'Unnamed Company'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                            <span>{c.email}</span>
                            {c.full_name && c.company_name && <span>• {c.full_name}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Selected Client Card */}
                {selectedClient && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 8,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginTop: 8
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building size={15} style={{ color: '#16a34a' }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#166534' }}>
                          {selectedClient.company_name || selectedClient.full_name}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>
                        {selectedClient.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setSelectedSiteId('');
                        setClientSearchQuery('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 4
                      }}
                      title="Change Company"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 2: SELECT SPECIFIC SITE */}
              <div style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                padding: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', background: '#059669', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700
                    }}>2</div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Select Site</h3>
                  </div>
                </div>

                {!selectedClient ? (
                  <div style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px dashed #cbd5e1',
                    color: '#94a3b8',
                    fontSize: 12
                  }}>
                    Select a company first to see its available facility sites.
                  </div>
                ) : clientSites.length === 0 ? (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    background: '#fffbeb',
                    borderRadius: 8,
                    border: '1px solid #fef3c7',
                    color: '#b45309',
                    fontSize: 12
                  }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>This company has no sites registered yet.</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#92400e' }}>Please register a facility site in Sites Management first.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {clientSites.map(s => {
                      const siteId = s._id || s.id;
                      const isSelected = String(selectedSiteId) === String(siteId);
                      return (
                        <div
                          key={siteId}
                          onClick={() => setSelectedSiteId(siteId)}
                          style={{
                            padding: '12px',
                            borderRadius: 8,
                            border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                            background: isSelected ? '#f0fdf4' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            transition: 'all 0.1s'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#166534' : '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <MapPin size={14} style={{ color: isSelected ? '#16a34a' : '#64748b' }} />
                              {s.name || s.est_name || s.trading_name || 'Unnamed Site'}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                              {[s.address_1, s.city, s.postcode, s.country].filter(Boolean).join(', ') || 'No address specified'}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
                    <FileSpreadsheet size={15} style={{ color: '#059669' }} /> Bulk Import (Paste List)
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
                      <th style={{ padding: '10px 12px', width: 140, color: '#334155', fontWeight: 700 }}>Code</th>
                      <th style={{ padding: '10px 12px', width: 210, color: '#334155', fontWeight: 700 }}>Category</th>
                      <th style={{ padding: '10px 12px', width: 150, color: '#334155', fontWeight: 700 }}>Product Type</th>
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

      {/* ─── TAB 2: PRODUCT CATALOG & HISTORY ─── */}
      {activeTab === 'history' && (
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: 24
        }}>
          {/* Filter Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search products, code, company, or site..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Filter Category */}
              <select
                value={historyFilterCategory}
                onChange={e => setHistoryFilterCategory(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: '#fff'
                }}
              >
                <option value="">All Categories</option>
                {PRODUCT_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Filter Site */}
              <select
                value={historyFilterSite}
                onChange={e => setHistoryFilterSite(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: '#fff'
                }}
              >
                <option value="">All Sites ({sites.length})</option>
                {sites.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name || s.est_name || s.trading_name || 'Site'}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={fetchProductsHistory}
              style={{
                background: '#f8fafc',
                color: '#475569',
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
              <RefreshCw size={14} className={historyLoading ? 'animate-spin' : ''} /> Refresh Catalog
            </button>
          </div>

          {/* Products Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', color: '#334155', fontWeight: 700 }}>Product Name</th>
                  <th style={{ padding: '10px 14px', color: '#334155', fontWeight: 700 }}>Code</th>
                  <th style={{ padding: '10px 14px', color: '#334155', fontWeight: 700 }}>Company</th>
                  <th style={{ padding: '10px 14px', color: '#334155', fontWeight: 700 }}>Assigned Site</th>
                  <th style={{ padding: '10px 14px', color: '#334155', fontWeight: 700 }}>Category</th>
                  <th style={{ padding: '10px 14px', color: '#334155', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                      {historyLoading ? 'Loading products...' : 'No products found matching your search.'}
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(p => {
                    const clientName = p.client_id?.company_name || p.client_id?.full_name || p.profiles?.company_name || 'N/A';
                    const siteName = p.site_id?.name || p.site_id?.est_name || p.site_id?.trading_name || '—';
                    return (
                      <tr key={p._id || p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                          {p.name}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>
                          {p.code || p.barcode || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#334155' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Building size={13} style={{ color: '#059669' }} /> {clientName}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={13} style={{ color: '#2563eb' }} /> {siteName}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>
                          {p.category || 'General'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: p.status === 'active' ? '#ecfdf5' : '#fef2f2',
                            color: p.status === 'active' ? '#059669' : '#dc2626',
                            border: `1px solid ${p.status === 'active' ? '#a7f3d0' : '#fecaca'}`
                          }}>
                            {p.status ? p.status.toUpperCase() : 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12 }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: BULK IMPORT MODAL ─── */}
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
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Bulk Paste Products</h3>
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
                  Paste product names line by line. You can optionally include code and category separated by a pipe (<code>|</code>) or comma (<code>,</code>).
                </p>
                <div style={{ background: '#e2e8f0', padding: 6, borderRadius: 4, fontFamily: 'monospace', marginTop: 6 }}>
                  Halal Whole Beef Roast | PRD-01 | Meat & Poultry<br />
                  Halal Chicken Breast | PRD-02 | Meat & Poultry<br />
                  Halal Burger Patties
                </div>
              </div>

              <textarea
                rows={10}
                placeholder="Paste products here..."
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
                Parse & Add Products
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
                <span style={{ color: '#64748b' }}>Assigned Site:</span>
                <span style={{ fontWeight: 600, color: '#059669' }}>{successResult.site?.name || 'Assigned Site'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Status:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>ACTIVE / CERTIFIED</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setSuccessResult(null);
                  setActiveTab('history');
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
