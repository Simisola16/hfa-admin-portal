import React, { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Download, FileBarChart, Calendar, RefreshCw, TrendingUp, TrendingDown,
  Award, FileText, DollarSign, ShieldAlert, CheckCircle2, AlertTriangle,
  Clock, Users, MessageSquare, Headphones, ChevronRight, Filter, Layers,
  Building, ExternalLink, ShieldCheck, ArrowUpRight, ArrowDownRight,
  Sparkles, Activity, FileSpreadsheet, PieChart as PieIcon, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const BRAND_THEME = {
  primary: '#1B7A7A',
  primaryDark: '#135e5e',
  primaryLight: '#e8f2f2',
  emerald: '#10b981',
  blue: '#3b82f6',
  indigo: '#6366f1',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  teal: '#0d9488',
  slate: '#64748b'
};

const CHART_PALETTE = ['#1B7A7A', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0d9488', '#64748b'];

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('all');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'applications' | 'certificates' | 'financials' | 'audits' | 'support'
  const [exportingType, setExportingType] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStats = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get(`/api/reports/stats?timeframe=${timeframe}`);
      const payload = res.data || res;
      setData(payload);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load report stats:', err);
      if (!isBackground) toast.error('Failed to load reporting metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  // Real-time synchronization via Socket.io
  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    const socket = getSocket(token);
    if (!socket) return;

    const handleDataUpdate = () => {
      fetchStats(true);
    };

    socket.on('ticket_created', handleDataUpdate);
    socket.on('ticket_updated', handleDataUpdate);
    socket.on('application_created', handleDataUpdate);
    socket.on('application_updated', handleDataUpdate);
    socket.on('invoice_created', handleDataUpdate);
    socket.on('invoice_paid', handleDataUpdate);
    socket.on('certificate_issued', handleDataUpdate);

    return () => {
      socket.off('ticket_created', handleDataUpdate);
      socket.off('ticket_updated', handleDataUpdate);
      socket.off('application_created', handleDataUpdate);
      socket.off('application_updated', handleDataUpdate);
      socket.off('invoice_created', handleDataUpdate);
      socket.off('invoice_paid', handleDataUpdate);
      socket.off('certificate_issued', handleDataUpdate);
    };
  }, []);

  const handleExport = async (type) => {
    setExportingType(type);
    try {
      const token = localStorage.getItem('hfa_token');
      const backendUrl = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';
      
      const res = await fetch(`${backendUrl}/api/reports/export?type=${type}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to generate export file');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hfa_${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} CSV report exported!`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to download CSV export');
    } finally {
      setExportingType(null);
    }
  };

  // Safe fallback calculation for charts
  const applicationTrend = useMemo(() => {
    if (data?.applications?.trend && data.applications.trend.length > 0) {
      return data.applications.trend;
    }
    return [
      { name: 'Jan', count: 0 }, { name: 'Feb', count: 0 }, { name: 'Mar', count: 0 },
      { name: 'Apr', count: 0 }, { name: 'May', count: 0 }, { name: 'Jun', count: 0 }
    ];
  }, [data]);

  const statusDistribution = useMemo(() => {
    if (data?.applications?.statusDistribution && data.applications.statusDistribution.length > 0) {
      return data.applications.statusDistribution.map(s => ({
        name: s.name ? s.name.replace(/_/g, ' ').toUpperCase() : 'OTHER',
        value: s.value || s.count || 1
      }));
    }
    return [{ name: 'In Progress', value: 1 }];
  }, [data]);

  const schemeDistribution = useMemo(() => {
    if (data?.applications?.schemeDistribution && data.applications.schemeDistribution.length > 0) {
      return data.applications.schemeDistribution.map(s => ({
        name: s.name || s._id || 'Standard Halal',
        value: s.value || s.count || 1
      }));
    }
    return [{ name: 'Standard HFA', value: 1 }];
  }, [data]);

  const revenueTrend = useMemo(() => {
    if (data?.financials?.trend && data.financials.trend.length > 0) {
      return data.financials.trend;
    }
    return [
      { name: 'Jan', invoiced: 0, paid: 0 }, { name: 'Feb', invoiced: 0, paid: 0 },
      { name: 'Mar', invoiced: 0, paid: 0 }, { name: 'Apr', invoiced: 0, paid: 0 }
    ];
  }, [data]);

  const ticketsByDept = useMemo(() => {
    if (data?.tickets?.byDepartment && data.tickets.byDepartment.length > 0) {
      return data.tickets.byDepartment.map(d => ({
        name: d.name || d._id || 'General Support',
        count: d.count || d.value || 0
      }));
    }
    return [{ name: 'General', count: 0 }];
  }, [data]);

  if (loading && !data) {
    return (
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div className="spinner" style={{ width: 44, height: 44, borderWidth: 3 }} />
        <div style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>
          Synthesizing real-time certification and analytics intelligence...
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 60, maxWidth: 1440, margin: '0 auto' }}>
      {/* Top Header & Executive Control Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20,
        background: '#fff',
        padding: '20px 24px',
        borderRadius: 18,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={24} style={{ color: 'var(--primary)' }} />
              Analytics & Executive Reports
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: '#ecfdf5',
              color: '#059669',
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11.5,
              fontWeight: 700,
              border: '1px solid #bbf7d0'
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              LIVE DATA STREAM
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Executive dashboards, revenue intelligence, audit compliance, and impending certificate expirations.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Timeframe Selector */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            background: '#f8fafc', 
            padding: '5px 12px', 
            borderRadius: 10, 
            border: '1px solid #cbd5e1' 
          }}>
            <Calendar size={14} color="#64748b" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">Past 12 Months</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="btn btn-ghost btn-sm"
            title="Refresh latest metrics"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '7px 12px',
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              background: 'white'
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {/* Export Dropdown Buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => handleExport('applications')}
              disabled={exportingType !== null}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, fontSize: 12.5, fontWeight: 700, padding: '7px 12px' }}
            >
              <FileSpreadsheet size={14} />
              {exportingType === 'applications' ? 'Exporting...' : 'Apps CSV'}
            </button>
            <button
              onClick={() => handleExport('certificates')}
              disabled={exportingType !== null}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, fontSize: 12.5, fontWeight: 700, padding: '7px 12px' }}
            >
              <Award size={14} />
              {exportingType === 'certificates' ? 'Exporting...' : 'Certs CSV'}
            </button>
            <button
              onClick={() => handleExport('invoices')}
              disabled={exportingType !== null}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, fontSize: 12.5, fontWeight: 700, padding: '7px 14px', boxShadow: '0 2px 8px rgba(27,122,122,0.2)' }}
            >
              <Download size={14} />
              {exportingType === 'invoices' ? 'Exporting...' : 'Revenue CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Sector Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 20,
        overflowX: 'auto',
        paddingBottom: 4
      }}>
        {[
          { id: 'overview', label: 'Executive Overview', icon: Layers },
          { id: 'applications', label: 'Applications & Pipeline', icon: FileText },
          { id: 'certificates', label: 'Certificates & Expiries', icon: Award },
          { id: 'financials', label: 'Revenue & Invoicing', icon: DollarSign },
          { id: 'audits', label: 'Audits & NC Compliance', icon: ShieldCheck },
          { id: 'support', label: 'Helpdesk Operations', icon: Headphones }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                border: isActive ? '1.5px solid var(--primary)' : '1px solid #e2e8f0',
                background: isActive ? 'var(--primary)' : '#fff',
                color: isActive ? '#fff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 4px 12px rgba(27, 122, 122, 0.2)' : '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 6 Executive KPI Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {/* 1. Applications */}
        <div className="card" style={{ padding: '18px 20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Total Applications</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {data?.applications?.total || 0}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: 6 }}>
              {data?.applications?.approvalRate || 0}% Approved
            </span>
            <span style={{ color: '#64748b' }}>in pipeline</span>
          </div>
        </div>

        {/* 2. Active Certificates */}
        <div className="card" style={{ padding: '18px 20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Active Certificates</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {data?.certificates?.active || 0}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: (data?.certificates?.expiringSoon30 || 0) > 0 ? '#dc2626' : '#64748b', background: (data?.certificates?.expiringSoon30 || 0) > 0 ? '#fef2f2' : '#f8fafc', padding: '2px 6px', borderRadius: 6 }}>
              {data?.certificates?.expiringSoon30 || 0} expiring &lt;30d
            </span>
          </div>
        </div>

        {/* 3. Invoiced & Revenue */}
        <div className="card" style={{ padding: '18px 20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Revenue Invoiced</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            £{(data?.financials?.totalInvoiced || 0).toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: 6 }}>
              {data?.financials?.collectionRate || 0}% Collected
            </span>
            <span style={{ color: '#64748b' }}>£{(data?.financials?.paidAmount || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* 4. Audit & Compliance */}
        <div className="card" style={{ padding: '18px 20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Audit Compliance</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {data?.audits?.complianceRate || 100}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: (data?.audits?.activeNCs || 0) > 0 ? '#b45309' : '#059669', background: (data?.audits?.activeNCs || 0) > 0 ? '#fffbeb' : '#ecfdf5', padding: '2px 6px', borderRadius: 6 }}>
              {data?.audits?.activeNCs || 0} active NCs
            </span>
            <span style={{ color: '#64748b' }}>{data?.audits?.completed || 0} done</span>
          </div>
        </div>

        {/* 5. Support Resolution */}
        <div className="card" style={{ padding: '18px 20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Ticket Resolution</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
              <Headphones size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {data?.tickets?.resolutionRate || 100}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: 6 }}>
              {(data?.tickets?.open || 0) + (data?.tickets?.inProgress || 0)} pending
            </span>
            <span style={{ color: '#64748b' }}>{data?.tickets?.total || 0} total</span>
          </div>
        </div>

        {/* 6. Client Base */}
        <div className="card" style={{ padding: '18px 20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Certified Clients</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {data?.clients?.total || 0}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUp size={13} />
              +{data?.clients?.growthRate || 0}%
            </span>
            <span style={{ color: '#64748b' }}>({data?.clients?.newThisMonth || 0} new)</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics View */}
      {(activeTab === 'overview' || activeTab === 'applications') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20, marginBottom: 24 }}>
          {/* Applications Trend */}
          <div className="card" style={{ padding: 24, borderRadius: 18, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>Application Ingestion Trend</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Monthly new Halal certification applications</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: '#f0fdfa', padding: '3px 10px', borderRadius: 8, border: '1px solid #ccfbf1' }}>
                Last 6 Months
              </span>
            </div>
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer>
                <AreaChart data={applicationTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12.5, fontWeight: 700 }}
                  />
                  <Area type="monotone" dataKey="count" name="Applications" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorApp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution Pie */}
          <div className="card" style={{ padding: 24, borderRadius: 18, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>Application Status Distribution</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Current stage of active & completed certifications</p>
              </div>
            </div>
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12.5 }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Financials & Revenue Section */}
      {(activeTab === 'overview' || activeTab === 'financials') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20, marginBottom: 24 }}>
          {/* Revenue Trend BarChart */}
          <div className="card" style={{ padding: 24, borderRadius: 18, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>Financial Performance (£)</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Invoiced vs Paid fees across recent billing cycles</p>
              </div>
              <button
                onClick={() => handleExport('invoices')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer>
                <BarChart data={revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12.5 }}
                    formatter={(val) => [`£${val.toLocaleString()}`, '']}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 12, paddingBottom: 10, fontWeight: 600 }} />
                  <Bar dataKey="invoiced" name="Invoiced (£)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paid" name="Collected (£)" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scheme Breakdown */}
          <div className="card" style={{ padding: 24, borderRadius: 18, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>Certification Scheme Breakdown</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Distribution of applications across Halal standards</p>
              </div>
            </div>
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={schemeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {schemeDistribution.map((entry, index) => (
                      <Cell key={`cell-scheme-${index}`} fill={CHART_PALETTE[(index + 2) % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12.5 }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Support & Audit Operations Section */}
      {(activeTab === 'overview' || activeTab === 'audits' || activeTab === 'support') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20, marginBottom: 24 }}>
          {/* Helpdesk Volume by Department */}
          <div className="card" style={{ padding: 24, borderRadius: 18, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>Helpdesk Volume by Department</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Client inquiry distribution and resolution load</p>
              </div>
              <Link to="/tickets" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Open Desk <ChevronRight size={14} />
              </Link>
            </div>
            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer>
                <BarChart data={ticketsByDept} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} width={120} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12.5 }}
                  />
                  <Bar dataKey="count" name="Tickets" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Audit & NC Compliance Card */}
          <div className="card" style={{ padding: 24, borderRadius: 18, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>Audit Quality & Corrective Actions</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Site inspection outcomes and Non-Conformance status</p>
              </div>
              <Link to="/audits" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Manage Audits <ChevronRight size={14} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
              <div style={{ padding: '16px 18px', background: '#f8fafc', borderRadius: 14, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Scheduled Audits</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                  {data?.audits?.scheduled || 0}
                </div>
                <div style={{ fontSize: 11.5, color: '#059669', marginTop: 4, fontWeight: 700 }}>
                  {data?.audits?.completed || 0} completed to date
                </div>
              </div>

              <div style={{ padding: '16px 18px', background: '#f8fafc', borderRadius: 14, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Active NC Reports</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: (data?.audits?.activeNCs || 0) > 0 ? '#dc2626' : '#059669', marginTop: 4 }}>
                  {data?.audits?.activeNCs || 0}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  {data?.audits?.resolvedNCs || 0} resolved ({data?.audits?.complianceRate || 100}%)
                </div>
              </div>
            </div>

            {/* Compliance Progress Bar */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
                <span style={{ color: '#475569' }}>Overall Non-Conformance Resolution Rate</span>
                <span style={{ color: 'var(--primary)' }}>{data?.audits?.complianceRate || 100}%</span>
              </div>
              <div style={{ width: '100%', height: 10, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${data?.audits?.complianceRate || 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--primary) 0%, #10b981 100%)',
                    borderRadius: 6,
                    transition: 'width 0.5s ease'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Certificates Watchlist */}
      {(activeTab === 'overview' || activeTab === 'certificates') && (
        <div className="card" style={{ padding: 24, borderRadius: 18, border: '1px solid #e2e8f0', background: '#fff', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Certificate Expiration Watchlist
                </h3>
                <span style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 800
                }}>
                  {data?.certificates?.expiringWatchlist?.length || 0} Impending Expirations
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                Halal certificates requiring annual renewal audit or surveillance inspection
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleExport('certificates')}
                className="btn btn-outline btn-sm"
                style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <Download size={13} /> Export Watchlist
              </button>
              <Link to="/certificates" className="btn btn-primary btn-sm" style={{ fontSize: 12.5, textDecoration: 'none', fontWeight: 700 }}>
                Manage All Certificates
              </Link>
            </div>
          </div>

          {(!data?.certificates?.expiringWatchlist || data.certificates.expiringWatchlist.length === 0) ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b' }}>
              <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>All Certificates in Good Standing</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>No active certificates are nearing immediate expiration.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Certificate No.</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Company Name</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Scheme Standard</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Expiry Date</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Urgency Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.certificates.expiringWatchlist.map((cert) => {
                    const expiry = new Date(cert.expiry_date);
                    const now = new Date();
                    const diffTime = expiry - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isUrgent = diffDays <= 30;

                    return (
                      <tr key={cert._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--primary)' }}>
                          {cert.certificate_number}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1e293b' }}>
                          {cert.company_name || 'Client Entity'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748b' }}>
                          {cert.certificate_type || 'Standard Halal Scheme'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#334155', fontWeight: 600 }}>
                          {expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: isUrgent ? '#fef2f2' : '#fffbeb',
                            color: isUrgent ? '#dc2626' : '#b45309',
                            border: `1px solid ${isUrgent ? '#fecaca' : '#fde68a'}`
                          }}>
                            {isUrgent ? <AlertTriangle size={12} /> : <Clock size={12} />}
                            {diffDays <= 0 ? 'Expired' : `${diffDays} days left`}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <Link
                            to="/certificates"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 12, padding: '5px 12px', color: 'var(--primary)', fontWeight: 700 }}
                          >
                            Review Renewal
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Footer Timestamp */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: '#f8fafc',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        fontSize: 12,
        color: '#64748b'
      }}>
        <span>Halal Food Authority (HFA) Executive Intelligence & Compliance Systems</span>
        <span>Last data synchronization: {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </div>
    </div>
  );
}
