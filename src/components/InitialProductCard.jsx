import React from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle, Clock, ChevronRight, AlertCircle, User, ArrowRight } from 'lucide-react';

const STATUS_CONFIG = {
  submitted: { label: 'Submitted by Client', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  ft_assigned: { label: 'FT Assigned', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  product_approval_form_enabled: { label: 'Form Enabled', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  information_requested: { label: 'More Info Requested', bg: '#fff7ed', color: '#c2410c', border: '#ffedd5' },
  all_forms_received: { label: 'Product Form Received', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  logsheet_created: { label: 'Committee Logsheet Active', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  waiting_sharia_signature: { label: 'Waiting Shari\'a Sign-off', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  initial_product_approved: { label: 'Initial Product Approved ✓', bg: '#f0fdf4', color: '#166534', border: '#86efac' },
  rejected: { label: 'Rejected', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
};

export default function InitialProductCard({ app, initialProduct, isFastTrack }) {
  if (isFastTrack) return null;

  const appType = (app?.application_type || 'new').toLowerCase();
  if (appType === 'renewal' || appType === 'surveillance') return null;

  const hasItem = Boolean(initialProduct && (initialProduct._id || initialProduct.id));
  const ipId = initialProduct?._id || initialProduct?.id;
  const statusKey = initialProduct?.status || 'submitted';
  const cfg = STATUS_CONFIG[statusKey] || {
    label: (initialProduct?.status || 'In Progress').replace(/_/g, ' '),
    bg: '#f8fafc',
    color: '#475569',
    border: '#cbd5e1'
  };

  const isApproved = statusKey === 'initial_product_approved';
  const ftName = initialProduct?.assigned_food_tech?.full_name || initialProduct?.assigned_ft_custom?.name || null;

  return (
    <div style={{
      background: 'white',
      borderRadius: 20,
      border: isApproved ? '1.5px solid #86efac' : (hasItem ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0'),
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)',
      overflow: 'hidden'
    }}>
      {/* Card Header */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid #f1f5f9',
        background: isApproved ? 'linear-gradient(to right, #f0fdf4, #ffffff)' : 'linear-gradient(to right, #f8fafc, #ffffff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: isApproved ? '#dcfce7' : '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isApproved ? '#16a34a' : '#2563eb'
          }}>
            <Package size={19} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              Initial Product Evaluation
              <span style={{
                fontSize: 10.5,
                background: '#f1f5f9',
                color: '#475569',
                padding: '1px 7px',
                borderRadius: 4,
                fontWeight: 700
              }}>
                1 Primary Product
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
              {hasItem
                ? `Evaluation for: ${initialProduct.product?.name || 'Registered Product'}`
                : 'Primary product registration required for facility audit setup'}
            </div>
          </div>
        </div>

        {hasItem && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 11.5,
              fontWeight: 800,
              background: cfg.bg,
              color: cfg.color,
              border: `1px solid ${cfg.border}`,
              padding: '4px 12px',
              borderRadius: 20,
              textTransform: 'capitalize'
            }}>
              {cfg.label}
            </span>
            <Link
              to={`/admin/initial-products/${ipId}`}
              className="btn btn-outline btn-sm"
              style={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              Process Product <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: '20px 24px' }}>
        {hasItem ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Product Name
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  {initialProduct.product?.name || '—'}
                </div>
                {initialProduct.product?.code && (
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    SKU: <code>{initialProduct.product.code}</code>
                  </div>
                )}
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Assigned Food Technologist
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: ftName ? '#0f172a' : '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={14} style={{ color: ftName ? '#2563eb' : '#d97706' }} />
                  {ftName || 'Pending Assignment'}
                </div>
                {initialProduct.assigned_food_tech?.email && (
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    {initialProduct.assigned_food_tech.email}
                  </div>
                )}
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Submitted At
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                  {initialProduct.createdAt ? new Date(initialProduct.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Contact: {initialProduct.contact_name || 'Client Lead'}
                </div>
              </div>
            </div>

            {/* Status Summary Banner */}
            {isApproved ? (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12.5, color: '#166534', fontWeight: 600 }}>
                  <strong>Initial Product Approved by Committee.</strong> Facility audit scheduling and auditor assignment are unlocked and ready to proceed.
                </div>
              </div>
            ) : (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <Clock size={18} color="#2563eb" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12.5, color: '#1e40af', fontWeight: 600 }}>
                  <strong>Initial Product in Process ({cfg.label}).</strong> Technical evaluation and committee approval are currently in progress.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: '24px 20px',
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px dashed #cbd5e1',
            textAlign: 'center'
          }}>
            <Package size={28} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#475569' }}>
              No Initial Product Submitted Yet
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, maxWidth: 450, margin: '4px auto 0' }}>
              Once the initial fee is confirmed, the client can submit their 1 primary Initial Product from the client portal to begin technical evaluation.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
