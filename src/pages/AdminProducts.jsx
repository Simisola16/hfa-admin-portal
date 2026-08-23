import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Package, Search, CheckCircle, XCircle, Eye, RefreshCw, Filter, MapPin } from 'lucide-react';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  const filtered = products.filter(p => {
    if (p.status === 'pending') return false;
    const clientName = p.client_id?.company_name || p.client_id?.full_name || p.profiles?.company_name || '';
    const barcodeStr = p.barcode || p.code || '';
    const siteName = p.site_id?.name || p.site_id?.est_name || p.site_id?.trading_name || '';
    
    const matchSearch = !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      clientName.toLowerCase().includes(search.toLowerCase()) ||
      siteName.toLowerCase().includes(search.toLowerCase()) ||
      barcodeStr.toLowerCase().includes(search.toLowerCase());
      
    const matchStatus = !filterStatus || p.status === filterStatus;
    
    const prodSiteId = p.site_id?._id || p.site_id?.id || p.site_id;
    const matchSite = !filterSite || String(prodSiteId) === String(filterSite);

    return matchSearch && matchStatus && matchSite;
  });

  return (
    <div>
      <div className="toolbar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input 
            placeholder="Search by product name, code, company, or site..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        {/* Filter by Site */}
        {sites.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={15} style={{ color: '#64748b' }} />
            <select 
              className="form-control" 
              style={{ width: 'auto', minWidth: 180, fontWeight: 600 }} 
              value={filterSite} 
              onChange={e => setFilterSite(e.target.value)}
            >
              <option value="">All Sites ({sites.length})</option>
              {sites.map(s => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.name || s.est_name || s.trading_name || s.address_1}
                </option>
              ))}
            </select>
          </div>
        )}

        <select 
          className="form-control" 
          style={{ width: 'auto' }} 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
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
                  <th>Code / SKU</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => {
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
                  <label className="form-label" style={{ fontWeight: 700 }}>Code / SKU</label>
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
