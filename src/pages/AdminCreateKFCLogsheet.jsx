import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  UploadCloud, ChevronLeft, Building, FileText, CheckCircle2,
  PenTool, Check, Lock, X, Download, Printer,
  Package, Mail, User, MapPin, AlertCircle, Calendar, Plus, Trash2
} from 'lucide-react';
import { getPdfUrl } from '../lib/pdfUtils';
import { useAuth } from '../context/AuthContext';

export default function AdminCreateKFCLogsheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const currentUser = profile || user;

  const userRoles = (Array.isArray(currentUser?.roles) && currentUser.roles.length > 0
    ? currentUser.roles
    : (currentUser?.role ? [currentUser.role] : [])).map(r => String(r).toLowerCase().trim());
  const isSuperAdmin = userRoles.includes('superadmin') || currentUser?.role === 'superadmin';
  const hasSignaturePrivilege = isSuperAdmin || Boolean(currentUser?.can_sign_logsheet);
  const hasCreatePrivilege = isSuperAdmin || Boolean(currentUser?.can_create_kfc_logsheet);
  const hasKfcAccess = isSuperAdmin || hasCreatePrivilege || (Boolean(id) && hasSignaturePrivilege);

  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);
  const [currentLogsheet, setCurrentLogsheet] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [uploadingReport, setUploadingReport] = useState(false);

  // Digital Signing Modal State
  const [showSignModal, setShowSignModal] = useState(false);
  const [sigRole, setSigRole] = useState('');
  const [sigComment, setSigComment] = useState('');
  const [modalConfirmed, setModalConfirmed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Streamlined KFC Logsheet Form State (strictly required fields)
  const [form, setForm] = useState({
    company_name: '',
    company_address: '',
    manufacturing_address: '', // Optional / not compulsory
    products: [{ name: '', code: '' }],
    remark: '', // Maps to comment/remark
    contact_person: '',
    contact_email: '',
    document_urls: [],
    confirmed: false
  });

  const handleAddProduct = () => {
    setForm(prev => ({
      ...prev,
      products: [...(prev.products || []), { name: '', code: '' }]
    }));
  };

  const handleRemoveProduct = (index) => {
    setForm(prev => {
      const updated = [...(prev.products || [])];
      updated.splice(index, 1);
      return {
        ...prev,
        products: updated.length > 0 ? updated : [{ name: '', code: '' }]
      };
    });
  };

  const handleProductChange = (index, field, value) => {
    setForm(prev => {
      const updated = [...(prev.products || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, products: updated };
    });
  };

  // Signatories Matrix
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

  // Load signature profiles
  useEffect(() => {
    api.get('/api/signatures')
      .then(res => setSignatures(Array.isArray(res) ? res : (res?.data || [])))
      .catch(() => {});
  }, []);

  // Fetch Logsheet when viewing existing ID
  const fetchLogsheet = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/application-logsheets/${id}`);
      const log = res.data?.data || res.data;
      if (log) {
        setCurrentLogsheet(log);
        let products = [];
        if (Array.isArray(log.products_list) && log.products_list.length > 0) {
          products = log.products_list.map(p => ({
            name: p.name || '',
            code: p.code || ''
          }));
        } else if (log.product_name) {
          const names = log.product_name.split(',').map(s => s.trim()).filter(Boolean);
          const codes = (log.product_code || '').split(',').map(s => s.trim());
          if (names.length > 1) {
            products = names.map((name, i) => ({
              name,
              code: codes[i] || ''
            }));
          } else {
            products = [{
              name: log.product_name || '',
              code: log.product_code || ''
            }];
          }
        } else {
          products = [{ name: '', code: '' }];
        }

        setForm({
          company_name: log.company_name || '',
          company_address: log.company_address || '',
          manufacturing_address: log.manufacturing_address || '',
          products: products,
          remark: log.comment || '',
          contact_person: log.contact_person || '',
          contact_email: log.contact_email || '',
          document_urls: Array.isArray(log.document_urls) ? log.document_urls : (log.document_url ? [{ name: 'Audit Document', url: log.document_url }] : []),
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

  // Upload Audit Supporting Documents
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadingReport(true);
    const toastId = toast.loading('Uploading document(s)...');
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
        document_urls: [...(prev.document_urls || []), ...uploadedDocs]
      }));

      toast.success(`${uploadedDocs.length} document(s) uploaded successfully!`, { id: toastId });
    } catch (err) {
      toast.error('Failed to upload document(s)', { id: toastId });
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
        document_urls: nextDocs
      };
    });
  };

  // Submit KFC Logsheet (Strictly validated for the 8 details, product code optional, multiple products supported)
  const handleSubmit = async (e) => {
    e.preventDefault();

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

    const validProducts = (form.products || []).filter(p => p.name && p.name.trim() !== '');
    if (validProducts.length === 0) {
      return toast.error('Please enter at least one Product Name');
    }

    if (!form.confirmed) {
      return toast.error('Please check the confirmation box before submitting');
    }

    setSubmitting(true);
    try {
      const payload = {
        company_name: form.company_name.trim(),
        company_address: form.company_address.trim(),
        manufacturing_address: (form.manufacturing_address || '').trim(),
        products_list: validProducts.map(p => ({
          name: p.name.trim(),
          code: (p.code || '').trim()
        })),
        product_name: validProducts.map(p => p.name.trim()).join(', '),
        product_code: validProducts.map(p => (p.code || '').trim()).filter(Boolean).join(', '),
        comment: (form.remark || '').trim(),
        contact_person: form.contact_person.trim(),
        contact_email: form.contact_email.trim(),
        document_urls: form.document_urls || [],
        source_type: 'kfc',
        logsheet_type: 'kfc',
        is_kfc: true,
        certificate_type: 'KFC Logsheet',
        certificate_standard: 'KFC Logsheet',
        status: 'Waiting for Signature'
      };

      const res = await api.post('/api/application-logsheets/kfc', payload);
      const createdId = res.data?.data?._id || res.data?._id;
      toast.success('🍗 KFC Logsheet created successfully and moved to Waiting for Signature!');
      if (createdId) {
        navigate(`/logsheet/kfc/${createdId}`);
      } else {
        navigate('/logsheet/waiting-signature');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create KFC Logsheet');
    } finally {
      setSubmitting(false);
    }
  };

  // Digital Sign Modal
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

  // Final Action: "Approve KFC Logsheet" (No certificate required, workflow completes here)
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

  // Auth Loading
  if (authLoading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Verifying authorization...</div>
      </div>
    );
  }

  // Access Restriction
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
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, maxWidth: 500, margin: '0 auto 24px' }}>
            The <strong>KFC Logsheet</strong> is a restricted special grant feature. Your account has not been assigned the
            <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, margin: '0 4px', color: '#0f172a' }}>KFC Logsheet Privilege</code> or
            <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, margin: '0 4px', color: '#0f172a' }}>Signature Privilege</code>.
            Please contact a Superadmin to grant this permission.
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

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading KFC Logsheet...</div>
      </div>
    );
  }

  const refNumber = currentLogsheet?.logsheet_number || currentLogsheet?.direct_ref || (currentLogsheet?._id ? `KFC-${String(currentLogsheet._id).slice(-6).toUpperCase()}` : 'NEW');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
      {/* Top Header Bar */}
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
              <span className="badge badge-orange" style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                Special Grant
              </span>
              {currentLogsheet?.status && (
                <span className={`badge ${isApproved ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 12 }}>
                  {isApproved ? 'Approved' : currentLogsheet.status}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Special grant privileged evaluation form for KFC Halal products and committee sign-off.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isReadOnly && (
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-ghost btn-sm"
              style={{ border: '1px solid #cbd5e1', background: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Printer size={14} /> Print / Save PDF
            </button>
          )}
          <Link to="/logsheet/manage" className="btn btn-ghost btn-sm" style={{ border: '1px solid #e2e8f0', background: '#fff' }}>
            Manage Logsheets
          </Link>
          <Link to="/logsheet/waiting-signature" className="btn btn-ghost btn-sm" style={{ border: '1px solid #e2e8f0', background: '#fff' }}>
            Waiting for Signature
          </Link>
        </div>
      </div>

      {/* Main Document Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', background: '#fff' }}>
        
        {/* Document Header Ribbon */}
        <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ea580c 100%)', color: '#fff', padding: '24px 30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8, border: '1px solid rgba(255,255,255,0.3)' }}>
                🍗 KFC EVALUATION &amp; CERTIFICATION LOGSHEET
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Halal Food Authority — KFC Logsheet
              </h2>
              <p style={{ fontSize: 13, color: '#fef2f2', margin: '4px 0 0' }}>
                Streamlined KFC product evaluation record and 4-committee sign-off decision file.
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#fee2e2', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Logsheet Ref</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
                #{refNumber}
              </div>
              <div style={{ fontSize: 12, color: '#fecaca', marginTop: 2 }}>
                Workflow: <strong>Special Grant (No Direct Cert Required)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ─── CASE A: READ-ONLY / SIGNING VIEW (when viewing existing logsheet) ─── */}
        {isReadOnly ? (
          <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* The 8 KFC Details Grid */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <Building size={16} style={{ color: '#dc2626' }} />
                KFC Logsheet Details
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                
                {/* 1. Company Name */}
                <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Company Name
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                    {form.company_name || '—'}
                  </div>
                </div>

                {/* 2. Contact Person & Email */}
                <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    2. Contact Person &amp; Email
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={14} style={{ color: '#64748b' }} /> {form.contact_person || '—'}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={13} /> {form.contact_email || '—'}
                  </div>
                </div>

                {/* 3. Company Address */}
                <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    3. Company Address
                  </div>
                  <div style={{ fontSize: 13.5, color: '#1e293b', marginTop: 4, fontWeight: 500, lineHeight: 1.5 }}>
                    {form.company_address || '—'}
                  </div>
                </div>

                {/* 4. Manufacturing Address (Optional) */}
                <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    4. Manufacturing Address <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: form.manufacturing_address ? '#1e293b' : '#94a3b8', marginTop: 4, fontWeight: 500, lineHeight: 1.5 }}>
                    {form.manufacturing_address || 'Not specified (optional)'}
                  </div>
                </div>

                {/* 5. Products List */}
                <div style={{ background: '#f8fafc', padding: '16px 18px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Package size={14} style={{ color: '#dc2626' }} />
                    5. Products Evaluated ({(form.products || []).length})
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '1.5px solid #cbd5e1' }}>
                          <th style={{ padding: '8px 14px', width: 45, color: '#475569', fontWeight: 700 }}>#</th>
                          <th style={{ padding: '8px 14px', color: '#0f172a', fontWeight: 700 }}>Product Name</th>
                          <th style={{ padding: '8px 14px', width: 240, color: '#475569', fontWeight: 700 }}>Product Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(form.products || []).map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: idx === (form.products || []).length - 1 ? 'none' : '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Package size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                                <span>{p.name || '—'}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {p.code ? (
                                <code style={{ background: '#e2e8f0', padding: '3px 8px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                                  {p.code}
                                </code>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>Not specified</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 7. Remark */}
                <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    7. Remark / Committee Notes
                  </div>
                  <div style={{ fontSize: 13.5, color: '#1e293b', marginTop: 4, fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {form.remark || '—'}
                  </div>
                </div>

                {/* 8. Attached Documents */}
                {form.document_urls && form.document_urls.length > 0 && (
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                      8. Supporting Documents ({form.document_urls.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {form.document_urls.map((doc, idx) => (
                        <a
                          key={idx}
                          href={getPdfUrl(doc.url)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            background: '#fff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 12.5,
                            color: '#0f172a',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          <Download size={13} style={{ color: '#dc2626' }} />
                          {doc.name || `Attachment_${idx + 1}.pdf`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Committee Signatures Matrix (4 Required) */}
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PenTool size={18} style={{ color: '#dc2626' }} />
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
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#dc2626', borderColor: '#fca5a5' }}
                  >
                    <PenTool size={14} /> Add Signature
                  </button>
                )}
              </div>

              {/* 4-Role Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
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
                            style={{ width: '100%', fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#dc2626', borderColor: '#dc2626', fontWeight: 700 }}
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

              {/* ACTION BLOCK: APPROVE KFC LOGSHEET */}
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
                      ? 'All 4 committee signatures verified and KFC logsheet officially approved. Workflow journey is completed.'
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
                      cursor: 'not-allowed'
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
                      cursor: totalSignedCount === 4 && hasSignaturePrivilege ? 'pointer' : 'not-allowed'
                    }}
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
          /* ─── CASE B: STREAMLINED CREATION FORM (strictly the 8 KFC details) ─── */
          <form onSubmit={handleSubmit} noValidate style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building size={18} style={{ color: '#dc2626' }} />
                Enter KFC Logsheet Details
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Please fill in the required company, contact, and product details below.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              
              {/* 1. Company Name */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                  Company Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  required
                  type="text"
                  className="form-control"
                  placeholder="e.g. Kentucky Fried Chicken (KFC UK) / Franchise Entity"
                  value={form.company_name}
                  onChange={e => setForm({ ...form, company_name: e.target.value })}
                  style={{ height: 44, fontSize: 14, fontWeight: 600 }}
                />
              </div>

              {/* 2. Contact Person */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                  Contact Person <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    required
                    type="text"
                    className="form-control"
                    placeholder="Full name of representative"
                    value={form.contact_person}
                    onChange={e => setForm({ ...form, contact_person: e.target.value })}
                    style={{ paddingLeft: 36, height: 44, fontSize: 13.5, fontWeight: 500 }}
                  />
                </div>
              </div>

              {/* 3. Email */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                  Contact Email <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    required
                    type="email"
                    className="form-control"
                    placeholder="representative@kfc.co.uk"
                    value={form.contact_email}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })}
                    style={{ paddingLeft: 36, height: 44, fontSize: 13.5, fontWeight: 500 }}
                  />
                </div>
              </div>

              {/* 4. Company Address */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                  Company Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  className="form-control"
                  placeholder="Registered head office / legal business address"
                  value={form.company_address}
                  onChange={e => setForm({ ...form, company_address: e.target.value })}
                  style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, resize: 'vertical' }}
                />
              </div>

              {/* 5. Manufacturing Address (Optional) */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                  Manufacturing Address <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>(Optional / Not compulsory)</span>
                </label>
                <textarea
                  rows={2}
                  className="form-control"
                  placeholder="Production facility or manufacturing site address (Leave blank if not applicable)"
                  value={form.manufacturing_address}
                  onChange={e => setForm({ ...form, manufacturing_address: e.target.value })}
                  style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, resize: 'vertical' }}
                />
              </div>

              {/* Products Section (Multiple products allowed, code is optional) */}
              <div style={{ gridColumn: '1 / -1', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Package size={17} style={{ color: '#dc2626' }} />
                      Products for Evaluation <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                      Add one or more KFC products covered by this logsheet. Product Code is optional.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="btn btn-outline btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#dc2626',
                      borderColor: '#fca5a5',
                      background: '#fff',
                      fontWeight: 700,
                      fontSize: 12.5,
                      padding: '6px 14px',
                      borderRadius: 8
                    }}
                  >
                    <Plus size={15} /> Add Another Product
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(form.products || []).map((prod, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '14px 16px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Product #{idx + 1}
                        </span>
                        {(form.products || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 4
                            }}
                            title="Remove this product"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) minmax(180px, 1fr)', gap: 14 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                            Product Name <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <Package size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                              required
                              type="text"
                              className="form-control"
                              placeholder="e.g. KFC Seasoned Halal Chicken Fillets"
                              value={prod.name}
                              onChange={e => handleProductChange(idx, 'name', e.target.value)}
                              style={{ paddingLeft: 36, height: 42, fontSize: 13.5, fontWeight: 600 }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                            Product Code <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>(Optional)</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. KFC-PRD-01 (optional)"
                            value={prod.code}
                            onChange={e => handleProductChange(idx, 'code', e.target.value)}
                            style={{ height: 42, fontSize: 13.5, fontWeight: 500 }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="btn btn-ghost btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#b91c1c',
                      fontWeight: 700,
                      fontSize: 12.5,
                      padding: '6px 12px'
                    }}
                  >
                    <Plus size={14} /> + Add Another Product
                  </button>
                </div>
              </div>

              {/* 8. Remark */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                  Remark / Reason for Decision
                </label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder="Enter remarks, audit evaluation notes, or Shariah observations for the committee..."
                  value={form.remark}
                  onChange={e => setForm({ ...form, remark: e.target.value })}
                  style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, resize: 'vertical' }}
                />
              </div>

              {/* File Attachment Upload */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }}>
                  Upload Supporting Documents / Audit Reports <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>(Optional)</span>
                </label>
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 10,
                  padding: 20,
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="kfc-file-upload"
                  />
                  <label htmlFor="kfc-file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, margin: 0 }}>
                    <UploadCloud size={24} style={{ color: '#dc2626' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                      {uploadingReport ? 'Uploading...' : 'Click to upload audit report or certificate attachment'}
                    </span>
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>PDF, DOC, Images up to 15MB</span>
                  </label>
                </div>

                {form.document_urls && form.document_urls.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {form.document_urls.map((doc, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 12
                        }}
                      >
                        <FileText size={14} style={{ color: '#dc2626' }} />
                        <span style={{ fontWeight: 600 }}>{doc.name || `Document ${idx + 1}`}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Confirmation Checkbox */}
            <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '16px 20px', marginTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={form.confirmed}
                  onChange={e => setForm({ ...form, confirmed: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#dc2626', marginTop: 2 }}
                />
                <span style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.5, fontWeight: 600 }}>
                  I confirm that all product specifications, manufacturing parameters, and company details provided for this KFC Logsheet have been verified and are ready for Shariah and Technical Committee review.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-ghost"
                style={{ border: '1px solid #cbd5e1' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
                  borderColor: '#b91c1c',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                  padding: '12px 30px',
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                }}
              >
                {submitting ? (
                  <>
                    <span className="spinner-white" /> Creating KFC Logsheet...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Create KFC Logsheet
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>

      {/* Digital Signing Modal */}
      {showSignModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            maxWidth: 500,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              background: '#b91c1c',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <PenTool size={16} /> Apply Committee Signature
              </h3>
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Select Signatory Role <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={sigRole}
                  onChange={e => setSigRole(e.target.value)}
                  className="form-control"
                  style={{ fontWeight: 600, height: 42 }}
                >
                  <option value="">-- Choose Role --</option>
                  <option value="Mufti">Mufti / Shariah Signatory</option>
                  <option value="Ceo">CEO / Executive Signatory</option>
                  <option value="Manager">Manager / Technical Signatory</option>
                  <option value="Mufti2">Mufti 2 / Secondary Shariah</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Authenticated Digital Signature
                </label>
                {userSignature ? (
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 100, height: 46, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={getPdfUrl(userSignature.signature_url)} alt="Signature" style={{ maxHeight: 38, maxWidth: '90%', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{userSignature.name || currentUser?.full_name}</div>
                      <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Signature Verified</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
                    No signature registered on this account. Please upload in Signatures tab.
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Signatory Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  className="form-control"
                  placeholder="Optional endorsement note..."
                  value={sigComment}
                  onChange={e => setSigComment(e.target.value)}
                  style={{ fontSize: 12.5 }}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={modalConfirmed}
                    onChange={e => setModalConfirmed(e.target.checked)}
                    style={{ marginTop: 2, accentColor: '#b91c1c' }}
                  />
                  <span style={{ fontSize: 12, color: '#334155', lineHeight: 1.4 }}>
                    I confirm my digital signature is legally binding and certifies compliance with HFA KFC Halal standards.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="btn btn-ghost btn-sm"
                  style={{ border: '1px solid #cbd5e1' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplySignature}
                  disabled={isSigning || !modalConfirmed || !sigRole || !userSignature}
                  className="btn btn-primary btn-sm"
                  style={{
                    background: '#b91c1c',
                    borderColor: '#b91c1c',
                    fontWeight: 700,
                    padding: '8px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {isSigning ? <span className="spinner-white" /> : <Check size={14} />} Apply Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
