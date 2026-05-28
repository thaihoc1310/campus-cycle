import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleDollarSign, Clock3, Megaphone, PackageCheck } from 'lucide-react';
import api from '../../api/client';
import { money } from '../client/clientUtils.js';
import './Org.css';

const statConfig = [
  { key: 'total_campaigns', label: 'Campaigns', icon: Megaphone, color: '#3B82F6', colorClass: 'blue' },
  { key: 'pending_campaigns', label: 'Pending Review', icon: Clock3, color: '#F59E0B', colorClass: 'amber' },
  { key: 'pending_items', label: 'Pending Items', icon: PackageCheck, color: '#10B981', colorClass: 'green' },
  { key: 'total_money_donations', label: 'Funded Amount', icon: CircleDollarSign, color: '#8B5CF6', colorClass: 'purple' },
];

const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const tooltipStyle = { borderRadius: 8, border: 'none', background: '#1F2937', color: '#fff' };

export default function OrgDashboard() {
  const { orgId } = useParams();
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    api.get(`/org/${orgId}/dashboard`).then((res) => setDashboard(res.data)).catch(() => {});
  }, [orgId]);

  if (!dashboard) {
    return <div className="org-page"><div className="client-empty"><span className="client-empty__title">Loading organization dashboard...</span></div></div>;
  }

  const stats = statConfig.map((cfg) => ({
    ...cfg,
    value: cfg.key === 'total_money_donations' ? money(dashboard[cfg.key] || 0) : dashboard[cfg.key],
  }));

  return (
    <div className="org-page">
      <div className="org-page__header">
        <div>
          <p className="org-eyebrow">Organization workspace</p>
          <h1>Dashboard</h1>
          <p className="org-copy">Review campaign health, pending approvals, and contribution signals.</p>
        </div>
        <Link className="btn btn--primary btn--md" to={`/org/${orgId}/campaigns`}>Manage Campaigns</Link>
      </div>

      <section className="org-stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.key} className="org-stat">
              <span className={`org-stat__icon org-stat__icon--${stat.colorClass}`}><Icon size={22} /></span>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          );
        })}
      </section>

      <section className="org-dashboard-grid">
        <div className="org-panel">
          <div className="org-panel__header">
            <h2>Campaign Status</h2>
            <span>{dashboard.approved_campaigns} approved</span>
          </div>
          <div className="org-chart">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={dashboard.campaign_statuses} dataKey="count" nameKey="status" innerRadius={58} outerRadius={96}>
                  {dashboard.campaign_statuses.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="org-panel">
          <div className="org-panel__header">
            <h2>Campaign Mix</h2>
            <span>{dashboard.donation_campaigns} donation</span>
          </div>
          <div className="org-chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dashboard.campaign_types}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="org-panel">
        <div className="org-panel__header">
          <h2>Contribution Review</h2>
          <span>{dashboard.money_donors} money donations</span>
        </div>
        <div className="org-review-strip">
          <div>
            <strong>{dashboard.pending_items}</strong>
            <span>pending items</span>
          </div>
          <div>
            <strong>{dashboard.approved_items}</strong>
            <span>approved items</span>
          </div>
          <div>
            <strong>{dashboard.rejected_items}</strong>
            <span>rejected items</span>
          </div>
          <div>
            <strong>{money(dashboard.total_money_donations || 0)}</strong>
            <span>fundraising volume</span>
          </div>
        </div>
      </section>
    </div>
  );
}
