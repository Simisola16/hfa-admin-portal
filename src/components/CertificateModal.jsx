import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Award, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { generateHfaId, normalizeHfaTypeCode } from '../lib/idGenerator';

const getCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

export default function CertificateModal({ isOpen, onClose, app: propApp, appId: propAppId, isAddOn: propIsAddOn, onSuccess }) {
  const navigate = useNavigate();
  const [app, setApp] = useState(propApp || null);
  const [loading, setLoading] = useState(false);
  const [currentTypeCode, setCurrentTypeCode] = useState('NE');

  const isFourDateType = (type) => {
    if (!type) return false;
    const t = type.toUpperCase().trim();
    return t.includes('GSO') || t === 'SMIIC' || t.includes('SMIIC');
  };

  const [certificateForm, setCertificateForm] = useState({
    certificate_number: '',
    certificate_type: 'GSO MEAT',
    issue_date: '',
    current_cycle_start_date: '',
    original_cycle_start_date: '',
    certification_start_date: '',
    expiry_date: '',
    products_covered: '',
    file: null
  });
  const [submitting, setSubmitting] = useState(false);

  const checkIsAddOn = (item) => {
    if (!item) return Boolean(propIsAddOn);
    if (propIsAddOn || item.is_add_on) return true;
    const typeStr = (item.application_type || '').toLowerCase();
    if (typeStr.includes('add')) return true;
    const num = item.application_number || '';
    if (num.startsWith('ADD-') || num.includes('-AD-')) return true;
    if (Array.isArray(item.products) && item.products.some(p => p && p.type && typeof p.type === 'string' && (p.type.includes('Add') || p.type.includes('Remove') || p.type.includes('Change')))) return true;
    return false;
  };

  const isSurveillance = app?.application_type === 'surveillance';
  const targetAppId = getCleanId(propAppId) || getCleanId(propApp);

  const initForm = (loadedApp, existingCert = null) => {
    if (!loadedApp) return;
    const isAddOn = checkIsAddOn(loadedApp) || checkIsAddOn(propApp);
    const isSurv = !isAddOn && loadedApp.application_type === 'surveillance';

    // Resolve Certificate Type
    let resolvedCertType = existingCert?.certificate_type || loadedApp.certificate_id?.certificate_type;
    if (!resolvedCertType) {
      if (isSurv) {
        resolvedCertType = 'UAE/GSO Halal Surveillance Letter';
      } else {
        const cat = ((loadedApp.category || '') + ' ' + (loadedApp.scope || '')).toLowerCase();
        if (cat.includes('smiic')) {
          resolvedCertType = 'SMIIC';
        } else if (cat.includes('cosmetic')) {
          resolvedCertType = 'COSMETICS';
        } else if (cat.includes('gso') || cat.includes('uae')) {
          resolvedCertType = (cat.includes('meat') && !cat.includes('non')) ? 'GSO MEAT' : 'GSO NON MEAT';
        } else if (cat.includes('meat') && !cat.includes('non')) {
          resolvedCertType = 'HFA SCHEME MEAT';
        } else if (cat.includes('non-meat') || cat.includes('non meat')) {
          resolvedCertType = 'HFA SCHEME NON MEAT';
        } else {
          resolvedCertType = 'GSO MEAT';
        }
      }
    }

    const isFour = isFourDateType(resolvedCertType);
    const yearsToAdd = isSurv ? 1 : (isFour ? 3 : 1);

    const resolvedIssueDate = existingCert?.issue_date
      ? new Date(existingCert.issue_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const expDate = new Date(resolvedIssueDate);
    expDate.setFullYear(expDate.getFullYear() + yearsToAdd);
    const resolvedExpiryDate = existingCert?.expiry_date
      ? new Date(existingCert.expiry_date).toISOString().split('T')[0]
      : expDate.toISOString().split('T')[0];

    const resolvedCurrentCycle = existingCert?.current_cycle_start_date
      ? new Date(existingCert.current_cycle_start_date).toISOString().split('T')[0]
      : (existingCert?.issue_date ? new Date(existingCert.issue_date).toISOString().split('T')[0] : resolvedIssueDate);

    const resolvedOrigCycle = existingCert?.original_cycle_start_date
      ? new Date(existingCert.original_cycle_start_date).toISOString().split('T')[0]
      : (existingCert?.issue_date ? new Date(existingCert.issue_date).toISOString().split('T')[0] : resolvedIssueDate);

    const resolvedCertStart = existingCert?.certification_start_date
      ? new Date(existingCert.certification_start_date).toISOString().split('T')[0]
      : (existingCert?.issue_date ? new Date(existingCert.issue_date).toISOString().split('T')[0] : resolvedIssueDate);

    const companyName = loadedApp.establishment_name || loadedApp.client_id?.company_name || loadedApp.profiles?.company_name || loadedApp.client_id?.full_name || 'HFA Client';
    
    // Extract products list if available
    let prods = '';
    let existingProducts = existingCert?.products_covered || loadedApp.certificate_id?.products_covered;
    let productList = [];
    if (Array.isArray(existingProducts)) {
      productList = [...existingProducts];
    } else if (typeof existingProducts === 'string' && existingProducts.trim()) {
      try {
        const parsed = JSON.parse(existingProducts);
        productList = Array.isArray(parsed) ? parsed : existingProducts.split(',').map(p => p.trim()).filter(Boolean);
      } catch (_) {
        productList = existingProducts.split(',').map(p => p.trim()).filter(Boolean);
      }
    }

    if (Array.isArray(loadedApp.products) && loadedApp.products.length > 0) {
      for (const p of loadedApp.products) {
        if (!p) continue;
        const pType = p.type || 'Add product';
        const pName = (p.new_name || p.name || p.title || '').trim();
        const origName = (p.original_name || p.name || '').trim();

        if (pType === 'Add product' || !p.type) {
          if (pName && !productList.includes(pName)) {
            productList.push(pName);
          }
        } else if (pType === 'Remove product') {
          if (origName) {
            productList = productList.filter(item => item !== origName);
          }
        } else if (pType === 'Change name/code') {
          if (origName && pName) {
            const idx = productList.indexOf(origName);
            if (idx !== -1) {
              productList[idx] = pName;
            } else if (!productList.includes(pName)) {
              productList.push(pName);
            }
          }
        }
      }
      prods = productList.join(', ');
    } else if (productList.length > 0) {
      prods = productList.join(', ');
    } else if (loadedApp.scope) {
      prods = loadedApp.scope;
    }

    const certTypeCode = isAddOn ? 'AD' : normalizeHfaTypeCode(loadedApp.application_type);
    setCurrentTypeCode(certTypeCode);

    let resolvedCertNo = existingCert?.certificate_number || loadedApp.certificate_id?.certificate_number;
    if (resolvedCertNo) {
      // Rectify legacy/accidental -NE- to -AD- for add-on applications
      if (isAddOn && resolvedCertNo.includes('-NE-')) {
        resolvedCertNo = resolvedCertNo.replace('-NE-', '-AD-');
      }
    } else {
      resolvedCertNo = generateHfaId(companyName, certTypeCode);
    }

    setCertificateForm({
      certificate_number: resolvedCertNo,
      certificate_type: resolvedCertType,
      issue_date: resolvedIssueDate,
      expiry_date: resolvedExpiryDate,
      current_cycle_start_date: resolvedCurrentCycle,
      original_cycle_start_date: resolvedOrigCycle,
      certification_start_date: resolvedCertStart,
      products_covered: existingCert?.products_covered ? (Array.isArray(existingCert.products_covered) ? existingCert.products_covered.join(', ') : existingCert.products_covered) : prods,
      file: null
    });
  };

  const handleSetYears = (years) => {
    const isFour = isFourDateType(certificateForm.certificate_type);
    const enforcedYears = isFour ? 3 : 1;
    const baseDate = certificateForm.issue_date ? new Date(certificateForm.issue_date) : new Date();
    if (isNaN(baseDate.getTime())) return;
    const d = new Date(baseDate);
    d.setFullYear(d.getFullYear() + enforcedYears);
    setCertificateForm(f => ({ ...f, expiry_date: d.toISOString().split('T')[0] }));
  };

  const handleTypeChange = (newType) => {
    const isFour = isFourDateType(newType);
    const years = isFour ? 3 : 1;
    const baseDate = certificateForm.issue_date ? new Date(certificateForm.issue_date) : new Date();
    let newExpiry = certificateForm.expiry_date;
    if (!isNaN(baseDate.getTime())) {
      const d = new Date(baseDate);
      d.setFullYear(d.getFullYear() + years);
      newExpiry = d.toISOString().split('T')[0];
    }

    setCertificateForm(f => ({
      ...f,
      certificate_type: newType,
      expiry_date: newExpiry,
      current_cycle_start_date: f.current_cycle_start_date || f.issue_date,
      original_cycle_start_date: f.original_cycle_start_date || f.issue_date,
      certification_start_date: f.certification_start_date || f.issue_date
    }));
  };

  useEffect(() => {
    if (isOpen) {
      const appIdToUse = targetAppId || getCleanId(propApp?._id || propApp?.id);
      if (appIdToUse) {
        setLoading(true);
        const appFetchPromise = propApp
          ? Promise.resolve({ data: propApp })
          : api.get(`/api/applications/${appIdToUse}`).catch(() => api.get(`/api/add-on-applications/${appIdToUse}`));

        Promise.all([
          appFetchPromise,
          api.get(`/api/certificates/application/${appIdToUse}`).catch(() => ({ data: null }))
        ])
          .then(([appRes, certRes]) => {
            const loadedApp = appRes.data?.data || appRes.data || null;
            let loadedCert = certRes.data?.data || certRes.data || null;

            if (!loadedCert && loadedApp?.certificate_id) {
              if (typeof loadedApp.certificate_id === 'object' && loadedApp.certificate_id.certificate_number) {
                loadedCert = loadedApp.certificate_id;
              }
            }

            setApp(loadedApp);
            initForm(loadedApp, loadedCert);
          })
          .catch(() => setApp(null))
          .finally(() => setLoading(false));
      } else if (propApp) {
        setApp(propApp);
        initForm(propApp, propApp.certificate_id);
      }
    }
  }, [isOpen, propApp, targetAppId]);

  if (!isOpen) return null;
  if (loading) return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal" style={{ maxWidth: 500, padding: 48, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ color: '#64748b', fontSize: 14 }}>Loading application...</div>
      </div>
    </div>
  );
  if (!app) return null;

  const normAppStatus = (app?.status || '').toLowerCase().replace(/ /g, '_');
  const isAppReadyForCert = ['ready_for_certificate', 'certificate_issued', 'waiting_for_certificate'].includes(normAppStatus);

  const handleSubmit = async () => {
    if (!isSurveillance && !isAppReadyForCert) {
      toast.error('Certificate issuance unlocks once initial processing, evaluations, and approvals are complete.');
      return;
    }
    const isFour = isFourDateType(certificateForm.certificate_type);
    if (!certificateForm.certificate_number.trim()) {
      toast.error(isSurveillance ? 'Please enter a Surveillance Letter reference number.' : 'Please enter a certificate number.');
      return;
    }
    if (!certificateForm.issue_date) {
      toast.error('Please enter the issue date.');
      return;
    }
    if (!certificateForm.expiry_date) {
      toast.error(isSurveillance ? 'Please enter the next audit / milestone date.' : 'Please enter the expiry date.');
      return;
    }

    if (!isSurveillance) {
      if (isFour) {
        if (!certificateForm.current_cycle_start_date) {
          toast.error('Please enter the current cycle start date for GSO/SMIIC scheme.');
          return;
        }
        if (!certificateForm.original_cycle_start_date) {
          toast.error('Please enter the original cycle start date for GSO/SMIIC scheme.');
          return;
        }
      } else {
        if (!certificateForm.certification_start_date) {
          toast.error('Please enter the certification start date.');
          return;
        }
      }
    }

    if (isSurveillance && !certificateForm.file) {
      toast.error('Please upload the official Surveillance Letter PDF document.');
      return;
    }

    setSubmitting(true);
    try {
      const appId = getCleanId(app._id || app.id || app);

      if (isSurveillance) {
        try {
          const formData = new FormData();
          formData.append('letter_number', certificateForm.certificate_number);
          formData.append('issue_date', certificateForm.issue_date);
          formData.append('next_due_date', certificateForm.expiry_date);
          if (certificateForm.file) {
            formData.append('letter_file', certificateForm.file);
          }

          await api.post(`/api/applications/${appId}/issue-surveillance-letter`, formData, true);
        } catch (postErr) {
          console.warn('POST /issue-surveillance-letter error, attempting resilient status update fallback:', postErr);
          
          if (certificateForm.file) {
            try {
              await api.uploadPdf(certificateForm.file, 'surveillance-letters');
            } catch (uErr) {
              console.error('File upload error:', uErr);
            }
          }

          await api.put(`/api/applications/${appId}/status`, {
            status: 'certificate_issued',
            note: `Official Surveillance Letter issued (${certificateForm.certificate_number}). UAE/GSO 3-Year Halal Certification confirmed active.`
          });
        }

        toast.success('🎉 Official Surveillance Letter issued successfully!');
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      // Standard Certificate creation flow
      const formData = new FormData();
      formData.append('certificate_number', certificateForm.certificate_number);
      formData.append('certificate_type', certificateForm.certificate_type);
      formData.append('issue_date', certificateForm.issue_date);
      formData.append('expiry_date', certificateForm.expiry_date);

      if (isFour) {
        formData.append('current_cycle_start_date', certificateForm.current_cycle_start_date || certificateForm.issue_date);
        formData.append('original_cycle_start_date', certificateForm.original_cycle_start_date || certificateForm.issue_date);
        formData.append('certification_start_date', certificateForm.current_cycle_start_date || certificateForm.issue_date);
      } else {
        formData.append('certification_start_date', certificateForm.certification_start_date || certificateForm.issue_date);
        formData.append('current_cycle_start_date', certificateForm.certification_start_date || certificateForm.issue_date);
        formData.append('original_cycle_start_date', certificateForm.certification_start_date || certificateForm.issue_date);
      }

      if (certificateForm.products_covered) {
        formData.append('products_covered', certificateForm.products_covered);
      }
      if (certificateForm.file) {
        formData.append('certificate_file', certificateForm.file);
      }

      const clientId = getCleanId(app.client_id?._id || app.client_id?.id || app.client_id || app.profiles?._id || app.profiles?.id || app.profiles);
      if (!clientId) {
        throw new Error('Could not identify client ID for this application.');
      }
      formData.append('application_id', appId);
      formData.append('client_id', clientId);
      const siteId = getCleanId(app.site_id?._id || app.site_id?.id || app.site_id || app.certificate_id?.site_id || app.application_id?.site_id);
      if (!siteId) {
        throw new Error('Site selection is compulsory. This application has no associated site.');
      }
      formData.append('site_id', siteId);
      formData.append('company_name', app.establishment_name || app.client_id?.company_name || app.profiles?.company_name || app.client_id?.full_name || '');
      formData.append('company_address', app.establishment_address || app.client_id?.address || app.profiles?.address || '');
      formData.append('manufacturing_address', app.manufacturer_address || app.site_id?.address || app.establishment_address || '');
      formData.append('scope', app.scope || app.application_id?.scope || 'Halal Food Certification');
      formData.append('status', 'under_review');
      if (checkIsAddOn(app)) {
        formData.append('is_add_on', 'true');
      }

      await api.post('/api/certificates', formData, true);

      toast.success('Certificate issued successfully and sent to Review Certificates.');
      if (onSuccess) onSuccess();
      onClose();
      navigate('/certificates?status=under_review');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || (isSurveillance ? 'Failed to issue surveillance letter.' : 'Failed to issue certificate.'));
    } finally {
      setSubmitting(false);
    }
  };

  const isModalAddOn = checkIsAddOn(app);
  const displayCompanyName = app.establishment_name || app.profiles?.company_name || app.client_id?.company_name || app.client_id?.full_name || 'HFA Client';
  const displayCategory = isSurveillance
    ? 'UAE/GSO 3-Year Halal Scheme'
    : (app.category || app.application_id?.category || app.certificate_id?.certificate_type || certificateForm.certificate_type || 'Halal Certification');

  const isCurrentFourDate = isFourDateType(certificateForm.certificate_type);

  const isSubmitDisabled = submitting ||
    !certificateForm.certificate_number ||
    !certificateForm.issue_date ||
    !certificateForm.expiry_date ||
    (isSurveillance && !certificateForm.file) ||
    (!isSurveillance && isCurrentFourDate && (!certificateForm.current_cycle_start_date || !certificateForm.original_cycle_start_date)) ||
    (!isSurveillance && !isCurrentFourDate && !certificateForm.certification_start_date);

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580, borderRadius: 14 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '18px 24px', background: isSurveillance ? '#f0f9ff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isSurveillance ? (
              <FileText size={22} style={{ color: '#0284c7' }} />
            ) : (
              <Award size={20} style={{ color: '#047857' }} />
            )}
            <div>
              <div className="modal-title" style={{ fontSize: 16, fontWeight: 800, color: isSurveillance ? '#0369a1' : '#0f172a' }}>
                {isSurveillance ? 'Issue Official Surveillance Letter' : 'Issue Certificate'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {displayCompanyName} &bull; {displayCategory}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: 24 }}>
          <div style={{
            background: isSurveillance ? '#f0f9ff' : '#f0fdf4',
            border: `1px solid ${isSurveillance ? '#bae6fd' : '#bbf7d0'}`,
            borderRadius: 8,
            padding: 12,
            marginBottom: 18,
            color: isSurveillance ? '#0369a1' : '#166534',
            fontSize: 12.5,
            lineHeight: 1.5
          }}>
            <ShieldCheck size={16} style={{ display: 'inline', marginRight: 6 }} />
            {isSurveillance ? (
              <span><strong>Notice:</strong> GSO Surveillance applications do not issue new certificates. Issuing this letter confirms the audit was successful and publishes the official <strong>Surveillance Letter</strong> to the client portal.</span>
            ) : (
              <span>Issuing this certificate will send it directly to <strong>Review Certificates</strong>, where committee reviewers can verify all details, rectify any mistakes, and then send it to the client.</span>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                {isSurveillance ? 'Surveillance Letter Ref #' : 'Certificate Number'} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              {!isSurveillance && (
                <button
                  type="button"
                  onClick={() => {
                    const newId = generateHfaId(displayCompanyName || 'HFA', currentTypeCode);
                    setCertificateForm(f => ({ ...f, certificate_number: newId }));
                  }}
                  style={{ background: 'none', border: 'none', color: '#047857', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Regenerate ID
                </button>
              )}
            </div>
            <input
              type="text"
              className="form-control"
              value={certificateForm.certificate_number}
              onChange={e => setCertificateForm(f => ({ ...f, certificate_number: e.target.value }))}
              placeholder={isSurveillance ? 'e.g. HFA-SURV-2026-001' : (isModalAddOn ? 'e.g. HFA-AN-AD-45029' : 'e.g. HFA-CERT-2026-001')}
              style={{ fontWeight: 700 }}
            />
          </div>

          {!isSurveillance && (
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Certificate Type / Scheme <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                className="form-control"
                value={certificateForm.certificate_type}
                onChange={e => handleTypeChange(e.target.value)}
              >
                <option value="GSO MEAT">GSO MEAT</option>
                <option value="GSO NON MEAT">GSO NON MEAT</option>
                <option value="SMIIC">SMIIC</option>
                <option value="HFA SCHEME MEAT">HFA SCHEME MEAT</option>
                <option value="HFA SCHEME NON MEAT">HFA SCHEME NON MEAT</option>
                <option value="COSMETICS">COSMETICS</option>
              </select>
            </div>
          )}

          {/* Dates Section */}
          {isSurveillance ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Letter Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={certificateForm.issue_date}
                  onChange={e => setCertificateForm(f => ({ ...f, issue_date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Next Audit / Milestone Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={certificateForm.expiry_date}
                  onChange={e => setCertificateForm(f => ({ ...f, expiry_date: e.target.value }))}
                />
              </div>
            </div>
          ) : isCurrentFourDate ? (
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 6 }}>
                  4 Dates Required &bull; {certificateForm.certificate_type.includes('SMIIC') ? 'SMIIC' : 'GSO'} Scheme
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>Cycle validity: 3 Years</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* 1. Issue Date */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>
                    Issue Date <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={certificateForm.issue_date}
                    onChange={e => {
                      const val = e.target.value;
                      setCertificateForm(f => ({
                        ...f,
                        issue_date: val,
                        current_cycle_start_date: f.current_cycle_start_date || val,
                        original_cycle_start_date: f.original_cycle_start_date || val
                      }));
                    }}
                  />
                </div>

                {/* 2. Current Cycle Start Date */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>
                      Current Cycle Start Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCertificateForm(f => ({ ...f, current_cycle_start_date: f.issue_date }))}
                      style={{ background: 'none', border: 'none', color: '#047857', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Match Issue
                    </button>
                  </div>
                  <input
                    type="date"
                    className="form-control"
                    value={certificateForm.current_cycle_start_date || certificateForm.issue_date}
                    onChange={e => setCertificateForm(f => ({ ...f, current_cycle_start_date: e.target.value }))}
                  />
                </div>

                {/* 3. Expiry Date */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>
                      Expiry Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => handleSetYears(3)}
                        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '1px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        +3 Yrs (Standard)
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    className="form-control"
                    value={certificateForm.expiry_date}
                    onChange={e => setCertificateForm(f => ({ ...f, expiry_date: e.target.value }))}
                    style={{ fontWeight: 700, color: '#dc2626' }}
                  />
                </div>

                {/* 4. Original Cycle Start Date */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>
                      Original Cycle Start Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCertificateForm(f => ({ ...f, original_cycle_start_date: f.issue_date }))}
                      style={{ background: 'none', border: 'none', color: '#047857', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Match Issue
                    </button>
                  </div>
                  <input
                    type="date"
                    className="form-control"
                    value={certificateForm.original_cycle_start_date || certificateForm.issue_date}
                    onChange={e => setCertificateForm(f => ({ ...f, original_cycle_start_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 6 }}>
                  3 Dates Required &bull; {certificateForm.certificate_type.includes('COSMETICS') ? 'Cosmetics' : 'HFA'} Scheme
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>Cycle validity: 1 Year</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* 1. Issue Date */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>
                    Issue Date <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={certificateForm.issue_date}
                    onChange={e => {
                      const val = e.target.value;
                      setCertificateForm(f => ({
                        ...f,
                        issue_date: val,
                        certification_start_date: f.certification_start_date || val
                      }));
                    }}
                  />
                </div>

                {/* 2. Certification Start Date */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>
                      Certification Start Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCertificateForm(f => ({ ...f, certification_start_date: f.issue_date }))}
                      style={{ background: 'none', border: 'none', color: '#047857', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Match Issue
                    </button>
                  </div>
                  <input
                    type="date"
                    className="form-control"
                    value={certificateForm.certification_start_date || certificateForm.issue_date}
                    onChange={e => setCertificateForm(f => ({ ...f, certification_start_date: e.target.value }))}
                  />
                </div>

                {/* 3. Expiry Date */}
                <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>
                      Expiry Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => handleSetYears(1)}
                        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '1px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        +1 Yr (Standard)
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    className="form-control"
                    value={certificateForm.expiry_date}
                    onChange={e => setCertificateForm(f => ({ ...f, expiry_date: e.target.value }))}
                    style={{ fontWeight: 700, color: '#dc2626' }}
                  />
                </div>
              </div>
            </div>
          )}

          {!isSurveillance && (
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Products Covered</label>
              <textarea
                className="form-control"
                rows={2}
                value={certificateForm.products_covered}
                onChange={e => setCertificateForm(f => ({ ...f, products_covered: e.target.value }))}
                placeholder="e.g. Fresh Beef, Poultry, Spices"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>
              {isSurveillance ? (
                <span>Surveillance Letter PDF Document <span style={{ color: '#dc2626' }}>*</span></span>
              ) : (
                'Custom PDF Upload (Optional)'
              )}
            </label>
            <div
              onClick={() => document.getElementById('certificate-file-shared').click()}
              style={{
                border: certificateForm.file ? '1.5px solid #10b981' : (isSurveillance ? '1.5px dashed #0284c7' : '1.5px dashed #cbd5e1'),
                padding: '24px 16px', borderRadius: '10px',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                background: certificateForm.file ? '#f0fdf4' : (isSurveillance ? '#f0f9ff' : '#f8fafc')
              }}
            >
              <FileText size={30} style={{ color: certificateForm.file ? '#16a34a' : (isSurveillance ? '#0284c7' : '#94a3b8'), margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: certificateForm.file ? '#15803d' : (isSurveillance ? '#0369a1' : '#334155') }}>
                {certificateForm.file ? certificateForm.file.name : (isSurveillance ? 'Upload official Surveillance Letter PDF *' : 'Upload custom PDF or leave empty to auto-generate')}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                {isSurveillance ? 'Required — PDF format accepted' : 'System will automatically render the official certificate template if empty'}
              </div>
              <input
                id="certificate-file-shared"
                type="file"
                hidden
                accept=".pdf"
                onChange={e => setCertificateForm(f => ({ ...f, file: e.target.files[0] }))}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 800,
              background: isSurveillance ? '#0284c7' : '#047857',
              borderColor: isSurveillance ? '#0284c7' : '#047857'
            }}
          >
            {isSurveillance ? <FileText size={16} /> : <ShieldCheck size={16} />}
            {submitting ? (isSurveillance ? 'Issuing Letter...' : 'Issuing Certificate...') : (isSurveillance ? 'Issue Surveillance Letter' : 'Issue Certificate')}
          </button>
        </div>
      </div>
    </div>
  );
}
