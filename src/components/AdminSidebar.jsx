import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Award, Package, Ship, MessageSquare,
  Users, MapPin, LogOut, ChevronDown, ChevronRight, ClipboardList,
  UserCheck, Calendar, BarChart3, FileBarChart, Briefcase, Shield,
  X, PenTool, HelpCircle, ChevronsLeft, ChevronsRight, PlusCircle,
  Sparkles, ShieldCheck, AlertTriangle, ExternalLink, Activity
} from 'lucide-react';

/* ─── Navigation structure ──────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    key: 'overview',
    label: 'OVERVIEW',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      {
        icon: Users, label: 'Companies', path: '/clients',
        children: [
          { label: 'All Clients',       path: '/clients' },
          { label: 'Certified Clients', path: '/clients?category=company' },
          { label: 'Processing List',   path: '/clients?category=processing' },
          { label: 'Sign-ups',          path: '/clients?category=signups' },
        ],
      },
    ],
  },
  {
    key: 'applications',
    label: 'APPLICATIONS',
    items: [
      {
        icon: FileText, label: 'Applications', path: '/applications',
        children: [
          { label: 'All Applications',        path: '/applications' },
          { label: 'New Applications',        path: '/applications?type=new' },
          { label: 'In-Progress',             path: '/applications?type=inprogress' },
          { label: 'Certified Applications',  path: '/applications?type=certified' },
          { label: 'Surveillance',            path: '/applications?type=surveillance' },
          { label: 'Surveillance Due Dates',  path: '/surveillance-due-dates' },
          { label: 'Extension Applications',  path: '/extension-applications' },
        ],
      },
    ],
  },
  {
    key: 'certification',
    label: 'CERTIFICATION',
    items: [
      { icon: Briefcase,    label: 'Proposals',   path: '/proposals' },
      { icon: FileBarChart, label: 'Invoices',    path: '/invoices' },
      {
        icon: Calendar, label: 'Audits', path: '/audits',
        children: [
          { label: 'All Audits',          path: '/audits' },
          { label: 'Upcoming Schedule',   path: '/audits?filter=upcoming' },
          { label: 'Dates Pending',       path: '/audits?filter=pending' },
          { label: 'Audit Reports',       path: '/audit-reports' },
        ],
      },
      {
        icon: AlertTriangle, label: 'NCs', path: '/audits?filter=ncs',
        children: [
          { label: 'All NCs',             path: '/audits?filter=ncs' },
          { label: 'Active NCs',          path: '/audits?filter=ncs&status=active' },
          { label: 'Resolved NCs',        path: '/audits?filter=ncs&status=resolved' },
        ],
      },
      { icon: PenTool,      label: 'Agreements',  path: '/agreements' },
      {
        icon: ClipboardList, label: 'Logsheets', path: '/logsheet/manage',
        children: [
          { label: 'Manage Logsheet',       path: '/logsheet/manage' },
          { label: 'Waiting for Signature', path: '/logsheet/waiting-signature' },
          { label: 'Waiting for Certificate', path: '/logsheet/waiting-certificate' },
        ],
      },
      {
        icon: Award, label: 'Certificates', path: '/certificates',
        children: [
          { label: 'All Certificates',      path: '/certificates' },
          { label: 'Review Certificates',   path: '/certificates?status=under_review', reviewCertOnly: true },
          { label: 'Active Certificates',   path: '/certificates?status=active' },
          { label: 'Expiring Certificates', path: '/certificates?status=expiring' },
          { label: 'Expired Certificates',  path: '/certificates?status=expired' },
        ],
      },
      { icon: Ship, label: 'Export Certs', path: '/exports' },
    ],
  },
  {
    key: 'products_section',
    label: 'PRODUCTS',
    items: [
      {
        icon: Package, label: 'Products', path: '/products',
        children: [
          { label: 'Initial Products', path: '/initial-products' },
          { label: 'In-Progress Initial Products', path: '/initial-products?view=inprogress' },
          { label: 'Add-on Request', path: '/addon-applications?view=request' },
          { label: 'Add-on InProgress', path: '/addon-applications?view=inprogress' },
          { label: 'Add-on List',    path: '/addon-applications?view=list' },
          { label: 'Product List',   path: '/products' },
          { label: 'Manage Product', path: '/products/direct' },
        ],
      },
    ],
  },
  {
    key: 'people',
    label: 'PEOPLE & SITES',
    items: [
      { icon: Shield,    label: 'HFA Staff',  path: '/staff' },
      { icon: MapPin,    label: 'Sites',      path: '/sites' },
    ],
  },
  {
    key: 'operations',
    label: 'OPERATIONS',
    items: [
      { icon: MessageSquare, label: 'Messages',   path: '/messages' },
      { icon: HelpCircle,   label: 'Tickets',    path: '/tickets' },
      { icon: PenTool,      label: 'Signatures', path: '/signatures' },
      { icon: BarChart3,    label: 'Reports',    path: '/reports' },
    ],
  },
  {
    key: 'superadmin_section',
    label: '👑 SUPERADMIN CONSOLE',
    directCertOnly: true,
    items: [
      {
        icon: Activity,
        label: 'Live User Monitor',
        path: '/superadmin/live-monitor',
        badge: '🟢 LIVE',
        superadminOnly: true
      },
      {
        icon: Sparkles,
        label: 'Direct Certificate',
        path: '/superadmin/direct-certificate',
        badge: '⚡ DIRECT'
      },
      {
        icon: FileText,
        label: 'Direct Logsheet',
        path: '/superadmin/direct-logsheet',
        badge: '⚡ DIRECT'
      },
      {
        icon: Package,
        label: 'Manage Product',
        path: '/superadmin/direct-product',
        badge: '⚡ DIRECT'
      },
      {
        icon: ExternalLink,
        label: 'Staff Portal',
        href: 'https://ifrs.hfaportal.company/',
        badge: '↗ IFRS'
      },
    ],
  },
];

/* ─── Helpers ───────────────────────────────────────────────────── */
function isChildActive(childPath, location) {
  const [childPathname, childSearch = ''] = childPath.split('?');
  const childQuery = childSearch ? `?${childSearch}` : '';

  // Match review route variants (/certificates/review, /certificates/:id/review, or /certificates?status=under_review)
  if (childPath.includes('status=under_review') || childPath.includes('/certificates/review')) {
    if (
      location.pathname === '/certificates/review' ||
      location.pathname.endsWith('/review') ||
      (location.pathname === '/certificates' && (location.search.includes('status=under_review') || location.search.includes('status=review')))
    ) {
      return true;
    }
  }

  // Match active certificates
  if (childPath === '/certificates?status=active') {
    return location.pathname === '/certificates' && location.search.includes('status=active');
  }

  // Match expiring certificates
  if (childPath === '/certificates?status=expiring') {
    return location.pathname === '/certificates' && location.search.includes('status=expiring');
  }

  // Match expired certificates
  if (childPath === '/certificates?status=expired') {
    return location.pathname === '/certificates' && location.search.includes('status=expired');
  }

  // Match all certificates route (no specific query or status=all)
  if (childPath === '/certificates') {
    return location.pathname === '/certificates' && (!location.search || location.search === '?status=all');
  }

  // Match applications routes
  if (childPath === '/applications?type=new') {
    return location.pathname === '/applications' && location.search.includes('type=new');
  }
  if (childPath === '/applications?type=inprogress') {
    return location.pathname === '/applications' && (location.search.includes('type=inprogress') || location.search.includes('type=in_progress') || location.search.includes('type=renewal'));
  }
  if (childPath === '/applications?type=certified') {
    return location.pathname === '/applications' && location.search.includes('type=certified');
  }
  if (childPath === '/applications?type=surveillance') {
    return location.pathname === '/applications' && location.search.includes('type=surveillance');
  }
  if (childPath === '/applications') {
    return location.pathname === '/applications' && (!location.search || location.search === '?type=all');
  }

  if (childPathname === '/addon-applications' && childSearch === 'view=list' && location.pathname === '/addon-applications' && !location.search) {
    return true;
  }
  if (childPathname === '/clients' && (!childSearch || childSearch === 'category=all')) {
    return location.pathname === '/clients' && (!location.search || location.search === '?category=all');
  }
  return location.pathname === childPathname && location.search === childQuery;
}

function sectionContainsPath(section, pathname, search) {
  return section.items.some(item => {
    if (item.children) {
      return item.children.some(c => isChildActive(c.path, { pathname, search }));
    }
    return item.path === pathname;
  });
}

function getUnreadNavCount(notifications, pathStr, children = []) {
  if (!Array.isArray(notifications) || notifications.length === 0) return 0;
  const unreadList = notifications.filter(n => n && !n.is_read && n.link);
  if (unreadList.length === 0) return 0;

  const matchSinglePath = (link, targetPath) => {
    if (!link || !targetPath) return false;
    const [linkPath, linkSearch = ''] = link.split('?');
    const [targetPathname, targetSearch = ''] = targetPath.split('?');

    if (linkPath !== targetPathname) return false;
    if (targetSearch) {
      return linkSearch.includes(targetSearch);
    }
    return true;
  };

  let count = 0;
  unreadList.forEach(n => {
    let matched = false;
    if (pathStr && matchSinglePath(n.link, pathStr)) {
      matched = true;
    }
    if (!matched && children && children.length > 0) {
      if (children.some(c => matchSinglePath(n.link, c.path))) {
        matched = true;
      }
    }
    if (matched) count++;
  });

  return count;
}

/* ─── Component─────────────────────────────────────────────────── */
export default function AdminSidebar({ collapsed, onToggleCollapse, isOpen, onClose, notifications = [] }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A';

  /* ── Expanded sub-menu state ── */
  const [expanded, setExpanded] = useState({});

  const userRoles = Array.isArray(profile?.roles) && profile.roles.length > 0 ? profile.roles : (profile?.role ? [profile.role] : []);
  const isSuperAdmin = userRoles.includes('superadmin');
  const isCertOfficer = userRoles.includes('certificate_officer');
  const hasDirectCertPrivilege = isSuperAdmin || isCertOfficer || profile?.can_issue_direct_certificate === true;
  const hasReviewCertPrivilege = isSuperAdmin || profile?.can_review_certificate === true;

  const visibleSections = NAV_SECTIONS.filter(section => {
    if (section.superadminOnly) return isSuperAdmin;
    if (section.directCertOnly) return hasDirectCertPrivilege;
    return true;
  }).map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.superadminOnly && !isSuperAdmin) return false;
      return true;
    }).map(item => {
      if (!item.children) return item;
      return {
        ...item,
        children: item.children.filter(child => {
          if (child.reviewCertOnly && !hasReviewCertPrivilege) return false;
          if (child.superadminOnly && !isSuperAdmin) return false;
          return true;
        })
      };
    })
  }));

  /* Auto-expand the section that contains the active route */
  useEffect(() => {
    const next = {};
    visibleSections.forEach(section => {
      section.items.forEach(item => {
        if (item.children) {
          const hasActive = item.children.some(c =>
            isChildActive(c.path, location)
          );
          if (hasActive) next[item.label] = true;
          // Keep Certificates expanded when on any certificates page or review route
          if (item.label === 'Certificates' && location.pathname.startsWith('/certificates')) {
            next[item.label] = true;
          }
        }
      });
    });
    setExpanded(prev => ({ ...prev, ...next }));
  }, [location.pathname, location.search, hasReviewCertPrivilege, hasDirectCertPrivilege]);

  const toggle = (label) =>
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      {/* ── Logo / Collapse toggle ── */}
      <div className="sidebar-logo" style={{ position: 'relative' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: '#f0fdf4', border: '1.5px solid #dcfce7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <img
            src="/hfa-logo.png" alt="HFA"
            style={{ width: 22, height: 22, objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>

        {!collapsed && (
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">HFA Admin</span>
            <span className="sidebar-logo-sub">Halal Food Authority</span>
          </div>
        )}

        {/* Mobile close */}
        {isOpen && (
          <button className="sidebar-close" onClick={onClose} style={{ marginLeft: 'auto' }}>
            <X size={18} />
          </button>
        )}

        {/* Desktop collapse toggle — hidden on mobile */}
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ display: isOpen ? 'none' : undefined }}
        >
          {collapsed
            ? <ChevronsRight size={13} />
            : <ChevronsLeft size={13} />
          }
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav" style={{ padding: '8px 0' }}>
        {visibleSections.map((section, sIdx) => (
          <div key={section.key} className="nav-section">
            {/* Divider between sections (skip before first) */}
            {sIdx > 0 && <div className="nav-section-divider" />}

            {/* Section label */}
            <div className="nav-section-label-v2">{section.label}</div>

            {/* Section items */}
            {section.items.map(item => {
              const Icon = item.icon;
              const isExpanded = expanded[item.label];
              const isParentActive = item.path === location.pathname ||
                (item.children?.some(c => isChildActive(c.path, location)));

              const parentUnread = getUnreadNavCount(notifications, item.path, item.children);

              if (item.children) {
                return (
                  <div key={item.label}>
                    <button
                      className={`nav-item${isParentActive ? ' active' : ''}`}
                      onClick={() => {
                        if (collapsed) {
                          navigate(item.path);
                        } else {
                          toggle(item.label);
                        }
                      }}
                      title={item.label}
                    >
                      <Icon size={17} style={{ flexShrink: 0 }} />
                      <span className="nav-item-label">{item.label}</span>
                      {parentUnread > 0 && (!isExpanded || collapsed) && (
                        <span
                          className="nav-attention-badge"
                          style={{
                            marginLeft: 'auto',
                            marginRight: 6,
                            background: '#2563eb',
                            color: '#ffffff',
                            fontSize: 10,
                            fontWeight: 500,
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 5px',
                            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.2)',
                            animation: 'navBadgePulse 2s ease-in-out infinite',
                            fontFamily: "'Inter', sans-serif"
                          }}
                        >
                          {parentUnread > 9 ? '9+' : parentUnread}
                        </span>
                      )}
                      <span className="nav-chevron" style={{ marginLeft: parentUnread > 0 && (!isExpanded || collapsed) ? 0 : 'auto' }}>
                        {isExpanded
                          ? <ChevronDown size={13} />
                          : <ChevronRight size={13} />
                        }
                      </span>
                    </button>

                    {isExpanded && !collapsed && (
                      <div className="nav-sub">
                        {item.children.map(child => {
                          const active = isChildActive(child.path, location);
                          const childUnread = getUnreadNavCount(notifications, child.path);
                          return (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              className={({ isActive }) => `nav-sub-item${active ? ' active' : ''}`}
                            >
                              <span className="nav-item-label">{child.label}</span>
                              {childUnread > 0 && (
                                <span
                                  className="nav-attention-badge"
                                  style={{
                                    marginLeft: 'auto',
                                    background: '#2563eb',
                                    color: '#ffffff',
                                    fontSize: 10,
                                    fontWeight: 500,
                                    minWidth: 18,
                                    height: 18,
                                    borderRadius: 9,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 5px',
                                    boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.2)',
                                    animation: 'navBadgePulse 2s ease-in-out infinite',
                                    fontFamily: "'Inter', sans-serif"
                                  }}
                                >
                                  {childUnread > 9 ? '9+' : childUnread}
                                </span>
                              )}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // External link (href) — renders as <a> with target="_blank"
              if (item.href) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-item"
                    title={item.label}
                  >
                    <Icon size={17} style={{ flexShrink: 0 }} />
                    <span className="nav-item-label">{item.label}</span>
                    {item.badge && !collapsed && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                          color: '#ffffff',
                          fontSize: 9.5,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 6,
                          letterSpacing: '0.3px',
                          boxShadow: '0 2px 6px rgba(29, 78, 216, 0.25)'
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  title={item.label}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  <span className="nav-item-label">{item.label}</span>
                  {item.badge && !collapsed && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        background: 'linear-gradient(135deg, #15803d, #047857)',
                        color: '#ffffff',
                        fontSize: 9.5,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 6,
                        letterSpacing: '0.3px',
                        boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {parentUnread > 0 && (
                    <span
                      className="nav-attention-badge"
                      style={{
                        marginLeft: item.badge ? 6 : 'auto',
                        background: '#2563eb',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 500,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 5px',
                        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.2)',
                        animation: 'navBadgePulse 2s ease-in-out infinite',
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      {parentUnread > 9 ? '9+' : parentUnread}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer: user + logout ── */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{ flexShrink: 0, background: isSuperAdmin ? '#064e3b' : undefined }}>
            {initials}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name truncate">{profile?.full_name || 'Admin'}</div>
            <div className="sidebar-user-role" style={{ color: isSuperAdmin ? '#15803d' : undefined, fontWeight: isSuperAdmin ? 700 : undefined }}>
              {(() => {
                const userRoles = Array.isArray(profile?.roles) && profile.roles.length > 0 ? profile.roles : (profile?.role ? [profile.role] : []);
                if (userRoles.includes('superadmin')) return '👑 Super Administrator';
                if (userRoles.includes('scheme_manager')) return '📋 Scheme Manager';
                if (userRoles.includes('certificate_officer')) return '🎖️ Certificate Officer';
                if (userRoles.includes('accountant')) return '💳 Accountant';
                if (userRoles.includes('admin')) return '🛡️ Administrator';
                if (userRoles.includes('audit_manager')) return '🔍 Audit Manager';
                if (userRoles.includes('inspector')) return '🕵️ Auditor';
                if (userRoles.includes('food_tech_manager')) return '🧪 Food Tech Manager';
                if (userRoles.includes('food_tech')) return '🔬 Food Technologist';
                return 'Administrator';
              })()}
            </div>
          </div>
        </div>
        <button
          className="btn-logout"
          onClick={() => { logout(); navigate('/login'); }}
        >
          <LogOut size={14} />
          <span className="btn-logout-label">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
