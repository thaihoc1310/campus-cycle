import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Megaphone, Package } from 'lucide-react';
import api from '../../api/client';
import { money } from './clientUtils.js';
import './Client.css';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function FeedImageCarousel({ images, title, fallback }) {
  const [current, setCurrent] = useState(0);
  const trackRef = useRef(null);
  const list = images?.length ? images : [];

  if (!list.length) {
    return (
      <div className="feed-card__media feed-card__media--empty">
        {fallback}
      </div>
    );
  }

  if (list.length === 1) {
    return (
      <div className="feed-card__media">
        <img src={list[0].image_path || list[0]} alt={title} />
      </div>
    );
  }

  const go = (dir) => {
    const next = dir === 'next'
      ? Math.min(current + 1, list.length - 1)
      : Math.max(current - 1, 0);
    setCurrent(next);
  };

  return (
    <div className="feed-card__media feed-card__media--carousel">
      <div
        className="feed-card__carousel-track"
        ref={trackRef}
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {list.map((img, i) => (
          <img key={i} src={img.image_path || img} alt={`${title} ${i + 1}`} />
        ))}
      </div>
      {current > 0 && (
        <button className="feed-card__carousel-btn feed-card__carousel-btn--prev" onClick={(e) => { e.preventDefault(); go('prev'); }}>
          <ChevronLeft size={20} />
        </button>
      )}
      {current < list.length - 1 && (
        <button className="feed-card__carousel-btn feed-card__carousel-btn--next" onClick={(e) => { e.preventDefault(); go('next'); }}>
          <ChevronRight size={20} />
        </button>
      )}
      <div className="feed-card__carousel-dots">
        {list.map((_, i) => (
          <span key={i} className={`feed-card__carousel-dot ${i === current ? 'feed-card__carousel-dot--active' : ''}`} />
        ))}
      </div>
    </div>
  );
}

function FeedItemCard({ item }) {
  return (
    <article className="feed-card">
      <div className="feed-card__header">
        <div className="feed-card__avatar feed-card__avatar--item">
          <Package size={18} />
        </div>
        <div className="feed-card__header-info">
          <span className="feed-card__author">{item.owner_name || 'Campus Member'}</span>
          <span className="feed-card__time">{timeAgo(item.created_at)} · <span className={`badge badge--${item.type === 'donate' ? 'approved' : 'active'}`}>{item.type}</span></span>
        </div>
        {item.type === 'sell' && (
          <span className="feed-card__price">{money(item.price)}</span>
        )}
        {item.type === 'donate' && (
          <span className="feed-card__tag feed-card__tag--donate">Free</span>
        )}
      </div>

      <Link to={`/items/${item.id}`} className="feed-card__link">
        <FeedImageCarousel images={item.images || []} title={item.title} fallback={<Package size={56} />} />
      </Link>

      <div className="feed-card__body">
        <Link to={`/items/${item.id}`} className="feed-card__title-link">
          <h3 className="feed-card__title">{item.title}</h3>
        </Link>
        {item.description && (
          <p className="feed-card__desc">{item.description}</p>
        )}
        <div className="feed-card__meta-row">
          {item.category_name && <span className="feed-card__chip">{item.category_name}</span>}
        </div>
      </div>

      <div className="feed-card__actions">
        <Link to={`/items/${item.id}`} className="feed-card__action feed-card__action--primary">
          <span>{item.type === 'sell' ? 'Buy Now' : 'View Item'}</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </article>
  );
}

function FeedCampaignCard({ campaign }) {
  return (
    <article className="feed-card feed-card--campaign">
      <div className="feed-card__header">
        <div className="feed-card__avatar feed-card__avatar--campaign">
          <Megaphone size={18} />
        </div>
        <div className="feed-card__header-info">
          <span className="feed-card__author">{campaign.organization_name || 'Campus Organization'}</span>
          <span className="feed-card__time">{timeAgo(campaign.created_at)} · <span className="badge badge--approved">{campaign.type}</span></span>
        </div>
      </div>

      <Link to={`/campaigns/${campaign.id}`} className="feed-card__link">
        <FeedImageCarousel images={campaign.images || []} title={campaign.title} fallback={<Megaphone size={56} />} />
      </Link>

      <div className="feed-card__body">
        <Link to={`/campaigns/${campaign.id}`} className="feed-card__title-link">
          <h3 className="feed-card__title">{campaign.title}</h3>
        </Link>
        {campaign.description && (
          <p className="feed-card__desc">{campaign.description}</p>
        )}
      </div>

      <div className="feed-card__actions">
        <Link to={`/campaigns/${campaign.id}`} className="feed-card__action feed-card__action--primary">
          <span>{campaign.type === 'fundraising' ? 'Donate Now' : 'View Campaign'}</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </article>
  );
}

function FeedSkeleton() {
  return (
    <div className="feed-card feed-card--skeleton">
      <div className="feed-card__header">
        <div className="client-skeleton__block" style={{ width: 40, height: 40, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div className="client-skeleton__block" style={{ height: 14, width: '40%', marginBottom: 6 }} />
          <div className="client-skeleton__block" style={{ height: 12, width: '25%' }} />
        </div>
      </div>
      <div className="client-skeleton__block" style={{ height: 320, borderRadius: 0 }} />
      <div style={{ padding: '16px 20px' }}>
        <div className="client-skeleton__block" style={{ height: 18, width: '65%', marginBottom: 8 }} />
        <div className="client-skeleton__block" style={{ height: 14, width: '90%' }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [feed, setFeed] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(null);

  const fetchFeed = useCallback(async (pageNum) => {
    try {
      setLoading(true);
      const res = await api.get('/client/feed', { params: { page: pageNum, page_size: 15 } });
      const data = res.data;
      const newItems = data.items || [];
      if (pageNum === 1) {
        setFeed(newItems);
      } else {
        setFeed((prev) => [...prev, ...newItems]);
      }
      setHasMore(newItems.length > 0 && pageNum < (data.pages || 1));
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(page);
  }, [page, fetchFeed]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <div className="feed-page">
      <div className="feed-container">
        <div className="feed-list">
          {feed.map((entry, index) => {
            if (entry.feed_type === 'item' && entry.item) {
              return <FeedItemCard key={`item-${entry.item.id}-${index}`} item={entry.item} />;
            }
            if (entry.feed_type === 'campaign' && entry.campaign) {
              return <FeedCampaignCard key={`campaign-${entry.campaign.id}-${index}`} campaign={entry.campaign} />;
            }
            return null;
          })}

          {loading && (
            <>
              <FeedSkeleton />
              <FeedSkeleton />
            </>
          )}

          {!loading && feed.length === 0 && (
            <div className="feed-empty">
              <div className="feed-empty__icon">
                <Package size={32} />
              </div>
              <h3 className="feed-empty__title">No activity yet</h3>
              <p className="feed-empty__copy">
                Approved items and campaigns will show up here. Check back soon or list your own item!
              </p>
              <Link className="btn btn--primary btn--lg" to="/sell-item">Sell an Item</Link>
            </div>
          )}

          {hasMore && <div ref={loaderRef} className="feed-loader" />}

          {!hasMore && feed.length > 0 && (
            <div className="feed-end">
              <span>You're all caught up! 🎉</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
