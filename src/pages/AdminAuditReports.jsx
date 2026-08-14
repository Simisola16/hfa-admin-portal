import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Search, Filter, Calendar, Building2,
  ExternalLink, ClipboardList, CheckCircle, AlertCircle, RefreshCw,
  FolderDown, Layers, ShieldCheck, Eye
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AdminAuditReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | audit_report | nc_report | logsheet_doc

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
            status: log.status || 'Completed',
            source: 'LogSheet Upload'
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
                status: log.status || 'Completed',
                source: 'LogSheet File Collection'
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
                status: log.status || 'Uploaded',
                source: 'LogSheet Audit Report'
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
                status: log.status || 'Uploaded',
                source: 'LogSheet NC Upload'
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
                status: app.status || 'Active',
                source: 'Application Record'
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
                status: nc.status || 'flagged',
                source: 'NC Finding'
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
                status: 'Client Submitted',
                source: 'Client NC Rectification'
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
      (r.report_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.auditors || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (typeFilter === 'audit_report') return (r.report_type || '').includes('Audit');
    if (typeFilter === 'nc_report') return (r.report_type || '').includes('NC');
    if (typeFilter === 'logsheet_doc') return (r.source || '').includes('LogSheet');
    return true;
  });

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Audit &amp; NC Reports Repository
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>
            Central repository of all official Audit Reports, NC Reports, and inspection documents uploaded across LogSheets and certification applications.
          </p>
        </div>

        <button
          className="btn btn-outline"
          onClick={fetchReports}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}
        >
          <RefreshCw size={15} /> Refresh Reports
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Uploaded Reports</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>{reports.length}</div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>Audit Inspection Reports</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
            {reports.filter(r => r.report_type.includes('Audit')).length}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>NC Action Reports</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
            {reports.filter(r => r.report_type.includes('NC')).length}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>LogSheet Document Attachments</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
            {reports.filter(r => r.source.includes('LogSheet')).length}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card" style={{ padding: '16px 20px', borderRadius: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by company name, auditor, report type, or file name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: 40, height: 42, borderRadius: 10, fontSize: 13.5 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className={`btn btn-sm ${typeFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTypeFilter('all')}
              style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 8 }}
            >
              All Reports
            </button>
            <button
              className={`btn btn-sm ${typeFilter === 'audit_report' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTypeFilter('audit_report')}
              style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 8 }}
            >
              Audit Reports
            </button>
            <button
              className={`btn btn-sm ${typeFilter === 'nc_report' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTypeFilter('nc_report')}
              style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 8 }}
            >
              NC Reports
            </button>
            <button
              className={`btn btn-sm ${typeFilter === 'logsheet_doc' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTypeFilter('logsheet_doc')}
              style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 8 }}
            >
              LogSheet Docs
            </button>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="card" style={{ borderRadius: 18, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Loading audit reports...</div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <FileText size={40} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>No Audit Reports Found</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              {search ? 'No reports matched your search filters.' : 'Audit reports uploaded during logsheet creation will appear here.'}
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Company</th>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Report Type</th>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Auditor Team</th>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Source</th>
                  <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{item.company_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FileText size={12} />
                        <span>{item.file_name}</span>
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: 20,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: item.report_type.includes('NC') ? '#fef2f2' : '#eff6ff',
                          color: item.report_type.includes('NC') ? '#b91c1c' : '#1d4ed8',
                          border: `1px solid ${item.report_type.includes('NC') ? '#fecaca' : '#bfdbfe'}`
                        }}
                      >
                        {item.report_type.includes('NC') ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                        {item.report_type}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{item.auditors}</div>
                    </td>

                    <td style={{ padding: '16px 20px', fontSize: 12.5, color: '#64748b' }}>
                      {item.audit_date ? new Date(item.audit_date).toLocaleDateString('en-GB') : '—'}
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{item.source}</span>
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
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
                            gap: 6,
                            background: '#0e7490',
                            borderColor: '#0e7490',
                            padding: '6px 12px'
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
                            style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px' }}
                            title="Open Application Processing"
                          >
                            <ExternalLink size={14} />
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
