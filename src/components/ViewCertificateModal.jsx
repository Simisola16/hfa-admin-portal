import { getPdfUrl } from '../lib/pdfUtils';
import React from 'react';
import { X, Award, ShieldCheck, Download, ExternalLink, Package, ArrowRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';

export default function ViewCertificateModal({ isOpen, onClose, cert }) {
  const navigate = useNavigate();

  const [generatedBlobUrl, setGeneratedBlobUrl] = React.useState(null);
  const [isGenerating, setIsGenerating]         = React.useState(false);
  const [generateError, setGenerateError]       = React.useState(null);
  const prevCertIdRef = React.useRef(null);

  const effectiveStatus =
    cert?.status === 'active' && cert?.expiry_date && new Date(cert.expiry_date) < new Date()
      ? 'expired'
      : cert?.status;

  const isReview = effectiveStatus === 'under_review' || effectiveStatus === 'draft';
  const certId   = cert?._id || cert?.id;

  const storedPdfUrl = getPdfUrl(cert?.certificate_url);
  const activePdfUrl = storedPdfUrl || generatedBlobUrl;

  const downloadUrl = !isReview && certId
    ? `${API_URL}/api/certificates/${certId}/download`
    : null;

  // Auto-generate PDF on modal open for legacy certs with no certificate_url
  React.useEffect(() => {
    if (!isOpen || !cert || isReview || storedPdfUrl || !certId) return;
    if (prevCertIdRef.current === certId && (generatedBlobUrl || isGenerating)) return;

    prevCertIdRef.current = certId;
    setGeneratedBlobUrl(null);
    setGenerateError(null);
    setIsGenerating(true);

    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';

    fetch(`${API_URL}/api/certificates/${certId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'follow',
    })
      .then(res => {
        if (!res.ok) throw new Error(`Generation failed (${res.status})`);
        return res.blob();
      })
      .then(blob => {
        setGeneratedBlobUrl(URL.createObjectURL(blob));
        setIsGenerating(false);
      })
      .catch(err => {
        console.error('On-demand PDF generation error:', err);
        setGenerateError(err.message || 'Failed to generate certificate PDF.');
        setIsGenerating(false);
      });
  }, [isOpen, certId, isReview, storedPdfUrl]);

  // Clean up blob URL on close
  React.useEffect(() => {
    if (!isOpen) {
      if (generatedBlobUrl) URL.revokeObjectURL(generatedBlobUrl);
      setGeneratedBlobUrl(null);
      setIsGenerating(false);
      setGenerateError(null);
      prevCertIdRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen || !cert) return null;

  const siteStr    = cert.site_name || cert.site_id?.name || cert.site_id?.est_name || cert.establishment_name || cert.application_id?.establishment_name || cert.application_id?.site_name;
  const companyStr = cert.company_name || cert.profiles?.company_name || cert.application_id?.establishment_name || cert.profiles?.full_name || '\u2014';

  const products = Array.isArray(cert.product_details) && cert.product_details.length > 0
    ? cert.product_details
    : (Array.isArray(cert.products_covered) ? cert.products_covered : []);

  const handleGoToReview = () => {
    onClose();
    navigate(`/certificates/${cert.id || cert._id}/review`);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 960, width: '95%', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '18px 24px', background: isReview ? 'linear-gradient(135deg,#fffbeb,#fef3c7)' : 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: isReview ? '#fef08a' : '#bbf7d0', color: isReview ? '#b45309' : '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{cert.certificate_number || 'Certificate Details'}</h2>
                <span className={`badge ${isReview ? 'badge-orange' : effectiveStatus === 'active' ? 'badge-green' : effectiveStatus === 'renewed' ? 'badge-blue' : effectiveStatus === 'revoked' ? 'badge-red' : 'badge-gray'}`} style={{ fontSize: 11, padding: '3px 9px', textTransform: 'capitalize', fontWeight: 800 }}>
                  {isReview ? '\u23f3 Under Review (Pending QA)' : effectiveStatus === 'active' ? '\u2713 Active & Issued' : effectiveStatus === 'expired' ? 'Expired' : effectiveStatus === 'renewed' ? 'Renewed' : effectiveStatus === 'revoked' ? 'Revoked' : effectiveStatus}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{companyStr}</span>
                {siteStr && <span>&bull; Site: {siteStr}</span>}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#64748b' }}><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status notice */}
          {isReview ? (
            <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Eye size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.4 }}><strong>Read-Only View:</strong> This certificate is in <strong>Pending Review</strong>. It must go through QA inspection before it can be issued.</div>
              </div>
              <button type="button" onClick={handleGoToReview} className="btn btn-sm btn-primary" style={{ background: '#047857', borderColor: '#047857', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                Go to Review &amp; Send Page <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={20} style={{ color: '#15803d', flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.4 }}><strong>Official Certificate:</strong> Approved and issued. The client can download it from their portal.</div>
              </div>
              {downloadUrl && (
                <a href={downloadUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={13} /> Download PDF
                </a>
              )}
            </div>
          )}

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Certificate Type / Scheme</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginTop: 4 }}>{cert.certificate_type || 'Halal Certification'}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Issue Date</div>
              <div style={{ fontWeight: 700, color: '#047857', fontSize: 14, marginTop: 4 }}>{cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Expiry Date</div>
              <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14, marginTop: 4 }}>{cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Company &amp; Facility</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{companyStr}</div>
            </div>
          </div>

          {/* Address */}
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Facility &amp; Manufacturing Address</div>
            <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, lineHeight: 1.5 }}>{cert.manufacturing_address || cert.company_address || '\u2014'}</div>
          </div>

          {/* Products chips */}
          {products.length > 0 && (
            <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>
                <Package size={14} /> Certified Products Covered ({products.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {products.map((p, idx) => {
                  const name = typeof p === 'string' ? p : (p?.name || p?.title || 'Product');
                  const code = typeof p === 'object' && p?.code ? p.code : null;
                  return (
                    <span key={idx} style={{ background: '#f1f5f9', color: '#1e293b', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #cbd5e1', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {code && <span style={{ color: '#047857', fontWeight: 800 }}>{code}</span>}
                      {name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* PDF Preview area */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                <Award size={16} style={{ color: '#047857' }} /> Official Certificate Document Preview
              </div>
              {activePdfUrl && !isGenerating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a href={activePdfUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ExternalLink size={12} /> Fullscreen
                  </a>
                  <a href={downloadUrl || activePdfUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Download size={12} /> Download
                  </a>
                </div>
              )}
            </div>

            <div style={{ height: 480, background: '#f1f5f9', position: 'relative' }}>
              {/* Spinner */}
              {isGenerating && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <style>{`@keyframes cert-spin{to{transform:rotate(360deg)}}`}</style>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#047857', animation: 'cert-spin 0.8s linear infinite' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>Generating Certificate PDF\u2026</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Please wait, this may take a few seconds.</div>
                </div>
              )}

              {/* PDF */}
              {!isGenerating && activePdfUrl && (
                <iframe src={`${activePdfUrl}#toolbar=0&navpanes=0&scrollbar=1`} title="Certificate Preview" style={{ width: '100%', height: '100%', border: 'none' }} />
              )}

              {/* Error */}
              {!isGenerating && !activePdfUrl && generateError && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, textAlign: 'center' }}>
                  <Award size={48} style={{ color: '#fca5a5' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#dc2626' }}>PDF Generation Failed</div>
                  <p style={{ fontSize: 12, maxWidth: 360, margin: 0, color: '#64748b' }}>{generateError}</p>
                  {downloadUrl && (
                    <a href={downloadUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ marginTop: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Download size={13} /> Try Download Instead
                    </a>
                  )}
                </div>
              )}

              {/* Under-review fallback */}
              {!isGenerating && !activePdfUrl && !generateError && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, textAlign: 'center', color: '#64748b' }}>
                  <Award size={48} style={{ color: '#cbd5e1' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>PDF Document In Generation</div>
                  <p style={{ fontSize: 12, maxWidth: 360, margin: 0 }}>The certificate PDF is rendered during QA inspection. Go to the Pending Review page to generate and finalize it.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          <button type="button" className="btn btn-outline" onClick={onClose} style={{ fontWeight: 600, fontSize: 13 }}>Close</button>
          {isReview && (
            <button type="button" className="btn btn-primary" onClick={handleGoToReview} style={{ background: '#047857', borderColor: '#047857', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              Open Pending Review &amp; QA Page <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
