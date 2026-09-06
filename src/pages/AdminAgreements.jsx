import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, Filter, Calendar, Building2,
  ExternalLink, CheckCircle, AlertCircle, RefreshCw,
  Eye, Download, PenTool, Upload, Clock, Check, ChevronRight, FileCheck
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import AgreementModal from '../components/AgreementModal';
import FinalAgreementModal from '../components/FinalAgreementModal';

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

  // Agreement Modals state
  const [agreementModalAg, setAgreementModalAg] = useState(null);
  const [finalModalAg, setFinalModalAg] = useState(null);

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

                          {ag.final_agreement_url && (
                            <a
                              href={getPdfUrl(ag.final_agreement_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm"
                              style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0284c7', color: 'white', borderColor: '#0284c7' }}
                              title="View Final Countersigned Copy"
                            >
                              <FileCheck size={13} /> Final Copy
                            </a>
                          )}

                          {ag.client_signed || ag.status === 'client_signed' ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setFinalModalAg(ag)}
                              style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0284c7', borderColor: '#0284c7' }}
                              title="Send Final Countersigned Agreement Copy to Client"
                            >
                              <FileCheck size={13} /> {ag.final_agreement_url ? 'Resend Final Copy' : 'Send Final Signed Copy'}
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => setAgreementModalAg(ag)}
                              style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              title="Re-upload or Edit Agreement"
                            >
                              <PenTool size={13} /> Edit / Re-upload
                            </button>
                          )}

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

      {/* Initial / Re-upload Agreement Modal */}
      <AgreementModal
        isOpen={Boolean(agreementModalAg)}
        onClose={() => setAgreementModalAg(null)}
        app={agreementModalAg?.application_id}
        appId={agreementModalAg?.application_id?._id || agreementModalAg?.application_id}
        agreement={agreementModalAg}
        onSuccess={() => {
          setAgreementModalAg(null);
          fetchAgreements();
        }}
      />

      {/* Final Countersigned Agreement Modal */}
      <FinalAgreementModal
        isOpen={Boolean(finalModalAg)}
        onClose={() => setFinalModalAg(null)}
        app={finalModalAg?.application_id}
        appId={finalModalAg?.application_id?._id || finalModalAg?.application_id}
        agreement={finalModalAg}
        onSuccess={() => {
          setFinalModalAg(null);
          fetchAgreements();
        }}
      />
    </div>
  );
}
