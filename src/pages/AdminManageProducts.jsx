import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Package, Search, Plus, Edit3, Trash2, CheckCircle, XCircle, RefreshCw, X, Filter } from 'lucide-react';

export default function AdminManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [formIngredients, setFormIngredients] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = () => {
    setLoading(true);
    api.get('/api/products')
      .then(res => setProducts(res.data?.data || res.data || []))
      .catch(() => toast.error('Failed to load product catalog'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('');
    setFormDescription('');
    setFormStatus('active');
    setFormIngredients('');
    setShowEditModal(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setFormName(prod.name || '');
    setFormCategory(prod.category || '');
    setFormDescription(prod.description || '');
    setFormStatus(prod.status || 'active');
    setFormIngredients(Array.isArray(prod.ingredients) ? prod.ingredients.join(', ') : (prod.ingredients || ''));
    setShowEditModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Product name is required');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: formName.trim(),
      category: formCategory.trim(),
      description: formDescription.trim(),
      status: formStatus,
      ingredients: formIngredients ? formIngredients.split(',').map(i => i.trim()).filter(Boolean) : []
    };

    try {
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct._id || editingProduct.id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await api.post('/api/products', payload);
        toast.success('Product added to catalog');
      }
      setShowEditModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the product catalog?`)) return;
    try {
      await api.delete(`/api/products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  const handleToggleStatus = async (prod) => {
    const nextStatus = prod.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/api/products/${prod._id || prod.id}`, { status: nextStatus });
      toast.success(`Product status updated to ${nextStatus}`);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="page-content">
      <div className="toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input 
              placeholder="Search catalog by product name, category, or description..." 
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
            <option value="active">Active Catalog</option>
            <option value="pending">Pending Review</option>
            <option value="inactive">Inactive / Archived</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={fetchProducts} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        <button className="btn btn-primary" style={{ gap: 6, display: 'inline-flex', alignItems: 'center' }} onClick={openCreateModal}>
          <Plus size={16} /> Add Catalog Product
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">Manage Product Catalog</div>
            <div className="card-subtitle">Create, edit, activate/deactivate, and maintain master product records</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{filtered.length} products total</span>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Package size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div className="empty-state-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>No catalog products found</div>
              <div className="empty-state-text" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Try clearing search filters or add a new catalog product above</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Ingredients</th>
                  <th>Date Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id || p.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.description}</div>}
                    </td>
                    <td>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {p.category || 'General'}
                      </span>
                    </td>
                    <td>
                      {p.status === 'active' && (
                        <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={10} /> Active
                        </span>
                      )}
                      {p.status === 'pending' && (
                        <span style={{ background: '#fffbeb', color: '#b45309', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          Pending Review
                        </span>
                      )}
                      {p.status === 'inactive' && (
                        <span style={{ background: '#fef2f2', color: '#b91c1c', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <XCircle size={10} /> Inactive
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {Array.isArray(p.ingredients) && p.ingredients.length > 0
                        ? p.ingredients.slice(0, 3).join(', ') + (p.ingredients.length > 3 ? ` (+${p.ingredients.length - 3} more)` : '')
                        : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(p.created_at || p.createdAt || Date.now()).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ padding: '4px 8px', height: 'auto', fontSize: 11 }}
                          onClick={() => handleToggleStatus(p)}
                          title="Toggle Status"
                        >
                          {p.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ padding: '4px 8px', height: 'auto' }}
                          onClick={() => openEditModal(p)}
                          title="Edit Product"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ padding: '4px 8px', height: 'auto', color: '#dc2626' }}
                          onClick={() => handleDeleteProduct(p._id || p.id, p.name)}
                          title="Delete Product"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit / Create Product Modal */}
      {showEditModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowEditModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingProduct ? 'Edit Catalog Product' : 'Add Catalog Product'}</div>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="modal-body" style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Product Name *</label>
                  <input 
                    className="form-control" 
                    placeholder="e.g. Halal Beef Burger Patty" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Category</label>
                  <input 
                    className="form-control" 
                    placeholder="e.g. Meat & Poultry, Beverages, Confectionery..." 
                    value={formCategory} 
                    onChange={e => setFormCategory(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Status</label>
                  <select 
                    className="form-control" 
                    value={formStatus} 
                    onChange={e => setFormStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending Review</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Ingredients (comma separated)</label>
                  <input 
                    className="form-control" 
                    placeholder="e.g. Beef, Water, Salt, Spices" 
                    value={formIngredients} 
                    onChange={e => setFormIngredients(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Description / Notes</label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    placeholder="Product specification or certification details..." 
                    value={formDescription} 
                    onChange={e => setFormDescription(e.target.value)} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
