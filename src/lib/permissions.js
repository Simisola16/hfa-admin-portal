/**
 * Role & Action Permission Utilities for HFA Admin Portal
 */

export function getUserRoles(user) {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles.map(r => String(r).toLowerCase().trim());
  }
  if (user.role) {
    return [String(user.role).toLowerCase().trim()];
  }
  return [];
}

export function isSuperAdmin(user) {
  if (!user) return false;
  const roles = getUserRoles(user);
  return roles.includes('superadmin') || user.role === 'superadmin';
}

export function hasRole(user, ...allowedRoles) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const roles = getUserRoles(user);
  const normalized = allowedRoles.map(r => String(r).toLowerCase().trim());
  return roles.some(r => normalized.includes(r)) || normalized.includes(String(user.role).toLowerCase().trim());
}

/**
 * 1. SCHEME MANAGER
 * - Scheme Manager (+ Superadmin) is the ONLY one who sees:
 *   - Accept or Reject application (including Put On Hold)
 *   - Send Proposal
 *   - Send Agreement (including Final Countersigned Agreement)
 */
export function canAcceptOrRejectApp(user) {
  return hasRole(user, 'scheme_manager');
}

export function canSendProposal(user) {
  return hasRole(user, 'scheme_manager');
}

export function canSendAgreement(user) {
  return hasRole(user, 'scheme_manager');
}

/**
 * 2. ACCOUNTANT & ADMINISTRATOR (INVOICES & PAYMENTS)
 * - Accountant and Administrator (+ Superadmin) can access:
 *   - The Invoices page
 *   - Send Invoice (Initial & Final)
 *   - Confirm Payment
 */
export function canAccessInvoices(user) {
  return hasRole(user, 'accountant', 'admin');
}

export function canSendInvoice(user) {
  return hasRole(user, 'accountant', 'admin');
}

export function canConfirmPayment(user) {
  return hasRole(user, 'accountant', 'admin');
}

export function isAccountantUser(user) {
  return hasRole(user, 'accountant', 'admin');
}

/**
 * 3. AUDIT MANAGER & AUDITOR (INSPECTOR)
 * - Assign Auditor: Audit Manager (+ Superadmin) ONLY. (Auditor CANNOT assign auditor)
 * - Schedule Audit / Propose Date, Finalize Date, Create Logsheet, Mark Application Successful,
 *   Flag NC, Close NC, Mark Audit Completed: Both Audit Manager AND Auditor/Inspector (+ Superadmin)
 */
export function canAssignAuditor(user) {
  return hasRole(user, 'audit_manager');
}

export function canManageAuditDates(user) {
  return hasRole(user, 'audit_manager', 'inspector', 'auditor');
}

export function canManageNC(user) {
  return hasRole(user, 'audit_manager', 'inspector', 'auditor');
}

export function canCompleteAudit(user) {
  return hasRole(user, 'audit_manager', 'inspector', 'auditor');
}

export function canMarkApplicationSuccessful(user) {
  return hasRole(user, 'audit_manager', 'inspector', 'auditor');
}

/**
 * 4. FOOD TECH MANAGER & FOOD TECH
 * - Assign FT: FT Manager (+ Superadmin) ONLY. (FT CANNOT assign FT)
 * - Enable product form, Mark product form received, Create logsheet in add-on and initial products:
 *   Both FT Manager AND Food Tech (+ Superadmin)
 */
export function canAssignFoodTech(user) {
  return hasRole(user, 'food_tech_manager');
}

export function canManageProductForm(user) {
  return hasRole(user, 'food_tech_manager', 'food_tech');
}

/**
 * LOGSHEET CREATION
 * - Allowed for Audit Team (Audit Manager, Auditor) and Food Tech Team (FT Manager, FT) (+ Superadmin)
 */
export function canCreateLogsheet(user) {
  return hasRole(user, 'audit_manager', 'inspector', 'auditor', 'food_tech_manager', 'food_tech');
}

/**
 * 5. CERTIFICATE OFFICER
 * - In charge of certificate issuance:
 *   - Issue Certificate / Mark Ready for Certificate
 *   - Send Certificate from Review Certificate (Approve & Send)
 */
export function canIssueCertificate(user) {
  return hasRole(user, 'certificate_officer') || Boolean(user?.can_issue_direct_certificate);
}

export function canSendReviewedCertificate(user) {
  return hasRole(user, 'certificate_officer') || Boolean(user?.can_review_certificate);
}

/**
 * 6. KFC LOGSHEET
 * - Special grant privileged: Superadmin, staff with can_create_kfc_logsheet, or staff with can_sign_logsheet (to review and sign)
 */
export function canAccessKfcLogsheet(user) {
  if (!user) return false;
  return isSuperAdmin(user) || Boolean(user?.can_create_kfc_logsheet) || Boolean(user?.can_sign_logsheet);
}

