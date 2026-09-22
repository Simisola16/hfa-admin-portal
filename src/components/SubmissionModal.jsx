import React from 'react';
import {
  ClipboardList, X, Building2, User, FileText,
  Shield, CheckCircle, Download
} from 'lucide-react';
import { getPdfUrl } from '../lib/pdfUtils';

export default function SubmissionModal({ isOpen, onClose, app }) {
  if (!isOpen || !app) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1150 }} onClick={onClose}>
      <div
        className="modal"
        style={{
          maxWidth: 920,
          width: '92%',
          maxHeight: '88vh',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', sans-serif"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <ClipboardList size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#0f172a' }}>
                Application Submission Details — {app.profiles?.company_name || app.establishment_name || app.company_name || 'Company Facility'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                Original form responses submitted by client on {new Date(app.created_at).toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'grid', gap: 20 }}>
          {/* Section 1: Establishment & Manufacturing */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={15} style={{ color: '#2563eb' }} />
              1. Establishment & Facility Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Establishment Name</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.establishment_name || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Application Type & Category</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.application_type} &middot; {app.category}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Establishment Address</div>
                <div style={{ fontSize: 13, color: '#334155', marginTop: 2, fontWeight: 400 }}>{app.establishment_address || '—'}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Managing Director</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.managing_director || '—'}</div>
              </div>
              {app.manufacturer_name && (
                <div style={{ gridColumn: 'span 2', marginTop: 4, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Manufacturer Name & Address</div>
                  <div style={{ fontSize: 13, color: '#0f172a', marginTop: 2, fontWeight: 400 }}><strong style={{ fontWeight: 500 }}>{app.manufacturer_name}</strong> &middot; {app.manufacturer_address}</div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Key Personnel Contacts */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={15} style={{ color: '#2563eb' }} />
              2. Key Personnel & Representatives
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Halal Coordinator</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.halal_coordinator || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>QA / Technical Contact</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.qa_contact || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Finance Contact</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.finance_contact || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Production Contact</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.production_contact || '—'}</div>
              </div>
            </div>
          </div>

          {/* Section 3: Operations & Products */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={15} style={{ color: '#2563eb' }} />
              3. Operations & Product List
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: app.production_schedule ? '1fr 1fr' : '1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Total Employees</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 2 }}>{app.employee_count || '—'}</div>
                </div>
                {app.production_schedule && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Production Schedule</div>
                    <div style={{ fontSize: 13, color: '#0f172a', marginTop: 2, fontWeight: 400 }}>{app.production_schedule}</div>
                  </div>
                )}
              </div>

              {/* Submitted Products Table */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>Submitted Products List ({app.products?.length || 0})</div>
                {!app.products || app.products.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>No products listed</div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '6px 10px', fontWeight: 500 }}>Product Name</th>
                          <th style={{ padding: '6px 10px', fontWeight: 500 }}>Brand</th>
                          <th style={{ padding: '6px 10px', fontWeight: 500 }}>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {app.products.map((p, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 500 }}>{p.name}</td>
                            <td style={{ padding: '6px 10px', color: '#64748b', fontWeight: 400 }}>{p.brand || '—'}</td>
                            <td style={{ padding: '6px 10px', color: '#64748b', fontWeight: 400 }}>{p.category || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Halal Declarations */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={15} style={{ color: '#2563eb' }} />
              4. Halal Compliance & Ingredient Declarations
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: app.has_porcine ? '#fef2f2' : '#f0fdf4', border: `1px solid ${app.has_porcine ? '#fecaca' : '#dcfce7'}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: app.has_porcine ? '#991b1b' : '#166534' }}>Porcine Materials Handled</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: app.has_porcine ? '#dc2626' : '#15803d', marginTop: 2 }}>
                  {app.has_porcine ? 'YES — Porcine declared' : 'NO — Free of porcine'}
                </div>
                {app.porcine_details && <div style={{ fontSize: 11, color: '#991b1b', marginTop: 4, fontWeight: 400 }}>Details: {app.porcine_details}</div>}
              </div>

              <div style={{ background: app.has_intoxicants ? '#fffbeb' : '#f0fdf4', border: `1px solid ${app.has_intoxicants ? '#fde68a' : '#dcfce7'}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: app.has_intoxicants ? '#92400e' : '#166534' }}>Intoxicants / Alcohol Handled</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: app.has_intoxicants ? '#d97706' : '#15803d', marginTop: 2 }}>
                  {app.has_intoxicants ? 'YES — Intoxicants declared' : 'NO — Free of intoxicants'}
                </div>
                {app.intoxicants_details && <div style={{ fontSize: 11, color: '#92400e', marginTop: 4, fontWeight: 400 }}>Details: {app.intoxicants_details}</div>}
              </div>

              <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: 10, borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} style={{ color: app.declared_true ? '#15803d' : '#94a3b8' }} />
                <span style={{ fontWeight: 500, color: '#0f172a' }}>
                  Legal Declaration: {app.declared_true ? 'Signed & Confirmed True by Applicant' : 'Pending Signature'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Uploaded Documents & Attachments */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={15} style={{ color: '#2563eb' }} />
              5. Uploaded Documents & Attachments
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {[
                { key: 'halal_policy', label: 'Halal Policy Document' },
                { key: 'ingredient_list', label: 'Raw Material / Ingredient List' },
                { key: 'floor_plan', label: 'Plant / Facility Floor Plan' },
                { key: 'haccp_plan', label: 'HACCP Plan & Process Flow' },
              ].map(doc => {
                const url = app.documents?.[doc.key];
                return (
                  <div key={doc.key} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>{doc.label}</div>
                    {url ? (
                      <a
                        href={getPdfUrl(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: '#2563eb',
                          borderColor: '#bfdbfe',
                          background: '#eff6ff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          width: 'fit-content',
                          textDecoration: 'none',
                          borderRadius: 6
                        }}
                      >
                        <FileText size={14} /> View Document
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Not provided</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Supporting Docs Array */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                Additional Supporting Attachments {Array.isArray(app.documents?.supporting_docs) && app.documents.supporting_docs.length > 0 ? `(${app.documents.supporting_docs.length})` : ''}
              </div>
              {Array.isArray(app.documents?.supporting_docs) && app.documents.supporting_docs.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {app.documents.supporting_docs.map((docUrl, idx) => (
                    <a
                      key={idx}
                      href={getPdfUrl(docUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#334155',
                        borderColor: '#cbd5e1',
                        background: '#white',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        textDecoration: 'none',
                        borderRadius: 6
                      }}
                    >
                      <Download size={13} /> Supporting Doc #{idx + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>
                  No supporting documents provided
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right', flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
