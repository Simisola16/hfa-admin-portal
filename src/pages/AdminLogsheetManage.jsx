import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  Search, RefreshCw, Plus, Settings, Eye, Trash2
} from 'lucide-react';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';
import Pagination from '../components/Pagination';

export default function AdminLogsheetManage() {
  const [logsheets, setLogsheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('company_name');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  useEffect(() => {
    setPage(1);
  }, [searchQuery, searchField]);

  const paginatedLogsheets = filteredLogsheets.slice((page - 1) * pageSize, page * pageSize);

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
    <div className="page-content">

      {/* Toolbar consistent with AdminApplications */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            placeholder={`Search by ${searchField.replace('_', ' ')}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={searchField}
          onChange={e => setSearchField(e.target.value)}
        >
          <option value="company_name">Company Name</option>
          <option value="site_name">Site Name</option>
          <option value="created_by">Created By</option>
          <option value="id">Logsheet ID</option>
          <option value="status">Status</option>
          <option value="audit_type">Logsheet Type</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filteredLogsheets.length} logsheets
        </span>
        <Link
          to="/logsheet/direct"
          className="btn btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <Plus size={14} /> Create Direct Logsheet
        </Link>
      </div>

      {/* Main Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Manage Logsheets</div>
            <div className="card-subtitle">Review, sign, and manage all processing and finalized application logsheets</div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchLogsheets}
            disabled={loading}
            title="Reload logsheets"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Created By</th>
                  <th>Site Name</th>
                  <th>Type &amp; Category</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogsheets.map(l => {
                  const compName = l.company_name || 'Client Facility';
                  const siteName = l.site_name || l.application_id?.site_name || l.application_id?.establishment_name || 'Main Facility';
                  const rawType = l.source_type === 'extension_application' ? 'EXTENSION' : (l.application_id?.application_type || l.audit_type || 'NEW');
                  const typeLabel = rawType.toUpperCase();
                  const categorySubtext = l.application_id?.category ? `Annual Certification – ${l.application_id.category}` : (l.audit_type ? `Annual Certification – ${l.audit_type}` : 'Annual Certification – General');
                  const creatorName = getCreatorName(l);

                  return (
                    <tr key={l._id}>
                      <td style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>
                        <div
                          style={{ cursor: 'pointer', transition: 'color 0.15s' }}
                          onClick={() => navigate(getLogsheetLink(l))}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                          onMouseLeave={e => e.currentTarget.style.color = '#0f172a'}
                        >
                          {compName}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{creatorName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.created_by?.email || l.contact_email || 'HFA Staff'}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {siteName}
                      </td>
                      <td>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 2 }}>
                          {typeLabel}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {categorySubtext}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {l.created_at ? new Date(l.created_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${getStatusBadgeClass(l.status)}`}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', position: 'relative' }}>
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
          )}

          {!loading && filteredLogsheets.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-title">No Logsheets Found</div>
              <div className="empty-state-text">
                {searchQuery ? 'No logsheets match your current search or filter.' : 'There are currently no logsheets in the database.'}
              </div>
            </div>
          )}
        </div>

        <Pagination
          currentPage={page}
          totalItems={filteredLogsheets.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="logsheets"
        />
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
