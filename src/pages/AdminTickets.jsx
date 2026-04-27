import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Search, MessageSquare, Send, X } from 'lucide-react';

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');

  const fetch = () => {
    setLoading(true);
    api.get('/api/tickets')
      .then(res => setTickets(res.data || []))
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    try {
      await api.post(`/api/tickets/${selected.id}/reply`, { message: reply });
      setReply('');
      const res = await api.get('/api/tickets');
      const updated = res.data.find(t => t.id === selected.id);
      setSelected(updated);
      setTickets(res.data);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Client</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 700 }}>{t.ticket_number}</td>
                    <td>{t.user_id}</td>
                    <td>{t.subject}</td>
                    <td><span className={`badge ${t.priority === 'high' ? 'badge-red' : 'badge-gray'}`}>{t.priority}</span></td>
                    <td>{t.status}</td>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelected(t)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <span className="modal-title">Ticket {selected.ticket_number}: {selected.subject}</span>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <p>{selected.message}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {selected.responses?.map((r, i) => (
                  <div key={i} style={{ 
                    alignSelf: r.user_id === selected.user_id ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                    background: r.user_id === selected.user_id ? '#f1f5f9' : 'var(--primary-light)',
                    padding: 12,
                    borderRadius: 12
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{r.user_name}</div>
                    <p style={{ fontSize: 13 }}>{r.message}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <input className="form-control" placeholder="Type reply..." value={reply} onChange={e => setReply(e.target.value)} />
              <button className="btn btn-primary" onClick={handleReply}><Send size={15} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
