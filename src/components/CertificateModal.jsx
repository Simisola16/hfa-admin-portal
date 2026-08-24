import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  FileText,
  Award,
  ShieldCheck,
  Edit3,
  UploadCloud,
  Eye,
  EyeOff,
  RotateCcw,
  Building,
  Calendar,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
  const [letterMode, setLetterMode] = useState('compose'); // 'compose' | 'upload'
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [certificateForm, setCertificateForm] = useState({
    certificate_number: '',
    certificate_type: 'Halal Certification',
    issue_date: '',
    expiry_date: '',
    products_covered: '',
    file: null,

    // Letter specific fields (for typing/composing)
    surveillance_cycle: 'Annual Halal Surveillance Audit (UAE/GSO 3-Year Scheme)',
    recipient_name: '',
    recipient_address: '',
    recipient_attention: 'Quality Assurance & Halal Management Team',
    letter_subject: 'CONFIRMATION OF CONTINUED HALAL CERTIFICATION COMPLIANCE — ANNUAL SURVEILLANCE',
    letter_salutation: 'Dear Quality Assurance & Operations Team,',
    letter_body: '',
    standards: 'UAE.S 2055-1:2015, GSO 2055-1:2015 & HFA Scheme Standards',
    signatory_name: 'HFA Halal Certification Committee',
    signatory_title: 'Lead Halal Auditor & Certification Director'
  });

  const isSurveillance = app?.application_type === 'surveillance';
  const targetAppId = getCleanId(propAppId) || getCleanId(propApp);

  const getDefaultLetterBody = (compName, stnds, nextDue) => {
    return `We are pleased to confirm that the Halal Food Authority (HFA) has successfully concluded the Annual Halal Surveillance Audit for ${compName || 'the certified facility'} in accordance with ${stnds || 'UAE.S 2055-1 and GSO 2055-1 Halal Standards'}.

Following a comprehensive audit and verification of your manufacturing facility, raw materials, ingredient traceability, sanitation protocols, and Halal Assurance System (HAS), the HFA Certification Committee confirms that your operations continue to satisfy all required Halal compliance standards.

Consequently, your UAE/GSO 3-Year Halal Certification remains fully active and in good standing. This confirmation letter serves as official endorsement of continued compliance until your next scheduled surveillance milestone.`;
  };

  const initForm = (loadedApp) => {
    if (!loadedApp) return;
    const isSurv = loadedApp.application_type === 'surveillance';
    const isThreeYear = loadedApp.category === 'UAE/GSO Approved Halal Certification For Exporters To UAE' || isSurv;
    const yearsToAdd = isSurv ? 1 : (isThreeYear ? 3 : 1);
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);
    
    const companyName = loadedApp.establishment_name || loadedApp.client_id?.company_name || loadedApp.profiles?.company_name || loadedApp.client_id?.full_name || 'HFA Client';
    const companyAddress = loadedApp.establishment_address || loadedApp.manufacturer_address || loadedApp.profiles?.address || '';
    
    // Extract products list if available
    let prods = '';
    if (Array.isArray(loadedApp.products) && loadedApp.products.length > 0) {
      prods = loadedApp.products.map(p => p.name || p.title).filter(Boolean).join(', ');
    } else if (loadedApp.scope) {
      prods = loadedApp.scope;
    }

    const defaultStandards = 'UAE.S 2055-1:2015, GSO 2055-1:2015 & HFA Scheme Standards';
    const initialIssue = new Date().toISOString().split('T')[0];
    const initialExpiry = expiryDate.toISOString().split('T')[0];

    setCertificateForm({
      certificate_number: isSurv ? `HFA-SURV-${Date.now().toString().slice(-6)}` : generateHfaId(companyName),
      certificate_type: isSurv ? 'UAE/GSO Halal Surveillance Letter' : (isThreeYear ? 'UAE/GSO Halal Certification' : 'Halal Certification'),
      issue_date: initialIssue,
      expiry_date: initialExpiry,
      products_covered: prods,
      file: null,

      surveillance_cycle: 'Annual Halal Surveillance Audit (UAE/GSO 3-Year Scheme)',
      recipient_name: companyName,
      recipient_address: companyAddress,
      recipient_attention: 'Quality Assurance & Halal Management Team',
      letter_subject: 'CONFIRMATION OF CONTINUED HALAL CERTIFICATION COMPLIANCE — ANNUAL SURVEILLANCE',
      letter_salutation: `Dear Management of ${companyName},`,
      letter_body: getDefaultLetterBody(companyName, defaultStandards, initialExpiry),
      standards: defaultStandards,
      signatory_name: 'HFA Halal Certification Committee',
      signatory_title: 'Lead Halal Auditor & Certification Director'
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

  const handleResetLetterBody = () => {
    setCertificateForm(f => ({
      ...f,
      letter_body: getDefaultLetterBody(f.recipient_name, f.standards, f.expiry_date)
    }));
    toast.success('Letter content reset to standard template');
  };

  const handleSubmit = async () => {
    if (!certificateForm.certificate_number.trim()) {
      toast.error(isSurveillance ? 'Please enter a Surveillance Letter reference number.' : 'Please enter a certificate number.');
      return;
    }
    if (!certificateForm.issue_date) {
      toast.error('Please enter the issue date.');
      return;
    }
    if (!certificateForm.expiry_date) {
      toast.error(isSurveillance ? 'Please enter the next audit / milestone date.' : 'Please enter the expiry date.');
      return;
    }

    if (isSurveillance && letterMode === 'upload' && !certificateForm.file) {
      toast.error('Please upload a Surveillance Letter PDF file or switch to "Type / Compose Letter" mode.');
      return;
    }

    if (isSurveillance && letterMode === 'compose' && !certificateForm.letter_body.trim()) {
      toast.error('Please enter the letter body content.');
      return;
    }

    setSubmitting(true);
    try {
      const appId = getCleanId(app._id || app.id || app);

      if (isSurveillance) {
        const formData = new FormData();
        formData.append('letter_number', certificateForm.certificate_number);
        formData.append('issue_date', certificateForm.issue_date);
        formData.append('next_due_date', certificateForm.expiry_date);
        formData.append('letter_mode', letterMode);
        formData.append('products_covered', certificateForm.products_covered || '');

        if (letterMode === 'upload' && certificateForm.file) {
          formData.append('letter_file', certificateForm.file);
        } else {
          formData.append('surveillance_cycle', certificateForm.surveillance_cycle);
          formData.append('recipient_name', certificateForm.recipient_name);
          formData.append('recipient_address', certificateForm.recipient_address);
          formData.append('recipient_attention', certificateForm.recipient_attention);
          formData.append('letter_subject', certificateForm.letter_subject);
          formData.append('letter_salutation', certificateForm.letter_salutation);
          formData.append('letter_body', certificateForm.letter_body);
          formData.append('standards', certificateForm.standards);
          formData.append('signatory_name', certificateForm.signatory_name);
          formData.append('signatory_title', certificateForm.signatory_title);
        }

        await api.post(`/api/applications/${appId}/issue-surveillance-letter`, formData, true);
        toast.success('🎉 Official Surveillance Letter issued successfully!');
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      // Non-surveillance certificate creation flow
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
      toast.error(err.response?.data?.error || err.message || (isSurveillance ? 'Failed to issue surveillance letter.' : 'Failed to create certificate.'));
    } finally {
      setSubmitting(false);
    }
  };

  const modalWidth = isSurveillance ? (showPreview ? 860 : 660) : 540;

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div
        className="modal"
        style={{
          maxWidth: modalWidth,
          width: '95%',
          borderRadius: 14,
          transition: 'max-width 0.25s ease'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            padding: '18px 24px',
            background: isSurveillance ? '#f0f9ff' : '#f8fafc',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isSurveillance ? (
              <FileText size={22} style={{ color: '#0284c7' }} />
            ) : (
              <Award size={20} style={{ color: '#047857' }} />
            )}
            <div>
              <div className="modal-title" style={{ fontSize: 16, fontWeight: 800, color: isSurveillance ? '#0369a1' : '#0f172a' }}>
                {isSurveillance ? 'Issue Official Surveillance Letter' : 'Create Certificate for Review'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {app.profiles?.company_name || app.establishment_name} &bull; {isSurveillance ? 'UAE/GSO 3-Year Halal Scheme' : (app.category || 'Halal Certification')}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '74vh', overflowY: 'auto', padding: 24 }}>
          {/* Informational Banner */}
          <div
            style={{
              background: isSurveillance ? '#f0f9ff' : '#f0fdf4',
              border: `1px solid ${isSurveillance ? '#bae6fd' : '#bbf7d0'}`,
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 18,
              color: isSurveillance ? '#0369a1' : '#166534',
              fontSize: 12.5,
              lineHeight: 1.5
            }}
          >
            <ShieldCheck size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
            {isSurveillance ? (
              <span>
                <strong>Notice:</strong> GSO Surveillance applications do not issue new certificates. Issuing this letter confirms the audit was successful and publishes the official <strong>Surveillance Letter</strong> to the client portal.
              </span>
            ) : (
              <span>
                Creating this certificate will generate an official draft and take you directly to the <strong>Review Certificate Page</strong>, where you can verify all details, edit any field, regenerate the PDF, and send to the client.
              </span>
            )}
          </div>

          {/* Mode Switcher for Surveillance Letter: Type vs Upload */}
          {isSurveillance && (
            <div style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'block' }}>
                Surveillance Letter Issuance Method:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  background: '#f1f5f9',
                  padding: 4,
                  borderRadius: 10
                }}
              >
                <button
                  type="button"
                  onClick={() => setLetterMode('compose')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: letterMode === 'compose' ? 800 : 600,
                    background: letterMode === 'compose' ? '#ffffff' : 'transparent',
                    color: letterMode === 'compose' ? '#0369a1' : '#64748b',
                    boxShadow: letterMode === 'compose' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Edit3 size={15} style={{ color: letterMode === 'compose' ? '#0284c7' : '#94a3b8' }} />
                  Type / Compose Letter (Auto PDF)
                </button>

                <button
                  type="button"
                  onClick={() => setLetterMode('upload')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: letterMode === 'upload' ? 800 : 600,
                    background: letterMode === 'upload' ? '#ffffff' : 'transparent',
                    color: letterMode === 'upload' ? '#0369a1' : '#64748b',
                    boxShadow: letterMode === 'upload' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <UploadCloud size={15} style={{ color: letterMode === 'upload' ? '#0284c7' : '#94a3b8' }} />
                  Upload Signed PDF File
                </button>
              </div>
            </div>
          )}

          {/* Standard / Shared Reference & Dates Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isSurveillance ? '1.2fr 1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                {isSurveillance ? 'Letter Ref #' : 'Certificate Number'} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={certificateForm.certificate_number}
                onChange={e => setCertificateForm(f => ({ ...f, certificate_number: e.target.value }))}
                placeholder={isSurveillance ? 'e.g. HFA-SURV-2026-001' : 'e.g. HFA-CERT-2026-001'}
                style={{ fontWeight: 700 }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                {isSurveillance ? 'Letter Date' : 'Issue Date'} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={certificateForm.issue_date}
                onChange={e => setCertificateForm(f => ({ ...f, issue_date: e.target.value }))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                {isSurveillance ? 'Next Audit / Renewal Date' : 'Expiry Date'} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={certificateForm.expiry_date}
                onChange={e => setCertificateForm(f => ({ ...f, expiry_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Certificate Type Selection for non-surveillance */}
          {!isSurveillance && (
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
          )}

          {/* ========================================================
              SURVEILLANCE: COMPOSE / TYPE LETTER SECTION
             ======================================================== */}
          {isSurveillance && letterMode === 'compose' && (
            <div style={{ marginTop: 6 }}>
              {/* Recipient Details Sub-card */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>
                  <Building size={16} style={{ color: '#0284c7' }} />
                  Recipient & Establishment Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10, marginBottom: 8 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Recipient Company / Facility Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={certificateForm.recipient_name}
                      onChange={e => setCertificateForm(f => ({ ...f, recipient_name: e.target.value }))}
                      placeholder="e.g. Adebayo Foods Ltd"
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Attention (Dept / Contact)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={certificateForm.recipient_attention}
                      onChange={e => setCertificateForm(f => ({ ...f, recipient_attention: e.target.value }))}
                      placeholder="e.g. Quality Assurance Management"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>Facility / Business Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={certificateForm.recipient_address}
                    onChange={e => setCertificateForm(f => ({ ...f, recipient_address: e.target.value }))}
                    placeholder="e.g. 123 Industrial Way, London, UK"
                  />
                </div>
              </div>

              {/* Letter Subject & Salutation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Letter Subject Line</label>
                  <input
                    type="text"
                    className="form-control"
                    value={certificateForm.letter_subject}
                    onChange={e => setCertificateForm(f => ({ ...f, letter_subject: e.target.value }))}
                    placeholder="Subject title..."
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Salutation</label>
                  <input
                    type="text"
                    className="form-control"
                    value={certificateForm.letter_salutation}
                    onChange={e => setCertificateForm(f => ({ ...f, letter_salutation: e.target.value }))}
                    placeholder="e.g. Dear Sir / Madam,"
                  />
                </div>
              </div>

              {/* Letter Body Textarea */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, margin: 0 }}>
                    Official Letter Content / Confirmation Body <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleResetLetterBody}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <RotateCcw size={12} /> Reset to standard template
                  </button>
                </div>
                <textarea
                  className="form-control"
                  rows={6}
                  value={certificateForm.letter_body}
                  onChange={e => setCertificateForm(f => ({ ...f, letter_body: e.target.value }))}
                  placeholder="Type the official letter confirmation text here..."
                  style={{ fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Tip: Paragraphs separated by blank lines will be formatted into official letterhead paragraphs automatically.
                </div>
              </div>

              {/* Products & Scope */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Certified Products / Facility Scope</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={certificateForm.products_covered}
                  onChange={e => setCertificateForm(f => ({ ...f, products_covered: e.target.value }))}
                  placeholder="e.g. Fresh Beef, Poultry, Spices"
                  style={{ fontSize: 12.5 }}
                />
              </div>

              {/* Standards & Signatory info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Applicable Standards</label>
                  <input
                    type="text"
                    className="form-control"
                    value={certificateForm.standards}
                    onChange={e => setCertificateForm(f => ({ ...f, standards: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Authorized Signatory</label>
                  <input
                    type="text"
                    className="form-control"
                    value={certificateForm.signatory_name}
                    onChange={e => setCertificateForm(f => ({ ...f, signatory_name: e.target.value }))}
                  />
                </div>
              </div>

              {/* Live Preview Toggle Button */}
              <div style={{ marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: '1px solid #bae6fd',
                    background: showPreview ? '#e0f2fe' : '#f0f9ff',
                    color: '#0369a1',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                  {showPreview ? 'Hide Letter Layout Preview' : '👁️ Preview Formatted Letterhead Layout'}
                </button>
              </div>

              {/* Live Preview Container */}
              {showPreview && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '2px solid #047857',
                    borderRadius: 10,
                    padding: '24px 28px',
                    marginBottom: 16,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    fontSize: 12.5,
                    color: '#1e293b',
                    lineHeight: 1.55
                  }}
                >
                  {/* Top Bar */}
                  <div style={{ height: 4, background: 'linear-gradient(90deg, #047857, #10b981, #d97706)', marginBottom: 16, borderRadius: 2 }} />

                  {/* Letterhead Preview Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #047857', paddingBottom: 10, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#047857', letterSpacing: -0.3 }}>HALAL FOOD AUTHORITY</div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>UK & International Halal Certification Body</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 9.5, color: '#64748b', lineHeight: 1.35 }}>
                      <strong>Halal Food Authority (HFA)</strong><br />
                      3rd Floor, 55 New Oxford Street, London WC1A 1BS<br />
                      info@halalfoodauthority.com &bull; www.halalfoodauthority.com
                    </div>
                  </div>

                  {/* Ref & Date Strip */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', borderLeft: '4px solid #047857', padding: '6px 12px', borderRadius: 4, fontSize: 11, marginBottom: 14 }}>
                    <div><strong>Letter Ref:</strong> {certificateForm.certificate_number}</div>
                    <div><strong>Date Issued:</strong> {certificateForm.issue_date || 'Today'}</div>
                    <div><strong>Next Due:</strong> {certificateForm.expiry_date || '1 Year'}</div>
                  </div>

                  {/* Recipient */}
                  <div style={{ marginBottom: 12, fontSize: 11.5 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Issued To:</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#047857' }}>{certificateForm.recipient_name || 'Recipient Company'}</div>
                    {certificateForm.recipient_address && <div style={{ color: '#475569' }}>{certificateForm.recipient_address}</div>}
                    {certificateForm.recipient_attention && <div style={{ color: '#64748b', fontSize: 10.5 }}>Attn: {certificateForm.recipient_attention}</div>}
                  </div>

                  {/* Subject */}
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '6px 10px', borderRadius: 6, marginBottom: 12 }}>
                    <strong style={{ color: '#065f46', fontSize: 11, textTransform: 'uppercase' }}>Subject: {certificateForm.letter_subject}</strong>
                  </div>

                  {/* Salutation */}
                  <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12 }}>{certificateForm.letter_salutation}</div>

                  {/* Body preview */}
                  <div style={{ whiteSpace: 'pre-line', fontSize: 11.5, color: '#334155', marginBottom: 14 }}>
                    {certificateForm.letter_body}
                  </div>

                  {/* Scope Box */}
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', fontSize: 11, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, color: '#047857', marginBottom: 2 }}>Certified Scope:</div>
                    <div>{certificateForm.products_covered || 'All registered products under active scheme schedule.'}</div>
                  </div>

                  {/* Sign-off */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>For Halal Food Authority:</div>
                      <div style={{ fontFamily: 'cursive', fontSize: 16, color: '#047857', margin: '2px 0' }}>HFA Certification Board</div>
                      <div style={{ fontWeight: 800, fontSize: 11 }}>{certificateForm.signatory_name}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{certificateForm.signatory_title}</div>
                    </div>
                    <div style={{ textAlign: 'center', border: '1.5px dashed #047857', borderRadius: '50%', width: 54, height: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
                      <span style={{ fontSize: 6, fontWeight: 800, color: '#047857' }}>HFA SEAL</span>
                      <span style={{ fontSize: 7, color: '#059669' }}>★★★</span>
                      <span style={{ fontSize: 5, fontWeight: 700, color: '#065f46' }}>VERIFIED</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              SURVEILLANCE: UPLOAD EXISTING PDF SECTION
              OR NON-SURVEILLANCE UPLOAD OPTION
             ======================================================== */}
          {(!isSurveillance || letterMode === 'upload') && (
            <div>
              {/* Products field for non-surveillance */}
              {!isSurveillance && (
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Products / Facility Scope</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={certificateForm.products_covered}
                    onChange={e => setCertificateForm(f => ({ ...f, products_covered: e.target.value }))}
                    placeholder="e.g. Fresh Beef, Poultry, Spices"
                  />
                </div>
              )}

              {/* Upload Dropzone */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {isSurveillance ? 'Surveillance Letter PDF Document' : 'Custom PDF Upload (Optional)'}
                </label>
                <div
                  onClick={() => document.getElementById('certificate-file-shared').click()}
                  style={{
                    border: '1.5px dashed #cbd5e1',
                    padding: '24px 16px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: certificateForm.file ? '#f0fdf4' : '#f8fafc'
                  }}
                >
                  <FileText
                    size={32}
                    style={{
                      color: certificateForm.file ? (isSurveillance ? '#0284c7' : '#16a34a') : '#94a3b8',
                      margin: '0 auto 8px'
                    }}
                  />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                    {certificateForm.file
                      ? certificateForm.file.name
                      : (isSurveillance ? 'Upload official Surveillance Letter PDF' : 'Upload custom PDF or leave empty to auto-generate')}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    {isSurveillance
                      ? 'Select signed PDF file from your device'
                      : 'System will automatically render the official certificate template if empty'}
                  </div>
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
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={
              submitting ||
              !certificateForm.certificate_number ||
              !certificateForm.issue_date ||
              !certificateForm.expiry_date ||
              (isSurveillance && letterMode === 'upload' && !certificateForm.file) ||
              (isSurveillance && letterMode === 'compose' && !certificateForm.letter_body.trim())
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 800,
              background: isSurveillance ? '#0284c7' : '#047857',
              borderColor: isSurveillance ? '#0284c7' : '#047857'
            }}
          >
            {isSurveillance ? (
              letterMode === 'compose' ? <Sparkles size={16} /> : <UploadCloud size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
            {submitting
              ? (isSurveillance ? 'Issuing Letter...' : 'Creating Certificate...')
              : (isSurveillance
                  ? (letterMode === 'compose' ? 'Generate & Issue Surveillance Letter' : 'Upload & Issue Surveillance Letter')
                  : 'Create & Proceed to Review')}
          </button>
        </div>
      </div>
    </div>
  );
}
