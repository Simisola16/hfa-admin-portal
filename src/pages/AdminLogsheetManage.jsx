import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  FileText, Search, Trash2, Eye, RefreshCw, ChevronDown, 
  Building2, Calendar, Tag, Shield, Clock, CheckCircle2, Plus, Settings, User
} from 'lucide-react';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';

export default function AdminLogsheetManage() {
  const [logsheets, setLogsheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('company_name');
  const [actionModalLogsheet, setActionModalLogsheet] = useState(null);
  const navigate = useNavigate();

  const fetchLogsheets = async () => {
    setLoading(true);
    try {
      const [res, extRes] = await Promise.all([
        api.get('/api/application-logsheets'),
        api.get('/api/extension-applications').catch(() => ({ data: { data: [] } }))
      ]);
      const allLogs = res.data?.data || res.data || [];
      const extApps = extRes.data?.data || (Array.isArray(extRes.data) ? extRes.data : []);

      const extLogs = extApps
        .filter(extApp => Boolean(extApp.logsheet_id))
        .map(extApp => {
          const log = extApp.logsheet_id;
          const is30Days = log.extension_duration_type === '30_days' || Number(log.extension_days) <= 30;
          return {
            _id: log._id || extApp._id,
            extension_application_id: extApp._id,
            application_number: extApp.application_number,
            source_type: 'extension_application',
            company_name: log.company_name || extApp.company_name || extApp.client_id?.company_name || 'Client',
            site_name: extApp.site_name || extApp.site_id?.name || log.facility_address || 'Main Facility',
            created_at: log.created_at || extApp.created_at || extApp.createdAt,
            created_by: log.created_by,
            reviewer_name: log.reviewer_name,
            audit_type: `Extension (${log.extension_days || 30} Days)`,
            status: log.status || (extApp.status === 'extension_approved' ? 'Completed' : (extApp.status === 'waiting_signature' ? 'Waiting for Signature' : 'Draft')),
            signatures_required: is30Days ? 1 : 4,
            extension_duration_type: log.extension_duration_type,
            single_signature: log.single_signature,
            mufti_signature: log.mufti_signature,
            ceo_signature: log.ceo_signature,
            manager_signature: log.manager_signature,
            mufti2_signature: log.mufti2_signature
          };
        });

      setLogsheets([...allLogs, ...extLogs]);
    } catch (err) {
      toast.error('Failed to load logsheets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsheets();
  }, []);

  const handleDelete = async (id, e, item = null) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this logsheet? This action cannot be undone.')) return;
    try {
      if (item?.source_type === 'extension_application' || item?.extension_application_id) {
        toast.error('Extension applications must be managed on the Extension Applications page.');
        return;
      }
      await api.delete(`/api/application-logsheets/${id}`);
      toast.success('Logsheet deleted successfully');
      fetchLogsheets();
    } catch (err) {
      toast.error(err.message || 'Failed to delete logsheet');
    }
  };

  const getCreatorName = (l) => {
    if (l.created_by?.full_name) return l.created_by.full_name;
    if (l.created_by?.username) return l.created_by.username;
    if (l.created_by_name) return l.created_by_name;
    if (l.created_by_username) return l.created_by_username;
    if (l.created_by?.email) return l.created_by.email.split('@')[0];
    if (l.auditors && !l.auditors.includes('(Food Technologist)')) {
      return l.auditors;
    }
    if (l.reviewer_name && !l.reviewer_name.includes('HFA Admin')) {
      return l.reviewer_name;
    }
    if (l.reviewed_by && !l.reviewed_by.includes('HFA Admin')) {
      return l.reviewed_by;
    }
    if (l.reviewer_name) return l.reviewer_name;
    return 'HFA Admin';
  };

  const filteredLogsheets = logsheets.filter(l => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (searchField === 'id') {
      return l._id?.toLowerCase().includes(query) || 
        l.application_number?.toLowerCase().includes(query) ||
        l.application_id?.application_number?.toLowerCase().includes(query);
    }
    if (searchField === 'company_name') {
      return l.company_name?.toLowerCase().includes(query);
    }
    if (searchField === 'site_name') {
      return (l.site_name || l.application_id?.site_name || '').toLowerCase().includes(query);
    }
    if (searchField === 'created_by') {
      return getCreatorName(l).toLowerCase().includes(query);
    }
    if (searchField === 'status') {
      return l.status?.toLowerCase().includes(query);
    }
    if (searchField === 'audit_type') {
      return l.audit_type?.toLowerCase().includes(query);
    }
    return true;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Waiting for Signature':
        return 'badge-orange';
      case 'Signed':
        return 'badge-green';
      case 'Completed':
      case 'Approved':
        return 'badge-blue';
      default:
        return 'badge-gray';
    }
  };

  const getLogsheetLink = (l) => {
    if (l.source_type === 'extension_application' || l.extension_application_id) {
      const id = l.extension_application_id?._id || l.extension_application_id;
      return `/extension-applications/${id}/logsheet`;
    }
    if (l.source_type === 'direct') {
      return `/logsheet/direct/${l._id}`;
    }
    if (l.source_type === 'initial_product_application' || l.initial_product_application_id) {
      const id = l.initial_product_application_id?._id || l.initial_product_application_id;
      return `/initial-products/${id}/logsheet`;
    }
    if (l.source_type === 'addon_application' || l.addon_application_id) {
      const id = l.addon_application_id?._id || l.addon_application_id;
      return `/addon-applications/${id}/logsheet`;
    }
    const id = l.application_id?._id || l.application_id;
    return id ? `/applications/${id}/logsheet` : `/logsheet/direct/${l._id}`;
  };

  return (
    <div className="manage-logsheets-page" style={{ padding: '0 8px' }}>
      <style>{`
        .manage-logsheets-page {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .premium-table tr {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-table tr:hover {
          background-color: #f8fafc !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
        }
        .premium-select, .premium-input {
          transition: all 0.2s ease-in-out;
          border: 1.5px solid #e2e8f0 !important;
        }
        .premium-select:focus, .premium-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
          background-color: #fff !important;
        }

        /* Responsive Breakpoints */
        @media (max-width: 899px) {
          .desktop-only-table {
            display: none !important;
          }
          .mobile-logsheet-cards {
            display: flex !important;
            flex-direction: column;
            gap: 16px;
            padding: 12px;
          }
          .logsheet-toolbar-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
          }
          .logsheet-toolbar-actions {
            width: 100% !important;
            display: flex !important;
            flex-wrap: wrap !important;
          }
          .logsheet-toolbar-actions > * {
            flex: 1 1 calc(50% - 6px);
            justify-content: center;
          }
          .logsheet-filter-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .logsheet-search-group {
            max-width: 100% !important;
            flex-direction: column !important;
          }
          .logsheet-search-group > div {
            width: 100% !important;
          }
        }

        @media (min-width: 900px) {
          .desktop-only-table {
            display: block !important;
          }
          .mobile-logsheet-cards {
            display: none !important;
          }
        }
      `}</style>

      {/* Responsive Header Toolbar */}
      <div className="toolbar logsheet-toolbar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={28} style={{ color: 'var(--primary)' }} />
            Manage Logsheets
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Review, sign, and manage all processing and finalized application logsheets.
          </p>
        </div>
        <div className="logsheet-toolbar-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={fetchLogsheets} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontWeight: 700 }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Reload
          </button>
          <Link to="/logsheet/direct" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', padding: '8px 18px', fontWeight: 700, textDecoration: 'none' }}>
            <Plus size={16} />
            Create Direct Logsheet
          </Link>
        </div>
      </div>

      {/* Main Table & Mobile Cards Container */}
      <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '16px', overflow: 'visible', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
        
        {/* Responsive Filters Row */}
        <div className="logsheet-filter-row" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Logsheet List</span>
            <span className="badge badge-blue" style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, background: '#dbeafe', color: '#1e40af' }}>
              {filteredLogsheets.length} Active Records
            </span>
          </div>

          {/* Search Row */}
          <div className="logsheet-search-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '520px' }}>
            <div style={{ position: 'relative', width: '160px' }}>
              <select 
                className="form-control premium-select"
                value={searchField}
                onChange={e => setSearchField(e.target.value)}
                style={{ paddingRight: '32px', height: '40px', fontSize: '13px', cursor: 'pointer', background: 'white', borderRadius: '10px', fontWeight: 600 }}
              >
                <option value="company_name">Company Name</option>
                <option value="site_name">Site Name</option>
                <option value="created_by">Created By</option>
                <option value="id">Logsheet ID</option>
                <option value="status">Status</option>
                <option value="audit_type">Logsheet Type</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>

            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder={`Search by ${searchField.replace('_', ' ')}...`}
                className="form-control premium-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px', height: '40px', fontSize: '13px', background: 'white', borderRadius: '10px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="table-wrap" style={{ overflowX: 'auto', overflowY: 'visible', minHeight: '300px', padding: '12px' }}>
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filteredLogsheets.length === 0 ? (
            <div className="empty-state" style={{ padding: '80px 24px' }}>
              <div className="empty-state-icon" style={{ background: '#f0fdf4', color: 'var(--primary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FileText size={32} />
              </div>
              <div className="empty-state-title" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No Logsheets Found</div>
              <div className="empty-state-text" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {searchQuery ? 'Try adjusting your search filters.' : 'There are currently no logsheets in the database.'}
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (Screens >= 900px) */}
              <div className="desktop-only-table">
                <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company Name</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created By</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Site Name</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logsheet Type</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogsheets.map(l => {
                      const compName = l.company_name || 'Client Facility';
                      const siteName = l.site_name || l.application_id?.site_name || l.application_id?.establishment_name || 'Main Facility';
                      const rawType = l.source_type === 'extension_application' ? 'EXTENSION' : (l.application_id?.application_type || l.audit_type || 'NEW');
                      const typeLabel = rawType.toUpperCase();
                      const categorySubtext = l.application_id?.category ? `Annual Certification – ${l.application_id.category}` : (l.audit_type ? `Annual Certification – ${l.audit_type}` : 'Annual Certification – General');
                      const creatorName = getCreatorName(l);

                      return (
                        <tr key={l._id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                            <div>{compName}</div>
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: '13px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '8px' }}>
                              <User size={13} style={{ color: 'var(--primary)' }} />
                              <span>{creatorName}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(l.created_at).toLocaleDateString('en-GB')}
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                              <Building2 size={14} style={{ color: '#64748b', minWidth: '14px', flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={siteName}>
                                {siteName}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#00853b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                              {typeLabel}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, maxWidth: '165px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={categorySubtext}>
                              {categorySubtext}
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <span className={`badge ${getStatusBadgeClass(l.status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontWeight: 700 }}>
                              {l.status === 'Waiting for Signature' ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                              {l.status}
                            </span>
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4f46e5' }}>
                              <Tag size={12} />
                              {l.audit_type || 'New'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'center', position: 'relative', whiteSpace: 'nowrap' }}>
                            <ActionTriggerButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionModalLogsheet(l);
                              }}
                              title="Logsheet Actions"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE & TABLET RESPONSIVE CARDS VIEW (Screens < 900px) */}
              <div className="mobile-logsheet-cards" style={{ display: 'none' }}>
                {filteredLogsheets.map(l => {
                  const compName = l.company_name || 'Client Facility';
                  const siteName = l.site_name || l.application_id?.site_name || l.application_id?.establishment_name || 'Main Facility';
                  const rawType = l.source_type === 'extension_application' ? 'EXTENSION' : (l.application_id?.application_type || l.audit_type || 'NEW');
                  const typeLabel = rawType.toUpperCase();
                  const categorySubtext = l.application_id?.category ? `Annual Certification – ${l.application_id.category}` : (l.audit_type ? `Annual Certification – ${l.audit_type}` : 'Annual Certification – General');
                  const creatorName = getCreatorName(l);

                  return (
                    <div 
                      key={l._id}
                      style={{
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        padding: '16px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      {/* Top Row: Company & Action Trigger */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                            {compName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#00853b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {typeLabel}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                              • {categorySubtext}
                            </span>
                          </div>
                        </div>

                        <ActionTriggerButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionModalLogsheet(l);
                          }}
                          title="Logsheet Actions"
                        />
                      </div>

                      {/* Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Site Name</div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Building2 size={12} style={{ color: '#64748b' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={siteName}>{siteName}</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Created By</div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={12} style={{ color: 'var(--primary)' }} />
                            <span>{creatorName}</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Date</div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            <span>{new Date(l.created_at).toLocaleDateString('en-GB')}</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Type</div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Tag size={12} />
                            <span>{l.audit_type || 'New'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom: Status Badge & Quick link */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                        <span className={`badge ${getStatusBadgeClass(l.status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '12px', padding: '4px 10px' }}>
                          {l.status === 'Waiting for Signature' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                          {l.status}
                        </span>

                        <button 
                          onClick={() => navigate(getLogsheetLink(l))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px'
                          }}
                        >
                          <Eye size={13} /> View Logsheet
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Menu Pop-up Modal */}
      {actionModalLogsheet && (() => {
        const l = actionModalLogsheet;
        const targetAppId = l.application_id?._id || l.application_id || l.extension_application_id?._id || l.extension_application_id || l.addon_application_id?._id || l.addon_application_id;

        return (
          <ActionModal
            isOpen={Boolean(actionModalLogsheet)}
            onClose={() => setActionModalLogsheet(null)}
            title="Logsheet Actions"
            subtitle={l.company_name}
            badge={`Status: ${l.status || 'Active'}`}
            badgeVariant={getStatusBadgeClass(l.status)}
            actions={[
              targetAppId && {
                label: 'Application Processing',
                description: 'Open linked application workflow & timeline',
                icon: Settings,
                variant: 'primary',
                onClick: () => {
                  if (l.source_type === 'extension_application' || l.extension_application_id) {
                    navigate(`/extension-applications/${targetAppId}/processing`);
                  } else if (l.source_type === 'addon_application' || l.addon_application_id) {
                    navigate(`/addon-applications/${targetAppId}/processing`);
                  } else {
                    navigate(`/applications/${targetAppId}/processing`);
                  }
                }
              },
              {
                label: 'View Logsheet Document',
                description: 'Inspect full application logsheet document',
                icon: Eye,
                variant: 'default',
                onClick: () => navigate(getLogsheetLink(l))
              },
              {
                label: 'Delete Logsheet',
                description: 'Permanently remove this logsheet entry',
                icon: Trash2,
                variant: 'danger',
                onClick: (e) => handleDelete(l._id, e, l)
              }
            ].filter(Boolean)}
          />
        );
      })()}
    </div>
  );
}
