import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Search, Eye, Users, Shield, Briefcase, Award, FileText, Trash2, X, AlertCircle, UserCheck, PlusCircle, History, CheckCircle, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminClients() {
  const { user: loggedInUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [impersonationLogs, setImpersonationLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || 'company';

  // Suspension Modal State
  const [suspensionModal, setSuspensionModal] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  // Staff Creation Modal State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'food_tech',
    username: ''
  });
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Client Company Registration Modal State
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    full_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    postcode: '',
    country: 'United Kingdom'
  });
  const [companySubmitting, setCompanySubmitting] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/api/users')
      .then(d => setUsers(d.data || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  const fetchImpersonationLogs = () => {
    setLogsLoading(true);
    api.get('/api/auth/impersonate/logs')
      .then(res => setImpersonationLogs(res || []))
      .catch(() => toast.error('Failed to load impersonation logs'))
      .finally(() => setLogsLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (category === 'impersonations') {
      fetchImpersonationLogs();
    }
  }, [category]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/api/users/${userId}/role`, { role: newRole });
      toast.success('User role updated successfully');
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update user role');
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.email.trim() || !staffForm.password.trim() || !staffForm.full_name.trim()) {
      return toast.error('Please fill in all required fields.');
    }
    if (staffForm.role === 'admin' && !staffForm.username.trim()) {
      return toast.error('Username is required for Admin role.');
    }

    setStaffSubmitting(true);
    try {
      await api.post('/api/users', staffForm);
      toast.success('HFA Staff account created successfully!');
      setShowStaffModal(false);
      setStaffForm({ email: '', password: '', full_name: '', role: 'food_tech', username: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to create staff account');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!companyForm.company_name.trim()) return toast.error('Company Name is required.');
    if (!companyForm.email.trim()) return toast.error('Email address is required.');
    if (!companyForm.password.trim()) return toast.error('Password is required.');
    if (!companyForm.full_name.trim()) return toast.error('Primary Contact Name is required.');

    setCompanySubmitting(true);
    try {
      await api.post('/api/users', { ...companyForm, role: 'client' });
      toast.success(`Company "${companyForm.company_name}" registered successfully!`);
      setShowCompanyModal(false);
      setCompanyForm({
        company_name: '',
        full_name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        postcode: '',
        country: 'United Kingdom'
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to register company.');
    } finally {
      setCompanySubmitting(false);
    }
  };

  const handleStatusChange = async (id, isActivating) => {
    try {
      if (!isActivating && !suspensionReason.trim()) {
        return toast.error('Please provide a reason for suspension');
      }

      await api.put(`/api/users/${id}/status`, {
        is_active: isActivating,
        suspension_reason: isActivating ? null : suspensionReason
      });

      toast.success(isActivating ? 'Account activated' : 'Account suspended');
      setSuspensionModal(null);
      setSuspensionReason('');
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleVerifyEmail = async (id) => {
    try {
      await api.put(`/api/users/${id}/verify-email`);
      toast.success('Client email verified successfully!');
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to verify email');
    }
  };

  const handleImpersonate = async (clientId) => {
    setImpersonatingId(clientId);
    try {
      // 1. POST request to generate single-use opaque code
      const res = await api.post(`/api/auth/impersonate/${clientId}`);
      const code = res.code;
      if (!code) throw new Error('Failed to retrieve impersonation code.');

      // 2. Open client portal in new tab with the opaque code
      const clientOrigin = import.meta.env.VITE_CLIENT_URL
        || (window.location.origin.includes('localhost')
          ? 'http://localhost:5173'
          : window.location.origin.replace('admin.', 'portal.').replace('-admin', ''));

      const impersonateUrl = `${clientOrigin}/login?impersonate_code=${code}`;

      toast.success('Impersonation session created! Opening in a new tab.');
      window.open(impersonateUrl, '_blank');
    } catch (err) {
      toast.error(err.message || 'Failed to initiate impersonation.');
    } finally {
      setImpersonatingId(null);
    }
  };

  const getTitle = () => {
    if (category === 'processing') return 'Processing List (Pending Applications)';
    if (category === 'signups') return 'Company List (New Sign-ups)';
    if (category === 'bin') return 'Bin List (Suspended Companies)';
    if (category === 'staff') return 'HFA Staff & User Management';
    if (category === 'impersonations') return 'Admin Impersonation Logs';
    if (category === 'all') return 'All Registered Companies';
    return 'Company List (Certified Clients)';
  };

  const getIcon = () => {
    if (category === 'processing') return <Briefcase size={20} />;
    if (category === 'signups') return <UserPlus size={20} />;
    if (category === 'bin') return <Trash2 size={20} />;
    if (category === 'staff') return <UserCheck size={20} />;
    if (category === 'impersonations') return <History size={20} />;
    if (category === 'all') return <Users size={20} />;
    return <Award size={20} />;
  };

  // Filter clients/staff based on category and search
  const filtered = users.filter(c => {
    // 1. Search Filter
    if (search) {
      const s = search.toLowerCase();
      const nameMatch = c.full_name?.toLowerCase().includes(s) || c.company_name?.toLowerCase().includes(s);
      const emailMatch = c.email?.toLowerCase().includes(s);
      if (!nameMatch && !emailMatch) return false;
    }

    // 2. Staff filtering
    if (category === 'staff') {
      return c.role !== 'client';
    }

    // 3. Client filtering
    if (c.role !== 'client') return false;

    const isActive = c.is_active !== false;
    const isSuspended = !!c.suspension_reason;

    if (category === 'bin') {
      return isSuspended || !isActive;
    } else {
      if (isSuspended) return false;
      if (category === 'processing') {
        return c.appCount > 0 && (c.certCount || 0) === 0;
      } else if (category === 'signups') {
        return (c.appCount || 0) === 0 && (c.certCount || 0) === 0;
      } else if (category === 'all') {
        return true;
      } else if (category === 'company') {
        return (c.certCount || 0) > 0 || (c.appCount > 0 && c.approvedAppCount > 0);
      }
    }
    return true;
  });

  const isAdmin = loggedInUser?.role === 'admin' || loggedInUser?.role === 'superadmin';

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12, flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${category === 'company' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSearchParams({ category: 'company' })}>Certified Clients</button>
        <button className={`btn btn-sm ${category === 'processing' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSearchParams({ category: 'processing' })}>Processing</button>
        <button className={`btn btn-sm ${category === 'signups' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSearchParams({ category: 'signups' })}>Sign-ups</button>
        <button className={`btn btn-sm ${category === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSearchParams({ category: 'all' })}>All Companies</button>
        <button className={`btn btn-sm ${category === 'bin' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSearchParams({ category: 'bin' })}>Suspended</button>
        {isAdmin && (
          <button className={`btn btn-sm ${category === 'impersonations' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSearchParams({ category: 'impersonations' })}>Impersonation Logs</button>
        )}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="badge badge-gray" style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>
            {category === 'impersonations' ? `${impersonationLogs.length} Sessions` : `${filtered.length} Companies`}
          </span>
          {category !== 'impersonations' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCompanyModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <PlusCircle size={15} /> Register Company
            </button>
          )}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', background: '#fff' }}>
          <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: 10, borderRadius: 12, display: 'flex' }}>{getIcon()}</div>
          <div>
            <div className="card-title" style={{ fontSize: 18, fontWeight: 700 }}>{getTitle()}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {category === 'staff' ? 'Manage internal HFA roles and credentials' :
                category === 'impersonations' ? 'Tamper-evident audit trail of all administrator impersonation actions' :
                category === 'signups' ? 'Newly registered corporate companies who recently signed up' :
                category === 'processing' ? 'Corporate clients with active applications under review' :
                category === 'all' ? 'Comprehensive directory of all registered corporate clients' :
                'Manage corporate clients and their status'}
            </div>
          </div>
        </div>

        <div className="table-wrap">
          {loading && category !== 'impersonations' ? <div className="loading-overlay"><div className="spinner" /></div> :
            category === 'impersonations' ? (
              // Impersonation Logs Table
              logsLoading ? <div className="loading-overlay"><div className="spinner" /></div> :
                impersonationLogs.length === 0 ? (
                  <div className="empty-state" style={{ padding: '60px 20px' }}>
                    <History size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                    <div className="empty-state-title" style={{ fontSize: 16, fontWeight: 700 }}>No impersonation history</div>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Administrator</th>
                        <th>Client Company</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {impersonationLogs.map(l => {
                        const adminName = l.admin_id?.full_name || 'Deleted Admin';
                        const adminEmail = l.admin_id?.email || '—';
                        const clientName = l.client_id?.company_name || l.client_id?.full_name || 'Deleted Client';
                        const clientEmail = l.client_id?.email || '—';

                        return (
                          <tr key={l._id} className="hover-row">
                            <td>
                              <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{adminName}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{adminEmail}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{clientName}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{clientEmail}</div>
                            </td>
                            <td style={{ fontSize: 13, fontWeight: 500 }}>
                              {new Date(l.started_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td style={{ fontSize: 13, fontWeight: 500 }}>
                              {l.ended_at ? new Date(l.ended_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                            </td>
                            <td>
                              {l.ended_at ? (
                                <span className="badge badge-gray" style={{ fontSize: 10 }}>Ended</span>
                              ) : (
                                <span className="badge badge-yellow" style={{ fontSize: 10 }}>Active Session</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
            ) : filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <div className="empty-state-icon" style={{ background: '#f8fafc', color: '#cbd5e1', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Users size={32} /></div>
                <div className="empty-state-title" style={{ fontSize: 16, fontWeight: 700 }}>No users found</div>
              </div>
            ) : (
              // Clients Table
              <table>
                <thead>
                  <tr>
                    <th>Company / Email</th>
                    <th>Primary Contact</th>
                    <th>Activity Stats</th>
                    <th>Joined Date</th>
                    <th>Current Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c._id} className="hover-row">
                      <td>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{c.company_name || c.full_name || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>{c.email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{c.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone || '—'}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span title="Total Applications" style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: 6 }}>
                            <FileText size={12} /> {c.appCount || 0}
                          </span>
                          <span title="Active Certificates" style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, background: '#f0fdf4', padding: '4px 8px', borderRadius: 6, color: '#166534' }}>
                            <Award size={12} /> {c.certCount || 0}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(c.created_at || c.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        {c.suspension_reason ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span className="badge badge-red" style={{ alignSelf: 'flex-start' }}>Suspended</span>
                            <span style={{ fontSize: 10, color: '#ef4444', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.suspension_reason}>Reason: {c.suspension_reason}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span className={`badge ${c.is_verified ? 'badge-green' : 'badge-yellow'}`}>
                              {c.is_verified ? 'Email Verified' : 'Unverified Email'}
                            </span>
                            {(c.appCount || 0) === 0 && (c.certCount || 0) === 0 && (
                              <span className="badge badge-blue" style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                New Sign-up
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                          {isAdmin && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{
                                color: '#b45309',
                                fontWeight: 800,
                                border: '1.5px solid #fde68a',
                                background: '#fef3c7',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                borderRadius: 8,
                                padding: '6px 12px'
                              }}
                              disabled={impersonatingId !== null}
                              onClick={() => handleImpersonate(c._id)}
                              title="Log into client dashboard as this client"
                            >
                              {impersonatingId === c._id ? (
                                <span className="spinner" style={{ width: 12, height: 12, borderTopColor: '#d97706' }} />
                              ) : (
                                <>
                                  <Eye size={13} /> Login as Client
                                </>
                              )}
                            </button>
                          )}

                          {/* Suspended Client -> Reactivate button */}
                          {c.suspension_reason && (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{
                                background: '#16a34a',
                                borderColor: '#16a34a',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                borderRadius: 8,
                                padding: '6px 12px'
                              }}
                              onClick={() => handleStatusChange(c._id, true)}
                              title="Reactivate suspended client account"
                            >
                              <UserCheck size={13} /> Reactivate
                            </button>
                          )}

                          {/* Unverified Email -> Verify Email button in case client did not receive email */}
                          {!c.is_verified && !c.suspension_reason && (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{
                                background: '#0284c7',
                                borderColor: '#0284c7',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                borderRadius: 8,
                                padding: '6px 12px'
                              }}
                              onClick={() => handleVerifyEmail(c._id)}
                              title="Manually verify email (in case client did not receive verification email)"
                            >
                              <CheckCircle size={13} /> Verify Email
                            </button>
                          )}

                          {!c.suspension_reason && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#ef4444', fontWeight: 600, border: '1px solid #fee2e2', borderRadius: 8, padding: '6px 10px' }}
                              onClick={() => setSuspensionModal(c)}
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      {/* Staff Account Modal */}
      {showStaffModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">Create Staff Account</span>
              <button className="modal-close" onClick={() => setShowStaffModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateStaff}>
              <div className="modal-body" style={{ padding: 24 }}>
                <div className="form-group">
                  <label className="form-label">Full Name <span>*</span></label>
                  <input className="form-control" value={staffForm.full_name} onChange={e => setStaffForm(s => ({ ...s, full_name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address <span>*</span></label>
                  <input type="email" className="form-control" value={staffForm.email} onChange={e => setStaffForm(s => ({ ...s, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span>*</span></label>
                  <input type="password" className="form-control" value={staffForm.password} onChange={e => setStaffForm(s => ({ ...s, password: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Role <span>*</span></label>
                  <select className="form-control" value={staffForm.role} onChange={e => setStaffForm(s => ({ ...s, role: e.target.value }))} required>
                    <option value="scheme_manager">Scheme Manager</option>
                    <option value="certificate_officer">Certificate Officer</option>
                    <option value="accountant">Accountant</option>
                    <option value="food_tech">Food Tech Inspector</option>
                    <option value="food_tech_manager">Food Tech Manager</option>
                    <option value="audit_manager">Audit Manager</option>
                    <option value="admin">Administrator</option>
                    <option value="inspector">Auditor</option>
                  </select>
                </div>
                {staffForm.role === 'admin' && (
                  <div className="form-group animate-in">
                    <label className="form-label">Username (Admin only) <span>*</span></label>
                    <input className="form-control" value={staffForm.username} onChange={e => setStaffForm(s => ({ ...s, username: e.target.value }))} required />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowStaffModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={staffSubmitting}>
                  {staffSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspension Reason Modal */}
      {suspensionModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#fee2e2', color: '#ef4444', padding: 8, borderRadius: 10 }}><AlertCircle size={20} /></div>
                <div className="modal-title">Suspend Company</div>
              </div>
              <button className="modal-close" onClick={() => { setSuspensionModal(null); setSuspensionReason(''); }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{suspensionModal.company_name || suspensionModal.full_name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{suspensionModal.email}</div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Reason for Suspension</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="e.g. Failure to comply with Halal standards, missing documentation, or unpaid fees..."
                  value={suspensionReason}
                  onChange={e => setSuspensionReason(e.target.value)}
                  style={{ resize: 'none', fontSize: 14 }}
                ></textarea>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>This reason will be recorded in the system and visible to other administrators.</p>
              </div>
            </div>
            <div className="modal-footer" style={{ background: '#f8fafc' }}>
              <button className="btn btn-ghost" onClick={() => { setSuspensionModal(null); setSuspensionReason(''); }}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => handleStatusChange(suspensionModal._id, false)}
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Register Company Modal */}
      {showCompanyModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: 8, borderRadius: 10 }}>
                  <PlusCircle size={20} />
                </div>
                <div>
                  <div className="modal-title">Register New Company</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Create a corporate client account directly</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowCompanyModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateCompany}>
              <div className="modal-body" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Company Name <span>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Halal Food Express Ltd"
                    value={companyForm.company_name}
                    onChange={e => setCompanyForm(c => ({ ...c, company_name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Contact Person <span>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={companyForm.full_name}
                    onChange={e => setCompanyForm(c => ({ ...c, full_name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address <span>*</span></label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="client@company.com"
                    value={companyForm.email}
                    onChange={e => setCompanyForm(c => ({ ...c, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password <span>*</span></label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Create a secure password"
                    value={companyForm.password}
                    onChange={e => setCompanyForm(c => ({ ...c, password: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="+44 20 1234 5678"
                    value={companyForm.phone}
                    onChange={e => setCompanyForm(c => ({ ...c, phone: e.target.value }))}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Facility Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Street, City, Postal Code"
                    value={companyForm.address}
                    onChange={e => setCompanyForm(c => ({ ...c, address: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ background: '#f8fafc' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCompanyModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={companySubmitting}>
                  {companySubmitting ? 'Registering...' : 'Register Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
