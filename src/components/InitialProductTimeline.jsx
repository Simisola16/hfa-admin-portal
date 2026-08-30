import React from 'react';
import { Check, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export const INITIAL_PRODUCT_STAGES = [
  { id: 'ft_assigned', label: 'Assign FT' },
  { id: 'product_approval_form_enabled', label: 'Product Form Enabled' },
  { id: 'all_forms_received', label: 'Product Form Received' },
  { id: 'logsheet_created', label: 'Create Logsheet' },
  { id: 'waiting_sharia_signature', label: 'Committee Signature' },
  { id: 'initial_product_approved', label: 'Product Approved' }
];

export const INITIAL_PRODUCT_ORDER = [
  'submitted',
  'ft_assigned',
  'product_approval_form_enabled',
  'all_forms_received',
  'logsheet_created',
  'waiting_sharia_signature',
  'initial_product_approved'
];

/**
 * Format date like "24 Aug 2026, 15:36"
 */
const formatDate = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  const day = d.getDate();
  const month = d.toLocaleString('en-GB', { month: 'short' });
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

export default function InitialProductTimeline({ status = 'submitted', statusHistory = [], app = null }) {
  const normStatus = (status || 'submitted').toLowerCase().trim();
  const isApproved = normStatus === 'initial_product_approved';

  // Build a lookup map of history entries by status
  const historyMap = {};
  (statusHistory || []).forEach(h => {
    if (h && h.status && !historyMap[h.status]) {
      historyMap[h.status] = h;
    }
  });

  // Calculate current stage index in INITIAL_PRODUCT_ORDER
  const currentOrderIdx = INITIAL_PRODUCT_ORDER.indexOf(normStatus);

  // Helper to check if a stage is complete, current, or pending
  const getStageState = (stageId) => {
    const stageOrderIdx = INITIAL_PRODUCT_ORDER.indexOf(stageId);

    if (isApproved) {
      return { isComplete: true, isCurrent: false, isPending: false };
    }

    // Special case for 'submitted': 'ft_assigned' is active/current next step
    if (normStatus === 'submitted') {
      if (stageId === 'ft_assigned') {
        return { isComplete: false, isCurrent: true, isPending: false };
      }
      return { isComplete: false, isCurrent: false, isPending: true };
    }

    if (stageOrderIdx < currentOrderIdx) {
      return { isComplete: true, isCurrent: false, isPending: false };
    }
    if (stageOrderIdx === currentOrderIdx) {
      return { isComplete: false, isCurrent: true, isPending: false };
    }
    return { isComplete: false, isCurrent: false, isPending: true };
  };

  // Helper to retrieve fallback timestamp for a stage
  const getStageTimestamp = (stageId) => {
    const histEntry = historyMap[stageId];
    if (histEntry?.changedAt) return formatDate(histEntry.changedAt);

    if (stageId === 'ft_assigned') {
      if (app?.assigned_food_tech || app?.assigned_food_techs?.length > 0 || app?.assigned_ft_custom?.name || app?.assigned_ft_details) {
        return formatDate(app?.updatedAt || app?.createdAt);
      }
    }
    if (stageId === 'product_approval_form_enabled') {
      if (app?.product_approval_form?.sent_at) return formatDate(app.product_approval_form.sent_at);
    }
    if (stageId === 'all_forms_received') {
      if (app?.product_approval_form?.submitted_at) return formatDate(app.product_approval_form.submitted_at);
    }
    if (stageId === 'logsheet_created') {
      if (app?.logsheet_id?.created_at) return formatDate(app.logsheet_id.created_at);
    }
    if (stageId === 'initial_product_approved' && isApproved) {
      return formatDate(app?.updatedAt || new Date());
    }
    return null;
  };

  // Helper to retrieve note text for a stage
  const getStageNote = (stageId, isComplete, isCurrent) => {
    const histEntry = historyMap[stageId];
    if (histEntry?.note) return histEntry.note;

    if (!isComplete && !isCurrent) return null;

    if (stageId === 'ft_assigned' && (isComplete || isCurrent)) {
      const ftName = [
        ...(app?.assigned_food_techs || []).map(f => f.full_name || f.name),
        app?.assigned_food_tech?.full_name || app?.assigned_food_tech?.name,
        app?.assigned_ft_custom?.name || app?.assigned_ft_details
      ].filter(Boolean)[0] || 'Assigned Specialist';
      return `FT assigned: ${ftName}`;
    }

    if (stageId === 'product_approval_form_enabled' && (isComplete || isCurrent)) {
      return 'Request for Product Approval Form sent to client.';
    }

    if (stageId === 'all_forms_received' && (isComplete || isCurrent)) {
      return 'Product Approval Form responses confirmed and marked as received by HFA admin.';
    }

    if (stageId === 'logsheet_created' && (isComplete || isCurrent)) {
      return 'Logsheet created. Awaiting Shari\'a Board signatures.';
    }

    if (stageId === 'waiting_sharia_signature') {
      // In reference design, Committee Signature has no sub-card when clean
      return null;
    }

    if (stageId === 'initial_product_approved' && isComplete) {
      return 'Committee signatures verified (4/4). 1 product(s) approved.';
    }

    return null;
  };

  return (
    <div style={{ padding: '8px 0', fontFamily: 'inherit' }}>
      {INITIAL_PRODUCT_STAGES.map((stage, idx) => {
        const { isComplete, isCurrent, isPending } = getStageState(stage.id);
        const timestamp = getStageTimestamp(stage.id);
        const note = getStageNote(stage.id, isComplete, isCurrent);
        const isLast = idx === INITIAL_PRODUCT_STAGES.length - 1;

        // Visual Colors matching screenshot
        const circleBg = isComplete ? '#15803d' : isCurrent ? '#2563eb' : '#f1f5f9';
        const circleBorder = isComplete ? '#15803d' : isCurrent ? '#2563eb' : '#e2e8f0';
        const lineColor = isComplete ? '#86efac' : '#e2e8f0';
        const titleColor = isComplete || isCurrent ? '#0f172a' : '#94a3b8';

        return (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 0, position: 'relative' }}>
            {/* Left: Circle + Vertical Connector Line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 34, flexShrink: 0 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: circleBg,
                  border: isCurrent ? '3px solid #2563eb' : `2px solid ${circleBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                  boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.18)' : isComplete ? '0 2px 6px rgba(21, 128, 61, 0.2)' : 'none',
                  zIndex: 2,
                  transition: 'all 0.25s ease'
                }}
              >
                {isComplete ? (
                  <Check size={16} strokeWidth={3} color="#ffffff" />
                ) : isCurrent ? (
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#ffffff',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}
                  />
                ) : (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />
                )}
              </div>

              {!isLast && (
                <div
                  style={{
                    width: 2.5,
                    flex: 1,
                    minHeight: note ? 54 : 36,
                    background: lineColor,
                    margin: '3px 0',
                    transition: 'background 0.3s ease'
                  }}
                />
              )}
            </div>

            {/* Right: Stage Content */}
            <div
              style={{
                marginLeft: 14,
                paddingBottom: isLast ? 0 : 20,
                flex: 1,
                paddingTop: 3
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 14.5,
                    fontWeight: isCurrent ? 900 : isComplete ? 800 : 600,
                    color: titleColor,
                    letterSpacing: '-0.01em'
                  }}
                >
                  {stage.label}
                </span>

                {isCurrent && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#1d4ed8',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      padding: '2px 8px',
                      borderRadius: 20
                    }}
                  >
                    Current
                  </span>
                )}
              </div>

              {/* Timestamp with Clock Icon */}
              {(isComplete || (isCurrent && timestamp)) && timestamp && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 4,
                    fontWeight: 500
                  }}
                >
                  <Clock size={12.5} style={{ color: '#64748b' }} />
                  <span>{timestamp}</span>
                </div>
              )}

              {/* Note / Detail Bubble (Light grey card with italicized note) */}
              {(isComplete || isCurrent) && note && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12.5,
                    color: '#334155',
                    fontStyle: 'italic',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    padding: '8px 14px',
                    borderRadius: 8,
                    lineHeight: 1.45,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  {note}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </div>
  );
}
