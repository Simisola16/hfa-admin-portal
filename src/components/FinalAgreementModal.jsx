import React, { useState } from 'react';
import { X, FileCheck, Upload } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function FinalAgreementModal({ isOpen, onClose, app, agreement, onSuccess }) {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select the countersigned agreement PDF file.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('final_agreement_file', file);

      const agId = agreement?._id || agreement?.id;
      if (!agId) {
        throw new Error('Agreement record not found.');
      }

      await api.post(`/api/agreements/${agId}/finalize`, formData, true);
      toast.success('Final countersigned agreement uploaded & sent to client successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send final agreement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📑 Send Final Countersigned Agreement</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            Upload the final countersigned / stamped agreement PDF for <strong>{app?.profiles?.company_name || app?.establishment_name}</strong>.
            The client will be able to view and download this official copy from their portal.
          </p>

          <div className="form-group">
            <label className="form-label">Countersigned PDF Document <span>*</span></label>
            <div
              onClick={() => document.getElementById('final-agreement-file-input').click()}
              style={{
                border: '2px dashed #cbd5e1', padding: '32px 24px', borderRadius: '12px',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                background: file ? '#f0fdf4' : '#f8fafc'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#2563eb'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
            >
              <FileCheck size={40} style={{ color: file ? '#16a34a' : '#2563eb', marginBottom: 12, margin: '0 auto' }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                {file ? file.name : 'Click to select final signed agreement PDF'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Only PDF format allowed</div>
              <input
                id="final-agreement-file-input"
                type="file"
                hidden
                accept=".pdf"
                onChange={e => setFile(e.target.files[0])}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ background: '#2563eb' }}
            onClick={handleSubmit}
            disabled={submitting || !file}
          >
            {submitting ? 'Uploading...' : 'Send Final Signed Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
