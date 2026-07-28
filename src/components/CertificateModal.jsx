import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function CertificateModal({ isOpen, onClose, app: propApp, appId: propAppId, onSuccess }) {
  const [app, setApp] = useState(propApp || null);
  const [loading, setLoading] = useState(false);
  const [certificateForm, setCertificateForm] = useState({
    certificate_number: '',
    certificate_type: 'Halal Certification',
    issue_date: '',
    expiry_date: '',
    products_covered: '',
    file: null
  });
  const [submitting, setSubmitting] = useState(false);

  const targetAppId = propAppId || propApp?._id || propApp?.id;

  const initForm = (loadedApp) => {
    if (!loadedApp) return;
    const isThreeYear = loadedApp.category === 'UAE/GSO Approved Halal Certification For Exporters To UAE';
    const yearsToAdd = isThreeYear ? 3 : 1;
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);
    setCertificateForm({
      certificate_number: `HFA-CERT-${Date.now().toString().slice(-8)}`,
      certificate_type: isThreeYear ? 'UAE/GSO Halal Certification' : 'Halal Certification',
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      products_covered: '',
      file: null
    });
  };

  useEffect(() => {
    if (isOpen) {
      if (!propApp && targetAppId) {
        setLoading(true);
        api.get(`/api/applications/${targetAppId}`)
          .then(res => {
            const loadedApp = res.data || null;
            setApp(loadedApp);
            initForm(loadedApp);
          })
          .catch(() => setApp(null))
          .finally(() => setLoading(false));
      } else if (propApp) {
        setApp(propApp);
        initForm(propApp);
      }
    }
  }, [isOpen, propApp, targetAppId]);

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
    if (!certificateForm.certificate_number.trim()) {
      toast.error('Please enter a certificate number.');
      return;
    }
    if (!certificateForm.issue_date) {
      toast.error('Please enter the issue date.');
      return;
    }
    if (!certificateForm.expiry_date) {
      toast.error('Please enter the expiry date.');
      return;
    }
    if (!certificateForm.file) {
      toast.error('Please upload the certificate PDF.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('certificate_number', certificateForm.certificate_number);
      formData.append('certificate_type', certificateForm.certificate_type);
      formData.append('issue_date', certificateForm.issue_date);
      formData.append('expiry_date', certificateForm.expiry_date);
      if (certificateForm.products_covered) {
        formData.append('products_covered', certificateForm.products_covered);
      }
      formData.append('certificate_file', certificateForm.file);

      const clientId = app.client_id || app.profiles?._id || app.profiles?.id;
      if (!clientId) {
        throw new Error('Could not identify client ID for this application.');
      }
      const appId = app._id || app.id;
      formData.append('application_id', appId);
      formData.append('client_id', clientId);
      if (app.site_id) {
        formData.append('site_id', app.site_id);
      }

      await api.post('/api/certificates', formData, true);

      // Transition application status to certificate_issued
      await api.put(`/api/applications/${appId}/status`, {
        status: 'certificate_issued',
        note: `Certificate issued successfully. Number: ${certificateForm.certificate_number}`
      });

      toast.success('Certificate issued successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to issue certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Issue Halal Certificate</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            Enter details to issue the final certificate for <strong>{app.profiles?.company_name || app.establishment_name}</strong>.
            This will be visible on their client portal under "Certificates".
          </p>

          <div className="form-group">
            <label className="form-label">Certificate Number <span>*</span></label>
            <input
              type="text"
              className="form-control"
              value={certificateForm.certificate_number}
              onChange={e => setCertificateForm(f => ({ ...f, certificate_number: e.target.value }))}
              placeholder="e.g. HFA-CERT-12345"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Certificate Type <span>*</span></label>
            <input
              type="text"
              className="form-control"
              value={certificateForm.certificate_type}
              onChange={e => setCertificateForm(f => ({ ...f, certificate_type: e.target.value }))}
              placeholder="e.g. Halal Certification"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Issue Date <span>*</span></label>
              <input
                type="date"
                className="form-control"
                value={certificateForm.issue_date}
                onChange={e => setCertificateForm(f => ({ ...f, issue_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date <span>*</span></label>
              <input
                type="date"
                className="form-control"
                value={certificateForm.expiry_date}
                onChange={e => setCertificateForm(f => ({ ...f, expiry_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Products Covered (Comma-separated)</label>
            <textarea
              className="form-control"
              rows={2}
              value={certificateForm.products_covered}
              onChange={e => setCertificateForm(f => ({ ...f, products_covered: e.target.value }))}
              placeholder="e.g. Fresh Beef, Poultry, Spices"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Certificate Document (PDF) <span>*</span></label>
            <div
              onClick={() => document.getElementById('certificate-file-shared').click()}
              style={{
                border: '2px dashed #e2e8f0', padding: '32px 24px', borderRadius: '12px',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                background: certificateForm.file ? '#f0fdf4' : '#fff'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <FileText size={40} style={{ color: certificateForm.file ? '#22c55e' : '#94a3b8', marginBottom: 12, margin: '0 auto' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                {certificateForm.file ? certificateForm.file.name : 'Click to select certificate PDF'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Only PDF allowed</div>
              <input
                id="certificate-file-shared"
                type="file"
                hidden
                accept=".pdf"
                onChange={e => setCertificateForm(f => ({ ...f, file: e.target.files[0] }))}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !certificateForm.certificate_number || !certificateForm.issue_date || !certificateForm.expiry_date || !certificateForm.file}
          >
            {submitting ? 'Issuing...' : 'Issue Certificate'}
          </button>
        </div>
      </div>
    </div>
  );
}
