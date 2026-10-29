import { getPdfUrl } from '../lib/pdfUtils';
import React from 'react';
import { FileCheck, Download, Lock, UploadCloud, CheckCircle, RefreshCw, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canSendAgreement } from '../lib/permissions';

export default function AgreementCard({ app, agreement, status, user: propUser, onReupload, onSendFinal, onMarkDone, markingDone = false }) {
  const auth = useAuth?.() || {};
  const user = propUser || auth.user;
  const canManage = canSendAgreement(user);

  const normalizedStatus = (status || app?.status || '').toLowerCase().replace(/ /g, '_');
  const finalInvoiceSentStatuses = ['final_invoice_sent', 'final_invoice_paid', 'ready_for_certificate', 'certificate_issued', 'done'];
  const canReupload = !finalInvoiceSentStatuses.includes(normalizedStatus);
  const isAvailable = [
    'application_successful',
    'agreement_sent',
    'agreement_signed',
    'agreement_finalised',
    'final_invoice_sent',
    'final_invoice_paid',
    'ready_for_certificate',
    'certificate_issued',
    'done'
  ].includes(normalizedStatus) || Boolean(agreement);

  const isSeeded = Boolean(
    app?.is_seed || 
    app?.is_seeded || 
    app?.hide_agreement_card || 
    app?.skip_agreement_card || 
    app?.notes?.includes('Imported') || 
    app?.notes?.includes('legacy')
  );

  const isPastAgreement = [
    'agreement_sent',
    'agreement_signed',
    'agreement_finalised',
    'final_invoice_sent',
    'final_invoice_paid',
    'ready_for_certificate',
    'certificate_issued',
    'done'
  ].includes(normalizedStatus);

  // If seeded application has reached or passed agreement stage without an agreement, do not render (hide card)
  if (!agreement && isSeeded && isPastAgreement) {
    return null;
  }

  // If status has passed agreement stage but no agreement record exists -> Locked (Stage Completed)
  if (!agreement && isPastAgreement) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.65, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Certification Agreement (Stage Completed)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>This stage has already been completed in the application workflow</div>
      </div>
    );
  }

  const hasClientSigned = Boolean(agreement?.client_signed || agreement?.signed_agreement_url);
  const hasAdminSentSignedCopy = Boolean(
    agreement?.final_agreement_url ||
    agreement?.status === 'finalized' ||
    ['agreement_finalised', 'final_invoice_sent', 'final_invoice_paid', 'ready_for_certificate', 'certificate_issued', 'done'].includes(normalizedStatus)
  );

  const isFinalized = Boolean(
    agreement?.final_agreement_url ||
    normalizedStatus === 'agreement_finalised' ||
    normalizedStatus === 'final_invoice_sent' ||
    normalizedStatus === 'final_invoice_paid' ||
    normalizedStatus === 'ready_for_certificate' ||
    normalizedStatus === 'certificate_issued' ||
    normalizedStatus === 'done'
  );

  if (!isAvailable) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.65, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Certification Agreement (Locked)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Available once Application Successful is confirmed</div>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <FileCheck size={22} style={{ color: '#2563eb' }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Certification Agreement Ready</div>
        <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4, maxWidth: 420, margin: '4px auto 16px', lineHeight: 1.45 }}>
          {canManage
            ? 'LogSheet has been approved. You can now send the official certification agreement document to the client.'
            : 'LogSheet has been approved. Awaiting Scheme Manager to send certification agreement to the client.'}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {canManage && onReupload && canReupload && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onReupload}
              style={{ background: '#2563eb', borderColor: '#2563eb', fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 9, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Send size={15} /> Send Agreement
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #a7f3d0' }}>
            <FileCheck size={20} style={{ color: '#10b981' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 14.5, color: '#0f172a' }}>Certification Agreement</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #86efac'
                }}
              >
                Agreement Sent
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Status: <strong style={{ color: '#15803d' }}>
                Sent to Client
              </strong>
            </div>
          </div>
        </div>

        {/* Action Controls & Download Links */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Re-upload Agreement Button */}
          {canManage && onReupload && canReupload && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onReupload}
              style={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#cbd5e1', color: '#1e293b' }}
              title="Upload an updated or revised agreement document for the client"
            >
              <RefreshCw size={13} /> Re-upload Agreement
            </button>
          )}

          {/* Document Download Link */}
          {agreement.agreement_url && (
            <a href={getPdfUrl(agreement.agreement_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Download size={13} /> View Agreement PDF
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: (agreement.admin_comment || agreement.details) ? 18 : 0 }}>
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Agreement Title</div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a', marginTop: 3 }}>{agreement.title || 'Certification Agreement'}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Date Sent</div>
            <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 3 }}>
              {agreement.createdAt || agreement.created_at ? new Date(agreement.createdAt || agreement.created_at).toLocaleDateString('en-GB') : 'Recently'}
            </div>
          </div>
        </div>

        {agreement.admin_comment && (
          <div style={{ marginBottom: agreement.details ? 18 : 0, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0369a1', marginBottom: 4 }}>Admin Note to Client</div>
            <div style={{ fontSize: 13, color: '#075985', lineHeight: 1.5 }}>
              {agreement.admin_comment}
            </div>
          </div>
        )}

        {agreement.details && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Agreement Details &amp; Terms</div>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: '#334155' }}>
              {agreement.details}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
