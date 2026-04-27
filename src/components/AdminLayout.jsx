import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, Search, Shield } from 'lucide-react';

const pageTitles = {
  '/dashboard': { title: 'Admin Dashboard', sub: 'System overview and statistics' },
  '/applications': { title: 'Applications', sub: 'Manage all certification applications' },
  '/certificates': { title: 'Certificates', sub: 'Manage issued halal certificates' },
  '/products': { title: 'Products', sub: 'All registered products' },
  '/exports': { title: 'Export Certificates', sub: 'Manage export certificate requests' },
  '/audits': { title: 'Audits', sub: 'Schedule and manage site audits' },
  '/inspectors': { title: 'Inspectors', sub: 'Manage inspector profiles and schedules' },
  '/messages': { title: 'Messages', sub: 'Client communications' },
  '/clients': { title: 'Clients', sub: 'Manage registered client accounts' },
  '/sites': { title: 'Sites', sub: 'All registered business sites' },
  '/invoices': { title: 'Invoices', sub: 'Manage client invoices' },
  '/reports': { title: 'Reports & Analytics', sub: 'System-wide reporting' },
  '/proposals': { title: 'Proposals', sub: 'Manage client proposals' },
};

export default function AdminLayout() {
  const location = useLocation();
  const { profile } = useAuth();
  const page = pageTitles[location.pathname] || { title: 'HFA Admin Portal', sub: '' };

  return (
    <div className="app-layout">
      <AdminSidebar />
      <div className="main-content">
        <header className="topbar">
          <div>
            <div className="topbar-title">{page.title}</div>
            <div className="topbar-subtitle">{page.sub}</div>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn"><Bell size={17}/><span className="notification-dot"/></button>
            <div style={{display:'flex',alignItems:'center',gap:8,paddingLeft:12,borderLeft:'1px solid var(--border)'}}>
              <div className="sidebar-avatar" style={{width:32,height:32,fontSize:12,background:'var(--primary)'}}>
                {profile?.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'A'}
              </div>
              <div style={{display:'flex',flexDirection:'column'}}>
                <span style={{fontSize:13,fontWeight:600}}>{profile?.full_name||'Admin'}</span>
                <span style={{fontSize:11,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:3}}><Shield size={10}/> Administrator</span>
              </div>
            </div>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}
