import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  FileText, Search, Trash2, Eye, RefreshCw, ChevronDown, 
  MapPin, User, Calendar, Tag, Shield, Clock, CheckCircle2, Mail, PenTool, ArrowRight, Award
} from 'lucide-react';

export default function AdminLogsheetWaitingCertificate() {
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
      const allLogs = res.data?.data || res.data || [];
      // Filter logsheets in "Waiting For Certificate" status (or Signed/Completed)
      const waitingLogs = allLogs.filter(l => l.status === 'Waiting For Certificate' || l.status === 'Signed');
      setLogsheets(waitingLogs);
    } catch (err) {
      toast.error('Failed to load completed logsheets');
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
    if (!window.confirm('Are you sure you want to delete this logsheet record? This action cannot be undone.')) return;
    try {
      await api.delete(`/api/application-logsheets/${id}`);
      toast.success('Logsheet deleted successfully');
      fetchLogsheets();
    } catch (err) {
      toast.error(err.message || 'Failed to delete logsheet');
    }
  };

  const getSignatoryProgress = (l) => {
    const signers = [
      { role: 'Mufti', signed: !!l.mufti_signature },
      { role: 'CEO', signed: !!l.ceo_signature },
      { role: 'Manager', signed: !!l.manager_signature },
      { role: 'Mufti 2', signed: !!l.mufti2_signature },
    ];
    const count = signers.filter(s => s.signed).length;
    return { count, total: 4, signers };
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1280, margin: '0 auto' }}>
      <style>{`
        .logsheet-table tr {
          transition: background-color 0.15s ease;
        }
        .logsheet-table tr:hover {
          background-color: #f8fafc !important;
        }
        .logsheet-search-input:focus, .logsheet-select:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.1) !important;
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
      `}</style>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Logsheets</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>Waiting for Certificate</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={24} style={{ color: '#16a34a' }} />
            Waiting for Certificate
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Completed logsheets with 3+ signatures awaiting final certificate issuance.
          </p>
        </div>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={fetchLogsheets} 
          disabled={loading} 
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 14px', background: '#fff' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Reload
        </button>
      </div>

      {/* Main Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        {/* Summary & Filters Header Bar */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%)',
          borderBottom: '1px solid #bbf7d0',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#14532d' }}>Logsheets Done</span>
            <span style={{
              borderRadius: 20,
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: 600,
              background: '#dcfce7',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}>
              <CheckCircle2 size={12} />
              {filteredLogsheets.length} {filteredLogsheets.length === 1 ? 'Logsheet Completed' : 'Logsheets Completed'}
            </span>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1', maxWidth: 500, minWidth: 280 }}>
            <div style={{ position: 'relative', width: 160 }}>
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
                  fontWeight: 500,
                  color: '#334155',
                  border: '1px solid #bbf7d0'
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
                style={{
                  paddingLeft: 34,
                  height: 38,
                  fontSize: 13,
                  borderRadius: 8,
                  background: 'white',
                  border: '1px solid #bbf7d0'
                }}
              />
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {/* Content View */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px', width: 28, height: 28 }} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading completed logsheets...</div>
          </div>
        ) : filteredLogsheets.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CheckCircle2 size={24} style={{ color: '#16a34a' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {searchQuery ? 'No matching logsheets found' : 'No logsheets waiting for certificate'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 400, margin: '4px auto 0' }}>
              {searchQuery 
                ? 'Try adjusting your search query or filter criteria.' 
                : 'Logsheets marked done (with 3+ signatures) will appear here in this holding view.'}
            </div>
          </div>
        ) : (
          <div>
            <table className="table logsheet-table desktop-only-table" style={{ width: '100%', margin: 0, fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Company &amp; Facility</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Contact Person</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Signatures</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Completed Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogsheets.map((l) => {
                  const appId = l.application_id?._id || l.application_id;
                  const { count, total } = getSignatoryProgress(l);

                  return (
                    <tr key={l._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{l.company_name || 'Company Facility'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <MapPin size={11} />
                          {l.site_name || l.site_id?.name || l.application_id?.site_name || l.establishment_name || 'Main Site'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{l.contact_person || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.contact_email}</div>
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800,
                          background: count >= 4 ? '#dcfce7' : '#eff6ff',
                          color: count >= 4 ? '#15803d' : '#1d4ed8',
                          border: `1px solid ${count >= 4 ? '#bbf7d0' : '#bfdbfe'}`
                        }}>
                          <PenTool size={11} /> {count}/{total} Signed
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} /> Waiting For Certificate
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: 12, color: '#475569' }}>
                        {l.updated_at ? new Date(l.updated_at).toLocaleDateString('en-GB') : 'Recently'}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <Link 
                            to={l.source_type === 'addon_application' || l.addon_application_id
                              ? `/addon-applications/${l.addon_application_id?._id || l.addon_application_id}/logsheet`
                              : `/applications/${l.application_id?._id || l.application_id}/logsheet`}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Eye size={13} /> View Logsheet
                          </Link>
                          <Link 
                            to={l.source_type === 'addon_application' || l.addon_application_id
                              ? `/addon-applications/${l.addon_application_id?._id || l.addon_application_id}/processing`
                              : `/applications/${appId}/processing`}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            Go to Issue Certificate <ArrowRight size={13} />
                          </Link>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#dc2626', padding: '5px 8px' }}
                            onClick={(e) => handleDelete(l._id, e)}
                            title="Delete Logsheet"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
