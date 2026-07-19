import React from 'react';
import { Calendar, Users, Lock, ChevronRight } from 'lucide-react';

export default function AuditCard({ audit, status }) {
  const isAvailable = ['invoice_sent', 'audit_assigned', 'audit_report_submitted', 'logsheet_created', 'logsheet_signed', 'agreement_sent', 'agreement_signed', 'certificate_issued'].includes(status) || audit;

  if (!isAvailable) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.65, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Audit &amp; Team Details (Locked)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Available once invoice is sent</div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center' }}>
        <Calendar size={28} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
        <div style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>No Audit Scheduled</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Audit dates have not been proposed or scheduled yet.</div>
      </div>
    );
  }

  const roleLabels = { lead_auditor: 'Lead Auditor', sharia_board: 'Sharia Board', audit_trainee: 'Audit Trainee' };
  const roleColors = {
    lead_auditor: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    sharia_board: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    audit_trainee: { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  };

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={18} style={{ color: '#1d4ed8' }} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Assigned Audit Team</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status: <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{audit.status.replace(/_/g, ' ')}</span></div>
        </div>
      </div>
      <div style={{ padding: '20px 24px' }}>
        {audit.finalized_date ? (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} style={{ color: '#15803d' }} />
            <span style={{ fontSize: 14, color: '#15803d', fontWeight: 700 }}>Confirmed Audit Date: {new Date(audit.finalized_date).toDateString()}</span>
          </div>
        ) : audit.status === 'dates_proposed' ? (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fefce8', borderRadius: 10, border: '1px solid #fde68a' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a16207' }}>Awaiting Date Choice from Client</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {audit.proposed_dates?.map((d, idx) => (
                <span key={idx} style={{ fontSize: 11, background: '#fff', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 6, color: '#854d0e', fontWeight: 600 }}>{new Date(d).toLocaleDateString()}</span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 12, color: '#64748b' }}>
            Awaiting date finalization or scheduling setup.
          </div>
        )}

        {audit.auditors && audit.auditors.length > 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {audit.auditors.map((a, i) => {
              const rc = roleColors[a.role] || roleColors.audit_trainee;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{a.name}</div>
                    {a.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.email} {a.contact_number ? `• ${a.contact_number}` : ''}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {a.role && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, padding: '3px 10px', borderRadius: 12 }}>
                        {roleLabels[a.role] || a.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
            No auditors assigned to this session yet.
          </div>
        )}
      </div>
    </div>
  );
}
