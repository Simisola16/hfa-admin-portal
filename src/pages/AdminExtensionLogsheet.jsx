import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, FileText, CheckCircle2, Clock, Check,
  User, Building2, Calendar, MapPin, Printer, Download,
  PenTool, AlertTriangle, ShieldCheck, RefreshCw, X, Save
} from 'lucide-react';

export default function AdminExtensionLogsheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const currentUser = profile || user;

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
    scheme: 'HFA',
    certificate_expiry_date: '',
    justification: '',
    extension_duration_type: '30_days', // '30_days' | 'more_than_30_days'
    extension_days: 30,
    comments: ''
  });

  // Signature modal state
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('single');
  const [sigName, setSigName] = useState('');
  const [signing, setSigning] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const [appRes, logRes, sigRes] = await Promise.all([
        api.get(`/api/extension-applications/${id}`),
        api.get(`/api/extension-applications/${id}/logsheet`),
        api.get('/api/signatures').catch(() => ({ data: { data: [] } }))
      ]);

      const loadedApp = appRes.data?.data || appRes.data;
      const loadedLog = logRes.data?.data || logRes.data;
      const loadedSigs = sigRes.data?.data || (Array.isArray(sigRes.data) ? sigRes.data : []);

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

      setFormData({
        company_name: loadedLog?.company_name || loadedApp?.company_name || loadedApp?.client_id?.company_name || '',
        facility_address: resolvedFacilityAddress,
        contact_person: loadedLog?.contact_person || loadedApp?.contact_person || '',
        product_category: loadedLog?.product_category || '',
        scheme: loadedLog?.scheme || 'HFA',
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

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleDurationTypeChange = (type) => {
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
        submit_for_signature: submitForSig
      };
      const res = await api.post(`/api/extension-applications/${id}/logsheet`, payload);
      setLogsheet(res.data?.data || res.data);
      toast.success(submitForSig ? 'Logsheet submitted for signatures!' : 'Logsheet draft saved successfully!');
      if (submitForSig) {
        navigate(`/extension-applications/${id}/processing`);
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to save logsheet.');
    } finally {
      setSaving(false);
    }
  };

  const openSignModal = (roleKey) => {
    setSelectedRole(roleKey);
    setSigName(currentUser?.full_name || currentUser?.name || '');
    setShowSignModal(true);
  };

  const handleApplySignature = async () => {
    const mySig = signatures.find(s =>
      (s.user_id && (s.user_id === currentUser?._id || s.user_id === currentUser?.id)) ||
      (s.username && currentUser?.email && s.username.toLowerCase() === currentUser.email.split('@')[0].toLowerCase()) ||
      (s.name && currentUser?.full_name && s.name.toLowerCase() === currentUser.full_name.toLowerCase())
    );

    const sigData = mySig?.signature_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="35" font-family="cursive" font-size="22" fill="%230f172a">Digitally Signed</text></svg>';

    setSigning(true);
    try {
      const res = await api.put(`/api/extension-applications/${id}/logsheet/sign`, {
        signature_role: selectedRole,
        signature_data: sigData,
        signer_name: sigName || currentUser?.full_name || 'Staff Officer'
      });
      setLogsheet(res.data?.data || res.data);
      toast.success('Signature applied successfully!');
      setShowSignModal(false);
    } catch (err) {
      console.error('Sign error:', err);
      toast.error('Failed to apply signature.');
    } finally {
      setSigning(false);
    }
  };

  const is30Days = formData.extension_duration_type === '30_days' || Number(formData.extension_days) <= 30;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #dcfce7', borderTop: '3px solid #008744', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Loading Extension Logsheet...</p>
      </div>
    );
  }

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

        {app?.status === 'submitted' && (
          <div style={{
            background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10,
            padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10
          }}>
            <AlertTriangle size={18} color="#92400e" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
              Advisory: This extension request is in "Extension Form Received" status. Please approve the request on the processing page to officially unlock this stage.
            </span>
          </div>
        )}

        {/* ── Section 1: Form Fields (Matches Image Spec) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Company Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Company Name:
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData(f => ({ ...f, company_name: e.target.value }))}
              placeholder="e.g. British Foods Ltd"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: '1px solid #94a3b8', fontSize: 13.5, fontWeight: 600, color: '#0f172a'
              }}
            />
          </div>

          {/* Address of certificated facility */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Address of certificated facility:
            </label>
            <input
              type="text"
              value={formData.facility_address}
              onChange={(e) => setFormData(f => ({ ...f, facility_address: e.target.value }))}
              placeholder="Full address of the manufacturing / processing facility"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: '1px solid #94a3b8', fontSize: 13.5, color: '#0f172a'
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
              value={formData.contact_person}
              onChange={(e) => setFormData(f => ({ ...f, contact_person: e.target.value }))}
              placeholder="Full name of representative"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: '1px solid #94a3b8', fontSize: 13.5, color: '#0f172a'
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
              value={formData.product_category}
              onChange={(e) => setFormData(f => ({ ...f, product_category: e.target.value }))}
              placeholder="e.g. Meat & Poultry / Confectionery / Flavours"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: '1px solid #94a3b8', fontSize: 13.5, color: '#0f172a'
              }}
            />
          </div>

          {/* Scheme: [ ] GSO  [ ] HFA */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Scheme:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.scheme === 'GSO' || formData.scheme === 'Both'}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setFormData(f => ({
                      ...f,
                      scheme: isChecked ? (f.scheme === 'HFA' ? 'Both' : 'GSO') : (f.scheme === 'Both' ? 'HFA' : 'HFA')
                    }));
                  }}
                  style={{ width: 18, height: 18, accentColor: '#008744', cursor: 'pointer' }}
                />
                GSO
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.scheme === 'HFA' || formData.scheme === 'Both'}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setFormData(f => ({
                      ...f,
                      scheme: isChecked ? (f.scheme === 'GSO' ? 'Both' : 'HFA') : (f.scheme === 'Both' ? 'GSO' : 'GSO')
                    }));
                  }}
                  style={{ width: 18, height: 18, accentColor: '#008744', cursor: 'pointer' }}
                />
                HFA
              </label>
            </div>
          </div>

          {/* Certificate expiry date */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Certificate expiry date:
            </label>
            <input
              type="date"
              value={formData.certificate_expiry_date}
              onChange={(e) => setFormData(f => ({ ...f, certificate_expiry_date: e.target.value }))}
              style={{
                width: 240, padding: '8px 12px', borderRadius: 6,
                border: '1px solid #94a3b8', fontSize: 13.5, color: '#0f172a'
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
              value={formData.justification}
              onChange={(e) => setFormData(f => ({ ...f, justification: e.target.value }))}
              placeholder="State the detailed operational, technical, or auditing justification for granting the certificate extension..."
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 8,
                border: '1.5px solid #64748b', fontSize: 13.5, lineHeight: 1.6,
                color: '#0f172a', resize: 'vertical'
              }}
            />
          </div>

          {/* Extension required for: _____ days & 30 Days / >30 Days Toggle */}
          <div style={{
            background: '#f8fafc', border: '1.5px dashed #cbd5e1',
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
                    border: '2px solid #008744', fontSize: 15, fontWeight: 800,
                    textAlign: 'center', color: '#008744'
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
                  onClick={() => handleDurationTypeChange('30_days')}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    border: is30Days ? '2px solid #008744' : '1px solid #cbd5e1',
                    background: is30Days ? '#ecfdf5' : 'white',
                    color: is30Days ? '#008744' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  ✓ 30 Days (1 Signature)
                </button>
                <button
                  type="button"
                  onClick={() => handleDurationTypeChange('more_than_30_days')}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    border: !is30Days ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: !is30Days ? '#eff6ff' : 'white',
                    color: !is30Days ? '#2563eb' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  ✓ More than 30 Days (4 Signatures)
                </button>
              </div>
            </div>
          </div>

          {/* ── Section 2: Signatures Section (Strictly following rule) ── */}
          <div style={{ marginTop: 20 }}>
            <div style={{
              background: '#0f172a', color: 'white', padding: '10px 16px',
              borderRadius: '8px 8px 0 0', fontWeight: 800, fontSize: 12.5,
              letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span>4 SIGNATURES OR ONE ONLY ACCORDING TO LENGTH OF EXTENSION</span>
              <span style={{
                background: is30Days ? '#059669' : '#2563eb',
                color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700
              }}>
                {is30Days ? '1 Signature Required' : '4 Signatures Required'}
              </span>
            </div>

            <div style={{
              border: '1px solid #0f172a', borderTop: 'none',
              borderRadius: '0 0 8px 8px', padding: 20, background: '#fafbfc'
            }}>
              
              {is30Days ? (
                /* ── 1 Signature Layout ── */
                <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
                  <div style={{
                    background: 'white', border: '1.5px solid #cbd5e1',
                    borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>
                      Authorized Officer / CEO Signature (30-Day Extension)
                    </div>

                    {logsheet?.single_signature ? (
                      <div>
                        <img
                          src={logsheet.single_signature}
                          alt="Signature"
                          style={{ maxHeight: 60, margin: '0 auto 8px', display: 'block' }}
                        />
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>
                          {logsheet.single_sign_name || 'Authorized Officer'}
                        </div>
                        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                          Signed on {new Date(logsheet.single_sign_date).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
                          Pending Signature
                        </div>
                        <button
                          type="button"
                          onClick={() => openSignModal('single')}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: '#008744', color: 'white', border: 'none',
                            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          <PenTool size={14} /> Sign 30-Day Extension
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── 4 Signatures Grid Layout ── */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  
                  {/* Slot 1: Mufti 1 */}
                  <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      1. Shariah / Mufti Signature
                    </div>
                    {logsheet?.mufti_signature ? (
                      <div style={{ marginTop: 10 }}>
                        <img src={logsheet.mufti_signature} alt="Mufti Sig" style={{ maxHeight: 50, display: 'block' }} />
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, marginTop: 4 }}>{logsheet.mufti_sign_name}</div>
                        <div style={{ fontSize: 11, color: '#059669' }}>Signed {new Date(logsheet.mufti_sign_date).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 14 }}>
                        <button
                          type="button"
                          onClick={() => openSignModal('mufti')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0284c7', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          <PenTool size={13} /> Sign as Mufti
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Slot 2: CEO */}
                  <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      2. Chief Executive Officer (CEO)
                    </div>
                    {logsheet?.ceo_signature ? (
                      <div style={{ marginTop: 10 }}>
                        <img src={logsheet.ceo_signature} alt="CEO Sig" style={{ maxHeight: 50, display: 'block' }} />
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, marginTop: 4 }}>{logsheet.ceo_sign_name}</div>
                        <div style={{ fontSize: 11, color: '#059669' }}>Signed {new Date(logsheet.ceo_sign_date).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 14 }}>
                        <button
                          type="button"
                          onClick={() => openSignModal('ceo')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0284c7', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          <PenTool size={13} /> Sign as CEO
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Slot 3: Manager */}
                  <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      3. Operations / Certification Manager
                    </div>
                    {logsheet?.manager_signature ? (
                      <div style={{ marginTop: 10 }}>
                        <img src={logsheet.manager_signature} alt="Manager Sig" style={{ maxHeight: 50, display: 'block' }} />
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, marginTop: 4 }}>{logsheet.manager_sign_name}</div>
                        <div style={{ fontSize: 11, color: '#059669' }}>Signed {new Date(logsheet.manager_sign_date).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 14 }}>
                        <button
                          type="button"
                          onClick={() => openSignModal('manager')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0284c7', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          <PenTool size={13} /> Sign as Manager
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Slot 4: Mufti 2 */}
                  <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      4. Second Shariah / Technical Expert
                    </div>
                    {logsheet?.mufti2_signature ? (
                      <div style={{ marginTop: 10 }}>
                        <img src={logsheet.mufti2_signature} alt="Mufti 2 Sig" style={{ maxHeight: 50, display: 'block' }} />
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, marginTop: 4 }}>{logsheet.mufti2_sign_name}</div>
                        <div style={{ fontSize: 11, color: '#059669' }}>Signed {new Date(logsheet.mufti2_sign_date).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 14 }}>
                        <button
                          type="button"
                          onClick={() => openSignModal('mufti2')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0284c7', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          <PenTool size={13} /> Sign as Mufti 2
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* ── Signature Modal ── */}
      {showSignModal && (
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
              background: '#0f172a', color: 'white', padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                Apply Digital Signature
              </div>
              <button
                onClick={() => setShowSignModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Signatory Full Name
                </label>
                <input
                  type="text"
                  value={sigName}
                  onChange={(e) => setSigName(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid #d1d5db', fontSize: 13.5, fontWeight: 600
                  }}
                />
              </div>

              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 10, padding: 16, textAlign: 'center', marginBottom: 20
              }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Digital Signature Preview</div>
                <div style={{
                  fontFamily: 'cursive', fontSize: 24, color: '#0f172a',
                  padding: '10px 0', borderBottom: '1px solid #cbd5e1'
                }}>
                  {sigName || 'Authorized Signatory'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                  HFA Secure Digital Approval Timestamp: {new Date().toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db',
                    background: 'white', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplySignature}
                  disabled={signing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: '#008744', color: 'white', fontSize: 13, fontWeight: 700,
                    cursor: signing ? 'not-allowed' : 'pointer'
                  }}
                >
                  <PenTool size={14} /> {signing ? 'Applying...' : 'Confirm & Apply Signature'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
