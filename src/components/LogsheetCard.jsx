import React from 'react';
import { ClipboardList, Lock, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LogsheetCard({ logsheet, status, appId }) {
  const navigate = useNavigate();
  const isAvailable = ['audit_report_submitted', 'logsheet_created', 'logsheet_signed', 'agreement_sent', 'agreement_signed', 'certificate_issued'].includes(status) || logsheet;

  if (!isAvailable) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.65, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Halal LogSheet (Locked)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Available once audit report is submitted</div>
      </div>
    );
  }

  if (!logsheet) {
    return (
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center' }}>
        <ClipboardList size={28} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
        <div style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>No LogSheet Created</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Logsheet will be generated once audit report is submitted.</div>
      </div>
    );
  }

  const signers = [
    { role: 'Mufti / Shariah Signatory', signed: logsheet.mufti_signed, name: logsheet.mufti_sign_name, date: logsheet.mufti_sign_date },
    { role: 'CEO / Executive Signatory', signed: logsheet.ceo_signed, name: logsheet.ceo_sign_name, date: logsheet.ceo_sign_date },
    { role: 'Manager / Technical Signatory', signed: logsheet.manager_signed, name: logsheet.manager_sign_name, date: logsheet.manager_sign_date },
    { role: 'Mufti 2 / Secondary Shariah Signatory', signed: logsheet.mufti2_signed, name: logsheet.mufti2_sign_name, date: logsheet.mufti2_sign_date },
  ];

  const totalSigned = signers.filter(s => s.signed).length;

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={18} style={{ color: '#10b981' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Halal LogSheet</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Signatures: <span style={{ fontWeight: 700 }}>{totalSigned} of 4 signed</span></div>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/applications/${appId}/logsheet`)}>
          Open LogSheet <ChevronRight size={13} />
        </button>
      </div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          {signers.map((s, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: '10px 14px', background: s.signed ? '#f0fdf4' : '#f8fafc', borderRadius: 8, border: `1px solid ${s.signed ? '#bbf7d0' : '#e2e8f0'}`, justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: '#334155' }}>{s.role}</div>
                {s.signed ? (
                  <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                    Signed by: <strong>{s.name}</strong> • {new Date(s.date).toLocaleDateString('en-GB')}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Awaiting signature</div>
                )}
              </div>
              <div>
                {s.signed ? <CheckCircle size={16} style={{ color: '#16a34a' }} /> : <Clock size={16} style={{ color: '#94a3b8' }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
