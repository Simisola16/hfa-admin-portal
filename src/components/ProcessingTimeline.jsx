import React from 'react';
import { CheckCircle, Circle, XCircle, Clock, ChevronRight } from 'lucide-react';
import { STATUS_ORDER, STATUS_LABELS } from '../lib/applicationStatuses';

/**
 * ProcessingTimeline — Reusable vertical stepper component.
 *
 * Props:
 *   status        (string)  — current application status
 *   statusHistory (array)   — [{ status, changedAt, changedBy, note }]
 *
 * Phases 5–9 automatically get new stages by extending STATUS_ORDER in applicationStatuses.js.
 * No changes to this component needed.
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

  // If application is not rejected, we can show proposal and subsequent stages
  if (!appRejectedInHistory) {
    stepsToShow.push('proposal_sent');

    const proposalRejectedInHistory = status === 'proposal_rejected' || statusHistory.some(h => h.status === 'proposal_rejected');
    const proposalApprovedInHistory = status === 'proposal_approved' || STATUS_ORDER.indexOf(status) > STATUS_ORDER.indexOf('proposal_approved');

    if (status === 'proposal_rejected') {
      stepsToShow.push('proposal_rejected');
    } else if (proposalApprovedInHistory) {
      stepsToShow.push('proposal_approved');
    } else {
      // If proposal is sent but not decided, show proposal_approved as target
      stepsToShow.push('proposal_approved');
    }

    // Rest of the flow
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

    // After Audit Complete: Flag NC (if active/in history) and NC Closed
    const isNcFlagged = status === 'nc_flagged' || statusHistory.some(h => h.status === 'nc_flagged');
    if (isNcFlagged) {
      stepsToShow.push('nc_flagged');
    }

    const isNcClosedOrBeyond = status === 'nc_closed' || status === 'audit_report_submitted' || STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf('nc_closed');
    if (isNcClosedOrBeyond || isNcFlagged) {
      stepsToShow.push('nc_closed');
    }

    // If currently on hold, don't show downstream steps as pending. If NOT on hold, show normal flow.
    if (status !== 'on_hold') {
      const downstreamSteps = [
        'logsheet_created',
        'logsheet_signed',
        'application_successful',
        'agreement_sent',
        'agreement_signed',
        'agreement_finalised',
      ];
      if (!isRenewal) {
        downstreamSteps.push('final_invoice_sent', 'final_invoice_paid');
      }
      downstreamSteps.push('ready_for_certificate', 'certificate_issued');
      stepsToShow.push(...downstreamSteps);
    }
  }

  const normStatus = (status || 'submitted').toLowerCase().replace(/ /g, '_');
  const effectiveStatus = (normStatus === 'audit_completed') ? 'audit_successful' : normStatus;
  const currentOrderIdx = STATUS_ORDER.indexOf(effectiveStatus);
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
          const stepOrderIdx = STATUS_ORDER.indexOf(s);
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
          circleColor = '#64748b'; lineColor = '#e2e8f0'; // Muted slate/grey
          labelColor = '#334155'; bgColor = '#f8fafc'; borderColor = '#cbd5e1';
        } else if (isComplete) {
          circleColor = '#15803d'; lineColor = '#86efac';
          labelColor = '#0f172a'; bgColor = '#f0fdf4'; borderColor = '#bbf7d0';
        } else if (isCurrent) {
          circleColor = '#2563eb'; lineColor = '#cbd5e1';
          labelColor = '#0f172a'; bgColor = '#eff6ff'; borderColor = '#2563eb';
        } else {
          circleColor = '#cbd5e1'; lineColor = '#e2e8f0';
          labelColor = '#94a3b8'; bgColor = '#ffffff'; borderColor = '#e2e8f0';
        }

        const isLast = idx === stepsToShow.length - 1;


        return (
          <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
            {/* Left: circle + vertical line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: (isComplete || isCurrent || (isHoldStep && status === 'on_hold')) ? circleColor : '#f1f5f9',
                border: isCurrent ? `3px solid ${circleColor}` : `2px solid ${isComplete ? circleColor : '#e2e8f0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: isCurrent ? `0 0 0 4px rgba(37, 99, 235, 0.18)` : 'none',
                position: 'relative',
                zIndex: 1,
              }}>
                {isRejectedStep && isRejected ? (
                  <XCircle size={18} color="white" />
                ) : isHoldStep && status === 'on_hold' ? (
                  <Clock size={16} color="white" />
                ) : isComplete ? (
                  <CheckCircle size={16} color="white" strokeWidth={2.5} />
                ) : isCurrent ? (
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: 'white',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                ) : (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#cbd5e1' }} />
                )}
              </div>
              {!isLast && (
                <div style={{
                  width: 2,
                  flex: 1,
                  minHeight: 40,
                  background: isComplete ? '#86efac' : '#e2e8f0',
                  margin: '2px 0',
                }} />
              )}
            </div>

            {/* Right: content */}
            <div style={{
              marginLeft: 12,
              paddingBottom: isLast ? 0 : 24,
              flex: 1,
              paddingTop: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: isCurrent ? 800 : isComplete ? 700 : 500,
                  color: labelColor,
                }}>
                  {/* GSO-specific label: logsheet_created maps to Shari'a Board Approval */}
                  {s === 'logsheet_created' && isGSO
                    ? 'Waiting for Shari\'a Board Approval'
                    : (STATUS_LABELS[s] || s.replace(/_/g, ' '))}
                </span>
                {isCurrent && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: '#1d4ed8',
                    background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 20,
                  }}>
                    Current
                  </span>
                )}
              </div>

              {(isComplete || isCurrent) && histEntry && (
                <div style={{ marginTop: 4 }}>
                  {histEntry.changedAt && (
                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} />
                      {formatDate(histEntry.changedAt)}
                    </div>
                  )}
                  {histEntry.note && histEntry.note !== 'Application submitted by client.' && (
                    <div style={{
                      marginTop: 4, fontSize: 12, color: isRejectedStep && isRejected ? '#991b1b' : '#475569',
                      fontStyle: 'italic',
                      background: isRejectedStep && isRejected ? '#fef2f2' : '#f8fafc',
                      padding: '4px 10px', borderRadius: 6,
                      borderLeft: `3px solid ${isRejectedStep && isRejected ? '#fca5a5' : '#cbd5e1'}`,
                    }}>
                      {histEntry.note}
                    </div>
                  )}
                </div>
              )}

              {isPending && (
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Pending</div>
              )}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
