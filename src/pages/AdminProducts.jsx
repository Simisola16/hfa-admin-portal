import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Package, CheckCircle, XCircle, Eye, RefreshCw, MapPin } from 'lucide-react';
import SearchWithSuggestions from '../components/SearchWithSuggestions';
import useCompanyDirectory from '../lib/useCompanyDirectory';

export default function AdminProducts() {
  const { companies: directoryCompanies } = useCompanyDirectory();
  const [products, setProducts] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const getPageNumbers = (curPage, totalPgs) => {
    if (totalPgs <= 7) return Array.from({ length: totalPgs }, (_, i) => i + 1);
    if (curPage <= 4) return [1, 2, 3, 4, 5, '...', totalPgs];
    if (curPage >= totalPgs - 3) return [1, '...', totalPgs - 4, totalPgs - 3, totalPgs - 2, totalPgs - 1, totalPgs];
    return [1, '...', curPage - 1, curPage, curPage + 1, '...', totalPgs];
  };

  const fetchInitialData = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/products').then(d => setProducts(d.data || [])).catch(() => toast.error('Failed to load products')),
      api.get('/api/sites').then(d => setSites(d.data || [])).catch(() => {})
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    const notes = prompt(`Please provide a reason for ${status}:`);
    if (notes === null) return;
    
    setSubmitting(true);
    try {
      await api.put(`/api/products/${id}/status`, { status, notes });
      toast.success(`Product ${status} successfully`);
      fetchInitialData();
      setSelected(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Active company filter: explicit selection or exact typed match
  const activeCompany = useMemo(() => {
    if (selectedCompany) return selectedCompany;
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const exact = directoryCompanies.find(c => c.name.trim().toLowerCase() === q);
    return exact ? exact.name : null;
  }, [selectedCompany, search, directoryCompanies]);

  // Dynamic available sites based on company search (only populated when company is searched)
  const availableSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return []; // Do not show any sites unless a company is searched/picked

    const companySitesMap = new Map();

    if (activeCompany) {
      // EXACT COMPANY SELECTED: Only show sites for THIS specific company!
      const targetLower = activeCompany.trim().toLowerCase();

      // 1. From all companies directory
      directoryCompanies.forEach(c => {
        if (c.name.trim().toLowerCase() === targetLower) {
          (c.sites || []).forEach(s => {
            if (s.name && !companySitesMap.has(s.name.toLowerCase())) {
              companySitesMap.set(s.name.toLowerCase(), {
                _id: s.id,
                name: s.name,
                company: c.name
              });
            }
          });
        }
      });

      // 2. From sites prop & matching products
      const matchingProducts = products.filter(p => {
        const clientName = (p.client_id?.company_name || p.client_id?.full_name || p.profiles?.company_name || p.company_name || '').trim().toLowerCase();
        return clientName === targetLower;
      });

      const matchingSiteIds = new Set(
        matchingProducts
          .map(p => p.site_id?._id || p.site_id?.id || p.site_id)
          .filter(Boolean)
          .map(String)
      );

      sites.forEach(s => {
        const sId = String(s._id || s.id);
        const sComp = (s.company_name || s.client_id?.company_name || s.client_id?.full_name || '').trim().toLowerCase();
        const sName = s.name || s.est_name || s.trading_name || s.address_1;
        if ((matchingSiteIds.has(sId) || sComp === targetLower) && sName) {
          if (!companySitesMap.has(sName.toLowerCase())) {
            companySitesMap.set(sName.toLowerCase(), { _id: s._id || s.id, name: sName, company: s.company_name });
          }
        }
      });

      matchingProducts.forEach(p => {
        if (p.site_id && typeof p.site_id === 'object') {
          const sName = p.site_id.name || p.site_id.est_name || p.site_id.trading_name;
          if (sName && !companySitesMap.has(sName.toLowerCase())) {
            companySitesMap.set(sName.toLowerCase(), {
              _id: p.site_id._id || p.site_id.id,
              name: sName
            });
          }
        }
      });
    } else {
      // 1. From all companies directory
      directoryCompanies.forEach(c => {
        if (c.name.toLowerCase().includes(q)) {
          (c.sites || []).forEach(s => {
            if (s.name && !companySitesMap.has(s.name.toLowerCase())) {
              companySitesMap.set(s.name.toLowerCase(), {
                _id: s.id,
                name: s.name,
                company: c.name
              });
            }
          });
        }
      });

      // 2. From sites prop & matching products
      const matchingProducts = products.filter(p => {
        const clientName = (p.client_id?.company_name || p.client_id?.full_name || p.profiles?.company_name || p.company_name || '').toLowerCase();
        return clientName.includes(q);
      });

      const matchingSiteIds = new Set(
        matchingProducts
          .map(p => p.site_id?._id || p.site_id?.id || p.site_id)
          .filter(Boolean)
          .map(String)
      );

      sites.forEach(s => {
        const sId = String(s._id || s.id);
        const sComp = (s.company_name || s.client_id?.company_name || s.client_id?.full_name || '').toLowerCase();
        const sName = s.name || s.est_name || s.trading_name || s.address_1;
        if ((matchingSiteIds.has(sId) || sComp.includes(q)) && sName) {
          if (!companySitesMap.has(sName.toLowerCase())) {
            companySitesMap.set(sName.toLowerCase(), { _id: s._id || s.id, name: sName, company: s.company_name });
          }
        }
      });

      matchingProducts.forEach(p => {
        if (p.site_id && typeof p.site_id === 'object') {
          const sName = p.site_id.name || p.site_id.est_name || p.site_id.trading_name;
          if (sName && !companySitesMap.has(sName.toLowerCase())) {
            companySitesMap.set(sName.toLowerCase(), {
              _id: p.site_id._id || p.site_id.id,
              name: sName
            });
          }
        }
      });
    }

    return Array.from(companySitesMap.values());
  }, [search, activeCompany, directoryCompanies, sites, products]);

  // Automatically reset site filter if search is cleared
  useEffect(() => {
    if (!search.trim() && filterSite) {
      setFilterSite('');
    }
  }, [search, filterSite]);

  // Autocomplete search suggestions (ALL registered companies, sites, and products)
  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const companiesMap = new Map();
    const sitesMap = new Map();
    const productsMap = new Map();

    // 1. ALL registered companies and their sites from directory
    directoryCompanies.forEach(c => {
      if (c.name.toLowerCase().includes(q) && !companiesMap.has(c.name.toLowerCase())) {
        companiesMap.set(c.name.toLowerCase(), {
          label: c.name,
          type: 'Company',
          subtext: `${c.sites?.length || 0} registered site${(c.sites?.length || 0) === 1 ? '' : 's'}`
        });
      }
      (c.sites || []).forEach(s => {
        if (s.name && s.name.toLowerCase().includes(q) && !sitesMap.has(s.name.toLowerCase())) {
          sitesMap.set(s.name.toLowerCase(), {
            label: s.name,
            type: 'Site',
            subtext: c.name
          });
        }
      });
    });

    // 2. Fallback to loaded products & sites
    products.forEach(p => {
      const name = p.client_id?.company_name || p.client_id?.full_name || p.profiles?.company_name || p.company_name;
      if (name && name.toLowerCase().includes(q) && !companiesMap.has(name.toLowerCase())) {
        companiesMap.set(name.toLowerCase(), {
          label: name,
          type: 'Company',
          subtext: 'Client Company'
        });
      }
      const prodName = p.name || p.product_name;
      if (prodName && prodName.toLowerCase().includes(q) && !productsMap.has(prodName.toLowerCase())) {
        productsMap.set(prodName.toLowerCase(), {
          label: prodName,
          type: 'Product',
          subtext: name || 'Product'
        });
      }
    });

    sites.forEach(s => {
      const name = s.name || s.est_name || s.trading_name || s.address_1;
      if (name && name.toLowerCase().includes(q) && !sitesMap.has(name.toLowerCase())) {
        sitesMap.set(name.toLowerCase(), {
          label: name,
          type: 'Site',
          subtext: s.company_name || s.client_id?.company_name || 'Facility'
        });
      }
    });

    const matchingCompanies = Array.from(companiesMap.values());
    const matchingSites = Array.from(sitesMap.values());
    const matchingProducts = Array.from(productsMap.values());

    return [
      ...matchingCompanies.slice(0, 8),
      ...matchingSites.slice(0, 5),
      ...matchingProducts.slice(0, 4)
    ];
  }, [search, directoryCompanies, products, sites]);

  const filtered = products.filter(p => {
    if (p.status === 'pending') return false;
    const clientName = (p.client_id?.company_name || p.client_id?.full_name || p.profiles?.company_name || p.company_name || '').trim();
    const barcodeStr = p.barcode || p.code || '';
    const siteName = p.site_id?.name || p.site_id?.est_name || p.site_id?.trading_name || '';

    // If exact company is active, filter strictly by this company
    if (activeCompany) {
      if (clientName.toLowerCase() !== activeCompany.trim().toLowerCase()) {
        return false;
      }
    } else if (search.trim()) {
      const q = search.toLowerCase();
      const matchSearch = 
        p.name?.toLowerCase().includes(q) || 
        clientName.toLowerCase().includes(q) ||
        siteName.toLowerCase().includes(q) ||
        barcodeStr.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }
      
    const matchStatus = !filterStatus || p.status === filterStatus;
    
    const prodSiteId = p.site_id?._id || p.site_id?.id || p.site_id;
    const matchSite = !filterSite || String(prodSiteId) === String(filterSite);

    return matchStatus && matchSite;
  });

  const totalPages = Math.ceil(filtered.length / limit) || 1;
  const paginatedProducts = filtered.slice((page - 1) * limit, page * limit);

  return (
    <div>
      <div className="toolbar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchWithSuggestions
          value={search}
          onChange={val => {
            setSearch(val);
            if (selectedCompany && val.trim().toLowerCase() !== selectedCompany.trim().toLowerCase()) {
              setSelectedCompany(null);
            }
            setPage(1);
          }}
          onSelect={item => {
            if (item.type === 'Company') {
              setSelectedCompany(item.label);
              setSearch(item.label);
            } else {
              setSelectedCompany(null);
              setSearch(item.label);
            }
            setPage(1);
          }}
          suggestions={searchSuggestions}
          placeholder="Search by product name, code, company, or site..."
        />

        {/* Filter by Site (dynamically narrowed to searched company) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={15} style={{ color: search.trim() ? 'var(--primary, #2563eb)' : '#94a3b8' }} />
          <select 
            className="form-control" 
            style={{ 
              width: 240, 
              minWidth: 240,
              maxWidth: 240,
              fontWeight: 600,
              backgroundColor: search.trim() ? '#ffffff' : '#f8fafc',
              cursor: search.trim() ? 'pointer' : 'not-allowed',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }} 
            value={filterSite}
            disabled={!search.trim()}
            onChange={e => {
              setFilterSite(e.target.value);
              setPage(1);
            }}
          >
            {!search.trim() ? (
              <option value="">Select a company first to filter sites</option>
            ) : availableSites.length === 0 ? (
              <option value="">No sites found for "{search.trim()}"</option>
            ) : (
              <>
                <option value="">
                  {`All Sites for "${search.trim()}" (${availableSites.length})`}
                </option>
                {availableSites.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name || s.est_name || s.trading_name || s.address_1}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <select 
          className="form-control" 
          style={{ width: 'auto' }} 
          value={filterStatus} 
          onChange={e => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active / Certified</option>
          <option value="approved">Accepted</option>
        </select>
        
        <button className="btn btn-ghost btn-sm" onClick={fetchInitialData} title="Refresh products">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Certified Product List ({filtered.length})</div>
          <div className="card-subtitle">Active certified client products with manufacturing facility attribution</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Package size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div className="empty-state-title">No products found</div>
              <div className="empty-state-text">No products match your current search and filters</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Client / Company</th>
                  <th>Manufacturing Site</th>
                  <th>Category / Type</th>
                  <th>CODE</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map(product => {
                  const prodId = product._id || product.id;
                  const clientName = product.client_id?.company_name || product.client_id?.full_name || product.profiles?.company_name || '—';
                  const barcodeVal = product.barcode || product.code || '—';
                  const siteObj = product.site_id;
                  const siteName = (siteObj && typeof siteObj === 'object')
                    ? (siteObj.name || siteObj.est_name || siteObj.trading_name || siteObj.address_1)
                    : (product.site_name || 'Main Facility');

                  return (
                    <tr key={prodId}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{product.name}</div>
                        <div className="truncate" style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200 }}>
                          {product.description || 'No description'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{clientName}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, color: '#1e293b' }}>
                          <MapPin size={13} style={{ color: '#059669', flexShrink: 0 }} />
                          <span>{siteName}</span>
                        </div>
                        {siteObj?.address_1 && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, paddingLeft: 18 }}>
                            {siteObj.address_1}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>{product.category || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{product.product_type}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: barcodeVal !== '—' ? 600 : 400 }}>
                        <span style={{ background: '#f8fafc', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                          {barcodeVal}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          product.status === 'approved' || product.status === 'active' ? 'badge-green' : 
                          product.status === 'rejected' ? 'badge-red' : 
                          'badge-yellow'
                        }`}>
                          {product.status === 'approved' || product.status === 'active' ? 'Accepted' : (product.status || 'pending')}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => setSelected(product)}
                          title="Quick View"
                        >
                          <Eye size={14} />
                        </button>
                        {product.status === 'pending' && (
                          <>
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ color: 'var(--primary)' }}
                              onClick={() => handleStatusUpdate(prodId, 'approved')}
                              title="Accept"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleStatusUpdate(prodId, 'rejected')}
                              title="Reject"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {filtered.length > limit && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#64748b' }}>
              <span>
                Showing <strong>{filtered.length === 0 ? 0 : ((page - 1) * limit) + 1}</strong> to <strong>{Math.min(page * limit, filtered.length)}</strong> of <strong>{filtered.length.toLocaleString()}</strong> products
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                style={{ padding: '5px 9px', fontSize: 12, opacity: page <= 1 ? 0.5 : 1 }}
              >
                First
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page <= 1}
                style={{ padding: '5px 9px', fontSize: 12, opacity: page <= 1 ? 0.5 : 1 }}
              >
                &larr; Prev
              </button>

              {getPageNumbers(page, totalPages).map((p, idx) => (
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>
                ) : (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-ghost'}`}
                    style={{
                      minWidth: 30,
                      height: 30,
                      padding: '0 6px',
                      fontSize: 12,
                      fontWeight: page === p ? 700 : 500
                    }}
                  >
                    {p}
                  </button>
                )
              ))}

              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                style={{ padding: '5px 9px', fontSize: 12, opacity: page >= totalPages ? 0.5 : 1 }}
              >
                Next &rarr;
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                style={{ padding: '5px 9px', fontSize: 12, opacity: page >= totalPages ? 0.5 : 1 }}
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 620, borderRadius: 14 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={18} style={{ color: '#059669' }} />
                <span className="modal-title" style={{ fontWeight: 800 }}>Product Details</span>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}><XCircle size={18}/></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Product Name</label>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{selected.name}</div>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>CODE</label>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>{selected.barcode || selected.code || 'N/A'}</div>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Category</label>
                  <div style={{ fontSize: 13.5 }}>{selected.category || 'N/A'}</div>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Manufacturing Site</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 600, color: '#166534' }}>
                    <MapPin size={14} />
                    {selected.site_id?.name || selected.site_id?.est_name || 'Main Facility'}
                  </div>
                  {selected.site_id?.address_1 && (
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                      {selected.site_id.address_1}
                    </div>
                  )}
                </div>
              </div>

              {selected.ingredients && (
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Ingredients</label>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 13, border: '1px solid var(--border)' }}>
                    {Array.isArray(selected.ingredients) ? selected.ingredients.join(', ') : selected.ingredients}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Description</label>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: '#334155' }}>
                  {selected.description || 'No description provided'}
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 16, borderRadius: 10, marginTop: 18 }}>
                <div style={{ fontSize: 11, color: '#166534', fontWeight: 800, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client Company</div>
                <div style={{ fontWeight: 700, color: '#14532d', fontSize: 14 }}>{selected.client_id?.company_name || selected.profiles?.company_name || '—'}</div>
                <div style={{ fontSize: 12.5, color: '#166534', marginTop: 2 }}>{selected.client_id?.full_name || selected.profiles?.full_name}</div>
                <div style={{ fontSize: 12.5, color: '#166534' }}>{selected.client_id?.email || selected.profiles?.email}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
              {selected.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleStatusUpdate(selected._id || selected.id, 'rejected')}>Reject</button>
                  <button className="btn btn-primary" onClick={() => handleStatusUpdate(selected._id || selected.id, 'approved')}>Accept Product</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
