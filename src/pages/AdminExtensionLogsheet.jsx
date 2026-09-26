import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getPdfUrl } from '../lib/pdfUtils';
import {
  ArrowLeft, CheckCircle2, CheckCircle, Clock, Check,
  Printer, PenTool, AlertTriangle, ShieldCheck, X, Save, Lock, RotateCcw
} from 'lucide-react';

export default function AdminExtensionLogsheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const currentUser = profile || user;
  const userRoles = Array.isArray(currentUser?.roles) && currentUser.roles.length > 0
    ? currentUser.roles
    : (currentUser?.role ? [currentUser.role] : []);
  const isSuperAdmin = userRoles.includes('superadmin') || currentUser?.role === 'superadmin';
  const hasSignaturePrivilege = isSuperAdmin || Boolean(currentUser?.can_sign_logsheet);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [app, setApp] = useState(null);
  const [logsheet, setLogsheet] = useState(null);
  const [signatures, setSignatures] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    company_name: '',
    facility_address: '',
    contact_person: '',
    product_category: '',
    certificate_type: '',
    scheme: 'HFA',
    certificate_expiry_date: '',
    justification: '',
    extension_duration_type: '30_days', // '30_days' | 'more_than_30_days'
    extension_days: 30,
    comments: ''
  });

  // Signature modal state
  const [showSignModal, setShowSignModal] = useState(false);
  const [sigRole, setSigRole] = useState('Mufti');
  const [sigComment, setSigComment] = useState('');
  const [modalConfirmed, setModalConfirmed] = useState(false);
  const [signing, setSigning] = useState(false);

  const isMuftiUser = currentUser?.role === 'mufti' || currentUser?.is_mufti;

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const [appRes, logRes, sigRes] = await Promise.all([
        api.get(`/api/extension-applications/${id}`),
        api.get(`/api/extension-applications/${id}/logsheet`),
        api.get('/api/signatures').catch(() => [])
      ]);

      const loadedApp = appRes.data?.data || appRes.data || appRes;
      const loadedLog = logRes.data?.data || logRes.data || logRes;
      const loadedSigs = Array.isArray(sigRes) ? sigRes : (sigRes.data?.data || (Array.isArray(sigRes.data) ? sigRes.data : []));

      setApp(loadedApp);
      setLogsheet(loadedLog);
      setSignatures(loadedSigs);

      // Auto-extract full site address if available
      const siteObj = loadedApp?.site_id;
      let siteAddress = '';
      if (siteObj && typeof siteObj === 'object') {
        siteAddress = [
          siteObj.address_1,
          siteObj.address_2,
          siteObj.city,
          siteObj.state,
          siteObj.postcode,
          siteObj.country
        ].filter(Boolean).join(', ');
        if (!siteAddress && siteObj.head_office_address) {
          siteAddress = siteObj.head_office_address;
        }
      }

      const resolvedFacilityAddress = loadedLog?.facility_address || siteAddress || loadedApp?.client_id?.address || loadedApp?.client_id?.company_address || '';

      // Auto-extract and resolve Certificate Type & Scheme
      const rawCertType = loadedLog?.certificate_type || loadedApp?.detected_certificate_type || loadedApp?.certificate_id?.certificate_type || '';
      let detectedScheme = loadedLog?.scheme || loadedApp?.detected_scheme || 'HFA';
      if (rawCertType) {
        const u = rawCertType.toUpperCase();
        const hasGSO = u.includes('GSO') || u.includes('UAE') || u.includes('GCC');
        const hasHFA = u.includes('HFA');
        if (hasGSO && hasHFA) detectedScheme = 'Both';
        else if (hasGSO) detectedScheme = 'GSO';
        else if (hasHFA) detectedScheme = 'HFA';
      }

      setFormData({
        company_name: loadedLog?.company_name || loadedApp?.company_name || loadedApp?.client_id?.company_name || '',
        facility_address: resolvedFacilityAddress,
        contact_person: loadedLog?.contact_person || loadedApp?.contact_person || '',
        product_category: loadedLog?.product_category || '',
        certificate_type: rawCertType || (detectedScheme === 'GSO' ? 'GSO SCHEME' : detectedScheme === 'Both' ? 'GSO & HFA SCHEME' : 'HFA SCHEME'),
        scheme: detectedScheme,
        certificate_expiry_date: loadedLog?.certificate_expiry_date ? new Date(loadedLog.certificate_expiry_date).toISOString().split('T')[0] : '',
        justification: loadedLog?.justification || loadedApp?.description || '',
        extension_duration_type: loadedLog?.extension_duration_type || '30_days',
        extension_days: loadedLog?.extension_days || 30,
        comments: loadedLog?.comments || ''
      });
    } catch (err) {
      console.error('Error loading logsheet:', err);
      toast.error('Failed to load extension logsheet data.');
    } finally {
      setLoading(false);
    }
  };

  const [isRedoing, setIsRedoing] = useState(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get('redo') === '1' || sp.get('redo') === 'true';
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isSubmittedForSig = Boolean(
    logsheet && (
      logsheet.status === 'Waiting for Signature' ||
      logsheet.status === 'Signed' ||
      logsheet.status === 'Approved' ||
      app?.status === 'waiting_signature' ||
      app?.status === 'extension_approved'
    )
  );

  const isLocked = isSubmittedForSig && !isRedoing;

  const handleDurationTypeChange = (type) => {
    if (isLocked) return;
    const days = type === '30_days' ? 30 : 60;
    setFormData(prev => ({
      ...prev,
      extension_duration_type: type,
      extension_days: days
    }));
  };

  const handleSave = async (submitForSig = false) => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        submit_for_signature: submitForSig,
        clear_signatures: isRedoing || false,
        is_redo: isRedoing || false
      };
      const res = await api.post(`/api/extension-applications/${id}/logsheet`, payload);
      const updatedLog = res.data?.data || res.data;
      setLogsheet(updatedLog);
      if (isRedoing) {
        setIsRedoing(false);
        await fetchDetails();
        toast.success('Extension logsheet updated! Previous signatures cleared.');
      } else {
        toast.success(submitForSig ? 'Logsheet submitted for signatures!' : 'Logsheet draft saved successfully!');
        if (submitForSig) {
          navigate(`/extension-applications/${id}/processing`);
        } else {
          fetchDetails();
        }
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to save logsheet.');
    } finally {
      setSaving(false);
    }
  };

  const userSignature = signatures.find(s =>
    (s.user_id && (s.user_id === currentUser?._id || s.user_id === currentUser?.id)) ||
    (s.username && currentUser?.username && s.username.toLowerCase() === currentUser.username.toLowerCase()) ||
    (s.username && currentUser?.email && s.username.toLowerCase() === currentUser.email.split('@')[0].toLowerCase()) ||
    (s.name && currentUser?.full_name && s.name.toLowerCase() === currentUser.full_name.toLowerCase()) ||
    (s.name && currentUser?.name && s.name.toLowerCase() === currentUser.name.toLowerCase()) ||
    (s.username && currentUser?.name && s.username.toLowerCase() === currentUser.name.toLowerCase()) ||
    (s.username === 'admin' && (currentUser?.username === 'admin' || currentUser?.role === 'superadmin' || currentUser?.full_name === 'HFA Admin')) ||
    (s.name === 'HFA Admin' && (currentUser?.role === 'superadmin' || currentUser?.role === 'admin'))
  );

  const is30Days = formData.extension_duration_type === '30_days' || Number(formData.extension_days) <= 30;

  const openSignModal = (roleKey = null) => {
    if (!hasSignaturePrivilege) {
      toast.error('Access denied. You do not have the Signature Privilege required to sign logsheets. Please contact Superadmin.');
      return;
    }
    if (roleKey) {
      setSigRole(roleKey);
    } else {
      if (is30Days) {
        setSigRole('Ceo');
      } else {
        const available = [
          { key: 'Mufti', signed: !!logsheet?.mufti_signature },
          { key: 'Ceo', signed: !!logsheet?.ceo_signature },
          { key: 'Manager', signed: !!logsheet?.manager_signature },
          { key: 'Mufti2', signed: !!logsheet?.mufti2_signature }
        ].find(r => !r.signed);
        setSigRole(available ? available.key : 'Mufti');
      }
    }
    setSigComment('');
    setModalConfirmed(false);
    setShowSignModal(true);
  };

  const handleApplySignature = async () => {
    if (!hasSignaturePrivilege) {
      toast.error('Access denied. Signature Privilege required.');
      return;
    }
    if (!sigRole) {
      toast.error('Please select a signatory role');
      return;
    }
    if (!modalConfirmed) {
      toast.error('Please check the confirmation box before applying signature');
      return;
    }
    if (!userSignature) {
      toast.error('No digital signature image found for your account. Please upload one in the Signatures page.');
      return;
    }

    const sigData = userSignature?.signature_url;
    const signerName = userSignature?.name || currentUser?.full_name || currentUser?.name || 'Staff Officer';

    setSigning(true);
    try {
      const res = await api.put(`/api/extension-applications/${id}/logsheet/sign`, {
        signature_role: sigRole,
        signature_data: sigData,
        signer_name: signerName,
        comment: sigComment
      });
      setLogsheet(res.data?.data || res.data);
      toast.success('Signature applied successfully!');
      setShowSignModal(false);
      setModalConfirmed(false);
      setSigComment('');
      fetchDetails();
    } catch (err) {
      console.error('Sign error:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to apply signature.');
    } finally {
      setSigning(false);
    }
  };

  const signatories = is30Days ? [
    {
      roleKey: 'Ceo',
      label: 'Authorized Officer / CEO Signature (30-Day Extension)',
      btnRole: 'CEO / Authorized Officer',
      signature: logsheet?.single_signature,
      name: logsheet?.single_sign_name,
      date: logsheet?.single_sign_date
    }
  ] : [
    {
      roleKey: 'Mufti',
      label: '1. Shariah / Mufti Signature',
      btnRole: 'Mufti',
      signature: logsheet?.mufti_signature,
      name: logsheet?.mufti_sign_name,
      date: logsheet?.mufti_sign_date
    },
    {
      roleKey: 'Ceo',
      label: '2. Chief Executive Officer (CEO)',
      btnRole: 'CEO',
      signature: logsheet?.ceo_signature,
      name: logsheet?.ceo_sign_name,
      date: logsheet?.ceo_sign_date
    },
    {
      roleKey: 'Manager',
      label: '3. Operations / Certification Manager',
      btnRole: 'Manager',
      signature: logsheet?.manager_signature,
      name: logsheet?.manager_sign_name,
      date: logsheet?.manager_sign_date
    },
    {
      roleKey: 'Mufti2',
      label: '4. Second Shariah / Technical Expert',
      btnRole: 'Mufti 2',
      signature: logsheet?.mufti2_signature,
      name: logsheet?.mufti2_sign_name,
      date: logsheet?.mufti2_sign_date
    }
  ];

  const totalSignedCount = signatories.filter(s => Boolean(s.signature)).length;
  const isFullySigned = totalSignedCount === signatories.length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #dcfce7', borderTop: '3px solid #008744', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Loading Extension Logsheet...</p>
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 13px',
    borderRadius: 7,
    border: isLocked ? '1px solid #e2e8f0' : '1px solid #94a3b8',
    backgroundColor: isLocked ? '#f8fafc' : '#ffffff',
    fontSize: 13.5,
    fontWeight: 600,
    color: isLocked ? '#334155' : '#0f172a',
    cursor: isLocked ? 'not-allowed' : 'text',
    transition: 'all 0.2s ease'
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60, fontFamily: 'Inter, "Segoe UI", sans-serif' }}>
      
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={() => navigate(`/extension-applications/${id}/processing`)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: '#475569',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: 0
          }}
        >
          <ArrowLeft size={16} /> Back to Processing
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'white', border: '1px solid #e2e8f0', color: '#475569',
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Printer size={14} /> Print
          </button>

          {isRedoing ? (
            <>
              <button
                type="button"
                onClick={() => setIsRedoing(false)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'white', border: '1px solid #d1d5db', color: '#64748b',
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancel Redo
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#b45309', border: 'none', color: 'white',
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 4px rgba(180,83,9,0.25)'
                }}
              >
                {saving ? 'Saving & Resetting...' : <><Save size={14} /> Save &amp; Re-submit Logsheet</>}
              </button>
            </>
          ) : !isSubmittedForSig ? (
            <>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'white', border: '1px solid #d1d5db', color: '#0f172a',
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer'
                }}
              >
                <Save size={14} /> Save Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#008744', border: 'none', color: 'white',
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,135,68,0.2)'
                }}
              >
                <CheckCircle2 size={14} /> Submit for Signatures
              </button>
            </>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {logsheet?.status !== 'Approved' && app?.status !== 'extension_approved' && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to redo this extension logsheet? You will be able to edit all details, and saving will reset all existing signatures.')) {
                      setIsRedoing(true);
                    }
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#fffbeb', border: '1px solid #f59e0b', color: '#b45309',
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer'
                  }}
                  title="Redo logsheet and reset signatures"
                >
                  <RotateCcw size={14} /> Redo Logsheet
                </button>
              )}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: isFullySigned ? '#ecfdf5' : '#fffbeb',
                border: `1px solid ${isFullySigned ? '#a7f3d0' : '#fde68a'}`,
                color: isFullySigned ? '#065f46' : '#92400e',
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700
              }}>
                {isFullySigned ? (
                  <><CheckCircle2 size={15} color="#059669" /> All Signatures Completed</>
                ) : (
                  <><Clock size={15} color="#d97706" /> Waiting for Signatures</>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Document Sheet Container ── */}
      <div style={{
        background: 'white', borderRadius: 16, border: '1px solid #cbd5e1',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)', padding: '40px 48px'
      }}>
        
        {/* Header Title */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#008744', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            HALAL FOOD AUTHORITY
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
            Halal Certificate Extension Logsheet
          </h1>
          <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
            Application Ref: <strong>{app?.application_number}</strong> • Facility: <strong>{app?.site_name}</strong>
          </div>
        </div>

        {/* ── Redo Logsheet Active Banner ── */}
        {isRedoing && (
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1.5px solid #f59e0b',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: '0 2px 6px rgba(245, 158, 11, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#fde68a', color: '#b45309',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <RotateCcw size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#92400e' }}>
                  Redo Extension Logsheet Active
                </div>
                <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
                  You can now edit the extension parameters below. When saved, all previously signed signatures will be removed and the logsheet will return to Waiting for Signature.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRedoing(false)}
              style={{ background: '#fff', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
            >
              Cancel Redo
            </button>
          </div>
        )}

        {/* ── Locked / Submitted Notice Banner ── */}
        {isSubmittedForSig ? (
          <div style={{
            background: isFullySigned ? '#f0fdf4' : '#eff6ff',
            border: `1px solid ${isFullySigned ? '#bbf7d0' : '#bfdbfe'}`,
            borderRadius: 10,
            padding: '12px 18px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isFullySigned ? '#dcfce7' : '#dbeafe',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Lock size={16} color={isFullySigned ? '#16a34a' : '#1d4ed8'} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isFullySigned ? '#166534' : '#1e40af' }}>
                  Logsheet Submitted &amp; Locked
                </div>
                <div style={{ fontSize: 11.5, color: isFullySigned ? '#15803d' : '#3b82f6' }}>
                  {isFullySigned
                    ? 'All committee signatures have been completed. You can now issue the certificate in Processing.'
                    : 'Logsheet fields are locked. Signatures must now be recorded below by authorized officers.'}
                </div>
              </div>
            </div>
            <span style={{
              background: isFullySigned ? '#dcfce7' : '#fef3c7',
              color: isFullySigned ? '#166534' : '#92400e',
              border: `1px solid ${isFullySigned ? '#86efac' : '#fde68a'}`,
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}>
              {isFullySigned ? <Check size={13} strokeWidth={3} /> : <Clock size={13} />}
              {is30Days
                ? (logsheet?.single_signature ? '1 / 1 Signed' : '0 / 1 Signed')
                : `${totalSignedCount} / 4 Signatures Collected`}
            </span>
          </div>
        ) : app?.status === 'submitted' ? (
          <div style={{
            background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10,
            padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10
          }}>
            <AlertTriangle size={18} color="#92400e" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
              Advisory: This extension request is in "Extension Form Received" status. Please approve the request on the processing page to officially unlock this stage.
            </span>
          </div>
        ) : null}

        {/* ── Section 1: Form Fields (Matches Image Spec) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Company Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Company Name:
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={formData.company_name}
              onChange={(e) => setFormData(f => ({ ...f, company_name: e.target.value }))}
              placeholder="e.g. British Foods Ltd"
              style={inputStyle}
            />
          </div>

          {/* Address of certificated facility */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Address of certificated facility:
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={formData.facility_address}
              onChange={(e) => setFormData(f => ({ ...f, facility_address: e.target.value }))}
              placeholder="Full address of the manufacturing / processing facility"
              style={{
                ...inputStyle,
                fontWeight: 500
              }}
            />
          </div>

          {/* Contact Person of the company */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Contact Person of the company:
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={formData.contact_person}
              onChange={(e) => setFormData(f => ({ ...f, contact_person: e.target.value }))}
              placeholder="Full name of representative"
              style={{
                ...inputStyle,
                fontWeight: 500
              }}
            />
          </div>

          {/* Product category */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Product category:
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={formData.product_category}
              onChange={(e) => setFormData(f => ({ ...f, product_category: e.target.value }))}
              placeholder="e.g. Meat & Poultry / Confectionery / Flavours"
              style={{
                ...inputStyle,
                fontWeight: 500
              }}
            />
          </div>

          {/* Certificate Type / Scheme (Auto-detected, Read-Only / Non-Changeable) */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Certificate Type / Scheme:</span>
              <Lock size={14} style={{ color: '#64748b' }} title="Auto-detected from certified facility - cannot be changed" />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700,
                  color: (formData.scheme === 'GSO' || formData.scheme === 'Both') ? '#0f172a' : '#94a3b8',
                  cursor: 'not-allowed', opacity: (formData.scheme === 'GSO' || formData.scheme === 'Both') ? 1 : 0.65
                }}>
                  <input
                    type="checkbox"
                    disabled={true}
                    checked={formData.scheme === 'GSO' || formData.scheme === 'Both'}
                    readOnly
                    style={{ width: 18, height: 18, accentColor: '#008744', cursor: 'not-allowed' }}
                  />
                  GSO
                </label>

                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700,
                  color: (formData.scheme === 'HFA' || formData.scheme === 'Both') ? '#0f172a' : '#94a3b8',
                  cursor: 'not-allowed', opacity: (formData.scheme === 'HFA' || formData.scheme === 'Both') ? 1 : 0.65
                }}>
                  <input
                    type="checkbox"
                    disabled={true}
                    checked={formData.scheme === 'HFA' || formData.scheme === 'Both'}
                    readOnly
                    style={{ width: 18, height: 18, accentColor: '#008744', cursor: 'not-allowed' }}
                  />
                  HFA
                </label>
              </div>

              {/* Detected Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 8,
                background: '#f8fafc', border: '1px solid #cbd5e1',
                fontSize: 12.5, fontWeight: 700, color: '#1e293b'
              }}>
                <span style={{ color: '#008744', fontSize: 14 }}>●</span>
                <span>{formData.certificate_type || (formData.scheme === 'GSO' ? 'GSO SCHEME' : formData.scheme === 'Both' ? 'GSO & HFA SCHEME' : 'HFA SCHEME')}</span>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                  color: '#475569', background: '#e2e8f0', padding: '2px 6px', borderRadius: 4,
                  letterSpacing: '0.04em'
                }}>
                  Auto-detected (Locked)
                </span>
              </div>
            </div>
          </div>

          {/* Certificate expiry date */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Certificate expiry date:
            </label>
            <input
              type="date"
              disabled={isLocked}
              value={formData.certificate_expiry_date}
              onChange={(e) => setFormData(f => ({ ...f, certificate_expiry_date: e.target.value }))}
              style={{
                width: 240, padding: '8px 12px', borderRadius: 6,
                border: isLocked ? '1px solid #e2e8f0' : '1px solid #94a3b8',
                backgroundColor: isLocked ? '#f8fafc' : '#ffffff',
                fontSize: 13.5, color: isLocked ? '#334155' : '#0f172a',
                cursor: isLocked ? 'not-allowed' : 'text'
              }}
            />
          </div>

          {/* Justification for extension */}
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Justification for extension:
            </label>
            <textarea
              rows={6}
              disabled={isLocked}
              value={formData.justification}
              onChange={(e) => setFormData(f => ({ ...f, justification: e.target.value }))}
              placeholder="State the detailed operational, technical, or auditing justification for granting the certificate extension..."
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 8,
                border: isLocked ? '1px solid #e2e8f0' : '1.5px solid #64748b',
                backgroundColor: isLocked ? '#f8fafc' : '#ffffff',
                fontSize: 13.5, lineHeight: 1.6,
                color: isLocked ? '#334155' : '#0f172a',
                cursor: isLocked ? 'not-allowed' : 'text',
                resize: isLocked ? 'none' : 'vertical'
              }}
            />
          </div>

          {/* Extension required for: _____ days & 30 Days / >30 Days Toggle */}
          <div style={{
            background: isLocked ? '#f8fafc' : '#f8fafc',
            border: isLocked ? '1px solid #e2e8f0' : '1.5px dashed #cbd5e1',
            borderRadius: 12, padding: '18px 22px', marginTop: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                  Extension required for:
                </span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  disabled={isLocked}
                  value={formData.extension_days}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10) || 0;
                    setFormData(f => ({
                      ...f,
                      extension_days: days,
                      extension_duration_type: days <= 30 ? '30_days' : 'more_than_30_days'
                    }));
                  }}
                  style={{
                    width: 90, padding: '6px 10px', borderRadius: 6,
                    border: isLocked ? '1px solid #cbd5e1' : '2px solid #008744',
                    backgroundColor: isLocked ? '#ffffff' : '#ffffff',
                    fontSize: 15, fontWeight: 800,
                    textAlign: 'center', color: isLocked ? '#334155' : '#008744',
                    cursor: isLocked ? 'not-allowed' : 'text'
                  }}
                />
                <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                  days
                </span>
              </div>

              {/* Toggle Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleDurationTypeChange('30_days')}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    border: is30Days ? '2px solid #008744' : '1px solid #cbd5e1',
                    background: is30Days ? '#ecfdf5' : 'white',
                    color: is30Days ? '#008744' : '#64748b',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked && !is30Days ? 0.5 : 1
                  }}
                >
                  ✓ 30 Days (1 Signature)
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleDurationTypeChange('more_than_30_days')}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    border: !is30Days ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: !is30Days ? '#eff6ff' : 'white',
                    color: !is30Days ? '#2563eb' : '#64748b',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked && is30Days ? 0.5 : 1
                  }}
                >
                  ✓ More than 30 Days (4 Signatures)
                </button>
              </div>
            </div>
          </div>

          {/* ── Section 2: Committee Signatures & Approval Block (Visible ONLY in Waiting for Signatures / Locked state) ── */}
          {isSubmittedForSig ? (
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 24, marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PenTool size={18} style={{ color: 'var(--primary, #047857)' }} />
                    {is30Days ? 'Authorized Signatory (30-Day Extension)' : 'Committee Signatures & Executive Approval'}
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', margin: '2px 0 0' }}>
                    {is30Days
                      ? '1 Authorized Signature required for 30-day extension.'
                      : '4 Committee Signatures required for extensions exceeding 30 days.'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    background: isFullySigned ? '#dcfce7' : '#eff6ff',
                    color: isFullySigned ? '#166534' : '#1e40af',
                    border: `1px solid ${isFullySigned ? '#86efac' : '#bfdbfe'}`,
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    {isFullySigned ? <Check size={13} strokeWidth={3} /> : <Clock size={13} />}
                    {is30Days
                      ? (logsheet?.single_signature ? '1 / 1 Signed (Complete)' : '0 / 1 Signed (Pending)')
                      : `${totalSignedCount} / 4 Signatures Collected`}
                  </span>

                  {!isFullySigned && hasSignaturePrivilege && (
                    <button
                      type="button"
                      onClick={() => openSignModal()}
                      className="btn btn-outline btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 600,
                        borderRadius: 8
                      }}
                    >
                      <PenTool size={14} /> Add Signature
                    </button>
                  )}
                </div>
              </div>

              {/* Signatures Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: is30Days ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16
              }}>
                {signatories.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: `1.5px solid ${s.signature ? '#86efac' : '#e2e8f0'}`,
                      borderRadius: 10,
                      padding: 16,
                      background: s.signature ? '#f0fdf4' : '#fafafa',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 170,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      {/* Header: Label + Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: s.signature ? '#166534' : '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {s.label}
                        </span>
                        {s.signature ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#16a34a',
                            background: '#dcfce7',
                            padding: '2px 8px',
                            borderRadius: 10
                          }}>
                            <Check size={12} /> Signed
                          </span>
                        ) : (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#94a3b8',
                            background: '#f1f5f9',
                            padding: '2px 8px',
                            borderRadius: 10
                          }}>
                            Pending
                          </span>
                        )}
                      </div>

                      {/* Body: Signature Image / Name / Date OR Dashed Box */}
                      {s.signature ? (
                        <div style={{ marginTop: 8 }}>
                          <div style={{
                            background: '#fff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 50,
                            marginBottom: 8
                          }}>
                            <img
                              src={getPdfUrl(s.signature)}
                              alt={`${s.label} Signature`}
                              style={{ maxHeight: 40, maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                            {s.name || 'Authorised Signatory'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {s.date ? new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          height: 80,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1.5px dashed #cbd5e1',
                          borderRadius: 6,
                          margin: '8px 0',
                          background: '#fff'
                        }}>
                          <PenTool size={18} style={{ color: '#94a3b8', marginBottom: 4 }} />
                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Awaiting Signature</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Button */}
                    {!s.signature && (
                      <div style={{ marginTop: 8 }}>
                        {!hasSignaturePrivilege ? (
                          <button
                            type="button"
                            disabled
                            className="btn btn-outline btn-sm"
                            style={{
                              width: '100%',
                              fontSize: 11,
                              padding: '6px 10px',
                              opacity: 0.5,
                              cursor: 'not-allowed',
                              background: '#f8fafc',
                              color: '#64748b',
                              borderColor: '#cbd5e1'
                            }}
                            title="Signature Privilege required to sign logsheets"
                          >
                            <Lock size={12} style={{ marginRight: 4 }} /> Privilege Required
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openSignModal(s.roleKey)}
                          className="btn btn-outline btn-sm"
                          style={{
                            width: '100%',
                            fontSize: 12,
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            color: 'var(--primary, #047857)',
                            borderColor: 'var(--primary, #047857)'
                          }}
                        >
                          <PenTool size={13} /> Sign as {s.btnRole || s.label}
                        </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              borderTop: '2px solid #f1f5f9',
              paddingTop: 24,
              marginTop: 24
            }}>
              <div style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: 12,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldCheck size={22} color="#0369a1" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                    {is30Days ? 'Authorized Signatory Workflow' : 'Committee Signatures & Executive Approval Workflow'}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                    This signature section will automatically activate once you click <strong style={{ color: '#008744' }}>Submit for Signatures</strong> above. All logsheet fields will become locked and ready for committee sign-off ({is30Days ? '1 Authorized Signature' : '4 Committee Signatures'}).
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Signature Modal (Matches Normal Logsheet Design) ── */}
      {showSignModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, padding: 20
        }} onClick={() => setShowSignModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            width: '100%',
            maxWidth: 540,
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'slideDown 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header - Emerald Gradient Theme */}
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #047857 0%, #0d9488 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PenTool size={20} style={{ color: '#ffffff' }} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Apply Committee Electronic Signature</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Step 1: Select Single Role */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    1. Select Signatory Role to Execute (Sign One by One)
                  </label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                    {is30Days ? 'Single Role Sign' : 'Committee Sign'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'Mufti', label: 'Mufti / Shariah Signatory', isSigned: Boolean(is30Days ? logsheet?.single_signature : logsheet?.mufti_signature) },
                    { key: 'Ceo', label: 'CEO / Executive Signatory', isSigned: Boolean(is30Days ? logsheet?.single_signature : logsheet?.ceo_signature) },
                    { key: 'Manager', label: 'Manager (Technical Auditor)', isSigned: Boolean(is30Days ? logsheet?.single_signature : logsheet?.manager_signature) },
                    { key: 'Mufti2', label: 'Mufti 2 / Secondary Shariah', isSigned: Boolean(is30Days ? logsheet?.single_signature : logsheet?.mufti2_signature) },
                  ].map(r => {
                    const isSelected = sigRole === r.key;
                    const isAlreadySigned = r.isSigned;
                    const isRestrictedForMufti = isMuftiUser && (r.key === 'Ceo' || r.key === 'Manager');
                    const isDisabled = isAlreadySigned || isRestrictedForMufti;

                    return (
                      <button
                        key={r.key}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          setSigRole(r.key);
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: `1.5px solid ${isDisabled ? '#e2e8f0' : isSelected ? '#047857' : '#e2e8f0'}`,
                          background: isAlreadySigned ? '#f1f5f9' : isRestrictedForMufti ? '#fef2f2' : isSelected ? '#f0fdf4' : '#f8fafc',
                          color: isAlreadySigned ? '#94a3b8' : isRestrictedForMufti ? '#991b1b' : isSelected ? '#065f46' : '#334155',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: 13,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: isDisabled ? 0.6 : 1,
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: isSelected ? 800 : 600 }}>{r.label}</div>
                          {isAlreadySigned && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>(Already Signed)</span>}
                          {isRestrictedForMufti && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>(Mufti Restricted)</span>}
                        </div>
                        {isSelected && !isDisabled && (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#047857', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                        {isAlreadySigned && <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Signature Preview */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                  2. Authenticated Digital Signature Preview
                </label>
                {userSignature ? (
                  <div style={{ padding: '14px 18px', border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>AUTHENTICATED USER</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{userSignature.name || currentUser?.full_name || currentUser?.name || 'HFA Admin'}</div>
                    </div>
                    <img
                      src={getPdfUrl(userSignature.signature_url)}
                      alt="Digital Signature"
                      style={{ maxHeight: 42, maxWidth: 140, objectFit: 'contain', background: 'white', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: 14, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
                    No digital signature image found for your account. Please upload one in the Signatures management page.
                  </div>
                )}
              </div>

              {/* Step 3: Optional Comment */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                  3. Signature Comment / Note (Optional)
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Enter comments or conditions regarding this signature..."
                  value={sigComment}
                  onChange={e => setSigComment(e.target.value)}
                  style={{ width: '100%', fontSize: 13, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', color: '#0f172a', resize: 'vertical' }}
                />
              </div>

              {/* Step 4: EXPLICIT DOUBLE CONFIRMATION CHECKBOX */}
              <div style={{ padding: '12px 14px', background: modalConfirmed ? '#f0fdf4' : '#fffbeb', border: `1px solid ${modalConfirmed ? '#86efac' : '#fed7aa'}`, borderRadius: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={modalConfirmed}
                    onChange={e => setModalConfirmed(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#047857' }}
                  />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: modalConfirmed ? '#14532d' : '#9a3412' }}>
                    I explicitly confirm that I am applying my authorized electronic signature to this logsheet decision record.
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowSignModal(false)}
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplySignature}
                disabled={signing || !sigRole || !modalConfirmed || !userSignature}
                className="btn btn-primary"
                style={{
                  padding: '9px 24px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: (!modalConfirmed || signing || !sigRole || !userSignature) ? 0.6 : 1
                }}
              >
                {signing ? 'Applying Signature...' : 'Confirm & Apply Signature'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
