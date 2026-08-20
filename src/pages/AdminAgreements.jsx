import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, Filter, Calendar, Building2,
  ExternalLink, CheckCircle, AlertCircle, RefreshCw,
  Eye, Download, PenTool, Upload, Clock, Check, ChevronRight
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AdminAgreements() {
  const navigate = useNavigate();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | sent | client_signed | approved

  // Countersign / Details Modal state
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [countersignFile, setCountersignFile] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/agreements');
      const data = res.data?.data || res.data || [];
      setAgreements(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load agreements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreements();
  }, []);

  const handleCountersignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAgreement) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', 'approved');
      if (adminComment) formData.append('admin_comment', adminComment);
      if (countersignFile) formData.append('signed_agreement_file', countersignFile);

      await api.put(`/api/agreements/${selectedAgreement._id}`, formData, true);
      toast.success('Agreement successfully updated / countersigned!');
      setSelectedAgreement(null);
      setCountersignFile(null);
      setAdminComment('');
      fetchAgreements();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update agreement.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = agreements.filter(ag => {
    const app = ag.application_id || {};
    const compName = (app.establishment_name || app.profiles?.company_name || ag.company_name || '').toLowerCase();
    const appNum = (app.application_number || '').toLowerCase();
    const title = (ag.title || '').toLowerCase();
    const s = search.toLowerCase();

    const matchesSearch = compName.includes(s) || appNum.includes(s) || title.includes(s);
    if (!matchesSearch) return false;

    if (statusFilter === 'sent') return ag.status === 'sent' && !ag.client_signed;
    if (statusFilter === 'client_signed') return ag.client_signed || ag.status === 'client_signed';
    if (statusFilter === 'approved') return ag.status === 'approved' || ag.status === 'completed' || ag.status === 'countersigned';
    return true;
  });

  const getStatusBadge = (ag) => {
    if (ag.status === 'approved' || ag.status === 'completed') {
      return <span className="badge badge-green" style={{ fontWeight: 700 }}>Approved / Countersigned</span>;
    }
    if (ag.client_signed || ag.status === 'client_signed') {
      return <span className="badge badge-blue" style={{ fontWeight: 700 }}>Signed by Client</span>;
    }
    if (ag.status === 'sent') {
      return <span className="badge badge-yellow" style={{ fontWeight: 700 }}>Pending Client Signature</span>;
    }
    return <span className="badge badge-gray" style={{ fontWeight: 700 }}>{ag.status || 'Draft'}</span>;
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Certification Agreements
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>
            Manage, review, track client signatures, and countersign official certification agreements.
          </p>
        </div>

        <button
          className="btn btn-outline"
          onClick={fetchAgreements}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Agreements</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>{agreements.length}</div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Pending Client Signature</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {agreements.filter(a => a.status === 'sent' && !a.client_signed).length}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>Signed by Client</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
            {agreements.filter(a => a.client_signed || a.status === 'client_signed').length}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Countersigned / Approved</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
            {agreements.filter(a => a.status === 'approved' || a.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12, flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusFilter('all')}
        >
          All Agreements ({agreements.length})
        </button>
        <button
          className={`btn btn-sm ${statusFilter === 'sent' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusFilter('sent')}
        >
          Pending Client ({agreements.filter(a => a.status === 'sent' && !a.client_signed).length})
        </button>
        <button
          className={`btn btn-sm ${statusFilter === 'client_signed' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusFilter('client_signed')}
        >
          Signed by Client ({agreements.filter(a => a.client_signed || a.status === 'client_signed').length})
        </button>
        <button
          className={`btn btn-sm ${statusFilter === 'approved' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusFilter('approved')}
        >
          Approved / Countersigned ({agreements.filter(a => a.status === 'approved' || a.status === 'completed').length})
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="search-box" style={{ maxWidth: 400 }}>
          <Search size={15} className="search-icon" />
          <input
            placeholder="Search company, app number, or agreement title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="card shadow-sm border-0" style={{ marginTop: 0 }}>
        {loading ? (
          <div className="loading-overlay" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <FileText size={44} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
            <div className="empty-state-title" style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>
              No Certification Agreements Found
            </div>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
              Agreements are generated and sent during the application certification workflow.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company &amp; Application</th>
                  <th>Agreement Title</th>
                  <th>Date Sent</th>
                  <th>Client Signature</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ag => {
                  const app = ag.application_id || {};
                  const appId = app._id || app.id || ag.application_id;
                  const compName = app.establishment_name || app.profiles?.company_name || ag.company_name || 'Client Facility';
                  const appNumber = app.application_number || '—';

                  return (
                    <tr key={ag._id}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>{compName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>App Ref: <strong>{appNumber}</strong></span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{ag.title || 'Certification Agreement'}</div>
                        {ag.details && (
                          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2, maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ag.details}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: 12.5, color: '#64748b' }}>
                        {ag.createdAt ? new Date(ag.createdAt).toLocaleDateString('en-GB') : '—'}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        {ag.client_signed || ag.status === 'client_signed' ? (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Check size={14} /> Signed
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              {ag.client_sign_name || 'Authorized Signatory'}
                              {ag.client_sign_date && ` (${new Date(ag.client_sign_date).toLocaleDateString('en-GB')})`}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Pending signature</span>
                        )}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        {getStatusBadge(ag)}
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {ag.agreement_url && (
                            <a
                              href={getPdfUrl(ag.agreement_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              title="View Sent Agreement PDF"
                            >
                              <Eye size={13} /> View
                            </a>
                          )}

                          {ag.signed_agreement_url && (
                            <a
                              href={getPdfUrl(ag.signed_agreement_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm"
                              style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#16a34a', color: 'white', borderColor: '#16a34a' }}
                              title="View Signed / Countersigned Copy"
                            >
                              <Download size={13} /> Signed Copy
                            </a>
                          )}

                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setSelectedAgreement(ag);
                              setAdminComment(ag.admin_comment || '');
                              setCountersignFile(null);
                            }}
                            style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            title="Manage & Countersign Agreement"
                          >
                            <PenTool size={13} /> Manage
                          </button>

                          {appId && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => navigate(`/applications/${appId}/processing`)}
                              style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px' }}
                              title="Open Application Processing"
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Countersign / Manage Modal */}
      {selectedAgreement && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
          <div className="modal-content" style={{ maxWidth: 540, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '20px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Manage Certification Agreement</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, opacity: 0.8 }}>
                  {selectedAgreement.application_id?.establishment_name || selectedAgreement.company_name || 'Client Agreement'} &middot; {selectedAgreement.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgreement(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCountersignSubmit} style={{ padding: '24px' }}>
              {/* Agreement summary info */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0', marginBottom: 20, fontSize: 12.5 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 12px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Client Signature:</span>
                  <span style={{ fontWeight: 700, color: selectedAgreement.client_signed ? '#15803d' : '#d97706' }}>
                    {selectedAgreement.client_signed ? `Signed by ${selectedAgreement.client_sign_name || 'Client'}` : 'Pending Client Signature'}
                  </span>

                  {selectedAgreement.client_sign_date && (
                    <>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Signed Date:</span>
                      <span style={{ fontWeight: 600 }}>{new Date(selectedAgreement.client_sign_date).toLocaleString('en-GB')}</span>
                    </>
                  )}

                  {selectedAgreement.client_comment && (
                    <>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Client Comment:</span>
                      <span style={{ color: '#334155', fontStyle: 'italic' }}>"{selectedAgreement.client_comment}"</span>
                    </>
                  )}
                </div>
              </div>

              {/* Upload Countersigned / Final Agreement Document */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                  Upload Countersigned Agreement (PDF):
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  className="form-control"
                  onChange={e => setCountersignFile(e.target.files?.[0] || null)}
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Attach the finalized, countersigned PDF signed by both HFA and the client.
                </div>
              </div>

              {/* Admin Comment */}
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                  Admin Notes / Remarks:
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Optional internal remarks or certification conditions..."
                  value={adminComment}
                  onChange={e => setAdminComment(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedAgreement(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {submitting ? <RefreshCw size={15} className="spin" /> : <CheckCircle size={15} />}
                  Save &amp; Approve Agreement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
