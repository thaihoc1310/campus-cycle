import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Building2, ChevronRight, Megaphone, Package, Calendar } from 'lucide-react';
import api from '../../api/client';
import { money } from './clientUtils.js';
import './Client.css';

export default function OrgDetail() {
  const { orgId } = useParams();
  const [org, setOrg] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/client/organizations/${orgId}`),
      api.get('/client/campaigns', { params: { organization_id: orgId } })
    ])
      .then(([orgRes, campRes]) => {
        setOrg(orgRes.data);
        setCampaigns(campRes.data.items || []);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [orgId]);

  if (loading) {
    return (
      <div className="client-page">
        <div className="client-skeleton">
          <div className="client-skeleton__block client-skeleton__block--title" style={{ width: '40%', height: 32 }} />
          <div className="client-skeleton__block client-skeleton__block--hero" style={{ height: 200, marginTop: 24 }} />
          <div className="client-skeleton__block client-skeleton__block--text" style={{ marginTop: 24 }} />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="client-page">
        <div className="client-empty">
          <span className="client-empty__icon"><Building2 size={28} /></span>
          <span className="client-empty__title">Organization not found</span>
          <span className="client-empty__copy">This organization might have been removed or the ID is invalid.</span>
          <Link className="btn btn--secondary btn--md" to="/campaigns">Back to Campaigns</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="client-page">
      {/* Breadcrumbs */}
      <nav className="client-breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={14} className="client-breadcrumb__sep" />
        <Link to="/campaigns">Campaigns</Link>
        <ChevronRight size={14} className="client-breadcrumb__sep" />
        <span className="client-breadcrumb__current">{org.name}</span>
      </nav>

      {/* Organization Info Header Banner */}
      <header className="client-row-card" style={{ padding: 'var(--space-6)', marginTop: 'var(--space-4)', gap: 'var(--space-6)', display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="org-profile-head" style={{ display: 'flex', gap: 'var(--space-4)', flex: 1, minWidth: 280, alignItems: 'center' }}>
          <div style={{
            width: 96,
            height: 96,
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            backgroundColor: 'var(--muted)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--gray-400)',
            border: '1px solid var(--border)',
            flexShrink: 0
          }}>
            {org.image_url ? (
              <img src={org.image_url} alt={org.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Building2 size={48} />
            )}
          </div>
          <div>
            <div className="client-card__meta" style={{ marginBottom: 'var(--space-1)' }}>
              <span className="badge badge--active">{org.type || 'Organization'}</span>
            </div>
            <h1 className="client-section__title" style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>{org.name}</h1>
            <p className="client-section__copy" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)' }}>
              {org.description || 'No description provided for this campus organization.'}
            </p>
          </div>
        </div>
      </header>

      {/* Campaigns Listing Section */}
      <section className="client-section" style={{ marginTop: 'var(--space-10)' }}>
        <div className="client-section__header">
          <div>
            <h2 className="client-section__title" style={{ fontSize: 'var(--font-size-xl)' }}>Active Campaigns</h2>
            <p className="client-section__copy">Campaigns initiated by {org.name} for campus community engagement.</p>
          </div>
        </div>

        {campaigns.length ? (
          <div className="client-grid" style={{ marginTop: 'var(--space-6)' }}>
            {campaigns.map((campaign) => (
              <article key={campaign.id} className="client-card client-item-card" style={{ overflow: 'hidden' }}>
                <Link to={`/campaigns/${campaign.id}`} className="client-card__link" style={{ display: 'block', height: '180px', position: 'relative', overflow: 'hidden', background: '#0B1020' }}>
                  {campaign.main_image ? (
                    <img src={campaign.main_image} alt={campaign.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'rgba(255,255,255,0.3)' }}>
                      <Megaphone size={48} />
                    </div>
                  )}
                </Link>
                <div className="client-card__body" style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-2)' }}>
                  <div className="client-card__meta">
                    <span className="badge badge--approved">{campaign.type}</span>
                  </div>
                  <h3 className="client-card__title" style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, margin: 0 }}>
                    <Link to={`/campaigns/${campaign.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {campaign.title}
                    </Link>
                  </h3>
                  <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 32, margin: 0 }}>
                    {campaign.description}
                  </p>
                  <div className="client-card__footer" style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="client-price" style={{ fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} />
                      {campaign.type === 'fundraising' ? 'Raising Money' : 'Accepting Items'}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="client-empty" style={{ padding: 'var(--space-12) 0' }}>
            <span className="client-empty__icon"><Megaphone size={28} /></span>
            <span className="client-empty__title">No active campaigns</span>
            <span className="client-empty__copy">This organization has not published any approved campaigns yet.</span>
          </div>
        )}
      </section>
    </div>
  );
}
