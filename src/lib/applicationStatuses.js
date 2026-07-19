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
  'dates_proposed',
  'dates_accepted',
  'date_finalized',
  'audit_assigned',
  'audit_report_submitted',
  'logsheet_created',
  'logsheet_signed',
  'agreement_sent',
  'agreement_signed',
  'certificate_issued',
];

export const STATUS_LABELS = {
  submitted:               'Application Submitted',
  under_review:            'Under Review',
  rejected:                'Application Rejected',
  approved:                'Application Approved',
  proposal_sent:           'Proposal Sent',
  proposal_rejected:       'Proposal Rejected',
  proposal_approved:       'Proposal Approved',
  invoice_sent:            'Invoice Sent',
  payment_received:        'Payment Received',
  dates_proposed:          'Audit Dates Proposed',
  dates_accepted:          'Audit Dates Accepted',
  date_finalized:          'Audit Date Finalized',
  audit_assigned:          'Audit Assigned',
  audit_report_submitted:  'Audit Report Submitted',
  logsheet_created:        'Logsheet Created',
  logsheet_signed:         'Logsheet Signed',
  agreement_sent:          'Agreement Sent',
  agreement_signed:        'Agreement Signed',
  certificate_issued:      'Certificate Issued',
};

export const STATUS_BADGE = {
  submitted:               'badge-blue',
  under_review:            'badge-yellow',
  rejected:                'badge-red',
  approved:                'badge-green',
  proposal_sent:           'badge-purple',
  proposal_rejected:       'badge-red',
  proposal_approved:       'badge-green',
  invoice_sent:            'badge-purple',
  payment_received:        'badge-green',
  dates_proposed:          'badge-blue',
  dates_accepted:          'badge-green',
  date_finalized:          'badge-green',
  audit_assigned:          'badge-purple',
  audit_report_submitted:  'badge-yellow',
  logsheet_created:        'badge-yellow',
  logsheet_signed:         'badge-green',
  agreement_sent:          'badge-purple',
  agreement_signed:        'badge-green',
  certificate_issued:      'badge-green',
};

/**
 * Stages that are considered "terminal" — the application is done.
 * After any of these, the client can submit a new application.
 */
export const TERMINAL_STATUSES = ['approved', 'rejected', 'certificate_issued'];
