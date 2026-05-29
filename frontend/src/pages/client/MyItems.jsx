import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Filter, ImagePlus, Mail, MoreVertical, Package, Pencil, Phone, PlusCircle, Search, Star, Trash2, User, X } from 'lucide-react';
import api from '../../api/client';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import ClientImageGallery from './ClientImageGallery.jsx';
import { money } from './clientUtils.js';
import './Client.css';

function itemLabel(item) {
  if (item.type === 'donate') return 'Donation item';
  return money(item.price);
}

function MyItemCard({ item, menuOpen, onToggleMenu, onEdit, onDelete, onView }) {
  const canEdit = item.status === 'pending';
  const canDelete = item.status !== 'reserved' && item.status !== 'sold';
  const isReserved = item.status === 'reserved';

  return (
    <article
      className="client-card client-item-card"
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onView();
        }
      }}
    >
      <div className="client-card__media">
        {item.main_image ? <img src={item.main_image} alt={item.title} /> : <Package size={54} />}
        <div className="client-item-card__actions">
          <button type="button" className="client-item-card__menu-button" onClick={onToggleMenu} aria-label={`Open actions for ${item.title}`}>
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="client-item-card__menu" onClick={(event) => event.stopPropagation()}>
              {canEdit && (
                <button type="button" onClick={onEdit}>
                  <Pencil size={16} />
                  <span>Edit</span>
                </button>
              )}
              {canDelete && (
                <button type="button" className="client-item-card__menu-danger" onClick={onDelete}>
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="client-card__body">
        <div className="client-card__meta">
          <span className={`badge badge--${item.status}`}>{item.status}</span>
          <span>{item.type}</span>
          {item.campaign_name && <span>{item.campaign_name}</span>}
        </div>
        <h2 className="client-card__title">{item.title}</h2>
        <div className="client-card__footer">
          <span className={item.type === 'donate' ? 'text-muted' : 'client-price'}>{itemLabel(item)}</span>
          <span className="text-muted">{isReserved ? 'awaiting handover' : (item.status === 'approved' ? 'public' : 'not public')}</span>
        </div>
        {isReserved && item.buyer_name && (
          <div className="client-contact-card client-contact-card--compact">
            <div className="client-contact-card__header">
              <User size={14} />
              <strong>Buyer: {item.buyer_name}</strong>
            </div>
            {item.buyer_phone && (
              <span className="client-contact-card__item"><Phone size={12} /> {item.buyer_phone}</span>
            )}
            {item.buyer_email && (
              <span className="client-contact-card__item"><Mail size={12} /> {item.buyer_email}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function ViewItemModal({ item, onClose }) {
  if (!item) return null;

  return (
    <Modal isOpen={!!item} onClose={onClose} title={item.title} size="lg">
      <div className="client-my-item-view">
        <ClientImageGallery images={item.images || []} title={item.title} fallbackIcon={<Package size={72} />} variant="strip" />
        <div className="client-my-item-view__body">
          <div className="client-card__meta">
            <span className={`badge badge--${item.status}`}>{item.status}</span>
            <span>{item.type}</span>
            <span>{item.category_name || 'Uncategorized'}</span>
          </div>
          <h2>{item.title}</h2>
          <p>{item.description || 'No description provided.'}</p>
          {item.type === 'donate' ? (
            <div className="client-linked-info">
              <div>
                <span>Campaign</span>
                <strong>{item.campaign_name || 'Donation campaign'}</strong>
              </div>
              {item.campaign_id && (
                <Link className="client-linked-info__action" to={`/campaigns/${item.campaign_id}`} onClick={onClose} aria-label="Open campaign detail">
                  <ArrowRight size={20} />
                </Link>
              )}
            </div>
          ) : (
            <div className="client-item-facts">
              <div>
                <strong>{money(item.price)}</strong>
                <span>Listing value</span>
              </div>
              <div>
                <strong>{item.status === 'approved' ? 'Public' : 'Not public'}</strong>
                <span>Visibility</span>
              </div>
            </div>
          )}
          {(item.status === 'reserved' || item.item_status === 'reserved') && item.buyer_name && (
            <div className="client-contact-card">
              <div className="client-contact-card__header">
                <User size={16} />
                <strong>Buyer Contact</strong>
              </div>
              <span className="client-contact-card__item"><User size={14} /> {item.buyer_name}</span>
              {item.buyer_phone && (
                <span className="client-contact-card__item"><Phone size={14} /> {item.buyer_phone}</span>
              )}
              {item.buyer_email && (
                <span className="client-contact-card__item"><Mail size={14} /> {item.buyer_email}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function EditItemModal({ item, categories, onClose, onSaved }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ title: '', description: '', price: '0', category_id: '' });
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!item) return;
    setForm({
      title: item.title || '',
      description: item.description || '',
      price: String(item.price || 0),
      category_id: item.category_id || '',
    });
    setImages(item.images || []);
  }, [item]);

  if (!item) return null;

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/client/items/${item.id}`, {
        title: form.title,
        description: form.description,
        price: item.type === 'sell' ? Number(form.price || 0) : 0,
        category_id: form.category_id || null,
      });
      toast('Item updated.', 'success');
      onSaved(res.data);
      onClose();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not update item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadImages = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const data = new FormData();
      Array.from(files).forEach((file) => data.append('files', file));
      const res = await api.post(`/client/items/${item.id}/images`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImages((current) => [...current, ...res.data]);
      toast('Images uploaded.', 'success');
      onSaved();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not upload images', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const setMainImage = async (imageId) => {
    try {
      await api.put(`/client/items/images/${imageId}/main`);
      setImages((current) => current.map((image) => ({ ...image, is_main: image.id === imageId })));
      toast('Main image updated.', 'success');
      onSaved();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not set main image', 'error');
    }
  };

  const deleteImage = async (imageId) => {
    try {
      await api.delete(`/client/items/images/${imageId}`);
      setImages((current) => current.filter((image) => image.id !== imageId));
      toast('Image deleted.', 'success');
      onSaved();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not delete image', 'error');
    }
  };

  return (
    <Modal isOpen={!!item} onClose={onClose} title={`Edit ${item.title}`} size="lg">
      <form className="client-edit-item" onSubmit={handleSave}>
        <div className="client-form-grid">
          <Input id="my-item-title" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input id="my-item-category" label="Category" type="select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">No category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Input>
        </div>
        {item.type === 'sell' && (
          <Input id="my-item-price" label="Seller Price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        )}
        <Input id="my-item-description" label="Description" type="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <section className="client-edit-images">
          <div className="client-edit-images__header">
            <div>
              <h3>Images</h3>
              <p className="text-muted">Update photos while the item is pending review.</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading || images.length >= 6}>
              <ImagePlus size={16} />
              {uploading ? 'Uploading...' : 'Add Images'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(event) => uploadImages(event.target.files)} />
          </div>
          {images.length ? (
            <div className="client-edit-images__grid">
              {images.map((image) => (
                <div key={image.id} className="client-edit-image">
                  <img src={image.image_path} alt="" />
                  {image.is_main && <span>Main</span>}
                  <div className="client-edit-image__actions">
                    <button type="button" title="Set main" onClick={() => setMainImage(image.id)} disabled={image.is_main}><Star size={15} /></button>
                    <button type="button" title="Delete image" onClick={() => deleteImage(image.id)}><X size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="client-empty" style={{ padding: 'var(--space-6)' }}>
              <span className="client-empty__icon"><Package size={24} /></span>
              <span className="client-empty__copy">No images yet.</span>
            </div>
          )}
        </section>

        <div className="modal__actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function MyItems() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', category_id: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [openMenuId, setOpenMenuId] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const searchTimer = useRef(null);

  const fetchItems = useCallback(() => {
    const params = {
      page,
      page_size: 60,
    };
    if (filters.search) params.search = filters.search;
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.status) params.status = filters.status;

    api.get('/client/items/my', { params })
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [page, filters]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { api.get('/client/categories').then((res) => setCategories(res.data)).catch(() => {}); }, []);

  useEffect(() => {
    const closeMenu = () => setOpenMenuId('');
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const itemId = searchParams.get('item');
    if (itemId) {
      // 350ms delay lets the route transition settle first, preventing layout jumps
      const timer = setTimeout(() => {
        api.get(`/client/items/${itemId}`)
          .then((res) => setViewItem(res.data))
          .catch(() => {});
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

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

  const handleStatusChange = (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, status: e.target.value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ search: '', category_id: '', status: '' });
    setShowFilters(false);
  };

  const hasActiveFilters = filters.search || filters.category_id || filters.status;

  const statusCounts = useMemo(() => {
    const counts = {};
    data.items.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    return counts;
  }, [data.items]);

  const sellItems = useMemo(() => data.items.filter((item) => item.type === 'sell'), [data.items]);
  const donationItems = useMemo(() => data.items.filter((item) => item.type === 'donate'), [data.items]);

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await api.delete(`/client/items/${deleteItem.id}`);
      toast('Item deleted.', 'success');
      setDeleteItem(null);
      fetchItems();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not delete item', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const renderSection = (title, copy, items) => (
    <section className="client-section">
      <div className="client-section__header">
        <div>
          <h2 className="client-section__title">{title}</h2>
          <p className="client-section__copy">{copy}</p>
        </div>
      </div>
      {items.length ? (
        <div className="client-grid">
          {items.map((item) => (
            <MyItemCard
              key={item.id}
              item={item}
              menuOpen={openMenuId === item.id}
              onToggleMenu={(event) => {
                event.stopPropagation();
                setOpenMenuId((current) => current === item.id ? '' : item.id);
              }}
              onView={() => {
                setOpenMenuId('');
                setViewItem(item);
              }}
              onEdit={() => {
                setOpenMenuId('');
                setEditItem(item);
              }}
              onDelete={() => {
                setOpenMenuId('');
                setDeleteItem(item);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="client-empty">
          <span className="client-empty__icon"><Package size={28} /></span>
          <span className="client-empty__title">No {title.toLowerCase()} yet</span>
          <span className="client-empty__copy">Items you submit in this category will appear here.</span>
        </div>
      )}
    </section>
  );

  return (
    <div className="client-page">
      <div className="client-section__header">
        <div>
          <h1 className="client-section__title">My Items</h1>
          <p className="client-section__copy">Track campus review status and manage your submissions.</p>
        </div>
        <Link className="btn btn--primary btn--md" to="/sell-item"><PlusCircle size={16} /> Sell Item</Link>
      </div>

      {/* Search & Filters */}
      <div className="feed-search-bar" style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="feed-search-bar__input-wrap">
          <Search size={18} className="feed-search-bar__icon" />
          <input
            id="my-items-search"
            type="text"
            placeholder="Search my items..."
            defaultValue={filters.search}
            onChange={handleSearchChange}
            className="feed-search-bar__input"
          />
        </div>
        <button
          type="button"
          className={`feed-search-bar__filter-btn ${showFilters ? 'feed-search-bar__filter-btn--active' : ''}`}
          onClick={() => setShowFilters((s) => !s)}
        >
          <Filter size={18} />
          <span>Filters</span>
        </button>
        {hasActiveFilters && (
          <button type="button" className="feed-search-bar__clear" onClick={clearFilters}>
            <X size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {showFilters && (
        <div className="feed-filters" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="feed-filters__group">
            <label className="feed-filters__label" htmlFor="my-items-category">Category</label>
            <select
              id="my-items-category"
              className="feed-filters__select"
              value={filters.category_id}
              onChange={handleCategoryChange}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="feed-filters__group">
            <label className="feed-filters__label" htmlFor="my-items-status">Status</label>
            <select
              id="my-items-status"
              className="feed-filters__select"
              value={filters.status}
              onChange={handleStatusChange}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      )}

      {data.items.length > 0 && Object.keys(statusCounts).length > 0 && (
        <div className="client-status-summary">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="client-status-summary__item">
              <span className={`client-status-summary__dot client-status-summary__dot--${status}`} />
              <span>{count} {status}</span>
            </div>
          ))}
        </div>
      )}

      {data.items.length ? (
        <>
          {renderSection('Sell Items', 'Listings submitted for marketplace review.', sellItems)}
          {renderSection('Donation Items', 'Items submitted to donation campaigns.', donationItems)}
          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      ) : hasActiveFilters ? (
        <div className="client-empty">
          <span className="client-empty__icon"><Search size={28} /></span>
          <span className="client-empty__title">No items found</span>
          <span className="client-empty__copy">Try adjusting or clearing your filters.</span>
          <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
        </div>
      ) : (
        <div className="client-empty">
          <span className="client-empty__icon"><Package size={28} /></span>
          <span className="client-empty__title">No items posted yet</span>
          <span className="client-empty__copy">List your first item for campus reuse. Donation items are created from donation campaigns.</span>
          <Link className="btn btn--primary btn--md" to="/sell-item"><PlusCircle size={16} /> Sell Your First Item</Link>
        </div>
      )}

      <ViewItemModal
        item={viewItem}
        onClose={() => {
          setViewItem(null);
          if (new URLSearchParams(location.search).has('item')) {
            navigate('/my-items', { replace: true });
          }
        }}
      />
      <EditItemModal item={editItem} categories={categories} onClose={() => setEditItem(null)} onSaved={fetchItems} />
      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete Item"
        message={`Delete "${deleteItem?.title}"? This cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
