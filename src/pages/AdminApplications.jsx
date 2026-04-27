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
    <div className="page-content bg-slate-50">
      {/* Quick Stats Header */}
      <div className="flex gap-4 mb-6">
        <div className="stat-card flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={20}/></div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Applications</div>
              <div className="text-2xl font-black text-slate-800">{apps.length}</div>
            </div>
          </div>
        </div>
        <div className="stat-card flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Calendar size={20}/></div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Review</div>
              <div className="text-2xl font-black text-slate-800">{apps.filter(a=>['submitted','under_review'].includes(a.status)).length}</div>
            </div>
          </div>
        </div>
        <div className="stat-card flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={20}/></div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved</div>
              <div className="text-2xl font-black text-slate-800">{apps.filter(a=>a.status==='approved').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="toolbar bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-center gap-4">
        <div className="search-box flex-1 max-w-md relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
            placeholder="Search by ID, Company or Site..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400"/>
          <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <button className="btn btn-ghost ml-auto hover:bg-slate-100" onClick={fetchData} title="Refresh Data">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="card shadow-md border-none overflow-visible">
        <div className="table-wrap rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center bg-white">
              <div className="spinner mb-4" />
              <div className="text-slate-400 font-medium">Synchronizing application records...</div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Reference No.</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Client Identity</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Site / Location</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Type & Category</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Created</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {filtered.map(app => (
                  <tr key={app._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold inline-block border border-slate-200">
                        {app.application_number}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-slate-800">{app.profiles?.company_name || '—'}</div>
                      <div className="text-xs text-slate-400 font-medium">{app.profiles?.full_name}</div>
                    </td>
                    <td className="py-4 px-6 text-sm font-semibold text-slate-600">
                      {app.site_name || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs font-bold text-primary mb-1 uppercase">{app.application_type}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">{app.category}</div>
                    </td>
                    <td className="py-4 px-6 text-xs font-bold text-slate-400">
                      {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${STATUS_BADGE[app.status] || 'badge-gray'}`}>
                        {app.status === 'approved' ? <Check size={10}/> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70"/>}
                        {app.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right relative">
                      <button 
                        className={`p-2 rounded-lg transition-all ${openDropdown === app._id ? 'bg-primary text-white shadow-lg' : 'hover:bg-slate-100 text-slate-400'}`} 
                        onClick={() => setOpenDropdown(openDropdown === app._id ? null : app._id)}
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {openDropdown === app._id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)}></div>
                          <div className="dropdown-menu absolute right-full top-0 mr-2">
                            <button className="dropdown-item" onClick={() => { setSelectedApp(app); setOpenDropdown(null); }}>
                              <Eye size={16}/> View Details
                            </button>
                            <button className="dropdown-item" onClick={() => { 
                              setManageModal(app); 
                              setActionForm({ status: app.status, notes: '', inspector_id: app.inspector_id || '', audit_date: app.audit_date || '' }); 
                              setOpenDropdown(null); 
                            }}>
                              <FileSearch size={16} /> Processing
                            </button>
                            <button className="dropdown-item text-green" onClick={() => { markAsDone(app); setOpenDropdown(null); }}>
                              <CheckCircle size={16} /> Processing Done
                            </button>
                            <Link to={`/proposals?appId=${app._id}`} className="dropdown-item">
                              <ExternalLink size={16} /> View Proposal
                            </Link>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item text-red" onClick={() => { handleDelete(app._id); setOpenDropdown(null); }}>
                              <Trash2 size={16} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center bg-white text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                <FileText size={40} className="text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Applications Found</h3>
              <p className="text-slate-400 max-w-xs mx-auto">We couldn't find any application matching your current filters. Try a different search term.</p>
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

      {/* Manage/Processing Modal */}
      {manageModal && (
        <div className="modal-overlay" onClick={() => setManageModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Processing: {manageModal.application_number}</h2>
              <button className="modal-close" onClick={() => setManageModal(null)}><X size={20}/></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateStatus(manageModal._id, actionForm); }}>
              <div className="modal-body">
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
                  <label className="form-label">Internal Notes / Message to Client</label>
                  <textarea className="form-control" rows={4} value={actionForm.notes} onChange={e => setActionForm(f => ({...f, notes: e.target.value}))} placeholder="Explain the current status or request more info..."/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setManageModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
