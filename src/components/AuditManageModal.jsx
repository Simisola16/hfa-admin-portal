import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  return url;
};

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

export default function AuditManageModal({
  isOpen = true,
  onClose,
  app: propApp,
  applicationId,
  audit,
  existingAudits: propExistingAudits,
  onSuccess
}) {
  const app = propApp || audit?.application_id || audit?.applications || applicationId;
  const [existingAudits, setExistingAudits] = useState(
    propExistingAudits || (audit ? [audit] : [])
  );
  const [activeStage, setActiveStage] = useState(audit?.stage || 1);
  const [auditSubmitting, setAuditSubmitting] = useState(false);
  const [appData, setAppData] = useState(typeof app === 'object' && app !== null ? app : null);
  const [auditForm, setAuditForm] = useState({
    dates: ['', '', ''],
    auditors: [],
    stage2Auditors: [],
    finalized_date: ''
  });

  // Load application if only ID was passed
  useEffect(() => {
    const targetAppId = getCleanId(app?._id || app?.id || app || applicationId);
    if (isOpen && targetAppId) {
      if (typeof app === 'string' || !app?.category) {
        api.get(`/api/applications/${targetAppId}`).then(res => {
          setAppData(res.data?.data || res.data || app);
        }).catch(() => {});
      } else {
        setAppData(app);
      }
    }
  }, [isOpen, app, applicationId]);

  const currentApp = appData || (typeof app === 'object' ? app : {});
  const isDualStage = currentApp?.category === 'UAE/GSO Approved Halal Certification For Exporters To UAE';

  // Sync prop existingAudits with local state
  useEffect(() => {
    if (propExistingAudits) {
      setExistingAudits(propExistingAudits);
    } else if (audit) {
      setExistingAudits([audit]);
    }
  }, [propExistingAudits, audit, isOpen, activeStage]);

  // Load audit from backend if not provided as prop
  useEffect(() => {
    const targetAppId = getCleanId(app?._id || app?.id || app || applicationId);
    if (isOpen && targetAppId && (!propExistingAudits || propExistingAudits.length === 0) && !audit) {
      api.get(`/api/audits/application/${targetAppId}`)
        .then(res => {
          setExistingAudits(res.data?.data || res.data || []);
        })
        .catch(() => setExistingAudits([]));
    }
  }, [isOpen, app, applicationId, propExistingAudits, audit]);

  const [inspectorsList, setInspectorsList] = useState([]);

  // Fetch registered Auditors from backend
  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.get('/api/users').catch(() => ({ data: [] })),
        api.get('/api/inspectors').catch(() => ({ data: [] }))
      ]).then(([usersRes, inspRes]) => {
        const rawUsers = Array.isArray(usersRes) ? usersRes : (Array.isArray(usersRes?.data) ? usersRes.data : []);
        const rawInspectors = Array.isArray(inspRes) ? inspRes : (Array.isArray(inspRes?.data) ? inspRes.data : []);

        // Filter ONLY staff with role 'inspector' or 'auditor'
        const auditorStaff = rawUsers.filter(u =>
          u && (['inspector', 'auditor'].includes(u.role) || (Array.isArray(u.roles) && (u.roles.includes('inspector') || u.roles.includes('auditor'))))
        ).map(u => ({
          _id: u._id || u.id,
          id: u._id || u.id,
          full_name: u.full_name || u.company_name || u.username,
          name: u.full_name || u.company_name || u.username,
          email: u.email,
          phone: u.phone || '',
          phone_number: u.phone || '',
          role: 'auditor',
          specialization: 'Auditor',
          is_staff: true
        }));

        // Format registered auditors from /api/inspectors
        const formattedAuditors = rawInspectors.map(insp => ({
          _id: insp._id || insp.id,
          id: insp._id || insp.id,
          full_name: insp.full_name || insp.name,
          name: insp.full_name || insp.name,
          email: insp.email,
          phone: insp.phone_number || insp.phone || '',
          phone_number: insp.phone_number || insp.phone || '',
          role: 'auditor',
          specialization: insp.specialization || 'Auditor',
          is_staff: false
        }));

        // Combine and deduplicate by email or ID
        const combined = [...auditorStaff];
        formattedAuditors.forEach(insp => {
          const exists = combined.some(c =>
            (insp._id && c._id && String(c._id) === String(insp._id)) ||
            (insp.email && c.email && c.email.toLowerCase() === insp.email.toLowerCase())
          );
          if (!exists) {
            combined.push(insp);
          }
        });

        // Sort alphabetically by full_name
        combined.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

        setInspectorsList(combined);
      }).catch(() => setInspectorsList([]));
    }
  }, [isOpen]);

  const handleSelectAuditor = (index, inspectorId) => {
    if (!inspectorId || inspectorId === 'custom') {
      const updated = [...auditForm.auditors];
      updated[index] = {
        ...updated[index],
        inspector_id: inspectorId === 'custom' ? 'custom' : '',
        name: inspectorId === 'custom' ? (updated[index]?.name || '') : '',
        email: inspectorId === 'custom' ? (updated[index]?.email || '') : '',
        contact_number: inspectorId === 'custom' ? (updated[index]?.contact_number || '') : '',
        purpose: inspectorId === 'custom' ? (updated[index]?.purpose || '') : ''
      };
      setAuditForm(f => ({ ...f, auditors: updated }));
      return;
    }
    const found = inspectorsList.find(x => String(x._id || x.id) === String(inspectorId));
    if (!found) return;

    const updated = [...auditForm.auditors];
    updated[index] = {
      ...updated[index],
      inspector_id: found._id || found.id,
      name: found.full_name || found.name || '',
      email: found.email || '',
      contact_number: found.phone_number || found.phone || updated[index]?.contact_number || '',
      purpose: found.specialization || updated[index]?.purpose || 'Halal Facility & Systems Audit'
    };
    setAuditForm(f => ({ ...f, auditors: updated }));
  };

  const existingAudit = existingAudits.find(a => (a.stage || 1) === activeStage) || (activeStage === 1 ? existingAudits[0] : null);

  // Setup initial auditors list depending on dual exporter or single
  useEffect(() => {
    if (existingAudit?.status === 'date_finalized' && auditForm.auditors.length === 0) {
      const isDual = currentApp?.category === 'UAE/GSO Approved Halal Certification For Exporters To UAE';
      const numAuditors = isDual ? 2 : 1;
      const initialAuditors = Array(numAuditors).fill(null).map(() => ({
        name: '',
        email: '',
        contact_number: '',
        purpose: '',
        inspector_id: '',
      }));
      setAuditForm(f => ({ ...f, auditors: initialAuditors }));
    }
  }, [existingAudit, currentApp]);

  if (!isOpen) return null;

  const handleProposeDates = async () => {
    // Stage 2 dates are optional for GSO/UAE dual-stage — allow skipping
    if (isDualStage && activeStage === 2 && auditForm.dates.every(d => !d)) {
      toast('Stage 2 dates skipped — you can propose them later from this modal.', { icon: '💡' });
      onClose();
      return;
    }
    if (auditForm.dates.some(d => !d)) {
      toast.error(activeStage === 2
        ? 'Please enter all 3 proposed dates for Stage 2, or leave all blank to skip and schedule later.'
        : 'Please enter all 3 proposed dates.');
      return;
    }

    // Validation 1: Prevent past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasPastDate = auditForm.dates.some(d => {
      const dateObj = new Date(d);
      dateObj.setHours(0, 0, 0, 0);
      return dateObj < today;
    });
    if (hasPastDate) {
      toast.error('Proposed audit dates cannot be in the past. Please select future dates.');
      return;
    }

    // Validation 2: Ensure 3 unique/distinct dates
    const uniqueDates = new Set(auditForm.dates.map(d => String(d).trim()));
    if (uniqueDates.size !== 3) {
      toast.error('Please select 3 distinct and different dates. You cannot choose the same date twice.');
      return;
    }

    setAuditSubmitting(true);
    try {
      const targetAppId = getCleanId(app?._id || app?.id || app || applicationId);
      const targetClientId = getCleanId(app?.client_id?._id || app?.client_id || app?.profiles?._id || app?.profiles?.id || app?.profiles);

      const res = await api.post('/api/audits/propose-dates', {
        application_id: targetAppId,
        client_id: targetClientId,
        dates: auditForm.dates,
        stage: activeStage
      });
      toast.success('3 Dates proposed to client successfully!');
      if (typeof onSuccess === 'function') onSuccess();
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to propose dates');
    } finally {
      setAuditSubmitting(false);
    }
  };

  const handleFinalizeDate = async () => {
    if (!auditForm.finalized_date) {
      toast.error('Please select a date to finalize.');
      return;
    }
    setAuditSubmitting(true);
    try {
      const currentAuditId = existingAudit?._id || existingAudit?.id || (existingAudits?.[0]?._id || existingAudits?.[0]?.id);
      const targetAppId = getCleanId(app?._id || app?.id || app || applicationId);

      const res = await api.post('/api/audits/finalize-date', {
        audit_id: currentAuditId,
        application_id: targetAppId,
        finalized_date: auditForm.finalized_date
      });
      toast.success('Audit date finalized successfully!');
      if (typeof onSuccess === 'function') onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to finalize date');
    } finally {
      setAuditSubmitting(false);
    }
  };

  const handleAssignAuditors = async () => {
    if (!Array.isArray(auditForm.auditors) || auditForm.auditors.length === 0 || auditForm.auditors.some(a => !a || !a.name || !a.email)) {
      toast.error('Please fill in Name and Email for all auditors.');
      return;
    }
    // Validate Stage 2 auditors if any were entered (partial entries are not allowed)
    const safeStage2 = Array.isArray(auditForm.stage2Auditors) ? auditForm.stage2Auditors : [];
    const stage2Filled = safeStage2.filter(a => a && (a.name || a.email));
    if (stage2Filled.length > 0 && stage2Filled.some(a => !a || !a.name || !a.email)) {
      toast.error('Please fill in Name and Email for all Stage 2 auditors, or leave them all blank to assign later.');
      return;
    }

    const currentAuditId = existingAudit?._id || existingAudit?.id || (existingAudits?.[0]?._id || existingAudits?.[0]?.id);
    const targetAppId = getCleanId(app?._id || app?.id || app || applicationId);

    setAuditSubmitting(true);
    try {
      await api.post('/api/audits/assign-auditors', {
        audit_id: currentAuditId,
        application_id: targetAppId,
        stage: activeStage,
        auditors: auditForm.auditors
      });
      // If Stage 2 auditors were pre-filled, find or create the Stage 2 audit and assign them
      if (isDualStage && stage2Filled.length > 0) {
        const stage2Audit = existingAudits.find(a => (a.stage || 1) === 2);
        if (stage2Audit && (stage2Audit.status === 'date_finalized' || stage2Audit.status === 'dates_accepted')) {
          await api.post('/api/audits/assign-auditors', {
            audit_id: stage2Audit._id || stage2Audit.id,
            application_id: targetAppId,
            stage: 2,
            auditors: stage2Filled
          }).catch(() => {}); // Don't block Stage 1 assignment if Stage 2 doesn't exist yet
        }
        // Store stage2 pre-assignment in session — will be applied when Stage 2 date is finalized
        try {
          sessionStorage.setItem(`stage2_auditors_${targetAppId}`, JSON.stringify(stage2Filled));
        } catch (_) {}
      }
      toast.success('Auditors assigned successfully!' + (isDualStage && stage2Filled.length > 0 ? ' Stage 2 auditors will be applied when Stage 2 date is finalized.' : ''));
      if (typeof onSuccess === 'function') onSuccess();
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to assign auditors');
    } finally {
      setAuditSubmitting(false);
    }
  };

  const handleCompleteAudit = async () => {
    setAuditSubmitting(true);
    try {
      const currentAuditId = existingAudit?._id || existingAudit?.id || (existingAudits?.[0]?._id || existingAudits?.[0]?.id);
      const targetAppId = getCleanId(app?._id || app?.id || app || applicationId);

      await api.post('/api/audits/complete-clean', {
        audit_id: currentAuditId,
        application_id: targetAppId
      });
      toast.success('Audit session marked as completed successfully!');
      if (typeof onSuccess === 'function') onSuccess();
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to complete audit');
    } finally {
      setAuditSubmitting(false);
    }
  };


  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 550 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🗓️ Manage Audit Schedule</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Audit Target Overview */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company &amp; Site</div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                {currentApp?.profiles?.company_name || currentApp?.client_id?.company_name || currentApp?.company_name || currentApp?.establishment_name || 'Client Company'}
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                Site: <strong>{currentApp?.site?.name || currentApp?.site_name || currentApp?.establishment_name || 'Main Facility'}</strong>
              </div>
            </div>
          </div>

          {isDualStage && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, padding: 4, background: '#f1f5f9', borderRadius: 8 }}>
              <button
                type="button"
                style={{ flex: 1, padding: '8px 12px', border: 'none', background: activeStage === 1 ? '#fff' : 'transparent', color: activeStage === 1 ? '#1d4ed8' : '#64748b', fontWeight: 700, borderRadius: 6, boxShadow: activeStage === 1 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setActiveStage(1)}
              >
                Stage 1 Audit
              </button>
              <button
                type="button"
                style={{ flex: 1, padding: '8px 12px', border: 'none', background: activeStage === 2 ? '#fff' : 'transparent', color: activeStage === 2 ? '#1d4ed8' : '#64748b', fontWeight: 700, borderRadius: 6, boxShadow: activeStage === 2 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setActiveStage(2)}
              >
                Stage 2 Audit
              </button>
            </div>
          )}
          
          {/* Propose Dates Phase */}
          {(!existingAudit || existingAudit?.status === 'dates_rejected') && (
            <div>
              {existingAudit?.status === 'dates_rejected' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.4 }}>
                    <strong>Dates Rejected by Client:</strong> The client was unavailable on the previously proposed dates. Please propose 3 new date options below.
                  </div>
                </div>
              )}
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Propose 3 possible audit dates to the client. They will select 2 dates from their portal.
                {activeStage === 2 && <span style={{ display: 'block', marginTop: 6, color: '#6366f1', fontWeight: 600 }}>💡 Stage 2 dates are optional — you can propose them now or after Stage 1 completes.</span>}
              </p>
              <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                {Array(3).fill(null).map((_, i) => (
                  <div key={i} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Proposed Date Option {i + 1} <span>*</span></label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      className="form-control"
                      value={auditForm.dates[i]}
                      onChange={e => {
                        const newDates = [...auditForm.dates];
                        newDates[i] = e.target.value;
                        setAuditForm({ ...auditForm, dates: newDates });
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                {isDualStage && activeStage === 2 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      toast('Stage 2 scheduling skipped — propose dates later when ready.', { icon: '💡' });
                      onClose();
                    }}
                    disabled={auditSubmitting}
                    style={{ color: '#64748b' }}
                  >
                    Skip for Now
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button
                  className="btn btn-primary"
                  disabled={auditSubmitting}
                  onClick={handleProposeDates}
                >
                  {auditSubmitting ? 'Submitting...' : (isDualStage && activeStage === 2 && auditForm.dates.every(d => !d) ? 'Skip & Close' : 'Propose Dates')}
                </button>
              </div>
            </div>
          )}

          {/* Dates Proposed (Waiting Client) */}
          {existingAudit?.status === 'dates_proposed' && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <Calendar size={48} style={{ color: '#94a3b8', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 16, color: '#334155', marginBottom: 8, fontWeight: 700 }}>Waiting for Client</h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                You have proposed 3 dates. The client must select exactly 2 preferred dates from their portal to continue.
              </p>
            </div>
          )}

          {/* Dates Accepted (Finalize 1) */}
          {existingAudit?.status === 'dates_accepted' && (
            <div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                <h4 style={{ fontSize: 14, color: '#166534', marginBottom: 8, fontWeight: 700 }}>✓ Client Selected Dates</h4>
                <p style={{ fontSize: 13, color: '#15803d', marginBottom: 12 }}>Please select the final audit date from the two dates selected by the client.</p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {existingAudit.selected_dates?.map((d, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px', border: '1px solid #bbf7d0', borderRadius: '8px', background: auditForm.finalized_date === d ? '#dcfce7' : '#fff' }}>
                      <input type="radio" name="finalized_date" value={d} onChange={e => setAuditForm({...auditForm, finalized_date: e.target.value})} checked={auditForm.finalized_date === d} style={{ width: 16, height: 16 }} />
                      <span style={{ fontSize: '14px', color: '#166534', fontWeight: 700 }}>{new Date(d).toDateString()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <button
                  className="btn btn-primary"
                  disabled={auditSubmitting}
                  onClick={handleFinalizeDate}
                >
                  {auditSubmitting ? 'Finalizing...' : 'Finalize Audit Date'}
                </button>
              </div>
            </div>
          )}

          {/* Date Finalized (Assign Auditors) */}
          {existingAudit?.status === 'date_finalized' && (
            <div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                <h4 style={{ fontSize: 14, color: '#166534', marginBottom: 4, fontWeight: 700 }}>✓ Audit Date Finalized</h4>
                <p style={{ fontSize: 14, color: '#15803d', fontWeight: 700, margin: 0 }}>{new Date(existingAudit.finalized_date).toDateString()}</p>
              </div>

              {/* Stage 1 Auditors */}
              <h4 style={{ fontSize: 15, color: '#334155', marginBottom: 4, fontWeight: 700 }}>
                {isDualStage ? 'Stage 1 Auditor(s)' : 'Assign Auditor(s)'}
              </h4>
              {isDualStage && <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>These auditors will conduct the Stage 1 (initial) audit visit.</p>}
              
              <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
                {auditForm.auditors.map((auditor, i) => (
                  <div key={i} style={{ padding: '18px', border: '1.5px solid #e2e8f0', borderRadius: '12px', position: 'relative', background: '#f8fafc' }}>
                    {auditForm.auditors.length > 1 && (
                      <button
                        type="button"
                        style={{ position: 'absolute', top: 14, right: 14, border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                        onClick={() => {
                          const newAuditors = auditForm.auditors.filter((_, idx) => idx !== i);
                          setAuditForm({ ...auditForm, auditors: newAuditors });
                        }}
                      >
                        Remove
                      </button>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>Auditor {i + 1}</span>
                      {auditor.inspector_id && auditor.inspector_id !== 'custom' && (
                        <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                          ✓ HFA Staff / Registered Auditor Linked
                        </span>
                      )}
                    </div>

                    {/* Choose Registered Auditor Dropdown */}
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Select Auditor <span style={{ color: '#ef4444' }}>*</span></span>
                      </label>
                      <select
                        className="form-control"
                        value={auditor.inspector_id || ''}
                        onChange={e => handleSelectAuditor(i, e.target.value)}
                        style={{
                          borderColor: auditor.inspector_id && auditor.inspector_id !== 'custom' ? '#16a34a' : '#cbd5e1',
                          background: auditor.inspector_id && auditor.inspector_id !== 'custom' ? '#f0fdf4' : '#ffffff',
                          fontWeight: 600,
                          fontSize: 13,
                          padding: '10px 14px'
                        }}
                      >
                        <option value="">-- Choose Registered Auditor --</option>
                        {inspectorsList.map(aud => (
                          <option key={aud._id || aud.id} value={aud._id || aud.id}>
                            👤 {aud.full_name || aud.name} ({aud.email}) — [AUDITOR]
                          </option>
                        ))}
                        <option value="custom">✏️ Enter Custom / External Auditor Details</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Auditor Name</label>
                        <input
                          className="form-control"
                          disabled={!!auditor.inspector_id && auditor.inspector_id !== 'custom'}
                          value={auditor.name}
                          onChange={e => {
                            const newAuditors = [...auditForm.auditors];
                            newAuditors[i] = { ...auditor, name: e.target.value };
                            setAuditForm({ ...auditForm, auditors: newAuditors });
                          }}
                          placeholder="e.g. Dr. Ahmad Khan"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Auditor Email</label>
                        <input
                          type="email"
                          className="form-control"
                          disabled={!!auditor.inspector_id && auditor.inspector_id !== 'custom'}
                          value={auditor.email}
                          onChange={e => {
                            const newAuditors = [...auditForm.auditors];
                            newAuditors[i] = { ...auditor, email: e.target.value };
                            setAuditForm({ ...auditForm, auditors: newAuditors });
                          }}
                          placeholder="e.g. ahmad@hfa.org"
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Contact Number</label>
                        <input
                          className="form-control"
                          value={auditor.contact_number}
                          onChange={e => {
                            const newAuditors = [...auditForm.auditors];
                            newAuditors[i] = { ...auditor, contact_number: e.target.value };
                            setAuditForm({ ...auditForm, auditors: newAuditors });
                          }}
                          placeholder="+44..."
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Audit Purpose / Role</label>
                        <input
                          className="form-control"
                          value={auditor.purpose}
                          onChange={e => {
                            const newAuditors = [...auditForm.auditors];
                            newAuditors[i] = { ...auditor, purpose: e.target.value };
                            setAuditForm({ ...auditForm, auditors: newAuditors });
                          }}
                          placeholder="e.g. Halal Facility & Systems Audit"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <div style={{ textAlign: 'left' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const newAuditors = [...auditForm.auditors, { name: '', email: '', contact_number: '', purpose: '', inspector_id: '' }];
                      setAuditForm({ ...auditForm, auditors: newAuditors });
                    }}
                  >
                    + Add Another Auditor
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button
                  className="btn btn-primary"
                  disabled={auditSubmitting}
                  onClick={handleAssignAuditors}
                >
                  {auditSubmitting ? 'Assigning...' : 'Assign Auditors'}
                </button>
              </div>
            </div>
          )}

          {/* View for Assigned / Completed Audits */}
          {(existingAudit?.status === 'auditors_assigned' || existingAudit?.status === 'audit_completed') && (
            <div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: 12, color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  ✓ Confirmed Audit Date {isDualStage ? `(Stage ${activeStage})` : ''}
                </div>
                <div style={{ fontSize: 15, color: '#15803d', fontWeight: 800 }}>
                  {existingAudit.finalized_date ? new Date(existingAudit.finalized_date).toDateString() : 'Confirmed'}
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                Assigned Auditor Team ({existingAudit.auditors?.length || 0})
              </div>

              <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                {existingAudit.auditors?.map((a, idx) => (
                  <div key={idx} style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1e293b' }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{a.email} {a.contact_number ? `• ${a.contact_number}` : ''}</div>
                    </div>
                    {a.purpose && (
                      <div>
                        <span style={{ fontSize: 11, color: '#475569', background: '#e2e8f0', padding: '3px 8px', borderRadius: '6px' }}>
                          {a.purpose}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {existingAudit.status !== 'audit_completed' && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px 18px', borderRadius: 12, marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                    {isDualStage ? `Stage ${activeStage} Audit Completion` : 'Audit Session Completion'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
                    {isDualStage && activeStage === 1
                      ? 'Once Stage 1 audit has been conducted on site / remotely, mark it completed to proceed to Stage 2.'
                      : 'Once the audit session has been conducted on site / remotely, mark it completed to advance the processing stage and unlock Findings & Non-Conformity (NC).'}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 700, gap: 6, fontSize: 12.5 }}
                    onClick={handleCompleteAudit}
                    disabled={auditSubmitting}
                  >
                    <CheckCircle size={15} /> {auditSubmitting ? 'Completing...' : isDualStage ? (activeStage === 1 ? 'Mark Stage 1 Completed' : 'Mark Stage 2 & Audit Completed') : 'Mark Audit Completed'}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={auditSubmitting}>Close</button>
        </div>
      </div>
    </div>
  );
}
