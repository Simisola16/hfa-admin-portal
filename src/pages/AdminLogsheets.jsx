import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Search, Clock, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminLogsheets() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('account');

  useEffect(() => {
    setLoading(true);
    api.get('/api/logsheets')
      .then(res => setLogs(res.data || []))
      .catch(() => toast.error('Failed to load logsheets'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l => l.entity_type === filterType);

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${filterType === 'account' ? 'active' : ''}`} onClick={() => setFilterType('account')}>Account Approval</button>
        <button className={`tab ${filterType === 'product' ? 'active' : ''}`} onClick={() => setFilterType('product')}>Product Review</button>
        <button className={`tab ${filterType === 'application' ? 'active' : ''}`} onClick={() => setFilterType('application')}>Application Logs</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Entity ID</th>
                  <th>Action</th>
                  <th>Performed By</th>
                  <th>Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id}>
                    <td>{new Date(l.created_at).toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>{l.entity_id}</td>
                    <td>{l.action}</td>
                    <td>Admin</td>
                    <td>{l.details}</td>
                    <td>{l.status_after}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No logs found for this category</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
