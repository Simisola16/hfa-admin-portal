import React from 'react';
import { Receipt, Download, Lock, CheckCircle, Clock } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function InvoiceCard({ invoice, status }) {
  const isAvailable = ['proposal_approved', 'invoice_sent', 'audit_assigned', 'audit_report_submitted', 'logsheet_created', 'logsheet_signed', 'agreement_sent', 'agreement_signed', 'certificate_issued'].includes(status) || invoice;

  if (!isAvailable) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.65, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Certification Invoice (Locked)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Available once proposal is approved</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center' }}>
        <Receipt size={28} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
        <div style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>No Invoice Generated</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Invoice will be generated once proposal is accepted.</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={18} style={{ color: '#ea580c' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Certification Invoice</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No: {invoice.invoice_number} &middot; Status: <span style={{
              fontWeight: 700,
              color: invoice.status === 'paid' ? '#15803d' : invoice.status === 'client_paid' ? '#b45309' : '#b91c1c'
            }}>{invoice.status === 'paid' ? 'Paid' : invoice.status === 'client_paid' ? 'Paid (Awaiting Confirmation)' : 'Unpaid'}</span></div>
          </div>
        </div>
        {invoice.invoice_url && (
          <a href={getPdfUrl(invoice.invoice_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ color: '#ea580c', borderColor: '#fed7aa' }}>
            <Download size={13} /> View Invoice
          </a>
        )}
      </div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Title</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{invoice.title}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Amount Due</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary)' }}>£{Number(invoice.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {invoice.payment_proof_url && (
          <div style={{ marginBottom: 20, background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {invoice.status === 'paid' ? <CheckCircle size={16} style={{ color: '#16a34a' }} /> : <Clock size={16} style={{ color: '#b45309' }} />}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Client Payment Proof Submitted</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Uploaded by client for verification</div>
              </div>
            </div>
            <a href={getPdfUrl(invoice.payment_proof_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              View Receipt
            </a>
          </div>
        )}

        {invoice.notes && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Payment Notes</div>
            <div style={{ background: '#fafafb', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.5 }}>
              {invoice.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
