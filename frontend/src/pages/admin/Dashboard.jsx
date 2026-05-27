import { useState, useEffect } from 'react';
import { Users, Package, Megaphone, ArrowLeftRight, Building2, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../../api/client';
import './Dashboard.css';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const statIcons = {
  total_users: Users,
  total_items: Package,
  total_campaigns: Megaphone,
  total_transactions: ArrowLeftRight,
  total_organizations: Building2,
  total_campus_fund: DollarSign,
};

const statLabels = {
  total_users: 'Users',
  total_items: 'Items',
  total_campaigns: 'Campaigns',
  total_transactions: 'Transactions',
  total_organizations: 'Organizations',
  total_campus_fund: 'Campus Fund',
};

const statColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/dashboard/charts').then((r) => setCharts(r.data)).catch(() => {});
  }, []);

  const statKeys = stats ? Object.keys(stats) : [];

  return (
    <div className="dashboard">
      <h1 className="dashboard__title">Dashboard</h1>
      <p className="dashboard__subtitle">Overview of Campus Cycle platform</p>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statKeys.map((key, i) => {
          const Icon = statIcons[key] || Package;
          const value = key === 'total_campus_fund' ? `$${Number(stats[key]).toLocaleString()}` : stats[key];
          return (
            <div key={key} className="stat-card" style={{ '--stat-color': statColors[i % statColors.length] }}>
              <div className="stat-card__icon" style={{ background: statColors[i % statColors.length] }}>
                <Icon size={22} color="#fff" />
              </div>
              <div className="stat-card__info">
                <span className="stat-card__value" style={{ color: statColors[i % statColors.length] }}>{value}</span>
                <span className="stat-card__label">{statLabels[key]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {charts && (
        <div className="charts-grid">
          {/* Monthly Transactions */}
          <div className="chart-card">
            <h3 className="chart-card__title">Monthly Transactions</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', background: '#1F2937', color: '#fff' }} />
                <Bar dataKey="transactions" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Campus Fund Trend */}
          <div className="chart-card">
            <h3 className="chart-card__title">Campus Fund Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={charts.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', background: '#1F2937', color: '#fff' }} />
                <Line type="monotone" dataKey="campus_fund" stroke="#10B981" strokeWidth={3} dot={{ r: 5, fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Item Status */}
          <div className="chart-card">
            <h3 className="chart-card__title">Item Status Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={charts.item_statuses} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ status, count }) => `${status} (${count})`}>
                  {charts.item_statuses.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', background: '#1F2937', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Campaign Status */}
          <div className="chart-card">
            <h3 className="chart-card__title">Campaign Status Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={charts.campaign_statuses} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ status, count }) => `${status} (${count})`}>
                  {charts.campaign_statuses.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', background: '#1F2937', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
