import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Search, Calendar, Building2, MapPin, CheckCircle2,
  Clock, Check, RefreshCw, Filter, X, ChevronDown, ChevronRight,
  Download, FileText, ArrowUpDown, AlertCircle, Layers, CheckSquare,
  Square, Undo2, Hash, FileSpreadsheet, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

/**
 * AdminAccountantApprovedProducts
 * High-visibility, easy-to-use billing screen designed specifically for the Accountant.
 * Shows newly approved products per company & site with search, date period filters,
 * and a prominent "Done" button to track invoiced items.
 */
export default function AdminAccountantApprovedProducts() {
  // Data state
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ pendingCount: 0, invoicedCount: 0, totalApproved: 0 });
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
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'list'
  const [collapsedSites, setCollapsedSites] = useState({});
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Optional Invoice Number Modal for marking with invoice #
  const [invoiceModalItem, setInvoiceModalItem] = useState(null);
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [invoiceNotesInput, setInvoiceNotesInput] = useState('');

  // Fetch approved products
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
        limit: 0 // fetch all matching for easy local grouping & sorting
      };

      const res = await api.get('/api/products/accountant-approved', { params });
      const data = res?.data || [];
      setProducts(data);
      if (res?.stats) setStats(res.stats);
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

  // Reset site if company changes and current site no longer belongs
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
      const res = await api.patch(`/api/products/${product._id}/toggle-invoiced`, {
        is_invoiced: targetState,
        invoice_number: invoiceNum,
        invoice_notes: invoiceNotes
      });

      toast.success(targetState ? 'Marked as Done (Invoiced)!' : 'Reverted to Pending Invoice');

      // Update local state smoothly
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, ...res.data } : p));
      // Re-fetch stats quietly
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
      const res = await api.post('/api/products/bulk-toggle-invoiced', {
        product_ids: ids,
        is_invoiced: targetInvoiced
      });

      toast.success(res.message || `Updated ${ids.length} products`);
      setSelectedProductIds(new Set());
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Mark all products in a specific site group as Done
  const handleMarkSiteAsDone = async (siteProducts) => {
    const pendingIds = siteProducts.filter(p => !p.is_invoiced).map(p => p._id);
    if (pendingIds.length === 0) {
      toast('All products for this site are already marked as done.');
      return;
    }

    try {
      setBulkLoading(true);
      const res = await api.post('/api/products/bulk-toggle-invoiced', {
        product_ids: pendingIds,
        is_invoiced: true
      });
      toast.success(`Marked all ${pendingIds.length} products for this site as Done!`);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to update site products');
    } finally {
      setBulkLoading(false);
    }
  };

  // Group products by Company & Site for the grouped view
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
          products: []
        };
      }
      groups[key].products.push(p);
    });

    return Object.values(groups).sort((a, b) => a.companyName.localeCompare(b.companyName));
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

  const toggleCollapseSite = (key) => {
    setCollapsedSites(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Export to CSV for accountant spreadsheet
  const handleExportCSV = () => {
    if (products.length === 0) {
      toast.error('No products to export');
      return;
    }

    const headers = ['Company', 'Site', 'Product Name', 'Product Code / Barcode', 'Category', 'Date Approved', 'Invoiced Status', 'Invoice Number', 'Invoiced At', 'Invoiced By'];
    const rows = products.map(p => [
      `"${(p.client_id?.company_name || p.client_id?.full_name || '').replace(/"/g, '""')}"`,
      `"${(p.site_id?.name || 'Main Facility').replace(/"/g, '""')}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.code || p.barcode || '').replace(/"/g, '""')}"`,
      `"${(p.category || 'Halal Certified').replace(/"/g, '""')}"`,
      `"${p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}"`,
      `"${p.is_invoiced ? 'Done (Invoiced)' : 'Pending Invoice'}"`,
      `"${(p.invoice_number || '').replace(/"/g, '""')}"`,
      `"${p.invoiced_at ? new Date(p.invoiced_at).toLocaleDateString() : ''}"`,
      `"${(p.invoiced_by_name || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HFA_Approved_Products_Billing_${new Date().toISOString().slice(0, 10)}.csv`);
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
      
      {/* ─── HEADER BAR (Senior-friendly, high contrast, clean typography) ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            <FileSpreadsheet size={16} /> Accountant Billing Portal
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Approved Products for Invoicing
          </h1>
          <p style={{ fontSize: 15, color: '#475569', margin: 0, maxWidth: 820, lineHeight: 1.5 }}>
            View newly added and approved products across all company sites. Once you have raised the invoice for a product, click the green <strong style={{ color: '#15803d' }}>"Done"</strong> button.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => fetchProducts()}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              background: '#ffffff', border: '2px solid #cbd5e1', borderRadius: 10,
              fontSize: 14, fontWeight: 700, color: '#334155', cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s ease'
            }}
            title="Refresh list"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              background: '#047857', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700, color: '#ffffff', cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(4,120,87,0.2)', transition: 'all 0.15s ease'
            }}
            title="Export products to CSV"
          >
            <Download size={16} /> Export to Excel / CSV
          </button>
        </div>
      </div>

      {/* ─── KPI SUMMARY CARDS (Big numbers, obvious colors) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        
        {/* Card 1: Pending Invoicing */}
        <div 
          onClick={() => setInvoicedStatus('pending')}
          style={{
            background: invoicedStatus === 'pending' ? '#fffbeb' : '#ffffff',
            border: invoicedStatus === 'pending' ? '3px solid #f59e0b' : '2px solid #e2e8f0',
            borderRadius: 14, padding: '18px 22px', cursor: 'pointer',
            boxShadow: invoicedStatus === 'pending' ? '0 4px 12px rgba(245, 158, 11, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease', position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#b45309' }}>
              Pending Invoicing (Action Needed)
            </span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#92400e', lineHeight: 1 }}>
            {stats.pendingCount}
          </div>
          <div style={{ fontSize: 13, color: '#78350f', marginTop: 8, fontWeight: 600 }}>
            Newly approved products waiting for invoice
          </div>
        </div>

        {/* Card 2: Invoiced (Done) */}
        <div 
          onClick={() => setInvoicedStatus('invoiced')}
          style={{
            background: invoicedStatus === 'invoiced' ? '#f0fdf4' : '#ffffff',
            border: invoicedStatus === 'invoiced' ? '3px solid #16a34a' : '2px solid #e2e8f0',
            borderRadius: 14, padding: '18px 22px', cursor: 'pointer',
            boxShadow: invoicedStatus === 'invoiced' ? '0 4px 12px rgba(22, 163, 74, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#15803d' }}>
              Invoiced / Done
            </span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#166534', lineHeight: 1 }}>
            {stats.invoicedCount}
          </div>
          <div style={{ fontSize: 13, color: '#14532d', marginTop: 8, fontWeight: 600 }}>
            Products with completed invoices
          </div>
        </div>

        {/* Card 3: Total Approved */}
        <div 
          onClick={() => setInvoicedStatus('all')}
          style={{
            background: invoicedStatus === 'all' ? '#f8fafc' : '#ffffff',
            border: invoicedStatus === 'all' ? '3px solid #0284c7' : '2px solid #e2e8f0',
            borderRadius: 14, padding: '18px 22px', cursor: 'pointer',
            boxShadow: invoicedStatus === 'all' ? '0 4px 12px rgba(2, 132, 199, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0369a1' }}>
              Total Approved Products
            </span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <Package size={20} />
            </div>
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#0c4a6e', lineHeight: 1 }}>
            {stats.totalApproved}
          </div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 8, fontWeight: 600 }}>
            All approved products across all sites
          </div>
        </div>

      </div>

      {/* ─── EASY FILTER BAR (Senior Friendly: Large fields, clear labels) ─── */}
      <div style={{ background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: 16, padding: '20px 24px', marginBottom: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        
        {/* Row 1: Search and Status Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          
          {/* Big Search Input */}
          <div style={{ position: 'relative', flex: '1 1 360px', minWidth: 280 }}>
            <Search size={20} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search by Product Name, Code, Company, or Site..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '13px 14px 13px 44px',
                fontSize: 15, fontWeight: 600, color: '#0f172a',
                background: '#f8fafc', border: '2px solid #cbd5e1', borderRadius: 10,
                outline: 'none', transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#0284c7'; e.target.style.background = '#ffffff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Status Tabs (Very prominent) */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 4, borderRadius: 10, border: '1px solid #e2e8f0', gap: 4 }}>
            <button
              onClick={() => setInvoicedStatus('pending')}
              style={{
                padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 800,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                background: invoicedStatus === 'pending' ? '#ffffff' : 'transparent',
                color: invoicedStatus === 'pending' ? '#b45309' : '#64748b',
                boxShadow: invoicedStatus === 'pending' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              ⏳ Pending Invoice ({stats.pendingCount})
            </button>
            <button
              onClick={() => setInvoicedStatus('invoiced')}
              style={{
                padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 800,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                background: invoicedStatus === 'invoiced' ? '#ffffff' : 'transparent',
                color: invoicedStatus === 'invoiced' ? '#15803d' : '#64748b',
                boxShadow: invoicedStatus === 'invoiced' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              ✓ Invoiced / Done ({stats.invoicedCount})
            </button>
            <button
              onClick={() => setInvoicedStatus('all')}
              style={{
                padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 800,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                background: invoicedStatus === 'all' ? '#ffffff' : 'transparent',
                color: invoicedStatus === 'all' ? '#0f172a' : '#64748b',
                boxShadow: invoicedStatus === 'all' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              All Products
            </button>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 4, borderRadius: 10, border: '1px solid #e2e8f0', gap: 4 }}>
            <button
              onClick={() => setViewMode('grouped')}
              style={{
                padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                background: viewMode === 'grouped' ? '#ffffff' : 'transparent',
                color: viewMode === 'grouped' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'grouped' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              🏢 Group by Site
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              📋 Flat Table
            </button>
          </div>

        </div>

        {/* Row 2: Dropdowns for Company, Site & Date Period Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, alignItems: 'center' }}>
          
          {/* Company Filter */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: 6 }}>
              🏢 Filter by Company
            </label>
            <select
              value={selectedCompany}
              onChange={handleCompanyChange}
              style={{
                width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 600,
                background: '#f8fafc', border: '2px solid #cbd5e1', borderRadius: 8,
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: 6 }}>
              📍 Filter by Site / Facility
            </label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 600,
                background: '#f8fafc', border: '2px solid #cbd5e1', borderRadius: 8,
                color: '#0f172a', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="all">All Sites ({availableSites.length})</option>
              {availableSites.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.city ? `(${s.city})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Date Period Preset Buttons */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: 6 }}>
              📅 Quick Date Period
            </label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'this_week', label: 'Week' },
                { key: 'this_month', label: 'Month' },
                { key: 'custom', label: 'Custom' }
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  style={{
                    padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700,
                    border: period === p.key ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: period === p.key ? '#e0f2fe' : '#ffffff',
                    color: period === p.key ? '#0369a1' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range (if period === 'custom') */}
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}
                />
              </div>
            </div>
          )}

          {/* Reset button */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={handleResetFilters}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', background: '#fee2e2', border: '1px solid #fca5a5',
                  borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#991b1b',
                  cursor: 'pointer'
                }}
              >
                <X size={15} /> Clear Filters
              </button>
            </div>
          )}

        </div>

      </div>

      {/* ─── BULK SELECTION ACTION BAR (Floating or inline when items selected) ─── */}
      {selectedProductIds.size > 0 && (
        <div style={{
          background: '#0f172a', color: '#ffffff', borderRadius: 12, padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
          gap: 12, marginBottom: 20, boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {selectedProductIds.size} product{selectedProductIds.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedProductIds(new Set())}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
            >
              Deselect All
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => handleBulkToggle(true)}
              disabled={bulkLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                background: '#16a34a', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 800, color: '#ffffff', cursor: 'pointer'
              }}
            >
              <Check size={16} /> Mark Selected as Done (Invoiced)
            </button>

            <button
              onClick={() => handleBulkToggle(false)}
              disabled={bulkLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: '#334155', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 700, color: '#e2e8f0', cursor: 'pointer'
              }}
            >
              <Undo2 size={15} /> Mark as Pending
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT: GROUPED VIEW OR FLAT TABLE VIEW ─── */}
      {loading ? (
        <div style={{ background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: 16, padding: 60, textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, border: '4px solid #e2e8f0', borderTopColor: '#16a34a',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: '#334155' }}>Loading approved products...</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Fetching company site records for accountant review</div>
        </div>
      ) : products.length === 0 ? (
        <div style={{ background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: 16, padding: '60px 24px', textAlign: 'center' }}>
          <CheckCircle2 size={56} style={{ color: '#16a34a', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            {invoicedStatus === 'pending' ? 'All Caught Up! No Pending Products to Invoice.' : 'No Products Found'}
          </h3>
          <p style={{ fontSize: 15, color: '#64748b', maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.5 }}>
            {invoicedStatus === 'pending'
              ? 'Every approved product in this period has already been invoiced and marked as done. Great job!'
              : 'Try adjusting your search criteria, company selection, or date period.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 700, cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grouped' ? (
        /* ─── GROUPED VIEW BY COMPANY & SITE ─── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groupedData.map((group) => {
            const isCollapsed = Boolean(collapsedSites[group.key]);
            const pendingInGroup = group.products.filter(p => !p.is_invoiced).length;
            const invoicedInGroup = group.products.filter(p => p.is_invoiced).length;

            return (
              <div
                key={group.key}
                style={{
                  background: '#ffffff',
                  border: pendingInGroup > 0 ? '2px solid #fed7aa' : '2px solid #e2e8f0',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Site Group Header */}
                <div style={{
                  background: pendingInGroup > 0 ? '#fffaf5' : '#f8fafc',
                  borderBottom: isCollapsed ? 'none' : '2px solid #e2e8f0',
                  padding: '16px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14
                }}>
                  
                  {/* Left: Company & Site Identity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button
                      type="button"
                      onClick={() => toggleCollapseSite(group.key)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                      title={isCollapsed ? 'Expand site' : 'Collapse site'}
                    >
                      {isCollapsed ? <ChevronRight size={22} /> : <ChevronDown size={22} />}
                    </button>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                          🏢 {group.companyName}
                        </span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#f1f5f9', color: '#0369a1',
                          padding: '3px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700
                        }}>
                          <MapPin size={14} /> {group.siteName}
                        </span>
                      </div>
                      {group.siteAddress && (
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
                          {group.siteAddress}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Counters & Mark All in Site as Done */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    
                    {/* Counters */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {pendingInGroup > 0 && (
                        <span style={{
                          background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a',
                          padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 800
                        }}>
                          {pendingInGroup} Pending
                        </span>
                      )}
                      {invoicedInGroup > 0 && (
                        <span style={{
                          background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                          padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 800
                        }}>
                          {invoicedInGroup} Done
                        </span>
                      )}
                    </div>

                    {/* Quick Button: Mark All in Site as Done */}
                    {pendingInGroup > 0 && (
                      <button
                        onClick={() => handleMarkSiteAsDone(group.products)}
                        disabled={bulkLoading}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', background: '#16a34a', color: '#ffffff',
                          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800,
                          cursor: 'pointer', boxShadow: '0 1px 3px rgba(22,163,74,0.3)'
                        }}
                        title="Mark all pending products for this site as Invoiced / Done"
                      >
                        <Check size={16} /> Mark All as Done ({pendingInGroup})
                      </button>
                    )}

                  </div>

                </div>

                {/* Site Products Table */}
                {!isCollapsed && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ width: 44, padding: '12px 16px', textAlign: 'center' }}>
                            {/* Checkbox placeholder */}
                          </th>
                          <th style={{ padding: '12px 16px', fontWeight: 800 }}>Product Name & Code</th>
                          <th style={{ padding: '12px 16px', fontWeight: 800 }}>Category</th>
                          <th style={{ padding: '12px 16px', fontWeight: 800 }}>Date Added / Approved</th>
                          <th style={{ padding: '12px 16px', fontWeight: 800 }}>Invoice Status</th>
                          <th style={{ padding: '12px 20px', fontWeight: 800, textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.products.map((product) => {
                          const isSelected = selectedProductIds.has(product._id);
                          const isDone = Boolean(product.is_invoiced);
                          const isBusy = actionLoadingId === product._id;

                          return (
                            <tr
                              key={product._id}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: isSelected ? '#eff6ff' : isDone ? '#fafdfb' : '#ffffff',
                                transition: 'background-color 0.1s ease'
                              }}
                            >
                              {/* Selection checkbox */}
                              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectOne(product._id)}
                                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#16a34a' }}
                                />
                              </td>

                              {/* Product Name & Code (High contrast, large font) */}
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                                  {product.name}
                                </div>
                                {(product.code || product.barcode) && (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                                    <Hash size={12} /> {product.code || product.barcode}
                                  </div>
                                )}
                              </td>

                              {/* Category */}
                              <td style={{ padding: '14px 16px', color: '#475569', fontSize: 13, fontWeight: 600 }}>
                                {product.category || product.product_type || 'Halal Certified'}
                              </td>

                              {/* Date Added / Approved */}
                              <td style={{ padding: '14px 16px', color: '#334155', fontSize: 13, fontWeight: 600 }}>
                                {product.created_at ? new Date(product.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              </td>

                              {/* Invoice Status Badge */}
                              <td style={{ padding: '14px 16px' }}>
                                {isDone ? (
                                  <div>
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 6,
                                      background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                                      padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800
                                    }}>
                                      <CheckCircle2 size={16} /> Invoiced
                                    </span>
                                    {product.invoiced_at && (
                                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 600 }}>
                                        {new Date(product.invoiced_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        {product.invoiced_by_name ? ` by ${product.invoiced_by_name}` : ''}
                                      </div>
                                    )}
                                    {product.invoice_number && (
                                      <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 700 }}>
                                        Ref: {product.invoice_number}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a',
                                    padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800
                                  }}>
                                    <Clock size={15} /> Needs Invoice
                                  </span>
                                )}
                              </td>

                              {/* PROMINENT "DONE" ACTION BUTTON */}
                              <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                {isDone ? (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleInvoiced(product, false)}
                                      disabled={isBusy}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '7px 12px', background: '#ffffff', border: '1px solid #cbd5e1',
                                        borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#64748b',
                                        cursor: 'pointer', transition: 'all 0.15s ease'
                                      }}
                                      title="Undo and revert back to Pending Invoice"
                                    >
                                      <Undo2 size={13} /> Undo
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                    {/* Big Green Done Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleInvoiced(product, true)}
                                      disabled={isBusy}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        padding: '10px 18px', background: '#16a34a', border: 'none',
                                        borderRadius: 10, fontSize: 14, fontWeight: 800, color: '#ffffff',
                                        cursor: 'pointer', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                                        transition: 'all 0.15s ease'
                                      }}
                                      title="Mark this product as Invoiced / Done"
                                    >
                                      <Check size={18} strokeWidth={3} /> Done
                                    </button>

                                    {/* Optional button to add Invoice Number if he wants */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInvoiceModalItem(product);
                                        setInvoiceNumberInput(product.invoice_number || '');
                                        setInvoiceNotesInput(product.invoice_notes || '');
                                      }}
                                      style={{
                                        padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1',
                                        borderRadius: 10, color: '#475569', cursor: 'pointer'
                                      }}
                                      title="Add Invoice Reference #"
                                    >
                                      <Hash size={16} />
                                    </button>
                                  </div>
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
        <div style={{ background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ width: 44, padding: '14px 16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={products.length > 0 && selectedProductIds.size === products.length}
                      onChange={toggleSelectAll}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#16a34a' }}
                    />
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: 800 }}>Product Name & Code</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800 }}>Company</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800 }}>Site / Facility</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800 }}>Date Approved</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800 }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 800, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const isSelected = selectedProductIds.has(product._id);
                  const isDone = Boolean(product.is_invoiced);
                  const isBusy = actionLoadingId === product._id;

                  return (
                    <tr
                      key={product._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#eff6ff' : isDone ? '#fafdfb' : '#ffffff'
                      }}
                    >
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(product._id)}
                          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#16a34a' }}
                        />
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                          {product.name}
                        </div>
                        {(product.code || product.barcode) && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                            <Hash size={12} /> {product.code || product.barcode}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                        {product.client_id?.company_name || product.client_id?.full_name || 'Direct'}
                      </td>

                      <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={14} style={{ color: '#0369a1' }} />
                          {product.site_id?.name || 'Main Facility'}
                        </div>
                        {product.site_id?.city && (
                          <div style={{ fontSize: 12, color: '#94a3b8', paddingLeft: 18 }}>
                            {product.site_id.city}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', color: '#334155', fontWeight: 600 }}>
                        {product.created_at ? new Date(product.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {isDone ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                            padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800
                          }}>
                            <CheckCircle2 size={16} /> Invoiced
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a',
                            padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800
                          }}>
                            <Clock size={15} /> Needs Invoice
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {isDone ? (
                          <button
                            type="button"
                            onClick={() => handleToggleInvoiced(product, false)}
                            disabled={isBusy}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '7px 12px', background: '#ffffff', border: '1px solid #cbd5e1',
                              borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#64748b', cursor: 'pointer'
                            }}
                          >
                            <Undo2 size={13} /> Undo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleInvoiced(product, true)}
                            disabled={isBusy}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 8,
                              padding: '9px 18px', background: '#16a34a', border: 'none',
                              borderRadius: 10, fontSize: 14, fontWeight: 800, color: '#ffffff',
                              cursor: 'pointer', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
                            }}
                          >
                            <Check size={18} strokeWidth={3} /> Done
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── OPTIONAL MODAL: ATTACH INVOICE NUMBER ─── */}
      {invoiceModalItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            background: '#ffffff', borderRadius: 16, maxWidth: 440, width: '100%',
            padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '2px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                Invoice Details (Optional)
              </div>
              <button
                type="button"
                onClick={() => setInvoiceModalItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{invoiceModalItem.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {invoiceModalItem.client_id?.company_name} — {invoiceModalItem.site_id?.name || 'Main Facility'}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Invoice Number / Reference (e.g. INV-2026-001)
              </label>
              <input
                type="text"
                placeholder="Optional invoice number..."
                value={invoiceNumberInput}
                onChange={(e) => setInvoiceNumberInput(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 600,
                  border: '2px solid #cbd5e1', borderRadius: 8, outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Accountant Note
              </label>
              <input
                type="text"
                placeholder="Optional note..."
                value={invoiceNotesInput}
                onChange={(e) => setInvoiceNotesInput(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', fontSize: 14,
                  border: '2px solid #cbd5e1', borderRadius: 8, outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setInvoiceModalItem(null)}
                style={{
                  padding: '9px 16px', background: '#f1f5f9', border: 'none',
                  borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#475569', cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleToggleInvoiced(invoiceModalItem, true, invoiceNumberInput, invoiceNotesInput)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px', background: '#16a34a', border: 'none',
                  borderRadius: 8, fontSize: 14, fontWeight: 800, color: '#ffffff', cursor: 'pointer'
                }}
              >
                <Check size={16} /> Save as Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
