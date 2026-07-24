import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Award, Package, Ship, MessageSquare,
  Users, MapPin, LogOut, ChevronDown, ChevronRight, ClipboardList,
  UserCheck, Calendar, BarChart3, FileBarChart, Briefcase,
  X, PenTool, HelpCircle, ChevronsLeft, ChevronsRight, PlusCircle,
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
          { label: 'Review List',       path: '/clients?category=review' },
          { label: 'Processing List',   path: '/clients?category=processing' },
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
          { label: 'Certified Applications',  path: '/applications?type=certified' },
          { label: 'Renewals',                path: '/applications?type=renewal' },
          { label: 'Surveillance',            path: '/applications?type=surveillance' },
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
      { icon: Calendar,     label: 'Audits',      path: '/audits' },
      {
        icon: ClipboardList, label: 'Logsheets', path: '/logsheet/manage',
        children: [
          { label: 'Account Approval',      path: '/logsheet/accounts' },
          { label: 'Product Review',        path: '/logsheet/products' },
          { label: 'Manage Logsheet',       path: '/logsheet/manage' },
          { label: 'Waiting for Signature', path: '/logsheet/waiting-signature' },
        ],
      },
      {
        icon: Award, label: 'Certificates', path: '/certificates',
        children: [
          { label: 'All Certificates', path: '/certificates' },
          { label: 'Active',           path: '/certificates?status=active' },
          { label: 'Expired',          path: '/certificates?status=expired' },
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
          { label: 'Add-on Request', path: '/addon-applications?view=request' },
          { label: 'InProgress',     path: '/addon-applications?view=inprogress' },
          { label: 'Add-on List',    path: '/addon-applications?view=list' },
          { label: 'Product List',   path: '/products' },
        ],
      },
    ],
  },
  {
    key: 'people',
    label: 'PEOPLE & SITES',
    items: [
      { icon: UserCheck, label: 'Inspectors', path: '/inspectors' },
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
];

/* ─── Helpers ───────────────────────────────────────────────────── */
function isChildActive(childPath, location) {
  const [childPathname, childSearch = ''] = childPath.split('?');
  const childQuery = childSearch ? `?${childSearch}` : '';
  if (childPathname === '/addon-applications' && childSearch === 'view=list' && location.pathname === '/addon-applications' && !location.search) {
    return true;
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

/* ─── Component ─────────────────────────────────────────────────── */
export default function AdminSidebar({ collapsed, onToggleCollapse, isOpen, onClose }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A';

  /* ── Expanded sub-menu state ── */
  const [expanded, setExpanded] = useState({});

  /* Auto-expand the section that contains the active route */
  useEffect(() => {
    const next = {};
    NAV_SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (item.children) {
          const hasActive = item.children.some(c =>
            isChildActive(c.path, location)
          );
          if (hasActive) next[item.label] = true;
        }
      });
    });
    setExpanded(prev => ({ ...prev, ...next }));
  }, [location.pathname, location.search]);

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
        {NAV_SECTIONS.map((section, sIdx) => (
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
                      <span className="nav-chevron" style={{ marginLeft: 'auto' }}>
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
                          return (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              className={({ isActive }) => `nav-sub-item${active ? ' active' : ''}`}
                            >
                              <span className="nav-item-label">{child.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer: user + logout ── */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{ flexShrink: 0 }}>{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name truncate">{profile?.full_name || 'Admin'}</div>
            <div className="sidebar-user-role">Administrator</div>
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
