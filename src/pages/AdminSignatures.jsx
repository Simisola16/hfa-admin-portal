import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Search, UploadCloud, Plus, MoreVertical, Trash2, PenTool } from 'lucide-react';
import { getPdfUrl } from '../lib/pdfUtils';

export default function AdminSignatures() {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({ name: '', username: '', file: null });
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Dropdown Action state
  const [openDropdown, setOpenDropdown] = useState(null);

  const fetchSignatures = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/signatures${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setSignatures(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.error('Failed to load signatures');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const res = await api.get('/api/users');
      const allUsers = res.data?.data || res.data || [];
      const staff = allUsers.filter(u => u.role !== 'client');
      setStaffUsers(staff);
    } catch (err) {
      console.error('Failed to fetch staff users', err);
    }
  };

  useEffect(() => {
    fetchSignatures();
  }, [search]);

  useEffect(() => {
    fetchStaffUsers();
  }, []);

  const handleStaffSelect = (e) => {
    const val = e.target.value;
    setSelectedStaffId(val);
    if (val === 'custom') {
      setFormData(prev => ({ ...prev, name: '', username: '' }));
    } else if (val) {
      const user = staffUsers.find(u => u._id === val);
      if (user) {
        // Extract prefix from email as username, e.g. "mufti" from "mufti@hfa.com"
        const emailPrefix = user.email ? user.email.split('@')[0] : '';
        setFormData(prev => ({ 
          ...prev, 
          name: user.full_name || '', 
          username: emailPrefix || user.email || '' 
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, name: '', username: '' }));
    }
  };

  const handleNameChange = (e) => {
    const nameVal = e.target.value;
    setFormData(prev => {
      const updated = { ...prev, name: nameVal };
      if (selectedStaffId === 'custom') {
        updated.username = nameVal.toLowerCase().replace(/\s+/g, '');
      }
      return updated;
    });
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file for the signature.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be under 5MB');
        return;
      }
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username) {
      toast.error('Name and Username are required');
      return;
    }
    if (!formData.file) {
      toast.error('Please upload a signature image');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('username', formData.username);
      data.append('signature_file', formData.file);

      await api.post('/api/signatures', data, true); // true for multipart
      toast.success('Signature added successfully');
      setFormData({ name: '', username: '', file: null });
      setSelectedStaffId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchSignatures();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to add signature');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this signature?')) return;
    try {
      await api.delete(`/api/signatures/${id}`);
      toast.success('Signature deleted');
      fetchSignatures();
    } catch (err) {
      toast.error('Failed to delete signature');
    }
  };

  return (
    <div className="animate-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '24px' }}>
        <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '12px', borderRadius: '12px', display: 'flex' }}>
          <PenTool size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#0f172a' }}>Manage Signatures</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Upload and manage digital signatures for users and auditors</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* ADD SIGNATURE FORM */}
        <div className="card shadow-sm border-0" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} style={{ color: 'var(--primary)' }} /> Add New Signature
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Username</label>
              <select
                className="form-control"
                style={{ background: '#f8fafc', fontSize: 13, fontWeight: 500 }}
                value={selectedStaffId}
                onChange={handleStaffSelect}
              >
                <option value="">-- Choose Staff Member --</option>
                {staffUsers.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.full_name || user.email} ({user.role})
                  </option>
                ))}
                <option value="custom">-- Custom Name / Role --</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleNameChange}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Signature Image</label>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn"
                style={{ 
                  width: '100%', 
                  background: formData.file ? '#f0fdf4' : '#f8fafc', 
                  border: `2px dashed ${formData.file ? '#86efac' : '#cbd5e1'}`, 
                  color: formData.file ? '#166534' : '#475569',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <UploadCloud size={24} style={{ color: formData.file ? '#22c55e' : '#94a3b8' }} />
                <span style={{ fontSize: 13, fontWeight: formData.file ? 600 : 500 }}>
                  {formData.file ? formData.file.name : 'Click to Upload Image'}
                </span>
              </button>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={submitting}
            >
              {submitting ? <div className="spinner-white" style={{ width: 16, height: 16 }} /> : <Plus size={16} />}
              {submitting ? 'Adding...' : 'Add Signature'}
            </button>
          </form>
        </div>

        {/* SIGNATURES LIST */}
        <div className="card shadow-sm border-0">
          <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1e293b' }}>Signatures List</h3>
            <div className="search-box" style={{ width: '250px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Search size={14} className="search-icon" style={{ color: '#94a3b8' }} />
              <input 
                placeholder="Search signatures..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ background: 'transparent', fontSize: 13 }}
              />
            </div>
          </div>
          
          <div className="table-wrap">
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : signatures.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <PenTool size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <div style={{ fontWeight: 600, color: '#475569', fontSize: 15 }}>No signatures found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Add a new signature using the form.</div>
              </div>
            ) : (
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>ID</th>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Signature</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {signatures.map(sig => (
                    <tr key={sig._id} className="hover-row">
                      <td style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                        {sig._id.substring(sig._id.length - 6).toUpperCase()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{sig.name}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: '#475569', background: '#f1f5f9', display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontWeight: 500 }}>
                          {sig.username}
                        </div>
                      </td>
                      <td>
                        {sig.signature_url ? (
                          <div style={{ 
                            background: '#f8fafc', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '8px', 
                            padding: '8px', 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '50px',
                            minWidth: '100px'
                          }}>
                            <img 
                              src={getPdfUrl(sig.signature_url)} 
                              alt={`${sig.name}'s signature`} 
                              style={{ maxHeight: '100%', maxWidth: '120px', objectFit: 'contain' }}
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                            />
                            <span style={{ display: 'none', fontSize: 12, color: '#ef4444' }}>Invalid Image</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No image</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-dropdown" style={{ position: 'relative', display: 'inline-block' }}>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ padding: '6px', color: '#64748b' }}
                            onClick={() => setOpenDropdown(openDropdown === sig._id ? null : sig._id)}
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {openDropdown === sig._id && (
                            <div className="shadow-sm" style={{
                              position: 'absolute',
                              right: '100%',
                              top: 0,
                              background: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '4px',
                              zIndex: 10,
                              minWidth: '120px'
                            }}>
                              <button 
                                className="btn btn-ghost btn-sm" 
                                style={{ width: '100%', textAlign: 'left', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start', padding: '8px 12px' }}
                                onClick={() => { setOpenDropdown(null); handleDelete(sig._id); }}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
