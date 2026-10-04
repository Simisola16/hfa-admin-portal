import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  RefreshCw, Plus, Settings, Eye, Trash2, MapPin, CheckCircle, RotateCcw
} from 'lucide-react';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';
import Pagination from '../components/Pagination';
import SearchWithSuggestions from '../components/SearchWithSuggestions';
import useCompanyDirectory from '../lib/useCompanyDirectory';
import RestoreModal from '../components/RestoreModal';

export default function AdminLogsheetManage() {
  const { companies: directoryCompanies } = useCompanyDirectory();
  const { user, profile } = useAuth();
  const currentUser = profile || user;
  const isSuperAdmin = currentUser?.role === 'superadmin' || (Array.isArray(currentUser?.roles) && currentUser.roles.includes('superadmin'));
  const hasDonePrivilege = isSuperAdmin || Boolean(currentUser?.can_mark_done);

  const [logsheets, setLogsheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('company_name');
  const [filterSite, setFilterSite] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionModalLogsheet, setActionModalLogsheet] = useState(null);
  const [restoreModalItem, setRestoreModalItem] = useState(null);
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

  const handleMarkDone = async (logsheet) => {
    if (!logsheet) return;
    if (!window.confirm(`Mark this logsheet for "${logsheet.company_name}" as Done?`)) return;
    try {
      await api.put(`/api/application-logsheets/${logsheet._id}/mark-done`);
      toast.success('Logsheet marked as Done');
      setActionModalLogsheet(null);
      fetchLogsheets();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to mark as done');
    }
  };

  const handleRestore = (logsheet) => {
    if (!logsheet) return;
    setRestoreModalItem(logsheet);
  };

  const handleConfirmRestore = async (targetStatus) => {
    if (!restoreModalItem) return;
    try {
      const res = await api.put(`/api/application-logsheets/${restoreModalItem._id}/restore`, { targetStatus });
      toast.success(res.data?.message || `Logsheet restored to "${targetStatus}" successfully`);
      setRestoreModalItem(null);
      fetchLogsheets();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to restore logsheet');
      throw err;
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

  // Active company filter: explicit selection or exact typed match
  const activeCompany = useMemo(() => {
    if (selectedCompany) return selectedCompany;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const exact = directoryCompanies.find(c => c.name.trim().toLowerCase() === q);
    return exact ? exact.name : null;
  }, [selectedCompany, searchQuery, directoryCompanies]);

  // Dynamic available sites based on company search (only populated when company is searched)
  const availableSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return []; // Do not show any sites unless a company is searched/picked

    const companySitesMap = new Map();

    if (activeCompany) {
      // EXACT COMPANY SELECTED: Only show sites for THIS specific company!
      const targetLower = activeCompany.trim().toLowerCase();

      // 1. From all companies directory
      directoryCompanies.forEach(c => {
        if (c.name.trim().toLowerCase() === targetLower) {
          (c.sites || []).forEach(s => {
            if (s.name && !companySitesMap.has(s.name.toLowerCase())) {
              companySitesMap.set(s.name.toLowerCase(), { name: s.name, company: c.name });
            }
          });
        }
      });

      // 2. Filter sites to those matching the selected company from loaded logsheets
      logsheets.forEach(l => {
        const comp = (l.company_name || '').trim().toLowerCase();
        if (comp === targetLower) {
          const site = l.site_name || l.application_id?.site_name || l.application_id?.establishment_name;
          if (site && !companySitesMap.has(site.toLowerCase())) {
            companySitesMap.set(site.toLowerCase(), { name: site, company: l.company_name });
          }
        }
      });
    } else {
      // 1. From all companies directory
      directoryCompanies.forEach(c => {
        if (c.name.toLowerCase().includes(q)) {
          (c.sites || []).forEach(s => {
            if (s.name && !companySitesMap.has(s.name.toLowerCase())) {
              companySitesMap.set(s.name.toLowerCase(), { name: s.name, company: c.name });
            }
          });
        }
      });

      // 2. Filter sites to those matching the searched company from loaded logsheets
      logsheets.forEach(l => {
        const comp = (l.company_name || '').toLowerCase();
        if (comp.includes(q)) {
          const site = l.site_name || l.application_id?.site_name || l.application_id?.establishment_name;
          if (site && !companySitesMap.has(site.toLowerCase())) {
            companySitesMap.set(site.toLowerCase(), { name: site, company: l.company_name });
          }
        }
      });
    }

    return Array.from(companySitesMap.values());
  }, [searchQuery, activeCompany, directoryCompanies, logsheets]);

  // Automatically reset site filter if search is cleared
  useEffect(() => {
    if (!searchQuery.trim() && filterSite) {
      setFilterSite('');
    }
  }, [searchQuery, filterSite]);

  // Autocomplete search suggestions (ALL registered companies, sites, and logsheets)
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const companiesMap = new Map();
    const sitesMap = new Map();
    const logsMap = new Map();

    // 1. ALL registered companies and their sites from directory
    directoryCompanies.forEach(c => {
      if (c.name.toLowerCase().includes(q) && !companiesMap.has(c.name.toLowerCase())) {
        companiesMap.set(c.name.toLowerCase(), {
          label: c.name,
          type: 'Company',
          subtext: `${c.sites?.length || 0} registered site${(c.sites?.length || 0) === 1 ? '' : 's'}`
        });
      }
      (c.sites || []).forEach(s => {
        if (s.name && s.name.toLowerCase().includes(q) && !sitesMap.has(s.name.toLowerCase())) {
          sitesMap.set(s.name.toLowerCase(), {
            label: s.name,
            type: 'Site',
            subtext: c.name
          });
        }
      });
    });

    // 2. Fallback to loaded logsheets
    logsheets.forEach(l => {
      const comp = l.company_name;
      if (comp && comp.toLowerCase().includes(q) && !companiesMap.has(comp.toLowerCase())) {
        companiesMap.set(comp.toLowerCase(), {
          label: comp,
          type: 'Company',
          subtext: 'Client Company'
        });
      }
      const site = l.site_name || l.application_id?.site_name || l.application_id?.establishment_name;
      if (site && site.toLowerCase().includes(q) && !sitesMap.has(site.toLowerCase())) {
        sitesMap.set(site.toLowerCase(), {
          label: site,
          type: 'Site',
          subtext: comp || 'Facility'
        });
      }
      const logId = l._id;
      if (logId && String(logId).toLowerCase().includes(q) && !logsMap.has(String(logId).toLowerCase())) {
        logsMap.set(String(logId).toLowerCase(), {
          label: String(logId),
          type: 'Logsheet',
          subtext: comp || 'Logsheet ID'
        });
      }
    });

    const matchingCompanies = Array.from(companiesMap.values());
    const matchingSites = Array.from(sitesMap.values());
    const matchingLogs = Array.from(logsMap.values());

    return [
      ...matchingCompanies.slice(0, 8),
      ...matchingSites.slice(0, 5),
      ...matchingLogs.slice(0, 4)
    ];
  }, [searchQuery, directoryCompanies, logsheets]);

  const filteredLogsheets = logsheets.filter(l => {
    if (l.status === 'Bin' || l.status?.toLowerCase() === 'bin') return false;

    if (filterStatus) {
      const s = (l.status || '').toLowerCase();
      if (s !== filterStatus.toLowerCase()) return false;
    }

    if (filterSite) {
      const site = (l.site_name || l.application_id?.site_name || l.application_id?.establishment_name || '').toLowerCase();
      if (site !== filterSite.toLowerCase()) return false;
    }

    if (activeCompany) {
      const comp = (l.company_name || '').trim().toLowerCase();
      return comp === activeCompany.trim().toLowerCase();
    }

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (searchField === 'id') {
      return l._id?.toLowerCase().includes(query) || 
        l.legacy_id?.toLowerCase().includes(query) ||
        l.direct_ref?.toLowerCase().includes(query) ||
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
  }, [searchQuery, searchField, filterSite, filterStatus]);

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
      case 'Done':
      case 'done':
        return 'badge-green';
      case 'Waiting For Certificate':
      case 'Waiting for Certificate':
        return 'badge-purple';
      default:
        return 'badge-gray';
    }
  };

  const isSeedLogsheet = (l) => {
    if (!l) return false;
    if (l.is_seed) return true;
    if (l.source_type === 'extension_application' || l.extension_application_id) return false;
    if (l.source_type === 'addon_application' || l.addon_application_id) return false;
    if (l.source_type === 'initial_product_application' || l.initial_product_application_id) return false;

    // Check if application is imported legacy application
    if (l.application_id?.notes && (
      l.application_id.notes.toLowerCase().includes('imported') ||
      l.application_id.notes.toLowerCase().includes('legacy')
    )) {
      return true;
    }

    // Historical seed records without created_by
    if (!l.created_by && !l.created_by_name && l.confirmed) {
      return true;
    }

    return false;
  };

  const getLogsheetLink = (l) => {
    if (l.is_kfc || l.source_type === 'kfc' || l.logsheet_type === 'kfc') {
      return `/logsheet/kfc/${l._id}`;
    }
    if (l.source_type === 'extension_application' || l.extension_application_id) {
      const id = l.extension_application_id?._id || l.extension_application_id;
      return `/extension-applications/${id}/logsheet`;
    }
    if (l.source_type === 'direct') {
      return `/logsheets/${l._id}/view`;
    }
    if (l.source_type === 'initial_product_application' || l.initial_product_application_id) {
      const id = l.initial_product_application_id?._id || l.initial_product_application_id;
      return `/initial-products/${id}/logsheet`;
    }
    if (l.source_type === 'addon_application' || l.addon_application_id) {
      const id = l.addon_application_id?._id || l.addon_application_id;
      return `/addon-applications/${id}/logsheet`;
    }
    if (isSeedLogsheet(l)) {
      return `/logsheets/${l._id}/view`;
    }
    const id = l.application_id?._id || l.application_id;
    return id ? `/applications/${id}/logsheet?logsheet_id=${l._id}` : `/logsheets/${l._id}/view`;
  };

  return (
    <div className="page-content">

      {/* Toolbar consistent with AdminApplications */}
      <div className="toolbar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchWithSuggestions
          value={searchQuery}
          onChange={val => {
            setSearchQuery(val);
            if (selectedCompany && val.trim().toLowerCase() !== selectedCompany.trim().toLowerCase()) {
              setSelectedCompany(null);
            }
            setPage(1);
          }}
          onSelect={item => {
            if (item.type === 'Company') {
              setSelectedCompany(item.label);
              setSearchQuery(item.label);
            } else {
              setSelectedCompany(null);
              setSearchQuery(item.label);
            }
            setPage(1);
          }}
          suggestions={searchSuggestions}
          placeholder={`Search by ${searchField.replace('_', ' ')}...`}
        />
        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={searchField}
          onChange={e => {
            setSearchField(e.target.value);
            setPage(1);
          }}
        >
          <option value="company_name">Company Name</option>
          <option value="site_name">Site Name</option>
          <option value="created_by">Created By</option>
          <option value="id">Logsheet ID</option>
          <option value="status">Status</option>
          <option value="audit_type">Logsheet Type</option>
        </select>

        {/* Filter by Status */}
        <select
          className="form-control"
          style={{ width: 'auto', fontWeight: 600 }}
          value={filterStatus}
          onChange={e => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="Waiting for Signature">Waiting for Signature</option>
          <option value="Signed">Signed</option>
          <option value="Waiting For Certificate">Waiting For Certificate</option>
          <option value="Completed">Completed</option>
          <option value="Done">Done</option>
        </select>

        {/* Filter by Site (dynamically narrowed to searched company) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={15} style={{ color: searchQuery.trim() ? 'var(--primary, #2563eb)' : '#94a3b8' }} />
          <select
            className="form-control"
            style={{ 
              width: 240, 
              minWidth: 240,
              maxWidth: 240,
              fontWeight: 600,
              backgroundColor: searchQuery.trim() ? '#ffffff' : '#f8fafc',
              cursor: searchQuery.trim() ? 'pointer' : 'not-allowed',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}
            value={filterSite}
            disabled={!searchQuery.trim()}
            onChange={e => {
              setFilterSite(e.target.value);
              setPage(1);
            }}
          >
            {!searchQuery.trim() ? (
              <option value="">Select a company first to filter sites</option>
            ) : availableSites.length === 0 ? (
              <option value="">No sites found for "{searchQuery.trim()}"</option>
            ) : (
              <>
                <option value="">
                  {`All Sites for "${searchQuery.trim()}" (${availableSites.length})`}
                </option>
                {availableSites.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filteredLogsheets.length} logsheets
        </span>

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
                  <th style={{ width: 50, textAlign: 'center' }}>S/N</th>
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
                {paginatedLogsheets.map((l, index) => {
                  const compName = l.company_name || 'Client Facility';
                  const siteName = l.site_name || l.application_id?.site_name || l.application_id?.establishment_name || 'Main Facility';
                  const isKfc = Boolean(l.is_kfc || l.source_type === 'kfc' || l.logsheet_type === 'kfc');
                  const rawType = isKfc ? '🍗 KFC LOGSHEET' : (l.source_type === 'extension_application' ? 'EXTENSION' : (l.application_id?.application_type || l.audit_type || 'NEW'));
                  const typeLabel = rawType.toUpperCase();
                  const categorySubtext = isKfc ? 'Special Grant – KFC Committee Approved' : (l.application_id?.category ? `Annual Certification – ${l.application_id.category}` : (l.audit_type ? `Annual Certification – ${l.audit_type}` : 'Annual Certification – General'));
                  const creatorName = getCreatorName(l);

                  return (
                    <tr key={l._id}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13 }}>
                        {(page - 1) * pageSize + index + 1}
                      </td>
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
                        <div style={{ fontSize: 11, fontWeight: 800, color: isKfc ? '#dc2626' : 'var(--primary)', textTransform: 'uppercase', marginBottom: 2 }}>
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
        const isSeed = isSeedLogsheet(l);
        const targetAppId = l.application_id?._id || l.application_id || l.extension_application_id?._id || l.extension_application_id || l.addon_application_id?._id || l.addon_application_id;
        const canOpenAppProcessing = !isSeed && Boolean(targetAppId);

        return (
          <ActionModal
            isOpen={Boolean(actionModalLogsheet)}
            onClose={() => setActionModalLogsheet(null)}
            title="Logsheet Actions"
            subtitle={l.company_name}
            badge={`Status: ${l.status || 'Active'}`}
            badgeVariant={getStatusBadgeClass(l.status)}
            actions={[
              canOpenAppProcessing && {
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
              },
              hasDonePrivilege && l.status !== 'Done' && l.status !== 'done' && {
                label: 'Mark as Done',
                description: 'Mark this logsheet as completed / Done',
                icon: CheckCircle,
                variant: 'success',
                onClick: () => {
                  const item = actionModalLogsheet;
                  setActionModalLogsheet(null);
                  if (item) handleMarkDone(item);
                }
              },
              hasDonePrivilege && (l.status === 'Done' || l.status === 'done') && {
                label: 'Restore Logsheet',
                description: 'Restore this logsheet back to its active status',
                icon: RotateCcw,
                variant: 'warning',
                onClick: () => {
                  const item = actionModalLogsheet;
                  setActionModalLogsheet(null);
                  if (item) handleRestore(item);
                }
              }
            ].filter(Boolean)}
          />
        );
      })()}

      <RestoreModal
        isOpen={Boolean(restoreModalItem)}
        onClose={() => setRestoreModalItem(null)}
        itemName={restoreModalItem?.company_name || 'Logsheet'}
        itemType="logsheet"
        defaultStatus={restoreModalItem?.previous_status}
        onConfirm={handleConfirmRestore}
      />
    </div>
  );
}
