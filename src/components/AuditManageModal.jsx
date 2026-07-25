import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';
    return `${API_URL}${url}`;
  }
  return url;
};

export default function AuditManageModal({ isOpen, onClose, app, existingAudits: propExistingAudits, onSuccess }) {
  const [existingAudits, setExistingAudits] = useState([]);
  const [activeStage, setActiveStage] = useState(1);
  const [auditModalTab, setAuditModalTab] = useState('schedule'); // 'schedule' or 'nc'
  const [auditSubmitting, setAuditSubmitting] = useState(false);
  const [auditForm, setAuditForm] = useState({
    dates: ['', '', ''],
    auditors: [],
    stage2Auditors: [], // optional pre-assignment of Stage 2 auditors alongside Stage 1
    nc_text: '',
    nc_file: null,
    finalized_date: ''
  });

  const isDualStage = app?.category === 'UAE/GSO Approved Halal Certification For Exporters To UAE';

  // Sync prop existingAudits with local state
  useEffect(() => {
    setExistingAudits(propExistingAudits || []);
    if (propExistingAudits && propExistingAudits.length > 0) {
      const currentAudit = propExistingAudits.find(a => a.stage === activeStage);
      if (currentAudit && (currentAudit.status === 'auditors_assigned' || currentAudit.status === 'audit_completed')) {
        setAuditModalTab('schedule');
      }
    }
  }, [propExistingAudits, isOpen, activeStage]);

  // Load audit from backend if not provided as prop
  useEffect(() => {
    if (isOpen && app && (!propExistingAudits || propExistingAudits.length === 0)) {
      api.get(`/api/audits/application/${app._id || app.id}`)
        .then(res => {
          setExistingAudits(res.data?.data || res.data || []);
        })
        .catch(() => setExistingAudits([]));
    }
  }, [isOpen, app, propExistingAudits]);

  const existingAudit = existingAudits.find(a => a.stage === activeStage);

  // Setup initial auditors list depending on dual exporter or single
  useEffect(() => {
    if (existingAudit?.status === 'date_finalized' && auditForm.auditors.length === 0) {
      const isDual = app?.category === 'UAE/GSO Approved Halal Certification For Exporters To UAE';
      const numAuditors = isDual ? 2 : 1;
      const initialAuditors = Array(numAuditors).fill(null).map((_, i) => ({
        name: '',
        email: '',
        contact_number: '',
        purpose: '',
        role: i === 0 ? 'lead_auditor' : (isDual && i === 1 ? 'sharia_board' : 'audit_trainee')
      }));
      setAuditForm(f => ({ ...f, auditors: initialAuditors }));
    }
  }, [existingAudit, app, activeStage]);

  if (!isOpen) return null;

  const handleProposeDates = async () => {
    if (auditForm.dates.some(d => !d)) {
      toast.error('Please enter all 3 proposed dates.');
      return;
    }
    setAuditSubmitting(true);
    try {
      const res = await api.post('/api/audits/propose-dates', {
        application_id: app._id || app.id,
        client_id: app.client_id || app.profiles?._id || app.profiles?.id,
        dates: auditForm.dates,
        stage: activeStage
      });
      toast.success('3 Dates proposed to client successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to propose dates');
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
      const res = await api.post('/api/audits/finalize-date', {
        audit_id: existingAudit._id || existingAudit.id,
        finalized_date: auditForm.finalized_date
      });
      toast.success('Audit date finalized successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to finalize date');
    } finally {
      setAuditSubmitting(false);
    }
  };

  const handleAssignAuditors = async () => {
    if (auditForm.auditors.some(a => !a.name || !a.email)) {
      toast.error('Please fill in Name and Email for all auditors.');
      return;
    }
    // Validate Stage 2 auditors if any were entered (partial entries are not allowed)
    const stage2Filled = auditForm.stage2Auditors.filter(a => a.name || a.email);
    if (stage2Filled.length > 0 && stage2Filled.some(a => !a.name || !a.email)) {
      toast.error('Please fill in Name and Email for all Stage 2 auditors, or leave them all blank to assign later.');
      return;
    }
    setAuditSubmitting(true);
    try {
      await api.post('/api/audits/assign-auditors', {
        audit_id: existingAudit._id || existingAudit.id,
        auditors: auditForm.auditors
      });
      // If Stage 2 auditors were pre-filled, find or create the Stage 2 audit and assign them
      if (isDualStage && stage2Filled.length > 0) {
        const stage2Audit = existingAudits.find(a => a.stage === 2);
        if (stage2Audit && (stage2Audit.status === 'date_finalized' || stage2Audit.status === 'dates_accepted')) {
          await api.post('/api/audits/assign-auditors', {
            audit_id: stage2Audit._id || stage2Audit.id,
            auditors: auditForm.stage2Auditors
          }).catch(() => {}); // Don't block Stage 1 assignment if Stage 2 doesn't exist yet
        }
        // Store stage2 pre-assignment in session — will be applied when Stage 2 date is finalized
        // We stash them in sessionStorage so they survive the modal re-open if needed
        try {
          sessionStorage.setItem(`stage2_auditors_${app._id || app.id}`, JSON.stringify(auditForm.stage2Auditors));
        } catch (_) {}
      }
      toast.success('Auditors assigned successfully!' + (isDualStage && stage2Filled.length > 0 ? ' Stage 2 auditors will be applied when Stage 2 date is finalized.' : ''));
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to assign auditors');
    } finally {
      setAuditSubmitting(false);
    }
  };

  const handleFlagNC = async () => {
    if (!auditForm.nc_text.trim()) {
      toast.error('Please enter non-conformity description text.');
      return;
    }
    setAuditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('audit_id', existingAudit._id || existingAudit.id);
      formData.append('text', auditForm.nc_text);
      if (auditForm.nc_file) formData.append('nc_document', auditForm.nc_file);

      const res = await api.post('/api/audits/flag-nc', formData, true);
      setAuditForm(f => ({ ...f, nc_text: '', nc_file: null }));
      toast.success('NC Report flagged successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to flag NC');
    } finally {
      setAuditSubmitting(false);
    }
  };

  const handleCompleteClean = async () => {
    if (window.confirm('Are you sure there are no Non-Conformity (NC) reports for this audit session? This will complete the audit and advance the status to Audit Report Submitted.')) {
      setAuditSubmitting(true);
      try {
        const res = await api.post('/api/audits/complete-clean', {
          audit_id: existingAudit._id || existingAudit.id
        });
        toast.success('Audit completed successfully.');
        onSuccess();
        if (!isDualStage || activeStage === 2) {
          onClose();
        }
      } catch (err) {
        toast.error(err.message || 'Failed to complete audit');
      } finally {
        setAuditSubmitting(false);
      }
    }
  };

  const roleLabels = { lead_auditor: 'Lead Auditor', sharia_board: 'Sharia Board', audit_trainee: 'Audit Trainee' };
  const roleColors = {
    lead_auditor: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    sharia_board: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    audit_trainee: { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 550 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🗓️ Manage Audit Schedule</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
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
                style={{ flex: 1, padding: '8px 12px', border: 'none', background: activeStage === 2 ? '#fff' : 'transparent', color: activeStage === 2 ? '#1d4ed8' : '#64748b', fontWeight: 700, borderRadius: 6, boxShadow: activeStage === 2 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: existingAudits.find(a => a.stage === 1)?.status === 'audit_completed' ? 'pointer' : 'not-allowed', opacity: existingAudits.find(a => a.stage === 1)?.status === 'audit_completed' ? 1 : 0.6, transition: 'all 0.2s' }}
                onClick={() => {
                  if (existingAudits.find(a => a.stage === 1)?.status === 'audit_completed') {
                    setActiveStage(2);
                  } else {
                    toast.error('Stage 2 is locked until Stage 1 is completed.');
                  }
                }}
              >
                Stage 2 Audit {existingAudits.find(a => a.stage === 1)?.status !== 'audit_completed' && '🔒'}
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
              </p>
              <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                {Array(3).fill(null).map((_, i) => (
                  <div key={i} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Proposed Date Option {i + 1} <span>*</span></label>
                    <input
                      type="date"
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
              <div style={{ textAlign: 'right' }}>
                <button
                  className="btn btn-primary"
                  disabled={auditSubmitting || auditForm.dates.some(d => !d)}
                  onClick={handleProposeDates}
                >
                  {auditSubmitting ? 'Submitting...' : 'Propose Dates'}
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
                  disabled={auditSubmitting || !auditForm.finalized_date}
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
                  <div key={i} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', position: 'relative', background: '#f8fafc' }}>
                    {auditForm.auditors.length > 1 && (
                      <button
                        type="button"
                        style={{ position: 'absolute', top: 12, right: 12, border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                        onClick={() => {
                          const newAuditors = auditForm.auditors.filter((_, idx) => idx !== i);
                          setAuditForm({ ...auditForm, auditors: newAuditors });
                        }}
                      >
                        Remove
                      </button>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12 }}>Auditor {i + 1}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Name</label>
                        <input className="form-control" value={auditor.name} onChange={e => {
                          const newAuditors = [...auditForm.auditors];
                          newAuditors[i] = { ...auditor, name: e.target.value };
                          setAuditForm({ ...auditForm, auditors: newAuditors });
                        }} placeholder="e.g. Dr. Ahmad" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Email</label>
                        <input type="email" className="form-control" value={auditor.email} onChange={e => {
                          const newAuditors = [...auditForm.auditors];
                          newAuditors[i] = { ...auditor, email: e.target.value };
                          setAuditForm({ ...auditForm, auditors: newAuditors });
                        }} placeholder="e.g. ahmad@hfa.org" />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Contact</label>
                        <input className="form-control" value={auditor.contact_number} onChange={e => {
                          const newAuditors = [...auditForm.auditors];
                          newAuditors[i] = { ...auditor, contact_number: e.target.value };
                          setAuditForm({ ...auditForm, auditors: newAuditors });
                        }} placeholder="+44..." />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Purpose</label>
                        <input className="form-control" value={auditor.purpose} onChange={e => {
                          const newAuditors = [...auditForm.auditors];
                          newAuditors[i] = { ...auditor, purpose: e.target.value };
                        }} placeholder="e.g. Site Audit" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Role</label>
                        <select
                          className="form-control"
                          value={auditor.role || 'lead_auditor'}
                          onChange={e => {
                            const newAuditors = [...auditForm.auditors];
                            newAuditors[i] = { ...auditor, role: e.target.value };
                            setAuditForm({ ...auditForm, auditors: newAuditors });
                          }}
                        >
                          <option value="lead_auditor">Lead Auditor</option>
                          <option value="sharia_board">Sharia Board</option>
                          <option value="audit_trainee">Audit Trainee</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div style={{ textAlign: 'left' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const newAuditors = [...auditForm.auditors, { name: '', email: '', contact_number: '', purpose: '', role: 'audit_trainee' }];
                      setAuditForm({ ...auditForm, auditors: newAuditors });
                    }}
                  >
                    + Add Auditor
                  </button>
                </div>
              </div>

              {/* Stage 2 optional pre-assignment (GSO/UAE dual-stage only, shown on Stage 1 assignment screen) */}
              {isDualStage && activeStage === 1 && (() => {
                const stage2AlreadyAssigned = existingAudits.find(a => a.stage === 2)?.auditors?.length > 0;
                if (stage2AlreadyAssigned) return null;
                return (
                  <div style={{ marginBottom: 24, border: '1.5px dashed #c7d2fe', borderRadius: 10, padding: 18, background: '#f5f3ff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <h4 style={{ fontSize: 14, color: '#4f46e5', fontWeight: 700, margin: 0 }}>
                        Stage 2 Auditors <span style={{ fontSize: 11, fontWeight: 500, color: '#6366f1' }}>(optional — can also be assigned later)</span>
                      </h4>
                    </div>
                    <p style={{ fontSize: 12, color: '#6366f1', marginBottom: 16, lineHeight: 1.5 }}>
                      You may pre-assign Stage 2 auditors now or leave these blank and assign them once Stage 2 scheduling begins. Either approach works.
                    </p>
                    <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
                      {(auditForm.stage2Auditors.length === 0 ? [{ name: '', email: '', contact_number: '', purpose: '', role: 'lead_auditor' }] : auditForm.stage2Auditors).map((auditor, i) => (
                        <div key={i} style={{ padding: '14px', border: '1px solid #c7d2fe', borderRadius: '8px', position: 'relative', background: '#ede9fe' }}>
                          {auditForm.stage2Auditors.length > 1 && (
                            <button
                              type="button"
                              style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                              onClick={() => {
                                const updated = auditForm.stage2Auditors.filter((_, idx) => idx !== i);
                                setAuditForm(f => ({ ...f, stage2Auditors: updated }));
                              }}
                            >
                              Remove
                            </button>
                          )}
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', marginBottom: 10 }}>Stage 2 Auditor {i + 1}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Name</label>
                              <input className="form-control" value={auditor.name} onChange={e => {
                                const updated = auditForm.stage2Auditors.length > 0 ? [...auditForm.stage2Auditors] : [{ name: '', email: '', contact_number: '', purpose: '', role: 'lead_auditor' }];
                                updated[i] = { ...updated[i], name: e.target.value };
                                setAuditForm(f => ({ ...f, stage2Auditors: updated }));
                              }} placeholder="e.g. Dr. Yusuf" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Email</label>
                              <input type="email" className="form-control" value={auditor.email} onChange={e => {
                                const updated = auditForm.stage2Auditors.length > 0 ? [...auditForm.stage2Auditors] : [{ name: '', email: '', contact_number: '', purpose: '', role: 'lead_auditor' }];
                                updated[i] = { ...updated[i], email: e.target.value };
                                setAuditForm(f => ({ ...f, stage2Auditors: updated }));
                              }} placeholder="e.g. yusuf@hfa.org" />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Contact</label>
                              <input className="form-control" value={auditor.contact_number} onChange={e => {
                                const updated = auditForm.stage2Auditors.length > 0 ? [...auditForm.stage2Auditors] : [{ name: '', email: '', contact_number: '', purpose: '', role: 'lead_auditor' }];
                                updated[i] = { ...updated[i], contact_number: e.target.value };
                                setAuditForm(f => ({ ...f, stage2Auditors: updated }));
                              }} placeholder="+44..." />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Purpose</label>
                              <input className="form-control" value={auditor.purpose} onChange={e => {
                                const updated = auditForm.stage2Auditors.length > 0 ? [...auditForm.stage2Auditors] : [{ name: '', email: '', contact_number: '', purpose: '', role: 'lead_auditor' }];
                                updated[i] = { ...updated[i], purpose: e.target.value };
                                setAuditForm(f => ({ ...f, stage2Auditors: updated }));
                              }} placeholder="e.g. Sharia Audit" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Role</label>
                              <select
                                className="form-control"
                                value={auditor.role || 'lead_auditor'}
                                onChange={e => {
                                  const updated = auditForm.stage2Auditors.length > 0 ? [...auditForm.stage2Auditors] : [{ name: '', email: '', contact_number: '', purpose: '', role: 'lead_auditor' }];
                                  updated[i] = { ...updated[i], role: e.target.value };
                                  setAuditForm(f => ({ ...f, stage2Auditors: updated }));
                                }}
                              >
                                <option value="lead_auditor">Lead Auditor</option>
                                <option value="sharia_board">Sharia Board</option>
                                <option value="audit_trainee">Audit Trainee</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#4f46e5' }}
                      onClick={() => {
                        const base = auditForm.stage2Auditors.length > 0 ? auditForm.stage2Auditors : [{ name: '', email: '', contact_number: '', purpose: '', role: 'lead_auditor' }];
                        setAuditForm(f => ({ ...f, stage2Auditors: [...base, { name: '', email: '', contact_number: '', purpose: '', role: 'audit_trainee' }] }));
                      }}
                    >
                      + Add Stage 2 Auditor
                    </button>
                  </div>
                );
              })()}

              <div style={{ textAlign: 'right' }}>
                <button
                  className="btn btn-primary"
                  disabled={auditSubmitting || auditForm.auditors.some(a => !a.name || !a.email)}
                  onClick={handleAssignAuditors}
                >
                  {auditSubmitting ? 'Assigning...' : 'Assign Auditors'}
                </button>
              </div>
            </div>
          )}

          {/* Tabbed view for Assigned / Completed Audits */}
          {(existingAudit?.status === 'auditors_assigned' || existingAudit?.status === 'audit_completed') && (
            <div>
              {/*
                NC & Completion tab is hidden for Stage 1 of dual-stage (GSO/UAE) audits.
                NC flagging only applies to Stage 2 (or single-stage) — per the audit flow spec.
                Stage 1 completion moves straight to Stage 2 readiness with no NC gate.
              */}
              {/* Tab Header */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
                <button
                  type="button"
                  style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: auditModalTab === 'schedule' ? '2.5px solid var(--primary)' : 'none', color: auditModalTab === 'schedule' ? 'var(--primary)' : '#64748b', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setAuditModalTab('schedule')}
                >
                  <Users size={14} style={{ marginRight: 6, display: 'inline' }} /> Schedule &amp; Team
                </button>
                {/* NC tab: hidden for Stage 1 of dual-stage audits — NC flagging is Stage 2 only */}
                {(!isDualStage || activeStage === 2) && (
                  <button
                    type="button"
                    style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: auditModalTab === 'nc' ? '2.5px solid var(--primary)' : 'none', color: auditModalTab === 'nc' ? 'var(--primary)' : '#64748b', fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => setAuditModalTab('nc')}
                  >
                    <AlertCircle size={14} style={{ marginRight: 6, display: 'inline' }} /> NC &amp; Completion
                  </button>
                )}
              </div>

              {auditModalTab === 'schedule' && (
                <div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                    <h4 style={{ fontSize: 13, color: '#166534', fontWeight: 700, marginBottom: 4 }}>Audit Date</h4>
                    <p style={{ fontSize: 14, color: '#15803d', fontWeight: 700, margin: 0 }}>
                      {new Date(existingAudit.finalized_date).toDateString()}
                    </p>
                  </div>

                  {/* Stage 1 completion guidance for dual-stage: no NC gate here, go straight to Stage 2 */}
                  {isDualStage && activeStage === 1 && existingAudit.status === 'auditors_assigned' && (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>Stage 1 — No NC Flagging Here</div>
                      <div style={{ fontSize: 12, color: '#3b82f6', lineHeight: 1.6 }}>
                        For GSO/UAE two-stage audits, NC flagging only occurs after Stage 2. Once Stage 1 is complete, this application proceeds directly to Stage 2 scheduling with no NC decision at this point.
                      </div>
                    </div>
                  )}

                  <h4 style={{ fontSize: 14, color: '#334155', fontWeight: 700, marginBottom: 12 }}>Assigned Auditor Team</h4>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {existingAudit.auditors?.map((a, idx) => {
                      const rc = roleColors[a.role] || roleColors.audit_trainee;
                      return (
                        <div key={idx} style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#334155' }}>{a.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{a.email} {a.contact_number ? `• ${a.contact_number}` : ''}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, padding: '3px 8px', borderRadius: '12px' }}>
                              {roleLabels[a.role] || a.role}
                            </span>
                            {a.purpose && (
                              <span style={{ fontSize: 11, color: '#475569', background: '#e2e8f0', padding: '3px 6px', borderRadius: '4px' }}>
                                {a.purpose}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {auditModalTab === 'nc' && (
                <div>
                  <h4 style={{ fontSize: 14, color: '#b91c1c', fontWeight: 700, marginBottom: 12 }}>Non-Conformity (NC) Reports</h4>

                  {existingAudit.nc_reports?.length > 0 && (
                    <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                      {existingAudit.nc_reports.map((nc, idx) => (
                        <div key={idx} style={{ padding: '14px', border: `1px solid ${nc.status === 'corrected' ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', background: nc.status === 'corrected' ? '#f0fdf4' : '#fef2f2' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: nc.status === 'corrected' ? '#166534' : '#b91c1c', textTransform: 'uppercase' }}>
                              {nc.status === 'corrected' ? '✓ Corrected' : '⚠️ Pending Correction'}
                            </span>
                            <span style={{ fontSize: 10, color: '#64748b' }}>{new Date(nc.flagged_at).toLocaleDateString()}</span>
                          </div>
                          <p style={{ fontSize: 13, color: '#334155', margin: '0 0 10px 0', lineHeight: 1.4 }}>{nc.text}</p>
                          {nc.document_url && (
                            <a href={getPdfUrl(nc.document_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '4px 8px' }}>
                              <FileText size={12} style={{ marginRight: 4 }}/> View Document
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12 }}>Flag New NC Report</div>
                    <div className="form-group">
                      <textarea className="form-control" rows={3} placeholder="Describe the non-conformity..." value={auditForm.nc_text} onChange={e => setAuditForm(f => ({ ...f, nc_text: e.target.value }))}></textarea>
                    </div>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Correctivity Report / File (Optional)</label>
                      <input type="file" className="form-control" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={e => setAuditForm(f => ({ ...f, nc_file: e.target.files[0] }))} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="btn btn-primary"
                        style={{ background: '#dc2626', borderColor: '#dc2626' }}
                        disabled={auditSubmitting || !auditForm.nc_text.trim()}
                        onClick={handleFlagNC}
                      >
                        {auditSubmitting ? 'Flagging...' : 'Flag NC'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ borderColor: '#16a34a', color: '#16a34a' }}
                        disabled={auditSubmitting}
                        onClick={handleCompleteClean}
                      >
                        ✓ No Report (Clean Audit)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={auditSubmitting}>Close</button>
        </div>
      </div>
    </div>
  );
}
