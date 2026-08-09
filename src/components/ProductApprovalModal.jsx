import React from 'react';
import { X, Printer, FileText } from 'lucide-react';
import ProductApprovalRequestForm from './ProductApprovalRequestForm';

export default function ProductApprovalModal({ isOpen, onClose, formData, product, company }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={onClose}>
      <div
        className="modal"
        style={{
          maxWidth: 1080,
          width: '95%',
          maxHeight: '90vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Product Approval Request Form — {product?.name || formData?.product_name || 'Product Specification'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Official client-submitted Halal Certification Product Specification &amp; Ingredients Declaration
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <Printer size={14} /> Print Document
            </button>
            <button className="modal-close" onClick={onClose} style={{ padding: 6 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f1f5f9' }}>
          <ProductApprovalRequestForm
            formData={formData}
            product={product}
            company={company}
            readOnly={true}
          />
        </div>
      </div>
    </div>
  );
}
