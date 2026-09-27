import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Award, Search, Plus, X, Download, Calendar, CheckCircle, AlertCircle, FileText, ShieldCheck, Edit3, Eye, ChevronDown, Send, ArrowRight, MapPin } from 'lucide-react';
import ViewCertificateModal from '../components/ViewCertificateModal';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import SearchWithSuggestions from '../components/SearchWithSuggestions';
import useCompanyDirectory from '../lib/useCompanyDirectory';
import { getPdfUrl } from '../lib/pdfUtils';


export default function AdminCertificates({ defaultTab }) {
  const { companies: directoryCompanies } = useCompanyDirectory();
  const { user, profile } = useAuth();
  const currentUser = profile || user;
  const userRoles = Array.isArray(currentUser?.roles) && currentUser.roles.length > 0
    ? currentUser.roles
    : (currentUser?.role ? [currentUser.role] : []);
  const isSuperAdmin = userRoles.includes('superadmin') || currentUser?.role === 'superadmin';
  const canReviewCertificate = isSuperAdmin || Boolean(currentUser?.can_review_certificate);

  const navigate = useNavigate();

  const getApplicationTypeDisplay = (c) => {
    if (c.is_add_on) return 'Addon';
    if (c.certificate_type === 'Extension' || c.is_extension) return 'Extension';
    if (c.is_direct_issuance) return 'Direct';

    const appType = c.application_id?.application_type || c.application_type;
    if (appType) {
      const lower = String(appType).toLowerCase();
      if (lower.includes('renew')) return 'Renewal';
      if (lower.includes('new') || lower.includes('initial')) return 'New';
      if (lower.includes('surveill')) return 'Surveillance';
      if (lower.includes('addon') || lower.includes('add-on')) return 'Addon';
      if (lower.includes('extens')) return 'Extension';
    }

    const num = c.certificate_number || '';
    if (num.includes('-RE-') || num.includes('/RE/') || num.includes('REN-')) return 'Renewal';
    if (num.includes('-NE-') || num.includes('/NE/') || num.includes('NEW-')) return 'New';
    if (num.includes('-SU-') || num.includes('/SU/') || num.includes('SUR-')) return 'Surveillance';
    if (num.includes('-AD-') || num.includes('/AD/') || num.includes('ADD-')) return 'Addon';
    if (num.includes('-EX-') || num.includes('/EX/') || num.includes('EXT-')) return 'Extension';

    return 'New';
  };
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState((defaultTab === 'review' && canReviewCertificate) ? 'review' : 'certs'); // 'review' | 'certs'
  const [showModal, setShowModal] = useState(false);
  const [viewingCert, setViewingCert] = useState(null);
  const [actionModalCert, setActionModalCert] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [apps, setApps] = useState([]);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const statusParam = searchParams.get('status') || searchParams.get('filter');
    if ((statusParam === 'under_review' || statusParam === 'review') && canReviewCertificate) {
      setActiveTab('review');
      setFilterStatus('under_review');
    } else if (statusParam && statusParam !== 'under_review' && statusParam !== 'review') {
      setActiveTab('certs');
      setFilterStatus(statusParam.toLowerCase());
    } else {
      if (defaultTab === 'review' && canReviewCertificate) {
        setActiveTab('review');
        setFilterStatus('under_review');
      } else {
        setActiveTab('certs');
        setFilterStatus('');
      }
    }
  }, [searchParams, canReviewCertificate, defaultTab]);
  
  const [form, setForm] = useState({ 
    client_id: '', 
    application_id: '', 
    certificate_type: 'HFA SCHEME MEAT', 
    issue_date: '', 
    expiry_date: '', 
    products_covered: '' 
  });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const certsRes = await api.get('/api/certificates');
      const rawCerts = Array.isArray(certsRes) ? certsRes : (Array.isArray(certsRes?.data) ? certsRes.data : []);
      setCerts(rawCerts);
    } catch (err) {
      toast.error('Failed to load certificates.');
    } finally {
      setLoading(false);
    }
  };

  const loadAppsForModal = async () => {
    if (apps.length > 0) return;
    try {
      const appsRes = await api.get('/api/applications');
      const rawApps = Array.isArray(appsRes) ? appsRes : (Array.isArray(appsRes?.data) ? appsRes.data : []);
      setApps(rawApps.filter(a => a && (a.status === 'approved' || a.status === 'ready_for_certificate' || a.status === 'certificate_issued')));
    } catch (err) {
      console.error('Failed to load applications for modal:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setSubmitting(true);
    const app = apps.find(a => a.id === form.application_id || a._id === form.application_id);
    const clientId = app?.client_id || app?.profiles?._id || app?.profiles?.id;
    const payload = { 
      ...form, 
      client_id: clientId,
      company_name: app?.establishment_name || app?.profiles?.company_name || '',
      company_address: app?.establishment_address || app?.profiles?.address || '',
      manufacturing_address: app?.manufacturer_address || app?.establishment_address || '',
      scope: app?.scope || 'Halal Food Certification',
      status: 'under_review'
    };
    try { 
      const res = await api.post('/api/certificates', payload); 
      const created = res.data?.data || res.data;
      toast.success('Certificate created and sent to Review Certification.'); 
      setShowModal(false); 
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create certificate.');
    } finally {
      setSubmitting(false);
    }
  };


  const handleRevoke = async (id) => {
    const reason = window.prompt('Please enter the reason for certificate revocation:');
    if (!reason) return;
    try {
      await api.put(`/api/certificates/${id}/revoke`, { reason });
      toast.success('Certificate revoked.');
      fetchAllData();
    } catch (err) {
      toast.error(err.message || 'Failed to revoke certificate.');
    }
  };

  const underReviewCerts = useMemo(() => {
    return certs.filter(c => {
      const s = (c.status || '').toLowerCase().trim();
      return s === 'under_review' || s === 'draft';
    });
  }, [certs]);

  const activeCertsCount = useMemo(() => {
    return certs.filter(c => (c.status || '').toLowerCase().trim() === 'active').length;
  }, [certs]);

  const expiredCertsCount = useMemo(() => {
    return certs.filter(c => (c.status || '').toLowerCase().trim() === 'expired').length;
  }, [certs]);

  // Active company filter: explicit selection or exact typed match
  const activeCompany = useMemo(() => {
    if (selectedCompany) return selectedCompany;
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const exact = directoryCompanies.find(c => c.name.trim().toLowerCase() === q);
    return exact ? exact.name : null;
  }, [selectedCompany, search, directoryCompanies]);

  // Dynamic available sites based on company search (only populated when company is searched)
  const availableSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return []; // Do not show any sites unless a company is searched/picked

    const companySitesMap = new Map();

    if (activeCompany) {
      // EXACT COMPANY SELECTED: Only show sites for THIS specific company!
      const targetLower = activeCompany.trim().toLowerCase();
      directoryCompanies.forEach(c => {
        if (c.name.trim().toLowerCase() === targetLower) {
          (c.sites || []).forEach(s => {
            if (s.name && !companySitesMap.has(s.name.toLowerCase())) {
              companySitesMap.set(s.name.toLowerCase(), { name: s.name, company: c.name });
            }
          });
        }
      });

      certs.forEach(c => {
        const comp = (c.company_name || c.profiles?.company_name || c.application_id?.establishment_name || '').trim().toLowerCase();
        if (comp === targetLower) {
          const site = c.site_name || c.site_id?.name || c.site_id?.est_name || c.application_id?.site_name;
          if (site && !companySitesMap.has(site.toLowerCase())) {
            companySitesMap.set(site.toLowerCase(), { name: site, company: c.company_name });
          }
        }
      });
    } else {
      // Partial typing: show matching sites
      directoryCompanies.forEach(c => {
        if (c.name.toLowerCase().includes(q)) {
          (c.sites || []).forEach(s => {
            if (s.name && !companySitesMap.has(s.name.toLowerCase())) {
              companySitesMap.set(s.name.toLowerCase(), { name: s.name, company: c.name });
            }
          });
        }
      });

      certs.forEach(c => {
        const comp = (c.company_name || c.profiles?.company_name || c.application_id?.establishment_name || '').toLowerCase();
        if (comp.includes(q)) {
          const site = c.site_name || c.site_id?.name || c.site_id?.est_name || c.application_id?.site_name;
          if (site && !companySitesMap.has(site.toLowerCase())) {
            companySitesMap.set(site.toLowerCase(), { name: site, company: c.company_name });
          }
        }
      });
    }

    return Array.from(companySitesMap.values());
  }, [search, activeCompany, directoryCompanies, certs]);

  // Automatically reset site filter if search is cleared
  useEffect(() => {
    if (!search.trim() && filterSite) {
      setFilterSite('');
    }
  }, [search, filterSite]);

  // Autocomplete search suggestions (ALL registered companies, sites, and certificate numbers)
  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const companiesMap = new Map();
    const sitesMap = new Map();
    const certsMap = new Map();

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

    // 2. Fallback to loaded certs (companies, sites, and certificate numbers)
    certs.forEach(c => {
      const comp = c.company_name || c.profiles?.company_name || c.application_id?.establishment_name;
      if (comp && comp.toLowerCase().includes(q) && !companiesMap.has(comp.toLowerCase())) {
        companiesMap.set(comp.toLowerCase(), {
          label: comp,
          type: 'Company',
          subtext: 'Certified Company'
        });
      }
      const site = c.site_name || c.site_id?.name || c.site_id?.est_name || c.application_id?.site_name;
      if (site && site.toLowerCase().includes(q) && !sitesMap.has(site.toLowerCase())) {
        sitesMap.set(site.toLowerCase(), {
          label: site,
          type: 'Site',
          subtext: comp || 'Certified Facility'
        });
      }
      const certNo = c.certificate_number;
      if (certNo && certNo.toLowerCase().includes(q) && !certsMap.has(certNo.toLowerCase())) {
        certsMap.set(certNo.toLowerCase(), {
          label: certNo,
          type: 'Certificate',
          subtext: comp || 'Certificate #'
        });
      }
    });

    const matchingCompanies = Array.from(companiesMap.values());
    const matchingSites = Array.from(sitesMap.values());
    const matchingCerts = Array.from(certsMap.values());

    return [
      ...matchingCompanies.slice(0, 8),
      ...matchingSites.slice(0, 5),
      ...matchingCerts.slice(0, 4)
    ];
  }, [search, directoryCompanies, certs]);

  const filteredCerts = useMemo(() => {
    return certs.filter(c => {
      const cStatus = (c.status || '').toLowerCase().trim();
      if (activeTab === 'review') {
        if (cStatus !== 'under_review' && cStatus !== 'draft') return false;
      } else if (activeTab === 'certs') {
        if (filterStatus) {
          const fStatus = filterStatus.toLowerCase().trim();
          if (fStatus === 'under_review' || fStatus === 'review') {
            if (cStatus !== 'under_review' && cStatus !== 'draft') return false;
          } else if (fStatus === 'active') {
            if (cStatus !== 'active') return false;
          } else if (cStatus !== fStatus) {
            return false;
          }
        }
      }
      const site = (c.site_name || c.site_id?.name || c.site_id?.est_name || c.application_id?.site_name || '').toLowerCase();
      if (filterSite && site !== filterSite.toLowerCase()) {
        return false;
      }

      const comp = (c.company_name || c.profiles?.company_name || c.application_id?.establishment_name || '').trim().toLowerCase();

      // If a specific company is chosen/exact-matched, only show data for THAT company!
      if (activeCompany) {
        return comp === activeCompany.trim().toLowerCase();
      }

      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const certNo = (c.certificate_number || '').toLowerCase();
      return certNo.includes(q) || comp.includes(q) || site.includes(q);
    });
  }, [certs, activeTab, filterStatus, filterSite, search, activeCompany]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterSite, activeTab]);

  const paginatedCerts = useMemo(() => {
    return filteredCerts.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredCerts, page, pageSize]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1.5px solid #e2e8f0', marginBottom: 20, gap: 8 }}>
        {canReviewCertificate && (
          <button
            type="button"
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'review' ? '2.5px solid #047857' : 'none',
              color: activeTab === 'review' ? '#047857' : '#64748b',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onClick={() => {
              setActiveTab('review');
              setFilterStatus('under_review');
              navigate('/certificates?status=under_review');
            }}
          >
            <ShieldCheck size={16} /> 
            Pending Review 
            {underReviewCerts.length > 0 && (
              <span style={{
                background: '#f97316',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 12
              }}>
                {underReviewCerts.length}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'certs' && !filterStatus ? '2.5px solid #047857' : 'none',
            color: activeTab === 'certs' && !filterStatus ? '#047857' : '#64748b',
            fontWeight: activeTab === 'certs' && !filterStatus ? 800 : 600,
            cursor: 'pointer',
            fontSize: 14
          }}
          onClick={() => {
            setActiveTab('certs');
            setFilterStatus('');
            navigate('/certificates');
          }}
        >
          🏅 All Certificates ({certs.length})
        </button>

        <button
          type="button"
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'certs' && filterStatus === 'active' ? '2.5px solid #047857' : 'none',
            color: activeTab === 'certs' && filterStatus === 'active' ? '#047857' : '#64748b',
            fontWeight: activeTab === 'certs' && filterStatus === 'active' ? 800 : 600,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          onClick={() => {
            setActiveTab('certs');
            setFilterStatus('active');
            navigate('/certificates?status=active');
          }}
        >
          ✅ Active Certificates ({activeCertsCount})
        </button>

        <button
          type="button"
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'certs' && filterStatus === 'expired' ? '2.5px solid #047857' : 'none',
            color: activeTab === 'certs' && filterStatus === 'expired' ? '#047857' : '#64748b',
            fontWeight: activeTab === 'certs' && filterStatus === 'expired' ? 800 : 600,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          onClick={() => {
            setActiveTab('certs');
            setFilterStatus('expired');
            navigate('/certificates?status=expired');
          }}
        >
          ⏰ Expired Certificates ({expiredCertsCount})
        </button>
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchWithSuggestions
          value={search}
          onChange={val => {
            setSearch(val);
            if (selectedCompany && val.trim().toLowerCase() !== selectedCompany.trim().toLowerCase()) {
              setSelectedCompany(null);
            }
            setPage(1);
          }}
          onSelect={item => {
            if (item.type === 'Company') {
              setSelectedCompany(item.label);
              setSearch(item.label);
            } else {
              setSelectedCompany(null);
              setSearch(item.label);
            }
            setPage(1);
          }}
          suggestions={searchSuggestions}
          placeholder="Search by cert no, company, site..."
        />

        {/* Filter by Site (dynamically narrowed to searched company) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={15} style={{ color: search.trim() ? 'var(--primary, #2563eb)' : '#94a3b8' }} />
          <select
            className="form-control"
            style={{ 
              width: 240, 
              minWidth: 240,
              maxWidth: 240,
              fontWeight: 600,
              backgroundColor: search.trim() ? '#ffffff' : '#f8fafc',
              cursor: search.trim() ? 'pointer' : 'not-allowed',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}
            value={filterSite}
            disabled={!search.trim()}
            onChange={e => {
              setFilterSite(e.target.value);
              setPage(1);
            }}
          >
            {!search.trim() ? (
              <option value="">Select a company first to filter sites</option>
            ) : availableSites.length === 0 ? (
              <option value="">No sites found for "{search.trim()}"</option>
            ) : (
              <>
                <option value="">
                  {`All Sites for "${search.trim()}" (${availableSites.length})`}
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

        {activeTab === 'certs' && (
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={filterStatus}
            onChange={e => {
              const val = e.target.value;
              setFilterStatus(val);
              setPage(1);
              if (val) {
                navigate(`/certificates?status=${val}`);
              } else {
                navigate('/certificates');
              }
            }}
          >
            <option value="">All Statuses</option>
            <option value="under_review">Under Review</option>
            <option value="active">Active</option>
            <option value="outdated">Outdated</option>
            <option value="expired">Expired</option>
          </select>
        )}
      </div>

      <div className="card">
          <div className="card-header">
            <div className="card-title">
              {activeTab === 'review'
                ? `Certificates Awaiting Review & QA (${filteredCerts.length})`
                : filterStatus === 'active'
                ? `Active Certificates (${filteredCerts.length})`
                : filterStatus === 'expired'
                ? `Expired Certificates (${filteredCerts.length})`
                : filterStatus === 'under_review'
                ? `Under Review Certificates (${filteredCerts.length})`
                : `All Certificates (${filteredCerts.length})`}
            </div>
          </div>
          <div className="table-wrap">
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
              filteredCerts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Award /></div>
                  <div className="empty-state-title">
                    {activeTab === 'review' ? 'No Certificates Awaiting Review' : 'No Certificates Found'}
                  </div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Certificate No.</th>
                      <th>Company / Site</th>
                      <th>Type</th>
                      <th>Issue Date</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCerts.map(c => {
                      const effectiveStatus =
                        c.status === 'active' && c.expiry_date && new Date(c.expiry_date) < new Date()
                          ? 'expired'
                          : c.status;
                      const siteStr = c.site_name || c.site_id?.name || c.site_id?.est_name || c.establishment_name || c.application_id?.establishment_name || c.application_id?.site_name;
                      const isReview = effectiveStatus === 'under_review' || effectiveStatus === 'draft';
                      
                      return (
                      <tr key={c.id || c._id} style={isReview ? { background: '#fffbeb' } : {}}>
                        <td style={{ fontWeight: 800, color: '#047857' }}>{c.certificate_number}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          <div>{c.company_name || c.profiles?.company_name || c.application_id?.establishment_name || c.profiles?.full_name || '—'}</div>
                          {siteStr && (
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                              Site: {siteStr}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: (() => {
                              const t = getApplicationTypeDisplay(c);
                              if (t === 'Renewal') return '#eff6ff';
                              if (t === 'Surveillance') return '#f0f9ff';
                              if (t === 'Addon') return '#fdf4ff';
                              if (t === 'Extension') return '#f0fdf4';
                              if (t === 'Direct') return '#fffbeb';
                              return '#f8fafc';
                            })(),
                            color: (() => {
                              const t = getApplicationTypeDisplay(c);
                              if (t === 'Renewal') return '#1d4ed8';
                              if (t === 'Surveillance') return '#0369a1';
                              if (t === 'Addon') return '#86198f';
                              if (t === 'Extension') return '#15803d';
                              if (t === 'Direct') return '#b45309';
                              return '#334155';
                            })(),
                            border: '1px solid #e2e8f0'
                          }}>
                            {getApplicationTypeDisplay(c)}
                          </span>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {c.certificate_type || 'Halal Certification'}
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>{c.issue_date ? new Date(c.issue_date).toLocaleDateString('en-GB') : '—'}</td>
                        <td style={{ fontSize: 12 }}>{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-GB') : '—'}</td>
                        <td>
                          <span className={`badge ${
                            isReview ? 'badge-orange' :
                            effectiveStatus === 'active' ? 'badge-green' :
                            effectiveStatus === 'renewed' ? 'badge-blue' :
                            effectiveStatus === 'outdated' || effectiveStatus === 'superseded' ? 'badge-gray' :
                            effectiveStatus === 'revoked' ? 'badge-red' :
                            'badge-gray'
                          }`} style={{ textTransform: 'capitalize' }}>
                            {isReview ? '⏳ Under Review' :
                             effectiveStatus === 'outdated' ? 'Outdated' :
                             effectiveStatus === 'superseded' ? 'Superseded' :
                             effectiveStatus === 'renewed' ? 'Renewed' :
                             effectiveStatus === 'active' ? 'Active' :
                             effectiveStatus === 'expired' ? 'Expired' :
                             effectiveStatus === 'revoked' ? 'Revoked' :
                             effectiveStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <ActionTriggerButton 
                              onClick={() => setActionModalCert(c)}
                              title="Certificate Actions"
                            />
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            }
          </div>

          <Pagination
            currentPage={page}
            totalItems={filteredCerts.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemName="certificates"
          />
        </div>

      {/* Issue Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Issue New Certificate</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Linked Application</label>
                  <select className="form-control" value={form.application_id} onChange={e => setForm(f => ({ ...f, application_id: e.target.value }))} required>
                    <option value="">Select Application</option>
                    {apps.map(a => <option key={a.id || a._id} value={a.id || a._id}>{a.application_number} – {a.profiles?.company_name || a.establishment_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Certificate Type <span>*</span></label>
                  <select className="form-control" value={form.certificate_type} onChange={e => setForm(f => ({ ...f, certificate_type: e.target.value }))}>
                    {['GSO MEAT', 'GSO NON MEAT', 'HFA SCHEME MEAT', 'HFA SCHEME NON MEAT', 'COSMETICS', 'SMIIC'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Issue Date <span>*</span></label>
                    <input type="date" className="form-control" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Date <span>*</span></label>
                    <input type="date" className="form-control" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Products Covered</label>
                  <textarea className="form-control" value={form.products_covered} onChange={e => setForm(f => ({ ...f, products_covered: e.target.value }))} placeholder="List the products covered by this certificate..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Create & Proceed to Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Read-Only View Certificate Modal */}
      <ViewCertificateModal
        isOpen={!!viewingCert}
        onClose={() => setViewingCert(null)}
        cert={viewingCert}
      />

      {/* Unified Action Modal */}
      <ActionModal
        isOpen={Boolean(actionModalCert)}
        onClose={() => setActionModalCert(null)}
        title={actionModalCert?.company_name || actionModalCert?.profiles?.company_name || 'Certificate Actions'}
        subtitle={`Cert #${actionModalCert?.certificate_number || '—'} · ${actionModalCert?.certificate_type || 'Halal Certification'}`}
        badge={
          actionModalCert?.status === 'under_review' || actionModalCert?.status === 'draft'
            ? 'Under Review'
            : actionModalCert?.status === 'active'
            ? 'Active Certificate'
            : (actionModalCert?.status || 'Certificate')
        }
        badgeVariant={
          actionModalCert?.status === 'under_review' || actionModalCert?.status === 'draft'
            ? 'badge-yellow'
            : actionModalCert?.status === 'active'
            ? 'badge-green'
            : 'badge-gray'
        }
        actions={[
          {
            label: 'View Certificate PDF',
            icon: Eye,
            variant: 'default',
            onClick: () => {
              const cert = actionModalCert;
              const pdfUrl = getPdfUrl(cert?.certificate_url);
              if (pdfUrl) {
                window.open(pdfUrl, '_blank', 'noopener,noreferrer');
              } else {
                setActionModalCert(null);
                setViewingCert(cert);
              }
            }
          },
          ...(canReviewCertificate ? [{
            label: 'Edit Certificate',
            icon: Edit3,
            variant: 'default',
            onClick: () => {
              if (actionModalCert) {
                navigate(`/certificates/${actionModalCert.id || actionModalCert._id}/review`);
              }
            }
          }] : []),
          ...(canReviewCertificate && (actionModalCert?.status === 'under_review' || actionModalCert?.status === 'draft') ? [{
            label: 'Send to Client',
            icon: Send,
            variant: 'primary',
            onClick: async () => {
              const certId = actionModalCert?.id || actionModalCert?._id;
              setActionModalCert(null);
              try {
                await api.put(`/api/certificates/${certId}/approve`);
                toast.success('Certificate approved and sent to client.');
                fetchAllData();
              } catch (err) {
                toast.error(err.response?.data?.error || err.message || 'Failed to send certificate.');
              }
            }
          }] : []),
          ...(actionModalCert?.certificate_url ? [{
            label: 'Download Certificate PDF',
            icon: Download,
            variant: 'default',
            href: getPdfUrl(actionModalCert.certificate_url),
            target: '_blank'
          }] : []),
          ...(actionModalCert?.status === 'active' ? [{
            label: 'Revoke Certificate',
            icon: AlertCircle,
            variant: 'danger',
            onClick: () => {
              const certId = actionModalCert.id || actionModalCert._id;
              setActionModalCert(null);
              handleRevoke(certId);
            }
          }] : [])
        ]}
      />
    </div>
  );
}
