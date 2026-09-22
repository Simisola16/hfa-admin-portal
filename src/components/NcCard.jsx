import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Clock, FileText, Download } from 'lucide-react';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/') || url.startsWith('/uploads/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function NcCard({ app, audits = [], status = '', onFlagNc, onCloseNc, actionSubmitting = false }) {
  const appStatus = (app?.status || '').toLowerCase().replace(/ /g, '_');
  const normStatus = (status || appStatus || '').toLowerCase().replace(/ /g, '_');

  // Detect GSO / UAE schemes (Dual Stage schemes) vs Fast-Track (Surveillance / Renewal)
  const catLower = String(app?.category || '').toLowerCase();
  const typeLower = String(app?.application_type || '').toLowerCase();
  const schemeLower = String(app?.scheme || '').toLowerCase();
  const isSurveillance = typeLower.includes('surveillance') || Boolean(app?.is_surveillance) || Boolean(app?.application_number?.includes('-SU-')) || catLower.includes('surveillance');
  const isRenewal = typeLower.includes('renewal') || Boolean(app?.is_renewal) || Boolean(app?.application_number?.includes('-RE-')) || catLower.includes('renewal');
  const isFastTrack = isSurveillance || isRenewal;

  const isGSO = catLower.includes('gso') || catLower.includes('uae') || catLower.includes('dual') || typeLower.includes('gso') || schemeLower.includes('gso');
  const isDualStage = isGSO && !isFastTrack;

  const auditsArr = Array.isArray(audits) ? audits : (audits?.data || []);
  const stage1 = auditsArr.find(a => (a.stage || 1) === 1) || auditsArr[0];
  const stage2 = auditsArr.find(a => a.stage === 2);
  const singleAudit = auditsArr[0];

  const isStage1Complete = stage1?.status === 'audit_completed' || stage1?.status === 'audit_successful';
  const isStage2Conducted = stage2 && ['audit_completed', 'audit_successful', 'completed'].includes(stage2.status);
  const isStage2ReadyOrActive = Boolean(
    isStage1Complete && (
      isStage2Conducted ||
      (stage2 && ['date_finalized', 'auditors_assigned', 'audit_assigned', 'scheduled', 'dates_accepted'].includes(stage2.status)) ||
      Boolean(stage2?.finalized_date) ||
      Boolean(stage2?.auditors && stage2.auditors.length > 0) ||
      (normStatus === 'audit_assigned' && isStage1Complete)
    )
  );
  const hasStage2Nc = Boolean(
    (stage2?.nc_reports && stage2.nc_reports.length > 0) ||
    (normStatus === 'nc_flagged' && isStage1Complete) ||
    ((app?.nc_reports && app.nc_reports.length > 0) && isStage1Complete)
  );

  const isSingleAuditScheduledOrActive = Boolean(
    singleAudit && (
      ['auditors_assigned', 'audit_assigned', 'audit_completed', 'audit_successful', 'completed'].includes(singleAudit.status) ||
      Boolean(singleAudit.auditors && singleAudit.auditors.length > 0) ||
      ['audit_assigned', 'nc_flagged', 'nc_closed', 'audit_completed', 'audit_successful', 'logsheet_created', 'logsheet_signed'].includes(normStatus)
    )
  );

  // For GSO Dual-Stage applications: Stage 1 is an initial assessment where NC findings should not be raised.
  // Unlock the Non-Conformity (NC) & Findings section once Stage 2 is scheduled or underway.
  if (isDualStage && !isStage2ReadyOrActive && !hasStage2Nc) {
    return null;
  }

  // Collect NC reports: For Dual-Stage GSO, scope to Stage 2
  const appNcReports = app?.nc_reports || [];
  const auditNcReports = auditsArr.flatMap(a => (a.nc_reports || []).map(r => ({ ...r, auditStage: a.stage })));
  const relevantNcReports = isDualStage
    ? (stage2?.nc_reports && stage2.nc_reports.length > 0
        ? stage2.nc_reports.map(r => ({ ...r, auditStage: 2 }))
        : (appNcReports.length > 0 ? appNcReports : auditNcReports))
    : (appNcReports.length > 0 ? appNcReports : auditNcReports);
  const allNcReports = relevantNcReports;
  const hasNc = allNcReports.length > 0;
  const isNcFlagged = normStatus === 'nc_flagged';
  const hasActiveNc = isNcFlagged || allNcReports.some(r => ['flagged', 'client_responded', 'admin_replied'].includes(r.status));

  const isPostAuditNcStage = isFastTrack
    ? ['logsheet_created', 'logsheet_signed', 'ready_for_certificate', 'application_successful', 'certificate_issued'].includes(normStatus)
    : ['logsheet_created', 'logsheet_signed', 'application_successful', 'agreement_sent', 'agreement_signed', 'agreement_finalised', 'final_invoice_sent', 'final_invoice_paid', 'ready_for_certificate', 'certificate_issued'].includes(normStatus);

  const isAuditUnderwayOrCompleted = ['audit_completed', 'audit_successful', 'audit_assigned', 'auditors_assigned', 'date_finalized', 'dates_accepted', 'dates_proposed', 'dates_rejected'].includes(normStatus);

  const isNcClosed = !hasActiveNc && !isAuditUnderwayOrCompleted && Boolean(
    normStatus === 'nc_closed' ||
    appStatus === 'nc_closed' ||
    Boolean(app?.nc_closed) ||
    Boolean(singleAudit?.nc_closed) ||
    Boolean(stage2?.nc_closed) ||
    auditsArr.some(a => Boolean(a.nc_closed)) ||
    (allNcReports.length > 0 && allNcReports.every(r => r.status === 'closed')) ||
    isPostAuditNcStage
  );

  const isAuditMarkedCompleted = Boolean(
    normStatus === 'audit_completed' ||
    normStatus === 'audit_successful' ||
    normStatus === 'nc_flagged' ||
    normStatus === 'nc_closed' ||
    hasActiveNc ||
    hasNc ||
    isNcClosed ||
    ['logsheet_created', 'logsheet_signed', 'ready_for_certificate', 'application_successful', 'certificate_issued'].includes(normStatus) ||
    (isDualStage
      ? isStage2Conducted
      : ((singleAudit && ['audit_completed', 'audit_successful', 'completed'].includes(singleAudit.status)) ||
         auditsArr.some(a => ['audit_completed', 'audit_successful', 'completed'].includes(a.status))))
  );

  const hasAuditorAssigned = Boolean(
    normStatus === 'audit_assigned' ||
    normStatus === 'auditors_assigned' ||
    isAuditMarkedCompleted ||
    (singleAudit && (
      (Array.isArray(singleAudit.auditors) && singleAudit.auditors.length > 0) ||
      ['auditors_assigned', 'audit_assigned', 'audit_completed', 'audit_successful', 'completed'].includes(singleAudit.status)
    )) ||
    auditsArr.some(a => (Array.isArray(a.auditors) && a.auditors.length > 0) || ['auditors_assigned', 'audit_assigned', 'audit_completed', 'audit_successful', 'completed'].includes(a.status))
  );

  // For Fast-Track (Surveillance & Renewal): Unlock NC card only after the audit has been marked completed or NC is present
  if (isFastTrack && !isAuditMarkedCompleted && !hasNc && !hasActiveNc && !isNcClosed) {
    return null;
  }

  const hasCompletedAudit = isDualStage
    ? isStage2Conducted
    : auditsArr.some(a => ['audit_completed', 'completed', 'audit_successful'].includes(a.status));
  const isAuditCompletedStatus = ['audit_successful', 'audit_completed', 'nc_flagged', 'nc_closed', 'audit_report_submitted'].includes(normStatus);

  const isPostAuditStage = isDualStage
    ? (isStage2ReadyOrActive || hasStage2Nc || ['nc_closed', 'logsheet_created', 'logsheet_signed', 'application_successful', 'ready_for_certificate', 'certificate_issued'].includes(normStatus))
    : (isFastTrack
        ? (hasAuditorAssigned || hasNc || ['audit_assigned', 'date_finalized', 'dates_accepted', 'audit_successful', 'audit_completed', 'nc_flagged', 'nc_closed', 'audit_report_submitted', 'invoice_sent', 'payment_received', 'logsheet_created', 'logsheet_signed', 'ready_for_certificate', 'application_successful', 'certificate_issued'].includes(normStatus))
        : (isAuditCompletedStatus || hasCompletedAudit || [
            'logsheet_created',
            'logsheet_signed',
            'application_successful',
            'agreement_sent',
            'agreement_signed',
            'agreement_finalised',
            'final_invoice_sent',
            'final_invoice_paid',
            'ready_for_certificate',
            'certificate_issued'
          ].includes(normStatus)));

  const hasClientCorrection = allNcReports.some(r => r.status === 'corrected' || r.client_response || r.correction_document_url || r.client_response_url);

  // If before audit and no NC exists (Non-GSO flow)
  if (!isPostAuditStage && !hasNc) {
    return (
      <div style={{ background: '#f8fafc', opacity: 0.7, border: '1px dashed #cbd5e1', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <AlertTriangle size={20} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Non-Conformity (NC) &amp; Findings (Locked)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Available once audit inspection has commenced or completed</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: isNcClosed ? '#ecfdf5' : (isNcFlagged ? '#fef2f2' : '#fffbeb'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isNcClosed ? (
              <CheckCircle size={18} style={{ color: '#059669' }} />
            ) : isNcFlagged ? (
              <AlertTriangle size={18} style={{ color: '#dc2626' }} />
            ) : (
              <AlertCircle size={18} style={{ color: '#d97706' }} />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: isNcClosed ? '#059669' : 'var(--text-primary)' }}>Non-Conformity (NC) &amp; Findings</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {isNcClosed
                ? 'All audit observations & findings have been cleared.'
                : isNcFlagged
                ? 'Outstanding non-conformities awaiting client rectification.'
                : hasNc && hasClientCorrection
                ? 'Client has submitted corrective action — review below.'
                : isAuditMarkedCompleted
                ? 'Audit completed. Record any findings with Flag NC, or click Close NC to proceed.'
                : 'Audit session findings and non-conformity management.'}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isNcClosed ? (
            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              <CheckCircle size={12} /> NC Closed
            </span>
          ) : isNcFlagged ? (
            <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              <AlertTriangle size={12} /> NC Flagged
            </span>
          ) : hasNc && hasClientCorrection ? (
            <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              <AlertCircle size={12} /> Client Corrected
            </span>
          ) : isAuditMarkedCompleted ? (
            <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              <Clock size={12} /> Audit Completed
            </span>
          ) : (
            <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              Audit In-Progress
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        {hasNc ? (
          <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
            {allNcReports.map((nc, idx) => {
              const isClosedOrRectified = isNcClosed || nc.status === 'closed' || nc.status === 'corrected' || !!nc.client_response || !!nc.correction_document_url;
              return (
                <div
                  key={idx}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: isClosedOrRectified ? '#f0fdf4' : '#fef2f2',
                    border: `1.5px solid ${isClosedOrRectified ? '#bbf7d0' : '#fecaca'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isClosedOrRectified ? <CheckCircle size={14} style={{ color: '#16a34a' }} /> : <AlertTriangle size={14} style={{ color: '#dc2626' }} />}
                      <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', color: isClosedOrRectified ? '#166534' : '#b91c1c' }}>
                        Observation #{idx + 1} &middot; {isClosedOrRectified ? '✓ Rectification Submitted & Closed' : '⚠️ Pending Client Action'}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      {nc.flagged_at ? new Date(nc.flagged_at).toLocaleDateString('en-GB') : ''}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.5, marginBottom: 8 }}>
                    <strong>Finding:</strong> {nc.text || 'Audit Non-Conformity observation.'}
                  </div>

                  {/* Auditor Report Document (Green if closed / rectified) */}
                  {(nc.document_url || nc.url) && (nc.document_url !== '#' || nc.url !== '#') && (
                    <div style={{ marginBottom: 8 }}>
                      <a
                        href={getPdfUrl(nc.document_url || nc.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{
                          fontSize: 11.5,
                          padding: '4px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: isClosedOrRectified ? '#059669' : '#dc2626',
                          borderColor: isClosedOrRectified ? '#a7f3d0' : '#fecaca',
                          background: isClosedOrRectified ? '#ecfdf5' : '#fff'
                        }}
                      >
                        <Download size={12} style={{ color: isClosedOrRectified ? '#059669' : '#dc2626' }} /> View Auditor NC Document
                      </a>
                    </div>
                  )}

                  {/* Client Written Corrective Action & Document Download Link */}
                  {(nc.client_response || nc.correction_document_url || nc.client_response_url) && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #bbf7d0', background: '#ffffff', padding: '12px', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#15803d', marginBottom: 4, textTransform: 'uppercase' }}>
                        Client Corrective Action Response:
                      </div>
                      <div style={{ fontSize: 12.5, color: '#1e293b', marginBottom: 8, lineHeight: 1.5 }}>
                        {nc.client_response || 'Document rectification submitted by client.'}
                      </div>
                      {(nc.correction_document_url || nc.client_response_url) && (
                        <a
                          href={getPdfUrl(nc.correction_document_url || nc.client_response_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 11.5, padding: '5px 12px', background: '#16a34a', borderColor: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <FileText size={12} /> Download Client Correction Document
                        </a>
                      )}
                    </div>
                  )}

                  {/* Admin Reply */}
                  {nc.admin_reply && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #bae6fd', background: '#f0f9ff', padding: '12px', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', marginBottom: 4, textTransform: 'uppercase' }}>
                        Admin Reply:
                      </div>
                      <div style={{ fontSize: 12.5, color: '#075985', lineHeight: 1.5 }}>
                        {nc.admin_reply}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
              {isNcClosed
                ? 'All audit observations, findings, and Non-Conformities (NC) have been verified and officially closed.'
                : 'No Non-Conformities (NC) currently recorded for this audit. If any non-compliance issues were identified during audit inspection, click Flag NC to record findings and notify the client. Otherwise, click Close NC to complete and proceed.'}
            </div>
          </div>
        )}

        {/* Action Buttons / Closed Status Banner */}
        {isNcClosed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginTop: 12 }}>
            <CheckCircle size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
              All Non-Conformities (NC) have been closed &amp; verified. Audit stage completed.
            </div>
          </div>
        ) : isAuditMarkedCompleted ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="btn btn-danger"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontWeight: 700, borderRadius: 8 }}
              onClick={onFlagNc}
              disabled={actionSubmitting}
            >
              <AlertTriangle size={16} /> Flag NC
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontWeight: 700, borderRadius: 8, background: '#16a34a', borderColor: '#16a34a' }}
              onClick={onCloseNc}
              disabled={actionSubmitting}
            >
              <CheckCircle size={16} /> Close NC
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
