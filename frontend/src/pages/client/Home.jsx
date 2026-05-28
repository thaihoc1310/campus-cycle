import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Megaphone, Package, PlusCircle, Recycle, ShieldCheck } from 'lucide-react';
import api from '../../api/client';
import Button from '../../components/ui/Button.jsx';
import { money } from './clientUtils.js';
import './Client.css';

function MiniItem({ item }) {
  return (
    <Link to={`/items/${item.id}`} className="client-card">
      <div className="client-card__media">
        {item.main_image ? <img src={item.main_image} alt={item.title} /> : <Package size={52} />}
      </div>
      <div className="client-card__body">
        <span className={`badge badge--${item.type === 'donate' ? 'approved' : 'active'}`}>{item.type}</span>
        <h3 className="client-card__title">{item.title}</h3>
        <div className="client-card__footer">
          <span className="client-price">{item.type === 'donate' ? 'Fee only' : money(item.price)}</span>
          <span className="text-muted">View →</span>
        </div>
      </div>
    </Link>
  );
}

function MiniCampaign({ campaign }) {
  return (
    <Link to={`/campaigns/${campaign.id}`} className="client-card">
      <div className="client-card__media">
        {campaign.main_image ? <img src={campaign.main_image} alt={campaign.title} /> : <Megaphone size={52} />}
      </div>
      <div className="client-card__body">
        <span className="badge badge--approved">{campaign.type}</span>
        <h3 className="client-card__title">{campaign.title}</h3>
        <div className="client-card__footer">
          <span className="text-muted">{campaign.organization_name || 'Campus'}</span>
          <span className="text-muted">Open →</span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    api.get('/client/items', { params: { page_size: 4 } }).then((res) => setItems(res.data.items || [])).catch(() => {});
    api.get('/client/campaigns', { params: { page_size: 4 } }).then((res) => setCampaigns(res.data.items || [])).catch(() => {});
  }, []);

  return (
    <div className="client-page">
      <section className="client-hero">
        <div className="client-hero__content">
          <p className="client-hero__eyebrow">Trusted campus reuse</p>
          <h1 className="client-hero__title">Buy less new. Move more value around campus.</h1>
          <p className="client-hero__copy">
            Browse approved items, buy donated listings with a small platform fee, or submit items to active donation campaigns.
          </p>
          <div className="client-hero__actions">
            <Link className="btn btn--secondary btn--lg" to="/marketplace"><Package size={18} /> Browse Items</Link>
            <Link className="btn btn--primary btn--lg" to="/post-item"><PlusCircle size={18} /> Post Item</Link>
          </div>
        </div>
        <div className="client-hero__panel">
          <div className="client-stat-block">
            <span className="client-stat-block__icon client-stat-block__icon--blue"><Package size={22} /></span>
            <div>
              <strong>{items.length}</strong>
              <span>approved item previews</span>
            </div>
          </div>
          <div className="client-stat-block">
            <span className="client-stat-block__icon client-stat-block__icon--green"><Megaphone size={22} /></span>
            <div>
              <strong>{campaigns.length}</strong>
              <span>active campaign previews</span>
            </div>
          </div>
          <div className="client-stat-block">
            <span className="client-stat-block__icon client-stat-block__icon--amber"><ShieldCheck size={22} /></span>
            <div>
              <strong>Verified</strong>
              <span>Every listing is reviewed before it appears publicly.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="client-section">
        <div className="client-section__header">
          <div>
            <h2 className="client-section__title">Fresh Items</h2>
            <p className="client-section__copy">Approved listings ready for campus handoff.</p>
          </div>
          <Link className="btn btn--secondary btn--md" to="/marketplace">View all <ArrowRight size={16} /></Link>
        </div>
        {items.length ? (
          <div className="client-grid">{items.map((item) => <MiniItem key={item.id} item={item} />)}</div>
        ) : (
          <div className="client-empty">
            <span className="client-empty__icon"><Package size={28} /></span>
            <span className="client-empty__title">No items yet</span>
            <span className="client-empty__copy">Approved items will appear here. Check back soon!</span>
          </div>
        )}
      </section>

      <section className="client-section">
        <div className="client-section__header">
          <div>
            <h2 className="client-section__title">Campaigns</h2>
            <p className="client-section__copy">Fundraising and item donation drives approved by campus admins.</p>
          </div>
          <Link className="btn btn--secondary btn--md" to="/campaigns">View all <ArrowRight size={16} /></Link>
        </div>
        {campaigns.length ? (
          <div className="client-grid">{campaigns.map((campaign) => <MiniCampaign key={campaign.id} campaign={campaign} />)}</div>
        ) : (
          <div className="client-empty">
            <span className="client-empty__icon"><Megaphone size={28} /></span>
            <span className="client-empty__title">No campaigns yet</span>
            <span className="client-empty__copy">Approved campaigns will appear here once available.</span>
          </div>
        )}
      </section>
    </div>
  );
}
