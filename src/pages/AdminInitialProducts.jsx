import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../lib/pdfUtils';
import {
  Package, Search, X, Check, FileText, AlertCircle, Clock,
  RefreshCw, User, CheckCircle, Users, ArrowRight, Building2,
  Calendar, Layers, ShieldCheck, ChevronRight, Sparkles, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  submitted: { label: 'Needs FT Assignment', bg: '#fef3c7', color: '#92400e', border: '#fde68a', step: 1 },
  ft_assigned: { label: 'FT Assigned', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', step: 2 },
  product_approval_form_enabled: { label: 'Form Enabled', bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff', step: 3 },
  all_forms_received: { label: 'Form Received', bg: '#ccfbf1', color: '#115e59', border: '#99f6e4', step: 3 },
  logsheet_created: { label: 'Logsheet Created', bg: '#e0f2fe', color: '#075985', border: '#bae6fd', step: 4 },
  waiting_sharia_signature: { label: 'Committee Review', bg: '#ffedd5', color: '#9a3412', border: '#fed7aa', step: 4 },
  initial_product_approved: { label: 'Initial Product Approved 🎉', bg: '#dcfce7', color: '#166534', border: '#bbf7d0', step: 5 }
};

export default function AdminInitialProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'all';

  const [apps, setApps] = useState([]);
  const [ftUsers, setFtUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Direct Assign FT Modal State (NO Accept/Reject!)
  const [assignModalApp, setAssignModalApp] = useState(null);
  const [selectedFtIds, setSelectedFtIds] = useState([]);
  const [customFtName, setCustomFtName] = useState('');
  const [customFtEmail, setCustomFtEmail] = useState('');
  const [customFtNotes, setCustomFtNotes] = useState('');
  const [submittingFt, setSubmittingFt] = useState(false);

  const isManagerOrAdmin = ['admin', 'superadmin', 'food_tech_manager'].includes(user?.role);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const [initRes, usersRes] = await Promise.all([
        api.get('/api/initial-products').catch(() => ({ data: { data: [] } })),
        isManagerOrAdmin ? api.get('/api/users').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);

      const loaded = initRes.data?.data || (Array.isArray(initRes.data) ? initRes.data : []);
      setApps(loaded);

      const rawUsers = Array.isArray(usersRes) ? usersRes : (Array.isArray(usersRes?.data?.data) ? usersRes.data.data : (Array.isArray(usersRes?.data) ? usersRes.data : []));
      setFtUsers(rawUsers.filter(u => u && (u.role === 'food_tech' || (Array.isArray(u.roles) && u.roles.includes('food_tech')))));
    } catch {
      toast.error('Failed to load Initial Products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [user]);

  const openAssignModal = (app) => {
    setAssignModalApp(app);
    const preSelected = (app.assigned_food_techs || []).map(ft => (ft._id || ft).toString());
    setSelectedFtIds(preSelected.length > 0 ? preSelected : (app.assigned_food_tech ? [(app.assigned_food_tech._id || app.assigned_food_tech).toString()] : []));
    setCustomFtName(app.assigned_ft_custom?.name || app.assigned_ft_details || '');
    setCustomFtEmail(app.assigned_ft_custom?.email || '');
    setCustomFtNotes(app.assigned_ft_custom?.notes || '');
  };

  const closeAssignModal = () => {
    setAssignModalApp(null);
  };

  const toggleFt = (ftId) => {
    const idStr = String(ftId);
    setSelectedFtIds(prev =>
      prev.includes(idStr) ? prev.filter(id => id !== idStr) : [...prev, idStr]
    );
  };

  const handleDirectAssignFt = async () => {
    if (selectedFtIds.length === 0 && !customFtName.trim()) {
      return toast.error('Please select at least one Food Technologist or enter FT details.');
    }

    setSubmittingFt(true);
    try {
      await api.put(`/api/initial-products/${assignModalApp._id}/assign-ft`, {
        assigned_food_techs: selectedFtIds,
        custom_ft_name: customFtName.trim(),
        custom_ft_email: customFtEmail.trim(),
        custom_ft_notes: customFtNotes.trim(),
        assigned_ft_details: customFtName.trim()
      });
      toast.success('Food Technologies specialist assigned directly!');
      closeAssignModal();
      fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to assign FT.');
    } finally {
      setSubmittingFt(false);
    }
  };

  // View / Filter calculations
  const filtered = apps.filter(item => {
    const pName = item.product?.name || '';
    const pCode = item.product?.code || '';
    const compName = item.client_id?.company_name || item.client_id?.full_name || '';
    const appNum = item.application_id?.application_number || '';
    const siteName = item.site_id?.name || item.application_id?.site_name || '';

    const matchSearch = !search ||
      pName.toLowerCase().includes(search.toLowerCase()) ||
      pCode.toLowerCase().includes(search.toLowerCase()) ||
      compName.toLowerCase().includes(search.toLowerCase()) ||
      appNum.toLowerCase().includes(search.toLowerCase()) ||
      siteName.toLowerCase().includes(search.toLowerCase());

    // Check tab view query
    let matchTab = true;
    if (currentView === 'inprogress') {
      matchTab = item.status !== 'initial_product_approved';
    } else if (currentView === 'needs_ft') {
      matchTab = item.status === 'submitted';
    } else if (currentView === 'approved') {
      matchTab = item.status === 'initial_product_approved';
    }

    // Check status dropdown
    let matchStatus = true;
    if (statusFilter !== 'all') {
      matchStatus = item.status === statusFilter;
    }

    return matchSearch && matchTab && matchStatus;
  });

  const countNeedsFt = apps.filter(a => a.status === 'submitted').length;
  const countInProgress = apps.filter(a => a.status !== 'initial_product_approved').length;
  const countApproved = apps.filter(a => a.status === 'initial_product_approved').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(5,150,105,0.25)' }}>
            <Package size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Initial Products Management
            </h1>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Direct FT Assignment &bull; Form Verification &bull; Initial Product Approval
            </div>
          </div>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchApps}
          disabled={loading}
          title="Refresh List"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 18, overflowX: 'auto' }}>
        {[
          { key: 'all', label: 'All Initial Products', count: apps.length },
          { key: 'needs_ft', label: 'Needs FT Assignment', count: countNeedsFt, highlight: countNeedsFt > 0 },
          { key: 'inprogress', label: 'In-Progress', count: countInProgress },
          { key: 'approved', label: 'Approved', count: countApproved }
        ].map(tab => {
          const isActive = currentView === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setSearchParams(tab.key === 'all' ? {} : { view: tab.key });
              }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: `2.5px solid ${isActive ? '#059669' : 'transparent'}`,
                padding: '10px 16px',
                fontSize: 13.5,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#059669' : '#64748b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                background: tab.highlight ? '#fef3c7' : isActive ? '#ecfdf5' : '#f1f5f9',
                color: tab.highlight ? '#92400e' : isActive ? '#059669' : '#64748b',
                border: `1px solid ${tab.highlight ? '#fde68a' : isActive ? '#a7f3d0' : '#e2e8f0'}`,
                fontSize: 11,
                fontWeight: 800,
                padding: '1px 7px',
                borderRadius: 10
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            placeholder="Search company, initial product, code, application #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control w-auto"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          <option value="all">All Sub-Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="ft_assigned">FT Assigned</option>
          <option value="product_approval_form_enabled">Form Enabled</option>
          <option value="all_forms_received">Form Received</option>
          <option value="logsheet_created">Logsheet Created</option>
          <option value="waiting_sharia_signature">Committee Review</option>
          <option value="initial_product_approved">Approved</option>
        </select>
      </div>

      {/* Table / List */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Loading Initial Products...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div className="empty-state-icon" style={{ margin: '0 auto 12px' }}><Package /></div>
              <div className="empty-state-title">No Initial Products Found</div>
              <div className="empty-state-text">
                {search ? 'No records match your search criteria.' : 'No Initial Products registered under this view.'}
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Initial Product</th>
                  <th>Company / Client</th>
                  <th>Application &amp; Facility</th>
                  <th>Assigned FT</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const conf = STATUS_CONFIG[item.status] || { label: item.status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
                  const isApproved = item.status === 'initial_product_approved';
                  const needsFt = item.status === 'submitted';
                  const compName = item.client_id?.company_name || item.client_id?.full_name || 'Client';
                  const siteName = item.site_id?.name || item.application_id?.site_name || item.application_id?.establishment_name || 'Main Facility';
                  const ftNames = [
                    ...(item.assigned_food_techs || []).map(ft => ft.full_name || ft.email),
                    item.assigned_ft_custom?.name || item.assigned_ft_details
                  ].filter(Boolean);

                  return (
                    <tr key={item._id}>
                      {/* Product Name & Code */}
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 13.5 }}>
                          {item.product?.name}
                        </div>
                        {item.product?.code && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            <code>{item.product.code}</code>
                          </div>
                        )}
                      </td>

                      {/* Company Name */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                          {compName}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                          {item.contact_name} {item.contact_email ? `(${item.contact_email})` : ''}
                        </div>
                      </td>

                      {/* Application & Site */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0f172a', fontSize: 12.5 }}>
                          <Building2 size={13} style={{ color: '#059669' }} />
                          <span>{siteName}</span>
                        </div>
                        {item.application_id?.application_number && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            App: <strong>#{item.application_id.application_number}</strong>
                          </div>
                        )}
                      </td>

                      {/* Assigned FT */}
                      <td>
                        {ftNames.length > 0 ? (
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <User size={13} /> {ftNames.join(', ')}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 6, border: '1px solid #fde68a' }}>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span style={{
                          background: conf.bg,
                          color: conf.color,
                          border: `1px solid ${conf.border}`,
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: 20,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          {conf.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {needsFt && isManagerOrAdmin && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => openAssignModal(item)}
                              style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                fontWeight: 800,
                                fontSize: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <User size={13} /> Assign FT
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/admin/initial-products/${item._id}/processing`)}
                            style={{
                              background: isApproved ? '#166534' : '#059669',
                              borderColor: isApproved ? '#166534' : '#059669',
                              fontWeight: 700,
                              fontSize: 12
                            }}
                          >
                            Processing &rarr;
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── DIRECT ASSIGN FT MODAL (NO ACCEPT/REJECT STEP) ─── */}
      {assignModalApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeAssignModal()} style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 540, width: '95%', padding: 0, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <User size={22} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff' }}>
                    Assign Food Technologist
                  </h3>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                    Direct Assignment for Initial Product: <strong>{assignModalApp.product?.name}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={closeAssignModal}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '22px 24px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Select from system FT users */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 800 }}>
                  Select FT Staff Members from System:
                </label>
                {ftUsers.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                    No system users with role 'food_tech' found. You can enter specialist details below.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
                    {ftUsers.map(ft => {
                      const isSelected = selectedFtIds.includes(String(ft._id));
                      return (
                        <label
                          key={ft._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#065f46' : '#334155',
                            padding: '4px 6px',
                            borderRadius: 6,
                            background: isSelected ? '#ecfdf5' : 'transparent'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFt(ft._id)}
                            style={{ accentColor: '#059669' }}
                          />
                          <span>{ft.full_name || ft.name || ft.email} ({ft.email})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Or enter custom specialist */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 10 }}>
                  Or Enter Specialist / External Technologist Details:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="FT Specialist Name"
                    value={customFtName}
                    onChange={e => setCustomFtName(e.target.value)}
                    style={{ fontSize: 12.5 }}
                  />
                  <input
                    type="email"
                    className="form-control"
                    placeholder="FT Specialist Email"
                    value={customFtEmail}
                    onChange={e => setCustomFtEmail(e.target.value)}
                    style={{ fontSize: 12.5 }}
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={closeAssignModal}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submittingFt || (selectedFtIds.length === 0 && !customFtName.trim())}
                onClick={handleDirectAssignFt}
                style={{ background: '#059669', borderColor: '#059669', fontWeight: 800 }}
              >
                {submittingFt ? <span className="spinner-white" /> : 'Confirm Direct Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
