import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { UploadCloud, ChevronLeft, Building, FileText, Award, MessageSquare, CheckCircle2, CheckSquare } from 'lucide-react';

export default function AdminCreateLogsheet() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [application, setApplication] = useState(null);

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

      // 2. See if logsheet exists
      let logsheetData = {};
      try {
        const logRes = await api.get(`/api/application-logsheets/application/${appId}`);
        logsheetData = logRes.data;
      } catch (e) {
        // Not found, use defaults from app
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
        }
      }

      setForm(f => ({ ...f, ...logsheetData, confirmed: false }));
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

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      <button className="btn btn-ghost" onClick={() => navigate('/applications')} style={{ marginBottom: 20 }}>
        <ChevronLeft size={16} /> Back to Applications
      </button>

      <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)' }}>
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
            )}

            {/* Tab 2 */}
            {activeTab === 2 && (
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
            )}

            {/* Tab 3 */}
            {activeTab === 3 && (
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
            )}

            {/* Tab 4 */}
            {activeTab === 4 && (
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
            )}
          </div>

          {/* Fixed Footer */}
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
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
