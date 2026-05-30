import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, CreditCard, Mail, Package, Phone, Search, ShoppingBag, WalletCards, X, XCircle } from 'lucide-react';
import api from '../../api/client';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import ClientImageGallery from './ClientImageGallery.jsx';
import { money } from './clientUtils.js';
import './Client.css';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'paid', label: 'Awaiting handover' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const STATUS_LABEL = {
  pending: 'Awaiting payment',
  paid: 'Awaiting handover',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const STATUS_ICON = {
  pending: CreditCard,
  paid: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
  refunded: XCircle,
};

function CountdownTimer({ expiresAt, onExpired }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)));

  useEffect(() => {
    if (secs <= 0) { onExpired?.(); return; }
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs]);

  if (secs <= 0) return <span className="countdown countdown--expired"><AlertTriangle size={12} /> Expired</span>;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return (
    <span className={`countdown ${secs < 30 ? 'countdown--urgent' : ''}`}>
      <Clock size={12} />
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function daysUntil(dateStr) {
  return Math.max(0, Math.ceil((new Date(dateStr) - Date.now()) / 86400000));
}

function ItemPreviewModal({ tx, onClose }) {
  if (!tx) return null;
  const isSale = tx.transaction_type === 'sale';
  return (
    <Modal isOpen={!!tx} onClose={onClose} title={isSale ? tx.item_title : tx.campaign_title} size="lg">
      <div className="client-purchase-preview">
        {isSale
          ? <ClientImageGallery images={tx.item_images?.length ? tx.item_images : (tx.item_image ? [tx.item_image] : [])} title={tx.item_title} fallbackIcon={<Package size={72} />} variant="strip" />
          : (
            <div className="client-purchase-preview__thumb">
              {tx.campaign_image ? <img src={tx.campaign_image} alt={tx.campaign_title} /> : <Package size={54} />}
            </div>
          )}
        <div className="client-purchase-preview__body">
          <div className="client-card__meta">
            <span className={`badge badge--${tx.status}`}>{STATUS_LABEL[tx.status] || tx.status}</span>
            <span>{isSale ? 'Item purchase' : 'Donation'}</span>
          </div>
          {isSale && tx.item_description && <p>{tx.item_description}</p>}
          <div className="client-item-facts">
            <div>
              <strong>{money(tx.amount)}</strong>
              <span>{isSale ? 'Paid (buyer total)' : 'Donated'}</span>
            </div>
            {isSale && tx.seller_name && (
              <div className="client-contact-card client-contact-card--compact">
                <strong>{tx.seller_name}</strong>
                <span>Seller contact</span>
                {tx.seller_phone && <span><Phone size={12} /> {tx.seller_phone}</span>}
                {tx.seller_email && <span><Mail size={12} /> {tx.seller_email}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function MyPurchases() {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actingId, setActingId] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [previewTx, setPreviewTx] = useState(null);
  const searchTimer = useRef(null);

  const fetchPurchases = useCallback(() => {
    const params = { page, page_size: 20 };
    if (status) params.status = status;
    if (debouncedSearch) params.search = debouncedSearch;
    api.get('/client/transactions/my-purchases', { params })
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [page, status, debouncedSearch]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(value.trim());
    }, 300);
  };

  const clearSearch = () => {
    clearTimeout(searchTimer.current);
    setSearchQuery('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleConfirmReceipt = async (transactionId) => {
    setActingId(transactionId);
    try {
      await api.post(`/client/transactions/${transactionId}/confirm-receipt`);
      toast('Receipt confirmed. The seller will be paid.', 'success');
      fetchPurchases();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not confirm receipt', 'error');
    } finally {
      setActingId('');
    }
  };

  const handleRejectHandover = async () => {
    if (!rejectTarget) return;
    setActingId(rejectTarget.id);
    try {
      await api.post(`/client/transactions/${rejectTarget.id}/reject-handover`);
      toast('Transaction refunded. Item returned to seller.', 'success');
      setRejectTarget(null);
      fetchPurchases();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not reject handover', 'error');
    } finally {
      setActingId('');
    }
  };

  return (
    <div className="client-page">
      <div className="client-section__header">
        <div>
          <h1 className="client-section__title">My Purchases</h1>
          <p className="client-section__copy">Pay for orders you placed and confirm items once you receive them.</p>
        </div>
        <Link className="btn btn--secondary btn--md" to="/marketplace">
          <ShoppingBag size={16} /> Browse marketplace
        </Link>
      </div>

      <div className="feed-search-bar" style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="feed-search-bar__input-wrap">
          <Search size={18} className="feed-search-bar__icon" />
          <input
            id="my-purchases-search"
            type="text"
            placeholder="Search purchases or campaign donations..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="feed-search-bar__input"
          />
        </div>
        {(searchQuery || debouncedSearch) && (
          <button type="button" className="feed-search-bar__clear" onClick={clearSearch}>
            <X size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="client-purchases__filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.value || 'all'}
            type="button"
            className={`client-purchases__filter ${status === filter.value ? 'client-purchases__filter--active' : ''}`}
            onClick={() => { setPage(1); setStatus(filter.value); }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {data.items.length ? (
        <>
          <div className="client-purchases__list">
            {data.items.map((tx) => {
              const isSale = tx.transaction_type === 'sale';
              const StatusIcon = STATUS_ICON[tx.status] || Clock;
              const isPending = tx.status === 'pending';
              const isPaid = tx.status === 'paid';
              const isExpiredPending = isPending && tx.expires_at && new Date(tx.expires_at) <= new Date();
              const autoCompleteDays = isPaid && tx.expires_at ? daysUntil(tx.expires_at) : null;

              return (
                <article key={tx.id} className="client-purchases__row">
                  <div className="client-purchases__thumb">
                    {isSale && tx.item_image ? (
                      <img src={tx.item_image} alt={tx.item_title} />
                    ) : !isSale && tx.campaign_image ? (
                      <img src={tx.campaign_image} alt={tx.campaign_title} />
                    ) : (
                      <Package size={32} />
                    )}
                  </div>
                  <div className="client-purchases__body">
                    <div className="client-card__meta">
                      <span className={`badge badge--${tx.status}`}>
                        <StatusIcon size={12} style={{ marginRight: 4 }} />
                        {STATUS_LABEL[tx.status] || tx.status}
                      </span>
                      <span>{isSale ? 'Purchase' : 'Donation'}</span>
                      <span className="text-muted">{new Date(tx.created_at).toLocaleDateString()}</span>
                      {isPending && tx.expires_at && !isExpiredPending && (
                        <CountdownTimer expiresAt={tx.expires_at} onExpired={fetchPurchases} />
                      )}
                      {isExpiredPending && (
                        <span className="countdown countdown--expired"><AlertTriangle size={12} /> Expired</span>
                      )}
                    </div>
                    <h2 className="client-purchases__title">
                      {isSale ? tx.item_title : tx.campaign_title}
                    </h2>
                    {isSale && tx.seller_name && (
                      <div className="client-contact-card">
                        <div className="client-contact-card__header">
                          <strong>{tx.seller_name}</strong>
                          <span className="badge badge--paid">Seller</span>
                        </div>
                        {tx.seller_phone && <span className="client-contact-card__item"><Phone size={13} /> {tx.seller_phone}</span>}
                        {tx.seller_email && <span className="client-contact-card__item"><Mail size={13} /> {tx.seller_email}</span>}
                      </div>
                    )}
                    <span className="client-price">{money(tx.amount)}</span>
                    {isPaid && autoCompleteDays !== null && (
                      <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        Auto-completes in {autoCompleteDays} day{autoCompleteDays !== 1 ? 's' : ''} if not confirmed
                      </span>
                    )}
                  </div>
                  <div className="client-purchases__actions">
                    {isPending && !isExpiredPending && (
                      <Button variant="primary" size="sm" onClick={() => navigate(`/payment/${tx.id}`)}>
                        <CreditCard size={14} /> Pay now
                      </Button>
                    )}
                    {isPaid && isSale && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleConfirmReceipt(tx.id)}
                          disabled={actingId === tx.id}
                        >
                          <CheckCircle2 size={14} />
                          {actingId === tx.id ? 'Confirming...' : 'I received it'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setRejectTarget(tx)}
                          disabled={actingId === tx.id}
                        >
                          <XCircle size={14} /> Reject item
                        </Button>
                      </>
                    )}
                    {isSale && tx.item_id && (
                      <Button variant="secondary" size="sm" onClick={() => setPreviewTx(tx)}>
                        <Package size={14} /> View item
                      </Button>
                    )}
                    {!isSale && tx.campaign_id && (
                      <Link className="btn btn--secondary btn--sm" to={`/campaigns/${tx.campaign_id}`}>
                        <WalletCards size={14} /> View campaign
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      ) : (
        <div className="client-empty">
          <span className="client-empty__icon"><ShoppingBag size={28} /></span>
          <span className="client-empty__title">{debouncedSearch ? 'No matching purchases' : 'No purchases yet'}</span>
          <span className="client-empty__copy">{debouncedSearch ? 'Try another search term or clear the search.' : 'Items and donations you start will show up here.'}</span>
          <Link className="btn btn--primary btn--md" to="/marketplace">Browse marketplace</Link>
        </div>
      )}

      <ItemPreviewModal tx={previewTx} onClose={() => setPreviewTx(null)} />

      <ConfirmDialog
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectHandover}
        title="Reject item"
        message={`Reject "${rejectTarget?.item_title}"? The transaction will be refunded and the item returned to the seller.`}
        loading={actingId === rejectTarget?.id}
      />
    </div>
  );
}
