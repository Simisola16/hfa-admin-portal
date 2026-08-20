import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

export default function ConfirmPaymentModal({ isOpen, onClose, invoice: propInvoice, app: propApp, appId: propAppId, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState(propInvoice || null);
  const [app, setApp] = useState(propApp || null);

  const targetAppId = getCleanId(propAppId) || getCleanId(propApp) || getCleanId(propInvoice?.application_id);

  React.useEffect(() => {
    if (isOpen) {
      if (!propInvoice && targetAppId) {
        Promise.all([
          api.get(`/api/invoices/application/${targetAppId}`).catch(() => ({ data: null })),
          !propApp ? api.get(`/api/applications/${targetAppId}`).catch(() => ({ data: null })) : Promise.resolve({ data: propApp })
        ]).then(([invRes, appRes]) => {
          const invObj = invRes.data?.data || invRes.data || null;
          const appObj = appRes.data?.data || appRes.data || null;
          setInvoice(invObj);
          if (appObj) setApp(appObj);
        });
      } else {
        setInvoice(propInvoice || null);
        setApp(propApp || null);
      }
    }
  }, [isOpen, propInvoice, propApp, targetAppId]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const invId = getCleanId(invoice?._id || invoice?.id || invoice);
    if (!invId) return;

    setSubmitting(true);
    try {
      await api.put(`/api/invoices/${invId}/confirm-payment`);
      toast.success('Payment confirmed successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to confirm payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520, width: '92%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={22} style={{ color: '#16a34a' }} />
            <div className="modal-title">Verify &amp; Confirm Client Payment</div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {!invoice ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
              Loading invoice details...
            </div>
          ) : (
            <div>
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.05em' }}>
                  Client Submitted Payment Proof
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '4px 0 10px' }}>
                  Invoice #{invoice.invoice_number} &middot; £{Number(invoice.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>

                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                  Company: <strong>{app?.profiles?.company_name || app?.establishment_name || 'Client'}</strong><br />
                  Application: <strong>#{app?.application_number || 'N/A'}</strong>
                </div>

                {invoice.payment_proof_url && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #bbf7d0' }}>
                    <a
                      href={getPdfUrl(invoice.payment_proof_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%', justifyContent: 'center', gap: 8, borderColor: '#86efac', color: '#15803d', background: 'white', fontWeight: 700 }}
                    >
                      <Download size={14} /> View Uploaded Receipt / Payment Proof <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>

              {invoice.notes && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>
                    Invoice / Payment Notes
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                    {invoice.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', borderColor: '#15803d', fontWeight: 700, gap: 6 }}
            onClick={handleConfirm}
            disabled={submitting || !invoice}
          >
            <ShieldCheck size={16} /> {submitting ? 'Confirming...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
