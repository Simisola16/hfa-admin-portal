import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Award, Search, Plus, X, Download, Calendar, CheckCircle, AlertCircle, FileText, ShieldCheck, Edit3, Eye, ChevronDown, Send, ArrowRight } from 'lucide-react';
import ViewCertificateModal from '../components/ViewCertificateModal';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AdminCertificates({ defaultTab }) {
  const navigate = useNavigate();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab || 'certs'); // 'review' | 'certs'
  const [showModal, setShowModal] = useState(false);
  const [viewingCert, setViewingCert] = useState(null);
  const [actionModalCert, setActionModalCert] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apps, setApps] = useState([]);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const statusParam = searchParams.get('status') || searchParams.get('filter');
    if (statusParam === 'under_review' || statusParam === 'review') {
      setActiveTab('review');
      setFilterStatus('under_review');
    } else if (statusParam) {
      setFilterStatus(statusParam);
    }
  }, [searchParams]);
  
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
      const [certsRes, appsRes] = await Promise.all([
        api.get('/api/certificates').catch(() => ({ data: [] })),
        api.get('/api/applications').catch(() => ({ data: [] }))
      ]);
      const rawCerts = Array.isArray(certsRes) ? certsRes : (Array.isArray(certsRes?.data) ? certsRes.data : []);
      const rawApps = Array.isArray(appsRes) ? appsRes : (Array.isArray(appsRes?.data) ? appsRes.data : []);

      setCerts(rawCerts);
      setApps(rawApps.filter(a => a && (a.status === 'approved' || a.status === 'ready_for_certificate' || a.status === 'certificate_issued')));
    } catch (err) {
      toast.error('Failed to load certificates.');
    } finally {
      setLoading(false);
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

  const underReviewCerts = certs.filter(c => c.status === 'under_review' || c.status === 'draft');

  const filteredCerts = certs.filter(c => {
    if (activeTab === 'review') {
      if (c.status !== 'under_review' && c.status !== 'draft') return false;
    } else if (activeTab === 'certs') {
      if (filterStatus) {
        if (filterStatus === 'under_review') {
          if (c.status !== 'under_review' && c.status !== 'draft') return false;
        } else if (c.status !== filterStatus) {
          return false;
        }
      }
    }
    const q = search.toLowerCase();
    const certNo = (c.certificate_number || '').toLowerCase();
    const comp = (c.company_name || c.profiles?.company_name || c.application_id?.establishment_name || '').toLowerCase();
    const site = (c.site_name || c.site_id?.name || c.site_id?.est_name || c.application_id?.site_name || '').toLowerCase();
    return certNo.includes(q) || comp.includes(q) || site.includes(q);
  });


  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1.5px solid #e2e8f0', marginBottom: 20, gap: 8 }}>
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
          onClick={() => setActiveTab('review')}
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

        <button
          type="button"
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'certs' ? '2.5px solid #047857' : 'none',
            color: activeTab === 'certs' ? '#047857' : '#64748b',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 14
          }}
          onClick={() => setActiveTab('certs')}
        >
          🏅 All Certificates ({certs.length})
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input 
            placeholder="Search by cert no, company, site..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        {activeTab === 'certs' && (
          <select
            className="form-control"
            style={{ width: 'auto', marginLeft: 8 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
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
              {activeTab === 'review' ? `Certificates Awaiting Review & QA (${filteredCerts.length})` : `All Certificates (${filteredCerts.length})`}
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
                      <th>Type &amp; Scheme</th>
                      <th>Issue Date</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCerts.map(c => {
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
                        <td style={{ fontSize: 13 }}>{c.certificate_type || 'Halal Certification'}</td>
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
            label: 'View Certificate (Preview)',
            icon: Eye,
            variant: 'default',
            onClick: () => {
              const cert = actionModalCert;
              setActionModalCert(null);
              setViewingCert(cert);
            }
          },
          {
            label: (actionModalCert?.status === 'under_review' || actionModalCert?.status === 'draft') ? 'Review & Send to Client' : 'Review / Edit Certificate',
            icon: Edit3,
            variant: (actionModalCert?.status === 'under_review' || actionModalCert?.status === 'draft') ? 'primary' : 'default',
            onClick: () => {
              if (actionModalCert) {
                navigate(`/certificates/${actionModalCert.id || actionModalCert._id}/review`);
              }
            }
          },
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
