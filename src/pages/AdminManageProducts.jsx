import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Package, Search, Plus, Edit3, Trash2, CheckCircle, XCircle, RefreshCw, X } from 'lucide-react';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { canManageProductForm } from '../lib/permissions';

export default function AdminManageProducts() {
  const { user, profile } = useAuth();
  const currentUser = profile || user;
  const canEdit = canManageProductForm(currentUser);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [formIngredients, setFormIngredients] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 300ms debounce on search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 whenever search or status filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (filterStatus) {
        params.status = filterStatus;
      }

      const res = await api.get('/api/products', { params });
      const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setProducts(rawList);
      if (res?.pagination) {
        setTotal(res.pagination.total);
      } else {
        setTotal(rawList.length);
      }
    } catch (err) {
      toast.error('Failed to load product catalog');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filterStatus]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshIndex]);

  const triggerRefresh = () => setRefreshIndex(c => c + 1);

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
    if (!canEdit) {
      toast.error('Only Food Tech or FT Manager can manage products');
      return;
    }
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
      triggerRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!canEdit) {
      toast.error('Only Food Tech or FT Manager can delete products');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${name}" from the product catalog?`)) return;
    try {
      await api.delete(`/api/products/${id}`);
      toast.success('Product deleted');
      if (products.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        triggerRefresh();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  const handleToggleStatus = async (prod) => {
    if (!canEdit) {
      toast.error('Only Food Tech or FT Manager can update product status');
      return;
    }
    const nextStatus = prod.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/api/products/${prod._id || prod.id}`, { status: nextStatus });
      toast.success(`Product status updated to ${nextStatus}`);
      triggerRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="page-content">
      <div className="toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div className="search-box" style={{ position: 'relative', flex: 1, maxWidth: 460 }}>
            <Search size={15} className="search-icon" />
            <input 
              placeholder="Search catalog by product name, category, or description..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ paddingRight: search ? 30 : 12 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
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
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={triggerRefresh} 
            title="Refresh catalog"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
        </div>

        {canEdit && (
          <button className="btn btn-primary" style={{ gap: 6, display: 'inline-flex', alignItems: 'center' }} onClick={openCreateModal}>
            <Plus size={16} /> Add Catalog Product
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">Manage Product Catalog</div>
            <div className="card-subtitle">Create, edit, activate/deactivate, and maintain master product records</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {total.toLocaleString()} {total === 1 ? 'product' : 'products'}
            </span>
            {total > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Showing {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : products.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Package size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div className="empty-state-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {debouncedSearch || filterStatus ? 'No matching products found' : 'No catalog products found'}
              </div>
              <div className="empty-state-text" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: (debouncedSearch || filterStatus) ? 14 : 0 }}>
                {debouncedSearch || filterStatus 
                  ? 'Try clearing search filters or adjusting your search keywords' 
                  : 'Add a new catalog product above to start populating the master directory'}
              </div>
              {(debouncedSearch || filterStatus) && (
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => { setSearch(''); setFilterStatus(''); }}
                  style={{ marginTop: 8 }}
                >
                  Clear Filters
                </button>
              )}
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
                  {canEdit && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
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
                    {canEdit && (
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
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <Pagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={newSize => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemName="products"
            disabled={loading}
          />
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
