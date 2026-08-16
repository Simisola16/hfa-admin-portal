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
  Lock, ExternalLink, HelpCircle, Layers, AlertCircle, Info
} from 'lucide-react';

const CERTIFICATE_TYPES = [
  'Annual Halal Certificate',
  'UAE/GSO Approved Halal Certification',
  'Abattoir & Meat Processing Certificate',
  'Restaurant & Catering Certificate',
  'Retail & Supermarket Certificate',
  'Product & Ingredient Certificate',
  'Export Halal Certificate',
  'Halal Storage & Logistics Certificate',
];

const SCOPE_PRESETS = [
  'Halal Food Certification & Processing Operations',
  'Slaughtering, Cutting, Processing and Packaging of Halal Meat Products',
  'Manufacturing, Packaging and Distribution of Halal Bakery and Confectionery Products',
  'Processing and Packaging of Halal Dairy and Beverage Products',
  'Production and Supply of Halal Certified Food Ingredients and Flavours',
  'Halal Food Storage, Warehousing and Logistics Services'
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
  const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
  const cleanApi = API_URL.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanApi}${cleanPath}`;
};

export default function SuperAdminDirectCertificate() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Role Security Check
  const isSuperAdmin = profile?.role === 'superadmin' || user?.role === 'superadmin';

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

  // Client Selection Mode: 'existing' | 'new'
  const [clientMode, setClientMode] = useState('existing');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Quick-create Client Form
  const [newClient, setNewClient] = useState({
    company_name: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
    postcode: '',
    country: 'United Kingdom'
  });

  // Facility / Site Details
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [customSiteName, setCustomSiteName] = useState('');
  const [customSiteAddress, setCustomSiteAddress] = useState('');
  const [manufacturerAddress, setManufacturerAddress] = useState('');

  // Certificate Parameters
  const generateRandomCertNo = (companyName) => {
    return generateHfaId(companyName || 'UK');
  };

  const [certNumber, setCertNumber] = useState(generateRandomCertNo());
  const [certType, setCertType] = useState('Annual Halal Certificate');
  const [scope, setScope] = useState(SCOPE_PRESETS[0]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('Directly issued with certified products by Superadmin.');

  // Product Builder State
  const [products, setProducts] = useState([
    { id: 1, name: '', code: 'PRD-01', category: 'Meat & Poultry', product_type: 'Processed', barcode: '', ingredients: '' }
  ]);

  // Bulk Import Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // PDF & Notification Options
  const [pdfOption, setPdfOption] = useState('auto'); // 'auto' | 'upload'
  const [uploadedPdfFile, setUploadedPdfFile] = useState(null);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [sendInAppNotification, setSendInAppNotification] = useState(true);

  // Success Modal State
  const [successResult, setSuccessResult] = useState(null);

  // History Inspect Modal
  const [inspectCert, setInspectCert] = useState(null);
  const [historySearch, setHistorySearch] = useState('');

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
    const start = issueDate ? new Date(issueDate) : new Date();
    const end = new Date(start);
    if (years) end.setFullYear(end.getFullYear() + years);
    if (months) end.setMonth(end.getMonth() + months);
    setExpiryDate(end.toISOString().split('T')[0]);
  };

  // Client Filtered List
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients.slice(0, 10);
    const q = clientSearchQuery.toLowerCase();
    return clients.filter(c =>
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 15);
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
    if (clientMode === 'existing' && !selectedClient) {
      return toast.error('Please select an existing client company.');
    }

    if (clientMode === 'new') {
      if (!newClient.company_name.trim()) return toast.error('Company Name is required.');
      if (!newClient.email.trim()) return toast.error('Client email is required.');
    }

    if (!certNumber.trim()) {
      return toast.error('Certificate number is required.');
    }

    const validProducts = products.filter(p => p.name && p.name.trim());
    if (validProducts.length === 0) {
      return toast.error('Please specify at least one product name to certify.');
    }

    if (pdfOption === 'upload' && !uploadedPdfFile) {
      return toast.error('Please select the PDF file to upload, or switch to Auto-Generate PDF.');
    }

    setSubmitting(true);
    const toastId = toast.loading('Generating official certificate & registering products...');

    try {
      const formData = new FormData();

      // Client info
      if (clientMode === 'existing') {
        formData.append('client_id', selectedClient._id || selectedClient.id);
      } else {
        formData.append('new_client_company', newClient.company_name);
        formData.append('new_client_name', newClient.full_name || newClient.company_name);
        formData.append('new_client_email', newClient.email);
        formData.append('new_client_phone', newClient.phone);
        formData.append('new_client_address', newClient.address);
        formData.append('new_client_postcode', newClient.postcode);
        formData.append('new_client_country', newClient.country);
      }

      // Facility info
      if (selectedSiteId) {
        formData.append('site_id', selectedSiteId);
      }
      if (customSiteName) formData.append('site_name', customSiteName);
      if (customSiteAddress) formData.append('site_address', customSiteAddress);
      if (manufacturerAddress) formData.append('manufacturer_address', manufacturerAddress);

      // Certificate details
      formData.append('certificate_number', certNumber.trim());
      formData.append('certificate_type', certType);
      formData.append('scope_of_certification', scope);
      formData.append('issue_date', issueDate);
      formData.append('expiry_date', expiryDate);
      formData.append('status', 'active');
      formData.append('notes', notes);

      // Products JSON
      formData.append('products', JSON.stringify(validProducts));

      // Options
      formData.append('auto_generate_pdf', pdfOption === 'auto');
      formData.append('send_email', sendEmailNotification);
      formData.append('send_notification', sendInAppNotification);

      if (pdfOption === 'upload' && uploadedPdfFile) {
        formData.append('certificate_file', uploadedPdfFile);
      }

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
    setUploadedPdfFile(null);
    setNotes('Directly issued with certified products by Superadmin.');
  };

  // Guard: Unauthorized view if not superadmin
  if (!isSuperAdmin) {
    return (
      <div style={{ maxWidth: 680, margin: '40px auto', padding: '32px 24px', textAlign: 'center', background: '#fff', borderRadius: 16, border: '1.5px solid #fee2e2', boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.1)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#991b1b', marginBottom: 8 }}>Superadmin Access Required</h2>
        <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          This console is strictly restricted to <strong>Superadmin</strong> accounts. You do not have permission to issue direct certificates or bypass application workflows.
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

                  {/* Mode switcher */}
                  <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
                    <button
                      type="button"
                      onClick={() => { setClientMode('existing'); }}
                      style={{
                        padding: '5px 12px', borderRadius: 6, border: 'none',
                        background: clientMode === 'existing' ? '#ffffff' : 'transparent',
                        color: clientMode === 'existing' ? '#0f172a' : '#64748b',
                        fontWeight: 600, fontSize: 12, cursor: 'pointer'
                      }}
                    >
                      Existing Client
                    </button>
                    <button
                      type="button"
                      onClick={() => { setClientMode('new'); setSelectedClient(null); }}
                      style={{
                        padding: '5px 12px', borderRadius: 6, border: 'none',
                        background: clientMode === 'new' ? '#ffffff' : 'transparent',
                        color: clientMode === 'new' ? '#0f172a' : '#64748b',
                        fontWeight: 600, fontSize: 12, cursor: 'pointer'
                      }}
                    >
                      + Quick Register Client
                    </button>
                  </div>
                </div>

                {clientMode === 'existing' ? (
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>Select Registered Client Company <span>*</span></label>
                    <div style={{ position: 'relative', marginBottom: 14 }}>
                      <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search company by name or email..."
                        value={clientSearchQuery}
                        onChange={e => setClientSearchQuery(e.target.value)}
                        style={{ paddingLeft: 36 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, maxHeight: 180, overflowY: 'auto', padding: 2, marginBottom: 16 }}>
                      {filteredClients.map(c => {
                        const isSelected = selectedClient?._id === c._id;
                        return (
                          <div
                            key={c._id}
                            onClick={() => {
                              setSelectedClient(c);
                              setCertNumber(generateHfaId(c.company_name || c.full_name));
                            }}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 10,
                              border: isSelected ? '2px solid #16a34a' : '1px solid #e2e8f0',
                              background: isSelected ? '#f0fdf4' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.company_name || c.full_name}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.email} • {c.country || 'UK'}
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />}
                          </div>
                        );
                      })}
                    </div>

                    {selectedClient && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginTop: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Selected Company</span>
                            <strong style={{ fontSize: 13, color: '#0f172a' }}>{selectedClient.company_name || selectedClient.full_name}</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Contact Email</span>
                            <span style={{ fontSize: 13, color: '#0f172a' }}>{selectedClient.email}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Business Address</span>
                            <span style={{ fontSize: 12, color: '#475569' }}>{selectedClient.address || '—'}, {selectedClient.postcode || ''}</span>
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: 11, margin: 0 }}>Registered Site (Optional)</label>
                            <select
                              className="form-control"
                              style={{ padding: '4px 8px', fontSize: 12, marginTop: 2 }}
                              value={selectedSiteId}
                              onChange={e => setSelectedSiteId(e.target.value)}
                            >
                              <option value="">Use Company Main Address</option>
                              {clientSites.map(s => (
                                <option key={s._id} value={s._id}>{s.name} ({s.address_1})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-grid" style={{ rowGap: 12 }}>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Company Name <span>*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Al-Barakah Foods Ltd"
                        value={newClient.company_name}
                        onChange={e => {
                          const val = e.target.value;
                          setNewClient(prev => ({ ...prev, company_name: val }));
                          if (val.trim().length >= 2) {
                            setCertNumber(generateHfaId(val));
                          }
                        }}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Primary Contact Person</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Tariq Mansoor"
                        value={newClient.full_name}
                        onChange={e => setNewClient({ ...newClient, full_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Client Email <span>*</span></label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="e.g. qa@albarakahfoods.co.uk"
                        value={newClient.email}
                        onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. +44 7123 456789"
                        value={newClient.phone}
                        onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newClient.country}
                        onChange={e => setNewClient({ ...newClient, country: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Business / Facility Address</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Unit 4, Greenfield Industrial Estate, Birmingham"
                        value={newClient.address}
                        onChange={e => setNewClient({ ...newClient, address: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 2: Certificate Configuration */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>2. Certificate Specification</h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Certificate number, type, scope of certification, and validity duration</p>
                  </div>
                </div>

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
                          const compName = clientMode === 'existing'
                            ? (selectedClient?.company_name || selectedClient?.full_name || 'UK')
                            : (newClient.company_name || 'UK');
                          setCertNumber(generateHfaId(compName));
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
                    <label className="form-label">Certificate Standard / Type <span>*</span></label>
                    <select
                      className="form-control"
                      value={certType}
                      onChange={e => {
                        setCertType(e.target.value);
                        if (e.target.value.includes('UAE/GSO')) {
                          applyValidityPreset(3);
                        }
                      }}
                      required
                    >
                      {CERTIFICATE_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Scope of Certification */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0 }}>Scope of Certification <span>*</span></label>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Select a preset or customize</span>
                    </div>
                    
                    {/* Preset Pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {SCOPE_PRESETS.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setScope(p)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 20,
                            border: scope === p ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                            background: scope === p ? '#f0fdf4' : '#ffffff',
                            color: scope === p ? '#15803d' : '#475569',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {p.length > 40 ? p.slice(0, 40) + '...' : p}
                        </button>
                      ))}
                    </div>

                    <textarea
                      className="form-control"
                      rows={2}
                      value={scope}
                      onChange={e => setScope(e.target.value)}
                      placeholder="Describe the activities, standards, and scope covered by this certificate..."
                      required
                    />
                  </div>

                  {/* Issue Date & Expiry Date */}
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

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Expiry Date <span>*</span></label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0 4px', fontSize: 10.5, color: '#2563eb' }}
                          onClick={() => applyValidityPreset(1)}
                        >
                          +1 Year
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0 4px', fontSize: 10.5, color: '#2563eb' }}
                          onClick={() => applyValidityPreset(3)}
                        >
                          +3 Years
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
                </div>
              </div>

              {/* CARD 3: Multi-Product Certification Builder */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>3. Certified Products Builder</h3>
                        <span style={{ background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 800, padding: '1px 8px', borderRadius: 10 }}>
                          {products.length} {products.length === 1 ? 'Product' : 'Products'}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Add and certify products directly covered under this certificate</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleLoadSampleProducts}
                      style={{ fontSize: 12 }}
                    >
                      <Sparkles size={13} style={{ marginRight: 4 }} /> Sample Items
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowBulkModal(true)}
                      style={{ fontSize: 12 }}
                    >
                      <Upload size={13} style={{ marginRight: 4 }} /> Bulk Paste
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={addProductRow}
                      style={{ fontSize: 12 }}
                    >
                      <Plus size={13} style={{ marginRight: 4 }} /> Add Product Row
                    </button>
                  </div>
                </div>

                {/* Products Table */}
                <div className="table-wrap" style={{ border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ width: 40, padding: '10px 8px', textAlign: 'center' }}>#</th>
                        <th style={{ width: '30%', padding: '10px 8px' }}>Product Name <span>*</span></th>
                        <th style={{ width: '18%', padding: '10px 8px' }}>Code / SKU</th>
                        <th style={{ width: '22%', padding: '10px 8px' }}>Category</th>
                        <th style={{ width: '18%', padding: '10px 8px' }}>Type / State</th>
                        <th style={{ width: 60, padding: '10px 8px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((prod, index) => (
                        <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>{index + 1}</td>
                          <td style={{ padding: '8px 6px' }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: '6px 10px', fontSize: 12.5 }}
                              placeholder="e.g. Frozen Halal Beef Burger"
                              value={prod.name}
                              onChange={e => updateProductRow(prod.id, 'name', e.target.value)}
                              required
                            />
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: '6px 10px', fontSize: 12.5 }}
                              placeholder="e.g. PRD-001"
                              value={prod.code}
                              onChange={e => updateProductRow(prod.id, 'code', e.target.value)}
                            />
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <select
                              className="form-control"
                              style={{ padding: '6px 10px', fontSize: 12.5 }}
                              value={prod.category}
                              onChange={e => updateProductRow(prod.id, 'category', e.target.value)}
                            >
                              {PRODUCT_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <select
                              className="form-control"
                              style={{ padding: '6px 10px', fontSize: 12.5 }}
                              value={prod.product_type}
                              onChange={e => updateProductRow(prod.id, 'product_type', e.target.value)}
                            >
                              <option value="Processed">Processed</option>
                              <option value="Raw">Raw</option>
                              <option value="Frozen">Frozen</option>
                              <option value="Chilled">Chilled</option>
                              <option value="Ambient">Ambient</option>
                              <option value="Ingredient">Ingredient</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                title="Duplicate Row"
                                style={{ padding: 4, color: '#64748b' }}
                                onClick={() => duplicateProductRow(prod)}
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                title="Delete Row"
                                style={{ padding: 4, color: '#ef4444' }}
                                onClick={() => removeProductRow(prod.id)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    💡 All products entered above will be registered into the database with <strong>Active Status</strong> and linked to this certificate.
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={addProductRow}
                    style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}
                  >
                    + Add Another Product
                  </button>
                </div>
              </div>

              {/* CARD 4: PDF & Distribution Options */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileCheck2 size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>4. PDF Generation & Dispatch Options</h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Certificate rendering and automated client communications</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                  <div
                    onClick={() => setPdfOption('auto')}
                    style={{
                      border: pdfOption === 'auto' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: pdfOption === 'auto' ? '#f0fdf4' : '#ffffff',
                      borderRadius: 12,
                      padding: 16,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12
                    }}
                  >
                    <div style={{ marginTop: 2 }}>
                      <input
                        type="radio"
                        name="pdf_option"
                        checked={pdfOption === 'auto'}
                        onChange={() => setPdfOption('auto')}
                        style={{ accentColor: '#16a34a' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>Auto-Generate Official PDF</div>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
                        Generates high-resolution vector PDF certificate with official HFA branding, dynamic QR code verification, and product schedule.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setPdfOption('upload')}
                    style={{
                      border: pdfOption === 'upload' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: pdfOption === 'upload' ? '#f0fdf4' : '#ffffff',
                      borderRadius: 12,
                      padding: 16,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12
                    }}
                  >
                    <div style={{ marginTop: 2 }}>
                      <input
                        type="radio"
                        name="pdf_option"
                        checked={pdfOption === 'upload'}
                        onChange={() => setPdfOption('upload')}
                        style={{ accentColor: '#16a34a' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>Upload Custom PDF</div>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
                        Attach a pre-signed or scanned external PDF certificate file.
                      </p>
                    </div>
                  </div>
                </div>

                {pdfOption === 'upload' && (
                  <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16, background: '#f8fafc' }}>
                    <FileText size={32} style={{ color: uploadedPdfFile ? '#16a34a' : '#94a3b8', margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>
                      {uploadedPdfFile ? uploadedPdfFile.name : 'Select or drag & drop certificate PDF'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>PDF documents only (max 15MB)</div>
                    <input
                      type="file"
                      accept=".pdf"
                      id="custom-pdf-input"
                      style={{ display: 'none' }}
                      onChange={e => setUploadedPdfFile(e.target.files[0])}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ marginTop: 10 }}
                      onClick={() => document.getElementById('custom-pdf-input').click()}
                    >
                      Browse File
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#1e293b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={sendEmailNotification}
                      onChange={e => setSendEmailNotification(e.target.checked)}
                      style={{ accentColor: '#16a34a', width: 16, height: 16 }}
                    />
                    <span><strong>Email Notification:</strong> Send official certificate ready email with download link to client</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#1e293b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={sendInAppNotification}
                      onChange={e => setSendInAppNotification(e.target.checked)}
                      style={{ accentColor: '#16a34a', width: 16, height: 16 }}
                    />
                    <span><strong>In-Portal Notification:</strong> Create system notification banner in client dashboard</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Live Certificate Summary Card & Action Bar */}
            <div style={{ position: 'sticky', top: 20 }}>
              <div className="card" style={{ padding: 20, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Live Certificate Summary
                  </span>
                  <span className="badge badge-green">DIRECT ISSUANCE</span>
                </div>

                {/* Summary Box */}
                <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, marginBottom: 18 }}>
                  <div style={{ textAlign: 'center', paddingBottom: 12, borderBottom: '1px solid #e2e8f0', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Certificate Number</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d', letterSpacing: 0.5 }}>{certNumber}</div>
                    <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600, marginTop: 2 }}>{certType}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Client Company:</span>
                      <strong style={{ color: '#0f172a', maxWidth: 170, textAlign: 'right', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {clientMode === 'existing' ? (selectedClient?.company_name || 'Select Client') : (newClient.company_name || 'New Client')}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Products Covered:</span>
                      <strong style={{ color: '#16a34a' }}>{products.filter(p => p.name).length} Product(s)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Issue Date:</span>
                      <span>{issueDate ? new Date(issueDate).toLocaleDateString('en-GB') : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Expiry Date:</span>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>{expiryDate ? new Date(expiryDate).toLocaleDateString('en-GB') : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>PDF Mode:</span>
                      <span>{pdfOption === 'auto' ? '⚡ Auto-Generated' : '📎 Custom Upload'}</span>
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
              <button className="modal-close" onClick={() => setShowBulkModal(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                Paste product names one per line. You can optionally include SKU and Category separated by a pipe (<code>|</code>) or comma:
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
              <button className="modal-close" onClick={() => setInspectCert(null)}><X size={16}/></button>
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
    </div>
  );
}
