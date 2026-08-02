import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, FileText, Receipt, Calendar, PenTool, CheckCircle, ArrowRight, ShieldAlert, Award, ClipboardList, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

// Shared Admin Modals
import ProposalModal from './ProposalModal';
import InvoiceModal from './InvoiceModal';
import AgreementModal from './AgreementModal';
import FinalAgreementModal from './FinalAgreementModal';
import CertificateModal from './CertificateModal';
import AuditManageModal from './AuditManageModal';
import ConfirmPaymentModal from './ConfirmPaymentModal';

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

export default function AdminActionsNeededWidget({ onActionCompleted }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [hasInitializedAutoOpen, setHasInitializedAutoOpen] = useState(false);

  // Active modal target
  const [activeModal, setActiveModal] = useState(null); // { type, app, invoice }

  const fetchAdminActions = useCallback(async () => {
    try {
      const [appRes, invRes] = await Promise.all([
        api.get('/api/applications'),
        api.get('/api/invoices').catch(() => ({ data: [] }))
      ]);

      const allApps = appRes.data?.data || appRes.data || [];
      const allInvoices = invRes.data?.data || invRes.data || [];

      const actionList = [];

      // Check client_paid invoices
      const clientPaidInvoices = allInvoices.filter(inv => inv.status === 'client_paid');
      for (const inv of clientPaidInvoices) {
        const linkedApp = allApps.find(a => String(a._id || a.id) === String(inv.application_id?._id || inv.application_id));
        actionList.push({
          id: `inv-${inv._id || inv.id}`,
          app: linkedApp || { application_number: 'N/A', establishment_name: 'Client' },
          invoice: inv,
          type: 'confirm_payment',
          title: 'Client Payment Proof Submitted',
          desc: `Confirm receipt for Invoice #${inv.invoice_number} (£${inv.amount})`,
          buttonText: 'Confirm Payment',
          buttonBg: '#16a34a',
          isFullPage: false
        });
      }

      // Check application status actions
      for (const app of allApps) {
        switch (app.status) {
          case 'submitted':
          case 'under_review':
            actionList.push({
              id: `app-sub-${app._id}`,
              app,
              type: 'review_app',
              title: 'New Application Submitted',
              desc: `Review submission details for ${app.establishment_name}`,
              buttonText: 'Review App',
              buttonBg: '#2563eb',
              isFullPage: true,
              link: `/applications/${app._id}/processing`
            });
            break;
          case 'approved':
            actionList.push({
              id: `app-prop-${app._id}`,
              app,
              type: 'send_proposal',
              title: 'Application Accepted: Send Proposal',
              desc: `Send certification proposal to ${app.establishment_name}`,
              buttonText: 'Send Proposal',
              buttonBg: '#6b21a8',
              isFullPage: false
            });
            break;
          case 'proposal_approved':
            actionList.push({
              id: `app-inv-${app._id}`,
              app,
              type: 'send_initial_invoice',
              title: 'Proposal Approved: Send Invoice',
              desc: `Issue initial certification fee invoice to ${app.establishment_name}`,
              buttonText: 'Send Invoice',
              buttonBg: '#854d0e',
              isFullPage: false
            });
            break;
          case 'dates_accepted':
            actionList.push({
              id: `app-audit-${app._id}`,
              app,
              type: 'finalize_audit_date',
              title: 'Client Selected Preferred Audit Dates',
              desc: `Lock in final confirmed audit date for ${app.establishment_name}`,
              buttonText: 'Finalize Date',
              buttonBg: '#ea580c',
              isFullPage: false
            });
            break;
          case 'audit_assigned':
            actionList.push({
              id: `app-auditassign-${app._id}`,
              app,
              type: 'manage_audit',
              title: 'Auditors Assigned: Complete Audit',
              desc: `Mark audit session completed for ${app.establishment_name}`,
              buttonText: 'Complete Audit',
              buttonBg: '#16a34a',
              isFullPage: false
            });
            break;
          case 'audit_completed':
            actionList.push({
              id: `app-auditcomplete-${app._id}`,
              app,
              type: 'manage_audit',
              title: 'Audit Completed: Submit Audit Report',
              desc: `Submit official audit report for ${app.establishment_name}`,
              buttonText: 'Submit Report',
              buttonBg: '#059669',
              isFullPage: false
            });
            break;
          case 'audit_report_submitted':
            actionList.push({
              id: `app-logsheet-${app._id}`,
              app,
              type: 'create_logsheet',
              title: 'Audit Complete: Create LogSheet',
              desc: `Create & sign logsheet for ${app.establishment_name}`,
              buttonText: 'Create LogSheet',
              buttonBg: '#0e7490',
              isFullPage: true,
              link: `/applications/${app._id}/logsheet`
            });
            break;
          case 'logsheet_signed':
          case 'application_successful':
            actionList.push({
              id: `app-ag-${app._id}`,
              app,
              type: 'send_agreement',
              title: 'Logsheet Signed: Send Agreement',
              desc: `Send certification agreement to ${app.establishment_name}`,
              buttonText: 'Send Agreement',
              buttonBg: '#2563eb',
              isFullPage: false
            });
            break;
          case 'agreement_signed':
            actionList.push({
              id: `app-agfinal-${app._id}`,
              app,
              type: 'send_final_agreement',
              title: 'Agreement Signed: Send Countersigned Copy',
              desc: `Upload final countersigned agreement PDF for ${app.establishment_name}`,
              buttonText: 'Send Final Copy',
              buttonBg: '#0284c7',
              isFullPage: false
            });
            break;
          case 'final_invoice_paid':
            actionList.push({
              id: `app-readycert-${app._id}`,
              app,
              type: 'mark_ready_certificate',
              title: 'Final Payment Confirmed',
              desc: `Mark ${app.establishment_name} ready for certificate issuance`,
              buttonText: 'Mark Ready',
              buttonBg: '#9333ea',
              isFullPage: false
            });
            break;
          case 'ready_for_certificate':
            actionList.push({
              id: `app-cert-${app._id}`,
              app,
              type: 'issue_certificate',
              title: 'Application Ready: Issue Certificate',
              desc: `Generate & issue Halal Certificate to ${app.establishment_name}`,
              buttonText: 'Issue Certificate',
              buttonBg: '#16a34a',
              isFullPage: false
            });
            break;
          default:
            break;
        }
      }

      setItems(actionList);

      // Auto-open modal once on load if items exist and not dismissed in sessionStorage
      const isDismissed = sessionStorage.getItem('admin_actions_dismissed') === 'true';
      if (actionList.length > 0 && !isDismissed && !hasInitializedAutoOpen) {
        setIsOpen(true);
      }
      setHasInitializedAutoOpen(true);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hasInitializedAutoOpen]);

  useEffect(() => {
    fetchAdminActions();
  }, [fetchAdminActions]);

  const handleRefresh = () => {
    fetchAdminActions();
    if (onActionCompleted) onActionCompleted();
  };

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('admin_actions_dismissed', 'true');
  };

  const handleManualOpen = () => {
    setIsOpen(true);
  };

  const handleMarkReady = async (app) => {
    try {
      await api.put(`/api/applications/${app._id || app.id}/ready-for-certificate`);
      toast.success('Application marked Ready for Certificate!');
      handleRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update status.');
    }
  };

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Persistent Banner Trigger */}
      <div
        onClick={handleManualOpen}
        style={{
          background: 'linear-gradient(135deg, #eff6ff, #f8fafc)',
          border: '1.5px solid #bfdbfe',
          borderRadius: 16,
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(37,99,235,0.06)',
          transition: 'all 0.2s ease-in-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 8 }}>
              Admin Action Required
              <span style={{ background: '#2563eb', color: 'white', borderRadius: 12, padding: '2px 9px', fontSize: 12, fontWeight: 800 }}>
                {items.length}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#3b82f6', marginTop: 2, fontWeight: 500 }}>
              {items.length === 1 ? '1 pending task requiring immediate attention' : `${items.length} pending tasks requiring immediate attention`} &middot; Click to open popup
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          style={{ gap: 8, fontWeight: 700, background: '#2563eb', borderColor: '#2563eb', padding: '8px 16px', borderRadius: 8 }}
          onClick={(e) => { e.stopPropagation(); handleManualOpen(); }}
        >
          View Action Items <ArrowRight size={14} />
        </button>
      </div>

      {/* Pop-Up Modal */}
      {isOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={handleDismiss}>
          <div
            className="modal"
            style={{ maxWidth: 700, width: '92%', borderRadius: 16, padding: 0, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={20} style={{ color: '#4338ca' }} />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Admin Action Required
                    <span style={{ background: '#2563eb', color: 'white', borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 800 }}>
                      {items.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                    Process pending application &amp; invoice items directly from this popup
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={handleDismiss} title="Close / Dismiss">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gap: 12 }}>
                {items.map(item => (
                  <div
                    key={item.id}
                    style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      flexWrap: 'wrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>
                        {item.title} &middot; <span style={{ color: '#64748b', fontWeight: 600 }}>#{item.app.application_number}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                        {item.desc}
                      </div>
                    </div>

                    {item.isFullPage ? (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ gap: 6, fontWeight: 700, borderColor: '#cbd5e1' }}
                        onClick={() => { handleDismiss(); navigate(item.link || `/applications/${item.app._id}/processing`); }}
                      >
                        {item.buttonText} <ArrowRight size={14} />
                      </button>
                    ) : item.type === 'mark_ready_certificate' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ background: item.buttonBg, borderColor: item.buttonBg, gap: 6, fontWeight: 700 }}
                        onClick={() => handleMarkReady(item.app)}
                      >
                        {item.buttonText}
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ background: item.buttonBg, borderColor: item.buttonBg, gap: 6, fontWeight: 700 }}
                        onClick={() => setActiveModal({ type: item.type, app: item.app, invoice: item.invoice })}
                      >
                        {item.buttonText}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                {items.length} {items.length === 1 ? 'pending action' : 'pending actions'}
              </div>
              <button className="btn btn-ghost" onClick={handleDismiss} style={{ fontWeight: 600 }}>
                Dismiss for this Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Shared Modals */}
      {activeModal?.type === 'confirm_payment' && (
        <ConfirmPaymentModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          invoice={activeModal.invoice}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'send_proposal' && (
        <ProposalModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'send_initial_invoice' && (
        <InvoiceModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          invoiceType="initial"
          onSuccess={handleRefresh}
        />
      )}

      {(activeModal?.type === 'finalize_audit_date' || activeModal?.type === 'manage_audit') && (
        <AuditManageModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'send_agreement' && (
        <AgreementModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'send_final_agreement' && (
        <FinalAgreementModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          onSuccess={handleRefresh}
        />
      )}

      {activeModal?.type === 'issue_certificate' && (
        <CertificateModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          app={activeModal.app}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
