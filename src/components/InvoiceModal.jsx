import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function InvoiceModal({ isOpen, onClose, app, invoice, invoiceType, onSuccess }) {
  const [invoiceForm, setInvoiceForm] = useState({
    title: '',
    amount: '',
    notes: '',
    file: null
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const isFinal = invoiceType === 'final';
      setInvoiceForm({
        title: invoice
          ? `Revised ${isFinal ? 'Final ' : ''}Invoice for ${app.application_number}`
          : `${isFinal ? 'Final ' : ''}Invoice for ${app.application_number}`,
        amount: invoice?.amount || '',
        notes: invoice?.notes || '',
        file: null
      });
    }
  }, [isOpen, app, invoice, invoiceType]);

  if (!isOpen) return null;

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

      const clientId = app.client_id || app.profiles?._id || app.profiles?.id;
      if (!clientId) {
        throw new Error('Could not identify client ID for this application.');
      }
      const appId = app._id || app.id;
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
