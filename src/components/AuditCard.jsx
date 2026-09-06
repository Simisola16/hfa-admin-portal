import React from 'react';
import { Calendar, Users, Lock, AlertCircle, CheckCircle, FileText } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/') || url.startsWith('/uploads/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AuditCard({ audits, status, app, initialProduct, isInitialProductApproved = true, isFastTrack = false, onManage }) {
  const normStatus = (status || '').toLowerCase().replace(/ /g, '_');
  const hasAudits = audits && audits.length > 0;
  const isAvailable = ['invoice_sent', 'payment_received', 'initial_product_approved', 'dates_proposed', 'dates_rejected', 'dates_accepted', 'date_finalized', 'audit_assigned', 'audit_report_submitted', 'audit_successful', 'on_hold', 'final_invoice_sent', 'logsheet_created', 'logsheet_signed', 'agreement_sent', 'agreement_signed', 'certificate_issued', 'nc_flagged', 'nc_closed', 'audit_completed'].includes(normStatus) || hasAudits;

  const isDualStage = app?.category === 'UAE/GSO Approved Halal Certification For Exporters To UAE';
  const stage1 = audits?.find(a => a.stage === 1) || audits?.[0];
  const stage2 = audits?.find(a => a.stage === 2);


  const formatProcessStatus = (s) => {
    if (!s) return 'Pending';
    const statusMap = {
      dates_proposed: 'Dates Proposed',
      dates_accepted: 'Dates Accepted',
      dates_rejected: 'Dates Rejected',
      date_finalized: 'Date Finalized',
      auditors_assigned: 'Auditors Assigned',
      audit_assigned: 'Auditors Assigned',
      audit_completed: 'Audit Completed',
      audit_successful: 'Audit Successful',
      on_hold: 'On Hold',
      pending: 'Pending',
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      nc_flagged: 'NC Flagged',
      nc_closed: 'NC Closed',
      audit_report_submitted: 'Audit Report Submitted',
    };
    if (statusMap[s]) return statusMap[s];
    return s
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  if (!isAvailable) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.65, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <Lock size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Audit &amp; Team Details (Locked)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Available once invoice is sent</div>
      </div>
    );
  }

  if (!hasAudits) {
    const isApproved = isInitialProductApproved || normStatus === 'initial_product_approved' || app?.is_initial_product_approved;
    const isAuditLockedByProduct = !isFastTrack && !isApproved;

    return (
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center' }}>
        <Calendar size={28} style={{ color: isAuditLockedByProduct ? '#d97706' : '#94a3b8', margin: '0 auto 10px' }} />
        <div style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>
          {isAuditLockedByProduct ? 'Facility Audit (Locked)' : 'No Audit Scheduled'}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
          {isAuditLockedByProduct
            ? 'Facility audit scheduling is locked until the Initial Product is approved.'
            : 'Audit dates have not been proposed or scheduled yet.'}
        </div>

        {isAuditLockedByProduct && (
          <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, padding: '16px 20px', textAlign: 'left', marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: '#92400e' }}>
                  Initial Product Approval Required Before Facility Audit
                </div>
                <div style={{ fontSize: 12.5, color: '#b45309', marginTop: 4, lineHeight: 1.45 }}>
                  {initialProduct
                    ? `Initial Product "${initialProduct.product?.name || 'Product'}" is currently under review (${initialProduct.status?.replace(/_/g, ' ')}). The facility audit can be scheduled once the Initial Product is approved.`
                    : 'The client has not yet added their Initial Product. Facility audit cannot be scheduled until the Initial Product is submitted and marked as Initial Product Approved.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {onManage && !isAuditLockedByProduct ? (
          <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={onManage}>
            Schedule Audit
          </button>
        ) : isAuditLockedByProduct ? (
          <button
            className="btn btn-outline btn-sm"
            disabled
            style={{ marginTop: 16, opacity: 0.6, cursor: 'not-allowed', background: '#f8fafc', borderColor: '#cbd5e1', color: '#64748b' }}
          >
            <Lock size={14} style={{ marginRight: 6 }} /> Schedule Audit (Locked)
          </button>
        ) : null}
      </div>
    );
  }

  const stageStatusColor = (stageAudit) => {
    if (!stageAudit) return { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' };
    if (stageAudit.status === 'audit_completed') return { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' };
    if (['auditors_assigned', 'date_finalized', 'dates_accepted'].includes(stageAudit.status)) return { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' };
    if (stageAudit.status === 'dates_proposed') return { bg: '#fefce8', border: '#fde68a', color: '#a16207' };
    return { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' };
  };

  const renderAuditorList = (auditorList) => {
    if (!auditorList || auditorList.length === 0) {
      return (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
          No auditors assigned to this session yet.
        </div>
      );
    }
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {auditorList.map((a, i) => {
          const name = a.name || a.full_name || a.user_id?.full_name || 'Auditor';
          const email = a.email || a.user_id?.email || '';
          const phone = a.contact_number || a.phone || a.user_id?.phone || '';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{name}</div>
                {(email || phone) && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{email} {phone ? `• ${phone}` : ''}</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSingleStageBlock = (auditObj, stageLabel = null) => {
    if (!auditObj) return null;
    return (
      <div style={{ marginBottom: isDualStage ? 16 : 0, padding: isDualStage ? '14px' : '0', background: isDualStage ? '#fafafa' : 'transparent', borderRadius: 12, border: isDualStage ? '1px solid #e2e8f0' : 'none' }}>
        {stageLabel && (
          <div style={{ fontWeight: 800, fontSize: 12, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{stageLabel}</span>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>
              {formatProcessStatus(auditObj.status)}
            </span>
          </div>
        )}
        {auditObj.finalized_date ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} style={{ color: '#15803d' }} />
            <span style={{ fontSize: 13, color: '#15803d', fontWeight: 700 }}>Confirmed Audit Date: {new Date(auditObj.finalized_date).toDateString()}</span>
          </div>
        ) : auditObj.status === 'dates_proposed' ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fefce8', borderRadius: 10, border: '1px solid #fde68a' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a16207' }}>Awaiting Date Choice from Client</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {auditObj.proposed_dates?.map((d, idx) => (
                <span key={idx} style={{ fontSize: 11, background: '#fff', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 6, color: '#854d0e', fontWeight: 600 }}>{new Date(d).toLocaleDateString()}</span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 12, color: '#64748b' }}>
            Awaiting date finalization or scheduling setup.
          </div>
        )}
        {renderAuditorList(auditObj.auditors)}
      </div>
    );
  };

  // Collect all NC reports across audits
  const rawNcReports = audits.flatMap(a => (a.nc_reports || []).map(r => ({ ...r, auditStage: a.stage })));
  const allNcReports = rawNcReports.filter((nc, idx, self) => {
    return self.findIndex(o => {
      if (o._id && nc._id && String(o._id) === String(nc._id)) return true;
      if (o.text && nc.text && o.text.trim().toLowerCase() === nc.text.trim().toLowerCase()) return true;
      return false;
    }) === idx;
  });

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} style={{ color: '#1d4ed8' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Assigned Audit Team</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Category: <span style={{ fontWeight: 700 }}>{isDualStage ? 'UAE/GSO Exporter (Dual Stage)' : 'Standard Audit'}</span>
            </div>
          </div>
        </div>
        {onManage && (
          <button className="btn btn-ghost btn-sm" onClick={onManage} style={{ fontSize: 12 }}>
            Manage
          </button>
        )}
      </div>
      <div style={{ padding: '20px 24px' }}>
        {/* Two-stage progress bar for UAE/GSO */}
        {isDualStage && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[1, 2].map(stageNum => {
              const stageAudit = audits.find(a => a.stage === stageNum);
              const sc = stageStatusColor(stageAudit);
              const isLocked = stageNum === 2 && stage1?.status !== 'audit_completed';
              return (
                <div key={stageNum} style={{ flex: 1, padding: '10px 14px', background: sc.bg, borderRadius: 10, border: `1px solid ${sc.border}`, opacity: isLocked ? 0.5 : 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Stage {stageNum} {isLocked ? '🔒' : stageAudit?.status === 'audit_completed' ? '✓' : ''}
                  </div>
                  <div style={{ fontSize: 11.5, color: sc.color, marginTop: 2, fontWeight: 700 }}>
                    {formatProcessStatus(stageAudit ? stageAudit.status : (isLocked ? 'Locked' : 'Pending'))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isDualStage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px', background: '#fafafa' }}>
              {renderSingleStageBlock(stage1, 'Stage 1 (Initial Visit)')}
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px', background: '#fafafa' }}>
              {renderSingleStageBlock(stage2, 'Stage 2 (Final Visit)')}
            </div>
          </div>
        ) : (
          renderSingleStageBlock(stage1)
        )}
      </div>
    </div>
  );
}

