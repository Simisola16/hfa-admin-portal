import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, Shield, X, CheckCircle, AlertCircle, Info, AlertTriangle, FileText, Menu } from 'lucide-react';
import api from '../lib/api';

/* ─── Page title + breadcrumb mapping ─────────────────────────── */
const pageMeta = {
  '/dashboard':                   { title: 'Dashboard',           sub: 'System overview',                section: null },
  '/applications':                { title: 'Applications',        sub: 'Manage all applications',        section: 'Applications' },
  '/clients':                     { title: 'Companies',           sub: 'Manage client accounts',         section: 'Applications' },
  '/proposals':                   { title: 'Proposals',           sub: 'Manage client proposals',        section: 'Certification' },
  '/invoices':                    { title: 'Invoices',            sub: 'Manage client invoices',         section: 'Certification' },
  '/audits':                      { title: 'Audits',              sub: 'Schedule and manage audits',     section: 'Certification' },
  '/logsheet/accounts':           { title: 'Logsheets',           sub: 'Account approval queue',         section: 'Certification' },
  '/logsheet/products':           { title: 'Logsheets',           sub: 'Product review queue',           section: 'Certification' },
  '/logsheet/manage':             { title: 'Logsheets',           sub: 'Manage logsheet records',        section: 'Certification' },
  '/logsheet/waiting-signature':  { title: 'Logsheets',           sub: 'Waiting for signature',          section: 'Certification' },
  '/certificates':                { title: 'Certificates',        sub: 'Manage issued certificates',     section: 'Certification' },
  '/exports':                     { title: 'Export Certificates', sub: 'Manage export certificate requests', section: 'Certification' },
  '/inspectors':                  { title: 'Inspectors',          sub: 'Manage inspector profiles',      section: 'People & Sites' },
  '/sites':                       { title: 'Sites',               sub: 'All registered business sites',  section: 'People & Sites' },
  '/products':                    { title: 'Products',            sub: 'All registered products',        section: 'People & Sites' },
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
  const panelRef = useRef();

  const fetchNotifs = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data || []);
      setUnread(res.unreadCount || 0);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

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
            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={panelRef}>
              <button
                className="icon-btn"
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

              {showNotifs && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                  width: 380, maxHeight: 500, overflowY: 'auto',
                  background: 'white', border: '1px solid #e2e8f0',
                  borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.12)', zIndex: 9999,
                }}>
                  <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Notifications</div>
                      {unread > 0 && <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>{unread} unread</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {unread > 0 && (
                        <button onClick={markAllRead} style={{ fontSize: 12, fontWeight: 700, color: '#15803d', background: 'none', border: 'none', cursor: 'pointer' }}>
                          Mark all read
                        </button>
                      )}
                      <button onClick={() => setShowNotifs(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {notifLoading && notifications.length === 0 ? (
                    <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ background: '#f8fafc', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <Bell size={28} style={{ opacity: 0.3 }} />
                      </div>
                      <div style={{ fontWeight: 700, color: '#475569' }}>All clear!</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>No new notifications.</div>
                    </div>
                  ) : notifications.map(n => {
                    const isRead = n.is_read;
                    return (
                      <div
                        key={n._id}
                        onClick={() => handleNotifClick(n)}
                        style={{
                          padding: '14px 20px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
                          background: isRead ? 'white' : TYPE_BG[n.type] || '#f8fafc',
                          borderBottom: '1px solid #f1f5f9', transition: 'all 0.15s',
                        }}
                        className="hover-notif"
                      >
                        <div style={{ marginTop: 2, background: isRead ? '#f1f5f9' : 'white', padding: 7, borderRadius: 9, display: 'flex' }}>
                          {TYPE_ICON[n.type] || TYPE_ICON.info}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: isRead ? 600 : 800, fontSize: 13.5, color: isRead ? '#475569' : '#0f172a', marginBottom: 2 }}>{n.title}</div>
                          <div style={{ fontSize: 12.5, color: isRead ? '#64748b' : '#334155', lineHeight: 1.5 }}>{n.message}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>{timeAgo(n.created_at)}</div>
                        </div>
                        {!isRead && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#15803d', marginTop: 5, flexShrink: 0, boxShadow: '0 0 0 3px #dcfce7' }} />}
                      </div>
                    );
                  })}
                </div>
              )}
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
      </div>
    </div>
  );
}
