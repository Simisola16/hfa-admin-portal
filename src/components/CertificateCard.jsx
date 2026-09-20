import React from 'react';
import { Award, ShieldCheck, FileText, Download, ArrowRight, ExternalLink, Calendar, CheckCircle2, Clock, Lock, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getPdfUrl } from '../lib/pdfUtils';

export default function CertificateCard({ app, certificate, status, isSurveillance, onIssueCertificate }) {
  const navigate = useNavigate();

  const hasCertificate = Boolean(certificate && (certificate._id || certificate.id || certificate.certificate_number));
  const isUnderReview = hasCertificate && (certificate.status === 'under_review' || certificate.status === 'draft');
  const isActive = hasCertificate && certificate.status === 'active';
  const pdfUrl = hasCertificate ? getPdfUrl(certificate.certificate_url) : '';

  const normStatus = (status || app?.status || '').toLowerCase().replace(/ /g, '_');
  const isFinalFeePaid = normStatus === 'final_invoice_paid' || Boolean(app?.final_payment_confirmed || app?.final_invoice_paid);
  const isReadyForCertificate = isFinalFeePaid || ['final_invoice_paid', 'ready_for_certificate', 'certificate_issued', 'waiting_for_certificate'].includes(normStatus);

  // If application was rejected or cancelled and has no certificate, do not render
  if (!hasCertificate && ['rejected', 'cancelled'].includes(normStatus)) {
    return null;
  }

  const headerBorder = isUnderReview 
    ? '1.5px solid #fde68a' 
    : isActive 
      ? '1.5px solid #bbf7d0' 
      : isReadyForCertificate
        ? '1.5px solid #e9d5ff'
        : '1px solid #e2e8f0';

  const headerBg = isUnderReview 
    ? '#fffbeb' 
    : isActive 
      ? '#f0fdf4' 
      : isReadyForCertificate
        ? '#faf5ff'
        : '#f8fafc';

  const iconBg = isUnderReview 
    ? '#fef3c7' 
    : isActive 
      ? '#dcfce7' 
      : isReadyForCertificate
        ? '#f3e8ff'
        : '#f1f5f9';

  const iconColor = isUnderReview 
    ? '#d97706' 
    : isActive 
      ? '#15803d' 
      : isReadyForCertificate
        ? '#7e22ce'
        : '#64748b';

  return (
    <div className="card" style={{ border: headerBorder }}>
      <div className="card-header" style={{
        background: headerBg,
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor
          }}>
            {isUnderReview ? <ShieldCheck size={20} /> : (!hasCertificate && !isReadyForCertificate) ? <Lock size={18} /> : <Award size={20} />}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {isSurveillance ? 'Official Surveillance Letter' : 'Halal Certification Certificate'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {hasCertificate ? `Ref: ${certificate.certificate_number || 'N/A'}` : isReadyForCertificate ? 'Certificate Issuance Stage' : 'Certificate Issuance Stage (Locked)'}
            </div>
          </div>
        </div>

        <div>
          {isUnderReview && (
            <span style={{
              background: '#ffedd5',
              color: '#c2410c',
              border: '1px solid #fed7aa',
              fontSize: 12,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 20,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Clock size={13} /> QA Review Pending (Not sent to client)
            </span>
          )}
          {isActive && (
            <span style={{
              background: '#dcfce7',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              fontSize: 12,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 20,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}>
              <CheckCircle2 size={13} /> Issued &amp; Active
            </span>
          )}
          {!hasCertificate && isReadyForCertificate && (
            <span style={{
              background: '#f3e8ff',
              color: '#7e22ce',
              border: '1px solid #e9d5ff',
              fontSize: 12,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 20,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Sparkles size={13} /> Ready for Certificate
            </span>
          )}
          {!hasCertificate && !isReadyForCertificate && (
            <span style={{
              background: '#f1f5f9',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 20,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Lock size={12} /> Stage Locked
            </span>
          )}
        </div>
      </div>

      <div className="card-body" style={{ padding: 20 }}>
        {isUnderReview && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: 10,
            padding: 16,
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <ShieldCheck size={24} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>
                  Certificate Draft is Awaiting Review
                </div>
                <p style={{ fontSize: 13, color: '#b45309', margin: '4px 0 12px', lineHeight: 1.5 }}>
                  The certificate has been initialized with number <strong>{certificate.certificate_number}</strong>. It is currently held in review and will <strong>only be sent to the client once approved on the Review Certification page</strong>.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    background: '#d97706',
                    borderColor: '#b45309',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onClick={() => navigate(`/certificates/${certificate._id || certificate.id}/review`)}
                >
                  <ShieldCheck size={16} /> Open Review Page &amp; Issue to Client <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {isActive && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #dcfce7',
            borderRadius: 10,
            padding: 16,
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>
                  Certificate Successfully Issued
                </div>
                <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
                  This certificate is live, active, and accessible on the client's portal.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Download size={14} /> Download PDF
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => navigate(`/certificates/${certificate._id || certificate.id}/review`)}
                >
                  <ExternalLink size={14} /> View Certificate Details
                </button>
              </div>
            </div>
          </div>
        )}

        {!hasCertificate && isReadyForCertificate && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Award size={36} style={{ color: '#16a34a', margin: '0 auto 10px', display: 'block' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Certificate Not Yet Created
            </div>
            <div style={{ fontSize: 12.5, color: '#64748b', maxWidth: 450, margin: '6px auto 16px', lineHeight: 1.5 }}>
              Final payments and evaluations are completed. Create the certificate to enter the Review Certification workflow before sending it to the client.
            </div>
            {onIssueCertificate && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#16a34a', borderColor: '#15803d' }}
                onClick={onIssueCertificate}
              >
                <Award size={15} /> Issue Certificate
              </button>
            )}
          </div>
        )}

        {!hasCertificate && !isReadyForCertificate && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              border: '1px solid #e2e8f0'
            }}>
              <Lock size={24} style={{ color: '#94a3b8' }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>
              Certificate Issuance Locked
            </div>
            <div style={{ fontSize: 12.5, color: '#64748b', maxWidth: 460, margin: '6px auto 16px', lineHeight: 1.5 }}>
              Certificate issuance unlocks once initial processing, evaluations, and approvals are complete.
            </div>
            <button
              type="button"
              className="btn btn-outline"
              disabled
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'not-allowed',
                opacity: 0.65,
                background: '#f8fafc',
                borderColor: '#cbd5e1',
                color: '#94a3b8',
                fontWeight: 600
              }}
              title="Certificate issuance unlocks once initial processing, evaluations, and approvals are complete."
            >
              <Lock size={14} /> Issue Certificate
            </button>
          </div>
        )}

        {hasCertificate && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Certificate Number</span>
              <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{certificate.certificate_number || '—'}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Certification Scheme</span>
              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{certificate.certificate_type || 'Halal Certification'}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Validity Period</span>
              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                {certificate.issue_date ? new Date(certificate.issue_date).toLocaleDateString() : '—'} ➔ {certificate.expiry_date ? new Date(certificate.expiry_date).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
