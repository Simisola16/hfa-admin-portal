import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  FileText, Search, Trash2, Eye, CheckSquare, RefreshCw, ChevronDown, 
  MapPin, User, Calendar, Tag, Shield, Clock, CheckCircle2 
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
        <button className="btn btn-ghost" onClick={fetchLogsheets} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Reload
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'visible' }}>
        
        {/* Filters Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Logsheet List</span>
            <span className="badge badge-blue" style={{ borderRadius: '20px', padding: '3px 8px', fontSize: '11px', fontWeight: 700 }}>
              {filteredLogsheets.length} Active
            </span>
          </div>

          {/* Legacy Search Row Replication */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '500px' }}>
            <div style={{ position: 'relative', width: '160px' }}>
              <select 
                className="form-control"
                value={searchField}
                onChange={e => setSearchField(e.target.value)}
                style={{ paddingRight: '32px', height: '38px', fontSize: '13px', cursor: 'pointer', background: 'white' }}
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
                className="form-control"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', background: 'white' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="table-wrap" style={{ overflowX: 'auto', overflowY: 'visible', minHeight: '300px' }}>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ID</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Company Name</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact Person</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Created By</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Site</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>App Type</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Logsheet Type</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogsheets.map(l => (
                  <tr key={l._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', hover: { background: '#f8fafc' } }}>
                    {/* Logsheet ID */}
                    <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                      {l.application_id?.application_number || l._id?.slice(-6).toUpperCase()}
                    </td>
                    
                    {/* Company Name */}
                    <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {l.company_name}
                    </td>

                    {/* Contact Person */}
                    <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <div style={{ fontWeight: 500 }}>{l.contact_person || '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.contact_email}</div>
                    </td>

                    {/* Created By */}
                    <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-primary)' }}>
                      {l.reviewer_name || 'Admin'}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '16px 24px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(l.created_at).toLocaleDateString('en-GB')}
                    </td>

                    {/* Site */}
                    <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <MapPin size={13} style={{ color: 'var(--text-muted)', minWidth: '13px' }} />
                        {l.manufacturing_address || 'Main Site'}
                      </div>
                    </td>

                    {/* App Type */}
                    <td style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      {l.application_id?.category || '—'}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`badge ${getStatusBadgeClass(l.status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {l.status === 'Waiting for Signature' ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                        {l.status}
                      </span>
                    </td>

                    {/* Logsheet Type */}
                    <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4f46e5' }}>
                        <Tag size={12} />
                        {l.audit_type || 'Initial'}
                      </span>
                    </td>

                    {/* Legacy Popover Dropdown Action Row */}
                    <td style={{ padding: '16px 24px', textAlign: 'center', position: 'relative' }}>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === l._id ? null : l._id);
                        }}
                        style={{ padding: '4px 8px', borderRadius: '4px' }}
                      >
                        Action <ChevronDown size={14} style={{ marginLeft: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                      </button>

                      {/* Dropdown Menu */}
                      {activeDropdown === l._id && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            right: '24px', 
                            top: '48px', 
                            background: 'white', 
                            border: '1px solid var(--border)', 
                            borderRadius: '8px', 
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            zIndex: 100, 
                            minWidth: '150px',
                            padding: '6px'
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Details Icon */}
                          <Link 
                            to={`/applications/${l.application_id?._id || l.application_id}/logsheet`}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              padding: '10px 12px', 
                              fontSize: '13px', 
                              color: '#2563eb', 
                              textDecoration: 'none', 
                              borderRadius: '6px', 
                              background: 'transparent',
                              transition: 'background 0.2s',
                              hover: { background: '#f0f9ff' }
                            }}
                            className="dropdown-item"
                          >
                            <Eye size={14} /> Details
                          </Link>

                          {/* Done/Sign Icon */}
                          {l.status === 'Waiting for Signature' && (
                            <button 
                              onClick={(e) => handleMarkAsDone(l._id, l.status, e)}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                width: '100%',
                                border: 'none',
                                textAlign: 'left',
                                padding: '10px 12px', 
                                fontSize: '13px', 
                                color: '#16a34a', 
                                borderRadius: '6px', 
                                background: 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                              }}
                              className="dropdown-item"
                            >
                              <CheckSquare size={14} /> Mark as Signed
                            </button>
                          )}

                          {/* Delete Icon */}
                          <button 
                            onClick={(e) => handleDelete(l._id, e)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              width: '100%',
                              border: 'none',
                              textAlign: 'left',
                              padding: '10px 12px', 
                              fontSize: '13px', 
                              color: '#dc2626', 
                              borderRadius: '6px', 
                              background: 'transparent',
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }}
                            className="dropdown-item"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
