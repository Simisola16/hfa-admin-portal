import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { CheckSquare, UploadCloud, ChevronLeft } from 'lucide-react';

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
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <button className="btn btn-ghost" onClick={() => navigate('/applications')} style={{ marginBottom: 20 }}>
        <ChevronLeft size={16} /> Back to Applications
      </button>

      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 20, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>
              REVIEW AND CERTIFICATION COMMITTEE DECISION RECORD
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '5px 0 0 0' }}>
              Application No: {application?.application_number}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tabs Nav */}
          <div className="tabs" style={{ marginBottom: 24, borderBottom: '2px solid var(--gray-100)' }}>
            {[
              { id: 1, label: '1. Company Details' },
              { id: 2, label: '2. Review of Application' },
              { id: 3, label: '3. Certificate Status' },
              { id: 4, label: '4. Comment / Reason' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 24px',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : 'none',
                  background: 'none',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1 */}
          {activeTab === 1 && (
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
                <label className="form-label">Supporting File</label>
                {form.document_url ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <a href={form.document_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>View Document</a>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, document_url: '' })}>Remove</button>
                  </div>
                ) : (
                  <label className="file-upload-box" style={{ padding: 20, textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 8, cursor: 'pointer' }}>
                    <UploadCloud size={24} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontSize: 14 }}>Click to Upload File</div>
                    <input type="file" style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Tab 2 */}
          {activeTab === 2 && (
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
                <input type="text" className="form-control" value={form.auditors} onChange={e => setForm({ ...form, auditors: e.target.value })} />
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
                <label className="form-label">Pork free statement/signed pork policy submitted</label>
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
              <div className="form-group">
                <label className="form-label">Date of Review</label>
                <input type="date" className="form-control" value={form.review_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, review_date: e.target.value })} />
              </div>
            </div>
          )}

          {/* Tab 3 */}
          {activeTab === 3 && (
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-control" value={form.status_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, status_date: e.target.value })} />
              </div>
            </div>
          )}

          {/* Tab 4 */}
          {activeTab === 4 && (
            <div>
              <div className="form-group">
                <label className="form-label">Comment / Reason</label>
                <textarea 
                  className="form-control" 
                  rows={6}
                  placeholder="Enter Comment"
                  value={form.comment} 
                  onChange={e => setForm({ ...form, comment: e.target.value })} 
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20, fontSize: 14 }}>
              <input 
                type="checkbox" 
                checked={form.confirmed}
                onChange={e => setForm({ ...form, confirmed: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontWeight: 500 }}>I have confirmed that the product on the client dashboard is correct with the matrix.</span>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '10px 30px' }}>
                {submitting ? 'Submitting...' : 'Submit Logsheet & Advance Status'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
