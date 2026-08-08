import React from 'react';
import { ClipboardList, Lock, ChevronRight, CheckCircle, Clock, FilePlus, PenTool } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const POST_AUDIT_STATUSES = [
  'audit_successful',
  'audit_completed',
  'on_hold',
  'audit_report_submitted',
  'logsheet_created',
  'logsheet_sign_requested',
  'logsheet_signed',
  'application_successful',
  'agreement_sent',
  'agreement_signed',
  'agreement_finalised',
  'final_invoice_sent',
  'final_invoice_paid',
  'ready_for_certificate',
  'certificate_issued'
];

export default function LogsheetCard({ logsheet, status, appId }) {
  const navigate = useNavigate();
  const normalizedStatus = (status || '').toLowerCase().replace(/ /g, '_');

  const hasLogsheet = Boolean(
    logsheet &&
    !logsheet.error &&
    (logsheet._id || logsheet.id || logsheet.status || logsheet.confirmed !== undefined || logsheet.mufti_signature || logsheet.company_name)
  );

  const isAvailable = POST_AUDIT_STATUSES.includes(normalizedStatus) || hasLogsheet;

  // Case 1: Before audit stage and no logsheet created yet -> Locked
  if (!isAvailable && !hasLogsheet) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.75, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={22} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#64748b' }}>Halal LogSheet (Locked)</div>
        <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>Available once audit report is submitted or audit completed</div>
      </div>
    );
  }

  // Case 2: Audit completed / ready, but logsheet not created yet -> Provide Create LogSheet CTA
  if (!hasLogsheet) {
    return (
      <div style={{ background: '#ffffff', borderRadius: 20, border: '1.5px dashed #99f6e4', padding: '24px 24px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdfa', border: '1px solid #99f6e4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <ClipboardList size={22} style={{ color: '#0d9488' }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Halal LogSheet Ready</div>
        <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4, maxWidth: 380, margin: '4px auto 16px', lineHeight: 1.45 }}>
          Audit stage is complete. You can now generate the official LogSheet for Shariah and Executive committee review.
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/applications/${appId}/logsheet`)}
          style={{ background: '#0e7490', borderColor: '#0e7490', fontSize: 13.5, fontWeight: 700, padding: '10px 20px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <FilePlus size={16} /> Create LogSheet
        </button>
      </div>
    );
  }

  // Case 3: Logsheet IS created -> Render full details & signatory status
  const signers = [
    { role: 'Mufti / Shariah Signatory', signed: Boolean(logsheet.mufti_signed || logsheet.mufti_signature), name: logsheet.mufti_sign_name, date: logsheet.mufti_sign_date },
    { role: 'CEO / Executive Signatory', signed: Boolean(logsheet.ceo_signed || logsheet.ceo_signature), name: logsheet.ceo_sign_name, date: logsheet.ceo_sign_date },
    { role: 'Manager / Technical Signatory', signed: Boolean(logsheet.manager_signed || logsheet.manager_signature), name: logsheet.manager_sign_name, date: logsheet.manager_sign_date },
    { role: 'Mufti 2 / Secondary Shariah Signatory', signed: Boolean(logsheet.mufti2_signed || logsheet.mufti2_signature), name: logsheet.mufti2_sign_name, date: logsheet.mufti2_sign_date },
  ];

  const totalSigned = signers.filter(s => s.signed).length;
  const isComplete = totalSigned === 4 || logsheet.status === 'Signed' || logsheet.status === 'Completed' || logsheet.status === 'Waiting For Certificate';

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: isComplete ? '#ecfdf5' : '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isComplete ? '#a7f3d0' : '#99f6e4'}` }}>
            <ClipboardList size={20} style={{ color: isComplete ? '#10b981' : '#0d9488' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 14.5, color: '#0f172a' }}>Halal LogSheet</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: isComplete ? '#dcfce7' : '#fef3c7',
                  color: isComplete ? '#15803d' : '#b45309',
                  border: `1px solid ${isComplete ? '#86efac' : '#fde68a'}`
                }}
              >
                {isComplete ? 'Signed & Completed' : `${totalSigned} of 4 Signed`}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Status: <strong style={{ color: '#334155' }}>{logsheet.status || (isComplete ? 'Signed' : 'Waiting for Signature')}</strong>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate(`/signatures`)}
            style={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <PenTool size={13} /> Signatures Portal
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/applications/${appId}/logsheet`)}
            style={{ background: '#0e7490', borderColor: '#0e7490', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            Open LogSheet <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div style={{ padding: '18px 22px' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {signers.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: s.signed ? '#f0fdf4' : '#f8fafc',
                borderRadius: 10,
                border: `1px solid ${s.signed ? '#bbf7d0' : '#e2e8f0'}`
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: '#334155' }}>{s.role}</div>
                {s.signed ? (
                  <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                    Signed by: <strong>{s.name || 'Verified Signatory'}</strong> {s.date ? `• ${new Date(s.date).toLocaleDateString('en-GB')}` : ''}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Awaiting signature</div>
                )}
              </div>
              <div>
                {s.signed ? <CheckCircle size={17} style={{ color: '#16a34a' }} /> : <Clock size={17} style={{ color: '#94a3b8' }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
