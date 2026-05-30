import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleDollarSign, Clock3, Megaphone, PackageCheck } from 'lucide-react';
import api from '../../api/client';
import { money } from '../client/clientUtils.js';
import './Org.css';

const statConfig = [
  { key: 'total_campaigns', label: 'Campaigns', icon: Megaphone, colorClass: 'blue' },
  { key: 'pending_items', label: 'Awaiting Review', icon: Clock3, colorClass: 'amber' },
  { key: 'handover_items', label: 'Handover', icon: PackageCheck, colorClass: 'blue' },
  { key: 'donated_items', label: 'Donated Items', icon: PackageCheck, colorClass: 'green' },
  { key: 'total_money_donations', label: 'Funded Amount', icon: CircleDollarSign, colorClass: 'purple' },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--fg)',
  boxShadow: 'var(--shadow-sm)',
  fontSize: '12px',
  fontWeight: '600'
};

export default function OrgDashboard() {
  const { orgId } = useParams();
  const [dashboard, setDashboard] = useState(null);
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    api.get(`/org/${orgId}/dashboard`).then((res) => setDashboard(res.data)).catch(() => { });
    api.get(`/org/${orgId}`).then((res) => setOrgName(res.data.name)).catch(() => { });
  }, [orgId]);

  if (!dashboard) {
    return (
      <div className="org-page">
        <div className="client-empty">
          <span className="client-empty__title">Loading organization dashboard...</span>
        </div>
      </div>
    );
  }

  const stats = statConfig.map((cfg) => ({
    ...cfg,
    value: cfg.key === 'total_money_donations' ? money(dashboard[cfg.key] || 0) : dashboard[cfg.key],
  }));

  return (
    <div className="org-page">
      <div className="org-page__header">
        <div>
          <p className="org-eyebrow">{orgName ? `${orgName} workspace` : 'Organization workspace'}</p>
          <h1>Dashboard</h1>
          <p className="org-copy">Review campaign health, pending approvals, and contribution signals.</p>
        </div>
        <Link className="btn btn--primary btn--md" to={`/org/${orgId}/campaigns`}>Manage Campaigns</Link>
      </div>

      {/* Stats Grid */}
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

      {/* Charts Grid */}
      <section className="org-dashboard-grid">
        {/* Campaign Status Pie */}
        <div className="org-panel">
          <div className="org-panel__header">
            <h2>Campaign Status</h2>
            <span>{dashboard.approved_campaigns} approved</span>
          </div>
          <div className="org-chart" style={{ background: 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={dashboard.campaign_statuses}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  cx="50%"
                  cy="50%"
                >
                  {dashboard.campaign_statuses.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Types Bar */}
        <div className="org-panel">
          <div className="org-panel__header">
            <h2>Campaign Mix</h2>
            <span>{dashboard.donation_campaigns} donation</span>
          </div>
          <div className="org-chart" style={{ background: 'transparent' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dashboard.campaign_types}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 12, fill: 'var(--gray-600)', fontWeight: 600 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--gray-600)', fontWeight: 600 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={45}>
                  {dashboard.campaign_types.map((entry, index) => (
                    <Cell key={index} fill={entry.type === 'donation' ? '#3B82F6' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Performance Leaderboard Section */}
      <section className="org-panel">
        <div className="org-panel__header">
          <div>
            <h2>Campaign Leaderboards</h2>
            <p className="org-bi-dashboard__copy" style={{ margin: 0, color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)' }}>
              Top performing campaigns ranked by monetary backing and active item donations.
            </p>
          </div>
          <span className="badge badge--success">{dashboard.total_campaigns} campaigns total</span>
        </div>

        <div className="org-dashboard-grid" style={{ marginBottom: 0 }}>
          {/* Top Fundraising Campaigns */}
          <div className="org-panel" style={{ border: 'none', padding: 0, boxShadow: 'none' }}>
            <div className="org-panel__header" style={{ marginBottom: 'var(--space-2)' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700 }}>Top Fundraising Campaigns</h3>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-500)' }}>By Total Raised</span>
            </div>
            <div className="org-bi-leaderboard" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {dashboard.top_fundraising && dashboard.top_fundraising.length > 0 ? (
                dashboard.top_fundraising.map((campaign, index) => (
                  <div key={campaign.id} className={`org-bi-leaderboard-row ${index === 0 ? 'org-bi-leaderboard-row--top1' : ''}`}>
                    <div className="org-bi-leaderboard-row__left">
                      <span className="org-bi-leaderboard-row__rank">#{index + 1}</span>
                      <Link to={`/org/${orgId}/campaigns/${campaign.id}`} className="org-bi-leaderboard-row__name" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
                        {campaign.title}
                      </Link>
                    </div>
                    <span className="org-bi-leaderboard-row__value" style={{ color: index === 0 ? '#d97706' : 'var(--primary)' }}>
                      {money(campaign.value)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="org-bi-leaderboard__empty">No fundraising campaigns recorded yet</div>
              )}
            </div>
          </div>

          {/* Top Donation Campaigns */}
          <div className="org-panel" style={{ border: 'none', padding: 0, boxShadow: 'none' }}>
            <div className="org-panel__header" style={{ marginBottom: 'var(--space-2)' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700 }}>Top Donation Campaigns</h3>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-500)' }}>By Donated Items</span>
            </div>
            <div className="org-bi-leaderboard" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {dashboard.top_donation && dashboard.top_donation.length > 0 ? (
                dashboard.top_donation.map((campaign, index) => (
                  <div key={campaign.id} className={`org-bi-leaderboard-row ${index === 0 ? 'org-bi-leaderboard-row--top1' : ''}`}>
                    <div className="org-bi-leaderboard-row__left">
                      <span className="org-bi-leaderboard-row__rank">#{index + 1}</span>
                      <Link to={`/org/${orgId}/campaigns/${campaign.id}`} className="org-bi-leaderboard-row__name" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
                        {campaign.title}
                      </Link>
                    </div>
                    <span className="org-bi-leaderboard-row__value" style={{ color: index === 0 ? '#d97706' : 'var(--primary)' }}>
                      {campaign.value} item{campaign.value !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="org-bi-leaderboard__empty">No donation campaigns recorded yet</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
