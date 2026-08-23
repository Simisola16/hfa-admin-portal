import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Search, Filter, Calendar, Building2,
  ExternalLink, ClipboardList, CheckCircle, AlertCircle, RefreshCw,
  FolderDown, Layers, ShieldCheck, Eye, UserCheck
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/') || url.startsWith('/uploads/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AdminAuditReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | audit_report | nc_report

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch both application-logsheets and applications
      const [logsheetsRes, appsRes] = await Promise.all([
        api.get('/api/application-logsheets').catch(() => ({ data: [] })),
        api.get('/api/applications').catch(() => ({ data: [] }))
      ]);

      const logsheets = Array.isArray(logsheetsRes) ? logsheetsRes : (Array.isArray(logsheetsRes?.data?.data) ? logsheetsRes.data.data : (Array.isArray(logsheetsRes?.data) ? logsheetsRes.data : []));
      const apps = Array.isArray(appsRes) ? appsRes : (Array.isArray(appsRes?.data?.data) ? appsRes.data.data : (Array.isArray(appsRes?.data) ? appsRes.data : []));

      const appMap = apps.reduce((acc, a) => a ? ({ ...acc, [String(a._id || a.id)]: a }) : acc, {});

      const compiledReports = [];

      // Extract from LogSheets
      logsheets.forEach(log => {
        const isAddon = !!log.addon_application_id || log.source_type === 'addon_application';
        const rawAppId = log.application_id?._id || log.application_id;
        const rawAddonId = log.addon_application_id?._id || log.addon_application_id;
        const appId = String(rawAppId || rawAddonId || '');
        const app = (rawAppId && appMap[String(rawAppId)]) || log.application_id || {};
        const companyName = log.company_name || app.profiles?.company_name || app.establishment_name || 'Client Facility';

        // 1. Primary document_url
        if (log.document_url && log.document_url !== '#' && log.document_url !== 'undefined') {
          compiledReports.push({
            id: `log-doc-${log._id}`,
            company_name: companyName,
            appId: appId,
            addonId: rawAddonId ? String(rawAddonId) : null,
            isAddon: isAddon,
            logsheetId: log._id,
            file_name: log.document_url.split('/').pop() || 'Audit_Logsheet_Report.pdf',
            url: log.document_url,
            report_type: 'Audit Report Document',
            audit_date: log.audit_date || log.created_at,
            auditors: log.auditors || 'Assigned Audit Team',
            status: log.status || 'Completed'
          });
        }

        // 2. Multiple document_urls
        if (Array.isArray(log.document_urls)) {
          log.document_urls.forEach((doc, idx) => {
            if (doc.url) {
              compiledReports.push({
                id: `log-docs-${log._id}-${idx}`,
                company_name: companyName,
                appId: appId,
                addonId: rawAddonId ? String(rawAddonId) : null,
                isAddon: isAddon,
                logsheetId: log._id,
                file_name: doc.name || doc.url.split('/').pop() || `Audit_Report_${idx + 1}.pdf`,
                url: doc.url,
                report_type: 'Audit Report Document',
                audit_date: doc.uploaded_at || log.audit_date || log.created_at,
                auditors: log.auditors || 'Assigned Audit Team',
                status: log.status || 'Completed'
              });
            }
          });
        }

        // 3. Multiple audit_reports
        if (Array.isArray(log.audit_reports)) {
          log.audit_reports.forEach((doc, idx) => {
            if (doc.url) {
              compiledReports.push({
                id: `log-aud-${log._id}-${idx}`,
                company_name: companyName,
                appId: appId,
                addonId: rawAddonId ? String(rawAddonId) : null,
                isAddon: isAddon,
                logsheetId: log._id,
                file_name: doc.name || doc.url.split('/').pop() || `Audit_Finding_Report_${idx + 1}.pdf`,
                url: doc.url,
                report_type: 'Audit Inspection Report',
                audit_date: doc.uploaded_at || log.audit_date || log.created_at,
                auditors: log.auditors || 'Assigned Audit Team',
                status: log.status || 'Uploaded'
              });
            }
          });
        }

        // 4. NC Report files
        if (Array.isArray(log.nc_reports_files)) {
          log.nc_reports_files.forEach((doc, idx) => {
            if (doc.url) {
              compiledReports.push({
                id: `log-nc-${log._id}-${idx}`,
                company_name: companyName,
                appId: appId,
                addonId: rawAddonId ? String(rawAddonId) : null,
                isAddon: isAddon,
                logsheetId: log._id,
                file_name: doc.name || doc.url.split('/').pop() || `NC_Action_Report_${idx + 1}.pdf`,
                url: doc.url,
                report_type: 'NC Report Document',
                audit_date: doc.uploaded_at || log.audit_date || log.created_at,
                auditors: log.auditors || 'Assigned Audit Team',
                status: log.status || 'Uploaded'
              });
            }
          });
        }
      });

      // Also extract from Applications audit_reports and nc_reports
      apps.forEach(app => {
        const companyName = app.profiles?.company_name || app.establishment_name || 'Client Facility';

        if (Array.isArray(app.audit_reports)) {
          app.audit_reports.forEach((ar, idx) => {
            if (ar.url && !compiledReports.some(r => r.url === ar.url)) {
              compiledReports.push({
                id: `app-aud-${app._id}-${idx}`,
                company_name: companyName,
                appId: app._id,
                file_name: ar.name || ar.url.split('/').pop() || `Audit_Report_${idx + 1}.pdf`,
                url: ar.url,
                report_type: 'Audit Inspection Report',
                audit_date: ar.uploaded_at || app.audit_date || app.created_at,
                auditors: app.inspector_id?.full_name || 'Assigned Inspector',
                status: app.status || 'Active'
              });
            }
          });
        }

        if (Array.isArray(app.nc_reports)) {
          app.nc_reports.forEach((nc, idx) => {
            if (nc.url && !compiledReports.some(r => r.url === nc.url)) {
              compiledReports.push({
                id: `app-nc-${app._id}-${idx}`,
                company_name: companyName,
                appId: app._id,
                file_name: nc.url.split('/').pop() || `NC_Report_${idx + 1}.pdf`,
                url: nc.url,
                report_type: 'NC Report Document',
                audit_date: nc.flagged_at || app.created_at,
                auditors: 'Auditor Team',
                status: nc.status || 'flagged'
              });
            }
            if (nc.client_response_url && !compiledReports.some(r => r.url === nc.client_response_url)) {
              compiledReports.push({
                id: `app-nc-resp-${app._id}-${idx}`,
                company_name: companyName,
                appId: app._id,
                file_name: nc.client_response_url.split('/').pop() || `Client_NC_Response_${idx + 1}.pdf`,
                url: nc.client_response_url,
                report_type: 'Client NC Response Proof',
                audit_date: nc.client_responded_at || app.created_at,
                auditors: 'Auditor Review',
                status: 'Client Submitted'
              });
            }
          });
        }
      });

      setReports(compiledReports);
    } catch (err) {
      toast.error('Failed to load audit reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const safeReports = Array.isArray(reports) ? reports : [];
  const filteredReports = safeReports.filter(r => {
    if (!r) return false;
    const matchesSearch =
      (r.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.file_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.auditors || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (typeFilter === 'audit_report') return (r.report_type || '').includes('Audit');
    if (typeFilter === 'nc_report') return (r.report_type || '').includes('NC');
    return true;
  });

  const auditCount = reports.filter(r => (r.report_type || '').includes('Audit')).length;
  const ncCount = reports.filter(r => (r.report_type || '').includes('NC')).length;

  return (
    <div className="page-content" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Audit &amp; NC Reports Repository
          </h1>
          <p style={{ color: '#64748b', fontSize: 13.5, margin: 0 }}>
            Central repository of official audit inspection sheets, findings, and non-conformity documentation.
          </p>
        </div>

        <button
          className="btn btn-outline"
          onClick={fetchReports}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, borderRadius: 8, height: 38, background: '#fff' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Reports
        </button>
      </div>

      {/* Stats Row (Clean 3-Card Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Total Reports */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: 14,
            cursor: 'pointer',
            border: typeFilter === 'all' ? '2px solid var(--primary)' : '1px solid #e2e8f0',
            background: typeFilter === 'all' ? '#f0fdf4' : '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setTypeFilter('all')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Uploaded Reports</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>{reports.length}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Across all audit files</div>
        </div>

        {/* Audit Inspection Reports */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: 14,
            cursor: 'pointer',
            border: typeFilter === 'audit_report' ? '2px solid #0284c7' : '1px solid #e2e8f0',
            background: typeFilter === 'audit_report' ? '#f0f9ff' : '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setTypeFilter('audit_report')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audit Inspection Reports</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={16} style={{ color: '#0284c7' }} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0284c7', marginTop: 6 }}>{auditCount}</div>
          <div style={{ fontSize: 12, color: '#0369a1', marginTop: 2 }}>Inspection evidence sheets</div>
        </div>

        {/* NC Action Reports */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: 14,
            cursor: 'pointer',
            border: typeFilter === 'nc_report' ? '2px solid #dc2626' : '1px solid #e2e8f0',
            background: typeFilter === 'nc_report' ? '#fef2f2' : '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setTypeFilter('nc_report')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>NC Action Reports</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={16} style={{ color: '#dc2626' }} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', marginTop: 6 }}>{ncCount}</div>
          <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2 }}>Non-conformity finding records</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card" style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by company name, auditor, or file name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: 38, height: 38, borderRadius: 8, fontSize: 13, background: '#f8fafc', border: '1px solid #e2e8f0' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className={`btn btn-sm ${typeFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTypeFilter('all')}
              style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: '6px 14px' }}
            >
              All Reports ({reports.length})
            </button>
            <button
              className={`btn btn-sm ${typeFilter === 'audit_report' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTypeFilter('audit_report')}
              style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: '6px 14px' }}
            >
              Audit Reports ({auditCount})
            </button>
            <button
              className={`btn btn-sm ${typeFilter === 'nc_report' ? 'btn-danger' : 'btn-ghost'}`}
              onClick={() => setTypeFilter('nc_report')}
              style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: '6px 14px' }}
            >
              NC Reports ({ncCount})
            </button>
          </div>
        </div>
      </div>

      {/* Reports Table (Cleaned: Removed Report Type & Source) */}
      <div className="card" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: '#64748b', fontSize: 13.5 }}>Loading audit reports...</div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <FileText size={40} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>No Audit Reports Found</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              {search ? 'No reports matched your search filters.' : 'Uploaded audit inspection reports will appear here.'}
            </div>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 280 }}>Company &amp; File</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 200 }}>Auditor Team</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 150 }}>Date</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', minWidth: 170 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                    {/* Company & File */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 size={16} style={{ color: '#475569' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{item.company_name}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <FileText size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                            <span>{item.file_name}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Auditor Team */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <UserCheck size={14} style={{ color: '#0284c7', flexShrink: 0 }} />
                        <span>{item.auditors}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={13.5} style={{ color: '#64748b' }} />
                        {item.audit_date ? new Date(item.audit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <a
                          href={getPdfUrl(item.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            borderRadius: 6
                          }}
                        >
                          <Eye size={13} /> View Report
                        </a>

                        {(item.appId || item.addonId) && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              if (item.isAddon) {
                                navigate(`/addon-applications/${item.addonId || item.appId}/processing`);
                              } else {
                                navigate(`/applications/${item.appId}/processing`);
                              }
                            }}
                            style={{ fontSize: 12, fontWeight: 700, padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff' }}
                            title="Open Application Processing"
                          >
                            <ExternalLink size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
