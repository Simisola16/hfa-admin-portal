import React, { useState, useEffect } from 'react';
import { X, CheckCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { resolveCertificateType } from './CertificateModal';

const CERTIFICATE_OPTIONS = [
  'HFA Meat',
  'HFA Non Meat',
  'GSO Meat',
  'GSO Non Meat',
  'Cosmetic',
  'Smiic',
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
      const initial = app?.certificate_type || logsheet?.certificate_standard || logsheet?.certificate_type || detected || '';
      const normalizedInitial = String(initial).toUpperCase().replace(/SCHEME/g, '').replace(/[()]/g, '').trim();

      // Find match
      const matched = CERTIFICATE_OPTIONS.find((opt) => {
        const normalizedOpt = opt.toUpperCase();
        return (
          normalizedOpt === normalizedInitial ||
          normalizedInitial.includes(normalizedOpt) ||
          normalizedOpt.includes(normalizedInitial)
        );
      });

      if (matched) {
        setSelectedType(matched);
      } else if (initial && CERTIFICATE_OPTIONS.includes(initial)) {
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
    if (!selectedType) {
      setErrorMsg('Please select a certificate type to proceed.');
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
          maxWidth: 520,
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
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={22} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                Application Successful
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
              width: 30,
              height: 30,
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
            gap: 14,
          }}
        >
          {/* Certificate Options List */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {CERTIFICATE_OPTIONS.map((opt) => {
              const isSelected = selectedType === opt;

              return (
                <div
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  style={{
                    border: isSelected ? '2px solid #0e7490' : '1.5px solid #e2e8f0',
                    background: isSelected ? '#f0fdfa' : '#ffffff',
                    borderRadius: 12,
                    padding: '14px 16px',
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
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: isSelected ? '#0f172a' : '#334155',
                    }}
                  >
                    {opt}
                  </span>

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
                    }}
                  >
                    {isSelected && <CheckCircle2 size={13} style={{ color: '#ffffff' }} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Validation Error */}
          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#b91c1c',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
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
              padding: '8px 20px',
              fontWeight: 800,
              fontSize: 13,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
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
                <CheckCircle size={15} />
                <span>Confirm Application Successful</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
