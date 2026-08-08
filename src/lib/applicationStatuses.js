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
  'nc_flagged',
  'nc_closed',
  'audit_report_submitted',
  'on_hold',
  'audit_successful',
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
  submitted:               'Application Submitted',
  under_review:            'Under Review',
  rejected:                'Application Rejected',
  approved:                'Application Accepted',
  proposal_sent:           'Proposal Sent',
  proposal_rejected:       'Proposal Rejected',
  proposal_approved:       'Proposal Accepted',
  invoice_sent:            'Initial Invoice Sent',
  payment_received:        'Initial Payment Received',
  dates_proposed:          'Audit Dates Proposed',
  dates_accepted:          'Audit Dates Accepted',
  date_finalized:          'Audit Date Finalized',
  audit_assigned:          'Auditor Assigned',
  nc_flagged:              'NC Flagged',
  nc_closed:               'NC Closed',
  audit_report_submitted:  'NC Closed',
  on_hold:                 'NC Flagged',
  audit_successful:        'Audit Complete',
  logsheet_created:        'Logsheet Created',
  logsheet_signed:         'Logsheet Signed',
  application_successful:  'Application Successful',
  agreement_sent:          'Agreement Sent',
  agreement_signed:        'Agreement Signed',
  agreement_finalised:     'Final Agreement Sent',
  final_invoice_sent:      'Final Certification Invoice Sent',
  final_invoice_paid:      'Final Certification Fee Paid',
  ready_for_certificate:   'Ready for Certificate',
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
  nc_flagged:              'badge-red',
  nc_closed:               'badge-green',
  audit_report_submitted:  'badge-green',
  on_hold:                 'badge-yellow',
  audit_successful:        'badge-green',
  logsheet_created:        'badge-yellow',
  logsheet_signed:         'badge-green',
  application_successful:  'badge-green',
  agreement_sent:          'badge-purple',
  agreement_signed:        'badge-green',
  agreement_finalised:     'badge-green',
  final_invoice_sent:      'badge-purple',
  final_invoice_paid:      'badge-green',
  ready_for_certificate:   'badge-purple',
  certificate_issued:      'badge-green',
};

/**
 * Stages that are considered "terminal" — the application is done.
 * After any of these, the client can submit a new application.
 */
export const TERMINAL_STATUSES = ['rejected', 'certificate_issued'];
