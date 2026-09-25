import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Search, RefreshCw, Calendar,
  Building2, MapPin, CheckCircle, Clock, X, ChevronRight,
  AlertCircle, ShieldCheck, Phone, Mail, User, Info, ArrowRight, Award,
  Sparkles, Layers, Settings, Eye
} from 'lucide-react';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';

const STATUS_CONFIG = {
  submitted: { label: 'Form Received', bg: '#fef3c7', color: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  under_review: { label: 'Under Review', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
  logsheet_created: { label: 'Logsheet Created', bg: '#e0f2fe', color: '#075985', border: '#bae6fd', dot: '#0ea5e9' },
  waiting_signature: { label: 'Waiting for Signature', bg: '#ffedd5', color: '#9a3412', border: '#fed7aa', dot: '#f97316' },
  extension_approved: { label: 'Certificate Approved', bg: '#dcfce7', color: '#166534', border: '#bbf7d0', dot: '#16a34a' },
  rejected: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b', border: '#fecaca', dot: '#ef4444' }
};

export default function AdminExtensionApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionModalApp, setActionModalApp] = useState(null);


  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/extension-applications');
      const loaded = Array.isArray(res.data?.data)
        ? res.data.data
        : (Array.isArray(res.data) ? res.data : []);
      setApps(loaded);
    } catch (err) {
      console.error('Failed to load extension applications:', err);
      toast.error('Failed to load extension applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const totalApps = apps.length;
  const receivedCount = apps.filter(a => a.status === 'submitted' || a.status === 'under_review').length;
  const waitingSigCount = apps.filter(a => a.status === 'waiting_signature' || a.status === 'logsheet_created').length;
  const approvedCount = apps.filter(a => a.status === 'extension_approved').length;

  const filteredApps = apps.filter(a => {
    const s = search.toLowerCase();
    const company = (a.company_name || a.client_id?.company_name || '').toLowerCase();
    const site = (a.site_name || '').toLowerCase();
    const contact = (a.contact_person || '').toLowerCase();
    const email = (a.contact_email || '').toLowerCase();
    const appNum = (a.application_number || '').toLowerCase();
    const desc = (a.description || '').toLowerCase();

    const matchesSearch = !search ||
      company.includes(s) ||
      site.includes(s) ||
      contact.includes(s) ||
      email.includes(s) ||
      appNum.includes(s) ||
      desc.includes(s);

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'received' && (a.status === 'submitted' || a.status === 'under_review')) ||
      (statusFilter === 'waiting_signature' && (a.status === 'waiting_signature' || a.status === 'logsheet_created')) ||
      a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'Inter, "Segoe UI", sans-serif' }}>
      
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Extension Applications
            </h1>
            <span style={{
              background: '#ecfdf5', color: '#008744', border: '1px solid #a7f3d0',
              fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20
            }}>
              Certification Extensions
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 4, margin: 0 }}>
            Manage client requests for Halal certificate validity extensions, custom extension logsheets, and committee signatures.
          </p>
        </div>

        <button
          onClick={fetchApps}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'white', border: '1px solid #e2e8f0', color: '#475569',
            padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="responsive-kpi-grid">
        {[
          { label: 'Total Extension Requests', value: totalApps, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Form Received / Review', value: receivedCount, color: '#d97706', bg: '#fef3c7' },
          { label: 'Waiting for Signature', value: waitingSigCount, color: '#ea580c', bg: '#ffedd5' },
          { label: 'Certificates Approved', value: approvedCount, color: '#008744', bg: '#ecfdf5' },
        ].map(card => (
          <div
            key={card.label}
            style={{
              background: 'white', borderRadius: 14, border: '1px solid #e5e7eb',
              padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b' }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: card.color, marginTop: 6 }}>
              {loading ? '—' : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters & Search ── */}
      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #e5e7eb',
        padding: '16px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by Company, Site, Application #, Contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8,
              border: '1px solid #d1d5db', fontSize: 13, outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'received', label: 'Received' },
            { id: 'waiting_signature', label: 'Waiting Signature' },
            { id: 'extension_approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                border: statusFilter === tab.id ? '1px solid #008744' : '1px solid #e2e8f0',
                background: statusFilter === tab.id ? '#ecfdf5' : 'white',
                color: statusFilter === tab.id ? '#008744' : '#64748b',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Extension Applications Table ── */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #dcfce7', borderTop: '3px solid #008744', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', fontSize: 13.5 }}>Loading applications...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FileText size={44} color="#cbd5e1" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              No Extension Applications Found
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', maxWidth: 420, margin: '0 auto' }}>
              {search || statusFilter !== 'all'
                ? 'No extension applications match your search criteria.'
                : 'No client has submitted an extension application yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>App #</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company Name</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Site Name</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Details</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((a) => {
                  const companyName = a.company_name || a.client_id?.company_name || a.client_id?.business_name || 'Client Company';
                  const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.submitted;
                  return (
                    <tr
                      key={a._id}
                      onClick={() => navigate(`/extension-applications/${a._id}/processing`)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#008744', whiteSpace: 'nowrap' }}>
                        {a.application_number}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{companyName}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>{a.client_id?.email || ''}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{a.site_name}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{a.contact_person}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>{a.contact_email} • {a.contact_phone}</div>
                      </td>
                      <td style={{ padding: '14px 18px', maxWidth: 220 }}>
                        <div style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.description}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                          padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {a.created_at || a.createdAt ? new Date(a.created_at || a.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <ActionTriggerButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionModalApp(a);
                          }}
                          title="Extension Application Actions"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Menu Pop-up Modal */}
      {actionModalApp && (
        <ActionModal
          isOpen={Boolean(actionModalApp)}
          onClose={() => setActionModalApp(null)}
          title="Extension Action"
          subtitle={actionModalApp.company_name || actionModalApp.client_id?.company_name || 'Client Company'}
          badge={
            <span style={{ fontSize: 11.5, color: '#64748b' }}>
              App #{actionModalApp.application_number} • Site: {actionModalApp.site_name}
            </span>
          }
          actions={[
            {
              label: 'Application Processing',
              description: 'Manage extension review, logsheet, and certificates',
              icon: Settings,
              variant: 'primary',
              onClick: () => navigate(`/extension-applications/${actionModalApp._id}/processing`)
            },
            {
              label: 'View Application Form',
              description: 'Inspect full client submission fields',
              icon: Eye,
              variant: 'default',
              onClick: () => navigate(`/extension-applications/${actionModalApp._id}/processing`)
            }
          ].filter(Boolean)}
        />
      )}
    </div>
  );
}

