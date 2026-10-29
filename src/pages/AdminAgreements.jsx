import { getPdfUrl } from '../lib/pdfUtils';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, Filter, Calendar, Building2,
  ExternalLink, CheckCircle, AlertCircle, RefreshCw,
  Eye, Download, PenTool, Upload, Clock, Check, ChevronRight, FileCheck, Settings
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import AgreementModal from '../components/AgreementModal';
import FinalAgreementModal from '../components/FinalAgreementModal';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';
import Pagination from '../components/Pagination';

export default function AdminAgreements() {
  const navigate = useNavigate();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | sent | client_signed | approved
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionModalAg, setActionModalAg] = useState(null);

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

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filtered = agreements.filter(ag => {
    const app = ag.application_id || {};
    const compName = (app.establishment_name || app.profiles?.company_name || ag.company_name || '').toLowerCase();
    const appNum = (app.application_number || '').toLowerCase();
    const title = (ag.title || '').toLowerCase();
    const s = search.toLowerCase();

    return compName.includes(s) || appNum.includes(s) || title.includes(s);
  });

  const paginatedAgreements = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getStatusBadge = () => {
    return <span className="badge badge-green" style={{ fontWeight: 700 }}>Agreement Sent</span>;
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
            Manage, review, and send official certification agreements to clients.
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Sent Agreements</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>{agreements.length}</div>
        </div>
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
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAgreements.map(ag => {
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
                        {getStatusBadge(ag)}
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <ActionTriggerButton
                          onClick={() => setActionModalAg(ag)}
                          title="Agreement Actions"
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
          currentPage={page}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="agreements"
        />
      </div>

      {/* Action Menu Pop-up Modal */}
      {actionModalAg && (() => {
        const ag = actionModalAg;
        const app = ag.application_id || {};
        const appId = app._id || app.id || ag.application_id;
        const compName = app.establishment_name || app.profiles?.company_name || ag.company_name || 'Client Facility';

        return (
          <ActionModal
            isOpen={Boolean(actionModalAg)}
            onClose={() => setActionModalAg(null)}
            title="Agreement Action"
            subtitle={compName}
            badge={
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                Ref: {app.application_number || 'N/A'} • {ag.title || 'Certification Agreement'}
              </span>
            }
            actions={[
              ag.agreement_url && {
                label: 'View Agreement PDF',
                description: 'View sent agreement document',
                icon: Eye,
                variant: 'primary',
                href: getPdfUrl(ag.agreement_url),
                target: '_blank'
              },
              {
                label: 'Edit / Re-upload Agreement',
                description: 'Upload an updated agreement PDF document',
                icon: PenTool,
                variant: 'default',
                onClick: () => setAgreementModalAg(ag)
              },
              appId && {
                label: 'Application Processing',
                description: 'Open full workflow tracking & stages',
                icon: Settings,
                variant: 'default',
                onClick: () => navigate(`/applications/${appId}/processing`)
              }
            ].filter(Boolean)}
          />
        );
      })()}

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
    </div>
  );
}
