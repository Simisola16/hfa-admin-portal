/**
 * applicationStatuses.js
 * Single source of truth for application status ordering, labels, and badge colours.
 * Used by ProcessingTimeline, ApplicationsPage (client), AdminApplications, ApplicationProcessing.
 * Phases 5–9 extend this file only — no other changes needed.
 */

export const STATUS_ORDER = [
  'submitted',
  'under_review',
  'rejected',
  'approved',
  'proposal_sent',
  'proposal_rejected',
  'proposal_approved',
  'invoice_sent',
  'payment_received',
  'initial_product',
  'initial_product_approved',
  'dates_proposed',
  'dates_rejected',
  'dates_accepted',
  'date_finalized',
  'audit_assigned',
  'audit_successful',
  'audit_completed',
  'nc_flagged',
  'nc_closed',
  'audit_report_submitted',
  'on_hold',
  'logsheet_created',
  'logsheet_signed',
  'application_successful',
  'agreement_sent',
  'agreement_signed',
  'agreement_finalised',
  'final_invoice_sent',
  'final_invoice_paid',
  'ready_for_certificate',
  'certificate_issued',
];

export const STATUS_LABELS = {
  submitted: 'Application Submitted',
  under_review: 'Under Review',
  rejected: 'Application Rejected',
  approved: 'Application Accepted',
  proposal_sent: 'Proposal Sent',
  proposal_rejected: 'Proposal Rejected',
  proposal_approved: 'Proposal Accepted',
  invoice_sent: 'Initial Invoice Sent',
  payment_received: 'Initial Payment Confirmed',
  initial_product: 'Initial Product In-Progress',
  initial_product_approved: 'Initial Product Approved',
  dates_proposed: 'Audit Dates Proposed',
  dates_rejected: 'Audit Dates Rejected',
  dates_accepted: 'Audit Dates Accepted',
  date_finalized: 'Audit Date Finalized',
  audit_assigned: 'Auditor Assigned',
  nc_flagged: 'NC Flagged',
  nc_closed: 'NC Closed',
  audit_report_submitted: 'NC Closed',
  on_hold: 'On Hold',
  audit_successful: 'Audit Complete',
  audit_completed: 'Audit Complete',
  logsheet_created: 'Logsheet Created',
  logsheet_signed: 'Logsheet Signed',
  application_successful: 'Application Successful',
  agreement_sent: 'Agreement Sent',
  agreement_signed: 'Agreement Signed',
  agreement_finalised: 'Final Agreement Sent',
  final_invoice_sent: 'Final Certification Invoice Sent',
  final_invoice_paid: 'Final Certification Fee Paid',
  ready_for_certificate: 'Ready for Certificate',
  certificate_issued: 'Certificate Issued',
  done: 'Done',
};

export const STATUS_BADGE = {
  submitted: 'badge-blue',
  under_review: 'badge-yellow',
  rejected: 'badge-red',
  approved: 'badge-green',
  proposal_sent: 'badge-purple',
  proposal_rejected: 'badge-red',
  proposal_approved: 'badge-green',
  invoice_sent: 'badge-purple',
  payment_received: 'badge-blue',
  initial_product: 'badge-blue',
  initial_product_approved: 'badge-green',
  dates_proposed: 'badge-blue',
  dates_rejected: 'badge-red',
  dates_accepted: 'badge-green',
  date_finalized: 'badge-green',
  audit_assigned: 'badge-purple',
  nc_flagged: 'badge-red',
  nc_closed: 'badge-green',
  audit_report_submitted: 'badge-green',
  on_hold: 'badge-yellow',
  audit_successful: 'badge-green',
  audit_completed: 'badge-green',
  logsheet_created: 'badge-yellow',
  logsheet_signed: 'badge-green',
  application_successful: 'badge-green',
  agreement_sent: 'badge-purple',
  agreement_signed: 'badge-green',
  agreement_finalised: 'badge-green',
  final_invoice_sent: 'badge-purple',
  final_invoice_paid: 'badge-green',
  ready_for_certificate: 'badge-purple',
  certificate_issued: 'badge-green',
  done: 'badge-green',
};

/**
 * Stages that are considered "terminal" — the application is done.
 * After any of these, the client can submit a new application.
 */
export const TERMINAL_STATUSES = ['rejected', 'certificate_issued', 'done'];

/**
 * Workflow-Specific Status Orders
 */
export const HFA_NEW_STATUS_ORDER = [
  'submitted',
  'under_review',
  'rejected',
  'approved',
  'proposal_sent',
  'proposal_rejected',
  'proposal_approved',
  'invoice_sent',
  'payment_received',
  'initial_product',
  'initial_product_approved',
  'dates_proposed',
  'dates_rejected',
  'dates_accepted',
  'date_finalized',
  'audit_assigned',
  'audit_completed',
  'audit_successful',
  'nc_flagged',
  'nc_closed',
  'audit_report_submitted',
  'on_hold',
  'logsheet_created',
  'logsheet_signed',
  'application_successful',
  'agreement_sent',
  'agreement_signed',
  'agreement_finalised',
  'final_invoice_sent',
  'final_invoice_paid',
  'ready_for_certificate',
  'certificate_issued',
  'done',
];

export const GSO_NEW_STATUS_ORDER = [
  'submitted',
  'under_review',
  'rejected',
  'approved',
  'proposal_sent',
  'proposal_rejected',
  'proposal_approved',
  'invoice_sent',
  'payment_received',
  'initial_product',
  'initial_product_approved',
  'dates_proposed',
  'dates_rejected',
  'dates_accepted',
  'date_finalized',
  'audit_assigned',
  'audit_completed',
  'audit_successful',
  'nc_flagged',
  'nc_closed',
  'audit_report_submitted',
  'on_hold',
  'logsheet_created',
  'logsheet_signed',
  'application_successful',
  'agreement_sent',
  'agreement_signed',
  'agreement_finalised',
  'final_invoice_sent',
  'final_invoice_paid',
  'ready_for_certificate',
  'certificate_issued',
  'done',
];

export const HFA_RENEWAL_STATUS_ORDER = [
  'submitted',
  'under_review',
  'rejected',
  'approved',
  'dates_proposed',
  'dates_rejected',
  'dates_accepted',
  'date_finalized',
  'audit_assigned',
  'audit_completed',
  'audit_successful',
  'nc_flagged',
  'nc_closed',
  'audit_report_submitted',
  'on_hold',
  'logsheet_created',
  'logsheet_signed',
  'application_successful',
  'invoice_sent',
  'payment_received',
  'ready_for_certificate',
  'certificate_issued',
  'done',
];

export const GSO_RENEWAL_STATUS_ORDER = [
  'submitted',
  'under_review',
  'rejected',
  'approved',
  'dates_proposed',
  'dates_rejected',
  'dates_accepted',
  'date_finalized',
  'audit_assigned',
  'audit_completed',
  'audit_successful',
  'nc_flagged',
  'nc_closed',
  'audit_report_submitted',
  'on_hold',
  'logsheet_created',
  'logsheet_signed',
  'application_successful',
  'invoice_sent',
  'payment_received',
  'ready_for_certificate',
  'certificate_issued',
  'done',
];

export const GSO_SURVEILLANCE_STATUS_ORDER = [
  'submitted',
  'under_review',
  'rejected',
  'approved',
  'dates_proposed',
  'dates_rejected',
  'dates_accepted',
  'date_finalized',
  'audit_assigned',
  'audit_completed',
  'audit_successful',
  'nc_flagged',
  'nc_closed',
  'audit_report_submitted',
  'on_hold',
  'logsheet_created',
  'logsheet_signed',
  'application_successful',
  'invoice_sent',
  'payment_received',
  'ready_for_certificate',
  'certificate_issued',
  'done',
];

export const HFA_NEW_STATUS_LABELS = {
  ...STATUS_LABELS,
};

export const GSO_NEW_STATUS_LABELS = {
  ...STATUS_LABELS,
  dates_proposed: 'Stage 1/2 Audit Dates Proposed',
  dates_accepted: 'Stage 1/2 Audit Dates Accepted',
  date_finalized: 'Stage 1/2 Audit Date Finalized',
  audit_assigned: 'Stage 1/2 Auditor Assigned',
  audit_successful: 'Stage 1/2 Audit Complete',
  audit_completed: 'Stage 1/2 Audit Complete',
};

export const HFA_RENEWAL_STATUS_LABELS = {
  ...STATUS_LABELS,
  submitted: 'Renewal Application Submitted',
  approved: 'Renewal Application Accepted',
  dates_proposed: 'Renewal Audit Dates Proposed',
  dates_rejected: 'Renewal Audit Dates Rejected',
  dates_accepted: 'Renewal Audit Dates Accepted',
  date_finalized: 'Renewal Audit Date Finalized',
  audit_assigned: 'Renewal Auditor Assigned',
  audit_successful: 'Renewal Audit Complete',
  audit_completed: 'Renewal Audit Complete',
  logsheet_created: 'Renewal Logsheet Created',
  logsheet_signed: 'Renewal Logsheet Signed',
  application_successful: 'Application Successful',
  invoice_sent: 'Renewal Invoice Sent',
  payment_received: 'Renewal Fee Paid',
  ready_for_certificate: 'Ready for Certificate',
  certificate_issued: 'Certificate Issued',
  done: 'Application Completed',
};

export const GSO_RENEWAL_STATUS_LABELS = {
  ...STATUS_LABELS,
  submitted: 'Renewal Application Submitted',
  approved: 'Renewal Application Accepted',
  dates_proposed: 'Stage 1/2 Audit Dates Proposed',
  dates_rejected: 'Stage 1/2 Audit Dates Rejected',
  dates_accepted: 'Stage 1/2 Audit Dates Accepted',
  date_finalized: 'Stage 1/2 Audit Date Finalized',
  audit_assigned: 'Stage 1/2 Auditor Assigned',
  audit_successful: 'Stage 1/2 Audit Complete',
  audit_completed: 'Stage 1/2 Audit Complete',
  logsheet_created: 'Renewal Logsheet Created',
  logsheet_signed: 'Renewal Logsheet Signed',
  application_successful: 'Application Successful',
  invoice_sent: 'Renewal Invoice Sent',
  payment_received: 'Renewal Fee Paid',
  ready_for_certificate: 'Ready for Certificate',
  certificate_issued: 'Certificate Issued',
  done: 'Application Completed',
};

export const GSO_SURVEILLANCE_STATUS_LABELS = {
  ...STATUS_LABELS,
  submitted: 'Surveillance Application Submitted',
  approved: 'Surveillance Application Accepted',
  dates_proposed: 'Surveillance Audit Dates Proposed',
  dates_rejected: 'Surveillance Audit Dates Rejected',
  dates_accepted: 'Surveillance Audit Dates Accepted',
  date_finalized: 'Surveillance Audit Date Finalized',
  audit_assigned: 'Surveillance Auditor Assigned',
  audit_successful: 'Surveillance Audit Complete',
  audit_completed: 'Surveillance Audit Complete',
  logsheet_created: 'Surveillance Logsheet Created',
  logsheet_signed: 'Surveillance Logsheet Signed',
  application_successful: 'Application Successful',
  invoice_sent: 'Surveillance Invoice Sent',
  payment_received: 'Surveillance Payment Received',
  ready_for_certificate: 'Ready for Surveillance Letter',
  certificate_issued: 'Surveillance Letter Issued',
  done: 'Application Completed',
};

/**
 * Detects whether an application is HFA New, HFA Renewal, GSO New, GSO Renewal, or GSO Surveillance.
 * Returns workflow metadata, valid statuses, and tailored display labels.
 */
export function getApplicationWorkflowInfo(app) {
  if (!app) {
    return {
      workflowType: 'hfa_new',
      workflowName: 'HFA Initial Certification',
      badgeColor: '#16a34a',
      badgeBg: '#f0fdf4',
      badgeBorder: '#bbf7d0',
      isRenewal: false,
      isSurveillance: false,
      isGSO: false,
      isNew: true,
      statuses: [...HFA_NEW_STATUS_ORDER],
      labels: { ...HFA_NEW_STATUS_LABELS }
    };
  }

  const isRenewal = Boolean(
    String(app.application_type || '').toLowerCase().includes('renewal') ||
    String(app.type || '').toLowerCase().includes('renewal') ||
    Boolean(app.is_renewal) ||
    Boolean(app.renewed_certificate_id) ||
    String(app.application_number || '').includes('-RE-') ||
    String(app.category || '').toLowerCase().includes('renewal')
  );

  const isSurveillance = Boolean(
    String(app.application_type || '').toLowerCase().includes('surveillance') ||
    String(app.type || '').toLowerCase().includes('surveillance') ||
    Boolean(app.is_surveillance) ||
    String(app.application_number || '').includes('-SU-') ||
    String(app.category || '').toLowerCase().includes('surveillance')
  );

  const catLower = String(app.category || '').toLowerCase();
  const typeLower = String(app.application_type || '').toLowerCase();
  const schemeLower = String(app.scheme || '').toLowerCase();
  const isGSO = Boolean(
    catLower.includes('gso') ||
    catLower.includes('uae') ||
    catLower.includes('dual') ||
    typeLower.includes('gso') ||
    schemeLower.includes('gso') ||
    isSurveillance
  );

  if (isSurveillance) {
    return {
      workflowType: 'gso_surveillance',
      workflowName: 'UAE/GSO Halal Surveillance',
      badgeColor: '#0284c7',
      badgeBg: '#f0f9ff',
      badgeBorder: '#bae6fd',
      isRenewal: false,
      isSurveillance: true,
      isGSO: true,
      isNew: false,
      statuses: [...GSO_SURVEILLANCE_STATUS_ORDER],
      labels: { ...GSO_SURVEILLANCE_STATUS_LABELS }
    };
  }

  if (isGSO && isRenewal) {
    return {
      workflowType: 'gso_renewal',
      workflowName: 'UAE/GSO Halal Renewal',
      badgeColor: '#0d9488',
      badgeBg: '#f0fdfa',
      badgeBorder: '#99f6e4',
      isRenewal: true,
      isSurveillance: false,
      isGSO: true,
      isNew: false,
      statuses: [...GSO_RENEWAL_STATUS_ORDER],
      labels: { ...GSO_RENEWAL_STATUS_LABELS }
    };
  }

  if (isGSO && !isRenewal) {
    return {
      workflowType: 'gso_new',
      workflowName: 'UAE/GSO Initial Certification',
      badgeColor: '#7c3aed',
      badgeBg: '#faf5ff',
      badgeBorder: '#ddd6fe',
      isRenewal: false,
      isSurveillance: false,
      isGSO: true,
      isNew: true,
      statuses: [...GSO_NEW_STATUS_ORDER],
      labels: { ...GSO_NEW_STATUS_LABELS }
    };
  }

  if (!isGSO && isRenewal) {
    return {
      workflowType: 'hfa_renewal',
      workflowName: 'HFA Halal Renewal (Fast-Track)',
      badgeColor: '#2563eb',
      badgeBg: '#eff6ff',
      badgeBorder: '#bfdbfe',
      isRenewal: true,
      isSurveillance: false,
      isGSO: false,
      isNew: false,
      statuses: [...HFA_RENEWAL_STATUS_ORDER],
      labels: { ...HFA_RENEWAL_STATUS_LABELS }
    };
  }

  // Default: HFA New Initial Certification
  return {
    workflowType: 'hfa_new',
    workflowName: 'HFA Initial Certification',
    badgeColor: '#16a34a',
    badgeBg: '#f0fdf4',
    badgeBorder: '#bbf7d0',
    isRenewal: false,
    isSurveillance: false,
    isGSO: false,
    isNew: true,
    statuses: [...HFA_NEW_STATUS_ORDER],
    labels: { ...HFA_NEW_STATUS_LABELS }
  };
}

/**
 * Helper to determine the effective display status of an application.
 * For New applications with initial payment confirmed, resolves to 'initial_product' (Initial Product In-Progress).
 */
export function getEffectiveApplicationStatus(app) {
  if (!app) return 'submitted';
  const rawStatus = typeof app === 'string' ? app : (app.status || 'submitted');
  const s = rawStatus.toLowerCase().replace(/ /g, '_');
  const type = (typeof app === 'object' ? (app.application_type || '') : '').toLowerCase();
  const isRenewal = type === 'renewal' || type === 'surveillance';

  if (s === 'payment_received' && !isRenewal) {
    return 'initial_product';
  }
  return s;
}


