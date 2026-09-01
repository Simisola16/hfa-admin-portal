import React from 'react';
import {
  CheckCircle, Circle, XCircle, Clock, ChevronRight,
  Plus, ArrowRight, Package, FileText, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_ORDER, STATUS_LABELS } from '../lib/applicationStatuses';

/**
 * ProcessingTimeline — Reusable vertical stepper component.
 *
 * Props:
 *   status        (string)  — current application status
 *   statusHistory (array)   — [{ status, changedAt, changedBy, note }]
 *   category      (string)  — application category
 *   applicationType (string) — standard / renewal / surveillance
 *   initialProduct (object) — initial product record if loaded
 *   appId         (string)  — application _id
 */
export default function ProcessingTimeline({
  status,
  statusHistory = [],
  category = '',
  applicationType = '',
  initialProduct = null,
  appId = null
}) {
  const navigate = useNavigate();
  const isRejected = status === 'rejected';
  const isSurveillance = (applicationType || '').toLowerCase() === 'surveillance';
  const isRenewal = (applicationType || '').toLowerCase() === 'renewal' || isSurveillance;
  const isGSO = category === 'UAE/GSO Approved Halal Certification For Exporters To UAE' || isSurveillance;
  const isInitialProductApproved = Boolean(initialProduct && (initialProduct.status === 'initial_product_approved' || initialProduct.status === 'approved'));

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

  // If application is not rejected, we can show subsequent stages
  if (!appRejectedInHistory) {
    if (isRenewal) {
      // Renewal & GSO Surveillance Flow:
      // Direct to Audit Scheduling after Application Accepted (No Proposal, No Pre-Audit Invoice, No Agreement)
      stepsToShow.push(
        'dates_proposed',
        'dates_accepted',
        'date_finalized',
        'audit_assigned',
        'audit_successful'
      );

      // After Audit Complete: Flag NC (if active/in history) and NC Closed
      const isNcFlagged = status === 'nc_flagged' || statusHistory.some(h => h.status === 'nc_flagged');
      if (isNcFlagged) {
        stepsToShow.push('nc_flagged');
      }

      const isNcClosedOrBeyond = status === 'nc_closed' || status === 'audit_report_submitted' || STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf('nc_closed');
      if (isNcClosedOrBeyond || isNcFlagged) {
        stepsToShow.push('nc_closed');
      }

      // Downstream renewal/surveillance steps (Invoice -> Payment -> Logsheet -> Application Successful -> Certificate / Letter)
      if (status !== 'on_hold') {
        stepsToShow.push(
          'invoice_sent',
          'payment_received',
          'logsheet_created',
          'logsheet_signed',
          'application_successful',
          'certificate_issued'
        );
      }
    } else {
      // Non-Renewal (Initial) flow:
      stepsToShow.push('proposal_sent');

      const proposalApprovedInHistory = status === 'proposal_approved' || STATUS_ORDER.indexOf(status) > STATUS_ORDER.indexOf('proposal_approved');

      if (status === 'proposal_rejected') {
        stepsToShow.push('proposal_rejected');
      } else if (proposalApprovedInHistory) {
        stepsToShow.push('proposal_approved');
      } else {
        stepsToShow.push('proposal_approved');
      }

      // Rest of the flow with Initial Product Step
      const restFlow = [
        'invoice_sent',
        'payment_received',
        'initial_product',
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
          'final_invoice_sent',
          'final_invoice_paid',
          'ready_for_certificate',
          'certificate_issued'
        ];
        stepsToShow.push(...downstreamSteps);
      }
    }
  }

  const getStepLabel = (stepKey) => {
    if (isSurveillance) {
      if (stepKey === 'submitted') return 'Surveillance Application Submitted';
      if (stepKey === 'approved') return 'Surveillance Application Accepted';
      if (stepKey === 'invoice_sent') return 'Surveillance Invoice Sent';
      if (stepKey === 'payment_received') return 'Surveillance Payment Received';
      if (stepKey === 'ready_for_certificate' || stepKey === 'application_successful') return 'Application Successful';
      if (stepKey === 'certificate_issued') return 'Surveillance Letter Issued';
    }
    if (isRenewal) {
      if (stepKey === 'submitted') return 'Renewal Application Submitted';
      if (stepKey === 'approved') return 'Renewal Application Accepted';
      if (stepKey === 'invoice_sent') return 'Renewal Invoice Sent';
      if (stepKey === 'payment_received') return 'Renewal Payment Received';
      if (stepKey === 'ready_for_certificate' || stepKey === 'application_successful') return 'Application Successful';
      if (stepKey === 'certificate_issued') return 'Certificate Issued';
    }
    if (stepKey === 'initial_product') {
      return isInitialProductApproved ? 'Initial Product Approved' : 'Initial Product In Progress';
    }
    return STATUS_LABELS[stepKey] || stepKey.replace(/_/g, ' ');
  };

  const normStatus = (status || 'submitted').toLowerCase().replace(/ /g, '_');
  let effectiveStatus = normStatus;
  if (normStatus === 'audit_completed') effectiveStatus = 'audit_successful';
  if (normStatus === 'dates_rejected') effectiveStatus = 'dates_proposed';
  if (normStatus === 'audit_report_submitted') effectiveStatus = 'nc_closed';

  // When status is payment_received in standard flow:
  // If initial product is not yet approved, advance the active timeline step to 'initial_product'
  if (!isRenewal && normStatus === 'payment_received') {
    if (!isInitialProductApproved) {
      effectiveStatus = 'initial_product';
    } else {
      effectiveStatus = 'dates_proposed';
    }
  }

  // Helper to map status to step index in stepsToShow
  const getStepIndex = (st) => {
    let s = (st || '').toLowerCase().replace(/ /g, '_');
    if (s === 'audit_completed') s = 'audit_successful';
    if (s === 'dates_rejected') s = 'dates_proposed';
    if (s === 'audit_report_submitted') s = 'nc_closed';
    if (isRenewal || isSurveillance) {
      if (s === 'ready_for_certificate' && stepsToShow.includes('application_successful') && !stepsToShow.includes('ready_for_certificate')) s = 'application_successful';
      if (s === 'application_successful' && stepsToShow.includes('ready_for_certificate') && !stepsToShow.includes('application_successful')) s = 'ready_for_certificate';
    }
    return stepsToShow.indexOf(s);
  };

  let currentIndex = getStepIndex(effectiveStatus);
  const currentOrderIdx = STATUS_ORDER.indexOf(effectiveStatus);

  // Fallback if status is not in stepsToShow: find nearest preceding step in STATUS_ORDER
  if (currentIndex === -1) {
    if (currentOrderIdx !== -1) {
      for (let i = stepsToShow.length - 1; i >= 0; i--) {
        const stepOrder = STATUS_ORDER.indexOf(stepsToShow[i]);
        if (stepOrder !== -1 && stepOrder <= currentOrderIdx) {
          currentIndex = i;
          break;
        }
      }
    }
  }

  const isCompletedFinal = effectiveStatus === 'certificate_issued' || normStatus === 'certificate_issued' || (statusHistory || []).some(h => (h.status || '').toLowerCase().replace(/ /g, '_') === 'certificate_issued');

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
        let histEntry = historyMap[s] ||
          (s === 'dates_proposed' ? (historyMap['dates_rejected'] || historyMap['dates_proposed']) : null) ||
          (s === 'audit_successful' ? (historyMap['audit_completed'] || historyMap['audit_successful']) : null) ||
          (s === 'nc_closed' ? (historyMap['nc_closed'] || historyMap['audit_report_submitted']) : null);

        let isComplete = false;
        let isCurrent = false;
        let isPending = false;

        if (isCompletedFinal) {
          isComplete = true;
          isCurrent = false;
          isPending = false;
        } else if (s === 'payment_received' && !isRenewal) {
          // In standard flow: Initial Payment Received is marked complete once admin confirms payment
          const hasPaymentReceived = normStatus === 'payment_received' || Boolean(historyMap['payment_received']) || (currentOrderIdx >= STATUS_ORDER.indexOf('payment_received'));
          if (hasPaymentReceived) {
            isComplete = true;
            isCurrent = false;
            isPending = false;
          } else if (currentIndex === idx) {
            isCurrent = true;
          } else if (currentIndex < idx) {
            isPending = true;
          }
        } else if (s === 'initial_product') {
          const hasPassedPayment = normStatus === 'payment_received' || Boolean(historyMap['payment_received']) || (currentOrderIdx >= STATUS_ORDER.indexOf('payment_received'));
          const hasPassedInitialProduct = currentOrderIdx > STATUS_ORDER.indexOf('initial_product') && normStatus !== 'payment_received';

          if (hasPassedInitialProduct || isInitialProductApproved) {
            isComplete = true;
            isCurrent = false;
            isPending = false;
          } else if (hasPassedPayment) {
            isCurrent = true;
            isComplete = false;
            isPending = false;
          } else {
            isPending = true;
            isComplete = false;
            isCurrent = false;
          }

          if (initialProduct) {
            histEntry = {
              changedAt: initialProduct.updated_at || initialProduct.created_at,
              note: isComplete ? 'Initial product specifications approved by HFA.' : (initialProduct.status === 'product_approval_form_enabled' ? 'Product Approval Form enabled. Awaiting client submission.' : `Initial Product "${initialProduct.product?.name}" submitted.`)
            };
          }
        } else if (currentIndex !== -1) {
          isComplete = currentIndex > idx;
          isCurrent = currentIndex === idx;
          isPending = currentIndex < idx;
        } else {
          const stepOrderIdx = STATUS_ORDER.indexOf(s);
          if (currentOrderIdx !== -1 && stepOrderIdx !== -1) {
            if (stepOrderIdx < currentOrderIdx) {
              isComplete = true;
            } else if (stepOrderIdx === currentOrderIdx) {
              isCurrent = true;
            } else {
              isPending = true;
            }
          } else {
            isComplete = Boolean(historyMap[s]);
            isPending = !isComplete;
          }
        }

        const isRejectedStep = s === 'rejected' || s === 'proposal_rejected';
        const isDatesRejectedStep = normStatus === 'dates_rejected' && s === 'dates_proposed';
        const isHoldStep = s === 'on_hold';

        let circleColor, lineColor, labelColor, bgColor, borderColor;

        if (isRejectedStep && (status === s || (s === 'proposal_rejected' && status === 'proposal_rejected'))) {
          circleColor = '#dc2626'; lineColor = '#fecaca';
          labelColor = '#991b1b'; bgColor = '#fef2f2'; borderColor = '#fecaca';
        } else if (isDatesRejectedStep) {
          circleColor = '#dc2626'; lineColor = '#fecaca';
          labelColor = '#991b1b'; bgColor = '#fef2f2'; borderColor = '#fecaca';
        } else if (isHoldStep && status === 'on_hold') {
          circleColor = '#64748b'; lineColor = '#e2e8f0';
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
                boxShadow: isCurrent ? `0 0 0 4px ${isDatesRejectedStep ? 'rgba(220, 38, 38, 0.18)' : 'rgba(37, 99, 235, 0.18)'}` : 'none',
                position: 'relative',
                zIndex: 1,
              }}>
                {isRejectedStep && isRejected ? (
                  <XCircle size={18} color="white" />
                ) : isDatesRejectedStep ? (
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
                  {isDatesRejectedStep
                    ? 'Audit Dates Rejected'
                    : (s === 'logsheet_created' && isGSO
                      ? 'Waiting for Shari\'a Board Approval'
                      : getStepLabel(s))}
                </span>
                {isCurrent && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: isDatesRejectedStep ? '#dc2626' : '#1d4ed8',
                    background: isDatesRejectedStep ? '#fef2f2' : '#eff6ff',
                    border: `1px solid ${isDatesRejectedStep ? '#fca5a5' : '#bfdbfe'}`,
                    padding: '2px 8px', borderRadius: 20,
                  }}>
                    {isDatesRejectedStep ? 'Dates Rejected' : 'Current'}
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

              {/* ── Initial Product Information / Admin Actions in Timeline ── */}
              {s === 'initial_product' && (isCurrent || isComplete) && (
                <div style={{ marginTop: 6 }}>
                  {!initialProduct ? (
                    <div style={{
                      fontSize: 11.5,
                      color: '#b45309',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: 6,
                      padding: '6px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontWeight: 600
                    }}>
                      <Clock size={12} /> Awaiting client to add &amp; submit Initial Product
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        fontSize: 11.5,
                        color: isComplete ? '#15803d' : '#334155',
                        background: isComplete ? '#f0fdf4' : '#f8fafc',
                        border: `1px solid ${isComplete ? '#bbf7d0' : '#e2e8f0'}`,
                        borderRadius: 6,
                        padding: '6px 10px',
                        marginBottom: 6
                      }}>
                        <div style={{ fontWeight: 700 }}>
                          {isComplete ? '✓ Initial Product Approved' : `Product: "${initialProduct.product?.name || 'Initial Product'}"`}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, textTransform: 'capitalize' }}>
                          Status: {(initialProduct.status || '').replace(/_/g, ' ')}
                        </div>
                      </div>
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
