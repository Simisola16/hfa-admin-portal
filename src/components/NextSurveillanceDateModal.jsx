import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, Building2, MapPin, FileText, User, Edit2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function NextSurveillanceDateModal({
  isOpen,
  onClose,
  onConfirm,
  app,
  submitting = false
}) {
  const { user, profile } = useAuth();
  
  const defaultAdminName =
    user?.full_name ||
    profile?.full_name ||
    user?.name ||
    profile?.name ||
    user?.username ||
    profile?.username ||
    'Admin';

  // Calculate default due date: 1 year from today (YYYY-MM-DD)
  const getDefaultDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const [dueDate, setDueDate] = useState(getDefaultDate());
  const [adminName, setAdminName] = useState(defaultAdminName);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [fetchedCompanyName, setFetchedCompanyName] = useState('');
  const [customCompanyName, setCustomCompanyName] = useState('');
  const [isEditingCompany, setIsEditingCompany] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDueDate(getDefaultDate());
      setAdminName(defaultAdminName);
      setNotes('');
      setError('');
      setIsEditingCompany(false);
    }
  }, [isOpen, defaultAdminName]);

  const siteName =
    app?.site_name ||
    app?.establishment_name ||
    app?.site_id?.site_name ||
    app?.site_id?.name ||
    app?.establishment_address ||
    app?.site_address ||
    'Main Facility / Site';

  useEffect(() => {
    if (!isOpen || !app) return;

    const rawSite = String(
      app?.site_name ||
      app?.establishment_name ||
      app?.site_id?.site_name ||
      app?.site_id?.name ||
      ''
    ).trim().toLowerCase();

    const isSiteColliding = (str) => {
      if (!str) return true;
      return String(str).trim().toLowerCase() === rawSite;
    };

    const directCompany = (
      (app?.profiles?.company_name && !isSiteColliding(app.profiles.company_name) ? app.profiles.company_name : '') ||
      (app?.client_id?.company_name && !isSiteColliding(app.client_id.company_name) ? app.client_id.company_name : '') ||
      (app?.client?.company_name && !isSiteColliding(app.client.company_name) ? app.client.company_name : '') ||
      (app?.profile?.company_name && !isSiteColliding(app.profile.company_name) ? app.profile.company_name : '') ||
      (app?.user?.company_name && !isSiteColliding(app.user.company_name) ? app.user.company_name : '') ||
      (app?.company_name && !isSiteColliding(app.company_name) ? app.company_name : '')
    );

    if (directCompany) {
      setFetchedCompanyName(directCompany);
      setCustomCompanyName(directCompany);
      return;
    }

    const clientId = typeof app.client_id === 'string'
      ? app.client_id
      : (app.client_id?._id || app.profiles?._id);

    if (clientId) {
      api.get(`/api/users/${clientId}`)
        .then(res => {
          const u = res.data?.data || res.data;
          const comp = u?.company_name || u?.full_name;
          if (comp) {
            setFetchedCompanyName(comp);
            setCustomCompanyName(comp);
          }
        })
        .catch(() => {});
    } else if (app.site_id) {
      const siteId = typeof app.site_id === 'string' ? app.site_id : app.site_id?._id;
      if (siteId) {
        api.get(`/api/sites/${siteId}`)
          .then(res => {
            const s = res.data?.data || res.data;
            if (s?.client_id?.company_name && !isSiteColliding(s.client_id.company_name)) {
              setFetchedCompanyName(s.client_id.company_name);
              setCustomCompanyName(s.client_id.company_name);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, app]);

  if (!isOpen) return null;

  const resolvedBaseCompany =
    (fetchedCompanyName && fetchedCompanyName.trim().toLowerCase() !== siteName.trim().toLowerCase() ? fetchedCompanyName : '') ||
    (app?.profiles?.company_name && app.profiles.company_name.trim().toLowerCase() !== siteName.trim().toLowerCase() ? app.profiles.company_name : '') ||
    (app?.client_id?.company_name && app.client_id.company_name.trim().toLowerCase() !== siteName.trim().toLowerCase() ? app.client_id.company_name : '') ||
    (app?.client?.company_name && app.client.company_name.trim().toLowerCase() !== siteName.trim().toLowerCase() ? app.client.company_name : '') ||
    (app?.profile?.company_name && app.profile.company_name.trim().toLowerCase() !== siteName.trim().toLowerCase() ? app.profile.company_name : '') ||
    (app?.user?.company_name && app.user.company_name.trim().toLowerCase() !== siteName.trim().toLowerCase() ? app.user.company_name : '') ||
    (app?.company_name && app.company_name.trim().toLowerCase() !== siteName.trim().toLowerCase() ? app.company_name : '') ||
    fetchedCompanyName ||
    app?.profiles?.company_name ||
    app?.client_id?.company_name ||
    app?.client?.company_name ||
    app?.profile?.company_name ||
    app?.user?.company_name ||
    app?.profiles?.full_name ||
    app?.client_id?.full_name ||
    app?.company_name ||
    'N/A';

  const companyName = customCompanyName.trim() || resolvedBaseCompany;

  const appNumber = app?.application_number || 'N/A';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dueDate) {
      setError('Please select the next surveillance due date.');
      return;
    }
    if (!adminName.trim()) {
      setError('Please provide the admin name.');
      return;
    }

    onConfirm({
      next_surveillance_due_date: dueDate,
      admin_name: adminName.trim(),
      notes: notes.trim(),
      company_name: companyName,
      site_name: siteName
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            color: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Calendar size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#ffffff' }}>
                Next Surveillance Due Date
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#a7f3d0' }}>
                GSO Logsheet Completion & Certification Schedule
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: 0.85,
              padding: 4
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '13px',
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Application Info Badge */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Company Name
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingCompany(!isEditingCompany)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: '#059669',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title={isEditingCompany ? 'Done' : 'Edit Company Name'}
                  >
                    {isEditingCompany ? <Check size={12} /> : <Edit2 size={11} />}
                    {isEditingCompany ? 'Done' : 'Edit'}
                  </button>
                </div>
                {isEditingCompany ? (
                  <input
                    type="text"
                    value={customCompanyName}
                    onChange={(e) => setCustomCompanyName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1.5px solid #059669',
                      marginTop: '3px',
                      boxSizing: 'border-box',
                      color: '#1e293b',
                      fontWeight: 600
                    }}
                    placeholder="Enter company name"
                    autoFocus
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                    <Building2 size={14} color="#065f46" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                      {companyName}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Site / Facility
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <MapPin size={14} color="#065f46" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    {siteName}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Application #
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <FileText size={14} color="#64748b" />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
                    {appNumber}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Admin Recording
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <User size={14} color="#64748b" />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
                    {adminName || 'Admin'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Prompt description */}
          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', lineHeight: 1.5 }}>
            To mark this application as <strong>Successful</strong>, please set the <strong>Next Surveillance Application Due Date</strong>. This will be automatically recorded in the Surveillance Due Dates registry.
          </p>

          {/* Next Surveillance Date Input */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px'
              }}
            >
              Next Surveillance Due Date <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                if (error) setError('');
              }}
              required
              disabled={submitting}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => (e.target.style.borderColor = '#059669')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />
          </div>

          {/* Admin Name Input */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px'
              }}
            >
              Admin Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => {
                setAdminName(e.target.value);
                if (error) setError('');
              }}
              required
              disabled={submitting}
              placeholder="e.g. John Doe"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => (e.target.style.borderColor = '#059669')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />
          </div>

          {/* Notes (Optional) */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px'
              }}
            >
              Notes / Audit Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="e.g. Scheduled following successful committee logsheet sign-off..."
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '13px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              onFocus={(e) => (e.target.style.borderColor = '#059669')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#475569',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 22px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'opacity 0.2s'
              }}
            >
              {submitting ? 'Saving...' : 'Save & Mark Successful'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
