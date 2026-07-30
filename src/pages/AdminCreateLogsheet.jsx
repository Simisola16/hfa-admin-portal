import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  UploadCloud, ChevronLeft, Building, FileText, Award, MessageSquare, 
  Clock, CheckCircle2, CheckSquare, PenTool, Check, ShieldCheck, 
  X, AlertTriangle, ArrowRight, Calendar, User, MapPin, Tag, Download
} from 'lucide-react';
import { getPdfUrl } from '../lib/pdfUtils';
import { useAuth } from '../context/AuthContext';

export default function AdminCreateLogsheet() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [application, setApplication] = useState(null);
  
  const [signatures, setSignatures] = useState([]);
  const [currentLogsheet, setCurrentLogsheet] = useState(null);
  const [sigRoles, setSigRoles] = useState([]);
  const [sigComment, setSigComment] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [isSendingWithoutSig, setIsSendingWithoutSig] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Signing Modal State
  const [showSignModal, setShowSignModal] = useState(false);
  const [modalConfirmed, setModalConfirmed] = useState(false);

  const userSignature = signatures.find(s => 
    (s.user_id && (s.user_id === user?.id || s.user_id === user?._id)) ||
    (s.username && user?.email && s.username.toLowerCase() === user.email.split('@')[0].toLowerCase()) ||
    (s.name && user?.full_name && s.name.toLowerCase() === user.full_name.toLowerCase())
  );

  const [form, setForm] = useState({
    company_name: '', company_address: '', manufacturing_address: '',
    contact_person: '', contact_email: '', issue_date: '', expiry_date: '',
    nature_of_business: '', product_category: '', current_cycle_start: '',
    original_cycle_start: '', document_url: '',
    
    audit_type: 'Initial', audit_date: '', auditors: '', ncs_close: '',
    docs_satisfactory: '', pork_free_statement: '', reviewed_by: '',
    reviewer_name: '', review_date: '',
    
    annual_certificate: 'No', batch_certificate: 'No', new_products_only: 'No',
    new_site_line: 'No', new_client: 'No', agreement_signed: 'No', status_date: '',
    
    comment: '', confirmed: false
  });

  useEffect(() => {
    fetchData();
  }, [appId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch application details
      const appRes = await api.get(`/api/applications/${appId}`);
      const appData = appRes.data;
      setApplication(appData);

      // 2. Fetch audit details (if any)
      let auditData = null;
      try {
        const auditRes = await api.get(`/api/audits/application/${appId}`);
        auditData = auditRes.data?.data || auditRes.data;
      } catch (e) {
        console.log('No audit found for this application yet');
      }

      // 3. See if logsheet exists
      let logsheetObj = null;
      let logsheetData = {};
      try {
        const logRes = await api.get(`/api/application-logsheets/application/${appId}`);
        logsheetObj = logRes.data?.data || logRes.data;
        logsheetData = logsheetObj || {};
      } catch (e) {
        // Not found, use defaults from app & audit
        if (appData) {
          logsheetData = {
            company_name: appData.profiles?.company_name || '',
            company_address: appData.profiles?.address || '',
            manufacturing_address: appData.sites?.[0]?.address || '',
            contact_person: appData.profiles?.full_name || '',
            contact_email: appData.profiles?.email || '',
            nature_of_business: appData.business_type || '',
            product_category: appData.product_category || ''
          };

          if (appData.application_type) {
            const lowerType = appData.application_type.toLowerCase();
            if (lowerType.includes('initial')) {
              logsheetData.audit_type = 'Initial';
            } else if (lowerType.includes('surveillance')) {
              logsheetData.audit_type = 'Surveillance';
            } else if (lowerType.includes('renewal')) {
              logsheetData.audit_type = 'Re-audit';
            }
          }
        }

        if (auditData) {
          if (auditData.finalized_date) {
            logsheetData.audit_date = auditData.finalized_date;
          } else if (auditData.selected_dates && auditData.selected_dates.length > 0) {
            logsheetData.audit_date = auditData.selected_dates[0];
          }

          if (auditData.auditors && auditData.auditors.length > 0) {
            logsheetData.auditors = auditData.auditors.map(a => a.name).join(', ');
          }

          if (auditData.nc_reports) {
            const outstanding = auditData.nc_reports.filter(nc => nc.status !== 'corrected');
            if (auditData.nc_reports.length === 0) {
              logsheetData.ncs_close = 'No NCs flagged';
            } else if (outstanding.length === 0) {
              const lastCorrected = auditData.nc_reports.reduce((latest, nc) => {
                if (!nc.corrected_at) return latest;
                const d = new Date(nc.corrected_at);
                return !latest || d > latest ? d : latest;
              }, null);
              logsheetData.ncs_close = lastCorrected 
                ? `All NCs corrected by ${new Date(lastCorrected).toLocaleDateString('en-GB')}`
                : 'All NCs corrected';
            } else {
              logsheetData.ncs_close = `${outstanding.length} NC(s) outstanding`;
            }
          }
        }
      }

      setCurrentLogsheet(logsheetObj);
      setForm(f => ({ ...f, ...logsheetData, confirmed: false }));

      // 4. Fetch signatures for signing panel
      try {
        const sigsRes = await api.get('/api/signatures');
        setSignatures(Array.isArray(sigsRes) ? sigsRes : []);
      } catch (e) {
        console.log('Failed to fetch signatures', e);
      }
    } catch (err) {
      toast.error('Failed to load application data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      toast.loading('Uploading document...', { id: 'upload' });
      const url = await api.uploadPdf(file, 'logsheets');
      setForm({ ...form, document_url: url });
      toast.success('Document uploaded!', { id: 'upload' });
    } catch (err) {
      toast.error('Upload failed', { id: 'upload' });
    }
  };

  const handleNcReportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      toast.loading('Uploading NC report document...', { id: 'nc-upload' });
      const url = await api.uploadPdf(file, 'logsheets');
      setForm(prev => ({ ...prev, nc_report_url: url }));
      toast.success('NC report document uploaded!', { id: 'nc-upload' });
    } catch (err) {
      toast.error('Upload failed', { id: 'nc-upload' });
    }
  };

  const openSigningModal = (roleToPreselect = null) => {
    if (!userSignature) {
      toast.error('Your authenticated user account does not have an uploaded digital signature. Please upload one under Signatures first.');
      return;
    }
    if (roleToPreselect) {
      setSigRoles([roleToPreselect]);
    } else if (sigRoles.length === 0) {
      setSigRoles(['Mufti']);
    }
    setModalConfirmed(false);
    setShowSignModal(true);
  };

  const handleConfirmApplySignature = async () => {
    if (sigRoles.length === 0) {
      toast.error('Please select at least one role to sign');
      return;
    }
    if (!modalConfirmed) {
      toast.error('Please check the confirmation box before applying signature');
      return;
    }
    
    if (!userSignature) {
      toast.error('No authenticated digital signature available.');
      return;
    }

    setIsSigning(true);
    try {
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        role: sigRoles,
        signature_url: userSignature.signature_url,
        signature_name: userSignature.name,
        comment: sigComment
      });
      toast.success(`Logsheet signed successfully as ${sigRoles.join(', ')}!`);
      setShowSignModal(false);
      setModalConfirmed(false);
      fetchData();
      setSigRoles([]);
      setSigComment('');
    } catch (err) {
      toast.error(err.message || 'Failed to apply signature');
    } finally {
      setIsSigning(false);
    }
  };

  const handleSendToReview = async (e) => {
    e.preventDefault();
    setIsSendingWithoutSig(true);
    try {
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        sendWithoutSignature: true,
        comment: sigComment
      });
      toast.success('Logsheet sent to review without signature');
      navigate('/logsheet/waiting-signature');
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setIsSendingWithoutSig(false);
    }
  };

  const handleFinalizeSignOff = async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to finalize the sign-off? This will lock the logsheet and advance its status to Signed.")) {
      return;
    }
    setIsFinalizing(true);
    try {
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        finalizeSignOff: true
      });
      toast.success("Logsheet sign-off finalized successfully!");
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to finalize sign-off');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.confirmed) {
      toast.error('Please confirm the checkbox at the bottom');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/application-logsheets', {
        ...form,
        application_id: application.id || application._id,
        client_id: application.client_id,
        site_id: application.site_id
      });
      toast.success('Logsheet saved and status updated successfully');
      navigate('/applications');
    } catch (err) {
      toast.error(err.message || 'Failed to save logsheet');
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = !!currentLogsheet;

  // Signatory calculations
  const signatories = [
    { roleKey: 'Mufti', label: 'Mufti / Shariah Signatory', signature: currentLogsheet?.mufti_signature, name: currentLogsheet?.mufti_sign_name, date: currentLogsheet?.mufti_sign_date },
    { roleKey: 'Ceo', label: 'CEO / Executive Signatory', signature: currentLogsheet?.ceo_signature, name: currentLogsheet?.ceo_sign_name, date: currentLogsheet?.ceo_sign_date },
    { roleKey: 'Manager', label: 'Manager / Technical Signatory', signature: currentLogsheet?.manager_signature, name: currentLogsheet?.manager_sign_name, date: currentLogsheet?.manager_sign_date },
    { roleKey: 'Mufti2', label: 'Mufti 2 / Secondary Shariah', signature: currentLogsheet?.mufti2_signature, name: currentLogsheet?.mufti2_sign_name, date: currentLogsheet?.mufti2_sign_date },
  ];

  const totalSignedCount = signatories.filter(s => !!s.signature).length;
  const isFullySigned = totalSignedCount === 4 || currentLogsheet?.status === 'Signed' || currentLogsheet?.status === 'Completed';

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <ChevronLeft size={16} /> Back
        </button>

        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Application Ref: <strong style={{ color: '#0f172a' }}>#{application?.application_number || 'N/A'}</strong>
        </div>
      </div>

      {/* OVERALL SIGNING PROGRESS HEADER BANNER */}
      {isReadOnly && (
        <div style={{
          background: isFullySigned ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)',
          border: `1px solid ${isFullySigned ? '#bbf7d0' : '#fed7aa'}`,
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: isFullySigned ? '#dcfce7' : '#ffedd5',
                color: isFullySigned ? '#16a34a' : '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isFullySigned ? <ShieldCheck size={24} /> : <Clock size={24} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isFullySigned ? '#14532d' : '#9a3412' }}>
                  {isFullySigned ? 'Fully Executed Halal Certification Logsheet' : 'Logsheet Sign-Off Review in Progress'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: isFullySigned ? '#166534' : '#c2410c' }}>
                  {isFullySigned 
                    ? 'All committee signatures have been verified and sealed on this decision record.' 
                    : `${totalSignedCount} of 4 committee signatories have signed this document.`}
                </p>
              </div>
            </div>

            {/* Header Signing Action if pending */}
            {!isFullySigned && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => openSigningModal()}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '8px 16px', boxShadow: '0 2px 4px rgba(21,128,61,0.2)' }}
                >
                  <PenTool size={14} />
                  Apply Signature
                </button>
              </div>
            )}
          </div>

          {/* Progress Bar & Role Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ height: 8, background: isFullySigned ? '#dcfce7' : '#fed7aa', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                width: `${(totalSignedCount / 4) * 100}%`,
                height: '100%',
                background: isFullySigned ? '#16a34a' : 'linear-gradient(90deg, #f59e0b, #d97706)',
                borderRadius: 10,
                transition: 'width 0.4s ease'
              }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 4 }}>
              {signatories.map((s, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: s.signature ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  borderRadius: 8,
                  border: `1px solid ${s.signature ? (isFullySigned ? '#86efac' : '#fed7aa') : '#e2e8f0'}`,
                  fontSize: 12
                }}>
                  {s.signature ? (
                    <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                  ) : (
                    <Clock size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, color: s.signature ? '#0f172a' : '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {s.label.split('/')[0].trim()}
                    </div>
                    <div style={{ fontSize: 11, color: s.signature ? '#15803d' : '#94a3b8' }}>
                      {s.signature ? (s.name || 'Signed') : 'Awaiting'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT-STYLE PRESENTATION CARD */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', background: '#fff' }}>
        
        {/* Official Document Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '28px 32px', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', color: '#38bdf8', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <CheckSquare size={12} /> OFFICIAL CERTIFICATION DECISION RECORD
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Halal Certification Audit Logsheet
              </h2>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
                Halal Food Authority — Technical & Shariah Committee Decision File
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Application Reference</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                #{application?.application_number || 'N/A'}
              </div>
              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
                Audit Type: <strong>{form.audit_type || 'Initial'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation if creating or editing */}
        {!isReadOnly && (
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            {[
              { id: 1, label: 'Company Details', icon: Building },
              { id: 2, label: 'Review of Application', icon: FileText },
              { id: 3, label: 'Certificate Status', icon: Award },
              { id: 4, label: 'Comment / Reason', icon: MessageSquare }
            ].map((tab, idx) => {
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
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--primary)' : '#64748b',
                    background: isActive ? '#fff' : 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
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

        {/* UNIFIED READ-ONLY DOCUMENT VIEW */}
        {isReadOnly ? (
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* Section A: Applicant Profile */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building size={16} style={{ color: 'var(--primary)' }} />
                1. Company & Site Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>COMPANY NAME</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{form.company_name || '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CONTACT PERSON</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{form.contact_person || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{form.contact_email}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>COMPANY ADDRESS</div>
                  <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{form.company_address || '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>MANUFACTURING SITE ADDRESS</div>
                  <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{form.manufacturing_address || '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>NATURE OF BUSINESS</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 2 }}>{form.nature_of_business || '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PRODUCT CATEGORY</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 2 }}>{form.product_category || '—'}</div>
                </div>
              </div>
            </div>

            {/* Section B: Certification Dates */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} style={{ color: 'var(--primary)' }} />
                2. Certification Validity & Cycle Dates
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>ISSUE DATE</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{form.issue_date ? new Date(form.issue_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>EXPIRY DATE</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{form.expiry_date ? new Date(form.expiry_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CURRENT CYCLE START</div>
                  <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{form.current_cycle_start ? new Date(form.current_cycle_start).toLocaleDateString('en-GB') : '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>ORIGINAL CYCLE START</div>
                  <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{form.original_cycle_start ? new Date(form.original_cycle_start).toLocaleDateString('en-GB') : '—'}</div>
                </div>
              </div>
            </div>

            {/* Section C: Audit & Technical Review */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} style={{ color: 'var(--primary)' }} />
                3. Audit & Technical Compliance Review
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>AUDIT TYPE</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5', marginTop: 2 }}>{form.audit_type || 'Initial'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>AUDIT DATE</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 2 }}>{form.audit_date ? new Date(form.audit_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>AUDITORS</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 2 }}>{form.auditors || '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>NON-CONFORMANCES (NCS CLOSE)</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 2 }}>{form.ncs_close || 'No NCs flagged'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>DOCUMENTATION REVIEW STATUS</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 2 }}>{form.docs_satisfactory || '—'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PORK FREE POLICY STATEMENT</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 2 }}>{form.pork_free_statement || '—'}</div>
                </div>
              </div>
            </div>

            {/* Section D: Scope & Committee Decisions */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={16} style={{ color: 'var(--primary)' }} />
                4. Scope & Certificate Scope Checks
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Annual Certificate', val: form.annual_certificate },
                  { label: 'Batch Certificate', val: form.batch_certificate },
                  { label: 'Addition of New Products', val: form.new_products_only },
                  { label: 'Addition of New Site/Line', val: form.new_site_line },
                  { label: 'New Client', val: form.new_client },
                  { label: 'Agreement Signed', val: form.agreement_signed },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: item.val === 'Yes' ? '#dcfce7' : '#f1f5f9', color: item.val === 'Yes' ? '#15803d' : '#64748b' }}>
                      {item.val || 'No'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section E: Committee Comments */}
            {form.comment && (
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
                  5. Committee Comments & Recommendation Notes
                </h4>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {form.comment}
                </div>
              </div>
            )}

            {/* Supporting Attachments */}
            {(form.document_url || form.nc_report_url) && (
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} style={{ color: 'var(--primary)' }} />
                  Attached Supporting Documents
                </h4>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {form.document_url && (
                    <a href={getPdfUrl(form.document_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Download size={14} /> Logsheet Attachment PDF
                    </a>
                  )}
                  {form.nc_report_url && (
                    <a href={getPdfUrl(form.nc_report_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Download size={14} /> NC Report Attachment PDF
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* SECTION F: FORMAL SIGNATURE MATRIX BLOCK */}
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 24, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PenTool size={18} style={{ color: 'var(--primary)' }} />
                    Committee Executed Signatures Matrix
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Official digital signatures applied by authorized Shariah & Management signatories.
                  </p>
                </div>

                {!isFullySigned && (
                  <button 
                    type="button"
                    onClick={() => openSigningModal()}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                  >
                    <PenTool size={14} /> Apply Signature
                  </button>
                )}
              </div>

              {/* 4 Signatory Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {signatories.map((s, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      border: `1.5px solid ${s.signature ? '#bbf7d0' : '#e2e8f0'}`, 
                      borderRadius: 10, 
                      padding: 16, 
                      background: s.signature ? '#f0fdf4' : '#fafafa', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      minHeight: 140, 
                      textAlign: 'center',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.signature ? '#15803d' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {s.label}
                    </div>

                    {s.signature ? (
                      <div style={{ margin: '8px 0', width: '100%' }}>
                        <img 
                          src={getPdfUrl(s.signature)} 
                          alt={`${s.label} Signature`} 
                          style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain', margin: '0 auto', display: 'block' }} 
                        />
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#14532d', marginTop: 4 }}>
                          {s.name || 'Signatory'}
                        </div>
                        <div style={{ fontSize: 11, color: '#166534', opacity: 0.8 }}>
                          {s.date ? new Date(s.date).toLocaleDateString('en-GB') : 'Signed'}
                        </div>
                      </div>
                    ) : (
                      <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontStyle: 'italic', color: '#94a3b8' }}>Awaiting Signature</span>
                        {!isFullySigned && (
                          <button 
                            type="button" 
                            className="btn btn-ghost btn-sm" 
                            style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', border: '1px solid #cbd5e1', padding: '3px 10px', background: '#fff' }}
                            onClick={() => openSigningModal(s.roleKey)}
                          >
                            Sign as {s.roleKey}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Finalize Button Action if signatures present and pending */}
              {!isFullySigned && totalSignedCount > 0 && (
                <div style={{ marginTop: 24, padding: 16, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#14532d' }}>Ready to finalize sign-off?</div>
                    <div style={{ fontSize: 12, color: '#166534' }}>Finalizing will lock the logsheet and advance application status to successful.</div>
                  </div>

                  <button 
                    onClick={handleFinalizeSignOff}
                    disabled={isFinalizing}
                    className="btn btn-primary"
                    style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600, padding: '9px 20px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Check size={16} /> Finalize Sign-Off & Lock Document
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* FORM VIEW FOR CREATING NEW LOGSHEET */
          <form onSubmit={handleSubmit} style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {activeTab === 1 && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input type="text" className="form-control" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input type="text" className="form-control" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Company Address</label>
                  <input type="text" className="form-control" value={form.company_address} onChange={e => setForm({ ...form, company_address: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Manufacturing Address</label>
                  <input type="text" className="form-control" value={form.manufacturing_address} onChange={e => setForm({ ...form, manufacturing_address: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact E-mail</label>
                  <input type="email" className="form-control" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nature of the business</label>
                  <input type="text" className="form-control" value={form.nature_of_business} onChange={e => setForm({ ...form, nature_of_business: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Product Category</label>
                  <input type="text" className="form-control" value={form.product_category} onChange={e => setForm({ ...form, product_category: e.target.value })} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Issue date of certificate</label>
                  <input type="date" className="form-control" value={form.issue_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, issue_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry date of certificate</label>
                  <input type="date" className="form-control" value={form.expiry_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Cycle Start Date</label>
                  <input type="date" className="form-control" value={form.current_cycle_start?.split('T')[0] || ''} onChange={e => setForm({ ...form, current_cycle_start: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Original Cycle Start Date</label>
                  <input type="date" className="form-control" value={form.original_cycle_start?.split('T')[0] || ''} onChange={e => setForm({ ...form, original_cycle_start: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Supporting Document (Optional)</label>
                  {form.document_url ? (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f0fdf4', padding: '12px 16px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      <CheckCircle2 size={18} color="#16a34a" />
                      <a href={getPdfUrl(form.document_url)} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 600, flex: 1, textDecoration: 'none' }}>Document Uploaded Successfully</a>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => setForm({ ...form, document_url: '' })}>Remove</button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', padding: 24, alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', borderRadius: 10, cursor: 'pointer', background: '#f8fafc' }}>
                      <UploadCloud size={24} color="#475569" style={{ marginBottom: 8 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Click to Upload File</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>PDF, PNG, or JPG (Max 5MB)</div>
                      <input type="file" style={{ display: 'none' }} onChange={handleFileChange} />
                    </label>
                  )}
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Audit Type</label>
                  <select className="form-control" value={form.audit_type} onChange={e => setForm({ ...form, audit_type: e.target.value })}>
                    <option value="Initial">Initial</option>
                    <option value="Surveillance">Surveillance</option>
                    <option value="Re-audit">Re-audit</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Audit Date</label>
                  <input type="date" className="form-control" value={form.audit_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, audit_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Auditors</label>
                  <input type="text" className="form-control" placeholder="e.g. John Doe, Jane Smith" value={form.auditors} onChange={e => setForm({ ...form, auditors: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">NCS Close (if any)</label>
                  <input type="text" className="form-control" value={form.ncs_close} onChange={e => setForm({ ...form, ncs_close: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Audit Documentation reviewed and found satisfactory</label>
                  <input type="text" className="form-control" value={form.docs_satisfactory} onChange={e => setForm({ ...form, docs_satisfactory: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Pork free statement / signed pork policy submitted</label>
                  <input type="text" className="form-control" value={form.pork_free_statement} onChange={e => setForm({ ...form, pork_free_statement: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reviewed By</label>
                  <input type="text" className="form-control" value={form.reviewed_by} onChange={e => setForm({ ...form, reviewed_by: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reviewer Name</label>
                  <input type="text" className="form-control" value={form.reviewer_name} onChange={e => setForm({ ...form, reviewer_name: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Date of Review</label>
                  <input type="date" className="form-control" style={{ maxWidth: 300 }} value={form.review_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, review_date: e.target.value })} />
                </div>
              </div>
            )}

            {activeTab === 3 && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Annual certificate</label>
                  <select className="form-control" value={form.annual_certificate} onChange={e => setForm({ ...form, annual_certificate: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Batch certificate</label>
                  <select className="form-control" value={form.batch_certificate} onChange={e => setForm({ ...form, batch_certificate: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Only addition of new products</label>
                  <select className="form-control" value={form.new_products_only} onChange={e => setForm({ ...form, new_products_only: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Addition of new site (or line)</label>
                  <select className="form-control" value={form.new_site_line} onChange={e => setForm({ ...form, new_site_line: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">New Client</label>
                  <select className="form-control" value={form.new_client} onChange={e => setForm({ ...form, new_client: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Agreement Signed</label>
                  <select className="form-control" value={form.agreement_signed} onChange={e => setForm({ ...form, agreement_signed: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Status Date</label>
                  <input type="date" className="form-control" style={{ maxWidth: 300 }} value={form.status_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, status_date: e.target.value })} />
                </div>
              </div>
            )}

            {activeTab === 4 && (
              <div className="form-group">
                <label className="form-label">Comment / Reason for Decision</label>
                <textarea 
                  className="form-control" 
                  rows={8}
                  style={{ fontSize: 14, padding: 14 }}
                  placeholder="Enter final review comments, conditions, or recommendations..."
                  value={form.comment} 
                  onChange={e => setForm({ ...form, comment: e.target.value })} 
                />
              </div>
            )}

            {/* Bottom Footer Submit */}
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.confirmed}
                  onChange={e => setForm({ ...form, confirmed: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>
                  I confirm that all product matrix and audit compliance details above have been verified.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting || !form.confirmed} 
                  style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600 }}
                >
                  {submitting ? 'Saving Logsheet...' : 'Create & Save Logsheet'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* INTERACTIVE SIGNATURE MODAL WITH DOUBLE-CONFIRMATION STEP */}
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'slideDown 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PenTool size={20} style={{ color: '#38bdf8' }} />
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
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Step 1: Select Role */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                  1. Select Signatory Role(s) to Execute
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'Mufti', label: 'Mufti' },
                    { key: 'Ceo', label: 'CEO' },
                    { key: 'Manager', label: 'Manager' },
                    { key: 'Mufti2', label: 'Mufti 2' },
                  ].map(r => {
                    const isSelected = sigRoles.includes(r.key);
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSigRoles(sigRoles.filter(role => role !== r.key));
                          } else {
                            setSigRoles([...sigRoles, r.key]);
                          }
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : '#e2e8f0'}`,
                          background: isSelected ? '#f0fdf4' : '#f8fafc',
                          color: isSelected ? 'var(--primary-dark)' : '#334155',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>{r.label}</span>
                        {isSelected && <Check size={14} style={{ color: 'var(--primary)' }} />}
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
                      <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>AUTHENTICATED USER</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{userSignature.name}</div>
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
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                  3. Signature Comment / Note (Optional)
                </label>
                <textarea 
                  className="form-control"
                  rows={2}
                  placeholder="Enter comments or conditions regarding this signature..."
                  value={sigComment}
                  onChange={e => setSigComment(e.target.value)}
                  style={{ fontSize: 13, padding: 10 }}
                />
              </div>

              {/* Step 4: EXPLICIT DOUBLE CONFIRMATION CHECKBOX */}
              <div style={{ padding: '12px 14px', background: modalConfirmed ? '#f0fdf4' : '#fffbeb', border: `1px solid ${modalConfirmed ? '#86efac' : '#fed7aa'}`, borderRadius: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                  <input 
                    type="checkbox"
                    checked={modalConfirmed}
                    onChange={e => setModalConfirmed(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
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
                onClick={handleConfirmApplySignature}
                disabled={isSigning || sigRoles.length === 0 || !modalConfirmed || !userSignature}
                className="btn btn-primary"
                style={{
                  padding: '9px 24px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: (!modalConfirmed || isSigning || sigRoles.length === 0 || !userSignature) ? 0.6 : 1
                }}
              >
                {isSigning ? 'Applying Signature...' : 'Confirm & Apply Signature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
