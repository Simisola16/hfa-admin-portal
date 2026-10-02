import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, Search, Trash2, Eye, RefreshCw, ChevronDown, 
  MapPin, User, Calendar, Tag, Shield, Clock, CheckCircle2, Mail, PenTool, ArrowRight, Award, Settings, CheckCircle, RotateCcw
} from 'lucide-react';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';
import Pagination from '../components/Pagination';
import RestoreModal from '../components/RestoreModal';
import { canIssueCertificate } from '../lib/permissions';

export default function AdminLogsheetWaitingCertificate() {
  const { user, profile } = useAuth();
  const currentUser = profile || user;
  const isSuperAdmin = currentUser?.role === 'superadmin' || (Array.isArray(currentUser?.roles) && currentUser.roles.includes('superadmin'));
  const hasDonePrivilege = isSuperAdmin || Boolean(currentUser?.can_mark_done);

  const [logsheets, setLogsheets] = useState([]);
  const [doneLogsheets, setDoneLogsheets] = useState([]);
  const [filterTab, setFilterTab] = useState('active'); // 'active' | 'done'
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('company_name');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [actionModalLogsheet, setActionModalLogsheet] = useState(null);
  const [restoreModalItem, setRestoreModalItem] = useState(null);
  const navigate = useNavigate();


  const fetchLogsheets = async () => {
    setLoading(true);
    try {
      const [logsRes, certsRes, extRes] = await Promise.all([
        api.get('/api/application-logsheets'),
        api.get('/api/certificates?all=true&minimal=true').catch(() => ({ data: [] })),
        api.get('/api/extension-applications').catch(() => ({ data: { data: [] } }))
      ]);
      const allLogs = logsRes.data?.data || logsRes.data || [];
      const allCerts = Array.isArray(certsRes.data?.data) ? certsRes.data.data : (Array.isArray(certsRes.data) ? certsRes.data : (Array.isArray(certsRes) ? certsRes : []));
      const extApps = extRes.data?.data || (Array.isArray(extRes.data) ? extRes.data : []);

      // Build a set of application IDs that already have an active, under_review, renewed, or valid certificate
      const certifiedAppIds = new Set(
        allCerts
          .filter(c => ['active', 'under_review', 'renewed', 'expired'].includes(c.status))
          .map(c => String(c.application_id?._id || c.application_id))
          .filter(Boolean)
      );

      // Filter logsheets in "Waiting For Certificate" status:
      // Exclude completed logsheets, initial product logsheets, and applications that already have an issued certificate
      const waitingLogs = allLogs.filter(l => {
        // Exclude completed or done logsheets
        if (l.status === 'Completed' || l.status === 'Done' || l.status === 'done') return false;

        // Exclude Initial Product logsheets (Initial Product approvals do not issue standalone facility certificates)
        if (l.source_type === 'initial_product_application' || l.initial_product_application_id || l.audit_type === 'Initial Product Evaluation') {
          return false;
        }

        // 1. Any logsheet explicitly in Waiting For Certificate status should always be displayed
        if (l.status === 'Waiting For Certificate' || l.status === 'Waiting for Certificate') {
          return true;
        }

        // 2. Direct logsheets: show if marked Waiting For Certificate
        if (l.source_type === 'direct') {
          return l.status === 'Waiting For Certificate';
        }

        // 3. Add-on application logsheets: show if add-on application is ready for certificate
        const isAddon = l.source_type === 'addon_application' || Boolean(l.addon_application_id);
        if (isAddon) {
          if (l.addon_application_id?.status === 'completed' || l.addon_application_id?.status === 'done') return false;
          return l.addon_application_id?.status === 'ready_for_certificate' || l.addon_application_id?.status === 'product_form_approved';
        }

        // 4. Main application logsheets (HFA New, Renewal, Surveillance, GSO, etc.)
        const appId = String(l.application_id?._id || l.application_id || '');
        if (l.application_id?.status === 'certificate_issued' || l.application_id?.status === 'done' || (appId && certifiedAppIds.has(appId))) {
          return false;
        }

        // Show if live workflow application has officially reached 'ready_for_certificate' (or 'waiting_for_certificate')
        const appStatus = l.application_id?.status;
        const isAppReadyForCert = appStatus === 'ready_for_certificate' || appStatus === 'waiting_for_certificate';
        return isAppReadyForCert;
      });

      // Filter logsheets in Done status that originated from waiting for certificate
      const doneLogs = allLogs.filter(l => {
        if (l.status !== 'Done' && l.status !== 'done') return false;
        if (l.source_type === 'initial_product_application' || l.initial_product_application_id || l.audit_type === 'Initial Product Evaluation') {
          return false;
        }
        const isFromCert = l.previous_status === 'Waiting For Certificate' || l.previous_status === 'Waiting for Certificate' || l.previous_status === 'Signed';
        if (isFromCert) return true;
        const sigCount = (l.mufti_signature ? 1 : 0) + (l.ceo_signature ? 1 : 0) + (l.manager_signature ? 1 : 0) + (l.mufti2_signature ? 1 : 0);
        return sigCount >= 3 && l.previous_status !== 'Waiting for Signature';
      });

      // Filter signed Extension logsheets that are awaiting certificate issuance
      const waitingExtLogs = extApps
        .filter(extApp => {
          const log = extApp.logsheet_id;
          if (!log) return false;
          if (extApp.status === 'extension_approved' || extApp.status === 'rejected' || log.status === 'Approved' || log.status === 'Done' || log.status === 'done') {
            return false;
          }

          const is30Days = log.extension_duration_type === '30_days' || Number(log.extension_days) <= 30;
          const isSigned = is30Days
            ? Boolean(log.single_signature)
            : Boolean(log.mufti_signature && log.ceo_signature && log.manager_signature && log.mufti2_signature);

          return isSigned || log.status === 'Signed' || extApp.status === 'logsheet_signed';
        })
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
            suggested_certificate_type: log.suggested_certificate_type || log.certificate_type || extApp.suggested_certificate_type || 'Extension Certificate',
            certificate_type: log.certificate_type || log.suggested_certificate_type || 'Extension Certificate',
            contact_person: log.contact_person || extApp.contact_person || '—',
            contact_email: extApp.contact_email || extApp.client_id?.email || '',
            created_at: log.created_at || extApp.created_at || extApp.createdAt,
            updated_at: log.updated_at || extApp.updated_at,
            audit_type: `Extension (${log.extension_days || 30} Days)`,
            status: 'Waiting For Certificate',
            signatures_required: is30Days ? 1 : 4,
            extension_duration_type: log.extension_duration_type,
            single_signature: log.single_signature,
            mufti_signature: log.mufti_signature,
            ceo_signature: log.ceo_signature,
            manager_signature: log.manager_signature,
            mufti2_signature: log.mufti2_signature
          };
        });

      // Filter signed Extension logsheets that were marked Done
      const doneExtLogs = extApps
        .filter(extApp => {
          const log = extApp.logsheet_id;
          if (!log) return false;
          if (log.status !== 'Done' && log.status !== 'done') return false;
          return log.previous_status === 'Signed' || log.previous_status === 'Approved' || log.previous_status === 'Waiting For Certificate';
        })
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
            suggested_certificate_type: log.suggested_certificate_type || log.certificate_type || extApp.suggested_certificate_type || 'Extension Certificate',
            certificate_type: log.certificate_type || log.suggested_certificate_type || 'Extension Certificate',
            contact_person: log.contact_person || extApp.contact_person || '—',
            contact_email: extApp.contact_email || extApp.client_id?.email || '',
            created_at: log.created_at || extApp.created_at || extApp.createdAt,
            updated_at: log.updated_at || extApp.updated_at,
            audit_type: `Extension (${log.extension_days || 30} Days)`,
            status: 'Done',
            signatures_required: is30Days ? 1 : 4,
            extension_duration_type: log.extension_duration_type,
            single_signature: log.single_signature,
            mufti_signature: log.mufti_signature,
            ceo_signature: log.ceo_signature,
            manager_signature: log.manager_signature,
            mufti2_signature: log.mufti2_signature
          };
        });

      setLogsheets([...waitingLogs, ...waitingExtLogs]);
      setDoneLogsheets([...doneLogs, ...doneExtLogs]);
    } catch (err) {
      toast.error('Failed to load completed logsheets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsheets();
  }, []);

  const handleDelete = async (id, e, item = null) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this logsheet record? This action cannot be undone.')) return;
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

  const getSignatoryProgress = (l) => {
    if (l.source_type === 'extension_application' || l.extension_application_id) {
      const is30Days = l.signatures_required === 1 || l.extension_duration_type === '30_days';
      if (is30Days) {
        return {
          count: l.single_signature ? 1 : 0,
          total: 1,
          signers: [{ role: 'Authorized Signatory', signed: !!l.single_signature }]
        };
      }
    }
    const signers = [
      { role: 'Mufti', signed: !!l.mufti_signature },
      { role: 'CEO', signed: !!l.ceo_signature },
      { role: 'Manager', signed: !!l.manager_signature },
      { role: 'Mufti 2', signed: !!l.mufti2_signature },
    ];
    const count = signers.filter(s => s.signed).length;
    return { count, total: 4, signers };
  };

  const getCertificateTypeInfo = (l) => {
    const app = l.application_id || {};
    // Check application category/standard first
    const appCat = String(
      app.category ||
      app.standard ||
      app.halal_standard ||
      app.scheme ||
      app.certification_scheme ||
      ''
    ).trim();

    // Check logsheet fields
    const logCat = String(
      l.certificate_standard ||
      l.certificate_type ||
      l.suggested_certificate_type ||
      ''
    ).trim();

    // Extract valid raw candidate string (ignoring numeric IDs, empty, or "N/A")
    let raw = '';
    if (appCat && !/^\d+$/.test(appCat) && appCat.toUpperCase() !== 'N/A') {
      raw = appCat;
    } else if (logCat && !/^\d+$/.test(logCat) && logCat.toUpperCase() !== 'N/A') {
      raw = logCat;
    } else if (app.suggested_certificate_type && !/^\d+$/.test(app.suggested_certificate_type)) {
      raw = app.suggested_certificate_type;
    } else if (l.audit_type && !/^\d+$/.test(l.audit_type)) {
      raw = l.audit_type;
    } else if (appCat) {
      raw = appCat;
    }

    const u = String(raw || '').toUpperCase();
    let displayType = 'HFA';
    let bg = '#dcfce7';
    let color = '#166534';
    let border = '#bbf7d0';

    if (u.includes('GSO') && u.includes('MEAT') && !u.includes('NON')) {
      displayType = 'GSO MEAT';
      bg = '#fef3c7';
      color = '#92400e';
      border = '#fde68a';
    } else if (u.includes('GSO') && (u.includes('NON') || u.includes('FOOD'))) {
      displayType = 'GSO NON MEAT';
      bg = '#e0f2fe';
      color = '#0369a1';
      border = '#bae6fd';
    } else if (u.includes('GSO')) {
      displayType = 'GSO';
      bg = '#e0f2fe';
      color = '#0369a1';
      border = '#bae6fd';
    } else if ((u.includes('HFA') || u.includes('ANNUAL') || !u.includes('GSO')) && u.includes('MEAT') && !u.includes('NON')) {
      displayType = 'HFA SCHEME MEAT';
      bg = '#fee2e2';
      color = '#991b1b';
      border = '#fca5a5';
    } else if (u.includes('HFA') || u.includes('ANNUAL')) {
      displayType = (u.includes('NON') || u.includes('FOOD') || u.includes('GENERAL')) ? 'HFA SCHEME NON MEAT' : 'HFA';
      bg = '#dcfce7';
      color = '#166534';
      border = '#bbf7d0';
    } else if (u.includes('COSMETIC')) {
      displayType = 'COSMETICS';
      bg = '#f3e8ff';
      color = '#6b21a8';
      border = '#e9d5ff';
    } else if (u.includes('SMIIC')) {
      displayType = 'SMIIC';
      bg = '#e0e7ff';
      color = '#3730a3';
      border = '#c7d2fe';
    } else if (u.includes('EXTENSION') || l.source_type === 'extension_application') {
      displayType = 'Extension';
      bg = '#ccfbf1';
      color = '#0f766e';
      border = '#99f6e4';
    } else {
      // Fallback: check if application category has GSO or HFA
      if (appCat.toUpperCase().includes('GSO')) {
        displayType = 'GSO';
        bg = '#e0f2fe';
        color = '#0369a1';
        border = '#bae6fd';
      } else {
        const isMeatFallback = appCat.toLowerCase().includes('meat') || (l.product_category || '').toLowerCase().includes('meat');
        displayType = isMeatFallback ? 'HFA SCHEME MEAT' : 'HFA';
        bg = isMeatFallback ? '#fee2e2' : '#dcfce7';
        color = isMeatFallback ? '#991b1b' : '#166534';
        border = isMeatFallback ? '#fca5a5' : '#bbf7d0';
      }
    }

    return { certType: displayType, bg, color, border };
  };

  const getApplicationTypeInfo = (l) => {
    if (l.source_type === 'extension_application' || l.extension_application_id) {
      return { type: 'Extension', bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4', icon: Clock };
    }
    if (l.source_type === 'addon_application' || l.addon_application_id) {
      return { type: 'Add-On', bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', icon: Tag };
    }

    const app = l.application_id || {};
    const raw = String(
      app.application_type ||
      l.application_type ||
      l.audit_type ||
      app.type ||
      ''
    ).toLowerCase();

    if (app.is_surveillance || l.is_surveillance || raw.includes('surv')) {
      return { type: 'Surveillance', bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: Shield };
    }
    if (app.is_renewal || l.is_renewal || raw.includes('renew')) {
      return { type: 'Renewal', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd', icon: RefreshCw };
    }
    if (raw.includes('new') || raw.includes('init') || raw.includes('first')) {
      return { type: 'New', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', icon: FileText };
    }

    return { type: 'New', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', icon: FileText };
  };

  const currentList = filterTab === 'done' ? doneLogsheets : logsheets;

  const filteredLogsheets = currentList.filter(l => {
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
    if (searchField === 'certificate_type') {
      const { certType } = getCertificateTypeInfo(l);
      return certType.toLowerCase().includes(query);
    }
    if (searchField === 'application_type') {
      const { type } = getApplicationTypeInfo(l);
      return type.toLowerCase().includes(query);
    }
    if (searchField === 'contact_person') {
      return l.contact_person?.toLowerCase().includes(query);
    }
    if (searchField === 'audit_type') {
      return l.audit_type?.toLowerCase().includes(query);
    }
    return true;
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, searchField, filterTab]);

  const paginatedLogsheets = filteredLogsheets.slice((page - 1) * pageSize, page * pageSize);

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
      `}</style>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Logsheets</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>Waiting for Certificate</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={24} style={{ color: '#16a34a' }} />
            Waiting for Certificate
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Completed logsheets with 3+ signatures awaiting final certificate issuance.
          </p>
        </div>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={fetchLogsheets} 
          disabled={loading} 
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 14px', background: '#fff' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Reload
        </button>
      </div>

      {/* Main Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        {/* Summary & Filters Header Bar */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%)',
          borderBottom: '1px solid #bbf7d0',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setFilterTab('active'); setPage(1); }}
              style={{
                background: filterTab === 'active' ? '#16a34a' : '#fff',
                color: filterTab === 'active' ? '#fff' : '#15803d',
                border: '1px solid #86efac',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: filterTab === 'active' ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none'
              }}
            >
              <Award size={14} />
              Waiting for Certificate ({logsheets.length})
            </button>
            <button
              type="button"
              onClick={() => { setFilterTab('done'); setPage(1); }}
              style={{
                background: filterTab === 'done' ? '#059669' : '#fff',
                color: filterTab === 'done' ? '#fff' : '#334155',
                border: '1px solid #cbd5e1',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: filterTab === 'done' ? '0 2px 8px rgba(5, 150, 105, 0.25)' : 'none'
              }}
            >
              <CheckCircle size={14} />
              Done Logsheets ({doneLogsheets.length})
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1', maxWidth: 500, minWidth: 280 }}>
            <div style={{ position: 'relative', width: 160 }}>
              <select 
                className="form-control logsheet-select"
                value={searchField}
                onChange={e => setSearchField(e.target.value)}
                style={{
                  paddingRight: 28,
                  height: 38,
                  fontSize: 13,
                  cursor: 'pointer',
                  background: 'white',
                  borderRadius: 8,
                  fontWeight: 500,
                  color: '#334155',
                  border: '1px solid #bbf7d0'
                }}
              >
                <option value="company_name">Company Name</option>
                <option value="id">Logsheet ID</option>
                <option value="certificate_type">Certificate Type</option>
                <option value="application_type">Application Type</option>
                <option value="audit_type">Logsheet Type</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
            </div>

            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder={`Search by ${searchField.replace('_', ' ')}...`}
                className="form-control logsheet-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: 34,
                  height: 38,
                  fontSize: 13,
                  borderRadius: 8,
                  background: 'white',
                  border: '1px solid #bbf7d0'
                }}
              />
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {/* Content View */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px', width: 28, height: 28 }} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading completed logsheets...</div>
          </div>
        ) : filteredLogsheets.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CheckCircle2 size={24} style={{ color: '#16a34a' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {searchQuery ? 'No matching logsheets found' : 'No logsheets waiting for certificate'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 400, margin: '4px auto 0' }}>
              {searchQuery 
                ? 'Try adjusting your search query or filter criteria.' 
                : 'Logsheets marked done (with 3+ signatures) will appear here in this holding view.'}
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table logsheet-table" style={{ width: '100%', margin: 0, fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'center', width: 50 }}>S/N</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Company &amp; Site</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Certificate Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Application Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogsheets.map((l, index) => {
                  const appId = l.application_id?._id || l.application_id;
                  const certInfo = getCertificateTypeInfo(l);
                  const appTypeInfo = getApplicationTypeInfo(l);
                  const AppTypeIcon = appTypeInfo.icon || FileText;

                  return (
                    <tr key={l._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{l.company_name || 'Company Facility'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <MapPin size={11} />
                          {l.site_name || l.site_id?.name || l.application_id?.site_name || l.establishment_name || 'Main Site'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          background: certInfo.bg,
                          color: certInfo.color,
                          border: `1px solid ${certInfo.border}`,
                          letterSpacing: '0.02em',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}>
                          <Award size={13} style={{ color: certInfo.color, flexShrink: 0 }} />
                          {certInfo.certType}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 11px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          background: appTypeInfo.bg,
                          color: appTypeInfo.color,
                          border: `1px solid ${appTypeInfo.border}`,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                          <AppTypeIcon size={12} style={{ color: appTypeInfo.color, flexShrink: 0 }} />
                          {appTypeInfo.type}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        {l.status === 'Done' || l.status === 'done' ? (
                          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12} /> Done
                          </span>
                        ) : (
                          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12} /> Waiting For Certificate
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: 12, color: '#475569' }}>
                        {(l.created_at || l.createdAt) ? new Date(l.created_at || l.createdAt).toLocaleDateString('en-GB') : '—'}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <ActionTriggerButton
                          onClick={() => setActionModalLogsheet(l)}
                          title="Logsheet Actions"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          total={filteredLogsheets.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Action Menu Pop-up Modal */}
      {actionModalLogsheet && (() => {
        const l = actionModalLogsheet;
        const appId = l.application_id?._id || l.application_id;
        const isExtension = l.source_type === 'extension_application' || l.extension_application_id;
        const isAddon = l.source_type === 'addon_application' || l.addon_application_id;
        const extId = l.extension_application_id?._id || l.extension_application_id;
        const addonId = l.addon_application_id?._id || l.addon_application_id;

        const isDirect = l.source_type === 'direct' || (!appId && !isExtension && !isAddon);

        const certInfo = getCertificateTypeInfo(l);
        const resolvedType = certInfo.certType || l.suggested_certificate_type || l.certificate_standard || 'HFA SCHEME MEAT';
        const clientId = l.client_id?._id || l.client_id || l.application_id?.client_id?._id || l.application_id?.client_id || '';

        const issueCertUrl = isExtension
          ? `/extension-applications/${extId}/processing`
          : isAddon
          ? `/addon-applications/${addonId}/issue-certificate?logsheet_id=${l._id}&cert_type=${encodeURIComponent(resolvedType)}`
          : appId
          ? `/applications/${appId}/issue-certificate?logsheet_id=${l._id}&cert_type=${encodeURIComponent(resolvedType)}`
          : `/applications/${l._id}/issue-certificate?logsheet_id=${l._id}&cert_type=${encodeURIComponent(resolvedType)}`;

        const logsheetUrl = isDirect
          ? `/logsheet/direct/${l._id}`
          : isExtension
          ? `/extension-applications/${extId}/logsheet`
          : isAddon
          ? `/addon-applications/${addonId}/logsheet`
          : `/applications/${appId}/logsheet`;

        return (
          <ActionModal
            isOpen={Boolean(actionModalLogsheet)}
            onClose={() => setActionModalLogsheet(null)}
            title={l.company_name}
            subtitle={`App #${l.application_number || l.application_id?.application_number || '—'} · ${getCertificateTypeInfo(l).certType}`}
            badge={
              <span style={{ fontSize: 11.5, color: l.status === 'Done' || l.status === 'done' ? '#15803d' : '#64748b' }}>
                Status: {l.status === 'Done' || l.status === 'done' ? 'Done' : 'Waiting for Certificate'} • {getCertificateTypeInfo(l).certType}
              </span>
            }
            actions={[
              ...(canIssueCertificate(currentUser) ? [{
                label: 'Issue Certificate Studio',
                description: 'Open dedicated studio to generate and issue certificate',
                icon: Award,
                variant: 'primary',
                onClick: () => navigate(issueCertUrl)
              }] : []),
              {
                label: 'View Signed Logsheet',
                description: 'Inspect completed logsheet and committee signatures',
                icon: Eye,
                variant: 'default',
                onClick: () => navigate(logsheetUrl)
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
                description: 'Restore this logsheet back to active status',
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

