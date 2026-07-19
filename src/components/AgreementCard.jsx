import React from 'react';
import { FileCheck, Download, Lock } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AgreementCard({ agreement, status }) {
  const isAvailable = ['logsheet_signed', 'agreement_sent', 'agreement_signed', 'certificate_issued'].includes(status) || agreement;

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
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center' }}>
        <FileCheck size={28} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
        <div style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>No Agreement Sent</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Agreement will be sent after logsheet finalization.</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileCheck size={18} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Certification Agreement</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status: <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{agreement.client_signed ? 'Signed' : 'Awaiting Signature'}</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {agreement.agreement_url && (
            <a href={getPdfUrl(agreement.agreement_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              <Download size={13} /> View Original PDF
            </a>
          )}
          {agreement.signed_agreement_url && (
            <a href={getPdfUrl(agreement.signed_agreement_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ color: '#15803d', borderColor: '#bbf7d0' }}>
              <Download size={13} /> View Signed Copy
            </a>
          )}
        </div>
      </div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Title</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{agreement.title}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Date Received</div>
            <div style={{ fontSize: 14 }}>{new Date(agreement.createdAt || agreement.created_at).toLocaleDateString('en-GB')}</div>
          </div>
        </div>

        {agreement.details && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Agreement Scope &amp; Details</div>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {agreement.details}
            </div>
          </div>
        )}

        {agreement.client_signed && agreement.client_signature_url && (
          <div style={{ border: '1.5px dashed #bbf7d0', background: '#f0fdf4', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, color: '#15803d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Digital Signature Verified
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img
                src={getPdfUrl(agreement.client_signature_url)}
                alt="Client Signature"
                style={{ maxHeight: 52, maxWidth: 160, objectFit: 'contain', background: 'white', padding: 4, borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
              <div style={{ fontSize: 13, color: '#1e293b' }}>
                <div>Signed by: <strong style={{ fontWeight: 700 }}>{agreement.client_sign_name}</strong></div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Date: {agreement.client_sign_date ? new Date(agreement.client_sign_date).toLocaleString('en-GB') : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        {agreement.client_comment && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Client Comments / Notes</div>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, fontStyle: 'italic' }}>
              "{agreement.client_comment}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
