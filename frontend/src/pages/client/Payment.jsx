import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, CreditCard, Mail, Package, Phone, ShieldCheck, XCircle } from 'lucide-react';
import api from '../../api/client';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { money } from './clientUtils.js';
import './Client.css';

const STATUS_LABEL = {
  pending: 'Awaiting payment',
  paid: 'Payment received (in escrow)',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function CountdownTimer({ expiresAt, onExpired }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)));

  useEffect(() => {
    if (secs <= 0) { onExpired?.(); return; }
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs]);

  if (secs <= 0) return <span className="countdown countdown--expired"><AlertTriangle size={14} /> Expired</span>;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return (
    <span className={`countdown ${secs < 30 ? 'countdown--urgent' : ''}`}>
      <Clock size={13} />
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

export default function Payment() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  const fetchTransaction = useCallback(() => {
    setLoading(true);
    api.get(`/client/transactions/${transactionId}`)
      .then((res) => {
        setTransaction(res.data);
        // Check if already expired on load
        if (res.data.expires_at && res.data.status === 'pending') {
          setExpired(new Date(res.data.expires_at) <= new Date());
        }
      })
      .catch((err) => setError(err.response?.data?.detail || 'Could not load transaction'))
      .finally(() => setLoading(false));
  }, [transactionId]);

  useEffect(fetchTransaction, [fetchTransaction]);

  const isSale = transaction?.transaction_type === 'sale';
  const amount = Number(transaction?.amount || 0);

  const handleMarkPaid = async () => {
    setActing(true);
    try {
      await api.post(`/client/transactions/${transactionId}/mark-paid`);
      toast(isSale ? 'Payment received. Confirm once you get the item.' : 'Donation completed. Thank you!', 'success');
      navigate('/my-purchases');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Could not mark as paid';
      toast(msg, 'error');
      // If expired on server side, refresh to show updated state
      if (err.response?.status === 410) {
        fetchTransaction();
        setExpired(true);
      }
    } finally {
      setActing(false);
    }
  };

  const handleMarkFailed = async () => {
    setActing(true);
    try {
      await api.post(`/client/transactions/${transactionId}/mark-failed`);
      toast('Payment cancelled.', 'success');
      navigate('/my-purchases');
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not cancel payment', 'error');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="client-page">
        <div className="client-skeleton">
          <div className="client-skeleton__block client-skeleton__block--title" />
          <div className="client-skeleton__block client-skeleton__block--text" />
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="client-page">
        <div className="client-empty">
          <span className="client-empty__icon"><XCircle size={28} /></span>
          <span className="client-empty__title">Transaction not found</span>
          <span className="client-empty__copy">{error || 'This transaction may have been removed.'}</span>
          <Link className="btn btn--secondary btn--md" to="/my-purchases">Back to My Purchases</Link>
        </div>
      </div>
    );
  }

  const isPending = transaction.status === 'pending';
  const isExpired = expired || (isPending && transaction.expires_at && new Date(transaction.expires_at) <= new Date());

  return (
    <div className="client-page">
      <div className="client-payment">
        <header className="client-payment__header">
          <span className="client-payment__eyebrow">
            <CreditCard size={16} />
            Mock checkout
          </span>
          <h1 className="client-section__title">
            {isSale ? 'Pay for your purchase' : 'Complete your donation'}
          </h1>
          <p className="client-section__copy">
            {isSale
              ? 'This is a mock payment screen. Once you mark as paid, we hold the funds until you confirm you received the item.'
              : 'This is a mock payment screen. Donation amount will be credited to the campaign immediately upon success.'}
          </p>
        </header>

        <div className="client-payment__body">
          <section className="client-payment__summary">
            <div className="client-payment__thumb">
              {isSale && transaction.item_image ? (
                <img src={transaction.item_image} alt={transaction.item_title} />
              ) : !isSale && transaction.campaign_image ? (
                <img src={transaction.campaign_image} alt={transaction.campaign_title} />
              ) : (
                <Package size={48} />
              )}
            </div>
            <div className="client-payment__summary-body">
              <span className="client-card__meta">
                <span className={`badge badge--${transaction.status}`}>{STATUS_LABEL[transaction.status] || transaction.status}</span>
                <span>{isSale ? 'Item purchase' : 'Campaign donation'}</span>
                {isPending && transaction.expires_at && !isExpired && (
                  <CountdownTimer
                    expiresAt={transaction.expires_at}
                    onExpired={() => { setExpired(true); fetchTransaction(); }}
                  />
                )}
              </span>
              <h2>{isSale ? transaction.item_title : transaction.campaign_title}</h2>
              {isSale && transaction.seller_name && (
                <div className="client-contact-card">
                  <div className="client-contact-card__header">
                    <strong>{transaction.seller_name}</strong>
                    <span className="badge badge--paid">Seller</span>
                  </div>
                  {transaction.seller_phone && <span className="client-contact-card__item"><Phone size={13} /> {transaction.seller_phone}</span>}
                  {transaction.seller_email && <span className="client-contact-card__item"><Mail size={13} /> {transaction.seller_email}</span>}
                </div>
              )}
            </div>
          </section>

          <section className="client-payment__breakdown">
            <div className="client-payment__row">
              <span>Amount</span>
              <strong className="client-price">{money(amount)}</strong>
            </div>
            {isSale && Number(transaction.platform_fee || 0) > 0 && (
              <div className="client-payment__row text-muted">
                <span>(includes platform fee)</span>
                <span>{money(transaction.platform_fee)}</span>
              </div>
            )}
            <div className="client-payment__row client-payment__row--total">
              <span>Total to pay</span>
              <strong>{money(amount)}</strong>
            </div>
          </section>

          {isSale && (
            <div className="client-payment__notice">
              <ShieldCheck size={18} />
              <span>Funds are held by Campus Cycle until you confirm receipt of the item.</span>
            </div>
          )}

          {isPending && isExpired ? (
            <div className="client-payment__expired">
              <AlertTriangle size={20} />
              <div>
                <strong>Payment window expired</strong>
                <span>This reservation has been released. You can try buying again.</span>
              </div>
              <Link className="btn btn--primary btn--md" to={isSale && transaction.item_id ? `/items/${transaction.item_id}` : '/marketplace'}>
                Buy again
              </Link>
            </div>
          ) : isPending ? (
            <div className="client-payment__actions">
              <Button variant="primary" size="lg" onClick={handleMarkPaid} disabled={acting}>
                <CheckCircle2 size={18} />
                {acting ? 'Processing...' : 'Mark as Paid'}
              </Button>
              <Button variant="secondary" size="lg" onClick={handleMarkFailed} disabled={acting}>
                <XCircle size={18} />
                Mark as Failed
              </Button>
            </div>
          ) : (
            <div className="client-payment__actions">
              <Link className="btn btn--secondary btn--lg" to="/my-purchases">
                Go to My Purchases
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
