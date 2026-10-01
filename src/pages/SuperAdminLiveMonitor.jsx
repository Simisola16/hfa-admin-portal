import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import {
  Activity, Users, Shield, Building2, Radio, Search, Filter,
  RefreshCw, Volume2, VolumeX, ArrowUpRight, ArrowDownLeft,
  Clock, CheckCircle2, XCircle, LogIn, LogOut, Laptop, Sparkles,
  Wifi, WifiOff, Eye, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Gentle Web Audio Chime Generator ────────────────────────── */
function playChime(type = 'signin') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    if (type === 'signin') {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(392.00, now + 0.15); // G4
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch {}
}

/* ─── Relative Time Formatter ──────────────────────────────────── */
function formatRelativeTime(date) {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return 'Just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatExactTime(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export default function SuperAdminLiveMonitor() {
  const { profile } = useAuth();
  const userRoles = Array.isArray(profile?.roles) && profile.roles.length > 0 ? profile.roles : (profile?.role ? [profile.role] : []);
  const isSuperAdmin = userRoles.includes('superadmin') || profile?.role === 'superadmin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('hfa_monitor_sound') !== 'false';
  });

  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalOnline: 0,
    totalOffline: 0,
    adminCount: 0,
    onlineAdminsCount: 0,
    offlineAdminsCount: 0,
    clientCount: 0,
    onlineClientsCount: 0,
    offlineClientsCount: 0,
  });

  const [admins, setAdmins] = useState([]);
  const [clients, setClients] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'admins', 'clients', 'logs'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'online', 'offline'
  const [searchQuery, setSearchQuery] = useState('');

  const [recentLiveEvents, setRecentLiveEvents] = useState([]);
  const socketRef = useRef(null);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('hfa_monitor_sound', String(next));
      if (next) playChime('signin');
      return next;
    });
  };

  /* ─── Fetch Initial Data ─────────────────────────────────────── */
  const fetchPresenceData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [presenceRes, logsRes] = await Promise.all([
        api.get('/api/superadmin/presence'),
        api.get('/api/superadmin/activity-logs?limit=100')
      ]);

      if (presenceRes) {
        setSummary(presenceRes.summary || {});
        setAdmins(presenceRes.admins || []);
        setClients(presenceRes.clients || []);
      }
      if (logsRes?.logs) {
        setActivityLogs(logsRes.logs);
      }
      if (isManual) toast.success('Live monitor synchronized');
    } catch (err) {
      console.error('Failed to load presence data:', err);
      if (isManual) toast.error('Failed to update live monitor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchPresenceData();
  }, [isSuperAdmin]);

  /* ─── Real-Time Socket Connection ────────────────────────────── */
  useEffect(() => {
    if (!isSuperAdmin) return;
    const token = localStorage.getItem('hfa_token');
    if (!token) return;

    const socket = getSocket(token);
    if (!socket) return;
    socketRef.current = socket;

    // Presence update listener (connect / disconnect)
    const handlePresenceUpdate = (data) => {
      if (!data) return;
      const { userId, is_online, user_type, name, last_active_at } = data;

      // Update state dynamically
      if (user_type === 'admin') {
        setAdmins(prev => prev.map(a => a.id?.toString() === userId?.toString() ? { ...a, is_online, last_active_at } : a));
      } else {
        setClients(prev => prev.map(c => c.id?.toString() === userId?.toString() ? { ...c, is_online, last_active_at } : c));
      }

      // Update summary counts
      setSummary(prev => {
        const delta = is_online ? 1 : -1;
        if (user_type === 'admin') {
          const newOnlineAdmins = Math.max(0, (prev.onlineAdminsCount || 0) + delta);
          return {
            ...prev,
            onlineAdminsCount: newOnlineAdmins,
            offlineAdminsCount: Math.max(0, (prev.adminCount || 0) - newOnlineAdmins),
            totalOnline: Math.max(0, (prev.totalOnline || 0) + delta),
            totalOffline: Math.max(0, (prev.totalOffline || 0) - delta),
          };
        } else {
          const newOnlineClients = Math.max(0, (prev.onlineClientsCount || 0) + delta);
          return {
            ...prev,
            onlineClientsCount: newOnlineClients,
            offlineClientsCount: Math.max(0, (prev.clientCount || 0) - newOnlineClients),
            totalOnline: Math.max(0, (prev.totalOnline || 0) + delta),
            totalOffline: Math.max(0, (prev.totalOffline || 0) - delta),
          };
        }
      });
    };

    // User Sign-in / Sign-out Event Listener
    const handleUserEvent = (event) => {
      if (!event) return;
      const isSignIn = event.type === 'sign_in';

      // Play audio chime if enabled
      if (soundEnabled) {
        playChime(isSignIn ? 'signin' : 'signout');
      }

      // Add to live events banner queue
      setRecentLiveEvents(prev => [
        { ...event, id: Math.random().toString(36).slice(2), receivedAt: new Date() },
        ...prev.slice(0, 4)
      ]);

      // Add to activity logs view
      setActivityLogs(prev => [
        {
          _id: Math.random().toString(36).slice(2),
          user_id: event.userId,
          name: event.name,
          username: event.username,
          email: event.email,
          role: event.role,
          user_type: event.user_type,
          action: isSignIn ? 'sign_in' : 'sign_out',
          created_at: event.timestamp || new Date(),
        },
        ...prev
      ]);

      // Update user login/logout timestamp in list
      if (event.user_type === 'admin') {
        setAdmins(prev => prev.map(a => {
          if (a.id?.toString() === event.userId?.toString()) {
            return {
              ...a,
              is_online: isSignIn,
              last_login_at: isSignIn ? event.timestamp : a.last_login_at,
              last_logout_at: !isSignIn ? event.timestamp : a.last_logout_at,
              last_active_at: event.timestamp,
            };
          }
          return a;
        }));
      } else {
        setClients(prev => prev.map(c => {
          if (c.id?.toString() === event.userId?.toString()) {
            return {
              ...c,
              is_online: isSignIn,
              last_login_at: isSignIn ? event.timestamp : c.last_login_at,
              last_logout_at: !isSignIn ? event.timestamp : c.last_logout_at,
              last_active_at: event.timestamp,
            };
          }
          return c;
        }));
      }
    };

    socket.on('superadmin_presence_update', handlePresenceUpdate);
    socket.on('superadmin_user_event', handleUserEvent);

    return () => {
      socket.off('superadmin_presence_update', handlePresenceUpdate);
      socket.off('superadmin_user_event', handleUserEvent);
    };
  }, [isSuperAdmin, soundEnabled]);

  /* ─── Filtered Lists ─────────────────────────────────────────── */
  const allUsersList = useMemo(() => {
    return [...admins, ...clients];
  }, [admins, clients]);

  const currentDisplayList = useMemo(() => {
    let list = [];
    if (activeTab === 'admins') list = admins;
    else if (activeTab === 'clients') list = clients;
    else list = allUsersList;

    // Filter by online status
    if (statusFilter === 'online') {
      list = list.filter(u => u.is_online);
    } else if (statusFilter === 'offline') {
      list = list.filter(u => !u.is_online);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.company_name?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    }

    // Sort: Online users first, then by last active
    return list.sort((a, b) => {
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;
      const timeA = new Date(a.last_active_at || a.last_login_at || 0).getTime();
      const timeB = new Date(b.last_active_at || b.last_login_at || 0).getTime();
      return timeB - timeA;
    });
  }, [activeTab, statusFilter, searchQuery, admins, clients, allUsersList]);

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: 16, margin: 24, border: '1px solid #fee2e2' }}>
        <Shield size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#991b1b', marginBottom: 8 }}>Superadmin Authorization Required</h2>
        <p style={{ color: '#64748b', fontSize: 14, maxWidth: 460, margin: '0 auto' }}>
          This console provides real-time monitoring of all active staff and client sessions across the HFA platform. It is strictly reserved for Superadmin accounts.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Top Header Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        color: '#ffffff',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{
                background: 'rgba(250, 204, 21, 0.2)',
                color: '#facc15',
                border: '1px solid rgba(250, 204, 21, 0.4)',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.05em',
                padding: '4px 10px',
                borderRadius: 20,
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}>
                👑 SUPERADMIN EXCLUSIVE
              </span>
              <span style={{
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 20,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', display: 'inline-block' }} />
                REAL-TIME RADAR LIVE
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 6px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Live User Presence & Activity Monitor
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
              Live tracking of online staff, client portals, real-time sign-ins and sign-outs across the platform.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute notification sound on user sign in/out' : 'Unmute notification sound on user sign in/out'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                background: soundEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${soundEnabled ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
                borderRadius: 12,
                color: soundEnabled ? '#86efac' : '#cbd5e1',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{soundEnabled ? 'Sound On' : 'Sound Muted'}</span>
            </button>

            {/* Manual Sync Button */}
            <button
              onClick={() => fetchPresenceData(true)}
              disabled={refreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 12,
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Live Activity Flashes (if any recent events) ── */}
      {recentLiveEvents.length > 0 && (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentLiveEvents.map(evt => {
            const isSignIn = evt.type === 'sign_in';
            return (
              <div
                key={evt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  background: isSignIn ? '#f0fdf4' : '#fef2f2',
                  border: `1.5px solid ${isSignIn ? '#86efac' : '#fca5a5'}`,
                  borderRadius: 12,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isSignIn ? '#dcfce7' : '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {isSignIn ? <LogIn size={16} style={{ color: '#16a34a' }} /> : <LogOut size={16} style={{ color: '#dc2626' }} />}
                  </div>
                  <div>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 13 }}>{evt.name}</span>
                    <span style={{ fontSize: 12, color: '#475569', marginLeft: 6 }}>
                      ({evt.user_type === 'admin' ? (evt.role || 'Staff Admin') : 'Client'}) {isSignIn ? 'just signed in to the portal' : 'signed out'}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                  {formatRelativeTime(evt.receivedAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Summary Metrics Cards (4 Grid) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        
        {/* Total Active Now */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: '20px 24px',
          border: '1.5px solid #bbf7d0',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Online Now</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#dcfce7',
              color: '#15803d',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              LIVE
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{summary.totalOnline || 0}</span>
            <span style={{ fontSize: 13, color: '#64748b' }}>users connected</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#15803d', fontWeight: 600 }}>
            🟢 {summary.onlineAdminsCount || 0} Staff &nbsp;•&nbsp; 🟢 {summary.onlineClientsCount || 0} Clients
          </div>
        </div>

        {/* Staff Presence */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>HFA Staff / Admins</span>
            <Shield size={18} style={{ color: '#3b82f6' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{summary.onlineAdminsCount || 0}</span>
            <span style={{ fontSize: 13, color: '#64748b' }}>of {summary.adminCount || 0} online</span>
          </div>
          <div style={{ marginTop: 10, width: '100%', height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: '#3b82f6',
              width: `${summary.adminCount ? Math.round((summary.onlineAdminsCount / summary.adminCount) * 100) : 0}%`,
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Client Presence */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Client Portals</span>
            <Building2 size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{summary.onlineClientsCount || 0}</span>
            <span style={{ fontSize: 13, color: '#64748b' }}>of {summary.clientCount || 0} online</span>
          </div>
          <div style={{ marginTop: 10, width: '100%', height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: '#10b981',
              width: `${summary.clientCount ? Math.round((summary.onlineClientsCount / summary.clientCount) * 100) : 0}%`,
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Offline / Inactive */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Currently Offline</span>
            <WifiOff size={18} style={{ color: '#94a3b8' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#64748b', letterSpacing: '-0.03em' }}>{summary.totalOffline || 0}</span>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>accounts inactive</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
            ⚪ {summary.offlineAdminsCount || 0} Staff &nbsp;•&nbsp; ⚪ {summary.offlineClientsCount || 0} Clients
          </div>
        </div>

      </div>

      {/* ── Main Monitor Card ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: 20,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>
        
        {/* Navigation Tabs Header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'all' ? '#0f172a' : '#ffffff',
                color: activeTab === 'all' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'all' ? '0 2px 6px rgba(15,23,42,0.2)' : 'none'
              }}
            >
              All Users ({allUsersList.length})
            </button>

            <button
              onClick={() => setActiveTab('admins')}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'admins' ? '#0f172a' : '#ffffff',
                color: activeTab === 'admins' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'admins' ? '0 2px 6px rgba(15,23,42,0.2)' : 'none'
              }}
            >
              HFA Staff ({admins.length})
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'clients' ? '#0f172a' : '#ffffff',
                color: activeTab === 'clients' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'clients' ? '0 2px 6px rgba(15,23,42,0.2)' : 'none'
              }}
            >
              Clients ({clients.length})
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'logs' ? '#0f172a' : '#ffffff',
                color: activeTab === 'logs' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'logs' ? '0 2px 6px rgba(15,23,42,0.2)' : 'none'
              }}
            >
              Live Sign-In/Out Audit Log ({activityLogs.length})
            </button>
          </div>

          {activeTab !== 'logs' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Online/Offline Pills */}
              <button
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: statusFilter === 'all' ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                  background: statusFilter === 'all' ? '#f1f5f9' : '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('online')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  border: statusFilter === 'online' ? '1.5px solid #16a34a' : '1px solid #bbf7d0',
                  background: statusFilter === 'online' ? '#dcfce7' : '#ffffff',
                  color: '#15803d',
                  cursor: 'pointer'
                }}
              >
                🟢 Online ({summary.totalOnline || 0})
              </button>
              <button
                onClick={() => setStatusFilter('offline')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: statusFilter === 'offline' ? '1.5px solid #64748b' : '1px solid #e2e8f0',
                  background: statusFilter === 'offline' ? '#f1f5f9' : '#ffffff',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                ⚪ Offline ({summary.totalOffline || 0})
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        {activeTab !== 'logs' && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 450 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by name, company, email or role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ padding: '8px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: 12, color: '#64748b', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
              Showing {currentDisplayList.length} accounts
            </span>
          </div>
        )}

        {/* ── Tab Content ── */}
        {loading ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#16a34a' }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Connecting to Live Presence Radar...</div>
          </div>
        ) : activeTab === 'logs' ? (
          /* ─── Activity Log Stream ─── */
          <div style={{ padding: 24 }}>
            {activityLogs.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <Clock size={36} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                <p style={{ margin: 0, fontSize: 14 }}>No sign-in or sign-out logs recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activityLogs.map((log) => {
                  const isSignIn = log.action === 'sign_in';
                  const isClient = log.user_type === 'client';
                  const roleBadge = isClient ? 'Client' : (log.role || 'Admin');
                  return (
                    <div
                      key={log._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 20px',
                        background: isSignIn ? '#fbfdfb' : '#fffcfc',
                        border: `1px solid ${isSignIn ? '#dcfce7' : '#fee2e2'}`,
                        borderRadius: 14,
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: isSignIn ? '#dcfce7' : '#fee2e2',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isSignIn ? <LogIn size={18} style={{ color: '#16a34a' }} /> : <LogOut size={18} style={{ color: '#dc2626' }} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{log.name}</span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: isClient ? '#e0f2fe' : '#fef3c7',
                              color: isClient ? '#0369a1' : '#b45309',
                              textTransform: 'uppercase'
                            }}>
                              {roleBadge}
                            </span>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: isSignIn ? '#15803d' : '#b91c1c'
                            }}>
                              {isSignIn ? 'Signed In' : 'Signed Out'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {log.email} {log.ip_address ? `• IP: ${log.ip_address}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                          {formatRelativeTime(log.created_at)}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                          {formatExactTime(log.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ─── User Presence Table ─── */
          <div style={{ overflowX: 'auto' }}>
            {currentDisplayList.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <Users size={36} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                <p style={{ margin: 0, fontSize: 14 }}>No matching accounts found for the selected filter.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '14px 20px' }}>User / Account</th>
                    <th style={{ padding: '14px 20px' }}>Role / Type</th>
                    <th style={{ padding: '14px 20px' }}>Live Status</th>
                    <th style={{ padding: '14px 20px' }}>Last Sign In</th>
                    <th style={{ padding: '14px 20px' }}>Last Sign Out</th>
                    <th style={{ padding: '14px 20px' }}>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDisplayList.map((user) => {
                    const isClient = user.user_type === 'client';
                    const initials = (user.name || user.username || 'U')
                      .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                    return (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: user.is_online ? '#fcfdfc' : '#ffffff',
                          transition: 'background 0.1s'
                        }}
                      >
                        {/* Name & Avatar */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              position: 'relative',
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: isClient ? '#dcfce7' : '#e0e7ff',
                              color: isClient ? '#15803d' : '#4338ca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 13,
                              flexShrink: 0
                            }}>
                              {initials}
                              {/* Pulse badge dot */}
                              <span style={{
                                position: 'absolute',
                                bottom: -1,
                                right: -1,
                                width: 11,
                                height: 11,
                                borderRadius: '50%',
                                background: user.is_online ? '#22c55e' : '#cbd5e1',
                                border: '2px solid #ffffff',
                                boxShadow: user.is_online ? '0 0 6px #22c55e' : 'none'
                              }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                                {user.name}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>
                                {user.email} {user.username ? `(@${user.username})` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role / Type */}
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 14,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isClient ? '#e0f2fe' : (user.role === 'superadmin' ? '#fef3c7' : '#f1f5f9'),
                            color: isClient ? '#0369a1' : (user.role === 'superadmin' ? '#92400e' : '#334155'),
                            textTransform: 'capitalize'
                          }}>
                            {isClient ? `Client (${user.client_role || 'member'})` : (user.role || 'Staff').replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Live Status */}
                        <td style={{ padding: '14px 20px' }}>
                          {user.is_online ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                              Online Now
                            </div>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 12 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />
                              Offline
                            </div>
                          )}
                        </td>

                        {/* Last Sign In */}
                        <td style={{ padding: '14px 20px', fontSize: 12.5, color: '#334155' }}>
                          <div title={formatExactTime(user.last_login_at)}>
                            {formatRelativeTime(user.last_login_at)}
                          </div>
                        </td>

                        {/* Last Sign Out */}
                        <td style={{ padding: '14px 20px', fontSize: 12.5, color: '#64748b' }}>
                          <div title={formatExactTime(user.last_logout_at)}>
                            {formatRelativeTime(user.last_logout_at)}
                          </div>
                        </td>

                        {/* Last Active */}
                        <td style={{ padding: '14px 20px', fontSize: 12.5, color: '#475569' }}>
                          <div title={formatExactTime(user.last_active_at)}>
                            {user.is_online ? (
                              <span style={{ color: '#16a34a', fontWeight: 600 }}>Active now</span>
                            ) : (
                              formatRelativeTime(user.last_active_at)
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
