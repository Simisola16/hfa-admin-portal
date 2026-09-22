import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

// Dedicated HFA Subsystems
import HFANewProcessing from './hfa/HFANewProcessing';
import HFARenewalProcessing from './hfa/HFARenewalProcessing';

// Dedicated GSO Subsystems
import GSONewProcessing from './gso/GSONewProcessing';
import GSORenewalProcessing from './gso/GSORenewalProcessing';
import GSOSurveillanceProcessing from './gso/GSOSurveillanceProcessing';

/**
 * ApplicationProcessing
 * Master Route Delegator for /applications/:appId/processing
 * Detects application category, scheme, and type, delegating rendering to:
 * - GSOSurveillanceProcessing for GSO / UAE Surveillance applications
 * - GSORenewalProcessing for GSO / UAE Renewal applications
 * - GSONewProcessing for GSO / UAE Initial / New applications
 * - HFARenewalProcessing for Standard HFA Renewal Fast-Track applications
 * - HFANewProcessing for Standard HFA New Initial Certification applications
 */
export default function ApplicationProcessing() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadApplicationMeta() {
      try {
        setLoading(true);
        const res = await api.get(`/api/applications/${appId}`);
        if (isMounted) {
          setApp(res.data?.data || res.data || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load application');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadApplicationMeta();
    return () => { isMounted = false; };
  }, [appId]);

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: 80 }}>
          <AlertTriangle size={40} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 700, fontSize: 18 }}>Application Not Found</div>
          <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/applications')}>
            <ArrowLeft size={16} /> Back to Applications
          </button>
        </div>
      </div>
    );
  }

  const isRenewal = (
    String(app.application_type || '').toLowerCase().includes('renewal') ||
    String(app.type || '').toLowerCase().includes('renewal') ||
    Boolean(app.is_renewal) ||
    Boolean(app.renewed_certificate_id) ||
    String(app.application_number || '').includes('-RE-') ||
    String(app.category || '').toLowerCase().includes('renewal')
  );

  const isSurveillance = (
    String(app.application_type || '').toLowerCase().includes('surveillance') ||
    String(app.type || '').toLowerCase().includes('surveillance') ||
    Boolean(app.is_surveillance) ||
    String(app.application_number || '').includes('-SU-') ||
    String(app.category || '').toLowerCase().includes('surveillance')
  );

  const catLower = String(app.category || '').toLowerCase();
  const typeLower = String(app.application_type || '').toLowerCase();
  const schemeLower = String(app.scheme || '').toLowerCase();
  const isGSO = catLower.includes('gso') || catLower.includes('uae') || catLower.includes('dual') || typeLower.includes('gso') || schemeLower.includes('gso') || isSurveillance;

  // 1. GSO & Surveillance Subsystems
  if (isGSO || isSurveillance) {
    const initialData = { app };
    if (isSurveillance) {
      return <GSOSurveillanceProcessing appId={appId} initialData={initialData} />;
    }
    if (isRenewal) {
      return <GSORenewalProcessing appId={appId} initialData={initialData} />;
    }
    return <GSONewProcessing appId={appId} initialData={initialData} />;
  }

  // 2. Standard HFA Renewal Fast-Track
  if (isRenewal) {
    return <HFARenewalProcessing appId={appId} app={app} />;
  }

  // 3. Standard HFA New Initial Certification
  return <HFANewProcessing appId={appId} app={app} />;
}
