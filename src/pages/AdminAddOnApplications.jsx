import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { PlusCircle, Search, UserCheck, Check, X, ShieldAlert, FileText, Clipboard, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminAddOnApplications() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [foodTechUsers, setFoodTechUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals / Action states
  const [activeApp, setActiveApp] = useState(null);
  const [actionType, setActionType] = useState(null); // 'review', 'assign', 'inspect', 'complete'
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [rejectionReason, setRejectionReason] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [selectedFoodTech, setSelectedFoodTech] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/add-on-applications');
      setApps(res.data || []);
      
      // If admin or food tech manager, load food tech list for assignment dropdown
      if (['admin', 'food_tech_manager'].includes(user?.role)) {
        const usersRes = await api.get('/api/users');
        const ft = (usersRes.data || []).filter(u => u.role === 'food_tech');
        setFoodTechUsers(ft);
      }
    } catch (err) {
      toast.error('Failed to load add-on applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [user]);

  const handleReview = async () => {
    if (reviewStatus === 'rejected' && !rejectionReason.trim()) {
      return toast.error('Please enter a rejection reason.');
    }
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${activeApp._id}/review`, {
        status: reviewStatus,
        rejection_reason: reviewStatus === 'rejected' ? rejectionReason : undefined,
        food_tech_manager_notes: managerNotes
      });
      toast.success(reviewStatus === 'rejected' ? 'Application rejected' : 'Application approved');
      setActiveApp(null);
      fetchApps();
    } catch (err) {
      toast.error(err.message || 'Failed to review application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedFoodTech) return toast.error('Please select a food tech inspector.');
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${activeApp._id}/assign`, {
        assigned_food_tech: selectedFoodTech
      });
      toast.success('Food Tech Inspector assigned successfully!');
      setActiveApp(null);
      fetchApps();
    } catch (err) {
      toast.error(err.message || 'Failed to assign inspector');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspect = async () => {
    if (!inspectionNotes.trim()) return toast.error('Please enter inspection notes.');
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${activeApp._id}/inspect`, {
        inspection_notes: inspectionNotes
      });
      toast.success('Inspection report submitted successfully!');
      setActiveApp(null);
      fetchApps();
    } catch (err) {
      toast.error(err.message || 'Failed to submit inspection notes');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/add-on-applications/${activeApp._id}/complete`);
      toast.success('Application marked completed. Certificate products list updated!');
      setActiveApp(null);
      fetchApps();
    } catch (err) {
      toast.error(err.message || 'Failed to complete application');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = apps.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.client_id?.company_name?.toLowerCase().includes(s) ||
           a.client_id?.full_name?.toLowerCase().includes(s) ||
           a.certificate_id?.certificate_number?.toLowerCase().includes(s) ||
           a.status?.toLowerCase().includes(s);
  });

  return (
    <div className="animate-in">
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className="badge badge-gray" style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>
            {filtered.length} Requests
          </span>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', background: '#fff' }}>
          <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: 10, borderRadius: 12, display: 'flex' }}>
            <PlusCircle size={20} />
          </div>
          <div>
            <div className="card-title" style={{ fontSize: 18, fontWeight: 700 }}>Add-on Product Applications</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Manage additions, removals, and renames on active client certificates</div>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <PlusCircle size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <div className="empty-state-title" style={{ fontSize: 16, fontWeight: 700 }}>No requests found</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Client / Certificate</th>
                    <th>Request Details</th>
                    <th>Contact Info</th>
                    <th>Current Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(app => {
                    const clientName = app.client_id?.company_name || app.client_id?.full_name || '—';
                    const certNo = app.certificate_id?.certificate_number || '—';
                    const isManagerOrAdmin = ['admin', 'food_tech_manager'].includes(user?.role);
                    const isAssignedInspector = app.assigned_food_tech?._id === user?.id || app.assigned_food_tech === user?.id;

                    return (
                      <tr key={app._id} className="hover-row">
                        <td>
                          <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{clientName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cert: {certNo}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: app.action_type === 'add' ? '#f0fdf4' : app.action_type === 'remove' ? '#fef2f2' : '#f0f9ff', color: app.action_type === 'add' ? '#166534' : app.action_type === 'remove' ? '#991b1b' : '#0369a1', textTransform: 'uppercase', marginRight: 8 }}>
                            {app.action_type === 'change_name' ? 'rename' : app.action_type}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            {app.action_type === 'add' && app.new_product_name}
                            {app.action_type === 'remove' && app.product_name}
                            {app.action_type === 'change_name' && `${app.product_name} → ${app.new_product_name}`}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{app.contact_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{app.contact_email}</div>
                        </td>
                        <td>
                          <span className={`badge ${
                            app.status === 'completed' ? 'badge-green' :
                            app.status === 'rejected' ? 'badge-red' :
                            app.status === 'inspection_completed' ? 'badge-teal' :
                            'badge-yellow'
                          }`} style={{ textTransform: 'uppercase', fontSize: 10 }}>
                            {app.status?.replace(/_/g, ' ')}
                          </span>
                          {app.assigned_food_tech && (
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Inspector: {app.assigned_food_tech.full_name}</div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            {/* Manager Actions */}
                            {isManagerOrAdmin && app.status === 'submitted' && (
                              <button className="btn btn-primary btn-sm" onClick={() => { setActiveApp(app); setActionType('review'); setReviewStatus('approved'); setRejectionReason(''); setManagerNotes(''); }}>
                                Review Request
                              </button>
                            )}

                            {isManagerOrAdmin && app.status === 'approved' && (
                              <button className="btn btn-primary btn-sm" style={{ background: '#0284c7', borderColor: '#0284c7' }} onClick={() => { setActiveApp(app); setActionType('assign'); setSelectedFoodTech(''); }}>
                                Assign Inspector
                              </button>
                            )}

                            {isManagerOrAdmin && app.status === 'inspection_completed' && (
                              <button className="btn btn-primary btn-sm" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => { setActiveApp(app); setActionType('complete'); }}>
                                Final Sign-off
                              </button>
                            )}

                            {/* Inspector Actions */}
                            {(isAssignedInspector || isManagerOrAdmin) && app.status === 'inspection_assigned' && (
                              <button className="btn btn-primary btn-sm" style={{ background: '#0d9488', borderColor: '#0d9488' }} onClick={() => { setActiveApp(app); setActionType('inspect'); setInspectionNotes(''); }}>
                                Submit Report
                              </button>
                            )}

                            {app.status === 'completed' && (
                              <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>✓ Completed</span>
                            )}
                            {app.status === 'rejected' && (
                              <span style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>❌ Rejected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      {/* Review Modal */}
      {activeApp && actionType === 'review' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <span className="modal-title">Review Add-on Request</span>
              <button className="modal-close" onClick={() => setActiveApp(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ marginBottom: 20, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700 }}>{activeApp.client_id?.company_name || activeApp.client_id?.full_name}</div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
                  Action: <strong style={{ textTransform: 'uppercase' }}>{activeApp.action_type}</strong>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                  Details: {activeApp.action_type === 'add' && activeApp.new_product_name}
                  {activeApp.action_type === 'remove' && activeApp.product_name}
                  {activeApp.action_type === 'change_name' && `${activeApp.product_name} → ${activeApp.new_product_name}`}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Decision</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className={`btn ${reviewStatus === 'approved' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setReviewStatus('approved')}>Approve</button>
                  <button type="button" className={`btn ${reviewStatus === 'rejected' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, background: reviewStatus === 'rejected' ? '#ef4444' : 'transparent', borderColor: reviewStatus === 'rejected' ? '#ef4444' : '#e2e8f0', color: reviewStatus === 'rejected' ? 'white' : 'inherit' }} onClick={() => setReviewStatus('rejected')}>Reject</button>
                </div>
              </div>

              {reviewStatus === 'rejected' ? (
                <div className="form-group animate-in">
                  <label className="form-label">Rejection Reason <span>*</span></label>
                  <textarea className="form-control" rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why this request is being rejected..." required />
                </div>
              ) : (
                <div className="form-group animate-in">
                  <label className="form-label">Internal Notes (Optional)</label>
                  <textarea className="form-control" rows={3} value={managerNotes} onChange={e => setManagerNotes(e.target.value)} placeholder="Add any details or instructions..." />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActiveApp(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReview} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Save Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Inspector Modal */}
      {activeApp && actionType === 'assign' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <span className="modal-title">Assign Food Tech Inspector</span>
              <button className="modal-close" onClick={() => setActiveApp(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div className="form-group">
                <label className="form-label">Select Food Tech Inspector <span>*</span></label>
                <select className="form-control" value={selectedFoodTech} onChange={e => setSelectedFoodTech(e.target.value)} required>
                  <option value="">-- Choose Inspector --</option>
                  {foodTechUsers.map(u => (
                    <option key={u._id} value={u._id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActiveApp(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={submitting || !selectedFoodTech}>
                {submitting ? 'Assigning...' : 'Assign Inspector'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Report Modal */}
      {activeApp && actionType === 'inspect' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <span className="modal-title">Submit Inspection Report</span>
              <button className="modal-close" onClick={() => setActiveApp(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div className="form-group">
                <label className="form-label">Inspection Notes <span>*</span></label>
                <textarea className="form-control" rows={5} value={inspectionNotes} onChange={e => setInspectionNotes(e.target.value)} placeholder="Record your inspection findings and verify compliance for the products..." required />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActiveApp(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleInspect} disabled={submitting || !inspectionNotes.trim()}>
                {submitting ? 'Submitting...' : 'Mark Inspection Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Sign-off Modal */}
      {activeApp && actionType === 'complete' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">Final Sign-off &amp; Completion</span>
              <button className="modal-close" onClick={() => setActiveApp(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, color: '#166534', fontSize: 13, marginBottom: 20 }}>
                <Check size={18} style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
                <span>You are finalizing this request. The client's certificate will be updated automatically with the product changes.</span>
              </div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                <div><strong>Action:</strong> {activeApp.action_type.toUpperCase()}</div>
                <div style={{ marginTop: 6 }}>
                  <strong>Product Details:</strong> {activeApp.action_type === 'add' && activeApp.new_product_name}
                  {activeApp.action_type === 'remove' && activeApp.product_name}
                  {activeApp.action_type === 'change_name' && `${activeApp.product_name} → ${activeApp.new_product_name}`}
                </div>
                {activeApp.inspection_notes && (
                  <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}>
                    <strong>Inspection Notes:</strong> {activeApp.inspection_notes}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setActiveApp(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleComplete} disabled={submitting}>
                {submitting ? 'Finalizing...' : 'Approve & Update Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
