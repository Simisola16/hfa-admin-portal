import React, { useState } from 'react';
import {
  X,
  Building2,
  User,
  Users,
  Phone,
  Mail,
  CheckCircle,
  AlertTriangle,
  Shield,
  Factory,
  Briefcase,
  Calendar,
  Globe,
  MapPin,
  Clock,
  ClipboardList,
  Check,
  HelpCircle,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

export default function ApplicationSubmissionModal({ isOpen, onClose, app }) {
  if (!isOpen || !app) return null;

  const [activeTab, setActiveTab] = useState('all');

  const companyName = app.profiles?.company_name || app.establishment_name || app.company_name || 'Company Facility';

  const formatBool = (val) => {
    if (val === true || val === 'yes' || val === 'true') return 'Yes';
    if (val === false || val === 'no' || val === 'false') return 'No';
    return val || '—';
  };

  const hasMfrDetails = Boolean(
    app.is_manufacturer === 'no' ||
    app.mfr_name ||
    app.manufacturer_name ||
    app.mfr_address ||
    app.manufacturer_address ||
    app.mfr_reg_number ||
    app.mfr_vat ||
    app.mfr_email
  );

  const sections = [
    { id: 'all', label: 'All Sections' },
    { id: 'sec-a', label: 'Section A: Company Details', short: 'Sec A' },
    { id: 'sec-b', label: 'Section B: Site Details', short: 'Sec B' },
    { id: 'sec-c', label: 'Section C: Manufacturer', short: 'Sec C' },
    { id: 'sec-d', label: 'Section D: Contact Details', short: 'Sec D' },
    { id: 'sec-e', label: 'Section E: Process / Products', short: 'Sec E' }
  ];

  const scrollToSection = (id) => {
    setActiveTab(id);
    if (id === 'all') {
      const body = document.getElementById('submission-modal-body');
      if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Products array for count fallback
  const productsList = Array.isArray(app.products) ? app.products : [];

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 1150, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{
          maxWidth: 1040,
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 18,
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.3)',
          background: '#f8fafc',
          fontFamily: "'Inter', sans-serif"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 32px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(6, 95, 70, 0.2)'
              }}
            >
              <ClipboardList size={24} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Application Submission Details — {companyName}
              </div>
              <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '1px 8px', borderRadius: 4 }}>
                  {app.application_number}
                </span>
                <span>•</span>
                <span>Submitted: <strong>{app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</strong></span>
                <span>•</span>
                <span style={{ textTransform: 'capitalize', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11, color: '#475569' }}>
                  {app.application_type || 'New'} Application
                </span>
                {app.category && (
                  <>
                    <span>•</span>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                      {app.category}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 10,
              transition: 'all 0.15s'
            }}
          >
            <X size={19} />
          </button>
        </div>

        {/* Section Quick Jump Bar */}
        <div
          style={{
            padding: '10px 32px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginRight: 4, whiteSpace: 'nowrap' }}>
            Jump to:
          </span>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              style={{
                border: 'none',
                background: activeTab === s.id ? '#065f46' : '#f1f5f9',
                color: activeTab === s.id ? '#ffffff' : '#475569',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: activeTab === s.id ? 700 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div
          id="submission-modal-body"
          style={{ padding: '28px 32px', overflowY: 'auto', flex: 1, display: 'grid', gap: 24 }}
        >

          {/* ══════════════════════════════════════════════════════════
              SECTION A: Company Details
          ══════════════════════════════════════════════════════════ */}
          <div
            id="sec-a"
            style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', color: '#065f46', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 8 }}>
                  Section A
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>Company Details</div>
              </div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Legal &amp; General Entity Information</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Select Business Site</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{app.site_name || app.establishment_name || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Certification Category / Scheme</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#065f46', marginTop: 3 }}>{app.category || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Name of the Establishment</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{app.establishment_name || app.profiles?.company_name || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Manufacturer of Halal Products?</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>
                  {app.is_manufacturer === 'yes' ? (
                    <span style={{ color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 4 }}>✓ Yes (Direct Manufacturer)</span>
                  ) : app.is_manufacturer === 'no' ? (
                    <span style={{ color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 4 }}>⚠ No (Brand Owner / Subcontractor)</span>
                  ) : formatBool(app.is_manufacturer)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Company Registration Number</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>{app.company_reg_number || app.reg_number || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>VAT Registration Number</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>{app.vat_number || '—'}</div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Company Head Office Address</div>
                <div style={{ fontSize: 13, color: '#334155', marginTop: 3, lineHeight: 1.5, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  {app.establishment_address || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SECTION B: Site / Factory Details
          ══════════════════════════════════════════════════════════ */}
          <div
            id="sec-b"
            style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1d4ed8', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 8 }}>
                  Section B
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>Site / Factory Details</div>
              </div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Manufacturing Plant &amp; Operational Specifications</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Site / Factory Address</div>
                <div style={{ fontSize: 13, color: '#334155', marginTop: 3, lineHeight: 1.5, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  {app.site_address || app.establishment_address || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Years in Business / Production</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>{app.years_in_business || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Trading Name (if different)</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>{app.trading_name || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Company Email Address</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>
                  {app.company_email || app.profiles?.email ? (
                    <a href={`mailto:${app.company_email || app.profiles?.email}`} style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Mail size={13} /> {app.company_email || app.profiles?.email}
                    </a>
                  ) : '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Number of Employees on Site</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>
                  {app.employee_count ? `${app.employee_count} staff` : '—'}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Company Website Address</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>
                  {app.website ? (
                    <a href={app.website.startsWith('http') ? app.website : `https://${app.website}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Globe size={13} /> {app.website}
                    </a>
                  ) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SECTION C: Manufacturer Details (when different)
          ══════════════════════════════════════════════════════════ */}
          <div
            id="sec-c"
            style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', color: '#c2410c', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 8 }}>
                  Section C
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>Manufacturer Details</div>
              </div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                {hasMfrDetails ? 'Separate Co-packer / Manufacturer Specified' : 'Same as Company / Not Applicable'}
              </span>
            </div>

            {hasMfrDetails ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Name of Manufacturer Establishment</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{app.mfr_name || app.manufacturer_name || '—'}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Trading Name (if different)</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>{app.mfr_trading_name || '—'}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Number of Years in Business</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>{app.mfr_years || '—'}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>No. of Manufacturer Employees</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>{app.mfr_employees ? `${app.mfr_employees} staff` : '—'}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Manufacturer Email</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>
                    {app.mfr_email ? <a href={`mailto:${app.mfr_email}`} style={{ color: '#2563eb' }}>{app.mfr_email}</a> : '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Manufacturer Website Address</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>
                    {app.mfr_website ? (
                      <a href={app.mfr_website.startsWith('http') ? app.mfr_website : `https://${app.mfr_website}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                        {app.mfr_website}
                      </a>
                    ) : '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Manufacturer Company Reg. No.</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>{app.mfr_reg_number || '—'}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Manufacturer VAT Number</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>{app.mfr_vat || '—'}</div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Manufacturer Full Address</div>
                  <div style={{ fontSize: 13, color: '#334155', marginTop: 3, lineHeight: 1.5, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    {app.mfr_address || app.manufacturer_address || '—'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1', color: '#64748b', fontSize: 13 }}>
                Applicant indicated they are the direct manufacturer of the products. No separate manufacturer facility details required.
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════
              SECTION D: Official Contact Details
          ══════════════════════════════════════════════════════════ */}
          <div
            id="sec-d"
            style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#fdf4ff', border: '1.5px solid #e9d5ff', color: '#7e22ce', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 8 }}>
                  Section D
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>Official Contact Details</div>
              </div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Primary, Technical, Finance &amp; Production Contacts</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
              {/* Primary Contact Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#7e22ce', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={15} /> Primary Contact Details
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  {app.primary_contact_name || app.managing_director || app.profiles?.full_name || '—'}
                </div>
                {app.signatory_position && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Position: {app.signatory_position}</div>
                )}
                <div style={{ display: 'grid', gap: 6, marginTop: 10, fontSize: 12.5, color: '#475569' }}>
                  {(app.primary_work_tel || app.profiles?.phone) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} style={{ color: '#64748b' }} /> Work: <strong>{app.primary_work_tel || app.profiles?.phone}</strong>
                    </div>
                  )}
                  {app.primary_mobile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} style={{ color: '#64748b' }} /> Mobile: <strong>{app.primary_mobile}</strong>
                    </div>
                  )}
                  {(app.primary_email || app.profiles?.email) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Mail size={13} style={{ color: '#64748b' }} /> Email: <a href={`mailto:${app.primary_email || app.profiles?.email}`} style={{ color: '#2563eb' }}>{app.primary_email || app.profiles?.email}</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Technical / Halal Coordinator Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0284c7', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={15} /> Technical Contact Details
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  {app.halal_coordinator || '—'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Role: Halal Coordinator / QA Manager</div>
                <div style={{ display: 'grid', gap: 6, marginTop: 10, fontSize: 12.5, color: '#475569' }}>
                  {app.tech_work_tel && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} style={{ color: '#64748b' }} /> Work: <strong>{app.tech_work_tel}</strong>
                    </div>
                  )}
                  {app.tech_mobile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} style={{ color: '#64748b' }} /> Mobile: <strong>{app.tech_mobile}</strong>
                    </div>
                  )}
                  {app.qa_contact && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Mail size={13} style={{ color: '#64748b' }} /> QA Email: <a href={`mailto:${app.qa_contact}`} style={{ color: '#2563eb' }}>{app.qa_contact}</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Finance & Production Contacts */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#059669', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Briefcase size={15} /> Finance &amp; Production Contacts
                </div>
                <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Finance Contact</div>
                    <div style={{ color: '#0f172a', fontWeight: 600, marginTop: 2 }}>{app.finance_contact || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Production Contact</div>
                    <div style={{ color: '#0f172a', fontWeight: 600, marginTop: 2 }}>{app.production_contact || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SECTION E: Process / Product Details (Questions 1 to 17)
          ══════════════════════════════════════════════════════════ */}
          <div
            id="sec-e"
            style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', color: '#be123c', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 8 }}>
                  Section E
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>Process / Product Details &amp; Declarations</div>
              </div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Official Questions 1 to 17</span>
            </div>

            <div style={{ display: 'grid', gap: 18 }}>

              {/* 1. Nature of Business */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                  1. Nature of the Business
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Food Manufacturers</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>
                      {app.food_nature ? (
                        app.food_nature === 'Other' && app.food_nature_other ? `Other — ${app.food_nature_other}` : app.food_nature
                      ) : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Non-Food Manufacturers</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>
                      {app.nonfood_nature ? (
                        app.nonfood_nature === 'Other' && app.nonfood_nature_other ? `Other — ${app.nonfood_nature_other}` : app.nonfood_nature
                      ) : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 to 5: Type, Export, GSO History, Refusal */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>2. Type of Business</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>
                    {app.business_type ? (
                      app.business_type === 'Other' && app.business_type_other ? `Other — ${app.business_type_other}` : app.business_type
                    ) : '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>3. Export Purposes Only?</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{formatBool(app.export_only)}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>4. Previous GSO/UAE Application?</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{formatBool(app.prev_gso_app)}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>5. Previously Refused Certification?</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: app.prev_refused === 'yes' ? '#dc2626' : '#0f172a', marginTop: 3 }}>
                    {formatBool(app.prev_refused)}
                  </div>
                </div>
              </div>

              {/* 6 to 10: Scope, Brand, Counts, Halal Schedule */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'grid', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>6. Product Category / Description</div>
                  <div style={{ fontSize: 13, color: '#1e293b', marginTop: 4, lineHeight: 1.5, background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    {app.scope || 'No specific product description provided.'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>7. Brand Name (if any)</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{app.brand_name || '—'}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>8. No. of Products Processed on Site</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>{app.products_on_site_count || '—'}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>9. No. of Products for Halal Approval</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#065f46', marginTop: 3 }}>{app.products_halal_count || (productsList.length || '—')}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>10. Schedule for Halal Production</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 3 }}>{app.halal_schedule || app.production_schedule || '—'}</div>
                  </div>
                </div>
              </div>

              {/* 11 & 12: Porcine & Intoxicants */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {/* 11. Pork / Porcine */}
                <div style={{ background: app.has_porcine ? '#fef2f2' : '#f0fdf4', border: `1.5px solid ${app.has_porcine ? '#fca5a5' : '#bbf7d0'}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: app.has_porcine ? '#991b1b' : '#166534' }}>
                    11. Pork / Porcine Material on Site?
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: app.has_porcine ? '#dc2626' : '#15803d', marginTop: 4 }}>
                    {app.has_porcine ? 'YES — Porcine Handled on Premises' : 'NO — Free of Porcine Material'}
                  </div>
                  {app.porcine_details && (
                    <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 8, lineHeight: 1.4, background: 'rgba(255,255,255,0.7)', padding: 10, borderRadius: 8 }}>
                      <strong>Segregation &amp; Controls:</strong> {app.porcine_details}
                    </div>
                  )}
                </div>

                {/* 12. Intoxicants */}
                <div style={{ background: app.has_intoxicants ? '#fffbeb' : '#f0fdf4', border: `1.5px solid ${app.has_intoxicants ? '#fde68a' : '#bbf7d0'}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: app.has_intoxicants ? '#92400e' : '#166534' }}>
                    12. Intoxicants Used as Ingredient?
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: app.has_intoxicants ? '#d97706' : '#15803d', marginTop: 4 }}>
                    {app.has_intoxicants ? 'YES — Intoxicants Used on Premises' : 'NO — Free of Intoxicants'}
                  </div>
                  {app.intoxicants_details && (
                    <div style={{ fontSize: 12, color: '#78350f', marginTop: 8, lineHeight: 1.4, background: 'rgba(255,255,255,0.7)', padding: 10, borderRadius: 8 }}>
                      <strong>Usage &amp; Description:</strong> {app.intoxicants_details}
                    </div>
                  )}
                </div>
              </div>

              {/* 13 & 14: Logo & Referral Source */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>13. Willing to Depict HFA Logo on Products?</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{formatBool(app.use_hfa_logo)}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>14. How Did You Hear About Us?</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{app.referral_source || '—'}</div>
                </div>
              </div>

              {/* 15 to 17: Signatory Details & Declaration */}
              <div style={{ background: '#f0fdf4', border: '1.5px solid #a7f3d0', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#065f46', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} /> Declaration &amp; Legal Authorization (Questions 15 – 17)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#065f46' }}>15. Name of Signatory</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{app.managing_director || app.primary_contact_name || '—'}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#065f46' }}>16. Position / Title</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{app.signatory_position || 'Authorized Representative'}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#065f46' }}>17. Date of Declaration</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                      {app.signatory_date ? new Date(app.signatory_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB') : '—')}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.85)', padding: '12px 16px', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 12.5, color: '#065f46', lineHeight: 1.5, fontWeight: 600 }}>
                  ✓ "I hereby declare that all information provided in this application is true, complete, and correct to the best of my knowledge and I agree to comply with all HFA certification requirements."
                  <span style={{ display: 'block', marginTop: 4, fontWeight: 800, color: '#15803d' }}>
                    Status: {app.declared_true ? 'Signed & Confirmed True by Applicant' : 'Pending Signature'}
                  </span>
                </div>
              </div>

              {app.notes && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Additional Applicant Notes</div>
                  <div style={{ fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {app.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 32px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Displaying complete submission data for <strong>{app.application_number}</strong>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontWeight: 800, padding: '8px 22px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
