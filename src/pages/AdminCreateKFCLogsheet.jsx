import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  UploadCloud, ChevronLeft, Building, FileText, Award, MessageSquare,
  Clock, CheckCircle2, CheckCircle, CheckSquare, PenTool, Check, ShieldCheck,
  X, AlertTriangle, ArrowRight, Calendar, Download, Eye, Lock, RotateCcw
} from 'lucide-react';
import { getPdfUrl } from '../lib/pdfUtils';
import { useAuth } from '../context/AuthContext';
import { canAccessKfcLogsheet } from '../lib/permissions';

export default function AdminCreateKFCLogsheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const currentUser = profile || user;

  const userRoles = Array.isArray(currentUser?.roles) && currentUser.roles.length > 0
    ? currentUser.roles
    : (currentUser?.role ? [currentUser.role] : []);
  const isSuperAdmin = userRoles.includes('superadmin') || currentUser?.role === 'superadmin';
  const hasSignaturePrivilege = isSuperAdmin || Boolean(currentUser?.can_sign_logsheet);
  const hasCreatePrivilege = isSuperAdmin || Boolean(currentUser?.can_create_kfc_logsheet);
  const hasKfcAccess = isSuperAdmin || hasCreatePrivilege || hasSignaturePrivilege;

  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [currentLogsheet, setCurrentLogsheet] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [uploadingReport, setUploadingReport] = useState(false);

  // Signing Modal State
  const [showSignModal, setShowSignModal] = useState(false);
  const [sigRole, setSigRole] = useState('');
  const [sigComment, setSigComment] = useState('');
  const [modalConfirmed, setModalConfirmed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Form State — Manual typing for all fields, manufacturing_address is NOT compulsory
  const [form, setForm] = useState({
    site_name: '',
    company_name: '',
    company_address: '',
    manufacturing_address: '', // Optional / not compulsory
    contact_person: '',
    contact_email: '',
    nature_of_business: '',
    product_category: '',
    issue_date: todayStr,
    expiry_date: oneYearLater,
    current_cycle_start: todayStr,
    original_cycle_start: todayStr,
    document_url: '',
    document_urls: [],

    audit_type: 'KFC Logsheet',
    audit_date: todayStr,
    auditors: '',
    ncs_close: 'No NCs flagged / All NCs closed',
    docs_satisfactory: 'Satisfactory - all documentation verified',
    pork_free_statement: 'Confirmed - signed pork-free declaration in place',
    reviewed_by: 'HFA Technical Committee',
    reviewer_name: currentUser?.full_name || currentUser?.username || 'Lead Technical Reviewer',
    review_date: todayStr,

    certificate_type: 'KFC Logsheet',
    certificate_standard: 'KFC Logsheet',
    suggested_certificate_type: 'KFC Logsheet',
    annual_certificate: 'Yes',
    batch_certificate: 'No',
    new_products_only: 'No',
    new_site_line: 'No',
    new_client: 'No',
    agreement_signed: 'Yes',
    status_date: todayStr,

    comment: '',
    confirmed: false
  });

  // Signatories
  const signatories = [
    { roleKey: 'Mufti', label: 'Mufti / Shariah Signatory', signature: currentLogsheet?.mufti_signature, name: currentLogsheet?.mufti_sign_name, date: currentLogsheet?.mufti_sign_date },
    { roleKey: 'Ceo', label: 'CEO / Executive Signatory', signature: currentLogsheet?.ceo_signature, name: currentLogsheet?.ceo_sign_name, date: currentLogsheet?.ceo_sign_date },
    { roleKey: 'Manager', label: 'Manager / Technical Signatory', signature: currentLogsheet?.manager_signature, name: currentLogsheet?.manager_sign_name, date: currentLogsheet?.manager_sign_date },
    { roleKey: 'Mufti2', label: 'Mufti 2 / Secondary Shariah', signature: currentLogsheet?.mufti2_signature, name: currentLogsheet?.mufti2_sign_name, date: currentLogsheet?.mufti2_sign_date },
  ];

  const totalSignedCount = signatories.filter(s => !!s.signature).length;
  const isReadOnly = Boolean(currentLogsheet);
  const isApproved = currentLogsheet?.status === 'Completed' || currentLogsheet?.status === 'Approved';

  const userRole = (currentUser?.role || '').toLowerCase();
  const userUsername = (currentUser?.username || '').toLowerCase();
  const userFullName = (currentUser?.full_name || '').toLowerCase();
  const isMuftiUser = userRole === 'mufti' || userRole === 'shariah' || userUsername.includes('mufti') || userFullName.includes('mufti');

  const matchedSignature = (signatures || []).find(s =>
    (s.user_id && (s.user_id === currentUser?.id || s.user_id === currentUser?._id)) ||
    (s.username && currentUser?.username && s.username.toLowerCase() === currentUser.username.toLowerCase()) ||
    (s.username && currentUser?.email && s.username.toLowerCase() === currentUser.email.split('@')[0].toLowerCase()) ||
    (s.name && currentUser?.full_name && s.name.toLowerCase() === currentUser.full_name.toLowerCase()) ||
    (s.name && currentUser?.username && s.name.toLowerCase() === currentUser.username.toLowerCase())
  );

  const userSignature = matchedSignature || (currentUser?.signature_url ? {
    name: currentUser?.full_name || currentUser?.username || 'Authorized Signatory',
    signature_url: currentUser.signature_url
  } : null);

  // Load signatures for digital signing modal
  useEffect(() => {
    api.get('/api/signatures')
      .then(res => setSignatures(Array.isArray(res) ? res : (res?.data || [])))
      .catch(() => {});
  }, []);

  // Load existing logsheet if viewing /:id
  const fetchLogsheet = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/application-logsheets/${id}`);
      const log = res.data?.data || res.data;
      if (log) {
        setCurrentLogsheet(log);
        setForm({
          ...log,
          issue_date: log.issue_date ? log.issue_date.split('T')[0] : todayStr,
          expiry_date: log.expiry_date ? log.expiry_date.split('T')[0] : oneYearLater,
          current_cycle_start: log.current_cycle_start ? log.current_cycle_start.split('T')[0] : todayStr,
          original_cycle_start: log.original_cycle_start ? log.original_cycle_start.split('T')[0] : todayStr,
          audit_date: log.audit_date ? log.audit_date.split('T')[0] : todayStr,
          review_date: log.review_date ? log.review_date.split('T')[0] : todayStr,
          status_date: log.status_date ? log.status_date.split('T')[0] : todayStr,
          certificate_type: 'KFC Logsheet',
          certificate_standard: 'KFC Logsheet',
          confirmed: false
        });
      }
    } catch (err) {
      toast.error('Failed to load KFC logsheet');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchLogsheet();
    }
  }, [id]);

  // Upload Audit Report Handler
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadingReport(true);
    const toastId = toast.loading('Uploading audit document(s)...');
    try {
      const uploadedDocs = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', 'audit_report');

        const res = await api.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const docUrl = res.data?.url || res.data?.fileUrl || res.data?.secure_url || res.data?.data?.url;
        if (docUrl) {
          uploadedDocs.push({
            name: file.name,
            url: docUrl,
            uploaded_at: new Date()
          });
        }
      }

      setForm(prev => ({
        ...prev,
        document_urls: [...(prev.document_urls || []), ...uploadedDocs],
        document_url: prev.document_url || (uploadedDocs[0]?.url || '')
      }));

      toast.success(`${uploadedDocs.length} audit report(s) uploaded successfully!`, { id: toastId });
    } catch (err) {
      toast.error('Failed to upload audit documents', { id: toastId });
      console.error(err);
    } finally {
      setUploadingReport(false);
      e.target.value = '';
    }
  };

  const handleRemoveDocument = (idx) => {
    setForm(prev => {
      const nextDocs = [...(prev.document_urls || [])];
      nextDocs.splice(idx, 1);
      return {
        ...prev,
        document_urls: nextDocs,
        document_url: nextDocs[0]?.url || ''
      };
    });
  };

  // Form Submission -> Creates KFC Logsheet -> Status: 'Waiting for Signature'
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.site_name?.trim()) {
      return toast.error('Site Name is required');
    }
    if (!form.company_name?.trim()) {
      return toast.error('Company Name is required');
    }
    if (!form.company_address?.trim()) {
      return toast.error('Company Address is required');
    }
    if (!form.contact_person?.trim()) {
      return toast.error('Contact Person is required');
    }
    if (!form.contact_email?.trim()) {
      return toast.error('Contact Email is required');
    }
    if (!form.nature_of_business?.trim()) {
      return toast.error('Nature of the business is required');
    }
    if (!form.product_category?.trim()) {
      return toast.error('Product Category is required');
    }
    if (!form.comment?.trim()) {
      return toast.error('Comment / Reason for Decision is required');
    }
    if (!form.confirmed) {
      return toast.error('Please check the confirmation box before submitting');
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        source_type: 'kfc',
        logsheet_type: 'kfc',
        is_kfc: true,
        certificate_type: 'KFC Logsheet',
        certificate_standard: 'KFC Logsheet',
        status: 'Waiting for Signature'
      };

      await api.post('/api/application-logsheets/kfc', payload);
      toast.success('🍗 KFC Logsheet created successfully and moved to Waiting for Signature!');
      navigate('/logsheet/waiting-signature');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create KFC Logsheet');
    } finally {
      setSubmitting(false);
    }
  };

  // Digital Sign Modal Open
  const openSigningModal = (preselectedRole = '') => {
    if (preselectedRole) {
      setSigRole(preselectedRole);
    } else {
      const firstUnsigned = signatories.find(s => !s.signature);
      if (firstUnsigned) setSigRole(firstUnsigned.roleKey);
    }
    setModalConfirmed(false);
    setSigComment('');
    setShowSignModal(true);
  };

  // Digital Signature Application
  const handleApplySignature = async () => {
    if (!sigRole) {
      return toast.error('Please select a signatory role');
    }
    if (!modalConfirmed) {
      return toast.error('Please check the confirmation box before applying signature');
    }
    if (!userSignature) {
      return toast.error('No authenticated digital signature available. Please configure in Signatures page.');
    }
    if (isMuftiUser && (sigRole === 'Ceo' || sigRole === 'Manager')) {
      return toast.error('Mufti signatories cannot sign for CEO or Technical Auditor roles');
    }

    setIsSigning(true);
    try {
      const signerFullName = currentUser?.full_name || userSignature?.name || currentUser?.username || 'Authorized Signatory';
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        role: sigRole,
        signature_url: userSignature.signature_url,
        signature_name: signerFullName,
        comment: sigComment
      });

      toast.success(`🍗 KFC Logsheet signed successfully as ${sigRole}!`);
      setShowSignModal(false);
      setModalConfirmed(false);
      setSigComment('');
      fetchLogsheet();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to apply signature');
    } finally {
      setIsSigning(false);
    }
  };

  // Final Action: "Approve KFC Logsheet" (Replaces "Application Successful")
  // User Requirement:
  // "and when all the four signature has signed so they will press approve kfc losheet instead of application successful,
  // so after they approved it it will be in manage logsheet, so it does not require a certificate, it journey ended after they've approved it."
  const handleApproveKfcLogsheet = async () => {
    if (!hasSignaturePrivilege) {
      return toast.error('You do not have the Signature Privilege required to approve KFC logsheets.');
    }
    if (totalSignedCount < 4) {
      return toast.error(`All 4 committee signatures are strictly required for KFC Logsheet approval. (Currently ${totalSignedCount}/4 signed).`);
    }

    const isConfirmed = window.confirm(
      `Approve KFC Logsheet for "${currentLogsheet?.company_name || form.company_name}"?\n\n` +
      `All 4 committee signatures have been verified.\n` +
      `This will mark the KFC Logsheet as Approved / Completed and move it to Manage Logsheets.\n` +
      `No certificate will be generated (workflow journey completes here).`
    );
    if (!isConfirmed) return;

    setIsFinalizing(true);
    try {
      try {
        await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
          finalizeSignOff: true,
          is_kfc: true
        });
      } catch (signErr) {
        await api.put(`/api/application-logsheets/${currentLogsheet._id}/status`, {
          status: 'Completed',
          force: true
        });
      }

      setCurrentLogsheet(prev => ({ ...prev, status: 'Completed' }));
      toast.success('🍗 KFC Logsheet approved successfully! Workflow completed.');
      navigate('/logsheet/manage');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to approve KFC logsheet');
    } finally {
      setIsFinalizing(false);
    }
  };

  // 1. Loading auth status
  if (authLoading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Verifying authorization...</div>
      </div>
    );
  }

  // 2. Access Denied Fallback if user lacks any KFC privilege (neither superadmin, nor create, nor sign)
  if (!hasKfcAccess) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', padding: '0 20px' }}>
        <div style={{
          background: '#fff',
          border: '1.5px solid #fecaca',
          borderRadius: 16,
          padding: 36,
          textAlign: 'center',
          boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.1)'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#991b1b', marginBottom: 8 }}>
            🍗 KFC Logsheet Access Restricted
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
            The <strong>KFC Logsheet</strong> is a restricted special grant feature. Your account has not been assigned the
            <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, margin: '0 4px', color: '#0f172a' }}>KFC Logsheet Privilege</code> or
            <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, margin: '0 4px', color: '#0f172a' }}>Signature Privilege</code>.
            Please contact an administrator or superadmin to grant this permission.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <ChevronLeft size={16} /> Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. User has signature privilege to review/sign existing KFC logsheets, but navigated to /logsheet/kfc to create a new one
  if (!id && !hasCreatePrivilege && hasSignaturePrivilege) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', padding: '0 20px' }}>
        <div style={{
          background: '#fff',
          border: '1.5px solid #fed7aa',
          borderRadius: 16,
          padding: 36,
          textAlign: 'center',
          boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.1)'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#fff7ed',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <PenTool size={30} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#9a3412', marginBottom: 8 }}>
            🍗 KFC Logsheet Signatory Review
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24, maxWidth: 520, margin: '0 auto 24px' }}>
            Your account has the <strong>Signature Privilege</strong> to review and digitally sign KFC Logsheets. 
            Initiating a new KFC Logsheet requires creation rights, but you can review and sign all pending logsheets in the Waiting for Signature queue.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/logsheet/waiting-signature"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
            >
              <PenTool size={16} /> Go to Waiting for Signature Queue
            </Link>
            <Link
              to="/logsheet/manage"
              className="btn btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', background: '#fff' }}
            >
              Manage Logsheets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading KFC Logsheet...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-ghost btn-sm"
            style={{ borderRadius: 8, height: 38, border: '1px solid #e2e8f0', background: '#fff' }}
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🍗 KFC Logsheet
              </h1>
              <span className="badge badge-orange" style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                Special Grant
              </span>
              {currentLogsheet?.status && (
                <span className={`badge ${currentLogsheet.status === 'Completed' || currentLogsheet.status === 'Approved' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 12 }}>
                  {currentLogsheet.status === 'Completed' ? 'Approved' : currentLogsheet.status}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Special grant privileged workflow for KFC Halal evaluation and 4-committee sign-off.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/logsheet/manage" className="btn btn-ghost btn-sm" style={{ border: '1px solid #e2e8f0', background: '#fff' }}>
            Manage Logsheets
          </Link>
          <Link to="/logsheet/waiting-signature" className="btn btn-ghost btn-sm" style={{ border: '1px solid #e2e8f0', background: '#fff' }}>
            Waiting for Signature
          </Link>
        </div>
      </div>

      {/* DOCUMENT-STYLE PRESENTATION CARD — EXACTLY LIKE AdminCreateLogsheet */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', background: '#fff' }}>

        {/* Official Document Header - Bright Modern HFA Emerald Theme */}
        <div style={{ background: 'linear-gradient(135deg, #047857 0%, #0d9488 100%)', color: 'white', padding: '24px 30px', borderBottom: '1px solid #0f766e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', color: '#ffffff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8, border: '1px solid rgba(255,255,255,0.3)' }}>
                <CheckSquare size={12} /> OFFICIAL CERTIFICATION DECISION RECORD
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                🍗 KFC Halal Certification Logsheet
              </h2>
              <p style={{ fontSize: 13, color: '#d1fae5', margin: '4px 0 0' }}>
                Halal Food Authority — Technical &amp; Shariah Committee Decision File (Special Grant)
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#d1fae5', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Logsheet Ref</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
                #{currentLogsheet?.direct_ref || currentLogsheet?.logsheet_number || form.direct_ref || form.logsheet_number || (form._id ? `KFC-${String(form._id).slice(-6).toUpperCase()}` : 'KFC')}
              </div>
              <div style={{ fontSize: 12, color: '#ccfbf1', marginTop: 2 }}>
                Evaluation Type: <strong>{form.audit_type || 'KFC Logsheet'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation if creating or editing — exactly as AdminCreateLogsheet */}
        {!isReadOnly && (
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            {[
              { id: 1, label: '1. Company & Site Details', icon: Building },
              { id: 2, label: '2. Review of Application', icon: FileText },
              { id: 3, label: '3. Certificate Status', icon: Award },
              { id: 4, label: '4. Comment / Reason', icon: MessageSquare }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 16px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--primary)' : '#64748b',
                    background: isActive ? '#fff' : 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  <Icon size={15} /> {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* UNIFIED READ-ONLY DOCUMENT VIEW (When viewing existing KFC Logsheet) */}
        {isReadOnly ? (
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Section 1: Company & Site Details */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <Building size={16} style={{ color: '#047857' }} />
                1. Site &amp; Company Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Site Name</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>
                    {form.site_name || 'Main KFC Site'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company Name</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>{form.company_name || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Person</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>{form.contact_person || '—'}</div>
                  <div style={{ fontSize: 12, color: '#047857', fontWeight: 500, marginTop: 1 }}>{form.contact_email || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company Registered Address</div>
                  <div style={{ fontSize: 13, color: '#1e293b', marginTop: 3, fontWeight: 500 }}>{form.company_address || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Manufacturing Site Address</div>
                  <div style={{ fontSize: 13, color: '#1e293b', marginTop: 3, fontWeight: 500 }}>{form.manufacturing_address || '— (Optional)'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nature of Business</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.nature_of_business || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product Category</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.product_category || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Issue Date</div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 3 }}>{form.issue_date ? new Date(form.issue_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expiry Date</div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 3 }}>{form.expiry_date ? new Date(form.expiry_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Cycle Start Date</div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 3 }}>{form.current_cycle_start ? new Date(form.current_cycle_start).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Original Cycle Start Date</div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 3 }}>{form.original_cycle_start ? new Date(form.original_cycle_start).toLocaleDateString('en-GB') : '—'}</div>
                </div>
              </div>
            </div>

            {/* Section 2: Audit & Technical Compliance Review */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <FileText size={16} style={{ color: '#047857' }} />
                2. Audit &amp; Technical Compliance Review
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audit Type</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0d9488', marginTop: 3 }}>{form.audit_type || 'KFC Logsheet'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audit Date</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.audit_date ? new Date(form.audit_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Auditor(s) Assigned</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.auditors || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Non-Conformances (NCS Close)</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d', marginTop: 3 }}>
                    {form.ncs_close || 'No NCs Flagged'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Documentation Review Status</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 3 }}>{form.docs_satisfactory || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pork Free Policy Statement</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 3 }}>{form.pork_free_statement || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reviewed By (Role / Dept)</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.reviewed_by || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reviewer Name</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.reviewer_name || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date of Review</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.review_date ? new Date(form.review_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>
              </div>
            </div>

            {/* Section 3: Certificate Status Checks */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <Award size={16} style={{ color: '#047857' }} />
                3. Scheme &amp; Certificate Status Checks
              </h4>
              <div style={{ background: '#f0fdfa', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #99f6e4', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#0d9488', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Standard / Scheme</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {form.certificate_type || form.certificate_standard || 'KFC Logsheet'}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', background: '#ccfbf1', padding: '3px 9px', borderRadius: 20 }}>
                  Special Grant Workflow
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
                {[
                  { label: 'Annual Certificate', val: form.annual_certificate },
                  { label: 'Batch Certificate', val: form.batch_certificate },
                  { label: 'Only Addition of New Products', val: form.new_products_only },
                  { label: 'Addition of New Site / Line', val: form.new_site_line },
                  { label: 'New Client', val: form.new_client },
                  { label: 'Agreement Signed', val: form.agreement_signed }
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.val === 'Yes' ? '#15803d' : '#64748b' }}>{item.val || 'No'}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Status Effective Date: <strong>{form.status_date ? new Date(form.status_date).toLocaleDateString('en-GB') : '—'}</strong>
              </div>
            </div>

            {/* Section 4: Committee Comments & Reasoning */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <MessageSquare size={16} style={{ color: '#047857' }} />
                4. Committee Comments &amp; Reasoning
              </h4>
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13.5, lineHeight: 1.6, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {form.comment || 'No comments recorded.'}
              </div>
            </div>

            {/* Section 5: Supporting Documents */}
            {((Array.isArray(form.document_urls) && form.document_urls.length > 0) || form.document_url) && (
              <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  <FileText size={16} style={{ color: '#047857' }} />
                  5. Supporting Audit Documents
                </h4>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {Array.isArray(form.document_urls) && form.document_urls.length > 0 ? (
                    form.document_urls.map((doc, idx) => (
                      <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 12px' }}>
                        <a
                          href={getPdfUrl(doc.url)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, textDecoration: 'none', color: '#0369a1', fontWeight: 600 }}
                        >
                          <Download size={13} /> {doc.name || `Document_${idx + 1}`}
                        </a>
                      </div>
                    ))
                  ) : form.document_url ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 12px' }}>
                      <a
                        href={getPdfUrl(form.document_url)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, textDecoration: 'none', color: '#0369a1', fontWeight: 600 }}
                      >
                        <Download size={13} /> Attached Audit Document
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Section 6: Committee Signatures Matrix */}
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 24, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PenTool size={18} style={{ color: 'var(--primary)' }} />
                    Committee Signatures (4 Required)
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Official digital signatures applied by authorized Shariah &amp; Management committee members.
                  </p>
                </div>
                {totalSignedCount < 4 && hasSignaturePrivilege && !isApproved && (
                  <button
                    onClick={() => openSigningModal()}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                  >
                    <PenTool size={14} /> Add Signature
                  </button>
                )}
              </div>

              {/* 4-Role Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
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
                      minHeight: 170
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: s.signature ? '#166534' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {s.label}
                        </span>
                        {s.signature ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 10 }}>
                            <Check size={12} /> Signed
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                            Pending
                          </span>
                        )}
                      </div>

                      {s.signature ? (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 50, marginBottom: 8 }}>
                            <img
                              src={getPdfUrl(s.signature)}
                              alt={`${s.label} Signature`}
                              style={{ maxHeight: 40, maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{s.name || 'Authorised Signatory'}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {s.date ? new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed #cbd5e1', borderRadius: 6, margin: '8px 0', background: '#fff' }}>
                          <PenTool size={18} style={{ color: '#94a3b8', marginBottom: 4 }} />
                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Awaiting Signature</span>
                        </div>
                      )}
                    </div>

                    {!s.signature && (
                      <div style={{ marginTop: 8 }}>
                        {!hasSignaturePrivilege ? (
                          <button
                            type="button"
                            disabled
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: 11, padding: '6px 10px', opacity: 0.5, cursor: 'not-allowed', background: '#f8fafc', color: '#64748b', borderColor: '#cbd5e1' }}
                            title="Signature Privilege required to sign logsheets"
                          >
                            <Lock size={12} style={{ marginRight: 4 }} /> Privilege Required
                          </button>
                        ) : isMuftiUser && (s.roleKey === 'Ceo' || s.roleKey === 'Manager') ? (
                          <button
                            type="button"
                            disabled
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: 11, padding: '6px 10px', opacity: 0.5, cursor: 'not-allowed', background: '#fef2f2', color: '#991b1b', borderColor: '#fca5a5' }}
                          >
                            Restricted (Mufti)
                          </button>
                        ) : userSignature ? (
                          <button
                            type="button"
                            onClick={() => openSigningModal(s.roleKey)}
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--primary)', borderColor: 'var(--primary)', fontWeight: 700 }}
                          >
                            <PenTool size={13} /> Sign as {s.roleKey}
                          </button>
                        ) : (
                          <Link
                            to="/signatures"
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: 11, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none', color: '#64748b', borderColor: '#cbd5e1' }}
                            title="Upload signature in Signatures page first"
                          >
                            <PenTool size={12} /> Configure Signature
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ACTION BLOCK: APPROVE KFC LOGSHEET (REPLACES APPLICATION SUCCESSFUL) */}
              <div
                style={{
                  marginTop: 24,
                  padding: 18,
                  background: isApproved ? '#f0fdf4' : totalSignedCount === 4 ? '#f0fdf4' : '#fffbeb',
                  borderRadius: 10,
                  border: `1.5px solid ${isApproved ? '#86efac' : totalSignedCount === 4 ? '#bbf7d0' : '#fde68a'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: isApproved || totalSignedCount === 4 ? '#14532d' : '#92400e' }}>
                    {isApproved
                      ? 'KFC Logsheet Approved & Completed'
                      : totalSignedCount === 4
                      ? 'Committee Review & Signatures Ready'
                      : 'Committee Signatures Pending'}
                  </div>
                  <div style={{ fontSize: 12, color: isApproved || totalSignedCount === 4 ? '#166534' : '#b45309', marginTop: 2 }}>
                    {isApproved
                      ? 'All 4 committee signatures verified and KFC logsheet officially approved. The workflow is complete.'
                      : totalSignedCount === 4
                      ? 'All 4 committee signatures collected. Click "Approve KFC Logsheet" to complete review and move to Manage Logsheets. (No certificate required).'
                      : `Requires all 4 signatures — currently ${totalSignedCount}/4 signed.`}
                  </div>
                </div>

                {isApproved ? (
                  <button
                    type="button"
                    disabled
                    className="btn"
                    style={{
                      background: '#dcfce7',
                      border: '1.5px solid #86efac',
                      color: '#15803d',
                      fontWeight: 800,
                      padding: '10px 24px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: 10,
                      cursor: 'not-allowed',
                      boxShadow: 'none',
                      opacity: 1,
                      pointerEvents: 'none'
                    }}
                  >
                    <CheckCircle2 size={16} strokeWidth={2.5} style={{ color: '#16a34a' }} />
                    Approved
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApproveKfcLogsheet}
                    disabled={isFinalizing || totalSignedCount < 4 || !hasSignaturePrivilege}
                    className="btn btn-primary"
                    style={{
                      background: totalSignedCount === 4 && hasSignaturePrivilege ? 'linear-gradient(135deg, #15803d, #16a34a)' : '#cbd5e1',
                      borderColor: totalSignedCount === 4 && hasSignaturePrivilege ? '#15803d' : '#cbd5e1',
                      color: totalSignedCount === 4 && hasSignaturePrivilege ? '#fff' : '#64748b',
                      fontWeight: 800,
                      padding: '10px 22px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: 10,
                      boxShadow: totalSignedCount === 4 && hasSignaturePrivilege ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
                      cursor: totalSignedCount === 4 && hasSignaturePrivilege ? 'pointer' : 'not-allowed'
                    }}
                    title={!hasSignaturePrivilege ? 'Signature Privilege required to approve' : ''}
                  >
                    {isFinalizing ? (
                      <span className="spinner-white" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} strokeWidth={2.5} />
                        Approve KFC Logsheet
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* FORM VIEW FOR CREATING NEW KFC LOGSHEET — MANUAL TYPING ONLY */
          <form onSubmit={handleSubmit} noValidate style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* TAB 1: COMPANY & SITE DETAILS */}
            {activeTab === 1 && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                    Site Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.site_name || ''}
                    onChange={e => setForm({ ...form, site_name: e.target.value })}
                    placeholder="Enter site / facility / store name"
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                    Company Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.company_name || ''}
                    onChange={e => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Enter registered company name"
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                    Contact Person <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.contact_person || ''}
                    onChange={e => setForm({ ...form, contact_person: e.target.value })}
                    placeholder="Enter contact person name"
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Company Address <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.company_address || ''}
                    onChange={e => setForm({ ...form, company_address: e.target.value })}
                    placeholder="Registered company address"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                {/* Manufacturing Site Address — NOT COMPULSORY */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Manufacturing Site Address <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.manufacturing_address || ''}
                    onChange={e => setForm({ ...form, manufacturing_address: e.target.value })}
                    placeholder="Manufacturing site address (Optional)"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ margin: 0 }}>
                    Contact E-mail <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="email"
                    className="form-control"
                    value={form.contact_email || ''}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })}
                    placeholder="name@company.com"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ margin: 0 }}>
                    Nature of the business <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.nature_of_business || ''}
                    onChange={e => setForm({ ...form, nature_of_business: e.target.value })}
                    placeholder="e.g. Halal Food Production & Fast Food Service"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">
                    Product Category <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.product_category || ''}
                    onChange={e => setForm({ ...form, product_category: e.target.value })}
                    placeholder="e.g. KFC Menu Items & Halal Ingredients"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Issue date of certificate <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="date"
                    className="form-control"
                    value={form.issue_date?.split('T')[0] || ''}
                    onChange={e => setForm({ ...form, issue_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Expiry date of certificate <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="date"
                    className="form-control"
                    value={form.expiry_date?.split('T')[0] || ''}
                    onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Current Cycle Start Date <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="date"
                    className="form-control"
                    value={form.current_cycle_start?.split('T')[0] || ''}
                    onChange={e => setForm({ ...form, current_cycle_start: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Original Cycle Start Date <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="date"
                    className="form-control"
                    value={form.original_cycle_start?.split('T')[0] || ''}
                    onChange={e => setForm({ ...form, original_cycle_start: e.target.value })}
                  />
                </div>

                {/* Upload Audit Reports in Tab 1 */}
                <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: 0 }}>
                      Upload Audit Reports
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: uploadingReport ? '#94a3b8' : 'var(--primary)', fontWeight: 600, cursor: uploadingReport ? 'not-allowed' : 'pointer' }}>
                      <UploadCloud size={14} /> {uploadingReport ? 'Uploading...' : 'Add Audit Reports'}
                      <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                    </label>
                  </div>

                  {Array.isArray(form.document_urls) && form.document_urls.length > 0 ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {form.document_urls.map((doc, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '10px 14px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircle2 size={16} color="#16a34a" />
                            <a href={getPdfUrl(doc.url)} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                              {doc.name || `Audit_Report_${idx + 1}.pdf`}
                            </a>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#dc2626', padding: '2px 8px' }}
                            onClick={() => handleRemoveDocument(idx)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                        <UploadCloud size={14} /> + Upload another document
                        <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                      </label>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                      No audit report files attached yet. (Optional)
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: REVIEW OF APPLICATION */}
            {activeTab === 2 && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Audit Type <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    required
                    className="form-control"
                    value={form.audit_type}
                    onChange={e => setForm({ ...form, audit_type: e.target.value })}
                  >
                    <option value="KFC Logsheet">KFC Logsheet</option>
                    <option value="New">New</option>
                    <option value="Surveillance">Surveillance</option>
                    <option value="Re-audit">Re-audit</option>
                    <option value="Add-on Product Review">Add-on Product Review</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Audit Date <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="date"
                    className="form-control"
                    value={form.audit_date?.split('T')[0] || ''}
                    onChange={e => setForm({ ...form, audit_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Auditors <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe, Jane Smith"
                    value={form.auditors || ''}
                    onChange={e => setForm({ ...form, auditors: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    NCS Close (if any)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.ncs_close || ''}
                    onChange={e => setForm({ ...form, ncs_close: e.target.value })}
                    placeholder="e.g. No NCs flagged / All NCs closed"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">
                    Audit Documentation reviewed and found satisfactory <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.docs_satisfactory}
                    onChange={e => setForm({ ...form, docs_satisfactory: e.target.value })}
                    placeholder="e.g. Satisfactory - all documentation verified"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">
                    Pork free statement / signed pork policy submitted <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.pork_free_statement}
                    onChange={e => setForm({ ...form, pork_free_statement: e.target.value })}
                    placeholder="e.g. Confirmed - signed pork-free declaration in place"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Reviewed By <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.reviewed_by}
                    onChange={e => setForm({ ...form, reviewed_by: e.target.value })}
                    placeholder="e.g. HFA Technical Committee"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Reviewer Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={form.reviewer_name}
                    onChange={e => setForm({ ...form, reviewer_name: e.target.value })}
                    placeholder="e.g. Lead Technical Reviewer"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">
                    Date of Review <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    required
                    type="date"
                    className="form-control"
                    style={{ maxWidth: 300 }}
                    value={form.review_date?.split('T')[0] || ''}
                    onChange={e => setForm({ ...form, review_date: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: CERTIFICATE STATUS */}
            {activeTab === 3 && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Certificate Type / Scheme Selection */}
                <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '16px 18px', borderRadius: 12, border: '1.5px solid #cbd5e1' }}>
                  <label className="form-label" style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a', marginBottom: 6, display: 'block' }}>
                    Certificate Type / Scheme <span style={{ color: '#dc2626' }}>* (Required)</span>
                  </label>
                  <select
                    required
                    className="form-control"
                    value={form.certificate_type || 'KFC Logsheet'}
                    onChange={e => setForm({ ...form, certificate_type: e.target.value, certificate_standard: e.target.value, suggested_certificate_type: e.target.value })}
                    style={{ fontWeight: 700, fontSize: 13.5, background: '#f0fdfa', borderColor: '#0e7490' }}
                  >
                    <option value="KFC Logsheet">KFC Logsheet (Special Grant)</option>
                    <option value="HFA SCHEME NON MEAT">HFA SCHEME NON MEAT (Food &amp; General Manufacturing)</option>
                    <option value="HFA SCHEME MEAT">HFA SCHEME MEAT (Meat &amp; Poultry Processing)</option>
                    <option value="GSO NON MEAT">GSO NON MEAT (UAE / GCC Scheme - Non-Meat Food)</option>
                    <option value="GSO MEAT">GSO MEAT (UAE / GCC Scheme - Meat Processing)</option>
                    <option value="COSMETICS">COSMETICS (Personal Care &amp; Cosmetics Scheme)</option>
                    <option value="SMIIC">SMIIC (OIC / SMIIC Halal Scheme)</option>
                  </select>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                    💡 <strong>KFC Standard:</strong> KFC Logsheets are approved by committee signatures directly and do not require a certificate.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Annual certificate <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.annual_certificate} onChange={e => setForm({ ...form, annual_certificate: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Batch certificate <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.batch_certificate} onChange={e => setForm({ ...form, batch_certificate: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Only addition of new products <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.new_products_only} onChange={e => setForm({ ...form, new_products_only: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Addition of new site (or line) <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.new_site_line} onChange={e => setForm({ ...form, new_site_line: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">New Client <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.new_client} onChange={e => setForm({ ...form, new_client: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Agreement Signed <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.agreement_signed} onChange={e => setForm({ ...form, agreement_signed: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Status Date <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" style={{ maxWidth: 300 }} value={form.status_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, status_date: e.target.value })} />
                </div>
              </div>
            )}

            {/* TAB 4: COMMENT / REASON */}
            {activeTab === 4 && (
              <div className="form-group">
                <label className="form-label">Comment / Reason for Decision <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea
                  required
                  className="form-control"
                  rows={8}
                  style={{ fontSize: 14, padding: 14 }}
                  placeholder="Enter final review comments, conditions, or recommendations..."
                  value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                />
              </div>
            )}

            {/* Bottom Footer Submit — EXACTLY as AdminCreateLogsheet */}
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.confirmed}
                  onChange={e => setForm({ ...form, confirmed: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  I confirm that all product and audit compliance details above have been verified. <span style={{ color: '#dc2626' }}>*</span>
                </span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !form.confirmed}
                  style={{
                    padding: '10px 24px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: form.confirmed ? 'pointer' : 'not-allowed'
                  }}
                >
                  {submitting ? 'Saving Logsheet...' : 'Create & Save Logsheet'}
                </button>
              </div>
            </div>

          </form>
        )}
      </div>

      {/* INTERACTIVE SIGNATURE MODAL */}
      {showSignModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            width: '100%',
            maxWidth: 520,
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            animation: 'slideDown 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #047857 0%, #0d9488 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PenTool size={20} style={{ color: '#ffffff' }} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Apply Committee Electronic Signature</h3>
              </div>
              <button
                onClick={() => setShowSignModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Step 1: Select Role */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                  1. Select Signatory Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'Mufti', label: 'Mufti / Shariah Signatory', isSigned: Boolean(currentLogsheet?.mufti_signature) },
                    { key: 'Ceo', label: 'CEO / Executive Signatory', isSigned: Boolean(currentLogsheet?.ceo_signature) },
                    { key: 'Manager', label: 'Manager (Technical)', isSigned: Boolean(currentLogsheet?.manager_signature) },
                    { key: 'Mufti2', label: 'Mufti 2 / Secondary Shariah', isSigned: Boolean(currentLogsheet?.mufti2_signature) },
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
                          border: `1.5px solid ${isDisabled ? '#e2e8f0' : isSelected ? 'var(--primary)' : '#e2e8f0'}`,
                          background: isAlreadySigned ? '#f1f5f9' : isRestrictedForMufti ? '#fef2f2' : isSelected ? '#f0fdf4' : '#f8fafc',
                          color: isAlreadySigned ? '#94a3b8' : isRestrictedForMufti ? '#991b1b' : isSelected ? 'var(--primary-dark)' : '#334155',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: 12.5,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: isDisabled ? 0.6 : 1,
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <div>{r.label}</div>
                          {isAlreadySigned && <span style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 700 }}>(Already Signed)</span>}
                        </div>
                        {isSelected && !isDisabled && <Check size={14} style={{ color: 'var(--primary)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Signature Preview */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                  2. Authenticated Digital Signature Preview
                </label>
                {userSignature ? (
                  <div style={{ padding: '14px 18px', border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>AUTHENTICATED SIGNER</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{userSignature.name}</div>
                    </div>
                    <img
                      src={getPdfUrl(userSignature.signature_url)}
                      alt="Digital Signature"
                      style={{ maxHeight: 42, maxWidth: 140, objectFit: 'contain', background: 'white', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: 14, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span>No digital signature image found for your account.</span>
                    <Link to="/signatures" className="btn btn-sm btn-outline" style={{ fontSize: 11, background: '#fff', whiteSpace: 'nowrap' }}>
                      Upload Signature
                    </Link>
                  </div>
                )}
              </div>

              {/* Step 3: Optional Comment */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                  3. Signature Comment (Optional)
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Enter endorsement notes or conditions..."
                  value={sigComment}
                  onChange={e => setSigComment(e.target.value)}
                  style={{ fontSize: 13 }}
                />
              </div>

              {/* Step 4: Double Confirmation */}
              <div style={{ padding: '12px 14px', background: modalConfirmed ? '#f0fdf4' : '#fffbeb', border: `1px solid ${modalConfirmed ? '#86efac' : '#fed7aa'}`, borderRadius: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={modalConfirmed}
                    onChange={e => setModalConfirmed(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>
                    I formally confirm my review and authorization of this KFC Halal Logsheet.
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="btn btn-ghost"
                  style={{ fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSigning || !modalConfirmed || !sigRole || !userSignature}
                  onClick={handleApplySignature}
                  className="btn btn-primary"
                  style={{
                    fontWeight: 800,
                    padding: '10px 20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {isSigning ? <span className="spinner-white" /> : <><Check size={16} /> Sign as {sigRole || 'Selected Role'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
