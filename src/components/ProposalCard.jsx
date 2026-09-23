import { getPdfUrl } from '../lib/pdfUtils';
import React from 'react';
import { FileText, Download, Lock } from 'lucide-react';


export default function ProposalCard({ proposal, status, onSendProposal }) {
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
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: onSendProposal ? 14 : 0 }}>Proposal needs to be drafted and sent to the client.</div>
        {onSendProposal && (
          <button className="btn btn-primary btn-sm" onClick={onSendProposal} style={{ background: '#6b21a8', borderColor: '#6b21a8', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <FileText size={14} /> Send Proposal
          </button>
        )}
      </div>
    );
  }

  const isAccepted = ['accepted', 'approved', 'proposal_approved'].includes(proposal?.status) || 
    ['proposal_approved', 'invoice_sent', 'payment_received', 'initial_product', 'dates_proposed', 'dates_rejected', 'dates_accepted', 'date_finalized', 'audit_assigned', 'audit_successful', 'audit_completed', 'nc_flagged', 'nc_closed', 'logsheet_created', 'logsheet_signed', 'application_successful', 'agreement_sent', 'agreement_signed', 'agreement_finalised', 'final_invoice_sent', 'final_invoice_paid', 'ready_for_certificate', 'certificate_issued'].includes(status);

  const canResend = onSendProposal && !isAccepted && (proposal?.status === 'rejected' || proposal?.status === 'pending' || proposal?.status === 'sent' || status === 'proposal_rejected' || status === 'proposal_sent');

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canResend && (
            <button onClick={onSendProposal} className="btn btn-ghost btn-sm" style={{ border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              {proposal.status === 'rejected' ? 'Send Revised Proposal' : 'Resend Proposal'}
            </button>
          )}
          {proposal.proposal_url && (
            <a href={getPdfUrl(proposal.proposal_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              <Download size={13} /> View Proposal
            </a>
          )}
        </div>
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
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Proposal Details</div>
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
