import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ChevronRight, Package } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import ClientImageGallery from './ClientImageGallery.jsx';
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
      if (res.data.type !== 'sell') return;
      api.get(`/client/items/${itemId}/purchase-preview`).then((previewRes) => setPreview({
        itemPrice: Number(previewRes.data.item_price),
        buyerPlatformFee: Number(previewRes.data.buyer_platform_fee),
        sellerPlatformFee: Number(previewRes.data.seller_platform_fee),
        platformFee: Number(previewRes.data.platform_fee),
        buyerTotal: Number(previewRes.data.buyer_total),
        sellerReceives: Number(previewRes.data.seller_receives),
      })).catch(() => {});
    }).catch(() => {});
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

      <div className={`client-detail ${item.type === 'donate' ? 'client-detail--single' : ''}`}>
        <section>
          <ClientImageGallery images={item.images || []} title={item.title} fallbackIcon={<Package size={80} />} />
          <div className="client-detail__content">
            <div className="client-card__meta">
              <span className={`badge badge--${item.type === 'donate' ? 'approved' : 'active'}`}>{item.type}</span>
              <span>{item.category_name || 'Uncategorized'}</span>
              <span>Posted by {item.owner_name || 'Campus member'}</span>
            </div>
            <h1 className="client-detail__title">{item.title}</h1>
            <p>{item.description || 'No description provided.'}</p>
            {item.type === 'donate' && (
              <>
                <div className="client-linked-info">
                  <div>
                    <span>Campaign</span>
                    <strong>{item.campaign_name || 'Donation campaign'}</strong>
                  </div>
                  {item.campaign_id && (
                    <Link className="client-linked-info__action" to={`/campaigns/${item.campaign_id}`} aria-label="Open campaign detail">
                      <ArrowRight size={20} />
                    </Link>
                  )}
                </div>
                <div className="client-detail__actions">
                  <Link className="btn btn--secondary btn--lg" to={item.campaign_id ? `/campaigns/${item.campaign_id}` : '/campaigns'}>View Campaign</Link>
                </div>
              </>
            )}
          </div>
        </section>

        {item.type === 'sell' && (
          <aside className="client-side-panel">
            <div>
              <p className="text-muted">Final Price (including fees)</p>
              <h2>{preview ? money(preview.buyerTotal) : money(item.price)}</h2>
            </div>
            <Button variant="primary" size="lg" onClick={handleBuy} disabled={buying || user?.status !== 'active'}>
              {user?.status !== 'active' ? 'Awaiting Activation' : buying ? 'Creating...' : 'Buy'}
            </Button>
            {user?.status !== 'active' && <p className="text-muted">Admin activation is required before buying items.</p>}
            <Link className="btn btn--secondary btn--lg" to="/marketplace">Back to Marketplace</Link>
          </aside>
        )}
      </div>
    </div>
  );
}
