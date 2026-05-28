import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { itemFeePreview, money } from './clientUtils.js';
import './Client.css';

export default function ItemDetail() {
  const { itemId } = useParams();
  const toast = useToast();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [preview, setPreview] = useState(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    api.get(`/client/items/${itemId}`).then((res) => {
      setItem(res.data);
      setPreview(itemFeePreview(res.data));
    }).catch(() => {});
    api.get(`/client/items/${itemId}/purchase-preview`).then((res) => setPreview({
      itemPrice: Number(res.data.item_price),
      buyerPlatformFee: Number(res.data.buyer_platform_fee),
      sellerPlatformFee: Number(res.data.seller_platform_fee),
      platformFee: Number(res.data.platform_fee),
      buyerTotal: Number(res.data.buyer_total),
      sellerReceives: Number(res.data.seller_receives),
    })).catch(() => {});
  }, [itemId]);

  const handleBuy = async () => {
    setBuying(true);
    try {
      await api.post(`/client/items/${itemId}/purchase`);
      toast('Purchase request created. Billing system will handle payment.', 'success');
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not create purchase request', 'error');
    } finally {
      setBuying(false);
    }
  };

  if (!item) {
    return (
      <div className="client-page">
        <div className="client-skeleton">
          <div className="client-skeleton__block client-skeleton__block--title" />
          <div className="client-skeleton__block client-skeleton__block--hero" />
          <div className="client-skeleton__block client-skeleton__block--text" />
        </div>
      </div>
    );
  }

  return (
    <div className="client-page">
      <nav className="client-breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={14} className="client-breadcrumb__sep" />
        <Link to="/marketplace">Marketplace</Link>
        <ChevronRight size={14} className="client-breadcrumb__sep" />
        <span className="client-breadcrumb__current">{item.title}</span>
      </nav>

      <div className="client-detail">
        <section>
          <div className="client-detail__media">
            {item.main_image ? <img src={item.main_image} alt={item.title} /> : <Package size={80} />}
          </div>
          <div className="client-detail__content">
            <div className="client-card__meta">
              <span className={`badge badge--${item.type === 'donate' ? 'approved' : 'active'}`}>{item.type}</span>
              <span>{item.category_name || 'Uncategorized'}</span>
              <span>Posted by {item.owner_name || 'Campus member'}</span>
            </div>
            <h1 className="client-detail__title">{item.title}</h1>
            <p>{item.description || 'No description provided.'}</p>
          </div>
        </section>

        <aside className="client-side-panel">
          <div>
            <p className="text-muted">{item.type === 'donate' ? 'Donate item claim' : 'Marketplace purchase'}</p>
            <h2>{item.type === 'donate' ? 'Platform fee only' : money(item.price)}</h2>
          </div>
          {preview && (
            <div className="client-breakdown">
              <div className="client-breakdown__row"><span>Item price</span><strong>{money(preview.itemPrice)}</strong></div>
              <div className="client-breakdown__row"><span>Buyer platform fee</span><strong>{money(preview.buyerPlatformFee)}</strong></div>
              {item.type === 'sell' && <div className="client-breakdown__row"><span>Seller platform fee</span><strong>{money(preview.sellerPlatformFee)}</strong></div>}
              <div className="client-breakdown__row"><span>Buyer total</span><strong>{money(preview.buyerTotal)}</strong></div>
            </div>
          )}
          <Button variant="primary" size="lg" onClick={handleBuy} disabled={buying || user?.status !== 'active'}>
            {user?.status !== 'active' ? 'Awaiting Activation' : buying ? 'Creating...' : 'Buy'}
          </Button>
          {user?.status !== 'active' && <p className="text-muted">Admin activation is required before buying items.</p>}
          <Link className="btn btn--secondary btn--lg" to="/marketplace">Back to Marketplace</Link>
        </aside>
      </div>
    </div>
  );
}
