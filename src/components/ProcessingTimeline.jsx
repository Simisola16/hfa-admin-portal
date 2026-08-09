import React from 'react';
import { CheckCircle, Circle, XCircle, Clock, ChevronRight } from 'lucide-react';
import { STATUS_ORDER, RENEWAL_STATUS_ORDER, STATUS_LABELS } from '../lib/applicationStatuses';

/**
 * ProcessingTimeline — Reusable vertical stepper component.
 *
 * Props:
 *   status        (string)  — current application status
 *   statusHistory (array)   — [{ status, changedAt, changedBy, note }]
 */
export default function ProcessingTimeline({ status, statusHistory = [], category = '', applicationType = '' }) {
  const isRejected = status === 'rejected';
  const isRenewal = applicationType === 'renewal';
  const isGSO = category === 'UAE/GSO Approved Halal Certification For Exporters To UAE';

  // Build a lookup from statusHistory entries for quick timestamp/note access
  const historyMap = {};
  (statusHistory || []).forEach(entry => {
    if (!historyMap[entry.status]) {
      historyMap[entry.status] = entry;
    }
  });

  const activeOrder = isRenewal ? RENEWAL_STATUS_ORDER : STATUS_ORDER;

  // Dynamically build the list of steps to display
  const stepsToShow = [];
  stepsToShow.push('submitted');
  stepsToShow.push('under_review');

  // If application was rejected, show rejected. Otherwise, show approved.
  const appRejectedInHistory = status === 'rejected' || statusHistory.some(h => h.status === 'rejected');
  if (appRejectedInHistory) {
    stepsToShow.push('rejected');
  } else {
    stepsToShow.push('approved');
  }

  if (isRenewal) {
    // ─── RENEWAL APPLICATION WORKFLOW ──────────────────────────────
    // 1. Accept, reject, on hold
    // 2. Audit
    // 3. Invoice
    // 4. Logsheet
    // 5. Waiting for Certificate
    // 6. Certificate
    if (!appRejectedInHistory) {
      // 2. Audit Stage
      stepsToShow.push(
        'dates_proposed',
        'dates_accepted',
        'date_finalized',
        'audit_assigned',
        'audit_successful'
      );

      const isNcFlagged = status === 'nc_flagged' || statusHistory.some(h => h.status === 'nc_flagged');
      if (isNcFlagged) {
        stepsToShow.push('nc_flagged');
      }

      const isNcClosedOrBeyond = status === 'nc_closed' || status === 'audit_report_submitted' || activeOrder.indexOf(status) >= activeOrder.indexOf('nc_closed');
      if (isNcClosedOrBeyond || isNcFlagged) {
        stepsToShow.push('nc_closed');
      }

      if (status !== 'on_hold') {
        // 3. Invoice Stage
        stepsToShow.push('invoice_sent', 'payment_received');

        // 4. Logsheet Stage
        stepsToShow.push('logsheet_created', 'logsheet_signed');

        // 5. Waiting for Certificate
        stepsToShow.push('ready_for_certificate');

        // 6. Certificate
        stepsToShow.push('certificate_issued');
      }
    }
  } else {
    // ─── STANDARD INITIAL APPLICATION WORKFLOW ──────────────────────
    if (!appRejectedInHistory) {
      stepsToShow.push('proposal_sent');

      const proposalRejectedInHistory = status === 'proposal_rejected' || statusHistory.some(h => h.status === 'proposal_rejected');
      const proposalApprovedInHistory = status === 'proposal_approved' || STATUS_ORDER.indexOf(status) > STATUS_ORDER.indexOf('proposal_approved');

      if (status === 'proposal_rejected') {
        stepsToShow.push('proposal_rejected');
      } else if (proposalApprovedInHistory) {
        stepsToShow.push('proposal_approved');
      } else {
        stepsToShow.push('proposal_approved');
      }

      // Rest of standard flow
      const restFlow = [
        'invoice_sent',
        'payment_received',
        'dates_proposed',
        'dates_accepted',
        'date_finalized',
        'audit_assigned',
        'audit_successful',
      ];
      stepsToShow.push(...restFlow);

      const isNcFlagged = status === 'nc_flagged' || statusHistory.some(h => h.status === 'nc_flagged');
      if (isNcFlagged) {
        stepsToShow.push('nc_flagged');
      }

      const isNcClosedOrBeyond = status === 'nc_closed' || status === 'audit_report_submitted' || STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf('nc_closed');
      if (isNcClosedOrBeyond || isNcFlagged) {
        stepsToShow.push('nc_closed');
      }

      if (status !== 'on_hold') {
        const downstreamSteps = [
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
        ];
        stepsToShow.push(...downstreamSteps);
      }
    }
  }

  const normStatus = (status || 'submitted').toLowerCase().replace(/ /g, '_');
  const effectiveStatus = (normStatus === 'audit_completed') ? 'audit_successful' : normStatus;
  const currentOrderIdx = activeOrder.indexOf(effectiveStatus);
  const currentIndex = stepsToShow.indexOf(effectiveStatus);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {stepsToShow.map((s, idx) => {
        const histEntry = historyMap[s] || (s === 'audit_successful' ? (historyMap['audit_completed'] || historyMap['audit_successful'] || historyMap['logsheet_created']) : null);
        
        let isComplete = false;
        let isCurrent = false;
        let isPending = false;

        if (currentIndex !== -1) {
          isComplete = currentIndex > idx;
          isCurrent = currentIndex === idx;
          isPending = currentIndex < idx;
        } else {
          // Fallback using canonical order when current status is an internal / off-timeline status
          const stepOrderIdx = activeOrder.indexOf(s);
          if (currentOrderIdx !== -1 && stepOrderIdx !== -1) {
            if (stepOrderIdx <= currentOrderIdx) {
              isComplete = true;
            } else {
              isPending = true;
            }
          } else {
            isPending = idx > 0;
            isCurrent = idx === 0;
          }
        }

        const isRejectedStep = s === 'rejected' || s === 'proposal_rejected';
        const isHoldStep = s === 'on_hold';

        let circleColor, lineColor, labelColor, bgColor, borderColor;

        if (isRejectedStep && (status === s || (s === 'proposal_rejected' && status === 'proposal_rejected'))) {
          circleColor = '#dc2626'; lineColor = '#fecaca';
          labelColor = '#991b1b'; bgColor = '#fef2f2'; borderColor = '#fecaca';
        } else if (isHoldStep && status === 'on_hold') {
          circleColor = '#64748b'; lineColor = '#e2e8f0';
          labelColor = '#334155'; bgColor = '#f8fafc'; borderColor = '#cbd5e1';
        } else if (isComplete) {
          circleColor = '#00853b'; lineColor = '#00853b';
          labelColor = '#0f172a'; bgColor = '#f0fdf4'; borderColor = '#bbf7d0';
        } else if (isCurrent) {
          circleColor = '#00853b'; lineColor = '#e2e8f0';
          labelColor = '#00853b'; bgColor = '#f0fdf4'; borderColor = '#86efac';
        } else {
          circleColor = '#cbd5e1'; lineColor = '#e2e8f0';
          labelColor = '#94a3b8'; bgColor = 'transparent'; borderColor = 'transparent';
        }

        const isLast = idx === stepsToShow.length - 1;

        return (
          <div key={s} style={{ display: 'flex', position: 'relative', minHeight: 48 }}>
            {/* Connecting line */}
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: 11,
                  top: 24,
                  bottom: -8,
                  width: 2,
                  backgroundColor: isComplete ? '#00853b' : '#e2e8f0',
                  zIndex: 1,
                  transition: 'background-color 0.3s ease',
                }}
              />
            )}

            {/* Step Icon / Circle */}
            <div style={{ zIndex: 2, marginRight: 14, flexShrink: 0, marginTop: 2 }}>
              {isRejectedStep && (status === s || (s === 'proposal_rejected' && status === 'proposal_rejected')) ? (
                <XCircle size={24} style={{ color: '#dc2626', fill: '#fee2e2' }} />
              ) : isHoldStep && status === 'on_hold' ? (
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#f1f5f9', border: '2px solid #64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: '#64748b' }} />
                </div>
              ) : isComplete ? (
                <CheckCircle size={24} style={{ color: '#00853b', fill: '#dcfce7' }} />
              ) : isCurrent ? (
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#f0fdf4', border: '2.5px solid #00853b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 3px rgba(0, 133, 59, 0.15)',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00853b' }} />
                </div>
              ) : (
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#f8fafc', border: '2px solid #cbd5e1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1' }} />
                </div>
              )}
            </div>

            {/* Step Content */}
            <div style={{
              flex: 1,
              paddingBottom: isLast ? 0 : 16,
              background: isCurrent ? bgColor : 'transparent',
              borderRadius: 8,
              padding: isCurrent ? '4px 8px 12px' : '0 0 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: isCurrent ? 800 : isComplete ? 700 : 500,
                  color: labelColor,
                  letterSpacing: isCurrent ? '-0.01em' : 'normal',
                }}>
                  {STATUS_LABELS[s] || s.replace(/_/g, ' ')}
                </span>
                {histEntry?.changedAt && (
                  <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                    {formatDate(histEntry.changedAt)}
                  </span>
                )}
              </div>

              {/* Note / metadata from status history */}
              {histEntry?.note && (isComplete || isCurrent) && (
                <div style={{
                  fontSize: 11.5,
                  color: isCurrent ? '#00662e' : '#64748b',
                  marginTop: 3,
                  lineHeight: 1.4,
                }}>
                  {histEntry.note}
                </div>
              )}

              {/* Special message for currently on hold */}
              {isCurrent && s === 'on_hold' && (
                <div style={{
                  fontSize: 11.5,
                  color: '#475569',
                  marginTop: 3,
                  lineHeight: 1.4,
                  fontStyle: 'italic',
                }}>
                  Application is paused. Admin will resume processing once requirements are met.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
