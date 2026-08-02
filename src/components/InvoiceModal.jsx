import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

export default function InvoiceModal({ isOpen, onClose, app: propApp, appId: propAppId, invoice: propInvoice, invoiceType, onSuccess }) {
  const [app, setApp] = useState(propApp || null);
  const [invoice, setInvoice] = useState(propInvoice || null);
  const [loading, setLoading] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    title: '',
    amount: '',
    notes: '',
    file: null
  });
  const [submitting, setSubmitting] = useState(false);

  const targetAppId = getCleanId(propAppId) || getCleanId(propApp) || getCleanId(propInvoice?.application_id);

  useEffect(() => {
    if (isOpen) {
      const isFinal = invoiceType === 'final';
      if (!propApp && targetAppId) {
        setLoading(true);
        Promise.all([
          api.get(`/api/applications/${targetAppId}`).catch(() => ({ data: null })),
          api.get(`/api/invoices/application/${targetAppId}`).catch(() => ({ data: null }))
        ]).then(([appRes, invRes]) => {
          const loadedApp = appRes.data?.data || appRes.data || null;
          const loadedInvoice = invRes.data?.data || invRes.data || null;
          setApp(loadedApp);
          setInvoice(loadedInvoice);
          if (loadedApp) {
            setInvoiceForm(f => ({
              ...f,
              title: loadedInvoice
                ? `Revised ${isFinal ? 'Final ' : ''}Invoice for ${loadedApp.application_number}`
                : `${isFinal ? 'Final ' : ''}Invoice for ${loadedApp.application_number}`,
              amount: loadedInvoice?.amount || '',
              notes: loadedInvoice?.notes || '',
            }));
          }
        }).finally(() => setLoading(false));
      } else {
        setApp(propApp || null);
        setInvoice(propInvoice || null);
        setInvoiceForm({
          title: propInvoice
            ? `Revised ${isFinal ? 'Final ' : ''}Invoice for ${propApp?.application_number}`
            : `${isFinal ? 'Final ' : ''}Invoice for ${propApp?.application_number}`,
          amount: propInvoice?.amount || '',
          notes: propInvoice?.notes || '',
          file: null
        });
      }
    }
  }, [isOpen, propApp, propInvoice, invoiceType, targetAppId]);

  if (!isOpen) return null;
  if (loading) return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal" style={{ maxWidth: 500, padding: 48, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ color: '#64748b', fontSize: 14 }}>Loading application...</div>
      </div>
    </div>
  );
  if (!app) return null;

  const handleSubmit = async () => {
    if (!invoiceForm.title.trim()) {
      toast.error('Please enter an invoice title.');
      return;
    }
    if (!invoiceForm.amount) {
      toast.error('Please enter the invoice amount.');
      return;
    }
    if (!invoiceForm.file && !invoice?.invoice_url) {
      toast.error('Please upload an invoice PDF document.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', invoiceForm.title);
      formData.append('amount', invoiceForm.amount);
      if (invoiceForm.notes) formData.append('notes', invoiceForm.notes);
      if (invoiceForm.file) formData.append('invoice_file', invoiceForm.file);
      const isFinal = invoiceType === 'final';
      formData.append('invoice_type', isFinal ? 'final' : 'initial');
      formData.append('target_status', isFinal ? 'final_invoice_sent' : 'invoice_sent');

      const clientId = getCleanId(app.client_id || app.profiles?._id || app.profiles?.id || app.profiles);
      if (!clientId) {
        throw new Error('Could not identify client ID for this application.');
      }
      const appId = getCleanId(app._id || app.id || app);
      formData.append('application_id', appId);
      formData.append('client_id', clientId);

      await api.post('/api/invoices', formData, true);
      toast.success('Invoice sent successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{invoiceType === 'final' ? 'Send Final Invoice' : (invoice ? 'Send Revised Invoice' : 'Send Invoice')}</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            Provide an invoice for <strong>{app.profiles?.company_name || app.establishment_name}</strong>.
            This will be visible to the client on their portal.
          </p>

          <div className="form-group">
            <label className="form-label">Invoice Title <span>*</span></label>
            <input
              className="form-control"
              value={invoiceForm.title}
              onChange={e => setInvoiceForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Halal Certification Invoice 2024"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount Due (£) <span>*</span></label>
            <input
              type="number"
              className="form-control"
              value={invoiceForm.amount}
              onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 500.00"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Invoice Document (PDF) <span>*</span></label>
            <div
              onClick={() => document.getElementById('invoice-file-shared').click()}
              style={{
                border: '2px dashed #e2e8f0', padding: '32px 24px', borderRadius: '12px',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                background: invoiceForm.file ? '#f0fdf4' : '#fff'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <FileText size={40} style={{ color: invoiceForm.file ? '#22c55e' : '#94a3b8', marginBottom: 12, margin: '0 auto' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                {invoiceForm.file ? invoiceForm.file.name : 'Click to select invoice document'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Only PDF allowed</div>
              <input
                id="invoice-file-shared"
                type="file"
                hidden
                accept=".pdf"
                onChange={e => setInvoiceForm(f => ({ ...f, file: e.target.files[0] }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Instructions / Notes (Optional)</label>
            <textarea
              className="form-control"
              rows={3}
              value={invoiceForm.notes}
              onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Please pay via bank transfer to account..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !invoiceForm.title || !invoiceForm.amount || (!invoiceForm.file && !invoice?.invoice_url)}
          >
            {submitting ? 'Sending...' : 'Send Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
