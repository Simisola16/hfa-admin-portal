import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Trash2, CheckCircle, FileText, AlertTriangle, ShieldCheck, 
  Download, Upload, Save, Check, RefreshCw, X
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export const INITIAL_PRODUCT_APPROVAL_FORM = {
  // Header
  company_name_address: '',
  brand_owner_name_address: '',

  // Section 1: Product Information
  product_name: '',
  product_code: '',
  product_description: '',
  manufacturing_facility_address: '',
  is_already_halal_certified: 'No',
  halal_cert_body: '',
  halal_cert_issue_date: '',
  halal_cert_expiry_date: '',
  is_porcine_handled: 'No',
  porcine_segregation_details: '',
  porcine_products: [{ product_name: '', code: '' }],
  is_equipment_shared_porcine: 'No',
  is_equipment_shared_unhalal_animal: 'No',
  cleaning_validation_procedure: '',

  // Section 2: Ingredients Information (8 & 9)
  ingredients: [
    { name: '', code: '', source: '', supplier: '', manufacturer: '', certificate_statement: '', halal_body_expiry: '' }
  ],
  processing_aids: [
    { name: '', function: '', source: '', supplier_manufacturer: '', halal_status: '' }
  ],

  // Section 3: Animal Based Products & Ethanol (10 & 11)
  has_animal_derivatives: 'No',
  animal_derivatives: [
    { constituent: '', source: '', certificate_statement: '' }
  ],
  is_ethanol_free: 'Yes',
  ethanol_source_details: '',
  ethanol_percentage: '',

  // Section 4: Food Contact Packaging (12)
  is_artwork_labelling_required: 'No',
  artwork_labelling_document: null,
  artwork_labelling_details: '',
  is_packaging_animal_free: 'Yes',
  packaging_animal_free_document: null,
  packaging_animal_free_details: '',
  packaging_details: [
    { packaging_material: '', chemical_composition: '', migration_certificate: '', suitability: '' }
  ],

  // Section 5: Signature & Designation
  print_name: '',
  designation: '',
  sign_date: new Date().toISOString().split('T')[0],
  signature_text: '',
  declared_true: true
};

export default function ProductApprovalRequestForm({
  formData = {},
  initialData = {},
  onChange,
  readOnly = false,
  product = {},
  company = {}
}) {
  const resolveIncoming = (input) => {
    if (!input) return {};
    if (typeof input === 'string') {
      try { return JSON.parse(input); } catch (e) { return {}; }
    }
    return typeof input === 'object' ? input : {};
  };

  const getMergedData = (fd, id) => {
    const rawData = (id && Object.keys(id).length > 0) ? id : fd;
    const resolved = resolveIncoming(rawData);
    return {
      ...INITIAL_PRODUCT_APPROVAL_FORM,
      ...resolved,
      product_name: resolved.product_name || product?.name || '',
      product_code: resolved.product_code || product?.code || '',
      company_name_address: resolved.company_name_address || [company?.company_name, company?.address].filter(Boolean).join(', ') || ''
    };
  };

  const [form, setForm] = useState(() => getMergedData(formData, initialData));

  useEffect(() => {
    const rawData = (initialData && Object.keys(initialData).length > 0) ? initialData : formData;
    const resolved = resolveIncoming(rawData);
    if (resolved && Object.keys(resolved).length > 0) {
      setForm(prev => ({
        ...INITIAL_PRODUCT_APPROVAL_FORM,
        ...prev,
        ...resolved,
        product_name: resolved.product_name || product?.name || prev.product_name,
        product_code: resolved.product_code || product?.code || prev.product_code
      }));
    }
  }, [formData, initialData, product]);

  const [uploadingField, setUploadingField] = useState(null);

  const handleFileUpload = async (field, file) => {
    if (!file) {
      updateField(field, null);
      return;
    }
    setUploadingField(field);
    try {
      const url = await api.uploadPdf(file, 'addon-forms');
      updateField(field, url);
      toast.success('Document uploaded successfully');
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error('Failed to upload document');
    } finally {
      setUploadingField(null);
    }
  };

  const updateField = (key, val) => {
    if (readOnly) return;
    const updated = { ...form, [key]: val };
    setForm(updated);
    if (onChange) onChange(updated);
  };

  const updateTable = (tableName, index, field, value) => {
    if (readOnly) return;
    const list = [...(form[tableName] || [])];
    if (!list[index]) list[index] = {};
    list[index] = { ...list[index], [field]: value };
    updateField(tableName, list);
  };

  const addTableRow = (tableName, defaultRow) => {
    if (readOnly) return;
    const list = [...(form[tableName] || []), defaultRow];
    updateField(tableName, list);
  };

  const removeTableRow = (tableName, index) => {
    if (readOnly) return;
    const list = (form[tableName] || []).filter((_, i) => i !== index);
    updateField(tableName, list.length > 0 ? list : [{}]);
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: 12,
      padding: '24px 28px',
      color: '#0f172a',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      maxWidth: 1040,
      margin: '0 auto'
    }}>

      {/* Official Form Header Banner */}
      <div style={{
        background: '#164e63',
        color: '#ffffff',
        textAlign: 'center',
        padding: '18px 20px',
        borderRadius: 8,
        marginBottom: 20
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.04em', margin: 0, textTransform: 'uppercase' }}>
          PRODUCT APPROVAL REQUEST FORM
        </h2>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#bae6fd', marginTop: 4 }}>
          Halal Certification Application Document
        </div>
      </div>

      {/* Company Name & Brand Owner Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginBottom: 6 }}>
            COMPANY NAME &amp; ADDRESS
          </label>
          <textarea
            rows={2}
            className="form-control"
            disabled={readOnly}
            value={form.company_name_address}
            onChange={e => updateField('company_name_address', e.target.value)}
            placeholder="Enter full company name, registered facility address & contact details..."
            style={{ fontSize: 13, background: readOnly ? '#f1f5f9' : '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginBottom: 6 }}>
            BRAND OWNER NAME &amp; ADDRESS (IF DIFFERENT)
          </label>
          <textarea
            rows={2}
            className="form-control"
            disabled={readOnly}
            value={form.brand_owner_name_address}
            onChange={e => updateField('brand_owner_name_address', e.target.value)}
            placeholder="Enter brand owner name and address if different from manufacturing company..."
            style={{ fontSize: 13, background: readOnly ? '#f1f5f9' : '#fff' }}
          />
        </div>
      </div>

      {/* SECTION I: INFORMATION ABOUT PRODUCTS SUBMITTED */}
      <div style={{
        background: '#164e63',
        color: '#ffffff',
        fontSize: 12.5,
        fontWeight: 800,
        letterSpacing: '0.04em',
        padding: '8px 14px',
        borderRadius: '6px 6px 0 0',
        textTransform: 'uppercase'
      }}>
        INFORMATION ABOUT PRODUCTS SUBMITTED FOR HALAL CERTIFICATION
      </div>

      <div style={{ border: '1px solid #cbd5e1', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px 18px', marginBottom: 24, background: '#fff' }}>
        
        {/* 1. Product Name */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 220px 1fr', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#334155' }}>1.</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Product Name</span>
          <input
            type="text"
            className="form-control"
            disabled={readOnly}
            value={form.product_name}
            onChange={e => updateField('product_name', e.target.value)}
            placeholder="e.g. Pure Halal Organic Butter"
            style={{ fontSize: 13 }}
          />
        </div>

        {/* 2. Product Code */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 220px 1fr', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#334155' }}>2.</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Product Code</span>
          <input
            type="text"
            className="form-control"
            disabled={readOnly}
            value={form.product_code}
            onChange={e => updateField('product_code', e.target.value)}
            placeholder="e.g. SKU-8849"
            style={{ fontSize: 13 }}
          />
        </div>

        {/* 3. Product Description */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 220px 1fr', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#334155' }}>3.</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Product Description</span>
          <input
            type="text"
            className="form-control"
            disabled={readOnly}
            value={form.product_description}
            onChange={e => updateField('product_description', e.target.value)}
            placeholder="e.g. Pasteurized dairy butter 82% fat content"
            style={{ fontSize: 13 }}
          />
        </div>

        {/* 4. Address of Manufacturing Facility */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 220px 1fr', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#334155' }}>4.</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Address of Manufacturing Facility (if different)</span>
          <input
            type="text"
            className="form-control"
            disabled={readOnly}
            value={form.manufacturing_facility_address}
            onChange={e => updateField('manufacturing_facility_address', e.target.value)}
            placeholder="e.g. Unit 4, Industrial Park, London"
            style={{ fontSize: 13 }}
          />
        </div>

        {/* 5. Is this product already Halal-certified? */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 220px 1fr', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#334155' }}>5.</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Is this product already Halal-certified?</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Yes', 'No'].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: readOnly ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input
                  type="radio"
                  name="is_already_halal_certified"
                  value={opt}
                  checked={form.is_already_halal_certified === opt}
                  onChange={e => updateField('is_already_halal_certified', e.target.value)}
                  disabled={readOnly}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* 6. Halal Certificate Details if YES */}
        {form.is_already_halal_certified === 'Yes' && (
          <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 8, margin: '8px 0 12px 40px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 8 }}>
              6. If YES, please provide details of the current Halal Certificate:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>Name of Certification Body</label>
                <input
                  type="text"
                  className="form-control"
                  disabled={readOnly}
                  value={form.halal_cert_body}
                  onChange={e => updateField('halal_cert_body', e.target.value)}
                  placeholder="e.g. HFA / JAKIM"
                  style={{ fontSize: 12.5 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>Issue Date</label>
                <input
                  type="date"
                  className="form-control"
                  disabled={readOnly}
                  value={form.halal_cert_issue_date?.split('T')[0] || ''}
                  onChange={e => updateField('halal_cert_issue_date', e.target.value)}
                  style={{ fontSize: 12.5 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>Expiry Date</label>
                <input
                  type="date"
                  className="form-control"
                  disabled={readOnly}
                  value={form.halal_cert_expiry_date?.split('T')[0] || ''}
                  onChange={e => updateField('halal_cert_expiry_date', e.target.value)}
                  style={{ fontSize: 12.5 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 7. Pork or porcine material handled? */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 220px 1fr', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#334155' }}>7.</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Is pork or porcine material handled/processed at the manufacturing site?</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Yes', 'No'].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: readOnly ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input
                  type="radio"
                  name="is_porcine_handled"
                  value={opt}
                  checked={form.is_porcine_handled === opt}
                  onChange={e => updateField('is_porcine_handled', e.target.value)}
                  disabled={readOnly}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* 7.1 & 7.2 Porcine details if YES */}
        {form.is_porcine_handled === 'Yes' && (
          <div style={{ background: '#fef2f2', padding: 14, borderRadius: 8, margin: '8px 0 12px 40px', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>
              7.1 State the nature of material handled, processed, or stored on-site with segregation details:
            </div>
            <textarea
              rows={2}
              className="form-control"
              disabled={readOnly}
              value={form.porcine_segregation_details}
              onChange={e => updateField('porcine_segregation_details', e.target.value)}
              placeholder="Describe physical segregation, dedicated lines, or containment procedures..."
              style={{ fontSize: 12.5, marginBottom: 10 }}
            />

            <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>
              7.2 Products containing porcine ingredients:
            </div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', background: '#fff', border: '1px solid #fecaca', borderRadius: 6 }}>
              <thead>
                <tr style={{ background: '#fee2e2', textAlign: 'left', color: '#991b1b' }}>
                  <th style={{ padding: '6px 10px' }}>Product Name</th>
                  <th style={{ padding: '6px 10px' }}>Code</th>
                  {!readOnly && <th style={{ width: 40, padding: '6px 10px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {(form.porcine_products || []).map((row, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #fecaca' }}>
                    <td style={{ padding: '4px 8px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.product_name || ''}
                        onChange={e => updateTable('porcine_products', idx, 'product_name', e.target.value)}
                        placeholder="e.g. Pork Sausage"
                      />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.code || ''}
                        onChange={e => updateTable('porcine_products', idx, 'code', e.target.value)}
                        placeholder="Code"
                      />
                    </td>
                    {!readOnly && (
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626', padding: 2 }} onClick={() => removeTableRow('porcine_products', idx)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!readOnly && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ marginTop: 6, fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}
                onClick={() => addTableRow('porcine_products', { product_name: '', code: '' })}
              >
                <Plus size={12} /> Add Porcine Product Row
              </button>
            )}
          </div>
        )}

        {/* 7.3 Shared equipment with porcine derivative? */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#334155' }}>7.3</span>
          <span style={{ fontSize: 13, color: '#1e293b' }}>
            Is the equipment used to produce the product also used to produce other products that may contain ingredients of porcine derivative?
          </span>
          <div style={{ display: 'flex', gap: 16 }}>
            {['Yes', 'No'].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: readOnly ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input
                  type="radio"
                  name="is_equipment_shared_porcine"
                  value={opt}
                  checked={form.is_equipment_shared_porcine === opt}
                  onChange={e => updateField('is_equipment_shared_porcine', e.target.value)}
                  disabled={readOnly}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* 7.4 Shared processing lines for non-halal animal material? */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px', gap: 12, alignItems: 'center', padding: '10px 0' }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#334155' }}>7.4</span>
          <div>
            <span style={{ fontSize: 13, color: '#1e293b' }}>
              Are the equipment/processing lines used to produce the product also used to produce other products that may contain animal material which has no Halal certificates?
            </span>
            <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
              (If yes, please provide cleaning verification &amp; validation procedure in place)
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {['Yes', 'No'].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: readOnly ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input
                  type="radio"
                  name="is_equipment_shared_unhalal_animal"
                  value={opt}
                  checked={form.is_equipment_shared_unhalal_animal === opt}
                  onChange={e => updateField('is_equipment_shared_unhalal_animal', e.target.value)}
                  disabled={readOnly}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {form.is_equipment_shared_unhalal_animal === 'Yes' && (
          <div style={{ background: '#fffbeb', padding: 12, borderRadius: 8, margin: '6px 0 10px 40px', border: '1px solid #fde68a' }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: '#92400e', display: 'block', marginBottom: 4 }}>
              Cleaning Verification &amp; Validation Procedure:
            </label>
            <textarea
              rows={2}
              className="form-control"
              disabled={readOnly}
              value={form.cleaning_validation_procedure}
              onChange={e => updateField('cleaning_validation_procedure', e.target.value)}
              placeholder="Specify chemical sanitization, ATP swab testing, flush procedures..."
              style={{ fontSize: 12.5 }}
            />
          </div>
        )}
      </div>

      {/* SECTION II: INFORMATION ABOUT INGREDIENTS */}
      <div style={{
        background: '#164e63',
        color: '#ffffff',
        fontSize: 12.5,
        fontWeight: 800,
        letterSpacing: '0.04em',
        padding: '8px 14px',
        borderRadius: '6px 6px 0 0',
        textTransform: 'uppercase'
      }}>
        INFORMATION ABOUT INGREDIENTS USED IN THE PRODUCTS SUBMITTED FOR HALAL CERTIFICATION
      </div>

      <div style={{ border: '1px solid #cbd5e1', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px 18px', marginBottom: 24, background: '#fff' }}>
        
        {/* 8. Ingredient Information Table */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>8. Ingredient Information</span>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                Please provide a complete list of ingredients used in the product submitted for Halal certification.
              </div>
            </div>
            {!readOnly && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: 12, fontWeight: 700, borderColor: '#0284c7', color: '#0284c7' }}
                onClick={() => addTableRow('ingredients', { name: '', code: '', source: '', supplier: '', manufacturer: '', certificate_statement: '', halal_body_expiry: '' })}
              >
                <Plus size={13} /> Add Ingredient Row
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#334155' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 160 }}>Ingredient List</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 90 }}>Code</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 120 }}>Source<br/><span style={{ fontSize: 10, fontWeight: 400, color: '#64748b' }}>(Animal, plant, synthetic)</span></th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 120 }}>Supplier</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 120 }}>Manufacturer</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 140 }}>Halal Certification Body</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 120 }}>Halal Expiry Date</th>
                  {!readOnly && <th style={{ width: 36, padding: '8px 6px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {(form.ingredients || []).map((row, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.name || ''}
                        onChange={e => updateTable('ingredients', idx, 'name', e.target.value)}
                        placeholder="e.g. Milk Powder"
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.code || ''}
                        onChange={e => updateTable('ingredients', idx, 'code', e.target.value)}
                        placeholder="Code"
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.source || ''}
                        onChange={e => updateTable('ingredients', idx, 'source', e.target.value)}
                        placeholder="e.g. Bovine / Plant"
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.supplier || ''}
                        onChange={e => updateTable('ingredients', idx, 'supplier', e.target.value)}
                        placeholder="Supplier Ltd"
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.manufacturer || ''}
                        onChange={e => updateTable('ingredients', idx, 'manufacturer', e.target.value)}
                        placeholder="Manufacturer"
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.certificate_statement || ''}
                        onChange={e => updateTable('ingredients', idx, 'certificate_statement', e.target.value)}
                        placeholder="e.g. HFA / JAKIM"
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.halal_body_expiry || ''}
                        onChange={e => updateTable('ingredients', idx, 'halal_body_expiry', e.target.value)}
                        placeholder="e.g. DD/MM/YYYY"
                      />
                    </td>
                    {!readOnly && (
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626', padding: 2 }} onClick={() => removeTableRow('ingredients', idx)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 9. Processing Aids Table */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>9. Processing Aids (Enzymes, catalysts, microbial cultures)</span>
            </div>
            {!readOnly && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: 12, fontWeight: 700, borderColor: '#0284c7', color: '#0284c7' }}
                onClick={() => addTableRow('processing_aids', { name: '', function: '', source: '', supplier_manufacturer: '', halal_status: '' })}
              >
                <Plus size={13} /> Add Processing Aid Row
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#334155' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 160 }}>Processing Aid Name</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 120 }}>Function</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 120 }}>Source</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 160 }}>Supplier / Manufacturer</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, minWidth: 140 }}>Halal Status</th>
                  {!readOnly && <th style={{ width: 36, padding: '8px 6px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {(form.processing_aids || []).map((row, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.name || ''}
                        onChange={e => updateTable('processing_aids', idx, 'name', e.target.value)}
                        placeholder="e.g. Microbial Rennet"
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.function || ''}
                        onChange={e => updateTable('processing_aids', idx, 'function', e.target.value)}
                        placeholder="Coagulant"
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.source || ''}
                        onChange={e => updateTable('processing_aids', idx, 'source', e.target.value)}
                        placeholder="Microbial / Fungal"
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.supplier_manufacturer || ''}
                        onChange={e => updateTable('processing_aids', idx, 'supplier_manufacturer', e.target.value)}
                        placeholder="BioSupplies Ltd"
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        disabled={readOnly}
                        value={row.halal_status || ''}
                        onChange={e => updateTable('processing_aids', idx, 'halal_status', e.target.value)}
                        placeholder="Halal Certified"
                      />
                    </td>
                    {!readOnly && (
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626', padding: 2 }} onClick={() => removeTableRow('processing_aids', idx)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SECTION III: ANIMAL BASED PRODUCTS & ETHANOL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        
        {/* 10. Animal Based Products */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#164e63', color: '#fff', fontSize: 12, fontWeight: 800, padding: '8px 12px' }}>
            10. ANIMAL BASED PRODUCTS
          </div>
          <div style={{ padding: 14, background: '#fff' }}>
            <div style={{ fontSize: 12.5, color: '#1e293b', marginBottom: 10, fontWeight: 600 }}>
              10.1 Are any animal derivatives (Bovine, Ovine, Poultry, Insects, etc.) used as an ingredient during the manufacturing process?
            </div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
              {['Yes', 'No'].map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: readOnly ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="has_animal_derivatives"
                    value={opt}
                    checked={form.has_animal_derivatives === opt}
                    onChange={e => updateField('has_animal_derivatives', e.target.value)}
                    disabled={readOnly}
                  />
                  {opt}
                </label>
              ))}
            </div>

            {form.has_animal_derivatives === 'Yes' && (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  10.2 If YES, specify details below:
                </div>
                <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Constituent</th>
                      <th style={{ padding: '6px 8px' }}>Source</th>
                      <th style={{ padding: '6px 8px' }}>Halal Certificate / Statement</th>
                      {!readOnly && <th style={{ width: 30 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(form.animal_derivatives || []).map((row, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '4px 6px' }}>
                          <input type="text" className="form-control form-control-sm" disabled={readOnly} value={row.constituent || ''} onChange={e => updateTable('animal_derivatives', idx, 'constituent', e.target.value)} placeholder="Gelatin" />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input type="text" className="form-control form-control-sm" disabled={readOnly} value={row.source || ''} onChange={e => updateTable('animal_derivatives', idx, 'source', e.target.value)} placeholder="Bovine" />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input type="text" className="form-control form-control-sm" disabled={readOnly} value={row.certificate_statement || ''} onChange={e => updateTable('animal_derivatives', idx, 'certificate_statement', e.target.value)} placeholder="HFA Cert #882" />
                        </td>
                        {!readOnly && (
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                            <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626', padding: 1 }} onClick={() => removeTableRow('animal_derivatives', idx)}>
                              <Trash2 size={12} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!readOnly && (
                  <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 6, fontSize: 11 }} onClick={() => addTableRow('animal_derivatives', { constituent: '', source: '', certificate_statement: '' })}>
                    <Plus size={11} /> Add Row
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 11. Ethanol & Its Derivatives */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#164e63', color: '#fff', fontSize: 12, fontWeight: 800, padding: '8px 12px' }}>
            11. ETHANOL &amp; ITS DERIVATIVES
          </div>
          <div style={{ padding: 14, background: '#fff' }}>
            <div style={{ fontSize: 12.5, color: '#1e293b', marginBottom: 8, fontWeight: 600 }}>
              11.1 Are the ingredient(s) listed above free from ethanol and/or its derivatives (fusel oil, isoamyl alcohol, cognac, isobutyl alcohol, tartaric acid)?
            </div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
              {['Yes', 'No'].map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: readOnly ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="is_ethanol_free"
                    value={opt}
                    checked={form.is_ethanol_free === opt}
                    onChange={e => updateField('is_ethanol_free', e.target.value)}
                    disabled={readOnly}
                  />
                  {opt}
                </label>
              ))}
            </div>

            {form.is_ethanol_free === 'No' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                  If NO, please state the source (synthetic/chemically synthesised, beverage, etc.):
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  disabled={readOnly}
                  value={form.ethanol_source_details}
                  onChange={e => updateField('ethanol_source_details', e.target.value)}
                  placeholder="e.g. Synthetic flavour carrier"
                />
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                11.2 Ethanol percentage in final product (if applicable):
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                disabled={readOnly}
                value={form.ethanol_percentage}
                onChange={e => updateField('ethanol_percentage', e.target.value)}
                placeholder="e.g. 0.00% / <0.05%"
                style={{ width: 180, marginTop: 4 }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* SECTION IV: FOOD CONTACT PACKAGING */}
      <div style={{
        background: '#164e63',
        color: '#ffffff',
        fontSize: 12.5,
        fontWeight: 800,
        letterSpacing: '0.04em',
        padding: '8px 14px',
        borderRadius: '6px 6px 0 0',
        textTransform: 'uppercase'
      }}>
        12. FOOD CONTACT PACKAGING
      </div>

      <div style={{ border: '1px solid #cbd5e1', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px 18px', marginBottom: 24, background: '#fff' }}>
        
        {/* 12.1 Is artwork / labelling required? */}
        <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px', gap: 12, alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#334155' }}>12.1</span>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Is artwork / labelling required?</span>
              <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 8 }}>(If yes, please attach copy of artwork / labelling)</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Yes', 'No'].map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: readOnly ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="is_artwork_labelling_required"
                    value={opt}
                    checked={form.is_artwork_labelling_required === opt}
                    onChange={e => updateField('is_artwork_labelling_required', e.target.value)}
                    disabled={readOnly}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* YES: attach artwork document */}
          {form.is_artwork_labelling_required === 'Yes' && (
            <div style={{ marginTop: 10, marginLeft: 52, padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                Attach copy of artwork / labelling:
              </div>
              {form.artwork_labelling_document ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '8px 12px', borderRadius: 6, border: '1px solid #86efac' }}>
                  <a
                    href={typeof form.artwork_labelling_document === 'string' ? form.artwork_labelling_document : '#'}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                  >
                    <FileText size={14} /> {typeof form.artwork_labelling_document === 'string' ? form.artwork_labelling_document.split('/').pop() || 'Artwork_Document.pdf' : form.artwork_labelling_document?.name || 'Document attached'}
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => updateField('artwork_labelling_document', null)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '2px 8px', fontSize: 11, color: '#ef4444' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : readOnly ? (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>No document attached</div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
                    className="form-control form-control-sm"
                    style={{ fontSize: 12 }}
                    disabled={uploadingField === 'artwork_labelling_document'}
                    onChange={e => handleFileUpload('artwork_labelling_document', e.target.files?.[0])}
                  />
                  {uploadingField === 'artwork_labelling_document' && (
                    <div style={{ fontSize: 11, color: '#166534', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={12} className="spin" /> Uploading artwork file...
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>Accepted: PDF, JPG, PNG, DOCX</div>
                </div>
              )}

              {/* Artwork specifications / details notes */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                  Artwork / Labelling Notes (Optional):
                </div>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  disabled={readOnly}
                  placeholder="Provide artwork specifications or notes..."
                  value={form.artwork_labelling_details || ''}
                  onChange={e => updateField('artwork_labelling_details', e.target.value)}
                  style={{ fontSize: 12, resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {/* NO: provide details */}
          {form.is_artwork_labelling_required === 'No' && (
            <div style={{ marginTop: 10, marginLeft: 52, padding: '12px 16px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9a3412', marginBottom: 6 }}>
                Please provide details:
              </div>
              <textarea
                className="form-control form-control-sm"
                rows={3}
                disabled={readOnly}
                placeholder="Explain why artwork/labelling is not required or provide packaging details..."
                value={form.artwork_labelling_details || ''}
                onChange={e => updateField('artwork_labelling_details', e.target.value)}
                style={{ fontSize: 12, resize: 'vertical' }}
              />
            </div>
          )}
        </div>

        {/* 12.2 Is food contact packaging free from animal derivatives? */}
        <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px', gap: 12, alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#334155' }}>12.2</span>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Is the food contact packaging free from animal derivatives?</span>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                If YES: Attach animal-free statement or valid Halal cert. If NO: Provide details.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Yes', 'No'].map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: readOnly ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="is_packaging_animal_free"
                    value={opt}
                    checked={form.is_packaging_animal_free === opt}
                    onChange={e => updateField('is_packaging_animal_free', e.target.value)}
                    disabled={readOnly}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* YES: attach document */}
          {form.is_packaging_animal_free === 'Yes' && (
            <div style={{ marginTop: 10, marginLeft: 52, padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                Attach animal-free statement or valid Halal certificate:
              </div>
              {form.packaging_animal_free_document ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '8px 12px', borderRadius: 6, border: '1px solid #86efac' }}>
                  <a
                    href={typeof form.packaging_animal_free_document === 'string' ? form.packaging_animal_free_document : '#'}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                  >
                    <FileText size={14} /> {typeof form.packaging_animal_free_document === 'string' ? form.packaging_animal_free_document.split('/').pop() || 'Packaging_Cert.pdf' : form.packaging_animal_free_document?.name || 'Document attached'}
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => updateField('packaging_animal_free_document', null)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '2px 8px', fontSize: 11, color: '#ef4444' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : readOnly ? (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>No document attached</div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
                    className="form-control form-control-sm"
                    style={{ fontSize: 12 }}
                    disabled={uploadingField === 'packaging_animal_free_document'}
                    onChange={e => handleFileUpload('packaging_animal_free_document', e.target.files?.[0])}
                  />
                  {uploadingField === 'packaging_animal_free_document' && (
                    <div style={{ fontSize: 11, color: '#166534', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={12} className="spin" /> Uploading document...
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>Accepted: PDF, JPG, PNG, DOCX</div>
                </div>
              )}
            </div>
          )}

          {/* NO: provide details */}
          {form.is_packaging_animal_free === 'No' && (
            <div style={{ marginTop: 10, marginLeft: 52, padding: '12px 16px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9a3412', marginBottom: 6 }}>
                Please provide details:
              </div>
              <textarea
                className="form-control form-control-sm"
                rows={3}
                disabled={readOnly}
                placeholder="Describe the animal derivatives present in the packaging and any mitigating actions taken..."
                value={form.packaging_animal_free_details || ''}
                onChange={e => updateField('packaging_animal_free_details', e.target.value)}
                style={{ fontSize: 12, resize: 'vertical' }}
              />
            </div>
          )}
        </div>

        {/* 12.3 Food Contact Packaging Specification Details */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 12.5, color: '#0f172a' }}>12.3 Food Contact Packaging Specification Details:</span>
            {!readOnly && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: 11.5, borderColor: '#0284c7', color: '#0284c7' }}
                onClick={() => addTableRow('packaging_details', { packaging_material: '', chemical_composition: '', migration_certificate: '', suitability: '' })}
              >
                <Plus size={12} /> Add Packaging Row
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#334155' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 700 }}>Packaging Material</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700 }}>Nature &amp; Chemical Composition</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700 }}>Migration Certificate</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700 }}>Packaging Product Suitability</th>
                  {!readOnly && <th style={{ width: 36 }}></th>}
                </tr>
              </thead>
              <tbody>
                {(form.packaging_details || []).map((row, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '4px 6px' }}>
                      <input type="text" className="form-control form-control-sm" disabled={readOnly} value={row.packaging_material || ''} onChange={e => updateTable('packaging_details', idx, 'packaging_material', e.target.value)} placeholder="e.g. Food Grade HDPE" />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input type="text" className="form-control form-control-sm" disabled={readOnly} value={row.chemical_composition || ''} onChange={e => updateTable('packaging_details', idx, 'chemical_composition', e.target.value)} placeholder="Polyethylene 100%" />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input type="text" className="form-control form-control-sm" disabled={readOnly} value={row.migration_certificate || ''} onChange={e => updateTable('packaging_details', idx, 'migration_certificate', e.target.value)} placeholder="EU 10/2011 Compliant" />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input type="text" className="form-control form-control-sm" disabled={readOnly} value={row.suitability || ''} onChange={e => updateTable('packaging_details', idx, 'suitability', e.target.value)} placeholder="Direct Dairy Contact" />
                    </td>
                    {!readOnly && (
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626', padding: 2 }} onClick={() => removeTableRow('packaging_details', idx)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SECTION V: SIGNATURES & DECLARATION */}
      <div style={{
        background: '#f8fafc',
        border: '1.5px solid #cbd5e1',
        borderRadius: 8,
        padding: '18px 22px'
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginBottom: 14, letterSpacing: '0.04em' }}>
          AUTHORIZED SIGNATORY DECLARATION
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Signature / Digital Name
            </label>
            <input
              type="text"
              className="form-control"
              disabled={readOnly}
              value={form.signature_text || form.print_name}
              onChange={e => updateField('signature_text', e.target.value)}
              placeholder="Type full legal signature"
              style={{ fontFamily: 'cursive', fontSize: 16, fontWeight: 700, color: '#0369a1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Print Name
            </label>
            <input
              type="text"
              className="form-control"
              disabled={readOnly}
              value={form.print_name}
              onChange={e => updateField('print_name', e.target.value)}
              placeholder="e.g. John Doe"
              style={{ fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Designation
            </label>
            <input
              type="text"
              className="form-control"
              disabled={readOnly}
              value={form.designation}
              onChange={e => updateField('designation', e.target.value)}
              placeholder="e.g. Technical Director / QA Manager"
              style={{ fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Date
            </label>
            <input
              type="date"
              className="form-control"
              disabled={readOnly}
              value={form.sign_date?.split('T')[0] || ''}
              onChange={e => updateField('sign_date', e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
