import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  FileText, Search, Trash2, Eye, CheckSquare, RefreshCw, ChevronDown, 
  MapPin, User, Calendar, Tag, Shield, Clock, CheckCircle2, AlertCircle, Mail 
} from 'lucide-react';

export default function AdminLogsheetWaitingSignature() {
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
      // Filter only "Waiting for Signature" on retrieval
      const allLogs = res.data?.data || res.data || [];
      const waitingLogs = allLogs.filter(l => l.status === 'Waiting for Signature');
      setLogsheets(waitingLogs);
    } catch (err) {
      toast.error('Failed to load waiting logsheets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsheets();
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

  const handleMarkAsDone = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/api/application-logsheets/${id}/status`, { status: 'Signed' });
      toast.success('Logsheet successfully signed & completed!');
      fetchLogsheets();
    } catch (err) {
      toast.error(err.message || 'Failed to sign logsheet');
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
    if (searchField === 'audit_type') {
      return l.audit_type?.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        .logsheet-table tr {
          transition: background-color 0.15s ease;
        }
        .logsheet-table tr:hover {
          background-color: #f8fafc !important;
        }
        .logsheet-search-input:focus, .logsheet-select:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.1) !important;
          outline: none;
        }
        .action-drop-btn {
          transition: all 0.15s ease;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-weight: 600;
          color: #334155;
        }
        .action-drop-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .dropdown-menu-card {
          animation: slideDown 0.15s ease-out forwards;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-4px); }
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

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={24} style={{ color: '#d97706' }} />
            Waiting for Signature
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            All draft logsheets that require executive or administrator electronic signatures.
          </p>
        </div>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={fetchLogsheets} 
          disabled={loading} 
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Reload
        </button>
      </div>

      {/* Main Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Summary & Filters Header Bar */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)',
          borderBottom: '1px solid #fed7aa',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#9a3412' }}>Pending Signatures</span>
            <span style={{
              borderRadius: 20,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 700,
              background: '#ffedd5',
              color: '#c2410c',
              border: '1px solid #fed7aa',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <Clock size={11} />
              {filteredLogsheets.length} {filteredLogsheets.length === 1 ? 'Unsigned Record' : 'Unsigned Records'}
            </span>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1', maxWidth: 480, minWidth: 280 }}>
            <div style={{ position: 'relative', width: 150 }}>
              <select 
                className="form-control logsheet-select"
                value={searchField}
                onChange={e => setSearchField(e.target.value)}
                style={{
                  paddingRight: 28,
                  height: 38,
                  fontSize: 13,
                  cursor: 'pointer',
                  background: 'white',
                  borderRadius: 8,
                  fontWeight: 600,
                  color: '#475569',
                  border: '1px solid #fed7aa'
                }}
              >
                <option value="company_name">Company Name</option>
                <option value="id">Logsheet ID</option>
                <option value="contact_person">Contact Person</option>
                <option value="audit_type">Logsheet Type</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
            </div>

            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder={`Search by ${searchField.replace('_', ' ')}...`}
                className="form-control logsheet-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 36, height: 38, fontSize: 13, background: 'white', borderRadius: 8, border: '1px solid #fed7aa' }}
              />
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="table-wrap" style={{ overflowX: 'auto', minHeight: 280 }}>
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filteredLogsheets.length === 0 ? (
            <div className="empty-state" style={{ padding: '64px 24px' }}>
              <div className="empty-state-icon" style={{ background: '#fff7ed', color: '#d97706', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Clock size={28} />
              </div>
              <div className="empty-state-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>No Logsheets Waiting for Signature</div>
              <div className="empty-state-text" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {searchQuery ? 'Try adjusting your search filters.' : 'There are currently no draft logsheets pending electronic signatures.'}
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE view */}
              <div className="desktop-only-table">
                <table className="logsheet-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Name</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Person</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created By</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Site</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>App Type</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logsheet Type</th>
                      <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogsheets.map(l => (
                      <tr key={l._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700 }}>
                          <Link 
                            to={`/applications/${l.application_id?._id || l.application_id}/logsheet`}
                            style={{ color: 'var(--primary)', textDecoration: 'none' }}
                          >
                            #{l.application_id?.application_number || l._id?.slice(-6).toUpperCase()}
                          </Link>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                          {l.company_name}
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: '#0f172a' }}>
                          <div style={{ fontWeight: 600 }}>{l.contact_person || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.contact_email}</div>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                          {l.reviewer_name || 'Admin'}
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(l.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.manufacturing_address || 'Main Site'}>
                            <MapPin size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            {l.manufacturing_address || 'Main Site'}
                          </div>
                        </td>
                        <td 
                          style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                          title={l.application_id?.category || '—'}
                        >
                          {l.application_id?.category || '—'}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 9px', borderRadius: 20,
                            fontSize: 11, fontWeight: 700,
                            color: '#c2410c', background: '#fff7ed', border: '1px solid #fed7aa',
                            whiteSpace: 'nowrap'
                          }}>
                            <Clock size={11} />
                            Waiting for Signature
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#4f46e5' }}>
                            <Tag size={12} />
                            {l.audit_type || 'Initial'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', position: 'relative' }}>
                          <button 
                            className="btn btn-sm action-drop-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === l._id ? null : l._id);
                            }}
                            style={{ padding: '5px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}
                          >
                            Action <ChevronDown size={13} />
                          </button>
                          {activeDropdown === l._id && (
                            <div 
                              className="dropdown-menu-card"
                              style={{ 
                                position: 'absolute', 
                                right: 20, 
                                top: 44, 
                                background: 'white', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: 8, 
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                zIndex: 100, 
                                minWidth: 150,
                                padding: 4
                              }}
                              onClick={e => e.stopPropagation()}
                            >
                              <Link 
                                to={`/applications/${l.application_id?._id || l.application_id}/logsheet`}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 13, color: '#2563eb', textDecoration: 'none', borderRadius: 6, background: 'transparent', fontWeight: 600 }}
                                className="dropdown-item"
                              >
                                <Eye size={14} /> Details
                              </Link>
                              <button 
                                onClick={(e) => handleMarkAsDone(l._id, e)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', textAlign: 'left', padding: '8px 10px', fontSize: 13, color: '#16a34a', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                                className="dropdown-item"
                              >
                                <CheckSquare size={14} /> Done (Sign)
                              </button>
                              <button 
                                onClick={(e) => handleDelete(l._id, e)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', textAlign: 'left', padding: '8px 10px', fontSize: 13, color: '#dc2626', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                                className="dropdown-item"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                              <button 
                                onClick={(e) => handleResendEmails(l._id, e)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', textAlign: 'left', padding: '8px 10px', fontSize: 13, color: '#0e7490', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
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
              <div className="mobile-only-cards" style={{ display: 'none', gridTemplateColumns: '1fr', gap: 12, padding: 12 }}>
                {filteredLogsheets.map(l => (
                  <div 
                    key={l._id} 
                    style={{ 
                      background: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 12, 
                      padding: 16, 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Link 
                        to={`/applications/${l.application_id?._id || l.application_id}/logsheet`}
                        style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', textDecoration: 'none' }}
                      >
                        #{l.application_id?.application_number || l._id?.slice(-6).toUpperCase()}
                      </Link>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontWeight: 700, padding: '3px 8px', fontSize: 10, borderRadius: 20,
                        background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa'
                      }}>
                        <Clock size={10} />
                        Waiting for Signature
                      </span>
                    </div>

                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {l.company_name}
                      </h3>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f5f3ff', color: '#6d28d9', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, marginTop: 4 }}>
                        <Tag size={10} />
                        {l.audit_type || 'Initial'} Logsheet
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 10, fontSize: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact Person</div>
                        <div style={{ fontWeight: 600, color: '#334155', marginTop: 2 }}>{l.contact_person || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.contact_email}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Created By / Date</div>
                        <div style={{ fontWeight: 600, color: '#334155', marginTop: 2 }}>{l.reviewer_name || 'Admin'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(l.created_at).toLocaleDateString('en-GB')}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)', background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>{l.manufacturing_address || 'Main Site'}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-muted)' }}>
                        {l.application_id?.category || '—'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 4 }}>
                      <Link 
                        to={`/applications/${l.application_id?._id || l.application_id}/logsheet`}
                        style={{ 
                          flex: 1, 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 4, 
                          padding: '8px', 
                          borderRadius: 8, 
                          background: '#eff6ff', 
                          color: '#2563eb', 
                          textDecoration: 'none', 
                          fontSize: 12, 
                          fontWeight: 700 
                        }}
                      >
                        <Eye size={13} /> Details
                      </Link>

                      <button 
                        onClick={(e) => handleMarkAsDone(l._id, e)}
                        style={{ 
                          flex: 1.2, 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 4, 
                          padding: '8px', 
                          borderRadius: 8, 
                          background: '#f0fdf4', 
                          color: '#15803d', 
                          border: 'none',
                          fontSize: 12, 
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <CheckSquare size={13} /> Done (Sign)
                      </button>

                      <button 
                        onClick={(e) => handleDelete(l._id, e)}
                        style={{ 
                          padding: '8px 12px', 
                          borderRadius: 8, 
                          background: '#fef2f2', 
                          color: '#dc2626', 
                          border: 'none',
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
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
