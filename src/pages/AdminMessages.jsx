import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { MessageSquare, Send, X, User, Search } from 'lucide-react';

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ recipient_id: '', subject: '', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const fetchMessages = () => {
    setLoading(true);
    api.get('/api/messages/inbox').then(d => setMessages(d.data || [])).catch(() => toast.error('Failed to load messages')).finally(() => setLoading(false));
  };

  const fetchClients = () => {
    api.get('/api/users').then(d => setClients((d.data || []).filter(u => u.role === 'client'))).catch(() => {});
  };

  useEffect(() => {
    fetchMessages();
    fetchClients();
  }, []);

  const viewMessage = async (msg) => {
    setSelected(msg);
    if (!msg.is_read) {
      await api.put(`/api/messages/${msg.id}/read`, {});
      fetchMessages();
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/messages', form);
      toast.success('Message sent to client');
      setShowCompose(false);
      setForm({ recipient_id: '', subject: '', body: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = messages.filter(m => 
    !search || 
    m.subject?.toLowerCase().includes(search.toLowerCase()) || 
    m.sender?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.sender?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 160px)' }}>
      {/* Sidebar/List */}
      <div className="card" style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">Messages</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCompose(true)}>
            <Send size={13} /> Compose
          </button>
        </div>
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input 
              placeholder="Search conversations..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <MessageSquare size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No messages found</div>
            </div>
          ) : (
            filtered.map(msg => (
              <div 
                key={msg.id} 
                onClick={() => viewMessage(msg)}
                style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selected?.id === msg.id ? 'var(--primary-light)' : (!msg.is_read ? '#f0fdf4' : 'white'),
                  transition: 'var(--transition)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: !msg.is_read ? 700 : 600, fontSize: 13, color: 'var(--text-primary)' }}>
                    {msg.sender?.company_name || msg.sender?.full_name || 'System'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(msg.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: !msg.is_read ? 600 : 400, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  {msg.subject}
                </div>
                <div className="truncate" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {msg.body}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail View */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selected ? (
          <>
            <div className="card-header" style={{ padding: '16px 24px', background: '#f8fafc' }}>
              <div>
                <div className="card-title" style={{ fontSize: 18 }}>{selected.subject}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div className="sidebar-avatar" style={{ width: 24, height: 24, fontSize: 10, background: 'var(--primary)' }}>
                    {selected.sender?.full_name?.[0] || 'U'}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong>{selected.sender?.full_name}</strong> ({selected.sender?.company_name})
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>• {new Date(selected.created_at).toLocaleString('en-GB')}</span>
                </div>
              </div>
            </div>
            <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: 24, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
              {selected.body}
            </div>
            <div className="card-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: '#f8fafc' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setForm({ recipient_id: selected.sender_id, subject: `Re: ${selected.subject}`, body: '' });
                  setShowCompose(true);
                }}
              >
                <Send size={14} /> Reply to Client
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ flex: 1, justifyContent: 'center' }}>
            <MessageSquare size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>Select a message to read</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Conversations with clients will appear here</p>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCompose(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <span className="modal-title">New Message</span>
              <button className="modal-close" onClick={() => setShowCompose(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleSend}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Recipient Client <span>*</span></label>
                  <select 
                    className="form-control" 
                    value={form.recipient_id} 
                    onChange={e => setForm(f => ({ ...f, recipient_id: e.target.value }))}
                    required
                  >
                    <option value="">Select a client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name} ({c.full_name})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject <span>*</span></label>
                  <input 
                    className="form-control" 
                    value={form.subject} 
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="e.g. Question regarding your application"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Message <span>*</span></label>
                  <textarea 
                    className="form-control" 
                    rows={8} 
                    value={form.body} 
                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Write your message here..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCompose(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Send size={14} /> Send Message</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
