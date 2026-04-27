import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Download, FileBarChart, Calendar, Filter, RefreshCw } from 'lucide-react';

const COLORS = ['#15803d', '#3b82f6', '#ef4444', '#f59e0b', '#7c3aed', '#0891b2'];

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month');

  useEffect(() => {
    setLoading(true);
    api.get('/api/reports/stats')
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [timeframe]);

  // Mock data if API doesn't have specific stats yet
  const applicationData = [
    { name: 'Jan', count: 45 }, { name: 'Feb', count: 52 }, { name: 'Mar', count: 48 },
    { name: 'Apr', count: 61 }, { name: 'May', count: 55 }, { name: 'Jun', count: 67 },
  ];

  const statusDistribution = [
    { name: 'Approved', value: 400 },
    { name: 'Under Review', value: 120 },
    { name: 'Pending', value: 80 },
    { name: 'Rejected', value: 40 },
  ];

  const revenueData = [
    { name: 'Week 1', revenue: 12500 },
    { name: 'Week 2', revenue: 15200 },
    { name: 'Week 3', revenue: 14800 },
    { name: 'Week 4', revenue: 19100 },
  ];

  if (loading && !data) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="toolbar" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <select className="form-control" style={{ width: 'auto' }} value={timeframe} onChange={e => setTimeframe(e.target.value)}>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Current Year</option>
          </select>
          <button className="btn btn-outline btn-sm">
            <Calendar size={14} /> Custom Range
          </button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary btn-sm">
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Applications Chart */}
        <div className="card" style={{ padding: 24 }}>
          <div className="card-title" style={{ marginBottom: 20 }}>Application Trends</div>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <AreaChart data={applicationData}>
                <defs>
                  <linearGradient id="colorApp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }}
                  itemStyle={{ color: 'var(--primary)', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorApp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="card" style={{ padding: 24 }}>
          <div className="card-title" style={{ marginBottom: 20 }}>Status Distribution</div>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Revenue/Invoicing Chart */}
        <div className="card" style={{ padding: 24 }}>
          <div className="card-title" style={{ marginBottom: 20 }}>Revenue Growth (£)</div>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }}
                />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 20, background: 'var(--primary)', color: 'white' }}>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Annual Growth</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>+24.8%</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={12} /> Higher than last year
            </div>
          </div>
          
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Avg. Processing Time</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>14.2 Days</div>
            <div style={{ width: '100%', height: 4, background: '#eee', borderRadius: 2, marginTop: 16 }}>
              <div style={{ width: '70%', height: '100%', background: 'var(--warning)', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Target: 10 Days</div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Client Satisfaction</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>4.8 / 5.0</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 12, color: '#f59e0b' }}>
              {[1,2,3,4,5].map(i => <Star key={i} size={16} fill={i <= 4 ? '#f59e0b' : 'none'} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components used in the stats panel
function TrendingUp({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
}

function Star({ size, fill }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
}
