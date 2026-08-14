import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, Shield, X, CheckCircle, AlertCircle, Info, AlertTriangle, FileText, Menu, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getSocket } from '../lib/socket';

// Shared Admin Modals
import ProposalModal from './ProposalModal';
import InvoiceModal from './InvoiceModal';
import AgreementModal from './AgreementModal';
import FinalAgreementModal from './FinalAgreementModal';
import CertificateModal from './CertificateModal';
import AuditManageModal from './AuditManageModal';
import ConfirmPaymentModal from './ConfirmPaymentModal';
import AdminNotificationCenter from './AdminNotificationCenter';

/* ─── Page title + breadcrumb mapping ─────────────────────────── */
const pageMeta = {
  '/dashboard':                   { title: 'Dashboard',           sub: 'System overview',                section: null },
  '/applications':                { title: 'Applications',        sub: 'Manage all applications',        section: 'Applications' },
  '/clients':                     { title: 'Companies',           sub: 'Manage client accounts',         section: 'Applications' },
  '/proposals':                   { title: 'Proposals',           sub: 'Manage client proposals',        section: 'Certification' },
  '/invoices':                    { title: 'Invoices',            sub: 'Manage client invoices',         section: 'Certification' },
  '/agreements':                  { title: 'Agreements',          sub: 'Manage certification agreements', section: 'Certification' },
  '/audits':                      { title: 'Audits',              sub: 'Schedule and manage audits',     section: 'Certification' },
  '/audit-reports':               { title: 'Audit Reports',       sub: 'Audit & NC reports repository',  section: 'Certification' },
  '/logsheet/accounts':           { title: 'Logsheets',           sub: 'Account approval queue',         section: 'Certification' },
  '/logsheet/products':           { title: 'Logsheets',           sub: 'Product review queue',           section: 'Certification' },
  '/logsheet/manage':             { title: 'Logsheets',           sub: 'Manage logsheet records',        section: 'Certification' },
  '/logsheet/waiting-signature':  { title: 'Logsheets',           sub: 'Waiting for signature',          section: 'Certification' },
  '/logsheet/waiting-certificate': { title: 'Logsheets',          sub: 'Waiting for certificate',        section: 'Certification' },
  '/certificates':                { title: 'Certificates',        sub: 'Manage issued certificates',     section: 'Certification' },
  '/exports':                     { title: 'Export Certificates', sub: 'Manage export certificate requests', section: 'Certification' },
  '/staff':                       { title: 'HFA Staff',           sub: 'Manage staff accounts and roles', section: 'People & Sites' },
  '/inspectors':                  { title: 'Inspectors',          sub: 'Manage inspector profiles',      section: 'People & Sites' },
  '/sites':                       { title: 'Sites',               sub: 'All registered business sites',  section: 'People & Sites' },
  '/products':                    { title: 'Products',            sub: 'All registered products',        section: 'Products' },
  '/addon-applications':          { title: 'Add-on Applications', sub: 'Manage certificate product changes', section: 'Products' },
  '/messages':                    { title: 'Messages',            sub: 'Client communications',          section: 'Operations' },
  '/tickets':                     { title: 'Tickets',             sub: 'Support ticket queue',           section: 'Operations' },
  '/signatures':                  { title: 'Signatures',          sub: 'Manage digital signatures',      section: 'Operations' },
  '/reports':                     { title: 'Reports & Analytics', sub: 'System-wide reporting',          section: 'Operations' },
};

/* ─── Notification helpers ────────────────────────────────────── */
const TYPE_ICON = {
  success:     <CheckCircle  size={16} style={{ color: '#16a34a' }} />,
  error:       <AlertCircle  size={16} style={{ color: '#ef4444' }} />,
  warning:     <AlertTriangle size={16} style={{ color: '#d97706' }} />,
  info:        <Info         size={16} style={{ color: '#3b82f6' }} />,
  application: <FileText     size={16} style={{ color: '#15803d' }} />,
};
const TYPE_BG = {
  success: '#f0fdf4', error: '#fef2f2', warning: '#fffbeb', info: '#eff6ff', application: '#f0fdf4',
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─── Component ─────────────────────────────────────────────────── */
export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const page = pageMeta[location.pathname] || { title: 'HFA Admin Portal', sub: '', section: null };

  /* ── Sidebar collapse state (desktop) ── */
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('hfa-sidebar-collapsed') === 'true'
  );

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('hfa-sidebar-collapsed', next);
      return next;
    });
  };

  /* ── Mobile overlay state ── */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Notifications ── */
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [quickModal, setQuickModal] = useState(null); // { type, appId }
  const panelRef = useRef();

  const [animateBell, setAnimateBell] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);

  const showToast = (notif) => {
    const iconMap = {
      success: <CheckCircle size={18} style={{ color: '#16a34a' }} />,
      warning: <AlertTriangle size={18} style={{ color: '#d97706' }} />,
      error: <AlertCircle size={18} style={{ color: '#ef4444' }} />,
      info: <Info size={18} style={{ color: '#3b82f6' }} />
    };

    const bgMap = {
      success: '#f0fdf4',
      warning: '#fffbeb',
      error: '#fef2f2',
      info: '#eff6ff'
    };

    const borderMap = {
      success: '#bbf7d0',
      warning: '#fef3c7',
      error: '#fecaca',
      info: '#bfdbfe'
    };

    const titleLower = (notif.title || '').toLowerCase();
    const messageLower = (notif.message || '').toLowerCase();
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

    const extractAppId = (notifObj) => {
      if (!notifObj) return null;
      const raw = notifObj.application_id || notifObj.appId || notifObj.app_id || 
                  notifObj.data?.application_id || notifObj.data?.app_id || notifObj.data?.appId ||
                  notifObj.audit_id || notifObj.invoice_id || notifObj.agreement_id || notifObj.proposal_id;
      if (raw) {
        const clean = getCleanId(raw);
        if (clean && clean !== '[object Object]') return clean;
      }
      const link = notifObj.link || '';
      const m1 = link.match(/\/applications\/([a-fA-F0-9]{24})/);
      if (m1) return m1[1];
      const m2 = link.match(/appId=([a-fA-F0-9]{24})/);
      if (m2) return m2[1];
      const match = link.match(/([a-fA-F0-9]{24})/) || (notifObj.message || '').match(/([a-fA-F0-9]{24})/);
      if (match) return match[1];
      return null;
    };
    const targetAppId = extractAppId(notif);

    toast.custom((t) => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '14px 18px',
          background: bgMap[notif.type] || 'white',
          border: `1.5px solid ${borderMap[notif.type] || '#e2e8f0'}`,
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px',
          width: '100%',
          animation: t.visible ? 'slideIn 0.3s ease' : 'fadeOut 0.3s ease',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            {iconMap[notif.type] || iconMap.info}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{notif.title}</div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>{notif.message}</div>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>

        {(modalType || notif.link) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, gap: 4 }}
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
                if (modalType && targetAppId) {
                  setQuickModal({ type: modalType, appId: targetAppId });
                } else if (notif.link) {
                  navigate(notif.link);
                } else if (modalType) {
                  setQuickModal({ type: modalType, appId: null });
                }
              }}
            >
              {modalType ? 'View & Respond' : 'View Details'}
            </button>
          </div>
        )}
      </div>
    ), { id: notif._id || notif.id, duration: 60000 });
  };

  const fetchNotifs = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/api/notifications');
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      const count = typeof res?.unreadCount === 'number' ? res.unreadCount : list.filter(n => n && !n.is_read).length;
      setNotifications(list);
      setUnread(count);
    } catch {
      setNotifications([]);
      setUnread(0);
    } finally {
      setNotifLoading(false);
    }
  };

  // Socket connection and listener
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleConnectError = () => setSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    // Sync initial state
    setSocketConnected(socket.connected);

    const handleNotification = (notif) => {
      if (!notif) return;
      setNotifications(prev => [notif, ...(Array.isArray(prev) ? prev : [])]);
      setUnread(prev => (typeof prev === 'number' ? prev : 0) + 1);

      // Trigger bell pulse animation
      setAnimateBell(true);
      setTimeout(() => setAnimateBell(false), 1000);

      // Show toast
      showToast(notif);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('notification', handleNotification);
    };
  }, [profile]);

  // Initial load + Fallback Polling (only if socket is disconnected)
  useEffect(() => {
    fetchNotifs();

    if (socketConnected) return;

    const interval = setInterval(fetchNotifs, 20000);
    return () => clearInterval(interval);
  }, [socketConnected]);

  // Auto-clear unread notifications matching the active route
  useEffect(() => {
    if (!Array.isArray(notifications) || notifications.length === 0) return;
    const currentPathname = location.pathname;
    const currentSearch = location.search;

    const matchingUnread = notifications.filter(n => {
      if (!n || n.is_read || !n.link) return false;
      const [linkPath, linkSearch = ''] = n.link.split('?');
      if (linkPath !== currentPathname) return false;
      if (linkSearch) {
        return currentSearch.includes(linkSearch);
      }
      return true;
    });

    if (matchingUnread.length > 0) {
      matchingUnread.forEach(n => {
        api.put(`/api/notifications/${n._id}/read`).catch(() => {});
      });
      setNotifications(prev => (Array.isArray(prev) ? prev : []).map(n =>
        matchingUnread.some(m => m._id === n._id) ? { ...n, is_read: true } : n
      ));
      setUnread(prev => Math.max(0, (typeof prev === 'number' ? prev : 0) - matchingUnread.length));
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    setSidebarOpen(false);
    return () => document.removeEventListener('mousedown', handler);
  }, [location.pathname]);

  const toggleNotifs = () => { if (!showNotifs) fetchNotifs(); setShowNotifs(v => !v); };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch (err) { console.error('Failed to mark all as read:', err); }
  };

  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.put(`/api/notifications/${n._id}/read`);
        setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, is_read: true } : item));
        setUnread(prev => Math.max(0, prev - 1));
      } catch (err) { console.error('Failed to mark as read:', err); }
    }
    setShowNotifs(false);
    if (n.link) navigate(n.link);
  };

  const adminInitials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A';

  return (
    <div className="app-layout">
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        notifications={notifications}
      />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* ── Top bar ── */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Mobile hamburger */}
            <button
              className="mobile-toggle"
              onClick={() => setSidebarOpen(true)}
              style={{ display: 'flex' }}
            >
              <Menu size={20} />
            </button>

            {/* Page title + breadcrumb */}
            <div>
              {page.section && (
                <div className="topbar-breadcrumb">
                  <span>HFA Admin</span>
                  <span className="topbar-breadcrumb-sep">›</span>
                  <span>{page.section}</span>
                  <span className="topbar-breadcrumb-sep">›</span>
                  <span className="topbar-breadcrumb-current">{page.title}</span>
                </div>
              )}
              <div className="topbar-title" style={{ fontSize: page.section ? 16 : 18 }}>
                {page.title}
              </div>
              {page.sub && !page.section && (
                <div className="topbar-subtitle">{page.sub}</div>
              )}
            </div>
          </div>

          <div className="topbar-actions">
            {!socketConnected && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#fffbeb',
                border: '1px solid #fef08a',
                color: '#854d0e',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'Inter, sans-serif'
              }}>
                <span className="spinner" style={{ width: 10, height: 10, borderTopColor: '#854d0e', display: 'inline-block' }} />
                <span>Reconnecting...</span>
              </div>
            )}
            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={panelRef}>
              <button
                className={`icon-btn ${animateBell ? 'bell-pulse' : ''}`}
                title="Notifications"
                onClick={toggleNotifs}
                style={{ position: 'relative' }}
              >
                <Bell size={17} />
                {unread > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: '#ef4444', color: 'white', borderRadius: '50%',
                    width: 16, height: 16, fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white',
                  }}>{unread > 9 ? '9+' : unread}</span>
                )}
              </button>

              <AdminNotificationCenter
                isOpen={showNotifs}
                onClose={() => setShowNotifs(false)}
                notifications={notifications}
                unreadCount={unread}
                loading={notifLoading}
                onRefresh={fetchNotifs}
                onOpenQuickModal={(type, appId) => setQuickModal({ type, appId })}
              />
            </div>

            {/* Admin avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 14, borderLeft: '1px solid var(--border)' }}>
              <div className="sidebar-avatar" style={{ width: 34, height: 34, fontSize: 12, background: 'var(--primary)', color: 'white', fontWeight: 700 }}>
                {adminInitials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  {profile?.full_name || 'Admin'}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                  <Shield size={9} /> Administrator
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes bellPulse {
            0% { transform: scale(1); }
            15% { transform: scale(1.3) rotate(10deg); }
            30% { transform: scale(1.3) rotate(-10deg); }
            45% { transform: scale(1.3) rotate(10deg); }
            60% { transform: scale(1.3) rotate(-10deg); }
            75% { transform: scale(1.1) rotate(5deg); }
            90% { transform: scale(1.1) rotate(-5deg); }
            100% { transform: scale(1) rotate(0); }
          }
          .bell-pulse {
            animation: bellPulse 0.8s ease-in-out;
          }
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        `}} />
      </div>

      {/* Shared Admin Quick Action Modals */}
      {quickModal?.type === 'confirm_payment' && (
        <ConfirmPaymentModal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          appId={quickModal.appId}
          onSuccess={() => fetchNotifs()}
        />
      )}

      {quickModal?.type === 'send_proposal' && (
        <ProposalModal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          appId={quickModal.appId}
          onSuccess={() => fetchNotifs()}
        />
      )}

      {quickModal?.type === 'send_initial_invoice' && (
        <InvoiceModal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          appId={quickModal.appId}
          invoiceType="initial"
          onSuccess={() => fetchNotifs()}
        />
      )}

      {quickModal?.type === 'send_agreement' && (
        <AgreementModal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          appId={quickModal.appId}
          onSuccess={() => fetchNotifs()}
        />
      )}

      {quickModal?.type === 'send_final_agreement' && (
        <FinalAgreementModal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          appId={quickModal.appId}
          onSuccess={() => fetchNotifs()}
        />
      )}

      {quickModal?.type === 'issue_certificate' && (
        <CertificateModal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          appId={quickModal.appId}
          onSuccess={() => fetchNotifs()}
        />
      )}

      {quickModal?.type === 'manage_audit' && (
        <AuditManageModal
          isOpen={true}
          onClose={() => setQuickModal(null)}
          app={quickModal.appId}
          onSuccess={() => fetchNotifs()}
        />
      )}
    </div>
  );
}
