import React from 'react';
import { X, MoreVertical } from 'lucide-react';

/**
 * Standardized Action Menu Trigger Button (Three Dots)
 */
export function ActionTriggerButton({ onClick, title = 'Actions', size = 18, className = '' }) {
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm action-trigger-btn ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        padding: 0,
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        color: '#475569',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f8fafc';
        e.currentTarget.style.borderColor = '#cbd5e1';
        e.currentTarget.style.color = '#0f172a';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.color = '#475569';
      }}
    >
      <MoreVertical size={size} />
    </button>
  );
}

function renderBadge(badge, badgeVariant) {
  if (!badge) return null;
  if (React.isValidElement(badge)) return badge;
  if (typeof badge === 'string' || typeof badge === 'number') {
    const vClass = badgeVariant 
      ? (badgeVariant.startsWith('badge-') ? badgeVariant : badgeVariant === 'success' ? 'badge-green' : badgeVariant === 'danger' ? 'badge-red' : badgeVariant === 'warning' ? 'badge-yellow' : badgeVariant === 'primary' ? 'badge-blue' : `badge-${badgeVariant}`)
      : 'badge-gray';
    return (
      <span className={`badge ${vClass}`}>
        {badge}
      </span>
    );
  }
  if (typeof badge === 'object') {
    const text = badge.text || badge.label || badge.name || badge.title || '';
    const rawVariant = badge.variant || badge.badgeVariant || badgeVariant || 'gray';
    let variantClass = 'badge-gray';
    if (rawVariant.startsWith('badge-')) {
      variantClass = rawVariant;
    } else if (rawVariant === 'success') {
      variantClass = 'badge-green';
    } else if (rawVariant === 'danger') {
      variantClass = 'badge-red';
    } else if (rawVariant === 'warning') {
      variantClass = 'badge-yellow';
    } else if (rawVariant === 'primary' || rawVariant === 'info') {
      variantClass = 'badge-blue';
    } else {
      variantClass = `badge-${rawVariant}`;
    }
    return (
      <span className={`badge ${variantClass}`}>
        {text}
      </span>
    );
  }
  return null;
}

/**
 * Unified Action Popup Modal for consistent 3-dot row management across the Admin Portal
 */
export default function ActionModal({
  isOpen,
  onClose,
  title = 'Select Action',
  subtitle = '',
  badge = null,
  badgeVariant = null,
  actions = [],
  children
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay action-modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 1300,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)'
      }}
    >
      <div
        className="modal action-modal-card"
        style={{
          maxWidth: 380,
          width: '92%',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 35px -8px rgba(0, 0, 0, 0.15), 0 8px 16px -4px rgba(0, 0, 0, 0.06)',
          animation: 'slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 2
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: '#0f172a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={subtitle}
            >
              {subtitle || 'Actions'}
            </div>
            {badge && (
              <div style={{ marginTop: 4 }}>
                {renderBadge(badge, badgeVariant)}
              </div>
            )}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: '#e2e8f0',
              color: '#475569',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Actions Body */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '65vh', overflowY: 'auto' }}>
          {actions.map((act, idx) => {
            if (!act) return null;

            const Icon = act.icon;
            const isDanger = act.variant === 'danger';
            const isPrimary = act.variant === 'primary';
            const isSuccess = act.variant === 'success';

            let defaultColor = '#334155';
            let hoverBg = '#f1f5f9';
            let iconColor = '#64748b';

            if (isDanger) {
              defaultColor = '#dc2626';
              hoverBg = '#fef2f2';
              iconColor = '#ef4444';
            } else if (isPrimary) {
              defaultColor = '#00853b';
              hoverBg = '#f0fdf4';
              iconColor = '#00853b';
            } else if (isSuccess) {
              defaultColor = '#0284c7';
              hoverBg = '#f0f9ff';
              iconColor = '#0284c7';
            }

            if (act.href) {
              return (
                <a
                  key={idx}
                  href={act.href}
                  target={act.target || '_self'}
                  rel={act.rel || (act.target === '_blank' ? 'noreferrer' : undefined)}
                  download={act.download}
                  className="dropdown-item action-modal-item"
                  onClick={(e) => {
                    if (act.onClick) act.onClick(e);
                    if (!act.download && !act.target) onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 14px',
                    borderRadius: 10,
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: defaultColor,
                    textDecoration: 'none',
                    border: '1px solid transparent',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                    background: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = hoverBg;
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  {Icon && <Icon size={17} style={{ color: iconColor, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>{act.label}</div>
                    {act.description && (
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginTop: 1 }}>
                        {act.description}
                      </div>
                    )}
                  </div>
                </a>
              );
            }

            return (
              <button
                key={idx}
                type="button"
                className="dropdown-item action-modal-item"
                disabled={act.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  if (act.onClick) act.onClick(e);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: defaultColor,
                  border: '1px solid transparent',
                  transition: 'all 0.15s ease',
                  cursor: act.disabled ? 'not-allowed' : 'pointer',
                  background: 'transparent',
                  width: '100%',
                  textAlign: 'left',
                  opacity: act.disabled ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!act.disabled) {
                    e.currentTarget.style.background = hoverBg;
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                {Icon && <Icon size={17} style={{ color: iconColor, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>{act.label}</div>
                  {act.description && (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginTop: 1 }}>
                      {act.description}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
          {children}
        </div>
      </div>
    </div>
  );
}
