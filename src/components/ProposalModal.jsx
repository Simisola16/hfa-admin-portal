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

export default function ProposalModal({ isOpen, onClose, app: propApp, appId: propAppId, proposal: propProposal, onSuccess }) {
  const [app, setApp] = useState(propApp || null);
  const [proposal, setProposal] = useState(propProposal || null);
  const [loading, setLoading] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    type: 'upload',
    title: '',
    estimated_cost: '',
    details: '',
    admin_comment: '',
    file: null
  });
  const [submitting, setSubmitting] = useState(false);

  const targetAppId = getCleanId(propAppId) || getCleanId(propApp) || getCleanId(propProposal?.application_id);

  useEffect(() => {
    if (isOpen) {
      if (!propApp && targetAppId) {
        setLoading(true);
        Promise.all([
          api.get(`/api/applications/${targetAppId}`).catch(() => ({ data: null })),
          api.get(`/api/proposals/application/${targetAppId}`).catch(() => ({ data: null }))
        ]).then(([appRes, pRes]) => {
          const loadedApp = appRes.data?.data || appRes.data || null;
          const loadedProposal = pRes.data?.data || pRes.data || null;
          setApp(loadedApp);
          setProposal(loadedProposal);
          if (loadedApp) {
            setProposalForm(f => ({
              ...f,
              title: loadedProposal ? `Revised Proposal for ${loadedApp.application_number}` : `Proposal for ${loadedApp.application_number}`,
              estimated_cost: loadedProposal?.estimated_cost || '',
              details: loadedProposal?.details || '',
              admin_comment: loadedProposal?.admin_comment || '',
            }));
          }
        }).finally(() => setLoading(false));
      } else {
        setApp(propApp || null);
        setProposal(propProposal || null);
        setProposalForm({
          type: 'upload',
          title: propProposal ? `Revised Proposal for ${propApp?.application_number}` : `Proposal for ${propApp?.application_number}`,
          estimated_cost: propProposal?.estimated_cost || '',
          details: propProposal?.details || '',
          admin_comment: propProposal?.admin_comment || '',
          file: null
        });
      }
    }
  }, [isOpen, propApp, propProposal, targetAppId]);

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
    if (!proposalForm.title.trim()) {
      toast.error('Please enter a proposal title.');
      return;
    }
    if (proposalForm.type === 'upload' && !proposalForm.file && !proposal?.proposal_url) {
      toast.error('Please select a proposal document.');
      return;
    }
    if (proposalForm.type === 'write' && !proposalForm.details.trim()) {
      toast.error('Please write the proposal details.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', proposalForm.title);
      formData.append('estimated_cost', proposalForm.estimated_cost || '0');
      formData.append('admin_comment', proposalForm.admin_comment);
      if (proposalForm.type === 'upload' && proposalForm.file) {
        formData.append('proposal_file', proposalForm.file);
      } else if (proposalForm.type === 'write' && proposalForm.details) {
        formData.append('details', proposalForm.details);
      }

      const clientId = getCleanId(app.client_id || app.profiles?._id || app.profiles?.id || app.profiles);
      if (!clientId) {
        throw new Error('Could not identify client ID for this application.');
      }
      const appId = getCleanId(app._id || app.id || app);
      formData.append('application_id', appId);
      formData.append('client_id', clientId);

      await api.post('/api/proposals', formData, true);
      toast.success('Proposal submitted successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Send Proposal</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            Provide a proposal for <strong>{app.profiles?.company_name || app.establishment_name}</strong>.
            This will be visible to the client on their portal.
          </p>

          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => setProposalForm(f => ({ ...f, type: 'upload' }))}
              style={{
                flex: 1, padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                background: proposalForm.type === 'upload' ? '#fff' : 'transparent',
                color: proposalForm.type === 'upload' ? '#0f172a' : '#64748b',
                boxShadow: proposalForm.type === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Upload Document
            </button>
            <button
              type="button"
              onClick={() => setProposalForm(f => ({ ...f, type: 'write' }))}
              style={{
                flex: 1, padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                background: proposalForm.type === 'write' ? '#fff' : 'transparent',
                color: proposalForm.type === 'write' ? '#0f172a' : '#64748b',
                boxShadow: proposalForm.type === 'write' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Write Proposal
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Proposal Title <span>*</span></label>
            <input
              className="form-control"
              value={proposalForm.title}
              onChange={e => setProposalForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Halal Certification Proposal 2024"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Estimated Cost (£) <span>*</span></label>
            <input
              type="number"
              className="form-control"
              value={proposalForm.estimated_cost}
              onChange={e => setProposalForm(f => ({ ...f, estimated_cost: e.target.value }))}
              placeholder="e.g. 500.00"
            />
          </div>

          {proposalForm.type === 'upload' ? (
            <div className="form-group">
              <label className="form-label">Proposal Document (PDF) <span>*</span></label>
              <div
                onClick={() => document.getElementById('proposal-file-shared').click()}
                style={{
                  border: '2px dashed #e2e8f0', padding: '32px 24px', borderRadius: '12px',
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  background: proposalForm.file ? '#f0fdf4' : '#fff'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <FileText size={40} style={{ color: proposalForm.file ? '#22c55e' : '#94a3b8', marginBottom: 12, margin: '0 auto' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                  {proposalForm.file ? proposalForm.file.name : 'Click to select proposal document'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Only PDF, DOCX or JPG/PNG allowed</div>
                <input
                  id="proposal-file-shared"
                  type="file"
                  hidden
                  onChange={e => setProposalForm(f => ({ ...f, file: e.target.files[0] }))}
                />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Proposal Details <span>*</span></label>
              <textarea
                className="form-control"
                rows={6}
                style={{ fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.5' }}
                value={proposalForm.details}
                onChange={e => setProposalForm(f => ({ ...f, details: e.target.value }))}
                placeholder="Write your professional proposal here..."
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Admin Comments (Optional)</label>
            <textarea
              className="form-control"
              rows={3}
              value={proposalForm.admin_comment}
              onChange={e => setProposalForm(f => ({ ...f, admin_comment: e.target.value }))}
              placeholder="Add any internal notes for the client..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !proposalForm.title || (proposalForm.type === 'upload' ? !proposalForm.file : !proposalForm.details.trim())}
          >
            {submitting ? 'Sending...' : 'Send Proposal'}
          </button>
        </div>
      </div>
    </div>
  );
}
