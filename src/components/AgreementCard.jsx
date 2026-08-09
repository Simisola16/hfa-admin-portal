import React from 'react';
import { FileCheck, Download, Lock, UploadCloud, CheckCircle, RefreshCw, Send } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/') || url.startsWith('/uploads/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AgreementCard({ agreement, status, onReupload, onMarkDone, markingDone = false }) {
  const normalizedStatus = (status || '').toLowerCase().replace(/ /g, '_');
  const isAvailable = [
    'application_successful',
    'logsheet_signed',
    'agreement_sent',
    'agreement_signed',
    'agreement_finalised',
    'final_invoice_sent',
    'final_invoice_paid',
    'ready_for_certificate',
    'certificate_issued'
  ].includes(normalizedStatus) || Boolean(agreement);

  const isFinalized = Boolean(
    agreement?.final_agreement_url ||
    normalizedStatus === 'agreement_finalised' ||
    normalizedStatus === 'final_invoice_sent' ||
    normalizedStatus === 'final_invoice_paid' ||
    normalizedStatus === 'ready_for_certificate' ||
    normalizedStatus === 'certificate_issued'
  );

  if (!isAvailable) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.65, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Certification Agreement (Locked)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Available once logsheet is signed</div>
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
          LogSheet has been approved. You can now send the official certification agreement document to the client.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {onReupload && (
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
          <div style={{ width: 38, height: 38, borderRadius: 10, background: isFinalized ? '#ecfdf5' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isFinalized ? '#a7f3d0' : '#bfdbfe'}` }}>
            <FileCheck size={20} style={{ color: isFinalized ? '#10b981' : '#2563eb' }} />
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
                  background: isFinalized ? '#dcfce7' : (agreement.client_signed ? '#e0f2fe' : '#fef3c7'),
                  color: isFinalized ? '#15803d' : (agreement.client_signed ? '#0369a1' : '#b45309'),
                  border: `1px solid ${isFinalized ? '#86efac' : (agreement.client_signed ? '#bae6fd' : '#fde68a')}`
                }}
              >
                {isFinalized ? 'Agreement Finalized & Verified' : (agreement.client_signed ? 'Client Signed' : 'Awaiting Client Signature')}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Status: <strong style={{ color: '#334155', textTransform: 'capitalize' }}>
                {isFinalized ? 'Finalized' : (agreement.client_signed ? 'Signed by Client' : 'Pending Client Action')}
              </strong>
            </div>
          </div>
        </div>

        {/* Action Controls & Download Links */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Re-upload Agreement Button */}
          {onReupload && (
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

          {/* Mark Agreement Done Button */}
          {onMarkDone && !isFinalized && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onMarkDone}
              disabled={markingDone}
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                borderColor: '#15803d',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
              }}
              title="Mark agreement as verified/completed and advance to next stage"
            >
              <CheckCircle size={14} /> {markingDone ? 'Marking Done...' : 'Mark Agreement Done'}
            </button>
          )}

          {/* Document Download Links */}
          {agreement.agreement_url && (
            <a href={getPdfUrl(agreement.agreement_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Download size={13} /> View Original PDF
            </a>
          )}
          {agreement.signed_agreement_url && (
            <a href={getPdfUrl(agreement.signed_agreement_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: 12, color: '#15803d', borderColor: '#bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Download size={13} /> View Signed Copy
            </a>
          )}
          {agreement.final_agreement_url && (
            <a href={getPdfUrl(agreement.final_agreement_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: 12, color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Download size={13} /> View Final Signed PDF
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 18 }}>
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
          <div style={{ marginBottom: 18, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0369a1', marginBottom: 4 }}>Admin Note to Client</div>
            <div style={{ fontSize: 13, color: '#075985', lineHeight: 1.5 }}>
              {agreement.admin_comment}
            </div>
          </div>
        )}

        {agreement.details && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Agreement Scope &amp; Terms</div>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: '#334155' }}>
              {agreement.details}
            </div>
          </div>
        )}

        {agreement.client_signed && agreement.client_signature_url && (
          <div style={{ border: '1.5px dashed #bbf7d0', background: '#f0fdf4', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, color: '#15803d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              ✓ Client Digital Signature Verified
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <img
                src={getPdfUrl(agreement.client_signature_url)}
                alt="Client Signature"
                style={{ maxHeight: 52, maxWidth: 160, objectFit: 'contain', background: 'white', padding: 4, borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
              <div style={{ fontSize: 13, color: '#1e293b' }}>
                <div>Signed by: <strong style={{ fontWeight: 700 }}>{agreement.client_sign_name || 'Authorized Client Signatory'}</strong></div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Signed Date: {agreement.client_sign_date ? new Date(agreement.client_sign_date).toLocaleString('en-GB') : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        {agreement.client_comment && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Client Comments / Feedback</div>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, fontStyle: 'italic', color: '#334155' }}>
              "{agreement.client_comment}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
