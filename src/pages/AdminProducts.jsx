import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Package, Search, CheckCircle, XCircle, Eye, RefreshCw, Filter } from 'lucide-react';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = () => {
    setLoading(true);
    api.get('/api/products')
      .then(d => setProducts(d.data || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    const notes = prompt(`Please provide a reason for ${status}:`);
    if (notes === null) return;
    
    setSubmitting(true);
    try {
      await api.put(`/api/products/${id}/status`, { status, notes });
      toast.success(`Product ${status} successfully`);
      fetchProducts();
      setSelected(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      p.profiles?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input 
            placeholder="Search by product name, barcode or company..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <select 
          className="form-control" 
          style={{ width: 'auto' }} 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={fetchProducts}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Product Review Queue</div>
          <div className="card-subtitle">Manage and certify client products</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Package size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div className="empty-state-title">No products found</div>
              <div className="empty-state-text">No products match your current filters</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Client</th>
                  <th>Category / Type</th>
                  <th>Barcode</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{product.name}</div>
                      <div className="truncate" style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200 }}>
                        {product.description || 'No description'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{product.profiles?.company_name || '—'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{product.category || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{product.product_type}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{product.barcode || '—'}</td>
                    <td>
                      <span className={`badge ${
                        product.status === 'approved' ? 'badge-green' : 
                        product.status === 'rejected' ? 'badge-red' : 
                        'badge-yellow'
                      }`}>
                        {product.status || 'pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(product.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
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
                            onClick={() => handleStatusUpdate(product.id, 'approved')}
                            title="Approve"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleStatusUpdate(product.id, 'rejected')}
                            title="Reject"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">Product Details</span>
              <button className="modal-close" onClick={() => setSelected(null)}><RefreshCw size={16}/></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div>
                  <label className="form-label">Product Name</label>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{selected.name}</div>
                </div>
                <div>
                  <label className="form-label">Barcode / SKU</label>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{selected.barcode || 'N/A'}</div>
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <div>{selected.category || 'N/A'}</div>
                </div>
                <div>
                  <label className="form-label">Product Type</label>
                  <div>{selected.product_type || 'N/A'}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ingredients</label>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 13, border: '1px solid var(--border)' }}>
                  {selected.ingredients || 'No ingredients listed'}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  {selected.description || 'No description provided'}
                </div>
              </div>

              <div style={{ background: 'var(--primary-light)', padding: 16, borderRadius: 12, marginTop: 24 }}>
                <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Client Information</div>
                <div style={{ fontWeight: 600 }}>{selected.profiles?.company_name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selected.profiles?.full_name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selected.profiles?.email}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
              {selected.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleStatusUpdate(selected.id, 'rejected')}>Reject</button>
                  <button className="btn btn-primary" onClick={() => handleStatusUpdate(selected.id, 'approved')}>Approve Product</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
