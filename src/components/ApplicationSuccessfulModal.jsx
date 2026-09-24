import React, { useState, useEffect } from 'react';
import { X, CheckCircle, CheckCircle2, AlertCircle, Sparkles, Layers } from 'lucide-react';
import { resolveCertificateType } from './CertificateModal';

export const CERTIFICATE_OPTIONS = [
  { value: 'HFA SCHEME MEAT', label: 'HFA SCHEME MEAT', desc: 'Halal Food Authority - Meat & Poultry Processing' },
  { value: 'HFA SCHEME NON MEAT', label: 'HFA SCHEME NON MEAT', desc: 'Halal Food Authority - Food & General Manufacturing' },
  { value: 'GSO MEAT', label: 'GSO MEAT', desc: 'UAE / GCC GSO 2055-1 Scheme - Meat Processing' },
  { value: 'GSO NON MEAT', label: 'GSO NON MEAT', desc: 'UAE / GCC GSO 2055-1 Scheme - Non-Meat Food & Dairy' },
  { value: 'COSMETICS', label: 'COSMETICS', desc: 'Halal Cosmetics & Personal Care Scheme' },
  { value: 'SMIIC', label: 'SMIIC', desc: 'OIC / SMIIC International Halal Standard Scheme' },
];

export default function ApplicationSuccessfulModal({
  isOpen,
  onClose,
  app,
  logsheet,
  onConfirm,
  submitting = false,
}) {
  const [selectedType, setSelectedType] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const detected = resolveCertificateType(app, null, null) || '';
      const initial =
        app?.suggested_certificate_type ||
        logsheet?.suggested_certificate_type ||
        app?.certificate_type ||
        logsheet?.certificate_standard ||
        logsheet?.certificate_type ||
        detected ||
        '';

      const normalizedInitial = String(initial).toUpperCase().replace(/SCHEME/g, '').replace(/[()]/g, '').trim();

      // Find match among standard options
      const matched = CERTIFICATE_OPTIONS.find((opt) => {
        const normalizedOpt = opt.value.toUpperCase().replace(/SCHEME/g, '').replace(/[()]/g, '').trim();
        return (
          normalizedOpt === normalizedInitial ||
          normalizedInitial.includes(normalizedOpt) ||
          normalizedOpt.includes(normalizedInitial)
        );
      });

      if (matched) {
        setSelectedType(matched.value);
      } else if (initial && CERTIFICATE_OPTIONS.some(o => o.value === initial)) {
        setSelectedType(initial);
      } else {
        setSelectedType('');
      }
      setErrorMsg('');
    }
  }, [isOpen, app, logsheet]);

  if (!isOpen) return null;

  const handleSelect = (type) => {
    setSelectedType(type);
    setErrorMsg('');
  };

  const handleConfirm = () => {
    if (!selectedType || !selectedType.trim()) {
      setErrorMsg('Please select a certificate type to proceed. This recommendation is required before marking the application successful.');
      return;
    }
    if (onConfirm) {
      onConfirm(selectedType);
    }
  };

  const appNumber = app?.application_number || 'N/A';
  const companyName =
    app?.establishment_name ||
    app?.manufacturer_name ||
    app?.profiles?.company_name ||
    app?.profiles?.name ||
    logsheet?.company_name ||
    'Applicant Company';

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          background: '#ffffff',
          borderRadius: 18,
          width: '100%',
          maxWidth: 560,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.22)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'fadeIn 0.18s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            background: 'linear-gradient(135deg, #0e7490 0%, #0d9488 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle size={22} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                Mark Application Successful
              </h3>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                {appNumber} • {companyName}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Informative Note */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 12.5,
              color: '#166534',
              lineHeight: 1.5,
            }}
          >
            <Sparkles size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
            <div>
              <span style={{ fontWeight: 800 }}>Certificate Type Suggestion: </span>
              Select the appropriate certificate scheme for this application. This is required and will serve as a verified recommendation for the officer who will issue the official certificate.
            </div>
          </div>

          {/* Required Select & Option dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="certificate-type-select"
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={15} style={{ color: '#0e7490' }} />
                Suggested Certificate Type <span style={{ color: '#dc2626' }}>* (Required)</span>
              </span>
              {selectedType && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
                  ✓ Scheme Selected
                </span>
              )}
            </label>
            <select
              id="certificate-type-select"
              value={selectedType}
              onChange={(e) => handleSelect(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: errorMsg ? '2px solid #ef4444' : (selectedType ? '2px solid #0e7490' : '1.5px solid #cbd5e1'),
                fontSize: 13.5,
                fontWeight: 700,
                color: selectedType ? '#0f172a' : '#64748b',
                background: selectedType ? '#f0fdfa' : '#ffffff',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: selectedType ? '0 0 0 3px rgba(14, 116, 144, 0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <option value="" disabled>
                -- Select Certificate Type (Required) --
              </option>
              {CERTIFICATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Option Selection Cards */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
              Or click to choose scheme:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CERTIFICATE_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.value;

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      border: isSelected ? '2px solid #0e7490' : '1.5px solid #e2e8f0',
                      background: isSelected ? '#f0fdfa' : '#ffffff',
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: isSelected
                        ? '0 3px 10px rgba(14, 116, 144, 0.12)'
                        : '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: isSelected ? '#0f172a' : '#334155',
                        }}
                      >
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                        {opt.desc.split(' - ')[1] || opt.desc}
                      </div>
                    </div>

                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: isSelected ? '2px solid #0e7490' : '2px solid #cbd5e1',
                        background: isSelected ? '#0e7490' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginLeft: 6,
                      }}
                    >
                      {isSelected && <CheckCircle2 size={13} style={{ color: '#ffffff' }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Validation Error Banner */}
          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#b91c1c',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 22px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 8,
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selectedType || submitting}
            style={{
              padding: '9px 22px',
              fontWeight: 800,
              fontSize: 13,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: !selectedType
                ? '#94a3b8'
                : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              borderColor: !selectedType ? '#94a3b8' : '#15803d',
              color: '#ffffff',
              boxShadow: !selectedType ? 'none' : '0 3px 8px rgba(22, 163, 74, 0.25)',
              cursor: !selectedType || submitting ? 'not-allowed' : 'pointer',
              opacity: !selectedType || submitting ? 0.65 : 1,
            }}
          >
            {submitting ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14, borderTopColor: '#ffffff' }} />
                <span>Confirming...</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Confirm Application Successful</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
