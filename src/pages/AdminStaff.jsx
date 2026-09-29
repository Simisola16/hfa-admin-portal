import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Search, Shield, Users, UserCheck, PlusCircle, Trash2, X, AlertCircle,
  RefreshCw, KeyRound, Lock, Sparkles, Check, CheckSquare, Square, CheckCircle,
  Crown, ClipboardCheck, Eye, EyeOff, FileCheck, Beaker, Edit3, ShieldAlert,
  ChevronRight, Filter, ClipboardList, Award, FileBarChart, Receipt, DollarSign,
  UserCog, Ban, UserCheck2, RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';

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
    desc: 'Full application management, system oversight, workflows, and operational supervision.'
  },
  scheme_manager: {
    id: 'scheme_manager',
    label: 'Scheme Manager',
    shortLabel: 'Scheme Mgr',
    badgeClass: 'badge-indigo',
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    icon: ClipboardList,
    desc: 'Accept, reject, or put applications on hold, issue proposals, and send certification agreements.'
  },
  certificate_officer: {
    id: 'certificate_officer',
    label: 'Certificate Officer',
    shortLabel: 'Cert Officer',
    badgeClass: 'badge-emerald',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: Award,
    desc: 'Generate, issue, and manage official Halal Certificates, surveillance letters, and certificate reviews.'
  },
  accountant: {
    id: 'accountant',
    label: 'Accountant',
    shortLabel: 'Accountant',
    badgeClass: 'badge-amber',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: FileBarChart,
    desc: 'Issue initial, renewal, and final invoices, confirm payment receipts, and manage financial accounts.'
  },
  audit_manager: {
    id: 'audit_manager',
    label: 'Audit Manager',
    shortLabel: 'Audit Mgr',
    badgeClass: 'badge-sky',
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    icon: ClipboardCheck,
    desc: 'Coordinate audit schedules, assign auditors, and review audit reports & NC closures.'
  },
  inspector: {
    id: 'inspector',
    label: 'Auditor',
    shortLabel: 'Auditor',
    badgeClass: 'badge-cyan',
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
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
    badgeClass: 'badge-green',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: Beaker,
    desc: 'Evaluate client product specifications, raw material lists, and processing flows.'
  }
};

export const ALL_STAFF_ROLE_KEYS = [
  'superadmin',
  'admin',
  'scheme_manager',
  'certificate_officer',
  'accountant',
  'audit_manager',
  'food_tech_manager',
  'food_tech',
  'inspector'
];

export default function AdminStaff() {
  const { user: loggedInUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'audit' | 'food_tech' | 'special_grants'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Staff Creation Modal State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
    roles: ['food_tech'],
    can_issue_direct_certificate: false,
    is_support_manager: false,
    can_sign_logsheet: false,
    can_review_certificate: false,
    can_mark_done: false
  });
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Edit Roles Modal State
  const [editRolesModal, setEditRolesModal] = useState(null); // target user
  const [editRolesList, setEditRolesList] = useState([]);
  const [editSpecialGrant, setEditSpecialGrant] = useState(false);
  const [editSupportManagerGrant, setEditSupportManagerGrant] = useState(false);
  const [editSignaturePrivilege, setEditSignaturePrivilege] = useState(false);
  const [editReviewCertPrivilege, setEditReviewCertPrivilege] = useState(false);
  const [editDonePrivilege, setEditDonePrivilege] = useState(false);
  const [rolesSaving, setRolesSaving] = useState(false);

  // Edit User (Login Details) Modal State
  const [editUserModal, setEditUserModal] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ full_name: '', email: '', username: '', password: '', phone: '' });
  const [editUserShowPwd, setEditUserShowPwd] = useState(false);
  const [editUserSaving, setEditUserSaving] = useState(false);

  // Suspension Modal State
  const [suspensionModal, setSuspensionModal] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  // Staff Action Modal (3-dot popup)
  const [staffActionModal, setStaffActionModal] = useState(null); // holds the selected member

  // Superadmin permission check
  const isSuperAdmin = loggedInUser?.role === 'superadmin' || (Array.isArray(loggedInUser?.roles) && loggedInUser.roles.includes('superadmin'));

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users?category=staff&all=true');
      const loaded = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.data) ? res.data.data : []);
      setUsers(loaded);
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
    if (roleFilter === 'admin' && !userRoles.includes('admin')) return false;
    if (roleFilter === 'superadmin' && !userRoles.includes('superadmin')) return false;
    if (roleFilter === 'scheme_manager' && !userRoles.includes('scheme_manager')) return false;
    if (roleFilter === 'certificate_officer' && !userRoles.includes('certificate_officer')) return false;
    if (roleFilter === 'accountant' && !userRoles.includes('accountant')) return false;
    if (roleFilter === 'audit' && !userRoles.some(r => ['audit_manager', 'inspector'].includes(r))) return false;
    if (roleFilter === 'food_tech' && !userRoles.some(r => ['food_tech_manager', 'food_tech'].includes(r))) return false;
    if (roleFilter === 'special_grants' && !s.can_issue_direct_certificate && !s.can_sign_logsheet && !s.can_review_certificate && !s.can_mark_done && !s.is_support_manager && !userRoles.includes('superadmin')) return false;
    if (roleFilter === 'support_manager' && !s.is_support_manager && !userRoles.includes('superadmin') && !userRoles.includes('support_manager')) return false;

    // Search query
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const matchesName = s.full_name?.toLowerCase().includes(query);
    const matchesEmail = s.email?.toLowerCase().includes(query);
    const matchesUsername = s.username?.toLowerCase().includes(query);
    const matchesRole = userRoles.some(r => {
      const cfg = STAFF_ROLE_CONFIG[r];
      return cfg?.label.toLowerCase().includes(query) || r.toLowerCase().includes(query);
    });
    return matchesName || matchesEmail || matchesUsername || matchesRole;
  });

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const paginatedStaff = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Calculate Stat Summary
  const stats = {
    total: staffMembers.length,
    admins: staffMembers.filter(s => getUserRoles(s).includes('admin')).length,
    superadmins: staffMembers.filter(s => getUserRoles(s).includes('superadmin')).length,
    schemeManagers: staffMembers.filter(s => getUserRoles(s).includes('scheme_manager')).length,
    certificateOfficers: staffMembers.filter(s => getUserRoles(s).includes('certificate_officer')).length,
    accountants: staffMembers.filter(s => getUserRoles(s).includes('accountant')).length,
    techAudit: staffMembers.filter(s => getUserRoles(s).some(r => ['audit_manager', 'inspector', 'food_tech_manager', 'food_tech'].includes(r))).length,
    specialGrants: staffMembers.filter(s => s.can_issue_direct_certificate || s.can_sign_logsheet || s.can_review_certificate || s.can_mark_done || s.is_support_manager || getUserRoles(s).includes('superadmin')).length,
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

  // Handle Create Staff (Username supported)
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
        username: staffForm.username?.trim() || undefined,
        password: staffForm.password.trim(),
        full_name: staffForm.full_name.trim(),
        roles: staffForm.roles,
        role: staffForm.roles[0],
        can_issue_direct_certificate: staffForm.can_issue_direct_certificate,
        is_support_manager: staffForm.is_support_manager,
        can_sign_logsheet: staffForm.can_sign_logsheet,
        can_review_certificate: staffForm.can_review_certificate,
        can_mark_done: staffForm.can_mark_done
      });
      toast.success(`HFA Staff account created for ${staffForm.full_name.trim()}!`);
      setShowStaffModal(false);
      setStaffForm({
        email: '',
        username: '',
        password: '',
        full_name: '',
        roles: ['food_tech'],
        can_issue_direct_certificate: false,
        is_support_manager: false,
        can_sign_logsheet: false,
        can_review_certificate: false,
        can_mark_done: false
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
    const isSA = Boolean(user.role === 'superadmin' || (user.roles && user.roles.includes('superadmin')));
    setEditSpecialGrant(Boolean(user.can_issue_direct_certificate || isSA));
    setEditSupportManagerGrant(Boolean(user.is_support_manager || user.role === 'superadmin' || user.role === 'support_manager' || isSA));
    setEditSignaturePrivilege(Boolean(user.can_sign_logsheet || isSA));
    setEditReviewCertPrivilege(Boolean(user.can_review_certificate || isSA));
    setEditDonePrivilege(Boolean(user.can_mark_done || isSA));
  };

  // Save Edit Roles
  const handleSaveRoles = async () => {
    if (!editRolesModal) return;
    if (editRolesList.length === 0) {
      return toast.error('A staff member must have at least one assigned role.');
    }
    setRolesSaving(true);
    const targetId = editRolesModal._id || editRolesModal.id;
    const grantVal = editRolesList.includes('superadmin') ? true : editSpecialGrant;
    const smVal = editRolesList.includes('superadmin') ? true : editSupportManagerGrant;
    const signVal = editRolesList.includes('superadmin') ? true : editSignaturePrivilege;
    const reviewCertVal = editRolesList.includes('superadmin') ? true : editReviewCertPrivilege;
    const doneVal = editRolesList.includes('superadmin') ? true : editDonePrivilege;
    try {
      await api.put(`/api/users/${targetId}/role`, {
        roles: editRolesList,
        role: editRolesList[0],
        can_issue_direct_certificate: grantVal,
        is_support_manager: smVal,
        can_sign_logsheet: signVal,
        can_review_certificate: reviewCertVal,
        can_mark_done: doneVal
      });
      toast.success(`Updated roles & special grants for ${editRolesModal.full_name || editRolesModal.email}`);
      
      // Immediate local state update for instant UI feedback:
      setUsers(prev => (Array.isArray(prev) ? prev : []).map(u => {
        const uId = u._id || u.id;
        if (uId === targetId) {
          return {
            ...u,
            roles: editRolesList,
            role: editRolesList[0],
            can_issue_direct_certificate: grantVal,
            is_support_manager: smVal,
            can_sign_logsheet: signVal,
            can_review_certificate: reviewCertVal,
            can_mark_done: doneVal
          };
        }
        return u;
      }));

      setEditRolesModal(null);
      await fetchUsers();
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
      setUsers(prev => (Array.isArray(prev) ? prev : []).map(u => (u._id === userId || u.id === userId) ? { ...u, can_issue_direct_certificate: nextVal } : u));
      await api.put(`/api/users/${userId}/direct-cert-permission`, { can_issue_direct_certificate: nextVal });
      toast.success(`Special Grant: Direct Certificate Studio ${nextVal ? 'granted to' : 'revoked from'} ${userName || 'staff member'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update Special Grant');
      fetchUsers();
    }
  };

  // Special Grants: Toggle Support Manager Privilege
  const handleToggleSupportManager = async (userId, currentStatus, userName) => {
    if (!isSuperAdmin) return toast.error('Only Superadmin can grant or revoke the Support Manager privilege.');
    const nextVal = !currentStatus;
    try {
      setUsers(prev => (Array.isArray(prev) ? prev : []).map(u => (u._id === userId || u.id === userId) ? { ...u, is_support_manager: nextVal } : u));
      await api.put(`/api/users/${userId}/support-manager-permission`, { is_support_manager: nextVal });
      toast.success(`Support Manager privilege ${nextVal ? 'granted to' : 'revoked from'} ${userName || 'staff member'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update Support Manager privilege');
      fetchUsers();
    }
  };

  // Special Grants: Toggle Signature Privilege
  const handleToggleSignaturePrivilege = async (userId, currentStatus, userName) => {
    if (!isSuperAdmin) return toast.error('Only Superadmin can grant or revoke the Signature Privilege.');
    const nextVal = !currentStatus;
    try {
      setUsers(prev => (Array.isArray(prev) ? prev : []).map(u => (u._id === userId || u.id === userId) ? { ...u, can_sign_logsheet: nextVal } : u));
      await api.put(`/api/users/${userId}/logsheet-sign-permission`, { can_sign_logsheet: nextVal });
      toast.success(`Signature Privilege ${nextVal ? 'granted to' : 'revoked from'} ${userName || 'staff member'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update Signature Privilege');
      fetchUsers();
    }
  };

  // Special Grants: Toggle Review Certificate Privilege
  const handleToggleReviewCertPrivilege = async (userId, currentStatus, userName) => {
    if (!isSuperAdmin) return toast.error('Only Superadmin can grant or revoke the Review Certificate Privilege.');
    const nextVal = !currentStatus;
    try {
      setUsers(prev => (Array.isArray(prev) ? prev : []).map(u => (u._id === userId || u.id === userId) ? { ...u, can_review_certificate: nextVal } : u));
      await api.put(`/api/users/${userId}/review-certificate-permission`, { can_review_certificate: nextVal });
      toast.success(`Review Certificate Privilege ${nextVal ? 'granted to' : 'revoked from'} ${userName || 'staff member'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update Review Certificate Privilege');
      fetchUsers();
    }
  };

  // Special Grants: Toggle Done Privilege
  const handleToggleDonePrivilege = async (userId, currentStatus, userName) => {
    if (!isSuperAdmin) return toast.error('Only Superadmin can grant or revoke the Done Privilege.');
    const nextVal = !currentStatus;
    try {
      setUsers(prev => (Array.isArray(prev) ? prev : []).map(u => (u._id === userId || u.id === userId) ? { ...u, can_mark_done: nextVal } : u));
      await api.put(`/api/users/${userId}/mark-done-permission`, { can_mark_done: nextVal });
      toast.success(`Done Privilege ${nextVal ? 'granted to' : 'revoked from'} ${userName || 'staff member'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update Done Privilege');
      fetchUsers();
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

  // Open Edit User Modal
  const openEditUser = (user) => {
    setEditUserModal(user);
    setEditUserForm({
      full_name: user.full_name || '',
      email: user.email || '',
      username: user.username || '',
      password: '',
      phone: user.phone || ''
    });
    setEditUserShowPwd(false);
  };

  // Save Edit User (Login Details)
  const handleSaveEditUser = async () => {
    if (!editUserModal) return;
    if (!editUserForm.full_name.trim()) return toast.error('Full name is required.');
    if (!editUserForm.email.trim()) return toast.error('Email address is required.');
    if (editUserForm.password && editUserForm.password.length < 6) return toast.error('New password must be at least 6 characters.');
    setEditUserSaving(true);
    const targetId = editUserModal._id || editUserModal.id;
    try {
      const payload = {
        full_name: editUserForm.full_name.trim(),
        email: editUserForm.email.trim(),
        username: editUserForm.username.trim() || undefined,
        phone: editUserForm.phone.trim() || undefined,
      };
      if (editUserForm.password.trim()) payload.password = editUserForm.password.trim();
      await api.put(`/api/users/${targetId}`, payload);
      toast.success(`Login details updated for ${editUserForm.full_name.trim()}`);
      setUsers(prev => (Array.isArray(prev) ? prev : []).map(u => {
        const uId = u._id || u.id;
        if (uId === targetId) {
          return { ...u, full_name: payload.full_name, email: payload.email, username: payload.username || u.username, phone: payload.phone || u.phone };
        }
        return u;
      }));
      setEditUserModal(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update staff details');
    } finally {
      setEditUserSaving(false);
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Scheme Managers</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
              <ClipboardList size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{stats.schemeManagers}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Applications & Agreements</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Certificate Officers</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <Award size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{stats.certificateOfficers}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Halal Cert Issuance</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Accountants</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <FileBarChart size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{stats.accountants}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Invoicing & Payments</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Administrators</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Shield size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{stats.admins}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Operational Admins</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Technical & Audit</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
              <Beaker size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{stats.techAudit}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Auditors & Food Techs</div>
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
        {/* Search Bar (Search by name, email, username, or role) */}
        <div style={{ position: 'relative', minWidth: 320, flex: '1 1 320px', maxWidth: 460 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: 40, height: 42, fontSize: 13, borderRadius: 10, border: '1.5px solid #e2e8f0' }}
            placeholder="Search staff by name, email, username, or role..."
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
            { id: 'scheme_manager', label: 'Scheme Managers' },
            { id: 'certificate_officer', label: 'Certificate Officers' },
            { id: 'accountant', label: 'Accountants' },
            { id: 'admin', label: 'Admins' },
            { id: 'superadmin', label: 'Superadmins' },
            { id: 'support_manager', label: 'Support Managers 🎧' },
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
                    Status
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaff.map(member => {
                  const isActive = member.is_active !== false;
                  const memberRoles = getUserRoles(member);
                  const isUserSuperAdmin = memberRoles.includes('superadmin') || member.role === 'superadmin';
                  const hasDirectPrivilege = isUserSuperAdmin || member.can_issue_direct_certificate === true;

                  return (
                    <tr key={member._id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                      {/* 1. Staff Member (Name & Email) */}
                      <td style={{ padding: '16px 20px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {member.full_name || 'Staff Member'}
                            {isUserSuperAdmin && <Crown size={13} style={{ color: '#7c3aed' }} />}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{member.email}</div>
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

                        {/* Special Grants Badges */}
                        {(() => {
                          const hasDirect = isUserSuperAdmin || member.can_issue_direct_certificate;
                          const hasSig = isUserSuperAdmin || member.can_sign_logsheet;
                          const hasReviewCert = isUserSuperAdmin || member.can_review_certificate;
                          const hasDone = isUserSuperAdmin || member.can_mark_done;
                          const hasSupport = isUserSuperAdmin || member.is_support_manager;

                          if (!hasDirect && !hasSig && !hasReviewCert && !hasDone && !hasSupport) return null;

                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                              {hasDone && (
                                <span
                                  title="Possesses Done Privilege — can mark applications and logsheets as Done"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    border: '1px solid #a7f3d0',
                                    borderRadius: 6,
                                    padding: '2px 7px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <CheckCircle size={11} strokeWidth={2.5} /> Done Privilege
                                </span>
                              )}
                              {hasSig && (
                                <span
                                  title="Authorised Logsheet Signatory"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: 6,
                                    padding: '2px 7px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  ✍️ Signature
                                </span>
                              )}
                              {hasReviewCert && (
                                <span
                                  title="Authorised to review and approve certificate drafts"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: '#faf5ff',
                                    color: '#7e22ce',
                                    border: '1px solid #e9d5ff',
                                    borderRadius: 6,
                                    padding: '2px 7px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  📋 Review Cert
                                </span>
                              )}
                              {hasDirect && (
                                <span
                                  title="Direct Certificate Studio Privilege"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: '#f0fdf4',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: 6,
                                    padding: '2px 7px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  ⭐ Direct Cert Studio
                                </span>
                              )}
                              {hasSupport && (
                                <span
                                  title="Support Manager Privilege"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: '#f0fdfa',
                                    color: '#0f766e',
                                    border: '1px solid #99f6e4',
                                    borderRadius: 6,
                                    padding: '2px 7px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  🎧 Support Manager
                                </span>
                              )}
                            </div>
                          );
                        })()}
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
                          <ActionTriggerButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setStaffActionModal(member);
                            }}
                            title="Staff Actions"
                          />
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

          <Pagination
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STAFF ACTION MODAL (3-dot popup)                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {staffActionModal && (() => {
        const m = staffActionModal;
        const roles = getUserRoles(m);
        const primaryRole = roles[0] || m.role || 'staff';
        const roleConfig = STAFF_ROLE_CONFIG[primaryRole];
        const isActive = m.is_active !== false && m.status !== 'suspended';
        const displayName = m.full_name || m.username || m.email;

        return (
          <ActionModal
            isOpen={Boolean(staffActionModal)}
            onClose={() => setStaffActionModal(null)}
            title="Staff Member Actions"
            subtitle={displayName}
            badge={
              roleConfig
                ? { text: roleConfig.label, variant: roleConfig.badgeClass || 'badge-gray' }
                : { text: primaryRole, variant: 'badge-gray' }
            }
            actions={[
              {
                label: 'Edit Login Details',
                description: 'Update name, email, username, or password',
                icon: KeyRound,
                variant: 'primary',
                onClick: () => {
                  const member = staffActionModal;
                  setStaffActionModal(null);
                  openEditUser(member);
                }
              },
              {
                label: 'Edit Roles & Privileges',
                description: 'Assign roles and special access grants',
                icon: Edit3,
                variant: 'default',
                onClick: () => {
                  const member = staffActionModal;
                  setStaffActionModal(null);
                  openEditRoles(member);
                }
              },
              isActive ? {
                label: 'Suspend Account',
                description: 'Immediately block portal access for this staff member',
                icon: Ban,
                variant: 'warning',
                onClick: () => {
                  const member = staffActionModal;
                  setStaffActionModal(null);
                  setSuspensionModal(member);
                  setSuspensionReason('');
                }
              } : {
                label: 'Activate Account',
                description: 'Restore portal access for this staff member',
                icon: UserCheck2,
                variant: 'success',
                onClick: () => {
                  const member = staffActionModal;
                  setStaffActionModal(null);
                  handleStatusChange(member._id, true);
                }
              },
              {
                label: 'Delete Staff Account',
                description: 'Permanently remove this staff account — cannot be undone',
                icon: Trash2,
                variant: 'danger',
                onClick: () => {
                  const member = staffActionModal;
                  setStaffActionModal(null);
                  handleDeleteStaff(member._id, member.full_name || member.email);
                }
              }
            ].filter(Boolean)}
          />
        );
      })()}

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
                      Username <span style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>(Optional)</span>
                    </label>
                    <input
                      className="form-control"
                      value={staffForm.username}
                      onChange={e => setStaffForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="e.g. alex_johnson"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                      Initial Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={staffForm.password}
                      onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Set initial password"
                      required
                    />
                  </div>
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

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: '0 0 12px 0' }}>
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

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: '0 0 12px 0' }}>
                    <input
                      type="checkbox"
                      checked={staffForm.is_support_manager}
                      onChange={e => setStaffForm(f => ({ ...f, is_support_manager: e.target.checked }))}
                      style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', accentColor: '#059669' }}
                    />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        Grant Support Manager Privilege 🎧
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 2, lineHeight: 1.4 }}>
                        Allows this staff member to receive live client human-handover requests from the chatbox and assign tickets to admins.
                      </span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: '0 0 12px 0' }}>
                    <input
                      type="checkbox"
                      checked={staffForm.can_sign_logsheet}
                      onChange={e => setStaffForm(f => ({ ...f, can_sign_logsheet: e.target.checked }))}
                      style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', accentColor: '#2563eb' }}
                    />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        Grant Signature Privilege ✍️
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 2, lineHeight: 1.4 }}>
                        Allows this staff member to digitally sign HFA logsheets as an authorised committee signatory.
                      </span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: '0 0 12px 0' }}>
                    <input
                      type="checkbox"
                      checked={staffForm.can_review_certificate}
                      onChange={e => setStaffForm(f => ({ ...f, can_review_certificate: e.target.checked }))}
                      style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', accentColor: '#9333ea' }}
                    />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        Grant Review Certificate Privilege 📋
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 2, lineHeight: 1.4 }}>
                        Allows this staff member to access the Review Certificates page and approve or reject submitted certificate drafts.
                      </span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={staffForm.can_mark_done}
                      onChange={e => setStaffForm(f => ({ ...f, can_mark_done: e.target.checked }))}
                      style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', accentColor: '#0891b2' }}
                    />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        Grant Done Privilege ✅
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 2, lineHeight: 1.4 }}>
                        Allows this staff member to mark applications, logsheets, and add-on applications as Done directly from action menus.
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: '0 0 12px 0' }}>
                      <input
                        type="checkbox"
                        checked={editSupportManagerGrant}
                        onChange={e => setEditSupportManagerGrant(e.target.checked)}
                        style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', accentColor: '#059669' }}
                      />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          Grant Support Manager Privilege 🎧
                        </span>
                        <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 2, lineHeight: 1.4 }}>
                          Allows this staff member to receive live client human-handover requests from the chatbox and assign tickets to admins.
                        </span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: '0 0 12px 0' }}>
                      <input
                        type="checkbox"
                        checked={editSignaturePrivilege}
                        onChange={e => setEditSignaturePrivilege(e.target.checked)}
                        style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', accentColor: '#2563eb' }}
                      />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          Grant Signature Privilege ✍️
                        </span>
                        <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 2, lineHeight: 1.4 }}>
                          Allows this staff member to digitally sign HFA logsheets as an authorised committee signatory.
                        </span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: '0 0 12px 0' }}>
                      <input
                        type="checkbox"
                        checked={editReviewCertPrivilege}
                        onChange={e => setEditReviewCertPrivilege(e.target.checked)}
                        style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', accentColor: '#9333ea' }}
                      />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          Grant Review Certificate Privilege 📋
                        </span>
                        <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 2, lineHeight: 1.4 }}>
                          Allows this staff member to access the Review Certificates page and approve or reject submitted certificate drafts.
                        </span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={editDonePrivilege}
                        onChange={e => setEditDonePrivilege(e.target.checked)}
                        style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', accentColor: '#0891b2' }}
                      />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          Grant Done Privilege ✅
                        </span>
                        <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 2, lineHeight: 1.4 }}>
                          Allows this staff member to mark applications, logsheets, and add-on applications as Done directly from action menus.
                        </span>
                      </div>
                    </label>
                  </div>
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
      {/* EDIT USER (LOGIN DETAILS) MODAL                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {editUserModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setEditUserModal(null)}>
          <div className="modal" style={{ maxWidth: 560, width: '92%', borderRadius: 16, overflow: 'hidden', padding: 0, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
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
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
                }}>
                  <KeyRound size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a8a' }}>Edit Staff Login Details</div>
                  <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 1 }}>{editUserModal.full_name || editUserModal.email}</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setEditUserModal(null)}><X size={18} /></button>
            </div>

            {/* Body */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Name & Username */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-control"
                    value={editUserForm.full_name}
                    onChange={e => setEditUserForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="e.g. Dr. Alex Johnson"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                    Username <span style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>(Optional)</span>
                  </label>
                  <input
                    className="form-control"
                    value={editUserForm.username}
                    onChange={e => setEditUserForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="e.g. alex_johnson"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={editUserForm.email}
                    onChange={e => setEditUserForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="e.g. alex@halalfoodauthority.com"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                    Phone <span style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={editUserForm.phone}
                    onChange={e => setEditUserForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g. +44 7700 900000"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                  New Password <span style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>(Leave blank to keep current)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={editUserShowPwd ? 'text' : 'password'}
                    className="form-control"
                    value={editUserForm.password}
                    onChange={e => setEditUserForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Enter new password (min. 6 characters)"
                    style={{ paddingRight: 44 }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setEditUserShowPwd(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0, display: 'flex'
                    }}
                    tabIndex={-1}
                  >
                    {editUserShowPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {editUserForm.password && editUserForm.password.length > 0 && editUserForm.password.length < 6 && (
                  <p style={{ fontSize: 11.5, color: '#ef4444', marginTop: 4, margin: '4px 0 0 0' }}>Password must be at least 6 characters</p>
                )}
              </div>

              {/* Info notice */}
              <div style={{
                background: '#fefce8',
                border: '1px solid #fde68a',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 12,
                color: '#92400e',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Changes take effect immediately. If the password is updated, the staff member must use the new credentials on their next login.
                </span>
              </div>
            </div>

            {/* Footer */}
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
              <button type="button" className="btn btn-ghost" onClick={() => setEditUserModal(null)} disabled={editUserSaving}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderColor: '#1d4ed8', padding: '10px 24px', fontWeight: 700 }}
                onClick={handleSaveEditUser}
                disabled={editUserSaving}
              >
                {editUserSaving ? 'Saving...' : 'Save Changes'}
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
