import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  Search, MessageSquare, Send, X, Clock, AlertCircle, CheckCircle2, 
  HelpCircle, RefreshCw, User, Building2, Phone, Mail, Filter, 
  Check, CheckCheck, Shield, ChevronDown
} from 'lucide-react';

export default function AdminTickets() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');

  const responsesEndRef = useRef(null);
  const socketRef = useRef(null);

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/api/tickets');
      const data = res.data || [];
      setTickets(data);

      if (selectedTicket) {
        const found = data.find(t => t._id === selectedTicket._id || t.id === selectedTicket.id);
        if (found) setSelectedTicket(found);
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load tickets');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Socket.io Real-Time Synchronization
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    if (socket) {
      const handleTicketCreated = (newTkt) => {
        const clientName = newTkt.user?.company_name || newTkt.user?.full_name || 'Client';
        toast.success(`New Ticket: ${newTkt.ticket_number} from ${clientName}`, {
          icon: '🎫',
          duration: 5000
        });

        setTickets(prev => [newTkt, ...prev.filter(t => t._id !== newTkt._id)]);
      };

      const handleTicketReply = ({ ticketId, ticket: updatedTicket, reply }) => {
        toast.success(`Reply on ${updatedTicket.ticket_number}`, {
          icon: '💬',
          duration: 4000
        });

        setTickets(prev => prev.map(t => (t._id === ticketId || t.id === ticketId) ? updatedTicket : t));
        
        if (selectedTicket && (selectedTicket._id === ticketId || selectedTicket.id === ticketId)) {
          setSelectedTicket(updatedTicket);
          setTimeout(() => {
            responsesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      };

      const handleTicketUpdated = (updatedTicket) => {
        setTickets(prev => prev.map(t => (t._id === updatedTicket._id || t.id === updatedTicket._id) ? updatedTicket : t));
        if (selectedTicket && (selectedTicket._id === updatedTicket._id || selectedTicket.id === updatedTicket._id)) {
          setSelectedTicket(updatedTicket);
        }
      };

      socket.on('ticket_created', handleTicketCreated);
      socket.on('ticket_reply', handleTicketReply);
      socket.on('ticket_updated', handleTicketUpdated);

      return () => {
        socket.off('ticket_created', handleTicketCreated);
        socket.off('ticket_reply', handleTicketReply);
        socket.off('ticket_updated', handleTicketUpdated);
      };
    }
  }, [selectedTicket]);

  const handleReply = async (e, markResolved = false) => {
    e?.preventDefault();
    if (!reply.trim() || submittingReply || !selectedTicket) return;

    setSubmittingReply(true);
    try {
      const payload = {
        message: reply.trim(),
        status: markResolved ? 'resolved' : undefined
      };

      const res = await api.post(`/api/tickets/${selectedTicket._id || selectedTicket.id}/reply`, payload);
      setReply('');
      setSelectedTicket(res.data);
      setTickets(prev => prev.map(t => (t._id === res.data._id || t.id === res.data._id) ? res.data : t));
      toast.success(markResolved ? 'Reply sent & ticket marked resolved' : 'Reply sent');
      setTimeout(() => {
        responsesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      const res = await api.patch(`/api/tickets/${selectedTicket._id || selectedTicket.id}/status`, { status: newStatus });
      setSelectedTicket(res.data);
      setTickets(prev => prev.map(t => (t._id === res.data._id || t.id === res.data._id) ? res.data : t));
      toast.success(`Ticket status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update ticket status');
    }
  };

  const handlePriorityChange = async (newPriority) => {
    if (!selectedTicket) return;
    try {
      const res = await api.patch(`/api/tickets/${selectedTicket._id || selectedTicket.id}/status`, { priority: newPriority });
      setSelectedTicket(res.data);
      setTickets(prev => prev.map(t => (t._id === res.data._id || t.id === res.data._id) ? res.data : t));
      toast.success(`Ticket priority set to ${newPriority}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update priority');
    }
  };

  // KPIs
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const urgentCount = tickets.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'resolved' && t.status !== 'closed').length;

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (deptFilter !== 'all' && t.department !== deptFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const tNum = (t.ticket_number || '').toLowerCase();
    const subj = (t.subject || '').toLowerCase();
    const msg = (t.message || '').toLowerCase();
    const dept = (t.department || '').toLowerCase();
    const clientName = (t.user?.full_name || '').toLowerCase();
    const companyName = (t.user?.company_name || '').toLowerCase();
    return tNum.includes(s) || subj.includes(s) || msg.includes(s) || dept.includes(s) || clientName.includes(s) || companyName.includes(s);
  });

  const statusBadge = (s) => {
    const map = { 
      open: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Open' }, 
      in_progress: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'In Progress' }, 
      resolved: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Resolved' }, 
      closed: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: 'Closed' } 
    };
    const c = map[s] || map.open;
    return (
      <span style={{
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4
      }}>
        {c.label}
      </span>
    );
  };

  const priorityBadge = (p) => {
    const map = {
      urgent: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Urgent ⚡' },
      high: { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3', label: 'High' },
      medium: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', label: 'Medium' },
      low: { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0', label: 'Low' }
    };
    const c = map[p] || map.medium;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`
      }}>
        {c.label}
      </span>
    );
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f0fdf4', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Total Tickets</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{totalCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Open / Awaiting</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>{openCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>In Progress</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>{inProgressCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>High / Urgent</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{urgentCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Resolved</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{resolvedCount}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="search-box" style={{ width: 280 }}>
            <Search size={14} className="search-icon" />
            <input 
              placeholder="Search by ID, client, subject..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select 
            className="form-control" 
            style={{ width: 'auto', fontSize: 13 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select 
            className="form-control" 
            style={{ width: 'auto', fontSize: 13 }}
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            <option value="General">General</option>
            <option value="Technical">Technical</option>
            <option value="Billing">Billing & Accounts</option>
            <option value="Audits">Audits & Inspections</option>
            <option value="Certificates">Certificates</option>
          </select>

          <select 
            className="form-control" 
            style={{ width: 'auto', fontSize: 13 }}
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button className="btn btn-ghost btn-sm" onClick={() => fetchTickets()} title="Refresh Tickets">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading support queue...</div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <HelpCircle size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#475569' }}>No support tickets found</div>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Tickets submitted by clients will appear here.'}
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Ticket ID</th>
                  <th>Client / Company</th>
                  <th>Subject & Message</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Responses</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => (
                  <tr key={t._id || t.id} style={{ transition: 'background 0.15s' }}>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 13 }}>
                        {t.ticket_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                        {t.user?.company_name || 'Client Account'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {t.user?.full_name || t.user_id}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>{t.subject}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.message}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
                        {t.department}
                      </span>
                    </td>
                    <td>{priorityBadge(t.priority)}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 4, 
                        fontSize: 12, 
                        color: t.responses?.length > 0 ? 'var(--primary)' : '#94a3b8',
                        fontWeight: 600
                      }}>
                        <MessageSquare size={13} /> {t.responses?.length || 0}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => setSelectedTicket(t)}
                        style={{ borderRadius: 8, fontWeight: 700 }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Ticket Management Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedTicket(null)}>
          <div className="modal" style={{ maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="modal-header" style={{ background: '#fafafa', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 15 }}>
                    {selectedTicket.ticket_number}
                  </span>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                    {selectedTicket.subject}
                  </h3>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Department: <strong>{selectedTicket.department}</strong> • Opened {new Date(selectedTicket.created_at).toLocaleString('en-GB')}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Status Dropdown */}
                <select
                  className="form-control"
                  style={{ width: 'auto', fontSize: 12, fontWeight: 700 }}
                  value={selectedTicket.status}
                  onChange={e => handleStatusChange(e.target.value)}
                >
                  <option value="open">🔵 Open</option>
                  <option value="in_progress">🟡 In Progress</option>
                  <option value="resolved">🟢 Resolved</option>
                  <option value="closed">⚪ Closed</option>
                </select>

                {/* Priority Dropdown */}
                <select
                  className="form-control"
                  style={{ width: 'auto', fontSize: 12, fontWeight: 700 }}
                  value={selectedTicket.priority}
                  onChange={e => handlePriorityChange(e.target.value)}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">⚡ Urgent</option>
                </select>

                <button className="modal-close" onClick={() => setSelectedTicket(null)}><X size={16} /></button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Client Summary Box */}
              <div style={{ 
                background: '#eff6ff', 
                padding: '14px 18px', 
                borderRadius: 12, 
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Building2 size={18} style={{ color: '#1d4ed8' }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1e3a8a' }}>
                      {selectedTicket.user?.company_name || 'Client Account'}
                    </span>
                    <span style={{ fontSize: 12, color: '#2563eb', marginLeft: 8 }}>
                      ({selectedTicket.user?.full_name})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: '#1e40af' }}>
                  <span><Mail size={12} style={{ marginRight: 4 }} />{selectedTicket.user?.email || 'N/A'}</span>
                  {selectedTicket.user?.phone && <span><Phone size={12} style={{ marginRight: 4 }} />{selectedTicket.user.phone}</span>}
                </div>
              </div>

              {/* Original Inquiry Card */}
              <div style={{ 
                background: 'white', 
                padding: '18px 20px', 
                borderRadius: 14, 
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Original Ticket Description</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(selectedTicket.created_at).toLocaleString('en-GB')}</span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {selectedTicket.message}
                </p>
              </div>

              {/* Thread History */}
              {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Conversation Timeline
                  </div>

                  {selectedTicket.responses.map((r, i) => {
                    const isStaff = r.user_role?.toLowerCase().includes('staff') || r.user_role?.toLowerCase().includes('admin') || r.user_role?.toLowerCase().includes('superadmin');

                    return (
                      <div 
                        key={i} 
                        style={{ 
                          alignSelf: isStaff ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          background: isStaff ? 'var(--primary)' : 'white',
                          color: isStaff ? 'white' : '#1e293b',
                          padding: '16px 18px',
                          borderRadius: isStaff ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          border: isStaff ? 'none' : '1px solid #e2e8f0',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 12, color: isStaff ? 'white' : 'var(--primary)' }}>
                            {r.user_name || (isStaff ? 'HFA Staff' : 'Client')} {isStaff && `(${r.user_role || 'Staff'})`}
                          </span>
                          <span style={{ fontSize: 10.5, opacity: 0.8 }}>
                            {new Date(r.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} • {new Date(r.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>

                        <p style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                          {r.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={responsesEndRef} />
            </div>

            {/* Quick Reply Footer */}
            <div className="modal-footer" style={{ padding: '16px 20px', background: 'white', borderTop: '1px solid var(--border)' }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Type official response to client..."
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  disabled={submittingReply}
                  style={{ borderRadius: 10, fontSize: 13.5, resize: 'none' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Press <strong>Send Reply</strong> to update client ticket.
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      onClick={(e) => handleReply(e, true)}
                      disabled={submittingReply || !reply.trim()}
                      style={{ borderRadius: 10, fontWeight: 700 }}
                    >
                      <CheckCircle2 size={15} style={{ marginRight: 6 }} /> Send & Mark Resolved
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={(e) => handleReply(e, false)}
                      disabled={submittingReply || !reply.trim()}
                      style={{ borderRadius: 10, padding: '0 20px', fontWeight: 700 }}
                    >
                      {submittingReply ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Send size={15} style={{ marginRight: 6 }} /> Send Reply</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

