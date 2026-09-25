import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, CheckCircle, Clock, FileText, Building2,
  Calendar, ShieldCheck, MapPin, Phone, Mail, User,
  Award, Download, AlertCircle, RefreshCw, PenTool,
  ChevronRight, ExternalLink, Sparkles, CheckCheck, XCircle,
  Lock, Unlock, ArrowRight
} from 'lucide-react';

export default function AdminExtensionProcessing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [app, setApp] = useState(null);
  const [logsheet, setLogsheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Approve Request state (Stage 1)
  const [approvingRequest, setApprovingRequest] = useState(false);

  // Approve Certificate Modal state (Stage 4)
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [extendedUntil, setExtendedUntil] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [approving, setApproving] = useState(false);

  // Reject Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchDetails = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const [appRes, logRes] = await Promise.all([
        api.get(`/api/extension-applications/${id}`),
        api.get(`/api/extension-applications/${id}/logsheet`).catch(() => ({ data: { data: null } }))
      ]);

      const loadedApp = appRes.data?.data || appRes.data;
      const loadedLog = logRes.data?.data || logRes.data;

      setApp(loadedApp);
      setLogsheet(loadedLog);

      const days = loadedLog?.extension_days || 30;
      const defaultExtendedDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setExtendedUntil(defaultExtendedDate);
    } catch (err) {
      console.error('Error fetching processing details:', err);
      toast.error('Failed to load extension application.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const isApproved = app?.status === 'extension_approved';
  const isRejected = app?.status === 'rejected';

  // Signatures required count & completed count
  const is30Days = logsheet?.extension_duration_type === '30_days' || (logsheet?.extension_days && logsheet.extension_days <= 30);
  const sigCount = is30Days ? (logsheet?.single_signature ? 1 : 0) : [
    logsheet?.mufti_signature,
    logsheet?.ceo_signature,
    logsheet?.manager_signature,
    logsheet?.mufti2_signature
  ].filter(Boolean).length;
  const totalSigsRequired = is30Days ? 1 : 4;
  const isFullySigned = sigCount >= totalSigsRequired || logsheet?.status === 'Signed';

  // ─── Strict 4-Stage Locking & Progression Rules ───
  // Stage 1: Extension Form Received & Request Review
  const isStep1Submitted = app?.status === 'submitted';
  const isStep1Approved = app?.status !== 'submitted' && !isRejected;

  // Stage 2: Create & Manage Extension Logsheet (Unlocked only when Stage 1 is approved)
  const isStep2Unlocked = isStep1Approved;
  const isStep2Completed = logsheet && (
    logsheet.status === 'Waiting for Signature' ||
    logsheet.status === 'Signed' ||
    logsheet.status === 'Approved' ||
    app?.status === 'waiting_signature' ||
    isApproved
  );

  // Stage 3: Waiting for Signatures (Unlocked only when Stage 2 is submitted for signatures)
  const isStep3Unlocked = isStep2Completed;
  const isStep3Completed = isFullySigned || isApproved;

  // Stage 4: Certificate Approval & Issuance (Unlocked ONLY when Stage 3 is fully signed)
  const isStep4Unlocked = isStep3Completed;
  const isStep4Completed = isApproved;

  // Current active stage (1 to 4)
  const getStageIndex = () => {
    if (!app) return 1;
    if (isApproved) return 4;
    if (isStep3Unlocked) return 3;
    if (isStep2Unlocked) return 2;
    return 1;
  };

  const currentStage = getStageIndex();

  // ─── Stage 1 Action: Approve Extension Request ───
  const handleApproveRequest = async () => {
    setApprovingRequest(true);
    try {
      await api.post(`/api/extension-applications/${id}/approve-request`);
      toast.success('Extension Form request approved! Step 2 (Create Logsheet) is now unlocked.');
      fetchDetails(true);
    } catch (err) {
      console.error('Approve request error:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to approve extension request.');
    } finally {
      setApprovingRequest(false);
    }
  };

  // ─── Stage 4 Action: Issue Certificate ───
  const handleIssueCertificate = async () => {
    if (!isFullySigned) {
      return toast.error('Cannot issue certificate: All required committee signatures must be completed first.');
    }

    setApproving(true);
    try {
      await api.post(`/api/extension-applications/${id}/issue-certificate`, {
        extended_until: extendedUntil,
        certificate_number: certNumber,
        notes: adminNotes
      });
      toast.success('Extension Certificate approved and issued successfully!');
      setShowApproveModal(false);
      fetchDetails(true);
    } catch (err) {
      console.error('Approval error:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to approve extension certificate.');
    } finally {
      setApproving(false);
    }
  };

  // ─── Rejection Action ───
  const handleReject = async () => {
    if (!rejectionReason.trim()) return toast.error('Please provide a rejection reason.');
    setRejecting(true);
    try {
      await api.put(`/api/extension-applications/${id}/status`, {
        status: 'rejected',
        rejection_reason: rejectionReason
      });
      toast.success('Extension application rejected.');
      setShowRejectModal(false);
      fetchDetails(true);
    } catch (err) {
      console.error('Rejection error:', err);
      toast.error('Failed to reject extension application.');
    } finally {
      setRejecting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const getActorName = (entry, stepKey) => {
    if (entry?.changedBy) {
      if (typeof entry.changedBy === 'object') {
        const name = entry.changedBy.full_name || entry.changedBy.name || entry.changedBy.username || entry.changedBy.email;
        const roleStr = entry.changedBy.role
          ? ` (${entry.changedBy.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())})`
          : '';
        if (name) return `${name}${roleStr}`;
      } else if (typeof entry.changedBy === 'string' && entry.changedBy.trim()) {
        const isHexId = /^[0-9a-fA-F]{24}$/.test(entry.changedBy.trim());
        if (!isHexId) {
          return entry.changedBy;
        }
      }
    }

    if (stepKey === 'submitted') {
      const cName = app?.company_name || app?.client_id?.company_name || app?.client_id?.full_name;
      return cName ? `${cName} (Client)` : 'Client / Applicant';
    }
    if (stepKey === 'logsheet_created') {
      return 'HFA Technical Officer';
    }
    if (stepKey === 'waiting_signature') {
      return 'Shariah & Technical Committee';
    }
    if (stepKey === 'extension_approved') {
      return 'HFA Certification Committee';
    }
    return 'HFA Administrator';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #dcfce7', borderTop: '3px solid #008744', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Loading extension processing flow...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: 'Inter, sans-serif' }}>
        <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Extension Application Not Found</h2>
        <p style={{ color: '#64748b', fontSize: 13.5, margin: '8px 0 20px' }}>The requested extension application does not exist or has been removed.</p>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/extension-applications')}
        >
          Back to Extension Applications
        </button>
      </div>
    );
  }

  const companyName = app?.company_name || app?.client_id?.company_name || app?.client_id?.business_name || 'Client Company';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60, fontFamily: 'Inter, "Segoe UI", sans-serif' }}>
      
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={() => navigate('/extension-applications')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: '#475569',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: 0
          }}
        >
          <ArrowLeft size={16} /> Back to Extension Applications
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => fetchDetails(true)}
            disabled={refreshing}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'white', border: '1px solid #e2e8f0', color: '#475569',
              padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Overview Header Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 20, padding: '28px 32px', color: 'white', marginBottom: 28,
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                background: 'rgba(0, 200, 83, 0.2)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)',
                padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700
              }}>
                EXTENSION APPLICATION PROCESSING
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                Ref: {app?.application_number}
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              {companyName}
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1' }}>
              Site: <strong style={{ color: 'white' }}>{app?.site_name}</strong> • Submitted: {new Date(app?.created_at).toLocaleDateString()}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Stage 1 Actions: Reject or Approve Request */}
            {isStep1Submitted && !isRejected && (
              <>
                <button
                  onClick={() => setShowRejectModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '9px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer'
                  }}
                >
                  <XCircle size={15} /> Reject Request
                </button>
                <button
                  onClick={handleApproveRequest}
                  disabled={approvingRequest}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#008744', color: 'white', border: 'none',
                    padding: '9px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: approvingRequest ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(0,135,68,0.3)'
                  }}
                >
                  <CheckCircle size={16} /> {approvingRequest ? 'Approving...' : 'Approve Extension Request'}
                </button>
              </>
            )}

            {/* Stage 2 Active Action */}
            {isStep2Unlocked && !isStep2Completed && !isRejected && (
              <button
                onClick={() => navigate(`/extension-applications/${id}/logsheet`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#0284c7', color: 'white', border: 'none',
                  padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(2,132,199,0.3)'
                }}
              >
                <FileText size={15} /> Configure Logsheet
              </button>
            )}

            {/* Stage 3 Active Action */}
            {isStep3Unlocked && !isStep3Completed && !isRejected && (
              <button
                onClick={() => navigate(`/extension-applications/${id}/logsheet`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#f59e0b', color: 'white', border: 'none',
                  padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(245,158,11,0.3)'
                }}
              >
                <PenTool size={15} /> Signatures Pending ({sigCount}/{totalSigsRequired})
              </button>
            )}

            {/* Stage 4 Action: Issue Certificate (Only when fully signed) */}
            {isStep4Unlocked && !isApproved && !isRejected && (
              <button
                onClick={() => setShowApproveModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#008744', color: 'white', border: 'none',
                  padding: '9px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,135,68,0.3)'
                }}
              >
                <Award size={16} /> Approve &amp; Issue Extension Certificate
              </button>
            )}

            {isApproved && (
              <div style={{
                background: '#059669', color: 'white', padding: '9px 18px', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5
              }}>
                <CheckCircle size={16} /> Extension Approved
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Grid (Left: Stack of Operation Cards, Right: Processing Stage Timeline & Info) ── */}
      <div className="processing-layout-grid" style={{ gap: 24, alignItems: 'start' }}>
        
        {/* ── Left Column: Operations & Details ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Approved Certificate Banner (If Approved) */}
          {isApproved && (
            <div style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              borderRadius: 16, padding: '24px 28px', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Award size={26} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Extension Certificate Issued</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.95 }}>
                    Certificate: <strong>{app?.certificate_number || 'EXT-CERT'}</strong> • Extended Valid Until: <strong>{app?.extended_until ? new Date(app?.extended_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Active'}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/certificates')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'white', color: '#047857', border: 'none',
                  padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                <Award size={16} /> View Certificates Page
              </button>
            </div>
          )}

          {/* Rejection Notice (If Rejected) */}
          {isRejected && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 16, padding: 24,
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlertCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#991b1b' }}>
                    Extension Request Rejected
                  </h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>
                    {app?.rejection_reason || 'This extension request was rejected.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Card 1: Extension Form Received Details */}
          <div style={{
            background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
            padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>1. Extension Form Received Details</span>
              </h3>
              <span style={{
                fontSize: 11.5, padding: '3px 10px', borderRadius: 10, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: isStep1Submitted ? '#fef3c7' : (isRejected ? '#fee2e2' : '#ecfdf5'),
                color: isStep1Submitted ? '#92400e' : (isRejected ? '#991b1b' : '#065f46')
              }}>
                {isStep1Submitted ? (
                  <><Clock size={12} /> Pending Approval</>
                ) : isRejected ? (
                  <><XCircle size={12} /> Rejected</>
                ) : (
                  <><CheckCircle size={12} /> Request Approved</>
                )}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Company Name</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{companyName}</div>
              </div>

              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Site Name</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{app?.site_name}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contact Person</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{app?.contact_person}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contact Number</div>
                  <div style={{ fontSize: 13.5, color: '#0f172a', marginTop: 2 }}>{app?.contact_phone}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contact Email</div>
                <div style={{ fontSize: 13.5, color: '#0284c7', fontWeight: 500, marginTop: 2 }}>{app?.contact_email}</div>
              </div>

              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Client Description &amp; Justification</div>
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                  padding: '12px 14px', fontSize: 13, color: '#334155', lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-wrap'
                }}>
                  {app?.description}
                </div>
              </div>

              {/* Stage 1 Actions Strip */}
              {isStep1Submitted && !isRejected && (
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', marginTop: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                        Review Decision: Extension Form Request
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                        Approving the request will accept the justification and unlock Step 2 to configure the Extension Logsheet.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: 'white', color: '#dc2626', border: '1px solid #fca5a5',
                          padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: 'pointer'
                        }}
                      >
                        <XCircle size={14} /> Reject
                      </button>

                      <button
                        onClick={handleApproveRequest}
                        disabled={approvingRequest}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#008744', color: 'white', border: 'none',
                          padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: 12.5,
                          cursor: approvingRequest ? 'not-allowed' : 'pointer',
                          boxShadow: '0 2px 6px rgba(0,135,68,0.25)'
                        }}
                      >
                        <CheckCircle size={14} /> {approvingRequest ? 'Approving...' : 'Approve Request'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isStep1Approved && (
                <div style={{
                  background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginTop: 4
                }}>
                  <CheckCircle size={16} color="#059669" />
                  <span style={{ fontSize: 12.5, color: '#065f46', fontWeight: 600 }}>
                    Extension Request Approved by Admin • Stage 2 (Create Logsheet) is unlocked.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Create & Manage Extension Logsheet */}
          <div style={{
            background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
            padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            opacity: !isStep2Unlocked ? 0.75 : 1
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: !isStep2Unlocked ? '#64748b' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {!isStep2Unlocked && <Lock size={15} color="#94a3b8" />}
                <span>2. Create &amp; Manage Extension Logsheet</span>
              </h3>
              <span style={{
                fontSize: 11.5, padding: '3px 10px', borderRadius: 10, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: !isStep2Unlocked ? '#f1f5f9' : (isStep2Completed ? '#ecfdf5' : '#eff6ff'),
                color: !isStep2Unlocked ? '#64748b' : (isStep2Completed ? '#065f46' : '#1d4ed8')
              }}>
                {!isStep2Unlocked ? (
                  <><Lock size={12} /> Locked (Step 1 Required)</>
                ) : isStep2Completed ? (
                  <><CheckCircle size={12} /> {logsheet?.status || 'Configured'}</>
                ) : (
                  <><FileText size={12} /> Ready to Configure</>
                )}
              </span>
            </div>

            {!isStep2Unlocked ? (
              <div style={{
                background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: '24px 20px', textAlign: 'center'
              }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Lock size={20} color="#64748b" />
                </div>
                <div style={{ fontWeight: 700, color: '#334155', fontSize: 14 }}>Stage 2 Locked</div>
                <p style={{ color: '#64748b', fontSize: 12.5, margin: '4px 0 16px', maxWidth: 460, marginInline: 'auto' }}>
                  Please review and approve the client's Extension Form request in Step 1 above to unlock logsheet creation and committee configuration.
                </p>
                <button
                  disabled
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#e2e8f0', color: '#94a3b8', border: 'none',
                    padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'not-allowed'
                  }}
                >
                  <Lock size={14} /> Open &amp; Edit Extension Logsheet
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>
                  The Extension Logsheet captures facility address, product category, scheme (GSO/HFA), certificate expiry, and extension duration (30 days vs &gt;30 days).
                </p>

                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#64748b' }}>Extension Period:</span>
                    <strong style={{ color: '#0f172a' }}>{logsheet?.extension_days || 30} Days</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, marginTop: 6 }}>
                    <span style={{ color: '#64748b' }}>Signature Rule:</span>
                    <strong style={{ color: is30Days ? '#008744' : '#2563eb' }}>
                      {is30Days ? '1 Signature (30 Days)' : '4 Signatures (>30 Days)'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, marginTop: 6 }}>
                    <span style={{ color: '#64748b' }}>Logsheet Status:</span>
                    <strong style={{ color: logsheet?.status === 'Waiting for Signature' ? '#f59e0b' : '#0f172a' }}>
                      {logsheet?.status || 'Draft'}
                    </strong>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/extension-applications/${id}/logsheet`)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: '#0f172a', color: 'white', border: 'none',
                    padding: '10px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer'
                  }}
                >
                  <FileText size={15} />
                  {logsheet?.status && logsheet.status !== 'Draft' ? 'View & Edit Extension Logsheet' : 'Open & Configure Extension Logsheet'}
                  <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>

          {/* Card 3: Waiting for Signatures */}
          <div style={{
            background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
            padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            opacity: !isStep3Unlocked ? 0.75 : 1
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: !isStep3Unlocked ? '#64748b' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {!isStep3Unlocked && <Lock size={15} color="#94a3b8" />}
                <span>3. Waiting for Signatures</span>
              </h3>
              <span style={{
                fontSize: 11.5, padding: '3px 10px', borderRadius: 10, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: !isStep3Unlocked ? '#f1f5f9' : (isFullySigned ? '#ecfdf5' : '#ffedd5'),
                color: !isStep3Unlocked ? '#64748b' : (isFullySigned ? '#166534' : '#9a3412')
              }}>
                {!isStep3Unlocked ? (
                  <><Lock size={12} /> Locked (Step 2 Required)</>
                ) : isFullySigned ? (
                  <><CheckCircle size={12} /> Fully Signed ({sigCount}/{totalSigsRequired})</>
                ) : (
                  <><PenTool size={12} /> {sigCount} of {totalSigsRequired} Signed</>
                )}
              </span>
            </div>

            {!isStep3Unlocked ? (
              <div style={{
                background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: '24px 20px', textAlign: 'center'
              }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Lock size={20} color="#64748b" />
                </div>
                <div style={{ fontWeight: 700, color: '#334155', fontSize: 14 }}>Stage 3 Locked</div>
                <p style={{ color: '#64748b', fontSize: 12.5, margin: '4px 0 0', maxWidth: 460, marginInline: 'auto' }}>
                  The Extension Logsheet must be configured and submitted for signatures in Step 2 before committee signatures can be gathered.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {is30Days ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                      background: logsheet?.single_signature ? '#f0fdf4' : 'white'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PenTool size={14} color={logsheet?.single_signature ? '#008744' : '#64748b'} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Authorized Signatory / CEO</div>
                          {logsheet?.single_sign_name && (
                            <div style={{ fontSize: 11, color: '#008744' }}>Signed by {logsheet.single_sign_name}</div>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: logsheet?.single_signature ? '#008744' : '#94a3b8' }}>
                        {logsheet?.single_signature ? 'Signed' : 'Pending'}
                      </span>
                    </div>
                  ) : (
                    [
                      { role: '1. Mufti / Shariah', signed: !!logsheet?.mufti_signature, name: logsheet?.mufti_sign_name },
                      { role: '2. Chief Executive Officer', signed: !!logsheet?.ceo_signature, name: logsheet?.ceo_sign_name },
                      { role: '3. Certification Manager', signed: !!logsheet?.manager_signature, name: logsheet?.manager_sign_name },
                      { role: '4. Second Mufti / Expert', signed: !!logsheet?.mufti2_signature, name: logsheet?.mufti2_sign_name },
                    ].map((s) => (
                      <div
                        key={s.role}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                          background: s.signed ? '#f0fdf4' : 'white'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <PenTool size={14} color={s.signed ? '#008744' : '#64748b'} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{s.role}</div>
                            {s.name && <div style={{ fontSize: 11, color: '#008744' }}>Signed by {s.name}</div>}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: s.signed ? '#008744' : '#94a3b8' }}>
                          {s.signed ? 'Signed' : 'Pending'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <Link
                  to={`/extension-applications/${id}/logsheet`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    marginTop: 14, fontSize: 12.5, fontWeight: 700, color: '#008744', textDecoration: 'none'
                  }}
                >
                  Sign Logsheet in Logsheet View <ChevronRight size={13} />
                </Link>
              </>
            )}
          </div>

          {/* Card 4: Certificate Approval & Issuance */}
          <div style={{
            background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
            padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            opacity: !isStep4Unlocked && !isApproved ? 0.75 : 1
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: !isStep4Unlocked && !isApproved ? '#64748b' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {!isStep4Unlocked && !isApproved && <Lock size={15} color="#94a3b8" />}
                <span>4. Certificate Approval &amp; Issuance</span>
              </h3>
              <span style={{
                fontSize: 11.5, padding: '3px 10px', borderRadius: 10, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: isApproved ? '#ecfdf5' : (isStep4Unlocked ? '#ecfdf5' : '#f1f5f9'),
                color: isApproved ? '#059669' : (isStep4Unlocked ? '#065f46' : '#64748b')
              }}>
                {isApproved ? (
                  <><CheckCircle size={12} /> Approved &amp; Issued</>
                ) : isStep4Unlocked ? (
                  <><Sparkles size={12} /> Ready for Approval</>
                ) : (
                  <><Lock size={12} /> Locked (Signatures Required)</>
                )}
              </span>
            </div>

            {isApproved ? (
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Certificate Number:</span>
                  <strong style={{ color: '#0f172a' }}>{app?.certificate_number || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Extended Valid Until:</span>
                  <strong style={{ color: '#059669' }}>
                    {app?.extended_until ? new Date(app.extended_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </strong>
                </div>
                {app?.notes && (
                  <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid #e2e8f0', fontSize: 12.5, color: '#475569' }}>
                    <strong>Admin Notes:</strong> {app.notes}
                  </div>
                )}
              </div>
            ) : !isStep4Unlocked ? (
              <div style={{
                background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: '24px 20px', textAlign: 'center'
              }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Lock size={20} color="#64748b" />
                </div>
                <div style={{ fontWeight: 700, color: '#334155', fontSize: 14 }}>Certificate Approval Locked</div>
                <p style={{ color: '#64748b', fontSize: 12.5, margin: '4px 0 16px', maxWidth: 460, marginInline: 'auto' }}>
                  All required committee signatures ({totalSigsRequired} signature{totalSigsRequired > 1 ? 's' : ''}) must be collected on the Extension Logsheet in Step 3 before the certificate can be approved and issued.
                </p>
                <button
                  disabled
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#e2e8f0', color: '#94a3b8', border: 'none',
                    padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'not-allowed'
                  }}
                >
                  <Lock size={15} /> Locked (Awaiting Signatures)
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10,
                  padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <Sparkles size={18} color="#059669" />
                  <p style={{ margin: 0, fontSize: 13, color: '#065f46', lineHeight: 1.5 }}>
                    <strong>Signatures verified!</strong> The extension logsheet is fully signed. You may now approve and issue the official Extension Certificate.
                  </p>
                </div>

                <button
                  onClick={() => setShowApproveModal(true)}
                  disabled={isRejected}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: '#008744', color: 'white', border: 'none',
                    padding: '11px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13.5,
                    cursor: isRejected ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(0,135,68,0.3)'
                  }}
                >
                  <Award size={16} /> Approve &amp; Issue Extension Certificate
                </button>
              </div>
            )}
          </div>

        </div>

        {/* ── Right Column: Processing Stage Timeline & Company Info ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 24 }}>
          
          {/* Card 1: Processing Stage Timeline */}
          <div style={{
            background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
            padding: '24px 26px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Processing Stage
                </h2>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Live certification progress
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                color: isApproved ? '#059669' : (isRejected ? '#dc2626' : '#008744'),
                background: isApproved ? '#ecfdf5' : (isRejected ? '#fef2f2' : '#f0fdf4'),
                border: `1px solid ${isApproved ? '#a7f3d0' : (isRejected ? '#fca5a5' : '#bbf7d0')}`,
                padding: '3px 8px', borderRadius: 12
              }}>
                {isApproved ? 'Approved' : (isRejected ? 'Rejected' : 'In Progress')}
              </span>
            </div>

            <div style={{ padding: '6px 0 0' }}>
              {(() => {
                const historyMap = {};
                (app?.statusHistory || []).forEach(entry => {
                  if (entry.status && !historyMap[entry.status]) {
                    historyMap[entry.status] = entry;
                  }
                });

                const steps = [
                  {
                    key: 'submitted',
                    title: 'Extension Form Received',
                    defaultNote: isStep1Approved ? 'Extension form approved by admin.' : 'Extension application submitted by client.',
                    matchStatuses: ['submitted'],
                    order: 1
                  },
                  {
                    key: 'logsheet_created',
                    title: 'Create Logsheet',
                    defaultNote: isStep2Completed ? 'Extension logsheet prepared and configured.' : (isStep2Unlocked ? 'Ready to configure extension logsheet.' : 'Locked until Step 1 approval.'),
                    matchStatuses: ['under_review', 'logsheet_created'],
                    order: 2
                  },
                  {
                    key: 'waiting_signature',
                    title: 'Waiting for Signatures',
                    defaultNote: isStep3Completed ? 'All required executive committee signatures collected.' : (isStep3Unlocked ? `Collecting committee signatures (${sigCount}/${totalSigsRequired}).` : 'Locked until logsheet submission.'),
                    matchStatuses: ['waiting_signature', 'logsheet_signed'],
                    order: 3
                  },
                  {
                    key: 'extension_approved',
                    title: 'Extension Certificate Approved',
                    defaultNote: app?.certificate_number ? `Extension Certificate Approved & Issued: ${app.certificate_number}` : (isStep4Unlocked ? 'Ready for certificate approval and issuance.' : 'Locked until signatures are collected.'),
                    matchStatuses: ['extension_approved'],
                    order: 4
                  }
                ];

                if (isRejected) {
                  steps.push({
                    key: 'rejected',
                    title: 'Application Rejected',
                    defaultNote: app?.rejection_reason || 'Extension application rejected by committee.',
                    matchStatuses: ['rejected'],
                    order: 5
                  });
                }

                return steps.map((stg, idx) => {
                  const isLast = idx === steps.length - 1;
                  const isStepCompleted = isApproved
                    ? true
                    : (isRejected && stg.key === 'rejected')
                      ? false
                      : stg.order < currentStage;

                  const isStepCurrent = isApproved
                    ? false
                    : (isRejected && stg.key === 'rejected')
                      ? true
                      : stg.order === currentStage;

                  let histEntry = null;
                  for (const ms of stg.matchStatuses) {
                    if (historyMap[ms]) {
                      histEntry = historyMap[ms];
                      break;
                    }
                  }

                  const timestamp = histEntry?.changedAt || (stg.key === 'submitted' ? app?.created_at : null);
                  const noteText = histEntry?.note || (isStepCompleted || isStepCurrent ? stg.defaultNote : null);

                  let circleBg = '#f1f5f9';
                  let circleBorder = '#e2e8f0';
                  let lineColor = isStepCompleted ? '#86efac' : '#e2e8f0';

                  if (isStepCompleted) {
                    circleBg = '#008744';
                    circleBorder = '#008744';
                  } else if (isStepCurrent) {
                    if (isRejected && stg.key === 'rejected') {
                      circleBg = '#dc2626';
                      circleBorder = '#dc2626';
                    } else {
                      circleBg = '#008744';
                      circleBorder = '#008744';
                    }
                  }

                  return (
                    <div key={stg.key} style={{ display: 'flex', alignItems: 'flex-start' }}>
                      {/* Left: Indicator Icon & Connecting Line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 34, flexShrink: 0 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: circleBg,
                          border: isStepCurrent
                            ? `3px solid ${isRejected ? '#dc2626' : '#008744'}`
                            : `2px solid ${circleBorder}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', flexShrink: 0,
                          boxShadow: isStepCurrent ? `0 0 0 4px ${isRejected ? 'rgba(220, 38, 38, 0.2)' : 'rgba(0, 135, 68, 0.2)'}` : 'none',
                          transition: 'all 0.2s ease'
                        }}>
                          {isStepCompleted ? (
                            <CheckCircle size={17} color="white" strokeWidth={2.5} />
                          ) : isStepCurrent ? (
                            isRejected ? (
                              <XCircle size={17} color="white" strokeWidth={2.5} />
                            ) : (
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'white' }} />
                            )
                          ) : (
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />
                          )}
                        </div>

                        {!isLast && (
                          <div style={{
                            width: 2.5,
                            minHeight: 44,
                            background: lineColor,
                            margin: '4px 0',
                            borderRadius: 2
                          }} />
                        )}
                      </div>

                      {/* Right: Step Details */}
                      <div style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{
                            fontSize: 13.5,
                            fontWeight: isStepCurrent ? 800 : (isStepCompleted ? 700 : 600),
                            color: isStepCurrent
                              ? (isRejected ? '#dc2626' : '#008744')
                              : (isStepCompleted ? '#0f172a' : '#64748b')
                          }}>
                            {stg.title}
                          </span>

                          {isStepCurrent && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                              padding: '1px 6px', borderRadius: 6,
                              background: isRejected ? '#fef2f2' : '#f0fdf4',
                              color: isRejected ? '#dc2626' : '#008744',
                              border: `1px solid ${isRejected ? '#fca5a5' : '#bbf7d0'}`
                            }}>
                              {isRejected ? 'Action' : 'Active'}
                            </span>
                          )}
                        </div>

                        {timestamp && (
                          <div style={{
                            marginTop: 5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                            fontSize: 11,
                            color: '#64748b',
                            background: '#f8fafc',
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            width: 'fit-content',
                          }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3.5, color: '#334155', fontWeight: 600 }}>
                              <Calendar size={11} style={{ color: '#008744' }} />
                              <span>{formatDateOnly(timestamp)}</span>
                            </div>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3.5, color: '#334155', fontWeight: 600 }}>
                              <Clock size={11} style={{ color: '#008744' }} />
                              <span>{formatTimeOnly(timestamp)}</span>
                            </div>
                            {getActorName(histEntry, stg.key) && (
                              <>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3.5, color: '#008744', fontWeight: 700 }}>
                                  <User size={11} style={{ color: '#008744' }} />
                                  <span>{getActorName(histEntry, stg.key)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {noteText && (
                          <div style={{
                            marginTop: 6,
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: isStepCurrent ? (isRejected ? '#fef2f2' : '#f0fdf4') : '#f8fafc',
                            border: `1px solid ${isStepCurrent ? (isRejected ? '#fecaca' : '#bbf7d0') : '#f1f5f9'}`,
                            fontSize: 12,
                            color: isStepCurrent ? (isRejected ? '#991b1b' : '#166534') : '#475569',
                            lineHeight: 1.45
                          }}>
                            {noteText}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Card 2: Company & Application Details */}
          <div style={{
            background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
            padding: '24px 26px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <Building2 size={17} style={{ color: '#008744' }} />
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Company Info
              </h3>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>Company Name</div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>{companyName}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>Site Name</div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{app?.site_name}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>Contact Person</div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{app?.contact_person}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{app?.contact_email}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{app?.contact_phone}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>Application Ref</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#008744' }}>{app?.application_number}</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── Approve & Issue Certificate Modal (Stage 4) ── */}
      {showApproveModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div style={{
            background: 'white', borderRadius: 16, width: '100%', maxWidth: 540,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            <div style={{
              background: '#008744', color: 'white', padding: '18px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Approve Extension Certificate</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, opacity: 0.9 }}>Issue and approve Halal validity extension</p>
              </div>
              <button
                onClick={() => setShowApproveModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Extended Valid Until (Expiry Date)
                </label>
                <input
                  type="date"
                  value={extendedUntil}
                  onChange={(e) => setExtendedUntil(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid #d1d5db', fontSize: 13.5
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Certificate Number (Auto-generated if left blank)
                </label>
                <input
                  type="text"
                  placeholder="e.g. EXT-CERT-2026-4821"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid #d1d5db', fontSize: 13.5
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Internal Notes &amp; Observations
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional approval notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db',
                    background: 'white', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleIssueCertificate}
                  disabled={approving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: '#008744', color: 'white', fontSize: 13, fontWeight: 700,
                    cursor: approving ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Award size={15} /> {approving ? 'Issuing...' : 'Confirm & Issue Extension Certificate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {showRejectModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div style={{
            background: 'white', borderRadius: 16, width: '100%', maxWidth: 480,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            <div style={{
              background: '#dc2626', color: 'white', padding: '18px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Reject Extension Request</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, opacity: 0.9 }}>Provide justification for rejection</p>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Rejection Reason (Sent to Client)
              </label>
              <textarea
                rows={4}
                required
                placeholder="State clearly why this extension application is rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db',
                    background: 'white', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={rejecting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 18px', borderRadius: 8, border: 'none',
                    background: '#dc2626', color: 'white', fontSize: 13, fontWeight: 700,
                    cursor: rejecting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <XCircle size={15} /> {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
