import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle,
  FileText, Receipt, Award, Calendar, MessageSquare, Ticket,
  Check, Trash2, ArrowRight, ShieldAlert, CreditCard, Clock
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    badge: 'Success'
  },
  error: {
    icon: AlertCircle,
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    badge: 'Urgent'
  },
  warning: {
    icon: AlertTriangle,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    badge: 'Pending'
  },
  info: {
    icon: Info,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    badge: 'System'
  },
  application: {
    icon: FileText,
    color: '#15803d',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    badge: 'Application'
  },
  payment: {
    icon: CreditCard,
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    badge: 'Payment'
  },
  invoice: {
    icon: Receipt,
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fed7aa',
    badge: 'Invoice'
  },
  certificate: {
    icon: Award,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    badge: 'Certificate'
  },
  audit: {
    icon: Calendar,
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
    badge: 'Audit'
  },
  message: {
    icon: MessageSquare,
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    badge: 'Message'
  },
  ticket: {
    icon: Ticket,
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
    badge: 'Support'
  }
};

function timeAgo(date) {
  if (!date) return 'Just now';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function AdminNotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  loading = false,
  onRefresh,
  onOpenQuickModal
}) {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'action'

  if (!isOpen) return null;

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      toast.success('All notifications marked as read');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.put(`/api/notifications/${n._id || n.id}/read`);
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }

    onClose();

    const titleLower = (n.title || '').toLowerCase();
    const messageLower = (n.message || '').toLowerCase();

    let modalType = null;
    if (titleLower.includes('payment') || messageLower.includes('payment') || titleLower.includes('proof') || messageLower.includes('proof')) modalType = 'confirm_payment';
    else if (titleLower.includes('proposal accepted') || titleLower.includes('proposal approved') || messageLower.includes('proposal accepted') || messageLower.includes('proposal approved')) modalType = 'send_initial_invoice';
    else if (titleLower.includes('proposal') || messageLower.includes('proposal')) modalType = 'send_proposal';
    else if (titleLower.includes('invoice') || messageLower.includes('invoice')) modalType = 'send_initial_invoice';
    else if ((titleLower.includes('agreement') || messageLower.includes('agreement')) && (titleLower.includes('signed') || messageLower.includes('signed'))) modalType = 'send_final_agreement';
    else if (titleLower.includes('agreement') || messageLower.includes('agreement')) modalType = 'send_agreement';
    else if (titleLower.includes('ready') || messageLower.includes('ready for certificate')) modalType = 'issue_certificate';
    else if (titleLower.includes('nc') || messageLower.includes('nc') || titleLower.includes('audit') || messageLower.includes('audit')) modalType = 'manage_audit';

    const getCleanId = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'object') return String(val._id || val.id || '');
      return String(val);
    };

    const extractAppId = () => {
      const raw = n.application_id || n.appId || n.app_id || 
                  n.data?.application_id || n.data?.app_id || n.data?.appId ||
                  n.audit_id || n.invoice_id || n.agreement_id || n.proposal_id;
      if (raw) {
        const clean = getCleanId(raw);
        if (clean && clean !== '[object Object]') return clean;
      }
      const link = n.link || '';
      const m1 = link.match(/\/applications\/([a-fA-F0-9]{24})/);
      if (m1) return m1[1];
      const m2 = link.match(/appId=([a-fA-F0-9]{24})/);
      if (m2) return m2[1];
      const match = link.match(/([a-fA-F0-9]{24})/) || (n.message || '').match(/([a-fA-F0-9]{24})/);
      return match ? match[1] : null;
    };

    const targetAppId = extractAppId();

    if (modalType && targetAppId && onOpenQuickModal) {
      onOpenQuickModal(modalType, targetAppId);
      return;
    }

    if (n.link) {
      navigate(n.link);
    } else if (modalType && onOpenQuickModal) {
      onOpenQuickModal(modalType, null);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterTab === 'unread') return !n.is_read;
    if (filterTab === 'action') {
      const t = (n.title || '').toLowerCase();
      const m = (n.message || '').toLowerCase();
      return t.includes('action') || t.includes('payment') || t.includes('proposal') || t.includes('invoice') || t.includes('agreement') || t.includes('audit') || m.includes('submitted');
    }
    return true;
  });

  return (
    <div
      className="admin-notification-dropdown"
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 12px)',
        width: 420,
        maxWidth: '92vw',
        maxHeight: '82vh',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.16), 0 0 1px rgba(0,0,0,0.1)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'notifDropdownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #f1f5f9',
        background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={17} style={{ color: '#15803d' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.2 }}>Admin Notifications</div>
            <div style={{ fontSize: 11.5, color: unreadCount > 0 ? '#15803d' : '#64748b', fontWeight: 600 }}>
              {unreadCount > 0 ? `${unreadCount} unread system alert${unreadCount > 1 ? 's' : ''}` : 'All system queues clear'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: '#15803d',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 6,
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Mark all notifications as read"
            >
              <Check size={12} /> Mark read
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: 6,
              padding: 4,
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        padding: '8px 16px',
        background: '#f8fafc',
        borderBottom: '1px solid #f1f5f9',
        gap: 6,
        flexShrink: 0
      }}>
        {[
          { id: 'all', label: `All (${notifications.length})` },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'action', label: 'Action Needed' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            style={{
              flex: 1,
              padding: '5px 8px',
              fontSize: 11.5,
              fontWeight: filterTab === tab.id ? 700 : 500,
              color: filterTab === tab.id ? '#15803d' : '#64748b',
              background: filterTab === tab.id ? '#ffffff' : 'transparent',
              border: filterTab === tab.id ? '1px solid #e2e8f0' : '1px solid transparent',
              borderRadius: 6,
              boxShadow: filterTab === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 400, padding: 0 }}>
        {loading && notifications.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Loading notifications...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Bell size={24} style={{ color: '#cbd5e1' }} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#334155' }}>
              {filterTab === 'unread' ? 'No unread alerts' : 'No notifications in this queue'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              New client submissions, payments, and workflow events will appear here in real time.
            </div>
          </div>
        ) : (
          filteredNotifications.map(n => {
            const isRead = n.is_read;
            const typeKey = n.type || 'info';
            const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.info;
            const Icon = config.icon;

            return (
              <div
                key={n._id || n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  background: isRead ? '#ffffff' : config.bg,
                  borderBottom: '1px solid #f1f5f9',
                  borderLeft: isRead ? '3px solid transparent' : `3px solid ${config.color}`,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = isRead ? '#f8fafc' : config.bg; }}
                onMouseLeave={e => { e.currentTarget.style.background = isRead ? '#ffffff' : config.bg; }}
              >
                {/* Type Icon */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: isRead ? '#f1f5f9' : '#ffffff',
                  border: `1px solid ${isRead ? '#e2e8f0' : config.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2
                }}>
                  <Icon size={16} style={{ color: config.color }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                    <span style={{
                      fontWeight: isRead ? 600 : 800,
                      fontSize: 13,
                      color: isRead ? '#334155' : '#0f172a',
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>
                      {timeAgo(n.created_at || n.createdAt)}
                    </span>
                  </div>

                  <p style={{
                    fontSize: 12,
                    color: isRead ? '#64748b' : '#334155',
                    lineHeight: 1.45,
                    margin: 0,
                    wordBreak: 'break-word'
                  }}>
                    {n.message}
                  </p>

                  {/* Action Link Cue */}
                  {n.link && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      color: config.color
                    }}>
                      <span>Process Action</span>
                      <ArrowRight size={11} />
                    </div>
                  )}
                </div>

                {/* Unread Glow Dot */}
                {!isRead && (
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: config.color,
                    marginTop: 6,
                    flexShrink: 0,
                    boxShadow: `0 0 0 3px ${config.border}`
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid #f1f5f9',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <button
          onClick={() => {
            onClose();
            navigate('/messages');
          }}
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: '#64748b',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <MessageSquare size={13} /> View Communications
        </button>

        <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 500 }}>
          HFA Admin Real-time
        </span>
      </div>
    </div>
  );
}
