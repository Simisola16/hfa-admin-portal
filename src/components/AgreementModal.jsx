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

export default function AgreementModal({ isOpen, onClose, app: propApp, appId: propAppId, agreement: propAgreement, onSuccess }) {
  const [app, setApp] = useState(propApp || null);
  const [agreement, setAgreement] = useState(propAgreement || null);
  const [loading, setLoading] = useState(false);
  const [agreementForm, setAgreementForm] = useState({
    type: 'upload',
    title: '',
    details: '',
    admin_comment: '',
    file: null
  });
  const [submitting, setSubmitting] = useState(false);

  const targetAppId = getCleanId(propAppId) || getCleanId(propApp) || getCleanId(propAgreement?.application_id);

  useEffect(() => {
    if (isOpen) {
      if (!propApp && targetAppId) {
        setLoading(true);
        Promise.all([
          api.get(`/api/applications/${targetAppId}`).catch(() => ({ data: null })),
          api.get(`/api/agreements/application/${targetAppId}`).catch(() => ({ data: null }))
        ]).then(([appRes, agRes]) => {
          const loadedApp = appRes.data?.data || appRes.data || null;
          const loadedAgreement = agRes.data?.data || agRes.data || null;
          setApp(loadedApp);
          setAgreement(loadedAgreement);
          if (loadedApp) {
            setAgreementForm(f => ({
              ...f,
              title: loadedAgreement ? `Revised Agreement for ${loadedApp.application_number}` : `Agreement for ${loadedApp.application_number}`,
              details: loadedAgreement?.details || '',
              admin_comment: loadedAgreement?.admin_comment || '',
            }));
          }
        }).finally(() => setLoading(false));
      } else {
        setApp(propApp || null);
        setAgreement(propAgreement || null);
        setAgreementForm({
          type: 'upload',
          title: propAgreement ? `Revised Agreement for ${propApp?.application_number}` : `Agreement for ${propApp?.application_number}`,
          details: propAgreement?.details || '',
          admin_comment: propAgreement?.admin_comment || '',
          file: null
        });
      }
    }
  }, [isOpen, propApp, propAgreement, targetAppId]);

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
    if (!agreementForm.title.trim()) {
      toast.error('Please enter an agreement title.');
      return;
    }
    if (agreementForm.type === 'upload' && !agreementForm.file && !agreement?.agreement_url) {
      toast.error('Please select an agreement document.');
      return;
    }
    if (agreementForm.type === 'write' && !agreementForm.details.trim()) {
      toast.error('Please write the agreement details.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', agreementForm.title);
      formData.append('admin_comment', agreementForm.admin_comment);
      if (agreementForm.type === 'upload' && agreementForm.file) {
        formData.append('agreement_file', agreementForm.file);
      } else if (agreementForm.type === 'write' && agreementForm.details) {
        formData.append('details', agreementForm.details);
      }

      const clientId = getCleanId(app.client_id || app.profiles?._id || app.profiles?.id || app.profiles);
      if (!clientId) {
        throw new Error('Could not identify client ID for this application.');
      }
      const appId = getCleanId(app._id || app.id || app);
      formData.append('application_id', appId);
      formData.append('client_id', clientId);

      await api.post('/api/agreements', formData, true);
      toast.success('Agreement sent successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send agreement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{propAgreement ? '🔄 Re-upload / Update Certification Agreement' : 'Send Certification Agreement'}</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            {propAgreement
              ? <>Upload a revised or corrected certification agreement for <strong>{app.profiles?.company_name || app.establishment_name}</strong>. The client will be notified to review and sign the updated agreement.</>
              : <>Provide a certification agreement for <strong>{app.profiles?.company_name || app.establishment_name}</strong>. This will be visible to the client on their portal.</>}
          </p>

          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => setAgreementForm(f => ({ ...f, type: 'upload' }))}
              style={{
                flex: 1, padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                background: agreementForm.type === 'upload' ? '#fff' : 'transparent',
                color: agreementForm.type === 'upload' ? '#0f172a' : '#64748b',
                boxShadow: agreementForm.type === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Upload Document
            </button>
            <button
              type="button"
              onClick={() => setAgreementForm(f => ({ ...f, type: 'write' }))}
              style={{
                flex: 1, padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                background: agreementForm.type === 'write' ? '#fff' : 'transparent',
                color: agreementForm.type === 'write' ? '#0f172a' : '#64748b',
                boxShadow: agreementForm.type === 'write' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Write Agreement
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Agreement Title <span>*</span></label>
            <input
              className="form-control"
              value={agreementForm.title}
              onChange={e => setAgreementForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Certification Agreement 2024"
            />
          </div>

          {agreementForm.type === 'upload' ? (
            <div className="form-group">
              <label className="form-label">Agreement Document (PDF) <span>*</span></label>
              <div
                onClick={() => document.getElementById('agreement-file-shared').click()}
                style={{
                  border: '2px dashed #e2e8f0', padding: '32px 24px', borderRadius: '12px',
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  background: agreementForm.file ? '#f0fdf4' : '#fff'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <FileText size={40} style={{ color: agreementForm.file ? '#22c55e' : '#94a3b8', marginBottom: 12, margin: '0 auto' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                  {agreementForm.file ? agreementForm.file.name : 'Click to select agreement document'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Only PDF allowed</div>
                <input
                  id="agreement-file-shared"
                  type="file"
                  hidden
                  accept=".pdf"
                  onChange={e => setAgreementForm(f => ({ ...f, file: e.target.files[0] }))}
                />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Agreement Terms <span>*</span></label>
              <textarea
                className="form-control"
                rows={6}
                style={{ fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.5' }}
                value={agreementForm.details}
                onChange={e => setAgreementForm(f => ({ ...f, details: e.target.value }))}
                placeholder="Write agreement terms here..."
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Admin Comments / Notes (Optional)</label>
            <textarea
              className="form-control"
              rows={3}
              value={agreementForm.admin_comment}
              onChange={e => setAgreementForm(f => ({ ...f, admin_comment: e.target.value }))}
              placeholder="Add notes for the client..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !agreementForm.title || (agreementForm.type === 'upload' ? !agreementForm.file : !agreementForm.details.trim())}
          >
            {submitting ? 'Uploading...' : (propAgreement ? 'Re-upload & Send to Client' : 'Send Agreement')}
          </button>
        </div>
      </div>
    </div>
  );
}
