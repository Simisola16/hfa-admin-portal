import React from 'react';
import { FileText, Download, Lock } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function ProposalCard({ proposal, status }) {
  const isAvailable = ['approved', 'proposal_sent', 'proposal_rejected', 'proposal_approved', 'invoice_sent', 'audit_assigned', 'audit_report_submitted', 'logsheet_created', 'logsheet_signed', 'agreement_sent', 'agreement_signed', 'certificate_issued'].includes(status) || proposal;

  if (!isAvailable) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.65, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Certification Proposal (Locked)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Available once application is approved</div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center' }}>
        <FileText size={28} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
        <div style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>No Proposal Generated</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Proposal needs to be drafted and sent to the client.</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Certification Proposal</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Version {proposal.version || 1} &middot; Status: <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{proposal.status?.replace(/_/g, ' ')}</span></div>
          </div>
        </div>
        {proposal.proposal_url && (
          <a href={getPdfUrl(proposal.proposal_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
            <Download size={13} /> View Proposal
          </a>
        )}
      </div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Title</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{proposal.title}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Estimated Cost</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary)' }}>£{Number(proposal.estimated_cost).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {proposal.admin_comment && (
          <div style={{ marginBottom: proposal.client_comment ? 20 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Proposal Details / Scope</div>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.5 }}>
              {proposal.admin_comment}
            </div>
          </div>
        )}

        {proposal.client_comment && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Client Feedback / Reason for rejection</div>
            <div style={{
              background: proposal.status === 'rejected' ? '#fef2f2' : '#f8fafc',
              padding: 14, borderRadius: 10,
              border: `1.5px solid ${proposal.status === 'rejected' ? '#fecaca' : '#e2e8f0'}`,
              color: proposal.status === 'rejected' ? '#991b1b' : 'inherit',
              fontSize: 13, fontStyle: 'italic',
            }}>
              "{proposal.client_comment}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
