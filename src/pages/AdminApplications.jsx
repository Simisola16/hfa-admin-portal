import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Search, Eye, X, Calendar, MoreVertical, CheckCircle, Trash2, ExternalLink, FileSearch, Shield, FileText, ChevronRight, Package, UserCheck, Check, Filter, RefreshCw, Settings, Activity, Download, Receipt } from 'lucide-react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';

const getPdfUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('/api/files/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.vercel.app';
    return `${API_URL}${url}`;
  }
  if (url.includes('res.cloudinary.com')) {
    if (url.includes('/upload/') && !url.includes('fl_attachment')) {
      return url.replace('/upload/', '/upload/fl_attachment/');
    }
  }
  return url;
};

const STATUS_BADGE = {
  submitted:'badge-blue', 
  under_review:'badge-yellow', 
  approved:'badge-green',
  rejected:'badge-red', 
  on_hold:'badge-orange', 
  audit_scheduled:'badge-purple',
  audit_completed:'badge-green', 
  certificate_issued:'badge-green',
  'PROPOSAL SENT': 'badge-purple',
  'PROPOSAL ACCEPTED/REJECTED': 'badge-blue',
  'PROPOSAL REJECTED': 'badge-red',
};

const ALL_STATUSES = [
  'APPLICATION RECEIVED',
  'APPLICATION APPROVED/REJECT',
  'PROPOSAL SENT',
  'PROPOSAL ACCEPTED/REJECTED',
  'INVOICE SENT',
  'PAYMENT RECEIVED',
  'PRODUCT APPROVAL FORMS RECEIVED',
  'AUDIT-SESSION',
  'APPLICATION SUCCESSFUL/UNSUCCESSFUL',
  'AGREEMENT SENT',
  'SIGNED COPY OF AGREEMENT SENT',
  'INVOICE FOR FINAL PAYMENT SENT',
  'FINAL PAYMENT RECEIVED',
  'CERTIFICATE PROCESSING',
  'SEND CERTIFICATE'
];

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
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalForm, setProposalForm] = useState({ type: 'upload', title: '', estimated_cost: '', details: '', admin_comment: '', file: null });
  const [existingProposal, setExistingProposal] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ title: '', amount: '', due_date: '', notes: '', file: null });
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [showInvoicePdf, setShowInvoicePdf] = useState(false);

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

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => { 
    fetchData(); 
    
    // Close dropdown when clicking outside
    const handleGlobalClick = () => setOpenDropdown(null);
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    const appId = searchParams.get('appId');
    if (appId && apps.length > 0) {
      const targetApp = apps.find(a => a._id === appId || a.id === appId);
      if (targetApp) {
        setManageModal(targetApp);
        setModalTab('details');
        setSearchParams({}, { replace: true });
        // Check for existing proposal
        api.get(`/api/proposals/application/${targetApp._id || targetApp.id}`)
          .then(res => setExistingProposal(res.data || null))
          .catch(() => setExistingProposal(null));
        // Check for existing invoice
        api.get(`/api/invoices/application/${targetApp._id || targetApp.id}`)
          .then(res => setExistingInvoice(res.data || null))
          .catch(() => setExistingInvoice(null));
      }
    }
  }, [apps, searchParams, setSearchParams]);

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
                      <div style={{fontWeight:600,fontSize:13}}>{app.profiles?.company_name || app.establishment_name || '—'}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{app.profiles?.full_name || 'No contact name'}</div>
                    </td>
                    <td style={{fontSize:12}}>{app.site_name || '—'}</td>
                    <td>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--primary)',textTransform:'uppercase',marginBottom:2}}>{app.application_type}</div>
                      <div style={{fontSize:12,color:'var(--text-muted)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{app.category}</div>
                    </td>
                    <td style={{fontSize:12}}>{new Date(app.created_at).toLocaleDateString('en-GB')}</td>
                    <td style={{textAlign:'center'}}><span className={`badge ${STATUS_BADGE[app.status] || 'badge-gray'}`}>{app.status?.replace(/_/g, ' ')}</span></td>
                    <td style={{textAlign:'center', position:'relative'}}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(app._id);
                        }}
                      >
                        <MoreVertical size={18} />
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

      {/* Action Menu Pop-up Modal */}
      {openDropdown && apps.find(a => a._id === openDropdown) && (
        <div className="modal-overlay" onClick={() => setOpenDropdown(null)} style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 340, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Select Action</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{apps.find(a => a._id === openDropdown)?.application_number}</div>
              </div>
              <button className="modal-close" onClick={() => setOpenDropdown(null)}><X size={20}/></button>
            </div>
            <div style={{ padding: '16px' }}>
              {(() => {
                const app = apps.find(a => a._id === openDropdown);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button 
                      className="dropdown-item"
                      style={{ padding: '12px 16px', fontSize: 14.5 }}
                      onClick={() => { setManageModal(app); setModalTab('details'); setOpenDropdown(null); }}
                    >
                      <Eye size={18} className="text-muted" /> View Details
                    </button>
                    <button 
                      className="dropdown-item"
                      style={{ padding: '12px 16px', fontSize: 14.5 }}
                      onClick={() => {
                        setManageModal(app);
                        setModalTab('processing');
                        setActionForm({ status: app.status, notes: '', inspector_id: app.inspector_id || '', audit_date: app.audit_date || '' });
                        setOpenDropdown(null);
                        const appId = app._id || app.id;
                        api.get(`/api/proposals/application/${appId}`).then(res => setExistingProposal(res.data || null)).catch(() => setExistingProposal(null));
                        api.get(`/api/invoices/application/${appId}`).then(res => setExistingInvoice(res.data || null)).catch(() => setExistingInvoice(null));
                      }}
                    >
                      <Settings size={18} className="text-muted" /> Processing
                    </button>
                    <button 
                      className="dropdown-item text-success"
                      style={{ padding: '12px 16px', fontSize: 14.5 }}
                      onClick={() => { markAsDone(app); setOpenDropdown(null); }}
                    >
                      <CheckCircle size={18} /> Processing Done
                    </button>
                    <Link 
                      to={`/proposals?appId=${app._id}`}
                      className="dropdown-item"
                      style={{ padding: '12px 16px', fontSize: 14.5, color: '#7c3aed' }}
                      onClick={() => { setOpenDropdown(null); }}
                    >
                      <ExternalLink size={18} /> View Proposal
                    </Link>
                    <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }}></div>
                    <button 
                      className="dropdown-item text-danger"
                      style={{ padding: '12px 16px', fontSize: 14.5 }}
                      onClick={() => { handleDelete(app._id); setOpenDropdown(null); }}
                    >
                      <Trash2 size={18} /> Delete
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

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
                        <div style={{ fontSize: 16 }}>{selectedApp.profiles?.company_name || selectedApp.establishment_name || '—'}</div>
                        <div className="text-sm text-muted">{selectedApp.profiles?.full_name || 'No contact name'}</div>
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

                  {selectedApp.notes && (
                    <div className="detail-card mb-6">
                      <h4 className="section-title"><FileText size={18}/> Additional Notes</h4>
                      <div style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {selectedApp.notes}
                      </div>
                    </div>
                  )}

                  <div className="detail-card mb-6">
                    <h4 className="section-title"><FileText size={18}/> Documents</h4>
                    <div className="space-y-3">
                      {selectedApp.documents && Object.entries(selectedApp.documents).map(([key, url]) => (
                        url && typeof url === 'string' && (
                          <a key={key} href={getPdfUrl(url)} target="_blank" rel="noreferrer" className="doc-link">
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

                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <span className={`badge ${manageModal.has_porcine ? 'badge-red' : 'badge-green'}`}>
                      {manageModal.has_porcine ? '⚠ Porcine Handling' : '✓ No Porcine'}
                    </span>
                    <span className={`badge ${manageModal.has_intoxicants ? 'badge-red' : 'badge-green'}`}>
                      {manageModal.has_intoxicants ? '⚠ Intoxicants Used' : '✓ No Intoxicants'}
                    </span>
                  </div>

                  {manageModal.notes && (
                    <div className="detail-item" style={{ marginBottom: 20 }}>
                      <label>Additional Notes</label>
                      <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {manageModal.notes}
                      </div>
                    </div>
                  )}

                  <div className="detail-item">
                    <label>Documents</label>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                      {manageModal.documents && Object.entries(manageModal.documents).map(([key, url]) => (
                        url && typeof url === 'string' && (
                          <a key={key} href={getPdfUrl(url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ textTransform: 'capitalize' }}>
                            <FileText size={14} /> {key.replace(/_/g, ' ')}
                          </a>
                        )
                      ))}
                      {(!manageModal.documents || Object.keys(manageModal.documents).length === 0) && (
                        <div style={{ fontSize: 13, color: '#94a3b8' }}>No documents uploaded.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PROCESSING TAB ── */}
              {modalTab === 'processing' && (
                <form id="process-form" onSubmit={(e) => { e.preventDefault(); handleUpdateStatus(manageModal._id, actionForm); }}>
                  <div className="detail-card mb-6" style={{ border: '1px solid #e2e8f0', background: '#f8fafc', padding: '24px' }}>
                    
                    {/* 15-Step Progress Tracker */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '40px' }}>
                      {ALL_STATUSES.map((step, idx) => {
                        const currentStatus = actionForm.status || manageModal.status || 'APPLICATION RECEIVED';
                        let currentIndex = ALL_STATUSES.indexOf(currentStatus);
                        
                        // Handle Alternative status names
                        if (currentStatus === 'PROPOSAL REJECTED') currentIndex = 3; // Index of PROPOSAL ACCEPTED/REJECTED
                        
                        const isCompleted = idx <= currentIndex;
                        const isProposalRejected = step === 'PROPOSAL SENT' && existingProposal?.status === 'rejected';
                        
                        let barColor = '#cbd5e1'; 
                        let textColor = '#64748b';
                        let bgColor = '#f1f5f9';
                        let borderColor = '#e2e8f0';
                        
                        if (isCompleted) {
                          barColor = '#22c55e';
                          textColor = '#0f172a';
                          bgColor = '#f0fdf4';
                          borderColor = '#bbf7d0';
                        }

                        // Special case: PROPOSAL SENT and it was rejected — override with red
                        if (isProposalRejected) {
                          barColor = '#ef4444';
                          bgColor = '#fef2f2';
                          borderColor = '#fecaca';
                          textColor = '#dc2626';
                        }

                        return (
                          <div 
                            key={step}
                            onClick={() => {
                              if (step === 'PROPOSAL SENT' && (!existingProposal || existingProposal.status === 'rejected')) {
                                setProposalForm({
                                  type: 'upload',
                                  title: `Proposal for ${manageModal.application_number}`,
                                  estimated_cost: '',
                                  details: '',
                                  admin_comment: '',
                                  file: null
                                });
                                setShowProposalModal(true);
                                return;
                              }
                              if (step === 'INVOICE SENT' && !existingInvoice) {
                                setInvoiceForm({
                                  title: `Invoice for ${manageModal.application_number}`,
                                  amount: existingProposal?.estimated_cost || '',
                                  due_date: '',
                                  notes: '',
                                  file: null
                                });
                                setShowInvoiceModal(true);
                                return;
                              }
                              setActionForm(f => ({...f, status: step}));
                            }}
                            style={{
                              background: bgColor,
                              border: `2px solid ${borderColor}`,
                              borderRadius: '8px',
                              cursor: ((step === 'PROPOSAL SENT' && (!existingProposal || existingProposal.status === 'rejected')) || (step === 'INVOICE SENT' && !existingInvoice)) ? 'pointer' : 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              textAlign: 'center',
                              padding: '12px 6px',
                              transition: 'all 0.2s',
                              minHeight: '75px',
                              position: 'relative',
                              boxShadow: isProposalRejected ? '0 0 0 3px rgba(239,68,68,0.15)' : 'none'
                            }}
                          >
                            <div style={{ width: '90%', height: '8px', background: barColor, borderRadius: '4px', marginBottom: '10px' }}></div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: textColor, textTransform: 'uppercase', display: 'flex', gap: '4px', alignItems: 'center', lineHeight: '1.2' }}>
                              {isProposalRejected ? <X size={12} style={{ color: '#ef4444', minWidth: '12px' }}/> : isCompleted && <CheckCircle size={12} style={{ color: '#22c55e', minWidth: '12px' }}/>}
                              {step}
                            </div>
                            {isProposalRejected && (
                              <div style={{ position:'absolute', bottom: 4, fontSize: '8px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>REJECTED</div>
                            )}
                            {step === 'PROPOSAL SENT' && existingProposal && existingProposal.status !== 'rejected' && (
                              <div style={{ position:'absolute', bottom: 4, right: 4, color: '#22c55e' }}>
                                <Shield size={12} title="Proposal exists" />
                              </div>
                            )}
                            {step === 'INVOICE SENT' && existingInvoice && (
                              <div style={{ position:'absolute', bottom: 4, right: 4, color: '#22c55e' }}>
                                <Receipt size={12} title="Invoice sent" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Rejected Proposal Alert Banner */}
                    {existingProposal?.status === 'rejected' && (
                      <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '18px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 40, height: 40, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <X size={20} style={{ color: '#dc2626' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#991b1b', marginBottom: 3 }}>Proposal Rejected by Client</div>
                            <div style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.4 }}>
                              {existingProposal.client_comment ? `"${existingProposal.client_comment}"` : 'The client has declined the previous proposal. Please review and send a revised proposal.'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: 'none', whiteSpace: 'nowrap', fontSize: 13, padding: '10px 20px' }}
                          onClick={() => {
                            setProposalForm({ type: 'upload', title: `Revised Proposal for ${manageModal.application_number}`, estimated_cost: '', details: '', admin_comment: '', file: null });
                            setShowProposalModal(true);
                          }}
                        >
                          ↗ Resend New Proposal
                        </button>
                      </div>
                    )}

                    {/* Client-Uploaded Invoice Viewer */}
                    {existingInvoice && (
                      <div style={{ border: '1.5px solid #86efac', borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: '0 4px 16px rgba(22,163,74,0.08)' }}>

                        {/* Header bar */}
                        <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#f7fef9)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 42, height: 42, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Receipt size={20} style={{ color: '#16a34a' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 14, color: '#166534', marginBottom: 3 }}>
                                ✓ Client Invoice — {existingInvoice.invoice_number}
                              </div>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>£{parseFloat(existingInvoice.amount || 0).toFixed(2)}</span>
                                {existingInvoice.due_date && <span style={{ fontSize: 12, color: '#64748b' }}>{new Date(existingInvoice.due_date).toLocaleDateString('en-GB')}</span>}
                                <span style={{
                                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                  background: existingInvoice.status === 'paid' ? '#dcfce7' : '#fef3c7',
                                  color: existingInvoice.status === 'paid' ? '#15803d' : '#92400e',
                                  padding: '2px 8px', borderRadius: 4
                                }}>{existingInvoice.status}</span>
                              </div>
                              {existingInvoice.notes && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>{existingInvoice.notes}</div>}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                            {existingInvoice.invoice_url && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setShowInvoicePdf(v => !v)}
                                  className="btn btn-outline btn-sm"
                                  style={{ borderColor: '#86efac', color: '#16a34a', fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
                                >
                                  <FileText size={13} />
                                  {showInvoicePdf ? 'Hide Invoice' : 'View Invoice'}
                                </button>
                                <a
                                  href={getPdfUrl(existingInvoice.invoice_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline btn-sm"
                                  style={{ borderColor: '#cbd5e1', color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}
                                  title="Open in new tab"
                                >
                                  <Download size={13} />
                                </a>
                              </>
                            )}
                            {existingInvoice.status !== 'paid' && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', border: 'none', fontSize: 12, whiteSpace: 'nowrap' }}
                                onClick={async () => {
                                  try {
                                    await api.put(`/api/invoices/${existingInvoice._id || existingInvoice.id}`, { status: 'paid', payment_date: new Date().toISOString() });
                                    setExistingInvoice(prev => ({ ...prev, status: 'paid' }));
                                    toast.success('Invoice marked as paid!');
                                  } catch (err) {
                                    toast.error(err.message || 'Failed to mark as paid');
                                  }
                                }}
                              >
                                <CheckCircle size={13} /> Mark Paid
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline PDF Viewer */}
                        {showInvoicePdf && existingInvoice.invoice_url && (
                          <div style={{ borderTop: '1.5px solid #bbf7d0', background: '#f8fafc' }}>
                            <div style={{ padding: '8px 16px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #dcfce7' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileText size={11} /> Invoice Document Preview
                              </span>
                              <a
                                href={getPdfUrl(existingInvoice.invoice_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                <Download size={11} /> Open full PDF
                              </a>
                            </div>
                            <iframe
                              src={`${getPdfUrl(existingInvoice.invoice_url)}#toolbar=0&view=FitH`}
                              title="Invoice PDF"
                              style={{ width: '100%', height: 480, border: 'none', display: 'block' }}
                            />
                          </div>
                        )}
                      </div>
                    )}


                    {/* Application Details Table */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', padding: '40px 32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <h3 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 800, color: '#334155', marginBottom: '32px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {actionForm.status || manageModal.status || 'APPLICATION RECEIVED'}
                      </h3>
                      
                      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>Application Details</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
                          <tbody>
                            <tr>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', width: '35%', background: '#f8fafc', color: '#475569' }}>Application Number:</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', color: '#0f172a' }}>{manageModal.application_number}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Registered Company:</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', color: '#0f172a' }}>{manageModal.profiles?.company_name || manageModal.establishment_name || '—'}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Application Date:</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', color: '#0f172a' }}>{new Date(manageModal.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Application Category:</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', color: '#0f172a' }}>{manageModal.application_type} Certification – {manageModal.category}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Application Status:</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{actionForm.status || manageModal.status || 'APPLICATION RECEIVED'}</td>
                            </tr>
                            {existingProposal && (
                              <>
                                <tr>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Latest Proposal Status:</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: existingProposal.status === 'rejected' ? '#ef4444' : '#16a34a' }}>
                                    {existingProposal.status?.toUpperCase()}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 600, fontSize: '14px', background: '#f8fafc', color: '#475569' }}>Estimated Cost:</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>£{existingProposal.estimated_cost || '—'}</td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
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
      {/* Send / Resend Proposal Modal */}
      {showProposalModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: existingProposal?.status === 'rejected' ? 'linear-gradient(135deg, #fef2f2, #fff)' : undefined, borderBottom: existingProposal?.status === 'rejected' ? '2px solid #fecaca' : undefined }}>
              <div>
                <span className="modal-title">{existingProposal?.status === 'rejected' ? '↗ Resend Revised Proposal' : 'Send New Proposal'}</span>
                {existingProposal?.status === 'rejected' && (
                  <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4, fontWeight: 600 }}>Client rejected the previous proposal — send a new one</div>
                )}
              </div>
              <button className="modal-close" onClick={() => setShowProposalModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Provide a proposal for <strong>{manageModal.profiles?.company_name}</strong>. 
                This will be visible to the client on their portal.
              </p>

              {/* Toggle Switch */}
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => setProposalForm(f => ({ ...f, type: 'upload' }))}
                  style={{
                    flex: 1, padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                    background: proposalForm.type === 'upload' ? '#fff' : 'transparent',
                    color: proposalForm.type === 'upload' ? '#0f172a' : '#64748b',
                    boxShadow: proposalForm.type === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  Upload Document
                </button>
                <button
                  type="button"
                  onClick={() => setProposalForm(f => ({ ...f, type: 'write' }))}
                  style={{
                    flex: 1, padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                    background: proposalForm.type === 'write' ? '#fff' : 'transparent',
                    color: proposalForm.type === 'write' ? '#0f172a' : '#64748b',
                    boxShadow: proposalForm.type === 'write' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  Write Proposal
                </button>
              </div>
              
              <div className="form-group">
                <label className="form-label">Proposal Title <span>*</span></label>
                <input 
                  className="form-control" 
                  value={proposalForm.title}
                  onChange={e => setProposalForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Halal Certification Proposal 2024"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Estimated Cost (£) <span>*</span></label>
                <input 
                  type="number"
                  className="form-control" 
                  value={proposalForm.estimated_cost}
                  onChange={e => setProposalForm(f => ({ ...f, estimated_cost: e.target.value }))}
                  placeholder="e.g. 500.00"
                />
              </div>

              {proposalForm.type === 'upload' ? (
                <div className="form-group">
                  <label className="form-label">Proposal Document (PDF) <span>*</span></label>
                  <div 
                    onClick={() => document.getElementById('proposal-file').click()}
                    style={{ 
                      border: '2px dashed #e2e8f0', padding: '32px 24px', borderRadius: '12px', 
                      textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                      background: proposalForm.file ? '#f0fdf4' : '#fff'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <FileText size={40} style={{ color: proposalForm.file ? '#22c55e' : '#94a3b8', marginBottom: 12, margin: '0 auto' }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                      {proposalForm.file ? proposalForm.file.name : 'Click to select proposal document'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Only PDF, DOCX or JPG/PNG allowed</div>
                    <input 
                      id="proposal-file" 
                      type="file" 
                      hidden 
                      onChange={e => setProposalForm(f => ({ ...f, file: e.target.files[0] }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Proposal Details <span>*</span></label>
                  <textarea 
                    className="form-control" 
                    rows={8}
                    style={{ fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.5' }}
                    value={proposalForm.details}
                    onChange={e => setProposalForm(f => ({ ...f, details: e.target.value }))}
                    placeholder="Write your professional proposal here. Include scope, duration, terms, and cost estimates..."
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Admin Comments (Optional)</label>
                <textarea 
                  className="form-control" 
                  rows={3}
                  value={proposalForm.admin_comment}
                  onChange={e => setProposalForm(f => ({ ...f, admin_comment: e.target.value }))}
                  placeholder="Add any internal notes or additional instructions for the client..."
                />
              </div>
            </div>
            <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-ghost" onClick={() => setShowProposalModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                disabled={submitting || !proposalForm.title || (proposalForm.type === 'upload' ? !proposalForm.file : !proposalForm.details.trim())}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    const formData = new FormData();
                    formData.append('title', proposalForm.title);
                    formData.append('estimated_cost', proposalForm.estimated_cost);
                    formData.append('admin_comment', proposalForm.admin_comment);
                    if (proposalForm.type === 'upload' && proposalForm.file) {
                      formData.append('proposal_file', proposalForm.file);
                    } else if (proposalForm.type === 'write' && proposalForm.details) {
                      formData.append('details', proposalForm.details);
                    }
                    const clientId = manageModal.client_id || manageModal.profiles?._id || manageModal.profiles?.id;
                    if (!clientId) {
                      toast.error('Error: Could not identify client ID for this application.');
                      setSubmitting(false);
                      return;
                    }
                    const appId = manageModal._id || manageModal.id;
                    formData.append('application_id', appId);
                    formData.append('client_id', clientId);
                    formData.append('status', 'pending');

                    const res = await api.post('/api/proposals', formData, true);
                    setExistingProposal(res.data);
                    
                    // Automatically update application status to PROPOSAL SENT
                    await api.put(`/api/applications/${appId}/status`, { status: 'PROPOSAL SENT' });
                    
                    // Immediately update local UI states to reflect the change
                    setManageModal(prev => ({ ...prev, status: 'PROPOSAL SENT' }));
                    setActionForm(prev => ({ ...prev, status: 'PROPOSAL SENT' }));
                    
                    toast.success('Proposal sent and status updated!');
                    setShowProposalModal(false);
                    fetchData(); // Refresh list
                  } catch (err) {
                    toast.error(err.message || 'Failed to send proposal');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? 'Sending...' : (existingProposal?.status === 'rejected' ? 'Resend Revised Proposal' : 'Send Proposal')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal for Admin */}
      {showInvoiceModal && manageModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #f0fdf4, #fff)', borderBottom: '2px solid #86efac' }}>
              <div>
                <span className="modal-title" style={{ color: '#166534' }}>🧾 Send Invoice</span>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 4, fontWeight: 600 }}>
                  {manageModal.application_number}
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowInvoiceModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Upload the invoice for this application. This will notify the client and update the status to INVOICE SENT.
              </p>

              <div className="form-group">
                <label className="form-label">Invoice Title <span>*</span></label>
                <input
                  className="form-control"
                  value={invoiceForm.title}
                  onChange={e => setInvoiceForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Halal Certification Invoice"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Amount (£) <span>*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={invoiceForm.amount}
                    onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 850.00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={invoiceForm.due_date}
                    onChange={e => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Invoice Document (PDF) <span>*</span></label>
                <div
                  onClick={() => document.getElementById('admin-invoice-file-input').click()}
                  style={{
                    border: '2px dashed #e2e8f0', padding: '28px 24px', borderRadius: '12px',
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                    background: invoiceForm.file ? '#f0fdf4' : '#fff'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#16a34a'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <FileText size={36} style={{ color: invoiceForm.file ? '#16a34a' : '#94a3b8', marginBottom: 10, margin: '0 auto' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginTop: 8 }}>
                    {invoiceForm.file ? invoiceForm.file.name : 'Click to upload invoice PDF'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>PDF, DOCX accepted</div>
                  <input
                    id="admin-invoice-file-input"
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx"
                    onChange={e => setInvoiceForm(f => ({ ...f, file: e.target.files[0] }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={invoiceForm.notes}
                  onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes for the client..."
                />
              </div>
            </div>
            <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexDirection:'column', gap:12, alignItems:'stretch' }}>
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#166534', display:'flex', alignItems:'center', gap:8 }}>
                <CheckCircle size={14} style={{ color:'#16a34a', flexShrink:0 }} />
                <span>Uploading will update the application status to <strong>INVOICE SENT</strong> and send an email to the client.</span>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', padding:'10px 24px' }}
                  disabled={invoiceSubmitting || !invoiceForm.title || !invoiceForm.amount || !invoiceForm.file}
                  onClick={async () => {
                    setInvoiceSubmitting(true);
                    try {
                      const formData = new FormData();
                      formData.append('title', invoiceForm.title);
                      formData.append('amount', invoiceForm.amount);
                      if (invoiceForm.due_date) formData.append('due_date', invoiceForm.due_date);
                      if (invoiceForm.notes) formData.append('notes', invoiceForm.notes);
                      if (invoiceForm.file) formData.append('invoice_file', invoiceForm.file);
                      
                      const appId = manageModal._id || manageModal.id;
                      const clientId = manageModal.client_id || manageModal.profiles?._id || manageModal.profiles?.id;
                      if (!clientId) {
                        toast.error('Error: Could not identify client ID for this application.');
                        setInvoiceSubmitting(false);
                        return;
                      }
                      
                      formData.append('application_id', appId);
                      formData.append('client_id', clientId);

                      const res = await api.post('/api/invoices', formData, true);
                      setExistingInvoice(res.data);

                      // Automatically update application status to INVOICE SENT
                      await api.put(`/api/applications/${appId}/status`, { status: 'INVOICE SENT' });
                      
                      // Update local UI states
                      setManageModal(prev => ({ ...prev, status: 'INVOICE SENT' }));
                      setActionForm(prev => ({ ...prev, status: 'INVOICE SENT' }));

                      toast.success('🧾 Invoice sent! Status updated to INVOICE SENT.');
                      setShowInvoiceModal(false);
                      fetchData();
                    } catch (err) {
                      toast.error(err.message || 'Failed to send invoice');
                    } finally {
                      setInvoiceSubmitting(false);
                    }
                  }}
                >
                  {invoiceSubmitting
                    ? <><span className="spinner-white" style={{ width:14, height:14 }} /> Sending...</>
                    : <><Receipt size={15} /> Send Invoice &amp; Update Status</>
                  }
                </button>
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
