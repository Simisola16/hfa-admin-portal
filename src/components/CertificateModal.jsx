import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Award, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { generateHfaId } from '../lib/idGenerator';

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

export default function CertificateModal({ isOpen, onClose, app: propApp, appId: propAppId, onSuccess }) {
  const navigate = useNavigate();
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

  const targetAppId = getCleanId(propAppId) || getCleanId(propApp);

  const initForm = (loadedApp) => {
    if (!loadedApp) return;
    const isThreeYear = loadedApp.category === 'UAE/GSO Approved Halal Certification For Exporters To UAE';
    const yearsToAdd = isThreeYear ? 3 : 1;
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);
    const companyName = loadedApp.establishment_name || loadedApp.client_id?.company_name || loadedApp.client_id?.full_name || 'HFA';
    
    // Extract products list if available
    let prods = '';
    if (Array.isArray(loadedApp.products) && loadedApp.products.length > 0) {
      prods = loadedApp.products.map(p => p.name || p.title).filter(Boolean).join(', ');
    }

    setCertificateForm({
      certificate_number: generateHfaId(companyName),
      certificate_type: isThreeYear ? 'UAE/GSO Halal Certification' : 'Halal Certification',
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      products_covered: prods,
      file: null
    });
  };

  useEffect(() => {
    if (isOpen) {
      if (!propApp && targetAppId) {
        setLoading(true);
        api.get(`/api/applications/${targetAppId}`)
          .then(res => {
            const loadedApp = res.data?.data || res.data || null;
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
      if (certificateForm.file) {
        formData.append('certificate_file', certificateForm.file);
      }

      const clientId = getCleanId(app.client_id || app.profiles?._id || app.profiles?.id || app.profiles);
      if (!clientId) {
        throw new Error('Could not identify client ID for this application.');
      }
      const appId = getCleanId(app._id || app.id || app);
      formData.append('application_id', appId);
      formData.append('client_id', clientId);
      if (app.site_id) {
        formData.append('site_id', app.site_id);
      }
      formData.append('company_name', app.establishment_name || app.profiles?.company_name || '');
      formData.append('company_address', app.establishment_address || app.profiles?.address || '');
      formData.append('manufacturing_address', app.manufacturer_address || app.establishment_address || '');
      formData.append('scope', app.scope || 'Halal Food Certification');
      formData.append('status', 'under_review');

      const res = await api.post('/api/certificates', formData, true);
      const createdCert = res.data?.data || res.data;

      toast.success('Certificate created! Opening Review & Quality Check...');
      if (onSuccess) onSuccess();
      onClose();

      if (createdCert?._id) {
        navigate(`/certificates/${createdCert._id}/review`);
      } else {
        navigate('/certificates');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520, borderRadius: 14 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '18px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={20} style={{ color: '#047857' }} />
            <div>
              <div className="modal-title" style={{ fontSize: 16, fontWeight: 800 }}>Create Certificate for Review</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {app.profiles?.company_name || app.establishment_name}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: 24 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginBottom: 18, color: '#166534', fontSize: 12.5, lineHeight: 1.5 }}>
            <ShieldCheck size={16} style={{ display: 'inline', marginRight: 6 }} />
            Creating this certificate will generate an official draft and take you directly to the <strong>Review Certificate Page</strong>, where you can verify all details, edit any field, regenerate the PDF, and send to the client.
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Certificate Number <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="text"
              className="form-control"
              value={certificateForm.certificate_number}
              onChange={e => setCertificateForm(f => ({ ...f, certificate_number: e.target.value }))}
              placeholder="e.g. HFA-CERT-2026-001"
              style={{ fontWeight: 700 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Certificate Type / Scheme <span style={{ color: '#dc2626' }}>*</span></label>
            <select
              className="form-control"
              value={certificateForm.certificate_type}
              onChange={e => setCertificateForm(f => ({ ...f, certificate_type: e.target.value }))}
            >
              <option value="Halal Certification">Halal Certification (Standard Annual)</option>
              <option value="UAE/GSO Halal Certification">UAE/GSO Halal Certification (3-Year Scheme)</option>
              <option value="Add-on Products Certification">Add-on Products Certification</option>
              <option value="Export Halal Certificate">Export Halal Certificate</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Issue Date <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="date"
                className="form-control"
                value={certificateForm.issue_date}
                onChange={e => setCertificateForm(f => ({ ...f, issue_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Expiry Date <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="date"
                className="form-control"
                value={certificateForm.expiry_date}
                onChange={e => setCertificateForm(f => ({ ...f, expiry_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Products Covered (Comma-separated)</label>
            <textarea
              className="form-control"
              rows={2}
              value={certificateForm.products_covered}
              onChange={e => setCertificateForm(f => ({ ...f, products_covered: e.target.value }))}
              placeholder="e.g. Fresh Beef, Poultry, Spices"
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Custom PDF Upload (Optional)</label>
            <div
              onClick={() => document.getElementById('certificate-file-shared').click()}
              style={{
                border: '1.5px dashed #cbd5e1', padding: '20px 16px', borderRadius: '10px',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                background: certificateForm.file ? '#f0fdf4' : '#f8fafc'
              }}
            >
              <FileText size={30} style={{ color: certificateForm.file ? '#16a34a' : '#94a3b8', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                {certificateForm.file ? certificateForm.file.name : 'Upload custom PDF or leave empty to auto-generate'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>System will automatically render the official certificate template if empty</div>
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
        <div className="modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !certificateForm.certificate_number || !certificateForm.issue_date || !certificateForm.expiry_date}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, background: '#047857', borderColor: '#047857' }}
          >
            <ShieldCheck size={16} />
            {submitting ? 'Creating Certificate...' : 'Create & Proceed to Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
