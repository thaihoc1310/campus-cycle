import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Filter, Package, Search, Share2, X } from 'lucide-react';
import api from '../../api/client';
import { itemFeePreview, money } from './clientUtils.js';
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

function MarketplaceItemCard({ item }) {
  const preview = itemFeePreview(item);
  return (
    <article className="feed-card">
      <div className="feed-card__header">
        <div className="feed-card__avatar feed-card__avatar--item">
          <Package size={18} />
        </div>
        <div className="feed-card__header-info">
          <span className="feed-card__author">{item.owner_name || 'Campus Member'}</span>
          <span className="feed-card__time">{timeAgo(item.created_at)} · <span className="badge badge--active">sell</span></span>
        </div>
        <span className="feed-card__price">{money(preview.buyerTotal)}</span>
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
          <span className="feed-card__chip feed-card__chip--price">Buyer total: {money(preview.buyerTotal)}</span>
        </div>
      </div>

      <div className="feed-card__actions feed-card__actions--split">
        <button className="feed-card__action feed-card__action--share" onClick={(e) => { e.preventDefault(); navigator.clipboard?.writeText(window.location.origin + `/items/${item.id}`); }}>
          <Share2 size={18} />
        </button>
        <Link to={`/items/${item.id}`} className="feed-card__action feed-card__action--primary">
          <span>Buy Now</span>
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

export default function Marketplace() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category_id: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);
  const loaderRef = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    api.get('/client/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const fetchItems = useCallback(async (pageNum, currentFilters, append = false) => {
    try {
      setLoading(true);
      const res = await api.get('/client/items', {
        params: { page: pageNum, page_size: 12, ...currentFilters },
      });
      const data = res.data;
      const newItems = data.items || [];
      if (append) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
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
    fetchItems(page, filters, page > 1);
  }, [page, filters, fetchItems]);

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

  const handleCategoryChange = (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, category_id: e.target.value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ search: '', category_id: '' });
    setShowFilters(false);
  };

  const hasActiveFilters = filters.search || filters.category_id;

  return (
    <div className="feed-page">
      <div className="feed-container">
        {/* Search & Filter Header */}
        <div className="feed-search-bar">
          <div className="feed-search-bar__input-wrap">
            <Search size={18} className="feed-search-bar__icon" />
            <input
              id="marketplace-search"
              type="text"
              placeholder="Search items..."
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
              <label className="feed-filters__label">Category</label>
              <select id="marketplace-category" className="feed-filters__select" value={filters.category_id} onChange={handleCategoryChange}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {total > 0 && (
          <div className="feed-results-info">
            <span>{total} item{total !== 1 ? 's' : ''} found</span>
          </div>
        )}

        {/* Feed List */}
        <div className="feed-list">
          {items.map((item) => (
            <MarketplaceItemCard key={item.id} item={item} />
          ))}

          {loading && (
            <>
              <FeedSkeleton />
              <FeedSkeleton />
            </>
          )}

          {!loading && items.length === 0 && (
            <div className="feed-empty">
              <div className="feed-empty__icon">
                <Search size={32} />
              </div>
              <h3 className="feed-empty__title">No items found</h3>
              <p className="feed-empty__copy">
                No approved items match these filters. Try adjusting your search or check back later.
              </p>
            </div>
          )}

          {hasMore && <div ref={loaderRef} className="feed-loader" />}

          {!hasMore && items.length > 0 && (
            <div className="feed-end">
              <span>That's all the items! 📦</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
