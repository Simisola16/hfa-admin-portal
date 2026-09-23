import { getPdfUrl } from '../lib/pdfUtils';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { ClipboardList, Search, Eye, CheckCircle, XCircle, RefreshCw, FileText, Download, MessageSquare, Settings } from 'lucide-react';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';


export default function AdminProposals() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeActionModal, setActiveActionModal] = useState(null);

  const fetchProposals = () => {
    setLoading(true);
    api.get('/api/proposals')
      .then(d => setProposals(d.data || []))
      .catch(() => toast.error('Failed to load proposals'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  useEffect(() => {
    const appId = searchParams.get('appId');
    if (appId && proposals.length > 0) {
      const target = proposals.find(p => p.application_id?._id === appId);
      if (target) {
        setSelected(target);
      }
    }
  }, [proposals, searchParams]);

  const filtered = proposals.filter(p => 
    !search || 
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.application_id?.profiles?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.application_id?.application_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input 
            placeholder="Search proposals by title, company or application ref..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchProposals}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Sent Proposals</div>
          <div className="card-subtitle">Manage and track certification proposals sent to clients</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div className="empty-state-title">No Proposals Found</div>
              <div className="empty-state-text">Proposals you send to clients from the Applications module will appear here</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Proposal Title</th>
                  <th>Company / Facility</th>
                  <th>Standard / Scheme</th>
                  <th>Est. Cost</th>
                  <th>Status</th>
                  <th>Date Sent</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const compName = p.application_id?.profiles?.company_name || p.application_id?.establishment_name || p.company_name || '—';
                  const appId = p.application_id?._id || p.application_id;
                  const isAccepted = p.status === 'accepted';
                  const isRejected = p.status === 'rejected';
                  const badgeVariant = isAccepted ? 'badge-green' : isRejected ? 'badge-red' : 'badge-yellow';

                  return (
                    <tr key={p.id || p._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.title}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{compName}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{p.application_id?.profiles?.full_name || p.application_id?.managing_director || '—'}</div>
                      </td>
                      <td style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{p.application_id?.category || 'Halal Certification'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>£{Number(p.estimated_cost || p.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span className={`badge ${badgeVariant}`}>
                          {p.status || 'pending'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {p.createdAt || p.created_at ? new Date(p.createdAt || p.created_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <ActionTriggerButton
                          onClick={() => setActiveActionModal({
                            title: p.title,
                            subtitle: `${compName} • £${Number(p.estimated_cost || p.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
                            badge: (p.status || 'pending').toUpperCase(),
                            badgeVariant: badgeVariant,
                            actions: [
                              {
                                label: 'View Proposal Details',
                                icon: Eye,
                                variant: 'primary',
                                onClick: () => setSelected(p)
                              },
                              ...(appId && typeof appId === 'string' ? [{
                                label: 'Application Processing',
                                icon: Settings,
                                variant: 'default',
                                onClick: () => navigate(`/applications/${appId}/processing`)
                              }] : []),
                              ...(p.proposal_url ? [{
                                label: 'Download Proposal PDF',
                                icon: Download,
                                href: getPdfUrl(p.proposal_url),
                                target: '_blank',
                                variant: 'default'
                              }] : [])
                            ]
                          })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Proposal Details</span>
              <button className="modal-close" onClick={() => setSelected(null)}><XCircle size={16}/></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selected.title}</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Status: <span className="capitalize">{selected.status}</span></div>
                  {selected.estimated_cost && <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', background: '#f0fdf4', padding: '2px 8px', borderRadius: 4 }}>Cost: £{selected.estimated_cost}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div>
                  <label className="form-label">Client</label>
                  <div style={{ fontWeight: 600 }}>{selected.application_id?.profiles?.company_name}</div>
                </div>
                <div>
                  <label className="form-label">Application</label>
                  <div style={{ fontWeight: 600 }}>{selected.application_id?.application_number}</div>
                </div>
              </div>

              {selected.proposal_url && (
                <div style={{ marginBottom: 24 }}>
                  <label className="form-label">Proposal Document</label>
                  <a 
                    href={getPdfUrl(selected.proposal_url)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ gap: 8, marginTop: 4 }}
                  >
                    <Download size={14} /> Download PDF
                  </a>
                </div>
              )}
              
              {selected.details && (
                <div style={{ marginBottom: 24 }}>
                  <label className="form-label">Proposal Details</label>
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', fontSize: 14, color: '#334155', lineHeight: '1.6' }}>
                    {selected.details}
                  </div>
                </div>
              )}

              {selected.admin_comment && (
                <div className="form-group">
                  <label className="form-label">Admin Comments (Sent to client)</label>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 14, border: '1px solid #e2e8f0' }}>
                    {selected.admin_comment}
                  </div>
                </div>
              )}

              {selected.status === 'rejected' && selected.client_comment && (
                <div className="form-group">
                  <label className="form-label" style={{ color: '#dc2626' }}>Client Rejection Reason</label>
                  <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, fontSize: 14, border: '1px solid #fecaca', color: '#991b1b' }}>
                    {selected.client_comment}
                  </div>
                </div>
              )}
              
              {selected.status === 'accepted' && (
                <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 12, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircle size={20} style={{ color: '#16a34a' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#166534', fontSize: 14 }}>Proposal Accepted</div>
                    <div style={{ fontSize: 12, color: '#15803d' }}>The client has accepted this proposal. You can proceed with invoicing.</div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal Popup */}
      <ActionModal
        isOpen={Boolean(activeActionModal)}
        onClose={() => setActiveActionModal(null)}
        title={activeActionModal?.title}
        subtitle={activeActionModal?.subtitle}
        badge={activeActionModal?.badge}
        badgeVariant={activeActionModal?.badgeVariant}
        actions={activeActionModal?.actions || []}
      />
    </div>
  );
}

