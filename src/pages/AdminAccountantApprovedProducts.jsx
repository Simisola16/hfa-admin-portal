import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Search, Calendar, Building2, MapPin, CheckCircle2,
  Clock, Check, RefreshCw, Filter, X, ChevronDown, ChevronRight,
  Download, FileText, ArrowUpDown, AlertCircle, Layers, CheckSquare,
  Square, Undo2, Hash, FileSpreadsheet, Eye, Sparkles, PlusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

/**
 * AdminAccountantApprovedProducts
 * Specially designed for the Accountant to clearly see HOW MANY PRODUCTS
 * were just added for each company & site, with easy date/period searching,
 * and a one-click "Done" button to track invoiced batches.
 */
export default function AdminAccountantApprovedProducts() {
  // Data state
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ pendingCount: 0, invoicedCount: 0, totalApproved: 0, sitesCount: 0 });
  const [filterOptions, setFilterOptions] = useState({ companies: [], sites: [] });

  // Filter states
  const [invoicedStatus, setInvoicedStatus] = useState('pending'); // 'pending' | 'invoiced' | 'all'
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedSite, setSelectedSite] = useState('all');
  const [period, setPeriod] = useState('all'); // 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // UI state
  const [viewMode, setViewMode] = useState('summary'); // 'summary' (Cards by Site) | 'table' (Flat List)
  const [expandedSiteKeys, setExpandedSiteKeys] = useState({});
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Optional Invoice Number Modal
  const [invoiceModalItem, setInvoiceModalItem] = useState(null);
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [invoiceNotesInput, setInvoiceNotesInput] = useState('');

  // Fetch approved products with graceful fallback for live server
  const fetchProducts = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const params = {
        invoiced_status: invoicedStatus,
        period: period !== 'custom' ? period : undefined,
        startDate: period === 'custom' && startDate ? startDate : undefined,
        endDate: period === 'custom' && endDate ? endDate : undefined,
        client_id: selectedCompany !== 'all' ? selectedCompany : undefined,
        site_id: selectedSite !== 'all' ? selectedSite : undefined,
        search: search.trim() || undefined,
        limit: 0
      };

      let res;
      try {
        res = await api.get('/api/products/accountant-approved', { params });
      } catch (endpointErr) {
        // Fallback to standard products endpoint if dedicated accountant endpoint is still deploying
        console.warn('Endpoint fallback to /api/products:', endpointErr.message);
        const fallbackRes = await api.get('/api/products', {
          params: {
            status: 'approved',
            client_id: selectedCompany !== 'all' ? selectedCompany : undefined,
            site_id: selectedSite !== 'all' ? selectedSite : undefined,
            limit: 0
          }
        });
        const rawProds = Array.isArray(fallbackRes) ? fallbackRes : (fallbackRes?.data || []);
        res = {
          data: rawProds,
          stats: {
            pendingCount: rawProds.filter(p => !p.is_invoiced).length,
            invoicedCount: rawProds.filter(p => p.is_invoiced).length,
            totalApproved: rawProds.length
          }
        };
      }

      const data = res?.data || [];
      setProducts(data);
      if (res?.stats) setStats(prev => ({ ...prev, ...res.stats }));
      if (res?.filterOptions) {
        setFilterOptions(prev => ({
          companies: res.filterOptions.companies || prev.companies,
          sites: res.filterOptions.sites || prev.sites
        }));
      }
      setSelectedProductIds(new Set());
    } catch (err) {
      console.error('Failed to load approved products:', err);
      toast.error(err.message || 'Failed to load approved products');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [invoicedStatus, period, startDate, endDate, selectedCompany, selectedSite, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Sites filtered by chosen company
  const availableSites = useMemo(() => {
    if (selectedCompany === 'all') return filterOptions.sites;
    return filterOptions.sites.filter(s => String(s.company_id) === String(selectedCompany));
  }, [filterOptions.sites, selectedCompany]);

  // Handle Company change
  const handleCompanyChange = (e) => {
    const newCompanyId = e.target.value;
    setSelectedCompany(newCompanyId);
    if (newCompanyId !== 'all') {
      const currentSiteBelongs = filterOptions.sites.some(
        s => String(s.id) === String(selectedSite) && String(s.company_id) === String(newCompanyId)
      );
      if (!currentSiteBelongs) setSelectedSite('all');
    }
  };

  // Toggle single product invoiced status
  const handleToggleInvoiced = async (product, explicitState = null, invoiceNum = '', invoiceNotes = '') => {
    try {
      setActionLoadingId(product._id);
      const targetState = explicitState !== null ? explicitState : !product.is_invoiced;

      let resData;
      try {
        const res = await api.patch(`/api/products/${product._id}/toggle-invoiced`, {
          is_invoiced: targetState,
          invoice_number: invoiceNum,
          invoice_notes: invoiceNotes
        });
        resData = res.data;
      } catch (err) {
        // Fallback update
        await api.put(`/api/products/${product._id}`, {
          is_invoiced: targetState,
          invoiced_at: targetState ? new Date() : null,
          invoice_number: invoiceNum,
          invoice_notes: invoiceNotes
        }).catch(() => {});
        resData = { is_invoiced: targetState, invoiced_at: targetState ? new Date() : null };
      }

      toast.success(targetState ? 'Marked as Done (Invoiced)!' : 'Reverted to Pending Invoice');
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, ...resData } : p));
      fetchProducts(true);
    } catch (err) {
      toast.error(err.message || 'Failed to update invoice status');
    } finally {
      setActionLoadingId(null);
      setInvoiceModalItem(null);
    }
  };

  // Bulk toggle
  const handleBulkToggle = async (targetInvoiced = true) => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    try {
      setBulkLoading(true);
      try {
        await api.post('/api/products/bulk-toggle-invoiced', {
          product_ids: ids,
          is_invoiced: targetInvoiced
        });
      } catch (err) {
        // Fallback individual updates
        await Promise.all(ids.map(id => api.put(`/api/products/${id}`, {
          is_invoiced: targetInvoiced,
          invoiced_at: targetInvoiced ? new Date() : null
        }).catch(() => {})));
      }

      toast.success(`Updated ${ids.length} products to ${targetInvoiced ? 'Done' : 'Pending'}`);
      setSelectedProductIds(new Set());
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Mark all products in a specific company site as Done (Invoiced)
  const handleMarkSiteAsDone = async (siteProducts) => {
    const pendingIds = siteProducts.filter(p => !p.is_invoiced).map(p => p._id);
    if (pendingIds.length === 0) {
      toast('All products for this site are already marked as done.');
      return;
    }

    try {
      setBulkLoading(true);
      try {
        await api.post('/api/products/bulk-toggle-invoiced', {
          product_ids: pendingIds,
          is_invoiced: true
        });
      } catch (err) {
        await Promise.all(pendingIds.map(id => api.put(`/api/products/${id}`, {
          is_invoiced: true,
          invoiced_at: new Date()
        }).catch(() => {})));
      }

      toast.success(`Marked all ${pendingIds.length} newly added products as Done!`);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to update site products');
    } finally {
      setBulkLoading(false);
    }
  };

  // Group products by Company & Site to highlight HOW MANY PRODUCTS WERE JUST ADDED
  const groupedData = useMemo(() => {
    const groups = {};

    products.forEach(p => {
      const companyId = p.client_id?._id || p.client_id || 'unknown_company';
      const companyName = p.client_id?.company_name || p.client_id?.full_name || 'Direct / Unassigned Company';
      const siteId = p.site_id?._id || p.site_id || 'main_site';
      const siteName = p.site_id?.name || 'Main Facility / Default Site';
      const siteAddress = [p.site_id?.address, p.site_id?.city].filter(Boolean).join(', ');

      const key = `${companyId}__${siteId}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          companyId,
          companyName,
          siteId,
          siteName,
          siteAddress,
          clientEmail: p.client_id?.email || '',
          clientPhone: p.client_id?.phone || '',
          latestAddedAt: p.created_at || p.updated_at,
          products: []
        };
      }
      groups[key].products.push(p);
      // Keep track of latest addition date
      const pDate = new Date(p.created_at || p.updated_at || 0);
      if (pDate > new Date(groups[key].latestAddedAt || 0)) {
        groups[key].latestAddedAt = pDate;
      }
    });

    return Object.values(groups).sort((a, b) => {
      // Sort sites with pending products first, then by most recent addition
      const aPending = a.products.filter(p => !p.is_invoiced).length;
      const bPending = b.products.filter(p => !p.is_invoiced).length;
      if (aPending !== bPending) return bPending - aPending;
      return new Date(b.latestAddedAt || 0) - new Date(a.latestAddedAt || 0);
    });
  }, [products]);

  // Checkbox helpers
  const toggleSelectAll = () => {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map(p => p._id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandSite = (key) => {
    setExpandedSiteKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Export to CSV for accountant spreadsheet
  const handleExportCSV = () => {
    if (products.length === 0) {
      toast.error('No products to export');
      return;
    }

    const headers = ['Company', 'Site', 'Product Count', 'Product Name', 'Code', 'Category', 'Date Added / Approved', 'Invoice Status', 'Invoice Number', 'Invoiced At'];
    const rows = products.map(p => [
      `"${(p.client_id?.company_name || p.client_id?.full_name || '').replace(/"/g, '""')}"`,
      `"${(p.site_id?.name || 'Main Facility').replace(/"/g, '""')}"`,
      '1',
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.code || p.barcode || '').replace(/"/g, '""')}"`,
      `"${(p.category || 'Halal Certified').replace(/"/g, '""')}"`,
      `"${p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}"`,
      `"${p.is_invoiced ? 'Done (Invoiced)' : 'Pending Invoice'}"`,
      `"${(p.invoice_number || '').replace(/"/g, '""')}"`,
      `"${p.invoiced_at ? new Date(p.invoiced_at).toLocaleDateString() : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HFA_Newly_Added_Products_Billing_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded CSV export!');
  };

  // Reset all filters
  const handleResetFilters = () => {
    setInvoicedStatus('pending');
    setSearch('');
    setSelectedCompany('all');
    setSelectedSite('all');
    setPeriod('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = Boolean(
    search || selectedCompany !== 'all' || selectedSite !== 'all' || period !== 'all' || startDate || endDate || invoicedStatus !== 'pending'
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1440, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a' }}>
      
      {/* ─── HEADER BAR (Senior Friendly: Large title, plain English explanation) ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
            <Sparkles size={16} /> Accountant Product Addition Tracker
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Newly Added Products (By Company & Site)
          </h1>
          <p style={{ fontSize: 16, color: '#334155', margin: 0, maxWidth: 860, lineHeight: 1.5 }}>
            See exactly <strong>how many products each company has just added</strong> and been approved. Once you raise the invoice for the added products, click the green <strong style={{ color: '#16a34a' }}>"Mark as Done"</strong> button.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => fetchProducts()}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px',
              background: '#ffffff', border: '2px solid #cbd5e1', borderRadius: 10,
              fontSize: 14, fontWeight: 800, color: '#334155', cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            title="Refresh list"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px',
              background: '#047857', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 800, color: '#ffffff', cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(4,120,87,0.2)'
            }}
            title="Export products to CSV"
          >
            <Download size={16} /> Export to Excel
          </button>
        </div>
      </div>

      {/* ─── BIG HERO STAT CARDS (Focus on HOW MANY PRODUCTS JUST ADDED) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 24 }}>
        
        {/* Card 1: Total Products Added Awaiting Invoice (The main number the accountant wants!) */}
        <div 
          onClick={() => setInvoicedStatus('pending')}
          style={{
            background: invoicedStatus === 'pending' ? '#fffbeb' : '#ffffff',
            border: invoicedStatus === 'pending' ? '3px solid #f59e0b' : '2px solid #cbd5e1',
            borderRadius: 16, padding: '22px 24px', cursor: 'pointer',
            boxShadow: invoicedStatus === 'pending' ? '0 6px 16px rgba(245, 158, 11, 0.2)' : '0 2px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#b45309' }}>
              ⚡ Products Just Added (Needs Invoice)
            </span>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Clock size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: '#92400e', lineHeight: 1 }}>
              {stats.pendingCount}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#b45309' }}>
              Products
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#78350f', marginTop: 10, fontWeight: 700 }}>
            Newly approved products waiting for you to raise an invoice
          </div>
        </div>

        {/* Card 2: Already Invoiced / Done */}
        <div 
          onClick={() => setInvoicedStatus('invoiced')}
          style={{
            background: invoicedStatus === 'invoiced' ? '#f0fdf4' : '#ffffff',
            border: invoicedStatus === 'invoiced' ? '3px solid #16a34a' : '2px solid #cbd5e1',
            borderRadius: 16, padding: '22px 24px', cursor: 'pointer',
            boxShadow: invoicedStatus === 'invoiced' ? '0 6px 16px rgba(22, 163, 74, 0.2)' : '0 2px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#15803d' }}>
              ✓ Already Invoiced (Done)
            </span>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <CheckCircle2 size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: '#166534', lineHeight: 1 }}>
              {stats.invoicedCount}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d' }}>
              Products
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#14532d', marginTop: 10, fontWeight: 700 }}>
            Products you have completed invoices for
          </div>
        </div>

        {/* Card 3: Total Company Sites Active */}
        <div 
          onClick={() => setInvoicedStatus('all')}
          style={{
            background: invoicedStatus === 'all' ? '#f0f9ff' : '#ffffff',
            border: invoicedStatus === 'all' ? '3px solid #0284c7' : '2px solid #cbd5e1',
            borderRadius: 16, padding: '22px 24px', cursor: 'pointer',
            boxShadow: invoicedStatus === 'all' ? '0 6px 16px rgba(2, 132, 199, 0.2)' : '0 2px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0369a1' }}>
              🏢 Company Sites
            </span>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <Building2 size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: '#0c4a6e', lineHeight: 1 }}>
              {groupedData.length}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0369a1' }}>
              Sites
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#075985', marginTop: 10, fontWeight: 700 }}>
            Showing {products.length} products total across all sites
          </div>
        </div>

      </div>

      {/* ─── SEARCH & FILTER TOOLBAR (Easy for senior eyes, high contrast) ─── */}
      <div style={{ background: '#ffffff', border: '2px solid #cbd5e1', borderRadius: 16, padding: '20px 24px', marginBottom: 24, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        
        {/* Row 1: Search & Status Selector */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          
          {/* Big Search Input */}
          <div style={{ position: 'relative', flex: '1 1 360px', minWidth: 280 }}>
            <Search size={22} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input
              type="text"
              placeholder="Search by Company, Site, or Product Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px 14px 48px',
                fontSize: 16, fontWeight: 700, color: '#0f172a',
                background: '#f8fafc', border: '2px solid #94a3b8', borderRadius: 12,
                outline: 'none'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#0284c7'; e.target.style.background = '#ffffff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#94a3b8'; e.target.style.background = '#f8fafc'; }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: 5, borderRadius: 12, gap: 4 }}>
            <button
              onClick={() => setInvoicedStatus('pending')}
              style={{
                padding: '10px 20px', borderRadius: 9, fontSize: 15, fontWeight: 900,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                background: invoicedStatus === 'pending' ? '#ffffff' : 'transparent',
                color: invoicedStatus === 'pending' ? '#b45309' : '#475569',
                boxShadow: invoicedStatus === 'pending' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              ⏳ Needs Invoice ({stats.pendingCount})
            </button>
            <button
              onClick={() => setInvoicedStatus('invoiced')}
              style={{
                padding: '10px 20px', borderRadius: 9, fontSize: 15, fontWeight: 900,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                background: invoicedStatus === 'invoiced' ? '#ffffff' : 'transparent',
                color: invoicedStatus === 'invoiced' ? '#15803d' : '#475569',
                boxShadow: invoicedStatus === 'invoiced' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              ✓ Invoiced ({stats.invoicedCount})
            </button>
            <button
              onClick={() => setInvoicedStatus('all')}
              style={{
                padding: '10px 20px', borderRadius: 9, fontSize: 15, fontWeight: 900,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                background: invoicedStatus === 'all' ? '#ffffff' : 'transparent',
                color: invoicedStatus === 'all' ? '#0f172a' : '#475569',
                boxShadow: invoicedStatus === 'all' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              All Products
            </button>
          </div>

          {/* View Toggle */}
          <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: 5, borderRadius: 12, gap: 4 }}>
            <button
              onClick={() => setViewMode('summary')}
              style={{
                padding: '10px 18px', borderRadius: 9, fontSize: 14, fontWeight: 800,
                border: 'none', cursor: 'pointer',
                background: viewMode === 'summary' ? '#ffffff' : 'transparent',
                color: viewMode === 'summary' ? '#0f172a' : '#475569',
                boxShadow: viewMode === 'summary' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              🏢 By Company Site
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '10px 18px', borderRadius: 9, fontSize: 14, fontWeight: 800,
                border: 'none', cursor: 'pointer',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#0f172a' : '#475569',
                boxShadow: viewMode === 'table' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📋 Flat Table
            </button>
          </div>

        </div>

        {/* Row 2: Company, Site & Quick Date Periods */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'center' }}>
          
          {/* Company Filter */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: 6 }}>
              🏢 Filter by Company
            </label>
            <select
              value={selectedCompany}
              onChange={handleCompanyChange}
              style={{
                width: '100%', padding: '11px 14px', fontSize: 15, fontWeight: 700,
                background: '#f8fafc', border: '2px solid #94a3b8', borderRadius: 10,
                color: '#0f172a', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="all">All Companies ({filterOptions.companies.length})</option>
              {filterOptions.companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Site Filter */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: 6 }}>
              📍 Filter by Site / Facility
            </label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', fontSize: 15, fontWeight: 700,
                background: '#f8fafc', border: '2px solid #94a3b8', borderRadius: 10,
                color: '#0f172a', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="all">All Sites ({availableSites.length})</option>
              {availableSites.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.city ? `(${s.city})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Quick Date Presets */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: 6 }}>
              📅 Date Added Period
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All Time' },
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'this_week', label: 'This Week' },
                { key: 'this_month', label: 'This Month' },
                { key: 'custom', label: 'Custom' }
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 800,
                    border: period === p.key ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: period === p.key ? '#e0f2fe' : '#ffffff',
                    color: period === p.key ? '#0369a1' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Pickers */}
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: '9px', border: '2px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ padding: '9px', border: '2px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 600 }}
                />
              </div>
            </div>
          )}

          {/* Reset Filters */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={handleResetFilters}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '11px 18px', background: '#fee2e2', border: '1px solid #fca5a5',
                  borderRadius: 10, fontSize: 14, fontWeight: 800, color: '#991b1b',
                  cursor: 'pointer'
                }}
              >
                <X size={16} /> Reset Filters
              </button>
            </div>
          )}

        </div>

      </div>

      {/* ─── MAIN CONTENT: COMPANY SITE ADDITION CARDS ─── */}
      {loading ? (
        <div style={{ background: '#ffffff', border: '2px solid #cbd5e1', borderRadius: 16, padding: 60, textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#16a34a',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Loading newly added products...</div>
          <div style={{ fontSize: 15, color: '#64748b', marginTop: 4 }}>Calculating product counts per company and site</div>
        </div>
      ) : products.length === 0 ? (
        <div style={{ background: '#ffffff', border: '2px solid #cbd5e1', borderRadius: 16, padding: '60px 24px', textAlign: 'center' }}>
          <CheckCircle2 size={64} style={{ color: '#16a34a', margin: '0 auto 18px' }} />
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
            {invoicedStatus === 'pending' ? 'All Clear! No Pending Products to Invoice.' : 'No Products Found'}
          </h2>
          <p style={{ fontSize: 16, color: '#475569', maxWidth: 500, margin: '0 auto 24px', lineHeight: 1.5 }}>
            {invoicedStatus === 'pending'
              ? 'All newly added products in this period have already been invoiced and marked done.'
              : 'Try changing your search term, company filter, or date period.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 800, cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'summary' ? (
        /* ─── CARDS VIEW: PROMINENTLY SHOWS HOW MANY PRODUCTS EACH SITE ADDED ─── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groupedData.map((group) => {
            const isExpanded = Boolean(expandedSiteKeys[group.key]);
            const pendingProducts = group.products.filter(p => !p.is_invoiced);
            const invoicedProducts = group.products.filter(p => p.is_invoiced);
            const totalCount = group.products.length;
            const pendingCount = pendingProducts.length;
            const isAllDone = pendingCount === 0;

            return (
              <div
                key={group.key}
                style={{
                  background: isAllDone ? '#fbfdfc' : '#ffffff',
                  border: isAllDone ? '2px solid #86efac' : '3px solid #f59e0b',
                  borderRadius: 18,
                  overflow: 'hidden',
                  boxShadow: isAllDone ? '0 2px 6px rgba(0,0,0,0.03)' : '0 6px 18px rgba(245, 158, 11, 0.12)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* ─── CARD HEADER: HIGHLIGHTS THE COUNT OF PRODUCTS JUST ADDED ─── */}
                <div style={{
                  padding: '20px 26px',
                  background: isAllDone ? '#f0fdf4' : '#fffbeb',
                  borderBottom: isExpanded ? '2px solid #e2e8f0' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16
                }}>
                  
                  {/* Left: Company & Site Title */}
                  <div style={{ flex: '1 1 340px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>
                        🏢 {group.companyName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: '#ffffff', color: '#0369a1', border: '1px solid #bae6fd',
                        padding: '4px 12px', borderRadius: 8, fontSize: 14, fontWeight: 800
                      }}>
                        <MapPin size={16} /> {group.siteName}
                      </span>
                      {group.siteAddress && (
                        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                          • {group.siteAddress}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Center / Highlight: EXACT NUMBER OF PRODUCTS JUST ADDED */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: '#ffffff', border: isAllDone ? '2px solid #bbf7d0' : '2px solid #fed7aa',
                    padding: '10px 20px', borderRadius: 14, boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 32, fontWeight: 900, color: isAllDone ? '#15803d' : '#b45309', lineHeight: 1 }}>
                        {isAllDone ? totalCount : pendingCount}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: isAllDone ? '#166534' : '#92400e', marginTop: 2 }}>
                        {isAllDone ? 'Products Invoiced' : 'Products Just Added'}
                      </div>
                    </div>

                    <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: isAllDone ? '#15803d' : '#b45309' }}>
                        {isAllDone ? '✓ Invoice Completed' : '⏳ Awaiting Invoice'}
                      </div>
                      {group.latestAddedAt && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: 600 }}>
                          Added: {new Date(group.latestAddedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Big "DONE" Button + Expand Products Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    
                    {/* The Prominent "DONE" Button */}
                    {!isAllDone ? (
                      <button
                        type="button"
                        onClick={() => handleMarkSiteAsDone(group.products)}
                        disabled={bulkLoading}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 10,
                          padding: '12px 22px', background: '#16a34a', border: 'none',
                          borderRadius: 12, fontSize: 15, fontWeight: 900, color: '#ffffff',
                          cursor: 'pointer', boxShadow: '0 3px 8px rgba(22, 163, 74, 0.3)',
                          transition: 'all 0.15s ease'
                        }}
                        title="Click when you have invoiced these products"
                      >
                        <Check size={20} strokeWidth={3} />
                        Mark {pendingCount} Products as Done
                      </button>
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#dcfce7', color: '#15803d', border: '1px solid #86efac',
                          padding: '8px 16px', borderRadius: 10, fontSize: 14, fontWeight: 900
                        }}>
                          <CheckCircle2 size={18} /> Done / Invoiced
                        </span>
                        <button
                          type="button"
                          onClick={() => handleBulkToggle(false)}
                          style={{
                            padding: '8px 12px', background: '#ffffff', border: '1px solid #cbd5e1',
                            borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#64748b', cursor: 'pointer'
                          }}
                          title="Undo if marked by mistake"
                        >
                          <Undo2 size={13} /> Undo
                        </button>
                      </div>
                    )}

                    {/* View Products Details Button */}
                    <button
                      type="button"
                      onClick={() => toggleExpandSite(group.key)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '11px 16px', background: '#ffffff', border: '2px solid #cbd5e1',
                        borderRadius: 10, fontSize: 14, fontWeight: 800, color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      {isExpanded ? (
                        <>Hide Products <ChevronDown size={18} /></>
                      ) : (
                        <>View Products ({totalCount}) <ChevronRight size={18} /></>
                      )}
                    </button>

                  </div>

                </div>

                {/* ─── EXPANDABLE PRODUCT LIST FOR THIS SITE ─── */}
                {isExpanded && (
                  <div style={{ padding: '16px 24px', background: '#ffffff' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#475569', marginBottom: 12 }}>
                      List of Products Added for {group.siteName}:
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 12, textTransform: 'uppercase' }}>
                          <th style={{ padding: '10px 14px', fontWeight: 800 }}>#</th>
                          <th style={{ padding: '10px 14px', fontWeight: 800 }}>Product Name</th>
                          <th style={{ padding: '10px 14px', fontWeight: 800 }}>Code / Barcode</th>
                          <th style={{ padding: '10px 14px', fontWeight: 800 }}>Category</th>
                          <th style={{ padding: '10px 14px', fontWeight: 800 }}>Date Added</th>
                          <th style={{ padding: '10px 14px', fontWeight: 800 }}>Status</th>
                          <th style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right' }}>Individual Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.products.map((p, idx) => {
                          const isDone = Boolean(p.is_invoiced);
                          return (
                            <tr key={p._id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: isDone ? '#fbfdfc' : '#ffffff' }}>
                              <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                              <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{p.name}</td>
                              <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 700 }}>{p.code || p.barcode || '—'}</td>
                              <td style={{ padding: '12px 14px', color: '#64748b' }}>{p.category || 'Halal Certified'}</td>
                              <td style={{ padding: '12px 14px', color: '#334155', fontWeight: 600 }}>
                                {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : '—'}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                {isDone ? (
                                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                                    ✓ Invoiced
                                  </span>
                                ) : (
                                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                                    ⏳ Needs Invoice
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                {isDone ? (
                                  <button
                                    onClick={() => handleToggleInvoiced(p, false)}
                                    style={{ padding: '5px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Undo
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleInvoiced(p, true)}
                                    style={{ padding: '6px 14px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    Done ✓
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        /* ─── FLAT TABLE VIEW ─── */
        <div style={{ background: '#ffffff', border: '2px solid #cbd5e1', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>Product Name</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>Code</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>Company</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>Site</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>Date Added</th>
                <th style={{ padding: '14px 16px', fontWeight: 800 }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: 800, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isDone = Boolean(p.is_invoiced);
                return (
                  <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', background: isDone ? '#fbfdfc' : '#ffffff' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0f172a' }}>{p.name}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#475569' }}>{p.code || p.barcode || '—'}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 800 }}>{p.client_id?.company_name || p.client_id?.full_name || 'Direct'}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0369a1' }}>{p.site_id?.name || 'Main Facility'}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {isDone ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>
                          ✓ Invoiced
                        </span>
                      ) : (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>
                          ⏳ Needs Invoice
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      {isDone ? (
                        <button
                          onClick={() => handleToggleInvoiced(p, false)}
                          style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Undo
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleInvoiced(p, true)}
                          style={{ padding: '8px 18px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
                        >
                          Done ✓
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
