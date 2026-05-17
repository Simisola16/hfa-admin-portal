import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { UploadCloud, ChevronLeft, Building, FileText, Award, MessageSquare, Clock, CheckCircle2, CheckSquare, PenTool, Check } from 'lucide-react';
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
  const [sigRole, setSigRole] = useState('');
  const [sigComment, setSigComment] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [isSendingWithoutSig, setIsSendingWithoutSig] = useState(false);

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

          // Map application type to Audit Type
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

        // Populate from Audit if found
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

  const handleSignLogsheet = async (e) => {
    e.preventDefault();
    if (!sigRole) {
      toast.error('Please select a signature role first');
      return;
    }
    
    if (!userSignature) {
      toast.error(`Your authenticated user account does not have an uploaded digital signature in the system yet.`);
      return;
    }

    setIsSigning(true);
    try {
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        role: sigRole,
        signature_url: userSignature.signature_url,
        signature_name: userSignature.name,
        comment: sigComment
      });
      toast.success(`Logsheet successfully signed as ${sigRole}!`);
      fetchData();
      setSigRole('');
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
      toast.success('Logsheet sent to review without signature successfully');
      navigate('/logsheet/waiting-signature');
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setIsSendingWithoutSig(false);
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
        application_id: application.id,
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

  const isReadOnly = currentLogsheet && currentLogsheet.status === 'Waiting for Signature';

  const renderField = (label, value, isDate = false, customStyle = {}) => {
    const formatted = isDate ? (value ? new Date(value).toLocaleDateString('en-GB') : '—') : (value || '—');
    return (
      <div className="form-group" style={customStyle}>
        <label className="form-label">{label}</label>
        <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#334155', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
          {formatted}
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      <button className="btn btn-ghost" onClick={() => navigate('/applications')} style={{ marginBottom: 20 }}>
        <ChevronLeft size={16} /> Back to Applications
      </button>

      <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)' }}>
        {/* Read-Only Status Banner */}
        {isReadOnly && (
          <div style={{ background: '#fff7ed', borderBottom: '1px solid #ffedd5', padding: '16px 30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#ffedd5', color: '#ea580c', padding: '8px', borderRadius: '50%', display: 'flex' }}>
              <Clock size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#c2410c' }}>Logsheet Sign-Off Review Mode (Locked)</h4>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#9a3412', fontWeight: 500 }}>
                This record is finalized and locked for editing. Only executive electronic signatures can be applied below.
              </p>
            </div>
          </div>
        )}

        {/* Beautiful Header */}
        <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '30px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12 }}>
                <CheckSquare size={14} /> DECISION RECORD
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Review & Certification Committee
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#64748b', fontSize: 12, textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px 0' }}>Application Ref</p>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', background: '#fff', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                {application?.application_number || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 500 }}>
          {/* Custom Tabs */}
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
                    padding: '16px 20px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#0284c7' : '#64748b',
                    background: isActive ? '#fff' : 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #0284c7' : '2px solid transparent',
                    borderRight: idx < 3 ? '1px solid #e2e8f0' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: 14
                  }}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Form Content Wrapper */}
          <div style={{ padding: 30, flex: 1, background: '#fff' }}>
            {/* Tab 1 */}
            {activeTab === 1 && (
              isReadOnly ? (
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, animation: 'fadeIn 0.3s ease-in-out' }}>
                  {renderField('Company Name', form.company_name)}
                  {renderField('Contact Person', form.contact_person)}
                  {renderField('Company Address', form.company_address, false, { gridColumn: '1 / -1' })}
                  {renderField('Manufacturing Address', form.manufacturing_address, false, { gridColumn: '1 / -1' })}
                  {renderField('Contact E-mail', form.contact_email)}
                  {renderField('Nature of the business', form.nature_of_business)}
                  {renderField('Product Category', form.product_category)}
                  
                  <div style={{ gridColumn: '1 / -1', height: 1, background: '#e2e8f0', margin: '8px 0' }} />

                  {renderField('Issue date of certificate', form.issue_date, true)}
                  {renderField('Expiry date of certificate', form.expiry_date, true)}
                  {renderField('Current Cycle Start Date', form.current_cycle_start, true)}
                  {renderField('Original Cycle Start Date', form.original_cycle_start, true)}

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Supporting Document</label>
                    {form.document_url ? (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f0fdf4', padding: '12px 16px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                        <CheckCircle2 size={18} color="#16a34a" />
                        <a href={form.document_url} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 600, flex: 1, textDecoration: 'none' }}>View Uploaded Document</a>
                      </div>
                    ) : (
                      <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>
                        No supporting document uploaded
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, animation: 'fadeIn 0.3s ease-in-out' }}>
                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input type="text" className="form-control" style={{ background: '#f8fafc' }} value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input type="text" className="form-control" style={{ background: '#f8fafc' }} value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Company Address</label>
                    <input type="text" className="form-control" style={{ background: '#f8fafc' }} value={form.company_address} onChange={e => setForm({ ...form, company_address: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Manufacturing Address</label>
                    <input type="text" className="form-control" style={{ background: '#f8fafc' }} value={form.manufacturing_address} onChange={e => setForm({ ...form, manufacturing_address: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact E-mail</label>
                    <input type="email" className="form-control" style={{ background: '#f8fafc' }} value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nature of the business</label>
                    <input type="text" className="form-control" style={{ background: '#f8fafc' }} value={form.nature_of_business} onChange={e => setForm({ ...form, nature_of_business: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Product Category</label>
                    <input type="text" className="form-control" style={{ background: '#f8fafc' }} value={form.product_category} onChange={e => setForm({ ...form, product_category: e.target.value })} />
                  </div>
                  
                  <div style={{ gridColumn: '1 / -1', height: 1, background: '#e2e8f0', margin: '8px 0' }} />

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
                        <a href={form.document_url} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 600, flex: 1, textDecoration: 'none' }}>Document Uploaded Successfully</a>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => setForm({ ...form, document_url: '' })}>Remove</button>
                      </div>
                    ) : (
                      <label className="file-upload-box" style={{ display: 'flex', flexDirection: 'column', padding: 30, alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', borderRadius: 12, cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s' }}>
                        <div style={{ background: '#e2e8f0', padding: 12, borderRadius: '50%', marginBottom: 12 }}>
                          <UploadCloud size={24} color="#475569" />
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Click to Upload File</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>PDF, PNG, or JPG (Max 5MB)</div>
                        <input type="file" style={{ display: 'none' }} onChange={handleFileChange} />
                      </label>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Tab 2 */}
            {activeTab === 2 && (
              isReadOnly ? (
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, animation: 'fadeIn 0.3s ease-in-out' }}>
                  {renderField('Audit Type', form.audit_type)}
                  {renderField('Audit Date', form.audit_date, true)}
                  {renderField('Auditors', form.auditors)}
                  {renderField('NCS Close (if any)', form.ncs_close)}
                  {renderField('Audit Documentation reviewed and found satisfactory', form.docs_satisfactory, false, { gridColumn: '1 / -1' })}
                  {renderField('Pork free statement / signed pork policy submitted', form.pork_free_statement, false, { gridColumn: '1 / -1' })}
                  
                  <div style={{ gridColumn: '1 / -1', height: 1, background: '#e2e8f0', margin: '8px 0' }} />

                  {renderField('Reviewed By', form.reviewed_by)}
                  {renderField('Reviewer Name', form.reviewer_name)}
                  {renderField('Date of Review', form.review_date, true, { gridColumn: '1 / -1' })}
                </div>
              ) : (
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, animation: 'fadeIn 0.3s ease-in-out' }}>
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
                  
                  <div style={{ gridColumn: '1 / -1', height: 1, background: '#e2e8f0', margin: '8px 0' }} />

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
              )
            )}

            {/* Tab 3 */}
            {activeTab === 3 && (
              isReadOnly ? (
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, animation: 'fadeIn 0.3s ease-in-out' }}>
                  {renderField('Annual certificate', form.annual_certificate)}
                  {renderField('Batch certificate', form.batch_certificate)}
                  {renderField('Only addition of new products', form.new_products_only)}
                  {renderField('Addition of new site (or line)', form.new_site_line)}
                  {renderField('New Client', form.new_client)}
                  {renderField('Agreement Signed', form.agreement_signed)}
                  {renderField('Status Date', form.status_date, true, { gridColumn: '1 / -1' })}
                </div>
              ) : (
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, animation: 'fadeIn 0.3s ease-in-out' }}>
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
              )
            )}

            {/* Tab 4 */}
            {activeTab === 4 && (
              isReadOnly ? (
                <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                  <div className="form-group">
                    <label className="form-label">Comment / Reason</label>
                    <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#334155', minHeight: '150px', whiteSpace: 'pre-wrap' }}>
                      {form.comment || '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                  <div className="form-group">
                    <label className="form-label">Comment / Reason</label>
                    <textarea 
                      className="form-control" 
                      rows={8}
                      style={{ background: '#f8fafc', fontSize: 15, padding: 16 }}
                      placeholder="Enter final review comments, notes, or specific reasons for certification..."
                      value={form.comment} 
                      onChange={e => setForm({ ...form, comment: e.target.value })} 
                    />
                  </div>
                </div>
              )
            )}
          </div>

          {/* Fixed Footer */}
          {!isReadOnly && (
            <div style={{ background: '#f8fafc', padding: '20px 30px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ 
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', 
                background: form.confirmed ? '#f0fdf4' : '#fff', 
                border: `1px solid ${form.confirmed ? '#86efac' : '#cbd5e1'}`, 
                padding: '12px 16px', borderRadius: 8, transition: 'all 0.2s'
              }}>
                <input 
                  type="checkbox" 
                  checked={form.confirmed}
                  onChange={e => setForm({ ...form, confirmed: e.target.checked })}
                  style={{ width: 20, height: 20, cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600, color: form.confirmed ? '#166534' : '#334155' }}>
                  I have confirmed that the product on the client dashboard is correct with the matrix.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {form.confirmed ? 'Ready to submit logsheet.' : 'Please confirm the checklist above to submit.'}
                </span>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting || !form.confirmed} 
                  style={{ 
                    padding: '12px 32px', 
                    fontSize: 15, 
                    fontWeight: 600,
                    opacity: (!form.confirmed || submitting) ? 0.6 : 1,
                    boxShadow: '0 4px 14px 0 rgba(2,132,199,0.39)'
                  }}
                >
                  {submitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} /> Saving...</span>
                  ) : 'Submit Logsheet & Advance Status'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* SIGNATURE PANEL CARD */}
      {currentLogsheet && (
        <div className="card" style={{ marginTop: '30px', padding: '30px', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s ease-in-out' }}>
          {/* Section Header */}
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PenTool size={22} style={{ color: 'var(--primary)' }} />
              Logsheet Sign-Off Matrix
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
              Authorized reviewers can electronically sign this application logsheet decision.
            </p>
          </div>

          {/* Render Applied Signatures Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            {/* Mufti Signature Display */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: currentLogsheet.mufti_signature ? '#f0fdf4' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '130px', textAlign: 'center', transition: 'all 0.2s' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Mufti</span>
              {currentLogsheet.mufti_signature ? (
                <>
                  <img src={getPdfUrl(currentLogsheet.mufti_signature)} alt="Mufti Signature" style={{ maxHeight: '48px', maxWidth: '160px', objectFit: 'contain', margin: '6px 0' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>{currentLogsheet.mufti_sign_name}</span>
                  <span style={{ fontSize: '11px', color: '#15803d', opacity: 0.8 }}>{new Date(currentLogsheet.mufti_sign_date).toLocaleDateString('en-GB')}</span>
                </>
              ) : (
                <span style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>Pending Signature</span>
              )}
            </div>

            {/* CEO Signature Display */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: currentLogsheet.ceo_signature ? '#f0fdf4' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '130px', textAlign: 'center', transition: 'all 0.2s' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>CEO</span>
              {currentLogsheet.ceo_signature ? (
                <>
                  <img src={getPdfUrl(currentLogsheet.ceo_signature)} alt="CEO Signature" style={{ maxHeight: '48px', maxWidth: '160px', objectFit: 'contain', margin: '6px 0' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>{currentLogsheet.ceo_sign_name}</span>
                  <span style={{ fontSize: '11px', color: '#15803d', opacity: 0.8 }}>{new Date(currentLogsheet.ceo_sign_date).toLocaleDateString('en-GB')}</span>
                </>
              ) : (
                <span style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>Pending Signature</span>
              )}
            </div>

            {/* Manager Signature Display */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: currentLogsheet.manager_signature ? '#f0fdf4' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '130px', textAlign: 'center', transition: 'all 0.2s' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Manager</span>
              {currentLogsheet.manager_signature ? (
                <>
                  <img src={getPdfUrl(currentLogsheet.manager_signature)} alt="Manager Signature" style={{ maxHeight: '48px', maxWidth: '160px', objectFit: 'contain', margin: '6px 0' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>{currentLogsheet.manager_sign_name}</span>
                  <span style={{ fontSize: '11px', color: '#15803d', opacity: 0.8 }}>{new Date(currentLogsheet.manager_sign_date).toLocaleDateString('en-GB')}</span>
                </>
              ) : (
                <span style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>Pending Signature</span>
              )}
            </div>

            {/* Mufti2 Signature Display */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: currentLogsheet.mufti2_signature ? '#f0fdf4' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '130px', textAlign: 'center', transition: 'all 0.2s' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Mufti 2</span>
              {currentLogsheet.mufti2_signature ? (
                <>
                  <img src={getPdfUrl(currentLogsheet.mufti2_signature)} alt="Mufti 2 Signature" style={{ maxHeight: '48px', maxWidth: '160px', objectFit: 'contain', margin: '6px 0' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>{currentLogsheet.mufti2_sign_name}</span>
                  <span style={{ fontSize: '11px', color: '#15803d', opacity: 0.8 }}>{new Date(currentLogsheet.mufti2_sign_date).toLocaleDateString('en-GB')}</span>
                </>
              ) : (
                <span style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>Pending Signature</span>
              )}
            </div>
          </div>

          {/* Only render signing decision panel if status is 'Waiting for Signature' */}
          {currentLogsheet.status === 'Waiting for Signature' && (
            <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '28px' }}>
              {/* Note / Comment Text Area */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'block' }}>Signature Comments / Review Notes</label>
                <textarea 
                  className="form-control"
                  rows={4}
                  placeholder="Enter comments, conditions, or reasons for signing..."
                  value={sigComment}
                  onChange={e => setSigComment(e.target.value)}
                  style={{ background: '#fff', fontSize: '14px', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              {/* Signature Role Selector */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '28px' }}>
                {['Mufti', 'Ceo', 'Manager', 'Mufti2'].map(role => {
                  return (
                    <label 
                      key={role} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        cursor: 'pointer', 
                        fontSize: '14px', 
                        fontWeight: 700, 
                        color: sigRole === role ? '#4f46e5' : '#475569',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        background: sigRole === role ? '#f5f3ff' : '#f8fafc',
                        border: `2px solid ${sigRole === role ? '#4f46e5' : '#e2e8f0'}`,
                        transition: 'all 0.2s',
                        boxShadow: sigRole === role ? '0 4px 6px -1px rgba(79, 70, 229, 0.1)' : 'none'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="signatureRole" 
                        value={role} 
                        checked={sigRole === role} 
                        onChange={() => setSigRole(role)}
                        style={{ display: 'none' }}
                      />
                      <span 
                        style={{ 
                          width: '16px', 
                          height: '16px', 
                          borderRadius: '50%', 
                          border: `2px solid ${sigRole === role ? '#4f46e5' : '#cbd5e1'}`, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          background: sigRole === role ? '#4f46e5' : 'transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        {sigRole === role && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                      </span>
                      <span>
                        {role === 'Ceo' ? 'Ceo' : role === 'Mufti2' ? 'Mufti2' : role}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Show selected signature preview */}
              <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'center' }}>
                {userSignature ? (
                  <div style={{ padding: '14px 24px', border: '1px dashed #86efac', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 6px -1px rgba(22, 101, 52, 0.05)', animation: 'fadeIn 0.2s ease-in-out' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={18} style={{ color: '#16a34a' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '10px', color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Authenticated Signature Active</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{userSignature.name}</div>
                      </div>
                    </div>
                    <div style={{ borderLeft: '1px solid #dcfce7', height: '30px' }} />
                    <img src={getPdfUrl(userSignature.signature_url)} alt="Signature Preview" style={{ maxHeight: '42px', maxWidth: '140px', objectFit: 'contain', background: 'white', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  </div>
                ) : (
                  <div style={{ padding: '14px 24px', border: '1px dashed #fca5a5', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: '12px', color: '#991b1b', fontSize: '13px', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(153, 27, 27, 0.05)', animation: 'fadeIn 0.2s ease-in-out' }}>
                    <span>⚠️ Your authenticated user account (<strong>{user?.full_name || 'Admin'}</strong>) does not have an uploaded digital signature in the system yet.</span>
                    <button 
                      type="button" 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => navigate('/signatures')}
                      style={{ color: '#b91c1c', textDecoration: 'underline', padding: '0 4px', fontWeight: 800 }}
                    >
                      Upload Signature
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleSignLogsheet}
                  disabled={isSigning || !sigRole || !userSignature}
                  className="btn btn-primary"
                  style={{ 
                    padding: '12px 36px', 
                    fontSize: '14px', 
                    fontWeight: 700, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    background: '#6366f1',
                    borderColor: '#6366f1',
                    boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)',
                    cursor: 'pointer',
                    opacity: (isSigning || !sigRole || !userSignature) ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  {isSigning ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: '#fff' }} /> APPLYING SIGNATURE...</span>
                  ) : (
                    <>
                      <PenTool size={16} />
                      SIGN
                    </>
                  )}
                </button>

                <button 
                  onClick={handleSendToReview}
                  disabled={isSendingWithoutSig}
                  className="btn btn-ghost"
                  style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px', 
                    fontWeight: 700,
                    color: '#6366f1',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSendingWithoutSig ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div className="spinner" style={{ width: '16px', height: '16px' }} /> SENDING...</span>
                  ) : (
                    'SEND TO REVIEW WITHOUT SIGNATURE'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
