import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Award, Package, Ship, MessageSquare,
  Users, MapPin, LogOut, ChevronDown, ChevronRight, ClipboardList,
  UserCheck, Calendar, BarChart3, Settings, Shield, Bell, FileBarChart, Briefcase
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  {
    icon: Users, label: 'Manage Company', path: '/clients',
    children: [
      { label: 'Company List', path: '/clients?category=company' },
      { label: 'Processing List', path: '/clients?category=processing' },
      { label: 'Review Company List', path: '/clients?category=review' },
      { label: 'Bin List', path: '/clients?category=bin' },
    ]
  },
  {
    icon: FileText, label: 'Applications', path: '/applications',
    children: [
      { label: 'Manage Application', path: '/applications' },
      { label: 'New Application', path: '/applications?type=new' },
      { label: 'Renewal Application', path: '/applications?type=renewal' },
      { label: 'Surveillance Application', path: '/applications?type=surveillance' },
    ]
  },
  {
    icon: ClipboardList, label: 'Logsheet', path: '/logsheet',
    children: [
      { label: 'Account Approval', path: '/logsheet/accounts' },
      { label: 'Product Review', path: '/logsheet/products' },
    ]
  },
  {
    icon: Award, label: 'Certificate', path: '/certificates',
    children: [
      { label: 'Manage Certificate', path: '/certificates' },
      { label: 'Active Certificates', path: '/certificates?status=active' },
      { label: 'Expired Certificates', path: '/certificates?status=expired' },
    ]
  },
  { icon: Ship, label: 'Export Certificates', path: '/export' },
  { icon: MessageSquare, label: 'Tickets', path: '/tickets' },
  { icon: UserCheck, label: 'Manage User\'s', path: '/users' },
  { icon: MessageSquare, label: 'Message', path: '/messages' },
  { icon: FileBarChart, label: 'Invoices', path: '/invoices' },
  { icon: BarChart3, label: 'Analytics & Reports', path: '/reports' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function AdminSidebar() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});
  const toggle = (label) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  const initials = profile?.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'A';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/hfa-logo.png" alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', background: 'white', borderRadius: 6, padding: 2 }} />
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">HFA Admin</span>
          <span className="sidebar-logo-sub">Halal Food Authority</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Management</div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isExpanded = expanded[item.label];
          return (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button className="nav-item" onClick={() => toggle(item.label)}>
                    <Icon size={17} /><span>{item.label}</span>
                    <span style={{marginLeft:'auto'}}>{isExpanded?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</span>
                  </button>
                  {isExpanded && (
                    <div className="nav-sub">
                      {item.children.map(child => (
                        <NavLink key={child.path} to={child.path} className={({isActive})=>`nav-item${isActive?' active':''}`}>
                          <span style={{width:17}}/>{child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink to={item.path} className={({isActive})=>`nav-item${isActive?' active':''}`}>
                  <Icon size={17}/>{item.label}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name truncate">{profile?.full_name||'Admin'}</div>
            <div className="sidebar-user-role">Administrator</div>
          </div>
        </div>
        <button className="btn-logout" onClick={()=>{logout();navigate('/login');}}>
          <LogOut size={14}/>Sign Out
        </button>
      </div>
    </aside>
  );
}
