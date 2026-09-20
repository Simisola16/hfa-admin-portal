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
      const invObj = propInvoice || null;
      setInvoice(invObj);

      if (propApp) {
        setApp(propApp);
      } else if (invObj?.application_id && typeof invObj.application_id === 'object') {
        setApp(invObj.application_id);
      } else if (targetAppId) {
        Promise.all([
          !invObj ? api.get(`/api/invoices/application/${targetAppId}`).catch(() => ({ data: null })) : Promise.resolve({ data: invObj }),
          api.get(`/api/applications/${targetAppId}`).catch(() => ({ data: null }))
        ]).then(([invRes, appRes]) => {
          if (!invObj) {
            const fetchedInv = invRes.data?.data || invRes.data || null;
            setInvoice(fetchedInv);
          }
          const appObj = appRes.data?.data || appRes.data || null;
          if (appObj) setApp(appObj);
        });
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

  const formattedAmount = Number(invoice?.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 });
  const companyName = invoice?.profiles?.company_name || app?.profiles?.company_name || app?.establishment_name || 'Client';

  return (
    <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={!submitting ? onClose : undefined}>
      <div className="modal" style={{ maxWidth: 520, width: '92%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={22} style={{ color: '#16a34a' }} />
            <div className="modal-title">Verify &amp; Confirm Client Payment</div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={submitting}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {!invoice ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
              Loading invoice details...
            </div>
          ) : (
            <div>
              {/* Prompt Confirmation Callout */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertCircle size={18} style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.45 }}>
                  Confirm payment of <strong>£{formattedAmount}</strong> for Invoice <strong>#{invoice.invoice_number}</strong>? This will mark the invoice as paid and unlock the next stage for the client.
                </div>
              </div>

              {/* Payment Details Card */}
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.05em' }}>
                  {invoice.payment_proof_url ? 'Client Submitted Payment Proof' : 'Invoice Payment Details'}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '4px 0 10px' }}>
                  Invoice #{invoice.invoice_number} &middot; £{formattedAmount}
                </div>

                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                  Company: <strong>{companyName}</strong><br />
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
            {submitting ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14 }} /> Confirming...
              </>
            ) : (
              <>
                <ShieldCheck size={16} /> Confirm Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
