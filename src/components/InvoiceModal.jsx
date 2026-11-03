import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Paperclip, UploadCloud, File, Trash2 } from 'lucide-react';
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
  const [supportingFiles, setSupportingFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const targetAppId = getCleanId(propAppId) || getCleanId(propApp) || getCleanId(propInvoice?.application_id);
  const hasInitializedRef = useRef(false);
  const currentAppIdRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      currentAppIdRef.current = null;
      return;
    }

    const cleanAppId = targetAppId || getCleanId(propApp?._id || propApp?.id);
    if (hasInitializedRef.current && currentAppIdRef.current === cleanAppId) {
      return;
    }

    hasInitializedRef.current = true;
    currentAppIdRef.current = cleanAppId;

    const isFinal = invoiceType === 'final';
    if (!propApp && targetAppId) {
      setLoading(true);
      Promise.all([
        api.get(`/api/applications/${targetAppId}`).catch(() => ({ data: null })),
        api.get(`/api/invoices/application/${targetAppId}`).catch(() => ({ data: null }))
      ]).then(([appRes, invRes]) => {
        const loadedApp = appRes.data?.data || appRes.data || null;
        const rawInv = invRes.data?.data || invRes.data || null;
        const isMatchingInvoice = rawInv && (isFinal 
          ? (rawInv.invoice_type === 'final' || rawInv.stage === 'final' || rawInv.target_status === 'final_invoice_sent') 
          : (rawInv.invoice_type !== 'final' && rawInv.stage !== 'final' && rawInv.target_status !== 'final_invoice_sent'));
        const loadedInvoice = isMatchingInvoice ? rawInv : null;
        setApp(loadedApp);
        setInvoice(loadedInvoice);
        const isSurv = loadedApp?.application_type === 'surveillance';
        const isRen = !isSurv && loadedApp?.application_type === 'renewal';
        const prefix = isFinal ? 'Final ' : (isSurv ? 'Surveillance ' : (isRen ? 'Renewal ' : ''));
        if (loadedApp) {
          setInvoiceForm(f => ({
            ...f,
            title: loadedInvoice
              ? `Revised ${prefix}Invoice for ${loadedApp.application_number}`
              : `${prefix}Invoice for ${loadedApp.application_number}`,
            amount: loadedInvoice?.amount || '',
            notes: loadedInvoice?.notes || '',
            file: null
          }));
          setSupportingFiles([]);
        }
      }).finally(() => setLoading(false));
    } else {
      const isMatchingInvoice = propInvoice && (isFinal 
        ? (propInvoice.invoice_type === 'final' || propInvoice.stage === 'final' || propInvoice.target_status === 'final_invoice_sent') 
        : (propInvoice.invoice_type !== 'final' && propInvoice.stage !== 'final' && propInvoice.target_status !== 'final_invoice_sent'));
      const activeInvoice = isMatchingInvoice ? propInvoice : null;
      setApp(propApp || null);
      setInvoice(activeInvoice);
      const isSurv = propApp?.application_type === 'surveillance';
      const isRen = !isSurv && propApp?.application_type === 'renewal';
      const prefix = isFinal ? 'Final ' : (isSurv ? 'Surveillance ' : (isRen ? 'Renewal ' : ''));
      setInvoiceForm({
        title: activeInvoice
          ? `Revised ${prefix}Invoice for ${propApp?.application_number}`
          : `${prefix}Invoice for ${propApp?.application_number}`,
        amount: activeInvoice?.amount || '',
        notes: activeInvoice?.notes || '',
        file: null
      });
      setSupportingFiles([]);
    }
  }, [isOpen, targetAppId, invoiceType]);

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
  const isSurvApp = propApp?.application_type === 'surveillance' || app?.application_type === 'surveillance' || String(app?.application_number || '').includes('-SU-');
  const isRenApp = !isSurvApp && (propApp?.application_type === 'renewal' || app?.application_type === 'renewal' || String(app?.application_number || '').includes('-RE-'));
  const isRenewalOrSurv = isSurvApp || isRenApp;

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSubmit = async () => {
    const isFinal = invoiceType === 'final';
    if (!invoiceForm.title.trim()) {
      toast.error('Please enter an invoice title.');
      return;
    }
    if (!invoiceForm.amount || String(invoiceForm.amount).trim() === '') {
      toast.error('Please fill in the Amount Due (£).');
      return;
    }
    if (isNaN(Number(invoiceForm.amount)) || Number(invoiceForm.amount) < 0) {
      toast.error('Please enter a valid Amount Due (£).');
      return;
    }

    if (!invoiceForm.file && (!invoice || !invoice.invoice_url)) {
      toast.error('Please upload an invoice document (PDF) before sending.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', invoiceForm.title.trim());
      formData.append('amount', invoiceForm.amount);
      if (invoiceForm.notes) formData.append('notes', invoiceForm.notes);
      if (invoiceForm.file) formData.append('invoice_file', invoiceForm.file);
      supportingFiles.forEach(sFile => {
        formData.append('supporting_files', sFile);
      });
      formData.append('invoice_type', isFinal ? 'final' : 'initial');
      formData.append('target_status', isFinal ? 'final_invoice_sent' : 'invoice_sent');

      const clientId = getCleanId(app.client_id || app.profiles?._id || app.profiles?.id || app.profiles);
      const appId = getCleanId(app._id || app.id || app);
      formData.append('application_id', appId);
      if (clientId) formData.append('client_id', clientId);

      const res = await api.post('/api/invoices', formData, true);
      const createdInvoice = res?.data?.data || res?.data || null;
      toast.success('Invoice sent successfully!');
      if (typeof onSuccess === 'function') onSuccess(createdInvoice);
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to send invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
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
              min="0"
              step="0.01"
              required
              className="form-control"
              value={invoiceForm.amount}
              onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 500.00"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Invoice Document (PDF) <span style={{ color: '#dc2626' }}>*</span></label>
            <div
              onClick={() => document.getElementById('invoice-file-shared').click()}
              style={{
                border: invoiceForm.file ? '2px solid #22c55e' : '2px dashed #cbd5e1', padding: '24px 20px', borderRadius: '12px',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                background: invoiceForm.file ? '#f0fdf4' : '#fff'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseOut={e => e.currentTarget.style.borderColor = invoiceForm.file ? '#22c55e' : '#cbd5e1'}
            >
              <FileText size={36} style={{ color: invoiceForm.file ? '#22c55e' : '#94a3b8', marginBottom: 8, margin: '0 auto' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                {invoiceForm.file ? invoiceForm.file.name : (invoice?.invoice_url ? 'Click to replace current invoice PDF' : 'Click to select invoice document (PDF)')}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                {invoiceForm.file ? 'Selected PDF ready for upload' : (invoice?.invoice_url ? 'Current PDF attached — click to replace' : 'PDF document is required *')}
              </div>
              <input
                id="invoice-file-shared"
                type="file"
                hidden
                accept=".pdf"
                onChange={e => setInvoiceForm(f => ({ ...f, file: e.target.files[0] }))}
              />
            </div>
          </div>
          {/* Supporting Documents / Attachments (Especially for Renewal & Surveillance) */}
          <div className="form-group" style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                <Paperclip size={15} style={{ color: '#0d9488' }} />
                <span>Supporting Documents & Schedules</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>(Optional)</span>
              </label>
              {isRenewalOrSurv && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  padding: '2px 8px',
                  borderRadius: 12,
                  letterSpacing: '0.02em'
                }}>
                  Recommended for {isSurvApp ? 'Surveillance' : 'Renewal'}
                </span>
              )}
            </div>

            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px 0', lineHeight: 1.4 }}>
              Upload additional attachments alongside this invoice (e.g. audit report summary, fee breakdown schedule, terms & conditions, or cover letter).
            </p>

            <div
              onClick={() => document.getElementById('supporting-files-input').click()}
              style={{
                border: '1.5px dashed #cbd5e1',
                padding: '16px',
                borderRadius: '10px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#f8fafc',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.background = '#f0fdfa'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
            >
              <UploadCloud size={24} style={{ color: '#0d9488', margin: '0 auto 6px' }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                Click to add supporting files
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                PDF, Word (.docx), Excel (.xlsx), or Images &middot; Max 10 files
              </div>
              <input
                id="supporting-files-input"
                type="file"
                multiple
                hidden
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  setSupportingFiles(prev => {
                    const combined = [...prev, ...files];
                    return combined.slice(0, 10);
                  });
                  e.target.value = '';
                }}
              />
            </div>

            {/* List of files selected to upload */}
            {supportingFiles.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Files to Attach ({supportingFiles.length})</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSupportingFiles([]); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}
                  >
                    Clear All
                  </button>
                </div>
                {supportingFiles.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <File size={15} style={{ color: '#0d9488', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 260 }} title={f.name}>
                        {f.name}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>({formatBytes(f.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSupportingFiles(prev => prev.filter((_, i) => i !== idx));
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: 4
                      }}
                      onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                      title="Remove file"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Previously uploaded supporting documents */}
            {invoice?.supporting_documents && invoice.supporting_documents.length > 0 && (
              <div style={{ marginTop: 10, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                  Previously Attached Documents ({invoice.supporting_documents.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {invoice.supporting_documents.map((doc, dIdx) => (
                    <div key={dIdx} style={{ fontSize: 11, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Paperclip size={12} style={{ color: '#64748b' }} />
                      <a href={doc.url} target="_blank" rel="noreferrer" style={{ color: '#0d9488', textDecoration: 'underline', fontWeight: 600 }}>
                        {doc.name || 'Document ' + (dIdx + 1)}
                      </a>
                      {doc.size ? <span style={{ color: '#94a3b8', fontSize: 10 }}>({formatBytes(doc.size)})</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            disabled={submitting || (!invoiceForm.file && (!invoice || !invoice.invoice_url))}
          >
            {submitting ? 'Sending...' : 'Send Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
