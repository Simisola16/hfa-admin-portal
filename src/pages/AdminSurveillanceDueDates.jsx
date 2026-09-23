import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Calendar, Search, RefreshCw, Building2, MapPin, User,
  FileText, Clock, AlertTriangle, CheckCircle, ArrowRight,
  Filter, ChevronRight, Edit3, X, Mail, Send, Check, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ActionModal, { ActionTriggerButton } from '../components/ActionModal';

export default function AdminSurveillanceDueDates() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionModalItem, setActionModalItem] = useState(null);

  // Edit date modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Remind client modal state
  const [remindingItem, setRemindingItem] = useState(null);
  const [customReminderMsg, setCustomReminderMsg] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/surveillance-schedules');
      const data = res.data?.data || res.data || [];
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching surveillance schedules:', err);
      toast.error('Failed to load surveillance due dates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    const formatted = item.next_surveillance_due_date
      ? new Date(item.next_surveillance_due_date).toISOString().split('T')[0]
      : '';
    setEditDate(formatted);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem || !editDate) return;
    setSavingEdit(true);
    try {
      const adminName =
        user?.full_name ||
        user?.name ||
        user?.username ||
        editingItem.admin_name ||
        'Admin';

      await api.put(`/api/surveillance-schedules/${editingItem._id}`, {
        next_surveillance_due_date: editDate,
        admin_name: adminName,
        notes: editNotes
      });
      toast.success('Surveillance due date updated successfully.');
      setEditingItem(null);
      fetchSchedules();
    } catch (err) {
      console.error('Error updating surveillance date:', err);
      toast.error('Failed to update surveillance due date.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenRemind = (item) => {
    setRemindingItem(item);
    setCustomReminderMsg('');
  };

  const handleSendReminder = async (e) => {
    if (e) e.preventDefault();
    if (!remindingItem) return;
    setSendingReminder(true);
    try {
      const res = await api.post(`/api/surveillance-schedules/${remindingItem._id}/remind`, {
        custom_message: customReminderMsg.trim()
      });
      toast.success(res.data?.message || 'Surveillance reminder email sent to client.');
      setRemindingItem(null);
      fetchSchedules();
    } catch (err) {
      console.error('Error sending surveillance reminder:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to send surveillance reminder.');
    } finally {
      setSendingReminder(false);
    }
  };

  // Helper to determine status and days diff
  const getDateStatus = (dueDateStr) => {
    if (!dueDateStr) return { status: 'pending', days: null, label: 'Unset', color: '#64748b', bg: '#f1f5f9' };
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'overdue', days: Math.abs(diffDays), label: `${Math.abs(diffDays)}d Overdue`, color: '#b91c1c', bg: '#fef2f2' };
    }
    if (diffDays <= 60) {
      return { status: 'due_soon', days: diffDays, label: `Due in ${diffDays}d`, color: '#b45309', bg: '#fffbeb' };
    }
    return { status: 'scheduled', days: diffDays, label: `Due in ${diffDays}d`, color: '#047857', bg: '#ecfdf5' };
  };

  // Stats calculation
  const stats = useMemo(() => {
    let overdueCount = 0;
    let dueSoonCount = 0;
    let scheduledCount = 0;

    schedules.forEach((item) => {
      const st = getDateStatus(item.next_surveillance_due_date).status;
      if (st === 'overdue') overdueCount++;
      else if (st === 'due_soon') dueSoonCount++;
      else scheduledCount++;
    });

    return {
      total: schedules.length,
      overdue: overdueCount,
      dueSoon: dueSoonCount,
      scheduled: scheduledCount
    };
  }, [schedules]);

  // Filtering
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (item.company_name || '').toLowerCase().includes(q) ||
        (item.site_name || '').toLowerCase().includes(q) ||
        (item.application_number || '').toLowerCase().includes(q) ||
        (item.admin_name || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      const st = getDateStatus(item.next_surveillance_due_date).status;
      return st === statusFilter;
    });
  }, [schedules, search, statusFilter]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <Calendar size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                Surveillance Due Dates
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                Track and monitor GSO certified facilities and their upcoming surveillance audit due dates
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSchedules}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#334155',
            fontSize: '13px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        {/* Total Registered */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Total Registered</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={16} color="#475569" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '10px' }}>
            {stats.total}
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>GSO Facilities scheduled</span>
        </div>

        {/* Due Soon */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #fef3c7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#92400e' }}>Due Soon (≤ 60 Days)</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#b45309', marginTop: '10px' }}>
            {stats.dueSoon}
          </div>
          <span style={{ fontSize: '12px', color: '#b45309' }}>Requires client outreach</span>
        </div>

        {/* Overdue */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #fee2e2',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#991b1b' }}>Overdue</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} color="#ef4444" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626', marginTop: '10px' }}>
            {stats.overdue}
          </div>
          <span style={{ fontSize: '12px', color: '#dc2626' }}>Past scheduled due date</span>
        </div>

        {/* Scheduled / On Track */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #dcfce7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#166534' }}>Scheduled On Track</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={16} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#15803d', marginTop: '10px' }}>
            {stats.scheduled}
          </div>
          <span style={{ fontSize: '12px', color: '#15803d' }}>&gt; 60 days ahead</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '450px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search company, site, app number, or admin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Status' },
            { id: 'due_soon', label: 'Due Soon' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'scheduled', label: 'On Track' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: statusFilter === tab.id ? '#065f46' : '#f1f5f9',
                color: statusFilter === tab.id ? '#ffffff' : '#475569',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>Loading surveillance schedules...</p>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <Calendar size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: '#334155' }}>
              No Surveillance Schedules Found
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Surveillance schedules will appear here automatically when GSO logsheets are marked successful.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569' }}>Company & Site</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Application</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Date Created</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Next Surveillance Due Date</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Admin Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Notes</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ divideY: '1px solid #f1f5f9' }}>
                {filteredSchedules.map((item) => {
                  const dateInfo = getDateStatus(item.next_surveillance_due_date);
                  const formattedDue = item.next_surveillance_due_date
                    ? new Date(item.next_surveillance_due_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'N/A';

                  const formattedCreated = item.created_at
                    ? new Date(item.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'N/A';

                  return (
                    <tr
                      key={item._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fcfdfe')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      {/* Company & Site */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: '#ecfdf5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 2
                            }}
                          >
                            <Building2 size={16} color="#047857" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>
                              {item.company_name || 'N/A'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', color: '#64748b', fontSize: '12px' }}>
                              <MapPin size={12} />
                              <span>{item.site_name || 'Main Facility'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Application Info */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ fontWeight: 500, color: '#334155' }}>
                          {item.application_number || 'N/A'}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: '#e0f2fe',
                            color: '#0369a1',
                            textTransform: 'capitalize'
                          }}
                        >
                          {item.application_type || 'GSO'}
                        </span>
                      </td>

                      {/* Date Created */}
                      <td style={{ padding: '16px 16px', color: '#475569' }}>
                        {formattedCreated}
                      </td>

                      {/* Next Surveillance Due Date */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {formattedDue}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: dateInfo.bg,
                              color: dateInfo.color,
                              alignSelf: 'flex-start'
                            }}
                          >
                            {dateInfo.label}
                          </span>
                          {item.last_reminded_at && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                color: '#0284c7',
                                fontWeight: 500
                              }}
                              title={`Last reminder sent on ${new Date(item.last_reminded_at).toLocaleString('en-GB')}`}
                            >
                              <Mail size={11} />
                              <span>Reminded: {new Date(item.last_reminded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}{item.reminder_count > 1 ? ` (${item.reminder_count}x)` : ''}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Admin Name */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                          <User size={13} color="#64748b" />
                          <span style={{ fontWeight: 500 }}>{item.admin_name || 'System Admin'}</span>
                        </div>
                      </td>

                      {/* Notes */}
                      <td style={{ padding: '16px 16px', maxWidth: '200px' }}>
                        <div
                          style={{
                            color: '#64748b',
                            fontSize: '12px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={item.notes}
                        >
                          {item.notes || '—'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <ActionTriggerButton
                          onClick={() => setActionModalItem(item)}
                          title="Surveillance Actions"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Menu Pop-up Modal */}
      {actionModalItem && (
        <ActionModal
          isOpen={Boolean(actionModalItem)}
          onClose={() => setActionModalItem(null)}
          title="Surveillance Action"
          subtitle={actionModalItem.company_name || 'GSO Certified Facility'}
          badge={
            <span style={{ fontSize: 11.5, color: '#64748b' }}>
              App #{actionModalItem.application_number || 'N/A'} • Site: {actionModalItem.site_name || 'Main Facility'}
            </span>
          }
          actions={[
            actionModalItem.application_id && {
              label: 'Application Processing',
              description: 'Open complete stage workflow & audit details',
              icon: Settings,
              variant: 'primary',
              onClick: () => {
                const targetAppId = actionModalItem.application_id?._id || actionModalItem.application_id;
                if (targetAppId) {
                  navigate(`/applications/${targetAppId}/processing`);
                }
              }
            },
            {
              label: 'Send Email Reminder',
              description: 'Notify client about upcoming surveillance due date',
              icon: Mail,
              variant: 'success',
              onClick: () => handleOpenRemind(actionModalItem)
            },
            {
              label: 'Edit Due Date',
              description: 'Update scheduled surveillance audit date & notes',
              icon: Edit3,
              variant: 'default',
              onClick: () => handleOpenEdit(actionModalItem)
            }
          ].filter(Boolean)}
        />
      )}


      {/* Edit Surveillance Date Modal */}
      {editingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#065f46',
                color: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Update Surveillance Due Date</h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Company Name
                </label>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                  {editingItem.company_name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Site: {editingItem.site_name}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Next Surveillance Due Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Notes / Update Reason
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Reason for date adjustment..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={savingEdit}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: '#065f46',
                    color: '#ffffff',
                    cursor: savingEdit ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Surveillance Reminder Modal */}
      {remindingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                color: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={18} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Send Surveillance Due Date Reminder</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#a7f3d0' }}>Dispatches official email to client & in-app portal notification</p>
                </div>
              </div>
              <button
                onClick={() => setRemindingItem(null)}
                disabled={sendingReminder}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendReminder} style={{ padding: '22px' }}>
              {/* Recipient Overview Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                      {remindingItem.company_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', color: '#64748b', fontSize: '12px' }}>
                      <MapPin size={12} />
                      <span>{remindingItem.site_name || 'Main Facility'}</span>
                      <span style={{ margin: '0 4px' }}>&bull;</span>
                      <span>Ref: <strong>{remindingItem.application_number}</strong></span>
                    </div>
                  </div>
                  <div>
                    {(() => {
                      const dInfo = getDateStatus(remindingItem.next_surveillance_due_date);
                      return (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: dInfo.bg, color: dInfo.color }}>
                          {dInfo.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', background: '#f0f9ff', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px', border: '1px solid #bae6fd' }}>
                  <Mail size={14} color="#0284c7" />
                  <span>
                    Recipient: <strong>{remindingItem.client_id?.email || remindingItem.application_id?.company_email || remindingItem.application_id?.primary_email || 'Client registered email'}</strong>
                  </span>
                </div>
              </div>

              {/* Due Date Display */}
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Scheduled Surveillance Due Date:</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                  {remindingItem.next_surveillance_due_date
                    ? new Date(remindingItem.next_surveillance_due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'N/A'}
                </span>
              </div>

              {/* Previous Reminder History Notice */}
              {remindingItem.last_reminded_at && (
                <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={14} color="#a16207" />
                  <span>
                    A reminder was previously sent on <strong>{new Date(remindingItem.last_reminded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong> ({remindingItem.reminder_count || 1} reminder{remindingItem.reminder_count > 1 ? 's' : ''} sent so far).
                  </span>
                </div>
              )}

              {/* Optional Custom Message */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Custom Note / Specific Instructions <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={customReminderMsg}
                  onChange={(e) => setCustomReminderMsg(e.target.value)}
                  placeholder="e.g. Please ensure all product formulas and hygiene records are updated before the surveillance audit..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '20px', lineHeight: 1.45 }}>
                ℹ️ The client will receive an official branded email from Halal Food Authority with a direct portal action button, and superadmins are automatically copied.
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRemindingItem(null)}
                  disabled={sendingReminder}
                  style={{
                    padding: '9px 16px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingReminder}
                  style={{
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                    color: '#ffffff',
                    cursor: sendingReminder ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(6, 95, 70, 0.2)'
                  }}
                >
                  {sendingReminder ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Send Reminder Email</span>
                    </>
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
