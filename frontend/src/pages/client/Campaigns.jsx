import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Filter, Megaphone, Search, X } from 'lucide-react';
import api from '../../api/client';
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

function CampaignFeedCard({ campaign }) {
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

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', campaign_type: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);
  const loaderRef = useRef(null);
  const searchTimer = useRef(null);

  const fetchCampaigns = useCallback(async (pageNum, currentFilters, append = false) => {
    try {
      setLoading(true);
      const res = await api.get('/client/campaigns', {
        params: { page: pageNum, page_size: 12, ...currentFilters },
      });
      const data = res.data;
      const newItems = data.items || [];
      if (append) {
        setCampaigns((prev) => [...prev, ...newItems]);
      } else {
        setCampaigns(newItems);
      }
      setTotal(data.total || 0);
      setHasMore(newItems.length > 0 && pageNum < (data.pages || 1));
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns(page, filters, page > 1);
  }, [page, filters, fetchCampaigns]);

  // Infinite scroll
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

  const handleSearchChange = (e) => {
    const value = e.target.value;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setFilters((f) => ({ ...f, search: value }));
    }, 400);
  };

  const handleTypeChange = (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, campaign_type: e.target.value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ search: '', campaign_type: '' });
    setShowFilters(false);
  };

  const hasActiveFilters = filters.search || filters.campaign_type;

  return (
    <div className="feed-page">
      <div className="feed-container">
        {/* Search & Filter Header */}
        <div className="feed-search-bar">
          <div className="feed-search-bar__input-wrap">
            <Search size={18} className="feed-search-bar__icon" />
            <input
              id="campaign-search"
              type="text"
              placeholder="Search campaigns..."
              defaultValue={filters.search}
              onChange={handleSearchChange}
              className="feed-search-bar__input"
            />
          </div>
          <button className={`feed-search-bar__filter-btn ${showFilters ? 'feed-search-bar__filter-btn--active' : ''}`} onClick={() => setShowFilters((s) => !s)}>
            <Filter size={18} />
            <span>Filters</span>
          </button>
          {hasActiveFilters && (
            <button className="feed-search-bar__clear" onClick={clearFilters}>
              <X size={14} />
              <span>Clear</span>
            </button>
          )}
        </div>

        {showFilters && (
          <div className="feed-filters">
            <div className="feed-filters__group">
              <label className="feed-filters__label">Campaign Type</label>
              <select id="campaign-type-filter" className="feed-filters__select" value={filters.campaign_type} onChange={handleTypeChange}>
                <option value="">All types</option>
                <option value="fundraising">Fundraising</option>
                <option value="donation">Donation</option>
              </select>
            </div>
          </div>
        )}

        {total > 0 && (
          <div className="feed-results-info">
            <span>{total} campaign{total !== 1 ? 's' : ''} found</span>
          </div>
        )}

        {/* Feed List */}
        <div className="feed-list">
          {campaigns.map((campaign) => (
            <CampaignFeedCard key={campaign.id} campaign={campaign} />
          ))}

          {loading && (
            <>
              <FeedSkeleton />
              <FeedSkeleton />
            </>
          )}

          {!loading && campaigns.length === 0 && (
            <div className="feed-empty">
              <div className="feed-empty__icon">
                <Search size={32} />
              </div>
              <h3 className="feed-empty__title">No campaigns found</h3>
              <p className="feed-empty__copy">
                No approved campaigns match these filters. Try adjusting your search or check back later.
              </p>
            </div>
          )}

          {hasMore && <div ref={loaderRef} className="feed-loader" />}

          {!hasMore && campaigns.length > 0 && (
            <div className="feed-end">
              <span>That's all the campaigns! 🎯</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
