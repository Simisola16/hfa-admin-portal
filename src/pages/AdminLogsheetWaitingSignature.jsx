import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ResendLogsheetEmailModal from '../components/ResendLogsheetEmailModal';
import { 
  FileText, Search, Trash2, Eye, RefreshCw, ChevronDown, 
  MapPin, User, Calendar, Tag, Shield, Clock, CheckCircle2, Mail, PenTool, AlertTriangle, ArrowRight, Check
} from 'lucide-react';

export default function AdminLogsheetWaitingSignature() {
  const { user, profile } = useAuth();
  const currentUser = profile || user;

  const [logsheets, setLogsheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('company_name');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'awaiting_mine' | 'signed_by_me'
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedLogsheetForEmail, setSelectedLogsheetForEmail] = useState(null);
  const [showResendModal, setShowResendModal] = useState(false);
  const navigate = useNavigate();

  const fetchLogsheets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/application-logsheets');
      const allLogs = res.data?.data || res.data || [];
      // Filter only "Waiting for Signature" on retrieval
      const waitingLogs = allLogs.filter(l => l.status === 'Waiting for Signature');
      setLogsheets(waitingLogs);
    } catch (err) {
      toast.error('Failed to load waiting logsheets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsheets();
    const handleClose = () => setActiveDropdown(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this logsheet? This action cannot be undone.')) return;
    try {
      await api.delete(`/api/application-logsheets/${id}`);
      toast.success('Logsheet deleted successfully');
      fetchLogsheets();
    } catch (err) {
      toast.error(err.message || 'Failed to delete logsheet');
    }
  };

  const handleResendEmails = (logsheetItem, e) => {
    if (e) e.stopPropagation();
    setActiveDropdown(null);
    setSelectedLogsheetForEmail(logsheetItem);
    setShowResendModal(true);
  };

  const hasUserSigned = (l) => {
    if (!currentUser) return false;
    const myName = (currentUser.full_name || currentUser.name || currentUser.username || '').trim().toLowerCase();
    const myRole = (currentUser.role || '').toLowerCase();
    
    const signedNames = [l.mufti_sign_name, l.ceo_sign_name, l.manager_sign_name, l.mufti2_sign_name]
      .filter(Boolean)
      .map(n => n.trim().toLowerCase());

    if (myName && signedNames.some(n => n === myName || n.includes(myName) || myName.includes(n))) {
      return true;
    }

    if (myRole === 'mufti' || myRole.includes('shariah')) {
      if ((l.mufti_signature || l.mufti2_signature) && signedNames.some(n => n.includes('mufti') || (myName && n.includes(myName)))) {
        return true;
      }
    }

    return false;
  };

  const getSignatoryProgress = (l) => {
    const signers = [
      { role: 'Mufti', signed: !!l.mufti_signature, name: l.mufti_sign_name },
      { role: 'CEO', signed: !!l.ceo_signature, name: l.ceo_sign_name },
      { role: 'Manager', signed: !!l.manager_signature, name: l.manager_sign_name },
      { role: 'Mufti 2', signed: !!l.mufti2_signature, name: l.mufti2_sign_name },
    ];
    const count = signers.filter(s => s.signed).length;
    return { count, total: 4, signers };
  };

  const getAgeCue = (createdAt) => {
    if (!createdAt) return { text: 'Recent', isUrgent: false, days: 0 };
    const created = new Date(createdAt);
    const now = new Date();
    const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) return { text: 'Today', isUrgent: false, days: 0 };
    if (diffDays === 1) return { text: '1 day ago', isUrgent: false, days: 1 };
    if (diffDays <= 4) return { text: `${diffDays} days ago`, isUrgent: false, days: diffDays };
    return { text: `${diffDays} days waiting`, isUrgent: true, days: diffDays };
  };

  const getLogsheetLink = (l) => {
    if (l.source_type === 'initial_product_application' || l.initial_product_application_id) {
      const id = l.initial_product_application_id?._id || l.initial_product_application_id;
      return `/initial-products/${id}/logsheet`;
    }
    if (l.source_type === 'addon_application' || l.addon_application_id) {
      const id = l.addon_application_id?._id || l.addon_application_id;
      return `/addon-applications/${id}/logsheet`;
    }
    const id = l.application_id?._id || l.application_id;
    return id ? `/applications/${id}/logsheet` : '/logsheet/manage';
  };

  const getApplicationLink = (l) => {
    if (l.source_type === 'initial_product_application' || l.initial_product_application_id) {
      const id = l.initial_product_application_id?._id || l.initial_product_application_id;
      return `/initial-products/${id}/processing`;
    }
    if (l.source_type === 'addon_application' || l.addon_application_id) {
      const id = l.addon_application_id?._id || l.addon_application_id;
      return `/addon-applications/${id}/processing`;
    }
    const id = l.application_id?._id || l.application_id;
    return id ? `/applications/${id}/processing` : '/applications';
  };

  const awaitingMineCount = logsheets.filter(l => !hasUserSigned(l)).length;
  const signedByMeCount = logsheets.filter(l => hasUserSigned(l)).length;

  const filteredLogsheets = logsheets.filter(l => {
    if (filterTab === 'awaiting_mine' && hasUserSigned(l)) return false;
    if (filterTab === 'signed_by_me' && !hasUserSigned(l)) return false;

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (searchField === 'id') {
      return l._id?.toLowerCase().includes(query) || l.application_id?.application_number?.toLowerCase().includes(query);
    }
    if (searchField === 'company_name') {
      return l.company_name?.toLowerCase().includes(query);
    }
    if (searchField === 'contact_person') {
      return l.contact_person?.toLowerCase().includes(query);
    }
    if (searchField === 'audit_type') {
      return l.audit_type?.toLowerCase().includes(query);
    }
    return true;
  });

  const pendingCount = filteredLogsheets.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1280, margin: '0 auto' }}>
      <style>{`
        .logsheet-table tr {
          transition: background-color 0.15s ease;
        }
        .logsheet-table tr:hover {
          background-color: #f8fafc !important;
        }
        .logsheet-search-input:focus, .logsheet-select:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.1) !important;
          outline: none;
        }
        .action-drop-btn {
          transition: all 0.15s ease;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-weight: 600;
          color: #334155;
        }
        .action-drop-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .filter-tab-btn {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid transparent;
        }
        .filter-tab-btn.active-all {
          background: #0f172a;
          color: #fff;
        }
        .filter-tab-btn.active-awaiting {
          background: #ea580c;
          color: #fff;
          box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);
        }
        .filter-tab-btn.active-signed {
          background: #16a34a;
          color: #fff;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
        }
        .filter-tab-btn.inactive {
          background: #f1f5f9;
          color: #475569;
          border-color: #e2e8f0;
        }
        .filter-tab-btn.inactive:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .dropdown-menu-card {
          animation: slideDown 0.15s ease-out forwards;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 767px) {
          .desktop-only-table {
            display: none !important;
          }
          .mobile-only-cards {
            display: grid !important;
          }
        }
        @media (min-width: 768px) {
          .desktop-only-table {
            display: block !important;
          }
          .mobile-only-cards {
            display: none !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Logsheets Waiting for Signature
            </h1>
            <span className="badge badge-orange" style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#ffedd5', color: '#c2410c' }}>
              {pendingCount} Pending
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Track and sign Halal Certification Logsheets currently awaiting Committee and Technical sign-offs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={fetchLogsheets}
            disabled={loading}
            style={{ borderRadius: 8, height: 38, border: '1px solid #e2e8f0', background: '#fff' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} style={{ marginRight: 6 }} />
            Refresh
          </button>
        </div>
      </div>

      {/* TOP FILTER TABS: AWAITING YOUR SIGNATURE & SIGNED */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setFilterTab('awaiting_mine')}
          className={`filter-tab-btn ${filterTab === 'awaiting_mine' ? 'active-awaiting' : 'inactive'}`}
        >
          <PenTool size={15} />
          Awaiting Your Signature
          <span style={{
            background: filterTab === 'awaiting_mine' ? 'rgba(255,255,255,0.25)' : '#fed7aa',
            color: filterTab === 'awaiting_mine' ? '#fff' : '#c2410c',
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 11.5,
            fontWeight: 800
          }}>
            {awaitingMineCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('signed_by_me')}
          className={`filter-tab-btn ${filterTab === 'signed_by_me' ? 'active-signed' : 'inactive'}`}
        >
          <CheckCircle2 size={15} />
          Signed by You
          <span style={{
            background: filterTab === 'signed_by_me' ? 'rgba(255,255,255,0.25)' : '#bbf7d0',
            color: filterTab === 'signed_by_me' ? '#fff' : '#15803d',
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 11.5,
            fontWeight: 800
          }}>
            {signedByMeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`filter-tab-btn ${filterTab === 'all' ? 'active-all' : 'inactive'}`}
        >
          <Clock size={15} />
          All Pending Logsheets
          <span style={{
            background: filterTab === 'all' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
            color: filterTab === 'all' ? '#fff' : '#334155',
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 11.5,
            fontWeight: 800
          }}>
            {logsheets.length}
          </span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 4, borderRadius: 12, border: '1px solid #fed7aa', background: '#fffbeb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9a3412', fontWeight: 600 }}>
            <Clock size={16} color="#ea580c" />
            <span>Showing {pendingCount} logsheet(s)</span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 320, flex: 1, maxWidth: 480 }}>
            <div style={{ position: 'relative', width: 140 }}>
              <select
                className="form-control logsheet-select"
                value={searchField}
                onChange={e => setSearchField(e.target.value)}
                style={{ height: 38, fontSize: 12, paddingRight: 24, borderRadius: 8, background: 'white', border: '1px solid #fed7aa' }}
              >
                <option value="company_name">Company Name</option>
                <option value="contact_person">Contact Person</option>
                <option value="audit_type">Logsheet Type</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
            </div>

            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder={`Search...`}
                className="form-control logsheet-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 36, height: 38, fontSize: 13, background: 'white', borderRadius: 8, border: '1px solid #fed7aa' }}
              />
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>
        </div>
      </div>
      <div className="table-wrap" style={{ overflowX: 'auto', minHeight: 280, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        {loading ? (
          <div className="loading-overlay" style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading pending logsheets...</div>
          </div>
        ) : filteredLogsheets.length === 0 ? (
          <div className="empty-state" style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div className="empty-state-icon" style={{ background: '#fff7ed', color: '#d97706', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Clock size={28} />
            </div>
            <div className="empty-state-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>No Logsheets Waiting for Signature</div>
            <div className="empty-state-text" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {searchQuery ? 'No records match your search criteria. Try adjusting your filter.' : 'All draft logsheets have been signed or non-pending.'}
            </div>
          </div>
        ) : (
          <>
            <div className="desktop-only-table">
              <table className="logsheet-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Name</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signatory Progress</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waiting Age</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Person</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogsheets.map(l => {
                    const { count, total, signers } = getSignatoryProgress(l);
                    const age = getAgeCue(l.created_at);
                    const userSigned = hasUserSigned(l);

                    return (
                      <tr key={l._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                          <Link 
                            to={getLogsheetLink(l)}
                            style={{ color: '#0f172a', textDecoration: 'none' }}
                          >
                            {l.company_name}
                          </Link>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} />
                            {l.site_name || l.site_id?.name || l.application_id?.site_name || l.manufacturing_address || 'Main Site'}
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                              <span style={{ fontWeight: 600, color: count === total ? '#15803d' : '#d97706' }}>
                                {count} of {total} Signed
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {Math.round((count / total) * 100)}%
                              </span>
                            </div>
                            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
                              <div 
                                style={{ 
                                  width: `${(count / total) * 100}%`, 
                                  background: count === total ? '#16a34a' : 'linear-gradient(90deg, #f59e0b, #d97706)', 
                                  borderRadius: 10,
                                  transition: 'width 0.3s ease'
                                }} 
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                              {signers.map((s, idx) => (
                                <span 
                                  key={idx}
                                  title={`${s.role}: ${s.signed ? (s.name ? `Signed by ${s.name}` : 'Signed') : 'Pending'}`}
                                  style={{
                                    fontSize: 10,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    fontWeight: 600,
                                    background: s.signed ? '#dcfce7' : '#f1f5f9',
                                    color: s.signed ? '#15803d' : '#94a3b8',
                                    border: `1px solid ${s.signed ? '#86efac' : '#e2e8f0'}`
                                  }}
                                >
                                  {s.role}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 500,
                            background: age.isUrgent ? '#fef2f2' : '#f8fafc',
                            color: age.isUrgent ? '#991b1b' : '#475569',
                            border: `1px solid ${age.isUrgent ? '#fca5a5' : '#e2e8f0'}`
                          }}>
                            {age.isUrgent ? <AlertTriangle size={12} style={{ color: '#dc2626' }} /> : <Clock size={12} style={{ color: '#94a3b8' }} />}
                            {age.text}
                          </span>
                        </td>

                        <td style={{ padding: '16px 20px', fontSize: 13, color: '#0f172a' }}>
                          <div style={{ fontWeight: 500 }}>{l.contact_person || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.contact_email}</div>
                        </td>

                        <td style={{ padding: '16px 20px', fontSize: 12, fontWeight: 500 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#4f46e5', background: '#f5f3ff', padding: '3px 8px', borderRadius: 6, border: '1px solid #e0e7ff' }}>
                            <Tag size={11} />
                            {l.audit_type || 'New'}
                          </span>
                        </td>

                        <td style={{ padding: '16px 20px', textAlign: 'right', position: 'relative' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {userSigned ? (
                              <Link 
                                to={getLogsheetLink(l)}
                                className="btn btn-sm"
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  textDecoration: 'none',
                                  color: '#15803d',
                                  background: '#f0fdf4',
                                  border: '1px solid #86efac'
                                }}
                              >
                                <CheckCircle2 size={13} />
                                Signed
                              </Link>
                            ) : (
                              <Link 
                                to={getLogsheetLink(l)}
                                className="btn btn-primary btn-sm"
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  textDecoration: 'none',
                                  background: '#ea580c',
                                  borderColor: '#ea580c'
                                }}
                              >
                                <PenTool size={13} />
                                Awaiting Signature
                              </Link>
                            )}

                            <button 
                              className="btn btn-sm action-drop-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === l._id ? null : l._id);
                              }}
                              style={{ padding: '6px 8px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                            >
                              <ChevronDown size={14} />
                            </button>

                            {activeDropdown === l._id && (
                              <div 
                                className="dropdown-menu-card"
                                style={{ 
                                  position: 'absolute', 
                                  right: 20, 
                                  top: 48, 
                                  background: 'white', 
                                  border: '1px solid #e2e8f0', 
                                  borderRadius: 8, 
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                  zIndex: 100, 
                                  minWidth: 160, 
                                  padding: 4,
                                  textAlign: 'left'
                                }}
                                onClick={e => e.stopPropagation()}
                              >
                                <Link 
                                  to={getLogsheetLink(l)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 13, color: '#2563eb', textDecoration: 'none', borderRadius: 6, fontWeight: 500 }}
                                  className="dropdown-item"
                                >
                                  <Eye size={14} /> View Details
                                </Link>
                                <button 
                                  onClick={(e) => handleResendEmails(l, e)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', textAlign: 'left', padding: '8px 10px', fontSize: 13, color: '#0e7490', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontWeight: 500 }}
                                  className="dropdown-item"
                                >
                                  <Mail size={14} /> Resend Emails
                                </button>
                                <button 
                                  onClick={(e) => handleDelete(l._id, e)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', textAlign: 'left', padding: '8px 10px', fontSize: 13, color: '#dc2626', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontWeight: 500 }}
                                  className="dropdown-item"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE / TABLET CARDS VIEW */}
            <div className="mobile-only-cards" style={{ display: 'none', gridTemplateColumns: '1fr', gap: 12, padding: 12 }}>
              {filteredLogsheets.map(l => {
                const { count, total, signers } = getSignatoryProgress(l);
                const age = getAgeCue(l.created_at);
                const userSigned = hasUserSigned(l);

                return (
                  <div 
                    key={l._id} 
                    style={{ 
                      background: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 12, 
                      padding: 16, 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Link 
                        to={getLogsheetLink(l)}
                        style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}
                      >
                        #{l.application_id?.application_number || l.initial_product_application_id?._id?.slice(-6).toUpperCase() || l.addon_application_id?._id?.slice(-6).toUpperCase() || l._id?.slice(-6).toUpperCase()}
                      </Link>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontWeight: 500, padding: '3px 8px', fontSize: 11, borderRadius: 20,
                        background: age.isUrgent ? '#fef2f2' : '#fff7ed',
                        color: age.isUrgent ? '#dc2626' : '#c2410c',
                        border: `1px solid ${age.isUrgent ? '#fca5a5' : '#fed7aa'}`
                      }}>
                        <Clock size={11} />
                        {age.text}
                      </span>
                    </div>

                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {l.company_name}
                      </h3>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {l.site_name || l.manufacturing_address || 'Main Site'}
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f5f3ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, marginTop: 4 }}>
                        <Tag size={10} />
                        {l.audit_type || 'New'} Logsheet
                      </div>
                    </div>

                    {/* Progress bar inside card */}
                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                        <span>Signatory Progress</span>
                        <span style={{ color: count === total ? '#15803d' : '#d97706' }}>{count} / {total} Signed</span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${(count / total) * 100}%`, background: count === total ? '#16a34a' : '#f59e0b', borderRadius: 10 }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                      <Link 
                        to={getLogsheetLink(l)}
                        style={{ 
                          flex: 1, 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 6, 
                          padding: '10px', 
                          borderRadius: 8, 
                          background: userSigned ? '#16a34a' : '#ea580c', 
                          color: 'white', 
                          textDecoration: 'none', 
                          fontSize: 13, 
                          fontWeight: 700 
                        }}
                      >
                        {userSigned ? <CheckCircle2 size={14} /> : <PenTool size={14} />} 
                        {userSigned ? 'Signed' : 'Awaiting Signature'}
                      </Link>

                      <button 
                        onClick={(e) => handleDelete(l._id, e)}
                        style={{ 
                          padding: '10px 14px', 
                          borderRadius: 8, 
                          background: '#fef2f2', 
                          color: '#dc2626', 
                          border: '1px solid #fecaca', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Resend Signatory Email Modal */}
      <ResendLogsheetEmailModal
        isOpen={showResendModal}
        onClose={() => setShowResendModal(false)}
        logsheet={selectedLogsheetForEmail}
      />
    </div>
  );
}
