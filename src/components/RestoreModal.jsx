import React, { useState, useEffect } from 'react';
import { RotateCcw, X, AlertCircle, ArrowRight, Check } from 'lucide-react';

const LOGSHEET_OPTIONS = [
  { value: 'Waiting for Signature', label: 'Waiting for Signature', desc: 'Active logsheet awaiting reviewer/officer signatures' },
  { value: 'Waiting For Certificate', label: 'Waiting for Certificate', desc: 'All signatures gathered, awaiting certificate generation' },
  { value: 'Signed', label: 'Signed', desc: 'Fully signed logsheet' },
  { value: 'Draft', label: 'Draft', desc: 'Draft logsheet in preparation state' }
];

const APPLICATION_GROUPS = [
  {
    group: '1. Review & Proposal',
    options: [
      { value: 'submitted', label: 'Application Submitted', desc: 'New submission pending initial admin review' },
      { value: 'under_review', label: 'Under Review', desc: 'Application currently being reviewed by admin' },
      { value: 'approved', label: 'Application Accepted', desc: 'Application accepted, ready for proposal' },
      { value: 'proposal_sent', label: 'Proposal Sent', desc: 'Audit proposal sent to client' },
      { value: 'proposal_approved', label: 'Proposal Accepted', desc: 'Client accepted proposal, ready for invoice' },
    ]
  },
  {
    group: '2. Invoicing & Initial Assessment',
    options: [
      { value: 'invoice_sent', label: 'Initial Invoice Sent', desc: 'Invoice issued to client' },
      { value: 'payment_received', label: 'Initial Payment Confirmed', desc: 'Payment verified and confirmed' },
      { value: 'initial_product', label: 'Initial Product In-Progress', desc: 'Initial product review underway' },
      { value: 'initial_product_approved', label: 'Initial Product Approved', desc: 'Initial product review completed' },
    ]
  },
  {
    group: '3. Audit & Investigation',
    options: [
      { value: 'dates_proposed', label: 'Audit Dates Proposed', desc: 'Audit dates proposed to client' },
      { value: 'date_finalized', label: 'Audit Date Finalized', desc: 'Audit date scheduled and confirmed' },
      { value: 'audit_assigned', label: 'Auditor Assigned', desc: 'Auditor assigned to conduct facility inspection' },
      { value: 'audit_successful', label: 'Audit Complete', desc: 'Audit completed successfully' },
      { value: 'nc_flagged', label: 'NC Flagged', desc: 'Non-conformances identified and require action' },
      { value: 'nc_closed', label: 'NC Closed', desc: 'All non-conformances resolved and closed' },
    ]
  },
  {
    group: '4. Logsheet & Final Certification',
    options: [
      { value: 'logsheet_created', label: 'Logsheet Created', desc: 'Logsheet created and pending signatures' },
      { value: 'logsheet_signed', label: 'Logsheet Signed', desc: 'Logsheet fully signed by authorities' },
      { value: 'application_successful', label: 'Application Successful', desc: 'Application deemed successful' },
      { value: 'agreement_sent', label: 'Agreement Sent', desc: 'Certification agreement sent to client' },
      { value: 'agreement_signed', label: 'Agreement Signed', desc: 'Certification agreement signed by client' },
      { value: 'ready_for_certificate', label: 'Ready for Certificate', desc: 'All steps verified, ready to issue certificate' },
      { value: 'certificate_issued', label: 'Certificate Issued', desc: 'Halal certificate generated and issued' },
      { value: 'on_hold', label: 'On Hold', desc: 'Application placed on temporary hold' }
    ]
  }
];

const ADDON_OPTIONS = [
  { value: 'submitted', label: 'Submitted', desc: 'New add-on request awaiting review' },
  { value: 'accepted', label: 'Accepted', desc: 'Add-on application accepted' },
  { value: 'ft_assigned', label: 'Food Technologist Assigned', desc: 'Technical officer assigned to review' },
  { value: 'product_approval_form_enabled', label: 'Product Approval Form Enabled', desc: 'Client requested to submit product details' },
  { value: 'all_forms_received', label: 'All Forms Received', desc: 'Product information gathered' },
  { value: 'logsheet_created', label: 'Logsheet Created', desc: 'Logsheet generated for add-on products' },
  { value: 'waiting_sharia_signature', label: 'Waiting for Sharia Signature', desc: 'Awaiting religious committee review' },
  { value: 'product_form_approved', label: 'Product Form Approved', desc: 'Add-on products officially approved' },
  { value: 'ready_for_certificate', label: 'Ready for Certificate', desc: 'Add-on ready for updated certificate' },
  { value: 'completed', label: 'Completed', desc: 'Add-on workflow finalized' }
];

export default function RestoreModal({
  isOpen,
  onClose,
  title = '',
  itemName = '',
  itemType = 'logsheet', // 'logsheet' | 'application' | 'addon'
  defaultStatus = '',
  onConfirm
}) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute available options and fallback
  let initialValue = '';
  if (itemType === 'logsheet') {
    const valid = LOGSHEET_OPTIONS.some(o => o.value === defaultStatus);
    initialValue = valid ? defaultStatus : (defaultStatus && defaultStatus !== 'Done' && defaultStatus !== 'done' ? defaultStatus : 'Waiting for Signature');
  } else if (itemType === 'addon') {
    const valid = ADDON_OPTIONS.some(o => o.value === defaultStatus);
    initialValue = valid ? defaultStatus : (defaultStatus && defaultStatus !== 'Done' && defaultStatus !== 'done' ? defaultStatus : 'submitted');
  } else {
    // application
    const flatOptions = APPLICATION_GROUPS.flatMap(g => g.options);
    const valid = flatOptions.some(o => o.value === defaultStatus);
    initialValue = valid ? defaultStatus : (defaultStatus && defaultStatus !== 'Done' && defaultStatus !== 'done' ? defaultStatus : 'under_review');
  }

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(initialValue);
      setIsSubmitting(false);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const typeLabel = itemType === 'logsheet' 
    ? 'Logsheet' 
    : itemType === 'addon' 
      ? 'Add-on Application' 
      : 'Application';

  const modalTitle = title || `Restore ${typeLabel}`;

  const hasPreviousStatus = Boolean(
    defaultStatus && 
    defaultStatus !== 'Done' && 
    defaultStatus !== 'done'
  );

  // Find description of currently selected status
  let currentDesc = '';
  let currentLabel = selectedStatus;
  if (itemType === 'logsheet') {
    const found = LOGSHEET_OPTIONS.find(o => o.value === selectedStatus);
    if (found) {
      currentDesc = found.desc;
      currentLabel = found.label;
    }
  } else if (itemType === 'addon') {
    const found = ADDON_OPTIONS.find(o => o.value === selectedStatus);
    if (found) {
      currentDesc = found.desc;
      currentLabel = found.label;
    }
  } else {
    const flat = APPLICATION_GROUPS.flatMap(g => g.options);
    const found = flat.find(o => o.value === selectedStatus);
    if (found) {
      currentDesc = found.desc;
      currentLabel = found.label;
    }
  }

  const handleConfirm = async () => {
    if (!selectedStatus) return;
    try {
      setIsSubmitting(true);
      await onConfirm(selectedStatus);
    } catch {
      // Errors handled by caller toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 1400,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{
          maxWidth: 480,
          width: '100%',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          background: '#ffffff',
          animation: 'slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid #f1f5f9',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b45309',
                flexShrink: 0
              }}
            >
              <RotateCcw size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {modalTitle}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 2
                }}
                title={itemName}
              >
                {itemName || 'Select destination status to restore'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Quick previous status banner */}
          {hasPreviousStatus && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}
            >
              <div style={{ fontSize: 12, color: '#475569' }}>
                Previous status before Done:{' '}
                <strong style={{ color: '#0f172a' }}>{defaultStatus}</strong>
              </div>
              {selectedStatus !== defaultStatus && (
                <button
                  type="button"
                  onClick={() => setSelectedStatus(defaultStatus)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#2563eb',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 6,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Use This
                </button>
              )}
            </div>
          )}

          {/* Destination Status Selection */}
          <div>
            <label
              htmlFor="target-status-select"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: 8
              }}
            >
              Where should this be restored to?
            </label>

            <div style={{ position: 'relative' }}>
              <select
                id="target-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  width: '100%',
                  height: 44,
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
              >
                {itemType === 'logsheet' &&
                  LOGSHEET_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}

                {itemType === 'addon' &&
                  ADDON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}

                {itemType === 'application' &&
                  APPLICATION_GROUPS.map((grp) => (
                    <optgroup key={grp.group} label={grp.group}>
                      {grp.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
              </select>
            </div>

            {/* Target Status Detail Preview */}
            {currentDesc && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <ArrowRight size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <span>
                  Will restore to <strong style={{ color: '#0f172a' }}>"{currentLabel}"</strong>: {currentDesc}
                </span>
              </div>
            )}
          </div>

          {/* Informative notice */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#fefce8',
              border: '1px solid #fef08a',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8
            }}
          >
            <AlertCircle size={15} style={{ color: '#a16207', marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 11.5, color: '#854d0e', lineHeight: 1.45 }}>
              This record will be un-archived from Completed/Done and reactivated in the system under the selected stage.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 22px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedStatus}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: '1px solid #d97706',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? (
              <span>Restoring...</span>
            ) : (
              <>
                <RotateCcw size={14} /> Restore Record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
