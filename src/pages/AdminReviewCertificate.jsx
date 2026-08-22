import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Award, ArrowLeft, Save, RefreshCw, Send, FileText, CheckCircle2, 
  AlertTriangle, Building, MapPin, Calendar, Package, Plus, Trash2, 
  ExternalLink, Download, Check, X, Lock, ShieldCheck, Eye, UploadCloud
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { generateHfaId } from '../lib/idGenerator';

const getPdfUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';
  if (url.startsWith('/api/files/')) {
    return `${API_URL}${url}`;
  }
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function AdminReviewCertificate() {
  const { id: certId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState(null);
  const [clientUser, setClientUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Form State
  const [form, setForm] = useState({
    certificate_number: '',
    certificate_type: 'Halal Certification',
    company_name: '',
    company_address: '',
    manufacturing_address: '',
    scope: '',
    issue_date: '',
    expiry_date: '',
    products_covered: [],
    product_details: [],
    review_notes: '',
    checklist: {
      company_verified: false,
      site_verified: false,
      scope_verified: false,
      dates_verified: false
    }
  });

  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdCat, setNewProdCat] = useState('');

  // Fetch certificate details
  const fetchCertificate = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/certificates/${certId}`);
      const c = res.data?.data || res.data;
      const client = res.data?.client || null;

      if (!c) {
        toast.error('Certificate not found.');
        navigate('/certificates');
        return;
      }

      setCert(c);
      setClientUser(client);

      const resolvedProducts = Array.isArray(c.products_covered) ? c.products_covered : [];
      let resolvedDetails = Array.isArray(c.product_details) && c.product_details.length > 0
        ? c.product_details
        : resolvedProducts.map((p, idx) => ({
            name: typeof p === 'string' ? p : p.name,
            code: `GEN-${String(idx + 1).padStart(2, '0')}`,
            category: 'Halal Certified',
            barcode: ''
          }));

      setForm({
        certificate_number: c.certificate_number || '',
        certificate_type: c.certificate_type || 'Halal Certification',
        company_name: c.company_name || client?.company_name || client?.full_name || c.application_id?.establishment_name || '',
        company_address: c.company_address || client?.address || c.application_id?.establishment_address || '',
        manufacturing_address: c.manufacturing_address || c.application_id?.manufacturer_address || c.company_address || '',
        scope: c.scope || c.application_id?.scope || 'Halal Food and Consumer Products Certification',
        issue_date: c.issue_date ? new Date(c.issue_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expiry_date: c.expiry_date ? new Date(c.expiry_date).toISOString().split('T')[0] : '',
        products_covered: resolvedProducts,
        product_details: resolvedDetails,
        review_notes: c.review_notes || '',
        checklist: {
          company_verified: true,
          site_verified: true,
          scope_verified: true,
          dates_verified: true
        }
      });
    } catch (err) {
      toast.error('Failed to load certificate: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (certId) {
      fetchCertificate();
    }
  }, [certId]);

  // Handle Add Product
  const handleAddProduct = () => {
    if (!newProdName.trim()) {
      toast.error('Please enter product name.');
      return;
    }
    const newCode = newProdCode.trim() || `GEN-${String(form.product_details.length + 1).padStart(2, '0')}`;
    const newCat = newProdCat.trim() || 'Halal Certified';

    const updatedDetails = [
      ...form.product_details,
      { name: newProdName.trim(), code: newCode, category: newCat, barcode: '' }
    ];
    const updatedCovered = [...form.products_covered, newProdName.trim()];

    setForm(f => ({
      ...f,
      product_details: updatedDetails,
      products_covered: updatedCovered
    }));

    setNewProdName('');
    setNewProdCode('');
    setNewProdCat('');
    toast.success('Product added to certificate.');
  };

  // Handle Remove Product
  const handleRemoveProduct = (index) => {
    const updatedDetails = form.product_details.filter((_, i) => i !== index);
    const updatedCovered = updatedDetails.map(p => p.name);
    setForm(f => ({
      ...f,
      product_details: updatedDetails,
      products_covered: updatedCovered
    }));
    toast.success('Product removed.');
  };

  // Set date helpers
  const handleSetYears = (years) => {
    if (!form.issue_date) return;
    const d = new Date(form.issue_date);
    d.setFullYear(d.getFullYear() + years);
    setForm(f => ({ ...f, expiry_date: d.toISOString().split('T')[0] }));
  };

  // Save changes (Draft / Review)
  const handleSave = async (silent = false) => {
    setSaving(true);
    try {
      const payload = {
        certificate_number: form.certificate_number,
        certificate_type: form.certificate_type,
        company_name: form.company_name,
        company_address: form.company_address,
        manufacturing_address: form.manufacturing_address,
        scope: form.scope,
        issue_date: form.issue_date,
        expiry_date: form.expiry_date,
        products_covered: form.products_covered,
        product_details: form.product_details,
        review_notes: form.review_notes
      };

      const res = await api.put(`/api/certificates/${certId}`, payload);
      setCert(res.data?.data || res.data);
      if (!silent) toast.success('Certificate changes saved.');
      return true;
    } catch (err) {
      toast.error('Failed to save certificate: ' + (err.response?.data?.error || err.message));
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Regenerate PDF Preview with updated details
  const handleRegeneratePdf = async () => {
    setRegenerating(true);
    try {
      // First save current inputs
      await handleSave(true);

      const res = await api.post(`/api/certificates/${certId}/regenerate`, {
        company_name: form.company_name,
        company_address: form.company_address,
        manufacturing_address: form.manufacturing_address,
        scope: form.scope,
        issue_date: form.issue_date,
        expiry_date: form.expiry_date,
        products_covered: form.products_covered
      });

      if (res.data?.certificateUrl) {
        setCert(prev => ({
          ...prev,
          certificate_url: res.data.certificateUrl
        }));
        toast.success('Certificate PDF regenerated successfully!');
      }
    } catch (err) {
      toast.error('PDF Regeneration failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setRegenerating(false);
    }
  };

  // Handle Upload custom PDF
  const handleUploadCustomPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a valid PDF document.');
      return;
    }

    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('certificate_file', file);
      formData.append('certificate_number', form.certificate_number);

      const res = await api.put(`/api/certificates/${certId}`, formData, true);
      setCert(res.data?.data || res.data);
      toast.success('Custom certificate PDF uploaded.');
    } catch (err) {
      toast.error('Failed to upload PDF: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingPdf(false);
    }
  };

  // Open confirmation modal for approval & sending
  const handleOpenApproveModal = () => {
    if (!form.certificate_number?.trim()) {
      toast.error('Certificate Number is required.');
      return;
    }
    if (!form.company_name?.trim()) {
      toast.error('Company Name is required.');
      return;
    }
    if (!form.issue_date || !form.expiry_date) {
      toast.error('Issue and Expiry dates are required.');
      return;
    }
    setShowConfirmModal(true);
  };

  // Final Approve and Send to Client
  const handleApproveAndSend = async () => {
    setApproving(true);
    try {
      const payload = {
        certificate_number: form.certificate_number,
        certificate_type: form.certificate_type,
        company_name: form.company_name,
        company_address: form.company_address,
        manufacturing_address: form.manufacturing_address,
        scope: form.scope,
        issue_date: form.issue_date,
        expiry_date: form.expiry_date,
        products_covered: form.products_covered,
        product_details: form.product_details,
        review_notes: form.review_notes
      };

      const res = await api.post(`/api/certificates/${certId}/approve-and-send`, payload);

      toast.success('🏅 Certificate approved & successfully issued to client!');
      setShowConfirmModal(false);

      // Redirect back to certificates
      setTimeout(() => {
        navigate('/certificates');
      }, 1200);
    } catch (err) {
      toast.error('Failed to approve certificate: ' + (err.response?.data?.error || err.message));
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Loading Certificate for Review...</div>
      </div>
    );
  }

  const isUnderReview = cert?.status === 'under_review' || cert?.status === 'draft';
  const pdfUrl = getPdfUrl(cert?.certificate_url);

  return (
    <div style={{ padding: '24px 32px 100px', maxWidth: 1600, margin: '0 auto' }}>
      
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Link to="/certificates" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              <ArrowLeft size={16} /> Back to Certificates
            </Link>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ fontSize: 13, color: '#047857', fontWeight: 700 }}>Review &amp; QA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={24} style={{ color: '#047857' }} />
              Certificate Review &amp; Quality Check
            </h1>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 20,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: isUnderReview ? '#ffedd5' : '#dcfce7',
              color: isUnderReview ? '#c2410c' : '#15803d',
              border: `1px solid ${isUnderReview ? '#fed7aa' : '#bbf7d0'}`
            }}>
              {isUnderReview ? '⏳ Under Review' : '✓ Active & Issued'}
            </span>
          </div>
        </div>

        {/* Quick meta details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#ffffff', padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <strong>Client:</strong> {form.company_name || '—'}
          </div>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <strong>Cert #:</strong> <span style={{ color: '#0f172a', fontWeight: 700 }}>{form.certificate_number}</span>
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 45%) 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* LEFT PANE: Live Certificate Document Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} style={{ color: '#047857' }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Live Certificate Document</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleRegeneratePdf}
                  disabled={regenerating}
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, color: '#047857', borderColor: '#d1fae5' }}
                  title="Re-render PDF with current form values"
                >
                  <RefreshCw size={13} className={regenerating ? 'spinner' : ''} />
                  {regenerating ? 'Regenerating...' : 'Sync & Refresh'}
                </button>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, color: '#334155' }}
                  >
                    <ExternalLink size={13} /> Fullscreen
                  </a>
                )}
              </div>
            </div>

            {/* Document Viewer Frame */}
            <div style={{
              background: '#f8fafc',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              height: '620px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  title="Certificate PDF Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  <Award size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>No PDF Generated Yet</div>
                  <p style={{ fontSize: 12, margin: '6px 0 16px' }}>Click "Regenerate PDF" to render the official certificate document with your details.</p>
                  <button
                    type="button"
                    onClick={handleRegeneratePdf}
                    disabled={regenerating}
                    className="btn btn-primary"
                    style={{ fontSize: 12 }}
                  >
                    <RefreshCw size={13} /> Generate Preview PDF
                  </button>
                </div>
              )}
            </div>

            {/* Document details strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14, fontSize: 12 }}>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Scheme</div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {form.certificate_type}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Issue Date</div>
                <div style={{ fontWeight: 700, color: '#047857', marginTop: 2 }}>{form.issue_date || '—'}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Expiry Date</div>
                <div style={{ fontWeight: 700, color: '#dc2626', marginTop: 2 }}>{form.expiry_date || '—'}</div>
              </div>
            </div>
          </div>

          {/* Upload Custom Replacement PDF Box */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UploadCloud size={16} style={{ color: '#047857' }} />
              Upload Custom / Stamped Certificate PDF (Optional)
            </div>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
              If you have an externally generated or signed PDF file, you can upload it directly to replace the system-generated document.
            </p>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px',
              borderRadius: 8,
              border: '1.5px dashed #cbd5e1',
              background: '#f8fafc',
              cursor: uploadingPdf ? 'not-allowed' : 'pointer',
              color: '#334155',
              fontSize: 12,
              fontWeight: 700
            }}>
              <UploadCloud size={16} color="#047857" />
              {uploadingPdf ? 'Uploading Custom PDF...' : 'Choose Replacement PDF Document'}
              <input type="file" accept="application/pdf" disabled={uploadingPdf} onChange={handleUploadCustomPdf} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* RIGHT PANE: Review & Correction Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* Card 1: Certificate & Organization Identity */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <Building size={16} style={{ color: '#047857' }} />
              1. Certificate &amp; Company Identifiers
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Certificate Number <span style={{ color: '#dc2626' }}>*</span></label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, certificate_number: generateHfaId(f.company_name || 'HFA') }))}
                    style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    Regenerate ID
                  </button>
                </div>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={form.certificate_number}
                  onChange={e => setForm({ ...form, certificate_number: e.target.value })}
                  placeholder="e.g. HFA-CERT-2026-001"
                  style={{ fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Certificate Scheme / Type <span style={{ color: '#dc2626' }}>*</span></label>
                <select
                  className="form-control"
                  value={form.certificate_type}
                  onChange={e => setForm({ ...form, certificate_type: e.target.value })}
                  style={{ fontWeight: 600 }}
                >
                  <option value="Halal Certification">Halal Certification (Standard Annual)</option>
                  <option value="UAE/GSO Halal Certification">UAE/GSO Halal Certification (3-Year Exporter Scheme)</option>
                  <option value="Add-on Products Certification">Add-on Products Certification</option>
                  <option value="Export Halal Certificate">Export Halal Certificate</option>
                  <option value="Batch Halal Certificate">Batch Halal Certificate</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Business / Company Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={form.company_name}
                  onChange={e => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Official registered company name"
                  style={{ fontWeight: 700, fontSize: 14 }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Registered Company Address <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea
                  rows={2}
                  className="form-control"
                  value={form.company_address}
                  onChange={e => setForm({ ...form, company_address: e.target.value })}
                  placeholder="Head office / registered legal address"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Manufacturing Site Address <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea
                  rows={2}
                  className="form-control"
                  value={form.manufacturing_address}
                  onChange={e => setForm({ ...form, manufacturing_address: e.target.value })}
                  placeholder="Physical site location where products are certified and manufactured"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Validity Dates & Cycle */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <Calendar size={16} style={{ color: '#047857' }} />
              2. Validity Period &amp; Dates
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Certificate Issue Date <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={form.issue_date}
                  onChange={e => setForm({ ...form, issue_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Certificate Expiry Date <span style={{ color: '#dc2626' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleSetYears(1)}
                      style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                    >
                      +1 Yr
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetYears(3)}
                      style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                    >
                      +3 Yrs
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={form.expiry_date}
                  onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                  style={{ fontWeight: 700, color: '#dc2626' }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Scope of Certification & Products Management */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <Package size={16} style={{ color: '#047857' }} />
              3. Scope &amp; Certified Products List
            </h3>

            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Scope of Certification <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea
                rows={2}
                className="form-control"
                value={form.scope}
                onChange={e => setForm({ ...form, scope: e.target.value })}
                placeholder="e.g. Processing, packaging and distribution of halal confectionery and baked goods"
              />
            </div>

            {/* Products Table */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                  Products Covered ({form.product_details.length})
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>Appears on the certificate annex / products schedule</span>
              </div>

              {form.product_details.length === 0 ? (
                <div style={{ padding: 18, background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  No individual products added. Add products below.
                </div>
              ) : (
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', width: 40 }}>#</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Product Name</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', width: 100 }}>Code</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', width: 120 }}>Category</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', width: 50 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.product_details.map((prod, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>{prod.name}</td>
                          <td style={{ padding: '8px 12px', color: '#64748b' }}>{prod.code || '—'}</td>
                          <td style={{ padding: '8px 12px', color: '#64748b' }}>{prod.category || 'Halal'}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                              title="Delete product"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add product mini-form */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Add product name..."
                  className="form-control"
                  style={{ fontSize: 12 }}
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddProduct(); } }}
                />
                <input
                  type="text"
                  placeholder="Code (optional)"
                  className="form-control"
                  style={{ fontSize: 12 }}
                  value={newProdCode}
                  onChange={e => setNewProdCode(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Category"
                  className="form-control"
                  style={{ fontSize: 12 }}
                  value={newProdCat}
                  onChange={e => setNewProdCat(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="btn btn-ghost"
                  style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9' }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Quality Review Checklist & Remarks */}
          <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <CheckCircle2 size={16} style={{ color: '#047857' }} />
              4. Reviewer Quality Verification Checklist
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { key: 'company_verified', label: 'Company name and registered address verified' },
                { key: 'site_verified', label: 'Manufacturing site matches audit & logsheet' },
                { key: 'scope_verified', label: 'Scope & product formulations approved' },
                { key: 'dates_verified', label: 'Issue & expiry dates correctly aligned' },
              ].map(chk => (
                <label key={chk.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer', background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    checked={form.checklist[chk.key]}
                    onChange={e => setForm({
                      ...form,
                      checklist: { ...form.checklist, [chk.key]: e.target.checked }
                    })}
                    style={{ marginTop: 2 }}
                  />
                  <span style={{ fontWeight: 600 }}>{chk.label}</span>
                </label>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Reviewer Audit Notes / Internal Remarks</label>
              <input
                type="text"
                className="form-control"
                value={form.review_notes}
                onChange={e => setForm({ ...form, review_notes: e.target.value })}
                placeholder="Optional remarks regarding this review or corrections made..."
              />
            </div>
          </div>

        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '14px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/certificates" className="btn btn-ghost" style={{ fontSize: 13 }}>
            <ArrowLeft size={15} /> Back
          </Link>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Status: <strong style={{ color: isUnderReview ? '#c2410c' : '#15803d' }}>{isUnderReview ? 'Under Review' : 'Active'}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Save Changes button */}
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving || regenerating || approving}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          {/* Regenerate PDF button */}
          <button
            type="button"
            onClick={handleRegeneratePdf}
            disabled={saving || regenerating || approving}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#047857', borderColor: '#bbf7d0', background: '#f0fdf4' }}
          >
            <RefreshCw size={15} className={regenerating ? 'spinner' : ''} />
            {regenerating ? 'Regenerating PDF...' : 'Regenerate PDF'}
          </button>

          {/* Approve & Send to Client button */}
          <button
            type="button"
            onClick={handleOpenApproveModal}
            disabled={saving || regenerating || approving}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 800,
              padding: '10px 22px',
              fontSize: 14,
              background: '#047857',
              borderColor: '#047857',
              boxShadow: '0 2px 8px rgba(4,120,87,0.3)'
            }}
          >
            <Send size={16} />
            {isUnderReview ? 'Approve & Send to Client' : 'Update & Re-send Certificate'}
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL: Ask if they are sure and don't want to change anything */}
      {showConfirmModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 540, borderRadius: 16, overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '18px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#dcfce7', color: '#15803d', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#166534' }}>
                    Confirm Certificate Approval &amp; Issuance
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#15803d' }}>
                    Ready to send the final official certificate to the client
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 10, padding: '14px 16px', marginBottom: 18, color: '#854d0e', fontSize: 13, lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, marginBottom: 4 }}>
                  <AlertTriangle size={16} color="#d97706" /> Are you sure and don't want to change anything?
                </div>
                Please make sure all information (Company Name, Addresses, Scope, Dates, and Products) is accurate. Once approved, the certificate will be immediately published to the client portal and an official email will be sent to the client.
              </div>

              {/* Summary verification box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Certificate Number:</span>
                  <strong style={{ color: '#0f172a' }}>{form.certificate_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Company Name:</span>
                  <strong style={{ color: '#0f172a' }}>{form.company_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Scheme:</span>
                  <strong style={{ color: '#0f172a' }}>{form.certificate_type}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Validity:</span>
                  <strong style={{ color: '#047857' }}>{form.issue_date} ➔ {form.expiry_date}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Products:</span>
                  <strong style={{ color: '#0f172a' }}>{form.product_details.length} Certified Products</strong>
                </div>
                {clientUser?.email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                    <span style={{ color: '#64748b' }}>Recipient Client Email:</span>
                    <strong style={{ color: '#047857' }}>{clientUser.email}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowConfirmModal(false)}
                disabled={approving}
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                Cancel / Keep Editing
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApproveAndSend}
                disabled={approving}
                style={{
                  background: '#047857',
                  borderColor: '#047857',
                  fontSize: 13,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Send size={15} />
                {approving ? 'Issuing & Sending to Client...' : 'Yes, Approve & Send to Client'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
