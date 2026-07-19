import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  FileText, Search, Trash2, Eye, CheckSquare, RefreshCw, ChevronDown, 
  MapPin, User, Calendar, Tag, Shield, Clock, CheckCircle2, Mail 
} from 'lucide-react';

export default function AdminLogsheetManage() {
  const [logsheets, setLogsheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('company_name');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const navigate = useNavigate();

  const fetchLogsheets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/application-logsheets');
      setLogsheets(res.data?.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load logsheets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsheets();
    // Close dropdowns on outside click
    const handleClose = () => setActiveDropdown(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this logsheet? This action cannot be undone.')) return;
    try {
      await api.delete(`/api/application-logsheets/${id}`);
      toast.success('Logsheet deleted successfully');
      fetchLogsheets();
    } catch (err) {
      toast.error(err.message || 'Failed to delete logsheet');
    }
  };

  const handleMarkAsDone = async (id, currentStatus, e) => {
    e.stopPropagation();
    const nextStatus = currentStatus === 'Waiting for Signature' ? 'Signed' : 'Completed';
    try {
      await api.put(`/api/application-logsheets/${id}/status`, { status: nextStatus });
      toast.success(`Logsheet marked as ${nextStatus}`);
      fetchLogsheets();
    } catch (err) {
      toast.error(err.message || 'Failed to update logsheet status');
    }
  };

  const handleResendEmails = async (id, e) => {
    e.stopPropagation();
    setActiveDropdown(null);
    try {
      const res = await api.post(`/api/application-logsheets/${id}/resend-emails`);
      toast.success(res.data?.message || 'Signatory emails resent successfully');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to resend emails';
      toast.error(msg);
    }
  };

  const filteredLogsheets = logsheets.filter(l => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (searchField === 'id') {
      return l._id?.toLowerCase().includes(query) || l.application_id?.application_number?.toLowerCase().includes(query);
    }
    if (searchField === 'company_name') {
      return l.company_name?.toLowerCase().includes(query);
    }
    if (searchField === 'contact_person') {
      return l.contact_person?.toLowerCase().includes(query);
    }
    if (searchField === 'status') {
      return l.status?.toLowerCase().includes(query);
    }
    if (searchField === 'audit_type') {
      return l.audit_type?.toLowerCase().includes(query);
    }
    return true;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Waiting for Signature':
        return 'badge-orange';
      case 'Signed':
        return 'badge-green';
      case 'Completed':
        return 'badge-blue';
      default:
        return 'badge-gray';
    }
  };

  return (
    <div style={{ padding: '0 8px' }}>
      <style>{`
        .premium-table tr {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-table tr:hover {
          background-color: #f8fafc !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
        }
        .premium-select, .premium-input {
          transition: all 0.2s ease-in-out;
          border: 1.5px solid #e2e8f0 !important;
        }
        .premium-select:focus, .premium-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
          background-color: #fff !important;
        }
        .action-drop-btn {
          transition: all 0.2s ease-in-out;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-weight: 700;
          color: #475569;
        }
        .action-drop-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #1e1b4b;
        }
        .dropdown-menu-card {
          animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 767px) {
          .desktop-only-table {
            display: none !important;
          }
          .mobile-only-cards {
            display: grid !important;
          }
        }
        @media (min-width: 768px) {
          .desktop-only-table {
            display: block !important;
          }
          .mobile-only-cards {
            display: none !important;
          }
        }
      `}</style>

      {/* Premium Header */}
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={28} style={{ color: 'var(--primary)' }} />
            Manage Logsheets
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Review, sign, and manage all processing and finalized application logsheets.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={fetchLogsheets} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontWeight: 700 }}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Reload
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '16px', overflow: 'visible', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
        
        {/* Filters Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Logsheet List</span>
            <span className="badge badge-blue" style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, background: '#dbeafe', color: '#1e40af' }}>
              {filteredLogsheets.length} Active Records
            </span>
          </div>

          {/* Search Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '500px' }}>
            <div style={{ position: 'relative', width: '160px' }}>
              <select 
                className="form-control premium-select"
                value={searchField}
                onChange={e => setSearchField(e.target.value)}
                style={{ paddingRight: '32px', height: '40px', fontSize: '13px', cursor: 'pointer', background: 'white', borderRadius: '10px', fontWeight: 600 }}
              >
                <option value="company_name">Company Name</option>
                <option value="id">Logsheet ID</option>
                <option value="contact_person">Contact Person</option>
                <option value="status">Status</option>
                <option value="audit_type">Logsheet Type</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>

            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder={`Search by ${searchField.replace('_', ' ')}...`}
                className="form-control premium-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px', height: '40px', fontSize: '13px', background: 'white', borderRadius: '10px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="table-wrap" style={{ overflowX: 'auto', overflowY: 'visible', minHeight: '300px', padding: '12px' }}>
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filteredLogsheets.length === 0 ? (
            <div className="empty-state" style={{ padding: '80px 24px' }}>
              <div className="empty-state-icon" style={{ background: '#f0fdf4', color: 'var(--primary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FileText size={32} />
              </div>
              <div className="empty-state-title" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No Logsheets Found</div>
              <div className="empty-state-text" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {searchQuery ? 'Try adjusting your search filters.' : 'There are currently no logsheets in the database.'}
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE view */}
              <div className="desktop-only-table">
                <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company Name</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Person</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created By</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Site</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>App Type</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logsheet Type</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogsheets.map(l => (
                      <tr key={l._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                          {l.application_id?.application_number || l._id?.slice(-6).toUpperCase()}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {l.company_name}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-primary)' }}>
                          <div style={{ fontWeight: 500 }}>{l.contact_person || '—'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.contact_email}</div>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-primary)' }}>
                          {l.reviewer_name || 'Admin'}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(l.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <MapPin size={13} style={{ color: 'var(--text-muted)', minWidth: '13px' }} />
                            {l.manufacturing_address || 'Main Site'}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          {l.application_id?.category || '—'}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span className={`badge ${getStatusBadgeClass(l.status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontWeight: 700 }}>
                            {l.status === 'Waiting for Signature' ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                            {l.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4f46e5' }}>
                            <Tag size={12} />
                            {l.audit_type || 'Initial'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center', position: 'relative' }}>
                          <button 
                            className="btn btn-sm action-drop-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === l._id ? null : l._id);
                            }}
                            style={{ padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                          >
                            Action <ChevronDown size={14} />
                          </button>
                          {activeDropdown === l._id && (
                            <div 
                              className="dropdown-menu-card"
                              style={{ 
                                position: 'absolute', 
                                right: '24px', 
                                top: '48px', 
                                background: 'white', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '10px', 
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                zIndex: 100, 
                                minWidth: '160px',
                                padding: '6px'
                              }}
                              onClick={e => e.stopPropagation()}
                            >
                              <Link 
                                to={`/applications/${l.application_id?._id || l.application_id}/logsheet`}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', fontSize: '13px', color: '#2563eb', textDecoration: 'none', borderRadius: '6px', background: 'transparent', fontWeight: 600 }}
                                className="dropdown-item"
                              >
                                <Eye size={14} /> Details
                              </Link>
                              {l.status === 'Waiting for Signature' && (
                                <button 
                                  onClick={(e) => handleMarkAsDone(l._id, l.status, e)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', border: 'none', textAlign: 'left', padding: '10px 12px', fontSize: '13px', color: '#16a34a', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                                  className="dropdown-item"
                                >
                                  <CheckSquare size={14} /> Mark as Signed
                                </button>
                              )}
                              <button 
                                onClick={(e) => handleDelete(l._id, e)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', border: 'none', textAlign: 'left', padding: '10px 12px', fontSize: '13px', color: '#dc2626', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                                className="dropdown-item"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                              <button 
                                onClick={(e) => handleResendEmails(l._id, e)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', border: 'none', textAlign: 'left', padding: '10px 12px', fontSize: '13px', color: '#0e7490', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                                className="dropdown-item"
                              >
                                <Mail size={14} /> Resend Emails
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE/TABLET view CARDS */}
              <div className="mobile-only-cards" style={{ display: 'none', gridTemplateColumns: '1fr', gap: '16px', padding: '8px 0' }}>
                {filteredLogsheets.map(l => (
                  <div 
                    key={l._id} 
                    style={{ 
                      background: 'white', 
                      border: '1.5px solid #e2e8f0', 
                      borderRadius: '16px', 
                      padding: '20px', 
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)' }}>
                        #{l.application_id?.application_number || l._id?.slice(-6).toUpperCase()}
                      </span>
                      <span className={`badge ${getStatusBadgeClass(l.status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, padding: '4px 10px', fontSize: '11px', borderRadius: '20px' }}>
                        {l.status === 'Waiting for Signature' ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                        {l.status}
                      </span>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                        {l.company_name}
                      </h3>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f5f3ff', color: '#4f46e5', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, marginTop: '6px' }}>
                        <Tag size={10} />
                        {l.audit_type || 'Initial'} Logsheet
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '13px' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Person</div>
                        <div style={{ fontWeight: 600, color: '#475569', marginTop: '2px' }}>{l.contact_person || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{l.contact_email}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created By / Date</div>
                        <div style={{ fontWeight: 600, color: '#475569', marginTop: '2px' }}>{l.reviewer_name || 'Admin'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{new Date(l.created_at).toLocaleDateString('en-GB')}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <MapPin size={12} style={{ color: '#94a3b8' }} />
                        <span>{l.manufacturing_address || 'Main Site'}</span>
                      </div>
                      <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                        Category: {l.application_id?.category || '—'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '4px' }}>
                      <Link 
                        to={`/applications/${l.application_id?._id || l.application_id}/logsheet`}
                        style={{ 
                          flex: 1, 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px', 
                          padding: '10px', 
                          borderRadius: '10px', 
                          background: '#f0f9ff', 
                          color: '#0369a1', 
                          textDecoration: 'none', 
                          fontSize: '13px', 
                          fontWeight: 700, 
                          textAlign: 'center'
                        }}
                      >
                        <Eye size={14} /> Details
                      </Link>

                      {l.status === 'Waiting for Signature' && (
                        <button 
                          onClick={(e) => handleMarkAsDone(l._id, l.status, e)}
                          style={{ 
                            flex: 1.2, 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            padding: '10px', 
                            borderRadius: '10px', 
                            background: '#ecfdf5', 
                            color: '#047857', 
                            border: 'none',
                            fontSize: '13px', 
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <CheckSquare size={14} /> Sign Off
                        </button>
                      )}

                      <button 
                        onClick={(e) => handleDelete(l._id, e)}
                        style={{ 
                          padding: '10px 14px', 
                          borderRadius: '10px', 
                          background: '#fef2f2', 
                          color: '#b91c1c', 
                          border: 'none',
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
