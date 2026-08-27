import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Search, Shield, Users, UserCheck, PlusCircle, Trash2, X, AlertCircle,
  RefreshCw, KeyRound, Lock, Sparkles, Check, CheckSquare, Square,
  Crown, ClipboardCheck, Eye, FileCheck, Beaker, Edit3, ShieldAlert,
  ChevronRight, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Canonical Role Definitions & Metadata
export const STAFF_ROLE_CONFIG = {
  superadmin: {
    id: 'superadmin',
    label: 'Superadmin',
    shortLabel: 'Superadmin',
    badgeClass: 'badge-purple',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: Crown,
    desc: 'Unrestricted master access to all system features, configurations, and staff accounts.'
  },
  admin: {
    id: 'admin',
    label: 'Administrator',
    shortLabel: 'Admin',
    badgeClass: 'badge-blue',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: Shield,
    desc: 'Full application management, invoicing, contracts, proposals, and operational oversight.'
  },
  audit_manager: {
    id: 'audit_manager',
    label: 'Audit Manager',
    shortLabel: 'Audit Mgr',
    badgeClass: 'badge-amber',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: ClipboardCheck,
    desc: 'Coordinate audit schedules, assign auditors, and review audit reports & NC closures.'
  },
  inspector: {
    id: 'inspector',
    label: 'Auditor',
    shortLabel: 'Auditor',
    badgeClass: 'badge-sky',
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    icon: Eye,
    desc: 'Conduct physical / remote site audits, submit audit findings, and report non-conformities.'
  },
  food_tech_manager: {
    id: 'food_tech_manager',
    label: 'Food Tech Manager',
    shortLabel: 'Food Tech Mgr',
    badgeClass: 'badge-teal',
    color: '#0d9488',
    bg: '#f0fdfa',
    border: '#99f6e4',
    icon: FileCheck,
    desc: 'Manage technical product vetting, formula evaluations, and ingredient sign-offs.'
  },
  food_tech: {
    id: 'food_tech',
    label: 'Food Technologist',
    shortLabel: 'Food Tech',
    badgeClass: 'badge-emerald',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: Beaker,
    desc: 'Evaluate client product specifications, raw material lists, and processing flows.'
  }
};

const ALL_STAFF_ROLE_KEYS = ['superadmin', 'admin', 'audit_manager', 'food_tech_manager', 'food_tech', 'inspector'];

export default function AdminStaff() {
  const { user: loggedInUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'audit' | 'food_tech' | 'special_grants'

  // Staff Creation Modal State (Username removed)
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    full_name: '',
    roles: ['food_tech'],
    can_issue_direct_certificate: false
  });
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Edit Roles Modal State
  const [editRolesModal, setEditRolesModal] = useState(null); // target user
  const [editRolesList, setEditRolesList] = useState([]);
  const [editSpecialGrant, setEditSpecialGrant] = useState(false);
  const [rolesSaving, setRolesSaving] = useState(false);

  // Suspension Modal State
  const [suspensionModal, setSuspensionModal] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  // Superadmin permission check
  const isSuperAdmin = loggedInUser?.role === 'superadmin' || (Array.isArray(loggedInUser?.roles) && loggedInUser.roles.includes('superadmin'));

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

  // Helper to extract normalized roles array from a user
  const getUserRoles = (u) => {
    if (Array.isArray(u.roles) && u.roles.length > 0) return u.roles;
    if (u.role && u.role !== 'client') return [u.role];
    return [];
  };

  // Filter staff members only (exclude clients)
  const staffMembers = users.filter(u => {
    const roles = getUserRoles(u);
    return roles.some(r => ALL_STAFF_ROLE_KEYS.includes(r));
  });

  // Filtered by Search & Role category
  const filtered = staffMembers.filter(s => {
    const userRoles = getUserRoles(s);

    // Role Tab Filter
    if (roleFilter === 'admin' && !userRoles.some(r => ['admin', 'superadmin'].includes(r))) return false;
    if (roleFilter === 'audit' && !userRoles.some(r => ['audit_manager', 'inspector'].includes(r))) return false;
    if (roleFilter === 'food_tech' && !userRoles.some(r => ['food_tech_manager', 'food_tech'].includes(r))) return false;
    if (roleFilter === 'special_grants' && !s.can_issue_direct_certificate && !userRoles.includes('superadmin')) return false;

    // Search query
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const matchesName = s.full_name?.toLowerCase().includes(query);
    const matchesEmail = s.email?.toLowerCase().includes(query);
    const matchesRole = userRoles.some(r => {
      const cfg = STAFF_ROLE_CONFIG[r];
      return cfg?.label.toLowerCase().includes(query) || r.toLowerCase().includes(query);
    });
    return matchesName || matchesEmail || matchesRole;
  });

  // Calculate Stat Summary
  const stats = {
    total: staffMembers.length,
    admins: staffMembers.filter(s => getUserRoles(s).some(r => ['admin', 'superadmin'].includes(r))).length,
    techAudit: staffMembers.filter(s => getUserRoles(s).some(r => ['audit_manager', 'inspector', 'food_tech_manager', 'food_tech'].includes(r))).length,
    specialGrants: staffMembers.filter(s => s.can_issue_direct_certificate || getUserRoles(s).includes('superadmin')).length,
    active: staffMembers.filter(s => s.is_active !== false).length
  };

  // Toggle role in creation form
  const toggleCreateRole = (roleKey) => {
    setStaffForm(prev => {
      const exists = prev.roles.includes(roleKey);
      let nextRoles;
      if (exists) {
        // Must have at least 1 role
        if (prev.roles.length === 1) {
          toast.error('A staff member must have at least one assigned role.');
          return prev;
        }
        nextRoles = prev.roles.filter(r => r !== roleKey);
      } else {
        nextRoles = [...prev.roles, roleKey];
      }
      return { ...prev, roles: nextRoles };
    });
  };

  // Toggle role in edit roles modal
  const toggleEditRole = (roleKey) => {
    setEditRolesList(prev => {
      const exists = prev.includes(roleKey);
      if (exists) {
        if (prev.length === 1) {
          toast.error('A staff member must have at least one assigned role.');
          return prev;
        }
        return prev.filter(r => r !== roleKey);
      }
      return [...prev, roleKey];
    });
  };

  // Handle Create Staff (Username removed)
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return toast.error('Only Superadmin can create staff accounts.');
    if (!staffForm.full_name.trim()) return toast.error('Please enter the staff member\'s full name.');
    if (!staffForm.email.trim()) return toast.error('Please enter a valid email address.');
    if (!staffForm.password.trim()) return toast.error('Please provide an initial password.');
    if (staffForm.roles.length === 0) return toast.error('Please select at least one role for this staff member.');

    setStaffSubmitting(true);
    try {
      await api.post('/api/users', {
        email: staffForm.email.trim(),
        password: staffForm.password.trim(),
        full_name: staffForm.full_name.trim(),
        roles: staffForm.roles,
        role: staffForm.roles[0],
        can_issue_direct_certificate: staffForm.can_issue_direct_certificate
      });
      toast.success(`HFA Staff account created for ${staffForm.full_name.trim()}!`);
      setShowStaffModal(false);
      setStaffForm({
        email: '',
        password: '',
        full_name: '',
        roles: ['food_tech'],
        can_issue_direct_certificate: false
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create staff account');
    } finally {
      setStaffSubmitting(false);
    }
  };

  // Open Edit Roles Modal
  const openEditRoles = (user) => {
    setEditRolesModal(user);
    setEditRolesList(getUserRoles(user));
    setEditSpecialGrant(Boolean(user.can_issue_direct_certificate || user.role === 'superadmin' || (user.roles && user.roles.includes('superadmin'))));
  };

  // Save Edit Roles
  const handleSaveRoles = async () => {
    if (!editRolesModal) return;
    if (editRolesList.length === 0) {
      return toast.error('A staff member must have at least one assigned role.');
    }
    setRolesSaving(true);
    try {
      const grantVal = editRolesList.includes('superadmin') ? true : editSpecialGrant;
      await api.put(`/api/users/${editRolesModal._id}/role`, {
        roles: editRolesList,
        role: editRolesList[0],
        can_issue_direct_certificate: grantVal
      });
      toast.success(`Updated roles & special grants for ${editRolesModal.full_name || editRolesModal.email}`);
      setEditRolesModal(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update roles');
    } finally {
      setRolesSaving(false);
    }
  };

  // Special Grants: Toggle Direct Certificate Studio
  const handleToggleSpecialGrant = async (userId, currentStatus, userName) => {
    if (!isSuperAdmin) return toast.error('Only Superadmin can grant or revoke Special Grants.');
    const nextVal = !currentStatus;
    try {
      await api.put(`/api/users/${userId}/direct-cert-permission`, { can_issue_direct_certificate: nextVal });
      toast.success(`Special Grant: Direct Certificate Studio ${nextVal ? 'granted to' : 'revoked from'} ${userName || 'staff member'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update Special Grant');
    }
  };

  // Suspend / Activate Account
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
      toast.error(err.response?.data?.error || err.message || 'Failed to update staff status');
    }
  };

  // Delete Staff Account
  const handleDeleteStaff = async (id, name) => {
    if (!isSuperAdmin) return toast.error('Only Superadmin can delete staff accounts.');
    if (!window.confirm(`Are you sure you want to permanently remove staff account "${name}"? This action cannot be undone.`)) return;

    try {
      await api.delete(`/api/users/${id}`);
      toast.success('Staff account deleted successfully');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete staff account');
    }
  };

  return (
    <div className="animate-in" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 24,
        color: 'white',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
            flexShrink: 0
          }}>
            <Shield size={26} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'white' }}>
                HFA Staff & User Management
              </h1>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#6ee7b7',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                Internal Directory
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
              Manage internal HFA team accounts, multi-role privileges, credentials, and special administrative grants.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-ghost"
            style={{ color: '#cbd5e1', borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', gap: 6 }}
            onClick={fetchUsers}
            title="Refresh staff list"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {isSuperAdmin && (
            <button
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderColor: '#059669',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                fontWeight: 700,
                gap: 8,
                padding: '10px 20px'
              }}
              onClick={() => setShowStaffModal(true)}
            >
              <PlusCircle size={16} /> Add Staff Account
            </button>
          )}
        </div>
      </div>

      {/* Non-Superadmin notice banner if applicable */}
      {!isSuperAdmin && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
          padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: '#991b1b', fontSize: 13
        }}>
          <Lock size={18} style={{ flexShrink: 0, color: '#dc2626' }} />
          <span><strong>Administrator Notice:</strong> Account provisioning, role assignments, and Special Grant permissions are restricted to Superadmin users.</span>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Total Staff</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>✓ {stats.active} Active accounts</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Administrators</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Shield size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{stats.admins}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Superadmins & Admins</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Technical & Audit</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <Beaker size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{stats.techAudit}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Auditors & Food Techs</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Special Grants</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Sparkles size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{stats.specialGrants}</div>
          <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600, marginTop: 4 }}>Direct Cert Studio Access</div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Search Bar (Search by name, email, or role) */}
        <div style={{ position: 'relative', minWidth: 320, flex: '1 1 320px', maxWidth: 460 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: 40, height: 42, fontSize: 13, borderRadius: 10, border: '1.5px solid #e2e8f0' }}
            placeholder="Search staff by full name, email, or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Staff' },
            { id: 'admin', label: 'Admins' },
            { id: 'audit', label: 'Audit Team' },
            { id: 'food_tech', label: 'Food Tech Team' },
            { id: 'special_grants', label: 'Special Grants' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: roleFilter === tab.id ? '#0f172a' : '#f8fafc',
                color: roleFilter === tab.id ? '#ffffff' : '#475569',
                borderColor: roleFilter === tab.id ? '#0f172a' : '#e2e8f0'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Staff Directory Card */}
      <div className="card shadow-sm border-0" style={{ borderRadius: 16, overflow: 'hidden' }}>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay" style={{ minHeight: 300 }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '80px 20px', textAlign: 'center' }}>
              <div style={{ background: '#f8fafc', color: '#94a3b8', width: 68, height: 68, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid #e2e8f0' }}>
                <Users size={32} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>No staff members found</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, maxWidth: 400, margin: '6px auto 0' }}>
                {search ? `No staff records match "${search}". Try adjusting your search keywords.` : 'Click "Add Staff Account" to create your first internal HFA staff profile.'}
              </div>
              {search && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => setSearch('')}>
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>
                    Staff Member
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>
                    Assigned Roles
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>
                    Special Grants
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(member => {
                  const isActive = member.is_active !== false;
                  const memberRoles = getUserRoles(member);
                  const isUserSuperAdmin = memberRoles.includes('superadmin') || member.role === 'superadmin';
                  const hasDirectPrivilege = isUserSuperAdmin || member.can_issue_direct_certificate === true;

                  // Initials for avatar
                  const nameParts = (member.full_name || member.email || 'HFA').trim().split(' ');
                  const initials = nameParts.length >= 2
                    ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                    : nameParts[0].slice(0, 2).toUpperCase();

                  return (
                    <tr key={member._id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                      {/* 1. Staff Member (Name & Email) */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: isUserSuperAdmin
                              ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                              : 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {member.full_name || 'Staff Member'}
                              {isUserSuperAdmin && <Crown size={13} style={{ color: '#7c3aed' }} />}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{member.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Assigned Roles (Multi-Role Chips + Edit Button) */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {memberRoles.map(roleKey => {
                            const cfg = STAFF_ROLE_CONFIG[roleKey] || {
                              label: roleKey.replace(/_/g, ' '),
                              color: '#475569',
                              bg: '#f1f5f9',
                              border: '#e2e8f0',
                              icon: Shield
                            };
                            const RoleIcon = cfg.icon;
                            return (
                              <span
                                key={roleKey}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  background: cfg.bg,
                                  color: cfg.color,
                                  border: `1.5px solid ${cfg.border}`,
                                  borderRadius: 8,
                                  padding: '3px 9px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <RoleIcon size={12} strokeWidth={2.5} />
                                {cfg.label}
                              </span>
                            );
                          })}

                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => openEditRoles(member)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#f8fafc',
                                border: '1px dashed #cbd5e1',
                                borderRadius: 8,
                                padding: '3px 8px',
                                fontSize: 11.5,
                                fontWeight: 600,
                                color: '#475569',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title="Modify assigned roles for this staff member"
                            >
                              <Edit3 size={11} /> Edit Roles
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 3. Special Grants (Changed from Direct Cert Studio) */}
                      <td style={{ padding: '16px 20px' }}>
                        {isUserSuperAdmin ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1.5px solid #fde68a',
                              borderRadius: 20,
                              padding: '4px 12px',
                              fontSize: 11.5,
                              fontWeight: 700
                            }}
                          >
                            👑 Full Master Access
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => isSuperAdmin && handleToggleSpecialGrant(member._id, member.can_issue_direct_certificate, member.full_name)}
                            disabled={!isSuperAdmin}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: member.can_issue_direct_certificate ? '#ecfdf5' : '#f8fafc',
                              color: member.can_issue_direct_certificate ? '#047857' : '#64748b',
                              border: member.can_issue_direct_certificate ? '1.5px solid #a7f3d0' : '1px dashed #cbd5e1',
                              borderRadius: 20,
                              padding: '5px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isSuperAdmin ? 'pointer' : 'default',
                              transition: 'all 0.15s ease'
                            }}
                            title={isSuperAdmin ? (member.can_issue_direct_certificate ? 'Click to revoke Direct Certificate Studio special grant' : 'Click to grant Direct Certificate Studio privilege') : 'Superadmin permission needed to modify'}
                          >
                            <Sparkles size={13} style={{ color: member.can_issue_direct_certificate ? '#10b981' : '#94a3b8' }} />
                            {member.can_issue_direct_certificate ? '✨ Direct Cert Studio (Active)' : '+ Grant Direct Cert Studio'}
                          </button>
                        )}
                      </td>

                      {/* 4. Status Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          background: isActive ? '#f0fdf4' : '#fef2f2',
                          color: isActive ? '#15803d' : '#b91c1c',
                          border: `1px solid ${isActive ? '#bbf7d0' : '#fecaca'}`
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#16a34a' : '#dc2626' }} />
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      {/* 5. Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        {isSuperAdmin ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 12, padding: '5px 10px', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8 }}
                              onClick={() => openEditRoles(member)}
                              title="Edit Roles"
                            >
                              <Edit3 size={13} style={{ marginRight: 4 }} /> Roles
                            </button>

                            {isActive ? (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#ef4444', fontSize: 12, padding: '5px 10px', border: '1px solid #fee2e2', borderRadius: 8 }}
                                onClick={() => { setSuspensionModal(member); setSuspensionReason(''); }}
                                title="Suspend Account"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#16a34a', fontSize: 12, padding: '5px 10px', border: '1px solid #bbf7d0', borderRadius: 8 }}
                                onClick={() => handleStatusChange(member._id, true)}
                                title="Activate Account"
                              >
                                Activate
                              </button>
                            )}

                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#ef4444', padding: '5px 8px', border: '1px solid #fee2e2', borderRadius: 8 }}
                              onClick={() => handleDeleteStaff(member._id, member.full_name || member.email)}
                              title="Delete Staff Account"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>View Only</span>
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ADD STAFF ACCOUNT MODAL (Username Removed, Multi-Role Ticking)     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showStaffModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowStaffModal(false)}>
          <div className="modal" style={{ maxWidth: 640, width: '92%', borderRadius: 16, overflow: 'hidden', padding: 0, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
                }}>
                  <PlusCircle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Add HFA Staff Account</div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 1 }}>Create credentials and assign multi-role privileges</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowStaffModal(false)}><X size={18} /></button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
              <div className="modal-body" style={{ padding: '24px', display: 'grid', gap: 20, overflowY: 'auto', flex: 1 }}>
                {/* 1. Account Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                      Full Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      className="form-control"
                      value={staffForm.full_name}
                      onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="e.g. Dr. Alex Johnson"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                      Email Address <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={staffForm.email}
                      onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="e.g. alex@halalfoodauthority.com"
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                    Initial Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={staffForm.password}
                    onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Set a secure initial password"
                    required
                  />
                  <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                    The staff member will sign in with their email and this password.
                  </p>
                </div>

                {/* 2. Multi-Role Ticking Selector */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: 0 }}>
                      Assigned Staff Roles <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: 11.5, color: '#059669', fontWeight: 700 }}>
                      {staffForm.roles.length} role{staffForm.roles.length > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 0, marginBottom: 12 }}>
                    Tick all the responsibilities that apply to this staff member. A user can hold multiple roles simultaneously.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {ALL_STAFF_ROLE_KEYS.map(roleKey => {
                      const cfg = STAFF_ROLE_CONFIG[roleKey];
                      const isSelected = staffForm.roles.includes(roleKey);
                      const RoleIcon = cfg.icon;

                      return (
                        <div
                          key={roleKey}
                          onClick={() => toggleCreateRole(roleKey)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '12px 14px',
                            borderRadius: 12,
                            border: `1.5px solid ${isSelected ? cfg.color : '#e2e8f0'}`,
                            background: isSelected ? cfg.bg : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            border: `2px solid ${isSelected ? cfg.color : '#cbd5e1'}`,
                            background: isSelected ? cfg.color : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            marginTop: 1,
                            flexShrink: 0
                          }}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? cfg.color : '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <RoleIcon size={14} />
                              {cfg.label}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.35 }}>
                              {cfg.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Special Grants Section */}
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '16px 18px'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} style={{ color: '#d97706' }} /> Special Grants &amp; Privileges
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                    Optional elevated permissions for specific operational workflows.
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={staffForm.can_issue_direct_certificate}
                      onChange={e => setStaffForm(f => ({ ...f, can_issue_direct_certificate: e.target.checked }))}
                      style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', accentColor: '#10b981' }}
                    />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        Grant Direct Certificate Studio Privilege
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 2, lineHeight: 1.4 }}>
                        Allows this staff account to directly generate certificates and certify products outside standard client application flows.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 12,
                flexShrink: 0
              }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowStaffModal(false)} disabled={staffSubmitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderColor: '#059669',
                    padding: '10px 24px',
                    fontWeight: 700
                  }}
                  disabled={staffSubmitting}
                >
                  {staffSubmitting ? 'Creating Account...' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EDIT STAFF ROLES & SPECIAL GRANTS MODAL (Scrollable & Integrated)   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {editRolesModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setEditRolesModal(null)}>
          <div className="modal" style={{ maxWidth: 620, width: '92%', borderRadius: 16, overflow: 'hidden', padding: 0, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Edit3 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    Edit Roles for {editRolesModal.full_name || editRolesModal.email}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{editRolesModal.email}</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setEditRolesModal(null)}><X size={18} /></button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'grid', gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Select Active Roles for this Staff Member
                </div>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 0, marginBottom: 12 }}>
                  Tick or untick roles to update privileges. A staff member can have multiple assigned roles.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  {ALL_STAFF_ROLE_KEYS.map(roleKey => {
                    const cfg = STAFF_ROLE_CONFIG[roleKey];
                    const isSelected = editRolesList.includes(roleKey);
                    const RoleIcon = cfg.icon;

                    return (
                      <div
                        key={roleKey}
                        onClick={() => toggleEditRole(roleKey)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 16px',
                          borderRadius: 12,
                          border: `1.5px solid ${isSelected ? cfg.color : '#e2e8f0'}`,
                          background: isSelected ? cfg.bg : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: `2px solid ${isSelected ? cfg.color : '#cbd5e1'}`,
                          background: isSelected ? cfg.color : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          flexShrink: 0
                        }}>
                          {isSelected && <Check size={15} strokeWidth={3} />}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: isSelected ? cfg.color : '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <RoleIcon size={15} />
                            {cfg.label}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                            {cfg.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Special Grants Section */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1.5px solid #e2e8f0',
                borderRadius: 14,
                padding: '16px 18px'
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} style={{ color: '#d97706' }} /> Special Grants &amp; Privileges
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                  Special elevated operational privileges for direct certificate issuance and product approvals.
                </div>

                {editRolesList.includes('superadmin') ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, fontSize: 12.5, color: '#92400e', fontWeight: 700 }}>
                    👑 Superadmin accounts automatically possess all Special Grants.
                  </div>
                ) : (
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={editSpecialGrant}
                      onChange={e => setEditSpecialGrant(e.target.checked)}
                      style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', accentColor: '#10b981' }}
                    />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        Grant Direct Certificate Studio Privilege
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 2, lineHeight: 1.4 }}>
                        Allows this staff account to directly generate certificates and certify products outside standard client application flows.
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              flexShrink: 0
            }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditRolesModal(null)} disabled={rolesSaving}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#2563eb', borderColor: '#2563eb', padding: '10px 24px', fontWeight: 700 }}
                onClick={handleSaveRoles}
                disabled={rolesSaving}
              >
                {rolesSaving ? 'Saving...' : 'Save Role Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SUSPENSION MODAL                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {suspensionModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setSuspensionModal(null)}>
          <div className="modal" style={{ maxWidth: 480, width: '92%', borderRadius: 16, overflow: 'hidden', padding: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#991b1b' }}>Suspend Staff Account</div>
                  <div style={{ fontSize: 12, color: '#b91c1c' }}>{suspensionModal.full_name || suspensionModal.email}</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSuspensionModal(null)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ padding: 24 }}>
              <p style={{ fontSize: 13, color: '#475569', marginTop: 0, lineHeight: 1.5 }}>
                Are you sure you want to suspend <strong>{suspensionModal.full_name || suspensionModal.email}</strong>? They will be immediately prevented from accessing the internal portal.
              </p>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                  Reason for Suspension <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={suspensionReason}
                  onChange={e => setSuspensionReason(e.target.value)}
                  placeholder="State the operational or security reason for suspension..."
                  required
                />
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12
            }}>
              <button className="btn btn-ghost" onClick={() => setSuspensionModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626', fontWeight: 700 }}
                onClick={() => handleStatusChange(suspensionModal._id, false)}
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
