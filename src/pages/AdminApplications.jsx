import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Search, Eye, X, Calendar, MoreVertical, CheckCircle, Trash2, ExternalLink, FileSearch, Shield, FileText, ChevronRight, Package, UserCheck, Check, Filter, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_BADGE = {
  submitted:'badge-blue', 
  under_review:'badge-yellow', 
  approved:'badge-green',
  rejected:'badge-red', 
  on_hold:'badge-orange', 
  audit_scheduled:'badge-purple',
  audit_completed:'badge-green', 
  certificate_issued:'badge-green',
};

const ALL_STATUSES = ['submitted','under_review','approved','rejected','on_hold','audit_scheduled','audit_completed','certificate_issued'];

export default function AdminApplications() {
  const [apps, setApps] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedApp, setSelectedApp] = useState(null); 
  const [manageModal, setManageModal] = useState(null); 
  const [actionForm, setActionForm] = useState({ status:'', notes:'', inspector_id:'', audit_date:'' });
  const [submitting, setSubmitting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [modalTab, setModalTab] = useState('details');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, i] = await Promise.all([api.get('/api/applications'), api.get('/api/inspectors')]);
      setApps(a.data || []);
      setInspectors(i.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = apps.filter(a => {
    const matchSearch = !search || 
      a.application_number?.toLowerCase().includes(search.toLowerCase()) || 
      a.profiles?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.establishment_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleUpdateStatus = async (appId, data) => {
    setSubmitting(true);
    try {
      await api.put(`/api/applications/${appId}/status`, data);
      toast.success('Status updated successfully');
      setManageModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application? This cannot be undone.')) return;
    try {
      await api.delete(`/api/applications/${id}`);
      toast.success('Application deleted');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const markAsDone = async (app) => {
    if (!window.confirm(`Mark ${app.application_number} as Approved / Processing Done?`)) return;
    await handleUpdateStatus(app._id, { status: 'approved', notes: 'Application review completed. Status updated to Approved.' });
  };

  return (
    <div className="page-content">

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon"/>
          <input placeholder="Search by app no. or client..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="form-control" style={{width:'auto'}} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
        <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:'auto'}}>{filtered.length} applications</span>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">All Applications</div>
            <div className="card-subtitle">All certification applications submitted</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchData}><RefreshCw size={13}/></button>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner"/></div>
          ) : (
            <table>
              <thead><tr>
                <th>App No.</th>
                <th>Client / Company</th>
                <th>Site Name</th>
                <th>Type &amp; Category</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(app => (
                  <tr key={app._id}>
                    <td style={{fontWeight:700,color:'var(--primary)'}}>{app.application_number}</td>
                    <td>
                      <div style={{fontWeight:600,fontSize:13}}>{app.profiles?.company_name || '—'}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{app.profiles?.full_name}</div>
                    </td>
                    <td style={{fontSize:12}}>{app.site_name || '—'}</td>
                    <td>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--primary)',textTransform:'uppercase',marginBottom:2}}>{app.application_type}</div>
                      <div style={{fontSize:12,color:'var(--text-muted)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{app.category}</div>
                    </td>
                    <td style={{fontSize:12}}>{new Date(app.created_at).toLocaleDateString('en-GB')}</td>
                    <td style={{textAlign:'center'}}><span className={`badge ${STATUS_BADGE[app.status] || 'badge-gray'}`}>{app.status?.replace(/_/g, ' ')}</span></td>
                    <td style={{textAlign:'center'}}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setManageModal(app); setActionForm({ status: app.status, notes: '', inspector_id: app.inspector_id || '', audit_date: app.audit_date || '' }); setModalTab('details'); }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-title">No Applications Found</div>
              <div className="empty-state-text">No applications match your current search or filter.</div>
            </div>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal modal-glass" style={{ maxWidth: 1000 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'transparent' }}>
              <div>
                <h2 className="modal-title" style={{ fontSize: 24 }}>{selectedApp.application_number}</h2>
                <div className="text-sm text-muted">Submitted on {new Date(selectedApp.created_at).toLocaleString('en-GB')}</div>
              </div>
              <button className="modal-close" onClick={() => setSelectedApp(null)}><X size={24}/></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '0 32px 32px' }}>
              <div className="grid grid-cols-12 gap-6">
                {/* Profile Card */}
                <div className="col-span-8">
                  <div className="detail-card mb-6">
                    <h4 className="section-title"><Shield size={18}/> Company & Scope Info</h4>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                      <div className="detail-item">
                        <label>Registered Company</label>
                        <div style={{ fontSize: 16 }}>{selectedApp.profiles?.company_name}</div>
                        <div className="text-sm text-muted">{selectedApp.profiles?.full_name}</div>
                      </div>
                      <div className="detail-item">
                        <label>Application Type</label>
                        <div className="capitalize">{selectedApp.application_type} Certification</div>
                      </div>
                      <div className="col-span-2">
                        <div className="detail-item">
                          <label>Proposed Scope</label>
                          <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 12, border: '1px solid #dcfce7', fontStyle: 'italic', color: '#166534' }}>
                            "{selectedApp.scope || 'No scope defined'}"
                          </div>
                        </div>
                      </div>
                      <div className="detail-item">
                        <label>Establishment</label>
                        <div>{selectedApp.establishment_name}</div>
                        <div className="text-sm font-normal text-muted">{selectedApp.establishment_address}</div>
                      </div>
                      <div className="detail-item">
                        <label>Operational Stats</label>
                        <div>{selectedApp.employee_count} Employees</div>
                        <div className="text-xs font-normal">Schedule: {selectedApp.production_schedule}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-card">
                    <h4 className="section-title"><Package size={18}/> Product List</h4>
                    <div className="table-wrap" style={{ border: '1px solid #f1f5f9', borderRadius: 12 }}>
                      <table className="table-sm">
                        <thead style={{ background: '#f8fafc' }}>
                          <tr><th>Product Name</th><th>Brand / Label</th><th className="text-right">Category</th></tr>
                        </thead>
                        <tbody>
                          {(selectedApp.products || []).map((p, idx) => (
                            <tr key={idx}>
                              <td className="font-bold">{p.name}</td>
                              <td>{p.brand}</td>
                              <td className="text-right text-muted">{p.category || 'General'}</td>
                            </tr>
                          ))}
                          {(!selectedApp.products || selectedApp.products.length === 0) && (
                            <tr><td colSpan="3" className="text-center py-8 opacity-40 italic">No products submitted with this application</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="col-span-4">
                  <div className="detail-card mb-6" style={{ background: '#111827', color: 'white' }}>
                    <h4 className="section-title" style={{ color: '#86efac', borderColor: 'rgba(255,255,255,0.1)' }}><UserCheck size={18}/> Key Contacts</h4>
                    <div className="space-y-4">
                      <div className="detail-item">
                        <label style={{ color: 'rgba(255,255,255,0.5)' }}>Halal Coordinator</label>
                        <div style={{ color: 'white' }}>{selectedApp.halal_coordinator || '—'}</div>
                      </div>
                      <div className="detail-item">
                        <label style={{ color: 'rgba(255,255,255,0.5)' }}>QA Manager</label>
                        <div style={{ color: 'white' }}>{selectedApp.qa_contact || '—'}</div>
                      </div>
                      <div className="detail-item">
                        <label style={{ color: 'rgba(255,255,255,0.5)' }}>Finance Contact</label>
                        <div style={{ color: 'white' }}>{selectedApp.finance_contact || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-card mb-6">
                    <h4 className="section-title"><FileText size={18}/> Documents</h4>
                    <div className="space-y-3">
                      {selectedApp.documents && Object.entries(selectedApp.documents).map(([key, url]) => (
                        url && typeof url === 'string' && (
                          <a key={key} href={url} target="_blank" rel="noreferrer" className="doc-link">
                            <FileText size={18} />
                            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                          </a>
                        )
                      ))}
                    </div>
                  </div>

                  <div className="detail-card" style={{ background: '#fffbeb', borderColor: '#fef3c7' }}>
                    <h4 className="section-title" style={{ color: '#92400e', borderColor: '#fde68a' }}><Shield size={18}/> Compliance</h4>
                    <div className="space-y-4">
                      <div className={`flex items-center gap-2 font-bold ${selectedApp.has_porcine ? 'text-red' : 'text-green'}`}>
                        {selectedApp.has_porcine ? <X size={16}/> : <Check size={16}/>}
                        Porcine Handling: {selectedApp.has_porcine ? 'YES' : 'NO'}
                      </div>
                      <div className={`flex items-center gap-2 font-bold ${selectedApp.has_intoxicants ? 'text-red' : 'text-green'}`}>
                        {selectedApp.has_intoxicants ? <X size={16}/> : <Check size={16}/>}
                        Intoxicants: {selectedApp.has_intoxicants ? 'YES' : 'NO'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ background: '#f8fafc' }}>
              <button className="btn btn-ghost" onClick={() => setSelectedApp(null)}>Dismiss</button>
              <button className="btn btn-primary" onClick={() => { setManageModal(selectedApp); setSelectedApp(null); }}>
                Proceed to Processing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Manage Modal */}
      {manageModal && (
        <div className="modal-overlay" onClick={() => setManageModal(null)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Application Management</div>
                  <h2 className="modal-title">{manageModal.application_number}</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{manageModal.profiles?.company_name} &middot; {new Date(manageModal.created_at).toLocaleDateString('en-GB')}</div>
                </div>
                <button className="modal-close" onClick={() => setManageModal(null)}><X size={20}/></button>
              </div>
              {/* Tabs */}
              <div style={{ display:'flex', gap: 0, borderBottom: '2px solid #f1f5f9', width: '100%', marginBottom: -20 }}>
                {[{id:'details', label:'View Details'}, {id:'processing', label:'Processing'}].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id)}
                    style={{
                      padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 700,
                      color: modalTab === tab.id ? 'var(--primary)' : '#94a3b8',
                      borderBottom: modalTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                      marginBottom: -2, transition: 'all 0.15s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {/* ── DETAILS TAB ── */}
              {modalTab === 'details' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div className="detail-item">
                      <label>Company</label>
                      <div>{manageModal.profiles?.company_name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{manageModal.profiles?.full_name}</div>
                    </div>
                    <div className="detail-item">
                      <label>Application Type</label>
                      <div className="capitalize">{manageModal.application_type} Certification</div>
                    </div>
                    <div className="detail-item">
                      <label>Establishment</label>
                      <div>{manageModal.establishment_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>{manageModal.establishment_address}</div>
                    </div>
                    <div className="detail-item">
                      <label>Employees / Schedule</label>
                      <div>{manageModal.employee_count} staff</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>{manageModal.production_schedule}</div>
                    </div>
                  </div>

                  <div className="detail-item" style={{ marginBottom: 20 }}>
                    <label>Scope of Certification</label>
                    <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 10, border: '1px solid #dcfce7', fontStyle: 'italic', color: '#166534', fontSize: 13 }}>
                      "{manageModal.scope || 'No scope defined'}"
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div className="detail-item">
                      <label>Halal Coordinator</label>
                      <div>{manageModal.halal_coordinator || '—'}</div>
                    </div>
                    <div className="detail-item">
                      <label>QA Manager</label>
                      <div>{manageModal.qa_contact || '—'}</div>
                    </div>
                    <div className="detail-item">
                      <label>Finance</label>
                      <div>{manageModal.finance_contact || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <span className={`badge ${manageModal.has_porcine ? 'badge-red' : 'badge-green'}`}>
                      {manageModal.has_porcine ? '⚠ Porcine Handling' : '✓ No Porcine'}
                    </span>
                    <span className={`badge ${manageModal.has_intoxicants ? 'badge-red' : 'badge-green'}`}>
                      {manageModal.has_intoxicants ? '⚠ Intoxicants Used' : '✓ No Intoxicants'}
                    </span>
                  </div>
                </div>
              )}

              {/* ── PROCESSING TAB ── */}
              {modalTab === 'processing' && (
                <form id="process-form" onSubmit={(e) => { e.preventDefault(); handleUpdateStatus(manageModal._id, actionForm); }}>
                  <div className="form-group">
                    <label className="form-label">Application Status <span>*</span></label>
                    <select className="form-control" value={actionForm.status} onChange={e => setActionForm(f => ({...f, status: e.target.value}))} required>
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  {(actionForm.status === 'audit_scheduled' || actionForm.status === 'under_review') && (
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Assign Inspector</label>
                        <select className="form-control" value={actionForm.inspector_id} onChange={e => setActionForm(f => ({...f, inspector_id: e.target.value}))}>
                          <option value="">Select Inspector</option>
                          {inspectors.map(i => <option key={i._id} value={i._id}>{i.full_name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Audit Date</label>
                        <input type="date" className="form-control" value={actionForm.audit_date} onChange={e => setActionForm(f => ({...f, audit_date: e.target.value}))}/>
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Notes to Client</label>
                    <textarea className="form-control" rows={4} value={actionForm.notes} onChange={e => setActionForm(f => ({...f, notes: e.target.value}))} placeholder="This message will be included in the email notification..."/>
                  </div>
                </form>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              {/* Left: Danger + Proposal */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ef4444', borderColor: '#fecaca' }}
                  onClick={() => { setManageModal(null); handleDelete(manageModal._id); }}
                >
                  <Trash2 size={14} /> Delete
                </button>
                <Link
                  to={`/proposals?appId=${manageModal._id}`}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#7c3aed', borderColor: '#e9d5ff' }}
                  onClick={() => setManageModal(null)}
                >
                  <ExternalLink size={14} /> View Proposal
                </Link>
              </div>
              {/* Right: Main actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setManageModal(null)}>Close</button>
                {modalTab === 'details' ? (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { markAsDone(manageModal); }}>
                    <CheckCircle size={14} /> Processing Done
                  </button>
                ) : (
                  <button type="submit" form="process-form" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Update Status'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .action-btn-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }
        .action-btn-view {
          background: #f1f5f9;
          color: #475569;
          border-color: #e2e8f0;
        }
        .action-btn-view:hover {
          background: #e2e8f0;
          color: #1e293b;
          border-color: #cbd5e1;
        }
        .action-btn-process {
          background: #eff6ff;
          color: #2563eb;
          border-color: #bfdbfe;
        }
        .action-btn-process:hover {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .action-btn-done {
          background: #f0fdf4;
          color: #16a34a;
          border-color: #bbf7d0;
        }
        .action-btn-done:hover {
          background: #dcfce7;
          color: #15803d;
        }
        .action-btn-proposal {
          background: #faf5ff;
          color: #7c3aed;
          border-color: #e9d5ff;
        }
        .action-btn-proposal:hover {
          background: #f3e8ff;
          color: #6d28d9;
        }
        .action-btn-delete {
          background: transparent;
          color: #94a3b8;
          border-color: transparent;
          padding: 5px 6px;
        }
        .action-btn-delete:hover {
          background: #fef2f2;
          color: #ef4444;
          border-color: #fecaca;
        }
      `}</style>
    </div>
  );
}
