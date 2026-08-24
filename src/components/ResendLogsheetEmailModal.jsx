import React, { useState, useEffect } from 'react';
import { X, Mail, Send, AlertCircle, CheckCircle2, User, Building, Clock, Plus } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function ResendLogsheetEmailModal({ isOpen, onClose, logsheet, onSuccess }) {
  const [emailsInput, setEmailsInput] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && logsheet) {
      setEmailsInput('');
      setCustomMessage('');
    }
  }, [isOpen, logsheet]);

  if (!isOpen || !logsheet) return null;

  const appRef = logsheet.application_id?.application_number ||
    logsheet.addon_application_id?._id?.slice(-6).toUpperCase() ||
    logsheet._id?.slice(-6).toUpperCase() || 'N/A';

  const handleAddEmail = (emailToAdd) => {
    if (!emailToAdd) return;
    const existing = emailsInput.split(/[,;\n]+/).map(e => e.trim()).filter(Boolean);
    if (!existing.includes(emailToAdd)) {
      const updated = existing.length > 0 ? `${existing.join(', ')}, ${emailToAdd}` : emailToAdd;
      setEmailsInput(updated);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    
    // Parse emails from input
    const parsedEmails = emailsInput
      .split(/[,;\n]+/)
      .map(e => e.trim())
      .filter(Boolean);

    if (parsedEmails.length === 0) {
      toast.error('Please enter at least one recipient email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = parsedEmails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email format: ${invalidEmails.join(', ')}`);
      return;
    }

    setSending(true);
    try {
      const res = await api.post(`/api/application-logsheets/${logsheet._id}/resend-emails`, {
        emails: parsedEmails,
        message: customMessage.trim()
      });

      toast.success(res.data?.message || 'Signatory notification email sent successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to send signatory email';
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  };

  // Signatory progress check
  const signers = [
    { role: 'Mufti / Shariah', signed: Boolean(logsheet.mufti_signature), name: logsheet.mufti_sign_name },
    { role: 'CEO / Executive', signed: Boolean(logsheet.ceo_signature), name: logsheet.ceo_sign_name },
    { role: 'Technical Manager', signed: Boolean(logsheet.manager_signature), name: logsheet.manager_sign_name },
    { role: 'Mufti 2', signed: Boolean(logsheet.mufti2_signature), name: logsheet.mufti2_sign_name },
  ];
  const signedCount = signers.filter(s => s.signed).length;

  return (
    <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={onClose}>
      <div
        className="modal"
        style={{
          maxWidth: 520,
          width: '95%',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            background: '#f0fdfa',
            borderBottom: '1px solid #ccfbf1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bae6fd' }}>
              <Mail size={18} style={{ color: '#0284c7' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Resend Signatory Email
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                {logsheet.company_name} &bull; Ref: #{appRef}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={sending}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSend}>
          <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
            
            {/* Status Summary Banner */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 18,
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: '#334155' }}>Audit Type: </span>
                <span style={{ color: '#0e7490', fontWeight: 600 }}>{logsheet.audit_type || 'Standard'} Logsheet</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: signedCount > 0 ? '#f0fdf4' : '#fff7ed', color: signedCount > 0 ? '#166534' : '#c2410c', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 11.5 }}>
                <CheckCircle2 size={13} />
                {signedCount} / 4 Signed
              </div>
            </div>

            {/* Recipient Email Address Input */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Recipient Email Address(es) <span style={{ color: '#dc2626' }}>*</span></span>
              </label>
              
              <textarea
                className="form-control"
                rows={2}
                value={emailsInput}
                onChange={e => setEmailsInput(e.target.value)}
                placeholder="Enter email address(es) e.g. mufti@hfa.org, ceo@hfa.org"
                style={{ fontSize: 13, lineHeight: 1.45, borderRadius: 8 }}
                autoFocus
                required
              />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Separate multiple email addresses with a comma or new line.
              </div>

              {/* Quick Suggestion Pills */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Quick Suggestions:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleAddEmail('mufti@halalfoodauthority.com')}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3
                    }}
                  >
                    <Plus size={11} /> Mufti / Shariah
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddEmail('ceo@halalfoodauthority.com')}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3
                    }}
                  >
                    <Plus size={11} /> CEO
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddEmail('manager@halalfoodauthority.com')}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3
                    }}
                  >
                    <Plus size={11} /> Quality Manager
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Custom Message */}
            <div className="form-group" style={{ marginBottom: 6 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>
                Custom Note / Message <span style={{ fontWeight: 400, color: '#64748b', fontSize: 11.5 }}>(Optional)</span>
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="Add an optional note to include in the notification email..."
                style={{ fontSize: 12.5, lineHeight: 1.45, borderRadius: 8 }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            className="modal-footer"
            style={{
              padding: '14px 20px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10
            }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={sending}
              style={{ fontSize: 13, padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || !emailsInput.trim()}
              style={{
                fontSize: 13,
                fontWeight: 700,
                padding: '8px 18px',
                borderRadius: 8,
                background: '#0e7490',
                borderColor: '#0e7490',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Send size={14} />
              {sending ? 'Sending...' : 'Send Notification Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
