import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  MessageSquare, Send, X, User, Search, Plus, Check, CheckCheck, 
  Clock, Shield, Building2, Phone, Mail, RefreshCw, Paperclip, Filter,
  Megaphone, Bell, Users, Target, ChevronDown
} from 'lucide-react';

export default function AdminMessages() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
  
  // UI states
  const [tab, setTab] = useState('all'); // 'all' | 'unread'
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Compose form
  const [composeForm, setComposeForm] = useState({ 
    recipient_id: '', 
    subject: '', 
    body: '',
    application_id: ''
  });
  const [submittingCompose, setSubmittingCompose] = useState(false);

  // Targeted company selection
  const [selectedRecipients, setSelectedRecipients] = useState([]); // array of client IDs
  const [companySearch, setCompanySearch] = useState(''); // search within company picker
  const [recipientMode, setRecipientMode] = useState('direct'); // 'all' | 'selected' | 'direct'

  const threadEndRef = useRef(null);
  const selectedClientRef = useRef(selectedClient);
  const submittingRef = useRef(false);

  useEffect(() => {
    selectedClientRef.current = selectedClient;
  }, [selectedClient]);

  // Fetch all messages and clients
  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [msgRes, clientRes] = await Promise.all([
        api.get('/api/messages/inbox'),
        api.get('/api/users')
      ]);

      const msgs = msgRes.data || [];
      const clientList = (clientRes.data || []).filter(u => u.role === 'client');
      
      setMessages(msgs);
      setClients(clientList);

      // If a client was already selected, refresh the conversation
      if (selectedClientRef.current) {
        loadConversation(selectedClientRef.current._id || selectedClientRef.current.id, false);
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load messages');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Socket.io Real-Time Synchronization (attached once)
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      const myId = (profile?._id || profile?.id)?.toString();
      // If current user is sender, do not re-add on new_message broadcast
      if (myId && (newMsg.sender_id === myId || newMsg.sender_id === profile?._id)) {
        return;
      }

      const senderName = newMsg.sender?.company_name || newMsg.sender?.full_name || 'Client';
      toast.success(`New inquiry from ${senderName}`, {
        icon: '✉️',
        duration: 4000
      });

      const msgId = (newMsg._id || newMsg.id)?.toString();

      setMessages(prev => {
        const filtered = prev.filter(m => (m._id || m.id)?.toString() !== msgId);
        return [newMsg, ...filtered];
      });

      const activeClient = selectedClientRef.current;
      if (activeClient) {
        const clientId = (activeClient._id || activeClient.id)?.toString();
        if (newMsg.sender_id === clientId || newMsg.recipient_id === clientId) {
          setConversation(prev => {
            if (prev.some(m => (m._id || m.id)?.toString() === msgId)) {
              return prev.map(m => (m._id || m.id)?.toString() === msgId ? newMsg : m);
            }
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      }
    };

    const handleMessageSent = (sentMsg) => {
      const msgId = (sentMsg._id || sentMsg.id)?.toString();

      setMessages(prev => {
        const filtered = prev.filter(m => (m._id || m.id)?.toString() !== msgId);
        return [sentMsg, ...filtered];
      });

      const activeClient = selectedClientRef.current;
      if (activeClient) {
        const clientId = (activeClient._id || activeClient.id)?.toString();
        if (sentMsg.sender_id === clientId || sentMsg.recipient_id === clientId) {
          setConversation(prev => {
            if (prev.some(m => (m._id || m.id)?.toString() === msgId)) {
              return prev.map(m => (m._id || m.id)?.toString() === msgId ? sentMsg : m);
            }
            return [...prev, sentMsg];
          });
          scrollToBottom();
        }
      }
    };

    const handleMessageRead = ({ messageId, read_at }) => {
      const targetId = messageId?.toString();
      setMessages(prev => prev.map(m => (m._id || m.id)?.toString() === targetId ? { ...m, is_read: true, read_at } : m));
      setConversation(prev => prev.map(m => (m._id || m.id)?.toString() === targetId ? { ...m, is_read: true, read_at } : m));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('message_read', handleMessageRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('message_read', handleMessageRead);
    };
  }, [profile]);

  const scrollToBottom = () => {
    setTimeout(() => {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Load conversation for a selected client
  const loadConversation = async (clientId, showSpinner = true) => {
    if (showSpinner) setConvLoading(true);
    try {
      const res = await api.get(`/api/messages/conversation/${clientId}`);
      const threadData = res.data || [];
      setConversation(threadData);
      scrollToBottom();

      // Bulk mark unread incoming messages from this client as read
      await api.put(`/api/messages/conversation/${clientId}/read`, {});
      setMessages(prev => prev.map(m => m.sender_id === clientId ? { ...m, is_read: true } : m));
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      if (showSpinner) setConvLoading(false);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    loadConversation(client._id || client.id, true);
  };

  // Send reply in active conversation
  const handleSendReply = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (submittingRef.current || !replyText.trim() || !selectedClient) return;

    submittingRef.current = true;
    setSubmittingReply(true);
    try {
      const clientId = selectedClient._id || selectedClient.id;
      const isBroadcast = clientId === 'all_clients';

      const payload = {
        recipient_id: isBroadcast ? 'all_clients' : clientId,
        is_broadcast: isBroadcast,
        subject: isBroadcast 
          ? `[Announcement] ${replyText.trim().substring(0, 45)}...`
          : `Re: Communication with ${selectedClient.company_name || selectedClient.full_name}`,
        body: replyText.trim()
      };

      const res = await api.post('/api/messages', payload);
      const newMsg = res.data || res;
      const msgId = (newMsg._id || newMsg.id)?.toString();

      // Deduplicated state update
      setConversation(prev => {
        if (prev.some(m => (m._id || m.id)?.toString() === msgId)) {
          return prev;
        }
        return [...prev, newMsg];
      });

      setMessages(prev => {
        const filtered = prev.filter(m => (m._id || m.id)?.toString() !== msgId);
        return [newMsg, ...filtered];
      });

      setReplyText('');
      scrollToBottom();
      toast.success(isBroadcast 
        ? `📢 Broadcast sent to all clients & email notifications dispatched!` 
        : 'Message sent to client'
      );
    } catch (err) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      submittingRef.current = false;
      setSubmittingReply(false);
    }
  };

  // Send new composed message
  const handleSendCompose = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const isTargeted = recipientMode === 'selected';
    const isBroadcast = recipientMode === 'all';

    if (isTargeted && selectedRecipients.length === 0) {
      toast.error('Please select at least one company');
      return;
    }
    if (!isBroadcast && !isTargeted && !composeForm.recipient_id) {
      toast.error('Please choose a recipient');
      return;
    }
    if (submittingRef.current || !composeForm.body.trim()) return;

    submittingRef.current = true;
    setSubmittingCompose(true);
    try {
      const payload = {
        subject: composeForm.subject || (isBroadcast ? 'HFA Official Broadcast Announcement' : isTargeted ? 'HFA Targeted Notice' : 'HFA Support Notice'),
        body: composeForm.body.trim(),
        application_id: composeForm.application_id || null
      };

      if (isTargeted) {
        payload.recipient_ids = selectedRecipients;
        payload.recipient_id = 'selected_clients';
      } else if (isBroadcast) {
        payload.recipient_id = 'all_clients';
        payload.is_broadcast = true;
      } else {
        payload.recipient_id = composeForm.recipient_id;
      }

      const res = await api.post('/api/messages', payload);
      const responseData = res.data || res;

      if (isTargeted) {
        toast.success(`🎯 Targeted notice sent to ${responseData.recipient_count || selectedRecipients.length} selected companies!`);
      } else if (isBroadcast) {
        toast.success(`📢 Broadcast delivered to all clients & email notifications dispatched!`);
      } else {
        toast.success('Message sent to client');
      }

      setShowCompose(false);
      setSelectedRecipients([]);
      setRecipientMode('direct');
      setCompanySearch('');

      if (isBroadcast) {
        handleSelectClient({
          _id: 'all_clients',
          id: 'all_clients',
          company_name: 'All Registered Clients',
          full_name: 'Broadcast Announcements Channel',
          isBroadcastChannel: true
        });
      } else if (isTargeted) {
        handleSelectClient({
          _id: 'selected_clients',
          id: 'selected_clients',
          company_name: 'Selected Companies',
          full_name: `Targeted Notice — ${selectedRecipients.length} Companies`,
          isTargetedChannel: true
        });
      } else {
        const targetClient = clients.find(c => (c._id || c.id) === composeForm.recipient_id);
        if (targetClient) handleSelectClient(targetClient);
      }

      setComposeForm({ recipient_id: '', subject: '', body: '', application_id: '' });
      fetchMessages(true);
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      submittingRef.current = false;
      setSubmittingCompose(false);
    }
  };

  // Toggle a company in the targeted recipient list
  const toggleRecipient = (clientId) => {
    setSelectedRecipients(prev =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };

  // Filtered client list for company picker
  const filteredPickerClients = clients.filter(c => {
    const s = companySearch.toLowerCase();
    if (!s) return true;
    return (
      (c.company_name || '').toLowerCase().includes(s) ||
      (c.full_name || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s)
    );
  });

  // Build client communication threads
  const clientConversations = clients.map(client => {
    const clientId = client._id || client.id;
    const clientMsgs = messages.filter(m => m.sender_id === clientId || m.recipient_id === clientId);
    const unreadCount = clientMsgs.filter(m => m.sender_id === clientId && !m.is_read).length;
    const latestMsg = clientMsgs[0] || null;

    return {
      client,
      messages: clientMsgs,
      unreadCount,
      latestMsg,
      lastActivity: latestMsg ? new Date(latestMsg.created_at) : new Date(client.created_at || 0)
    };
  })
  .filter(item => {
    if (tab === 'unread' && item.unreadCount === 0) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const name = (item.client.full_name || '').toLowerCase();
    const company = (item.client.company_name || '').toLowerCase();
    const email = (item.client.email || '').toLowerCase();
    const latest = (item.latestMsg?.body || '').toLowerCase();
    const subj = (item.latestMsg?.subject || '').toLowerCase();
    return name.includes(s) || company.includes(s) || email.includes(s) || latest.includes(s) || subj.includes(s);
  })
  .sort((a, b) => b.lastActivity - a.lastActivity);

  const totalUnreadCount = messages.filter(m => !m.is_read && m.sender?.role === 'client').length;

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 140px)', minHeight: 600 }}>
      {/* Left Sidebar: Client List */}
      <div className="card" style={{ flex: '0 0 380px', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {/* Header */}
        <div style={{ 
          padding: '14px 18px', 
          borderBottom: '1px solid var(--border)', 
          background: '#fafafa',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Client Inquiries</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {totalUnreadCount > 0 ? `${totalUnreadCount} unread message(s)` : 'All up to date'}
            </div>
          </div>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => setShowCompose(true)}
            style={{ borderRadius: 8, fontWeight: 700, padding: '6px 12px' }}
          >
            <Plus size={14} /> New Message
          </button>
        </div>

        {/* Filter & Search */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'white', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="search-box" style={{ width: '100%' }}>
            <Search size={14} className="search-icon" />
            <input 
              placeholder="Search company, client or text..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 12.5 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setTab('all')}
              style={{
                flex: 1,
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: tab === 'all' ? 700 : 500,
                background: tab === 'all' ? '#eff6ff' : '#f8fafc',
                color: tab === 'all' ? '#1d4ed8' : '#64748b',
                border: tab === 'all' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                cursor: 'pointer'
              }}
            >
              All Clients ({clients.length})
            </button>
            <button
              onClick={() => setTab('unread')}
              style={{
                flex: 1,
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: tab === 'unread' ? 700 : 500,
                background: tab === 'unread' ? '#f0fdf4' : '#f8fafc',
                color: tab === 'unread' ? '#15803d' : '#64748b',
                border: tab === 'unread' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                cursor: 'pointer'
              }}
            >
              Unread Only ({totalUnreadCount})
            </button>
          </div>
        </div>

        {/* Client List Stream */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Pinned: All Clients Broadcast Channel */}
          <div 
            onClick={() => handleSelectClient({
              _id: 'all_clients',
              id: 'all_clients',
              company_name: 'All Registered Clients',
              full_name: 'Broadcast Announcements Channel',
              email: `Broadcasts to ${clients.length} client companies`,
              isBroadcastChannel: true
            })}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              cursor: 'pointer',
              background: (selectedClient && (selectedClient._id === 'all_clients' || selectedClient.id === 'all_clients')) ? '#ecfdf5' : '#f8fafc',
              borderLeft: (selectedClient && (selectedClient._id === 'all_clients' || selectedClient.id === 'all_clients')) ? '4px solid #16a34a' : '4px solid #10b981',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#16a34a', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13
                }}>📢</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>All Clients Broadcast</div>
                  <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Announcements ({clients.length} Companies)</div>
                </div>
              </div>
              <span className="badge badge-green" style={{ fontSize: 10, padding: '2px 6px' }}>Email & App</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Post notices & auto-dispatch email notifications to all clients</div>
          </div>

          {/* Pinned: Targeted Broadcast shortcut */}
          <div
            onClick={() => {
              setRecipientMode('selected');
              setSelectedRecipients([]);
              setCompanySearch('');
              setComposeForm(f => ({ ...f, recipient_id: '', subject: '', body: '' }));
              setShowCompose(true);
            }}
            style={{
              padding: '12px 16px',
              borderBottom: '2px solid #e2e8f0',
              cursor: 'pointer',
              background: (selectedClient && (selectedClient._id === 'selected_clients' || selectedClient.id === 'selected_clients')) ? '#fffbeb' : '#fafafa',
              borderLeft: (selectedClient && (selectedClient._id === 'selected_clients' || selectedClient.id === 'selected_clients')) ? '4px solid #d97706' : '4px solid #f59e0b',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#f59e0b', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13
                }}>🎯</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Targeted Company Notice</div>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Pick specific companies</div>
                </div>
              </div>
              <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 20, fontWeight: 700, border: '1px solid #fde68a' }}>Select</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Send email & portal message to selected companies only</div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading client directory...</div>
            </div>
          ) : clientConversations.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <MessageSquare size={32} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>No conversations match</div>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Try clearing the search filter.</p>
            </div>
          ) : (
            clientConversations.map(({ client, unreadCount, latestMsg }) => {
              const clientId = client._id || client.id;
              const isSelected = selectedClient && (selectedClient._id === clientId || selectedClient.id === clientId);

              return (
                <div 
                  key={clientId}
                  onClick={() => handleSelectClient(client)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: isSelected ? '#ecfdf5' : (unreadCount > 0 ? '#f0fdf4' : 'white'),
                    borderLeft: isSelected ? '4px solid var(--primary)' : (unreadCount > 0 ? '4px solid #16a34a' : '4px solid transparent'),
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: isSelected ? 'var(--primary)' : (unreadCount > 0 ? '#dcfce7' : '#f1f5f9'),
                        color: isSelected ? 'white' : (unreadCount > 0 ? '#166534' : '#475569'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700
                      }}>
                        {client.company_name?.charAt(0) || client.full_name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: unreadCount > 0 ? 800 : (isSelected ? 700 : 600), color: '#0f172a' }}>
                          {client.company_name || client.full_name || 'Client'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {client.full_name}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10.5, color: unreadCount > 0 ? '#16a34a' : '#94a3b8', fontWeight: unreadCount > 0 ? 700 : 400 }}>
                        {latestMsg ? new Date(latestMsg.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
                      </div>
                      {unreadCount > 0 && (
                        <span className="badge badge-green" style={{ fontSize: 10, padding: '1px 6px', marginTop: 2 }}>
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>

                  {latestMsg ? (
                    <div style={{ 
                       fontSize: 11.5, 
                      color: unreadCount > 0 ? '#1e293b' : '#64748b', 
                      fontWeight: unreadCount > 0 ? 600 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: 4
                    }}>
                      <span style={{ color: latestMsg.sender_id === clientId ? '#2563eb' : 'var(--primary)', fontWeight: 600 }}>
                        {latestMsg.sender_id === clientId ? 'Client: ' : 'Staff: '}
                      </span>
                      {latestMsg.body}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 }}>
                      No messages yet • Click to start chat
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Conversation Stream & Composer */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {selectedClient ? (
          <>
            {/* Header */}
            <div style={{ 
              padding: '14px 24px', 
              borderBottom: '1px solid var(--border)', 
              background: '#fafafa',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    {selectedClient.company_name || selectedClient.full_name}
                  </h3>
                  {selectedClient._id === 'all_clients' || selectedClient.isBroadcastChannel ? (
                    <span className="badge badge-green" style={{ fontSize: 10 }}>
                      📢 Broadcast Channel ({clients.length} Clients)
                    </span>
                  ) : (
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>
                      Client Portal
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: '#64748b' }}>
                  {selectedClient._id === 'all_clients' || selectedClient.isBroadcastChannel ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#166534', fontWeight: 600 }}>
                      <Mail size={12} /> Broadcasts are sent to all {clients.length} client inboxes + dispatched as email notifications via Resend
                    </span>
                  ) : (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={12} /> {selectedClient.full_name}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={12} /> {selectedClient.email}
                      </span>
                      {selectedClient.phone && (
                        <>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={12} /> {selectedClient.phone}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => loadConversation(selectedClient._id || selectedClient.id, false)}
                  title="Refresh Conversation"
                >
                  <RefreshCw size={14} className={convLoading ? 'spin' : ''} />
                </button>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setSelectedClient(null)}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              background: '#f8fafc'
            }}>
              {convLoading ? (
                <div style={{ margin: 'auto', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading thread...</div>
                </div>
              ) : conversation.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', padding: 40 }}>
                  <MessageSquare size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>
                    {selectedClient._id === 'all_clients' ? 'No broadcast announcements posted yet' : 'No messages in this channel'}
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {selectedClient._id === 'all_clients' 
                      ? 'Type an announcement below to notify all clients in real-time and send official email notifications.'
                      : `Send a direct message below to start communicating with ${selectedClient.company_name || selectedClient.full_name}.`
                    }
                  </p>
                </div>
              ) : (
                conversation.map((msg, idx) => {
                  const clientId = (selectedClient._id || selectedClient.id)?.toString();
                  const isFromClient = msg.sender_id === clientId;
                  const isBroadcast = msg.recipient_id === 'all_clients' || msg.recipient_id === 'all' || msg.is_broadcast;

                  const prevMsg = idx > 0 ? conversation[idx - 1] : null;
                  const showDateDivider = !prevMsg || (
                    new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
                  );

                  const formatDividerDate = (dateStr) => {
                    const d = new Date(dateStr);
                    const now = new Date();
                    if (d.toDateString() === now.toDateString()) return 'Today';
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
                    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                  };

                  return (
                    <React.Fragment key={msg._id || idx}>
                      {showDateDivider && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '10px 0 4px'
                        }}>
                          <span style={{
                            background: '#e2e8f0',
                            color: '#475569',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 12px',
                            borderRadius: 20,
                            letterSpacing: 0.3
                          }}>
                            {formatDividerDate(msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignSelf: isFromClient ? 'flex-start' : 'flex-end',
                          maxWidth: '78%'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 4,
                          alignSelf: isFromClient ? 'flex-start' : 'flex-end',
                          fontSize: 11,
                          color: '#64748b'
                        }}>
                          <span style={{ fontWeight: 700, color: isFromClient ? '#2563eb' : 'var(--primary-dark)' }}>
                            {isFromClient ? (selectedClient.company_name || selectedClient.full_name) : (msg.sender?.full_name || profile?.full_name || 'HFA Staff')}
                          </span>
                          {isBroadcast && (
                            <span style={{ background: '#dcfce7', color: '#166534', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>
                              📢 Broadcast to All
                            </span>
                          )}
                          <span>•</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div style={{
                          padding: '13px 18px',
                          borderRadius: isFromClient ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                          background: isFromClient 
                            ? '#ffffff' 
                            : (isBroadcast ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : 'linear-gradient(135deg, #1B7A7A 0%, #155e5e 100%)'),
                          color: isFromClient ? '#1e293b' : 'white',
                          boxShadow: isFromClient ? '0 2px 8px rgba(0,0,0,0.04)' : '0 3px 12px rgba(27,122,122,0.2)',
                          border: isFromClient ? '1px solid #e2e8f0' : 'none',
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {msg.body}
                        </div>

                        {!isFromClient && (
                          <div style={{ alignSelf: 'flex-end', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#94a3b8' }}>
                            {isBroadcast ? (
                              <>
                                <Mail size={12} color="#16a34a" />
                                <span style={{ color: '#166534', fontWeight: 600 }}>Sent to all clients & email dispatched</span>
                              </>
                            ) : (
                              <>
                                {msg.is_read ? <CheckCheck size={13} color="#16a34a" /> : <Check size={13} />}
                                <span>{msg.is_read ? 'Read by client' : 'Delivered'}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Quick Reply Bar */}
            <div style={{ 
              padding: '14px 20px', 
              borderTop: '1px solid var(--border)', 
              background: 'white',
              flexShrink: 0 
            }}>
              {/* Quick Admin Template Chips */}
              {selectedClient._id !== 'all_clients' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginRight: 2 }}>
                    Quick Templates:
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setReplyText('Hello, your Halal certification audit has been scheduled. Please ensure all preparation documents are ready.')}
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: 12, fontSize: 11, color: '#475569', cursor: 'pointer' }}
                  >
                    📅 Audit Confirmation
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setReplyText('Your updated Halal Certificate has been approved and is now available in your client portal.')}
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: 12, fontSize: 11, color: '#475569', cursor: 'pointer' }}
                  >
                    📜 Certificate Ready
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setReplyText('Please upload the outstanding raw material specification documents for our technical review.')}
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: 12, fontSize: 11, color: '#475569', cursor: 'pointer' }}
                  >
                    📑 Request Documents
                  </button>
                </div>
              )}

              <form onSubmit={handleSendReply} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder={
                    selectedClient._id === 'all_clients'
                      ? 'Type broadcast announcement to all clients... (Dispatches in-app and email notifications)'
                      : `Reply to ${selectedClient.company_name || selectedClient.full_name}... (Press Enter to send, Shift+Enter for newline)`
                  }
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSendReply(e);
                    }
                  }}
                  style={{ 
                    resize: 'none', 
                    borderRadius: 12, 
                    fontSize: 13.5,
                    padding: '10px 14px',
                    flex: 1
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingReply || !replyText.trim()}
                  style={{
                    height: 46,
                    padding: '0 20px',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                    background: selectedClient._id === 'all_clients' ? '#16a34a' : 'var(--primary)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {submittingReply ? (
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                  ) : selectedClient._id === 'all_clients' ? (
                    <><Megaphone size={15} /> Send Broadcast</>
                  ) : (
                    <><Send size={15} /> Send Reply</>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ 
            margin: 'auto', 
            textAlign: 'center', 
            padding: 40,
            maxWidth: 420
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#f0fdf4',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <MessageSquare size={28} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Admin Communications Desk
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
              Select a client company or open the <strong>All Clients Broadcast</strong> channel to send instant messages and email notifications to all companies.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button 
                className="btn btn-outline"
                onClick={() => {
                  setComposeForm({
                    recipient_id: 'all_clients',
                    subject: '',
                    body: '',
                    application_id: ''
                  });
                  setShowCompose(true);
                }}
                style={{ borderRadius: 10, padding: '9px 16px', fontWeight: 700, color: '#166534', borderColor: '#bbf7d0' }}
              >
                📢 Broadcast to All Clients
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowCompose(true)}
                style={{ borderRadius: 10, padding: '9px 18px', fontWeight: 700 }}
              >
                <Plus size={15} style={{ marginRight: 6 }} /> Direct Message
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCompose(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {recipientMode === 'all' ? (
                  <Megaphone size={18} style={{ color: '#16a34a' }} />
                ) : recipientMode === 'selected' ? (
                  <Target size={18} style={{ color: '#d97706' }} />
                ) : (
                  <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
                )}
                <span className="modal-title">
                  {recipientMode === 'all' ? '📢 Broadcast to All Clients' : recipientMode === 'selected' ? '🎯 Targeted Company Notice' : 'New Direct Message'}
                </span>
              </div>
              <button className="modal-close" onClick={() => { setShowCompose(false); setSelectedRecipients([]); setRecipientMode('direct'); setCompanySearch(''); }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendCompose}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Mode Selector */}
                <div className="form-group">
                  <label className="form-label">Send To <span>*</span></label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setRecipientMode('all')}
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                        cursor: 'pointer', border: recipientMode === 'all' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                        background: recipientMode === 'all' ? '#ecfdf5' : '#f8fafc',
                        color: recipientMode === 'all' ? '#166534' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <Megaphone size={14} /> All Clients
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientMode('selected')}
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                        cursor: 'pointer', border: recipientMode === 'selected' ? '2px solid #d97706' : '1px solid #e2e8f0',
                        background: recipientMode === 'selected' ? '#fffbeb' : '#f8fafc',
                        color: recipientMode === 'selected' ? '#92400e' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <Target size={14} /> Select Companies
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientMode('direct')}
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                        cursor: 'pointer', border: recipientMode === 'direct' ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                        background: recipientMode === 'direct' ? '#f0fdf4' : '#f8fafc',
                        color: recipientMode === 'direct' ? 'var(--primary-dark)' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <User size={14} /> Direct Message
                    </button>
                  </div>
                </div>

                {/* ALL CLIENTS mode info banner */}
                {recipientMode === 'all' && (
                  <div style={{
                    padding: '12px 16px', background: '#ecfdf5', borderRadius: 10,
                    border: '1px solid #bbf7d0', display: 'flex', alignItems: 'flex-start', gap: 10
                  }}>
                    <Megaphone size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
                      <strong>Broadcast:</strong> Delivered to portal inboxes of all <strong>{clients.length} registered clients</strong> in real-time + each client receives an official <strong>Email Notification</strong>.
                    </div>
                  </div>
                )}

                {/* SELECTED COMPANIES mode — searchable checkbox list */}
                {recipientMode === 'selected' && (
                  <div className="form-group">
                    <label className="form-label">
                      Select Companies
                      {selectedRecipients.length > 0 && (
                        <span style={{ marginLeft: 8, background: '#d97706', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>
                          {selectedRecipients.length} selected
                        </span>
                      )}
                    </label>

                    {/* Company search */}
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        className="form-control"
                        style={{ paddingLeft: 32, fontSize: 13 }}
                        placeholder="Search companies..."
                        value={companySearch}
                        onChange={e => setCompanySearch(e.target.value)}
                      />
                    </div>

                    {/* Select All / Clear */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedRecipients(filteredPickerClients.map(c => c._id || c.id))}
                        style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Select All ({filteredPickerClients.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRecipients([])}
                        style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Clear
                      </button>
                    </div>

                    {/* Company checkbox list */}
                    <div style={{
                      maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10,
                      background: 'white'
                    }}>
                      {filteredPickerClients.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>No companies found</div>
                      ) : filteredPickerClients.map(c => {
                        const cId = c._id || c.id;
                        const isChecked = selectedRecipients.includes(cId);
                        return (
                          <div
                            key={cId}
                            onClick={() => toggleRecipient(cId)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                              cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                              background: isChecked ? '#fffbeb' : 'white',
                              transition: 'background 0.1s'
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                              border: isChecked ? '2px solid #d97706' : '2px solid #cbd5e1',
                              background: isChecked ? '#d97706' : 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {isChecked && <Check size={11} color="white" strokeWidth={3} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: isChecked ? 700 : 500, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.company_name || c.full_name}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{c.email}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedRecipients.length > 0 && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', fontSize: 12, color: '#92400e' }}>
                        🎯 <strong>{selectedRecipients.length} compan{selectedRecipients.length !== 1 ? 'ies' : 'y'}</strong> selected — each will receive a portal message + email notification.
                      </div>
                    )}
                  </div>
                )}

                {/* DIRECT MESSAGE mode — single dropdown */}
                {recipientMode === 'direct' && (
                  <div className="form-group">
                    <label className="form-label">Client <span>*</span></label>
                    <select
                      className="form-control"
                      value={composeForm.recipient_id}
                      onChange={e => setComposeForm(f => ({ ...f, recipient_id: e.target.value }))}
                    >
                      <option value="">-- Choose a client company --</option>
                      {clients.map(c => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.company_name || c.full_name} — {c.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Subject <span>*</span></label>
                  <input
                    className="form-control"
                    value={composeForm.subject}
                    onChange={e => setComposeForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder={
                      recipientMode === 'all'
                        ? 'e.g. [Announcement] Annual Halal Standard Updates & Compliance'
                        : recipientMode === 'selected'
                        ? 'e.g. [Notice] Upcoming Audit for Selected Companies'
                        : 'e.g. Halal Audit Confirmation or Scheme Update'
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message Body <span>*</span></label>
                  <textarea
                    className="form-control"
                    rows={6}
                    value={composeForm.body}
                    onChange={e => setComposeForm(f => ({ ...f, body: e.target.value }))}
                    placeholder={
                      recipientMode === 'all'
                        ? 'Write official announcement text to all client companies...'
                        : recipientMode === 'selected'
                        ? 'Write your targeted message for the selected companies...'
                        : 'Write your message to the client...'
                    }
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowCompose(false); setSelectedRecipients([]); setRecipientMode('direct'); setCompanySearch(''); }}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    submittingCompose ||
                    !composeForm.body.trim() ||
                    (recipientMode === 'direct' && !composeForm.recipient_id) ||
                    (recipientMode === 'selected' && selectedRecipients.length === 0)
                  }
                  style={{
                    background: recipientMode === 'all' ? '#16a34a' : recipientMode === 'selected' ? '#d97706' : 'var(--primary)'
                  }}
                >
                  {submittingCompose ? (
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                  ) : recipientMode === 'all' ? (
                    <><Megaphone size={14} /> Broadcast to All Clients</>
                  ) : recipientMode === 'selected' ? (
                    <><Target size={14} /> Send to {selectedRecipients.length} Selected Compan{selectedRecipients.length !== 1 ? 'ies' : 'y'}</>
                  ) : (
                    <><Send size={14} /> Send Message</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
