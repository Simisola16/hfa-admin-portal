import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Upload, Save, Send, AlertCircle,
  Building2, User, Award, Package, CheckCircle, Clock, X
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getPdfUrl } from '../lib/pdfUtils';

export default function AdminAddOnApprovalForm() {
  const { addonId } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sending, setSending] = useState(false);

  const [formText, setFormText] = useState('');
  const [formFile, setFormFile] = useState(null);
  const formFileRef = useRef(null);

  const fetchApp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/add-on-applications/${addonId}`);
      const data = res.data?.data || res.data;
      setApp(data);

      if (data.product_approval_form) {
        setFormText(data.product_approval_form.form_text || '');
      }
    } catch {
      toast.error('Failed to load application details.');
    } finally {
      setLoading(false);
    }
  }, [addonId]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  const handleSave = async (isDraft = true) => {
    if (!isDraft && !formText.trim() && !formFile && !app?.product_approval_form?.form_file_url) {
      return toast.error('You must either upload a form document or write form text content.');
    }

    if (isDraft) setSavingDraft(true);
    else setSending(true);

    try {
      const fd = new FormData();
      if (formFile) fd.append('form_file', formFile);
      if (formText !== undefined) fd.append('form_text', formText);
      fd.append('is_draft', isDraft ? 'true' : 'false');

      await api.put(`/api/add-on-applications/${addonId}/enable-form`, fd, true);

      if (isDraft) {
        toast.success('Draft form saved successfully!');
        fetchApp();
      } else {
        toast.success('Product Approval Form enabled and sent to client!');
        navigate(`/addon-applications/${addonId}/processing`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSavingDraft(false);
      setSending(false);
    }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  if (!app) {
    return (
      <div className="animate-in" style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <h2>Add-on Application Not Found</h2>
        <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/addon-applications')}>
          <ArrowLeft size={16} /> Back to List
        </button>
      </div>
    );
  }

  const clientName = app.client_id?.company_name || app.client_id?.full_name || 'Client';
  const certNo = app.certificate_id?.certificate_number || '—';
  const isEnabled = app.status === 'product_approval_form_enabled';

  return (
    <div className="animate-in" style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate(`/addon-applications/${addonId}/processing`)}>
            <ArrowLeft size={16} /> Back to Processing
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Enable Product Approval Form</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>
              Author and send the Product Approval Form to <strong>{clientName}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {app.product_approval_form?.is_draft && (
            <span className="badge badge-yellow" style={{ fontSize: 11, fontWeight: 700 }}>DRAFT SAVED</span>
          )}
          {isEnabled && (
            <span className="badge badge-purple" style={{ fontSize: 11, fontWeight: 700 }}>SENT TO CLIENT</span>
          )}
        </div>
      </div>

      {/* ─── Application Context Card ────────────────────────────────────── */}
      <div className="card shadow-sm" style={{ padding: 24, marginBottom: 24, background: '#fafbfc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          Application Context & Details
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, fontSize: 13, marginBottom: 16 }}>
          <div><span style={{ color: '#64748b' }}>Company Name:</span> <strong style={{ color: '#0f172a' }}>{clientName}</strong></div>
          <div><span style={{ color: '#64748b' }}>Active Certificate:</span> <strong>{certNo}</strong></div>
          <div><span style={{ color: '#64748b' }}>Contact Person:</span> <strong>{app.contact_name}</strong> ({app.contact_email})</div>
          <div><span style={{ color: '#64748b' }}>Submission Date:</span> <strong>{new Date(app.createdAt).toLocaleDateString('en-GB')}</strong></div>
        </div>

        {/* Products List Summary */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            Products Included in Request ({(app.products || []).length}):
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(app.products || []).map((p, idx) => (
              <div key={idx} style={{ padding: '6px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12 }}>
                <strong style={{ color: '#0f172a' }}>{p.sn || idx + 1}. {p.name}</strong> {p.code ? `(${p.code})` : ''} &bull; <span style={{ color: '#0284c7', fontWeight: 600 }}>{p.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Form Authoring Document Workspace ───────────────────────────── */}
      <div className="card shadow-sm" style={{ padding: 28, background: 'white', borderRadius: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Product Approval Form Content</div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 20 }}>
          Write form instructions or requirements below AND/OR upload a form document (PDF/Image) for the client.
        </p>

        {/* Form Document Upload */}
        <div style={{ marginBottom: 24, background: '#f8fafc', padding: 20, borderRadius: 10, border: '1px border-dashed #cbd5e1' }}>
          <label className="form-label" style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Upload Form Document (PDF / Image)</label>
          <input
            type="file"
            accept=".pdf,image/*"
            ref={formFileRef}
            style={{ display: 'none' }}
            onChange={e => setFormFile(e.target.files[0] || null)}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => formFileRef.current?.click()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Upload size={15} /> {formFile ? formFile.name : 'Choose File to Upload'}
            </button>

            {formFile && (
              <button type="button" onClick={() => setFormFile(null)} className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}>
                <X size={15} /> Remove File
              </button>
            )}

            {app.product_approval_form?.form_file_url && !formFile && (
              <a
                href={getPdfUrl(app.product_approval_form.form_file_url)}
                target="_blank" rel="noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ color: '#00853b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <FileText size={14} /> View Currently Uploaded Form
              </a>
            )}
          </div>
        </div>

        {/* Written Form Content Textarea */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Form Text / Written Instructions</label>
          <textarea
            className="form-control"
            rows={8}
            value={formText}
            onChange={e => setFormText(e.target.value)}
            placeholder="Type detailed form requirements, specifications, or approval guidelines for the client to acknowledge and respond to..."
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.6, padding: 14 }}
          />
        </div>

        {/* Action Buttons Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 20, borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => handleSave(true)}
            disabled={savingDraft || sending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Save size={16} /> {savingDraft ? 'Saving Draft...' : 'Save Draft'}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSave(false)}
            disabled={savingDraft || sending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
          >
            <Send size={16} /> {sending ? 'Sending to Client...' : 'Send to Client'}
          </button>
        </div>
      </div>

    </div>
  );
}
