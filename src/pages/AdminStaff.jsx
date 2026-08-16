import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Search, Shield, Users, UserCheck, PlusCircle, Trash2, X, AlertCircle, RefreshCw, KeyRound, Lock, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminStaff() {
  const { user: loggedInUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Staff Creation Modal State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'food_tech',
    username: '',
    can_issue_direct_certificate: false
  });
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Suspension Modal State
  const [suspensionModal, setSuspensionModal] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  // Superadmin permission check
  const isSuperAdmin = loggedInUser?.role === 'superadmin' || loggedInUser?.role === 'admin';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users');
      setUsers(res.data || []);
    } catch {
      toast.error('Failed to load HFA staff accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Filter staff members only (exclude clients)
  const staffMembers = users.filter(u => ['admin', 'superadmin', 'audit_manager', 'food_tech_manager', 'food_tech', 'inspector'].includes(u.role));

  const filtered = staffMembers.filter(s => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.username?.toLowerCase().includes(query) ||
      s.role?.toLowerCase().includes(query)
    );
  });

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return toast.error('Only Superadmin can create staff accounts.');
    if (!staffForm.email.trim() || !staffForm.password.trim() || !staffForm.full_name.trim() || !staffForm.username.trim()) {
      return toast.error('Please fill in all required fields, including username.');
    }

    setStaffSubmitting(true);
    try {
      await api.post('/api/users', staffForm);
      toast.success('HFA Staff account created successfully!');
      setShowStaffModal(false);
      setStaffForm({ email: '', password: '', full_name: '', role: 'food_tech', username: '', can_issue_direct_certificate: false });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to create staff account');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleToggleDirectCertPermission = async (userId, currentStatus, userName) => {
    if (!isSuperAdmin) return toast.error('Only Superadmin can grant or revoke Direct Certificate privileges.');
    const nextVal = !currentStatus;
    try {
      await api.put(`/api/users/${userId}/direct-cert-permission`, { can_issue_direct_certificate: nextVal });
      toast.success(`Direct Certificate Studio privilege ${nextVal ? 'granted to' : 'revoked from'} ${userName || 'staff member'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update Direct Certificate privilege');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!isSuperAdmin) return toast.error('Only Superadmin can modify staff roles.');
    try {
      await api.put(`/api/users/${userId}/role`, { role: newRole });
      toast.success('Staff role updated successfully');
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update staff role');
    }
  };

  const handleStatusChange = async (id, isActivating) => {
    if (!isSuperAdmin) return toast.error('Only Superadmin can modify staff status.');
    try {
      if (!isActivating && !suspensionReason.trim()) {
        return toast.error('Please provide a reason for suspension');
      }

      await api.put(`/api/users/${id}/status`, {
        is_active: isActivating,
        suspension_reason: isActivating ? null : suspensionReason
      });

      toast.success(isActivating ? 'Staff account activated!' : 'Staff account suspended!');
      setSuspensionModal(null);
      setSuspensionReason('');
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update staff status');
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!isSuperAdmin) return toast.error('Only Superadmin can delete staff accounts.');
    if (!window.confirm(`Are you sure you want to delete staff member "${name}"? This action cannot be undone.`)) return;

    try {
      await api.delete(`/api/users/${id}`);
      toast.success('Staff account deleted successfully');
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete staff account');
    }
  };

  return (
    <div className="animate-in">
      {/* Superadmin notification banner if non-superadmin */}
      {!isSuperAdmin && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#991b1b', fontSize: 13 }}>
          <Lock size={16} />
          <span><strong>Notice:</strong> Staff management actions (creating accounts, modifying roles, changing status) are restricted to Superadmin users.</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            placeholder="Search staff by name, email, username, or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchUsers}><RefreshCw size={14} /></button>
          {isSuperAdmin && (
            <button className="btn btn-primary" onClick={() => setShowStaffModal(true)}>
              <PlusCircle size={15} style={{ marginRight: 6 }} /> Add Staff Account
            </button>
          )}
          <span className="badge badge-gray" style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>
            {filtered.length} Staff Members
          </span>
        </div>
      </div>

      {/* Main Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', background: '#fff' }}>
          <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: 10, borderRadius: 12, display: 'flex' }}>
            <Shield size={22} />
          </div>
          <div>
            <div className="card-title" style={{ fontSize: 18, fontWeight: 700 }}>HFA Staff & User Management</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Manage internal HFA staff accounts, credentials, roles, and status (Superadmin Access)</div>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <div className="empty-state-icon" style={{ background: '#f8fafc', color: '#cbd5e1', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Users size={32} />
              </div>
              <div className="empty-state-title" style={{ fontSize: 16, fontWeight: 700 }}>No HFA staff members found</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Click "Add Staff Account" to create a new internal HFA staff profile.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Staff Name / Email</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Direct Cert Studio</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const isActive = c.is_active !== false;
                  const isUserSuperAdmin = c.role === 'superadmin';
                  const hasDirectPrivilege = isUserSuperAdmin || c.can_issue_direct_certificate === true;

                  return (
                    <tr key={c._id} className="hover-row">
                      <td>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{c.full_name || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email}</div>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>
                        {c.username ? <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{c.username}</span> : '—'}
                      </td>
                      <td>
                        {isSuperAdmin ? (
                          <select
                            className="form-control"
                            style={{ width: 190, padding: '4px 8px', height: 'auto', fontSize: 12, fontWeight: 600 }}
                            value={c.role}
                            onChange={e => handleRoleChange(c._id, e.target.value)}
                          >
                            <option value="superadmin">Superadmin</option>
                            <option value="admin">Administrator</option>
                            <option value="audit_manager">Audit Manager</option>
                            <option value="food_tech_manager">Food Tech Manager</option>
                            <option value="food_tech">Food Technologist</option>
                            <option value="inspector">Auditor</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', padding: '4px 8px', background: '#f1f5f9', borderRadius: 6 }}>
                            {c.role === 'inspector' ? 'AUDITOR' : c.role === 'audit_manager' ? 'AUDIT MANAGER' : c.role?.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td>
                        {isUserSuperAdmin ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              borderRadius: 20,
                              padding: '3px 10px',
                              fontSize: 11.5,
                              fontWeight: 700
                            }}
                          >
                            👑 Full Access (Superadmin)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => isSuperAdmin && handleToggleDirectCertPermission(c._id, c.can_issue_direct_certificate, c.full_name)}
                            disabled={!isSuperAdmin}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: c.can_issue_direct_certificate ? '#ecfdf5' : '#f8fafc',
                              color: c.can_issue_direct_certificate ? '#047857' : '#64748b',
                              border: c.can_issue_direct_certificate ? '1.5px solid #a7f3d0' : '1px dashed #cbd5e1',
                              borderRadius: 20,
                              padding: '4px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isSuperAdmin ? 'pointer' : 'default',
                              transition: 'all 0.15s ease'
                            }}
                            title={isSuperAdmin ? (c.can_issue_direct_certificate ? 'Click to revoke Direct Certificate Studio privilege' : 'Click to grant Direct Certificate Studio privilege') : 'Superadmin permission needed to modify'}
                          >
                            <Sparkles size={13} style={{ color: c.can_issue_direct_certificate ? '#10b981' : '#94a3b8' }} />
                            {c.can_issue_direct_certificate ? '⚡ Granted (Revoke)' : '+ Grant Privilege'}
                          </button>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${isActive ? 'badge-green' : 'badge-red'}`}>
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isSuperAdmin ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {isActive ? (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#ef4444', fontSize: 12 }}
                                onClick={() => { setSuspensionModal(c); setSuspensionReason(''); }}
                                title="Suspend Account"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#16a34a', fontSize: 12 }}
                                onClick={() => handleStatusChange(c._id, true)}
                                title="Activate Account"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#ef4444', padding: '4px 8px' }}
                              onClick={() => handleDeleteStaff(c._id, c.full_name || c.email)}
                              title="Delete Staff Account"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Superadmin Only</span>
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

      {/* ─── Add Staff Modal ─────────────────────────────────────────────── */}
      {showStaffModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Add HFA Staff Account</span>
              <button className="modal-close" onClick={() => setShowStaffModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateStaff}>
              <div className="modal-body" style={{ padding: 24, display: 'grid', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Full Name <span>*</span></label>
                  <input
                    className="form-control"
                    value={staffForm.full_name}
                    onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="e.g. Dr. Alex Johnson"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Staff Role <span>*</span></label>
                  <select
                    className="form-control"
                    value={staffForm.role}
                    onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}
                    required
                  >
                    <option value="food_tech">Food Technologist</option>
                    <option value="food_tech_manager">Food Tech Manager</option>
                    <option value="audit_manager">Audit Manager</option>
                    <option value="admin">Administrator</option>
                    <option value="superadmin">Superadmin</option>
                    <option value="inspector">Auditor</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Username <span>*</span></label>
                  <input
                    className="form-control"
                    value={staffForm.username}
                    onChange={e => setStaffForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="e.g. alex_johnson"
                    required
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Staff members will use their username and password to log in.</p>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Email Address <span>*</span></label>
                  <input
                    type="email"
                    className="form-control"
                    value={staffForm.email}
                    onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="e.g. alex@halalfoodauthority.com"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Password <span>*</span></label>
                  <input
                    type="password"
                    className="form-control"
                    value={staffForm.password}
                    onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Set initial password"
                    required
                  />
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={staffForm.can_issue_direct_certificate}
                      onChange={e => setStaffForm(f => ({ ...f, can_issue_direct_certificate: e.target.checked }))}
                      style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', accentColor: '#16a34a' }}
                    />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Sparkles size={14} style={{ color: '#16a34a' }} /> Grant Direct Certificate Studio Privilege
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>
                        Allows this staff account to directly issue certificates and certify products without requiring an application.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowStaffModal(false)} disabled={staffSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={staffSubmitting}>
                  {staffSubmitting ? 'Creating...' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Suspension Modal ────────────────────────────────────────────── */}
      {suspensionModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <span className="modal-title">Suspend Staff Account</span>
              <button className="modal-close" onClick={() => setSuspensionModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
                Are you sure you want to suspend <strong>{suspensionModal.full_name || suspensionModal.email}</strong>? They will be blocked from logging into the portal until re-activated.
              </p>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Reason for Suspension <span>*</span></label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={suspensionReason}
                  onChange={e => setSuspensionReason(e.target.value)}
                  placeholder="Provide reason..."
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSuspensionModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleStatusChange(suspensionModal._id, false)}>
                Suspend Staff Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
