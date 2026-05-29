import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Info, Megaphone, Package, Search } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import ClientImageGallery from './ClientImageGallery.jsx';
import { money } from './clientUtils.js';
import './Client.css';

function DonatedItemModal({ item, onClose }) {
  return (
    <Modal isOpen={!!item} onClose={onClose} title={item?.title || 'Donated Item'} size="lg">
      {item && (
        <div className="client-donation-modal">
          <ClientImageGallery images={item.images || []} title={item.title} fallbackIcon={<Package size={72} />} variant="strip" />
          <div className="client-donation-modal__body">
            <div className="client-card__meta">
              <span className="badge badge--approved">donated item</span>
              <span>{item.category_name || 'Uncategorized'}</span>
            </div>
            <h2>{item.title}</h2>
            <p>{item.description || 'No description provided.'}</p>
            <div className="client-donation-facts">
              <div>
                <strong>{item.owner_name || 'Campus member'}</strong>
                <span>donor</span>
              </div>
              <div>
                <strong>{item.campaign_name || 'Donation campaign'}</strong>
                <span>campaign</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [amount, setAmount] = useState('10');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [donatedData, setDonatedData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [donatedPage, setDonatedPage] = useState(1);
  const [donatedSearch, setDonatedSearch] = useState('');
  const [selectedDonation, setSelectedDonation] = useState(null);

  useEffect(() => {
    api.get(`/client/campaigns/${campaignId}`).then((res) => setCampaign(res.data)).catch(() => {});
  }, [campaignId]);

  useEffect(() => {
    if (campaign?.type !== 'donation' || activeTab !== 'items') return;
    api.get(`/client/campaigns/${campaignId}/donated-items`, {
      params: { page: donatedPage, page_size: 9, search: donatedSearch },
    })
      .then((res) => setDonatedData(res.data))
      .catch(() => setDonatedData({ items: [], page: 1, pages: 1, total: 0 }));
  }, [activeTab, campaign?.type, campaignId, donatedPage, donatedSearch]);

  const donateMoney = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/client/campaigns/${campaignId}/donate-money`, { amount: Number(amount || 0) });
      navigate(`/payment/${data.id}`);
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not create donation request', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!campaign) {
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

  const showDonatedItems = campaign.type === 'donation' && activeTab === 'items';

  return (
    <div className="client-page">
      <nav className="client-breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={14} className="client-breadcrumb__sep" />
        <Link to="/campaigns">Campaigns</Link>
        <ChevronRight size={14} className="client-breadcrumb__sep" />
        <span className="client-breadcrumb__current">{campaign.title}</span>
      </nav>

      {campaign.type === 'donation' && (
        <div className="client-campaign-tabs">
          <button type="button" className={`client-campaign-tabs__item ${activeTab === 'info' ? 'client-campaign-tabs__item--active' : ''}`} onClick={() => setActiveTab('info')}>
            <Info size={16} />
            Campaign Info
          </button>
          <button type="button" className={`client-campaign-tabs__item ${activeTab === 'items' ? 'client-campaign-tabs__item--active' : ''}`} onClick={() => setActiveTab('items')}>
            <Package size={16} />
            Donated Items
          </button>
        </div>
      )}

      {showDonatedItems ? (
        <section className="client-donations-panel">
          <div className="client-section__header">
            <div>
              <h1 className="client-section__title">Donated Items</h1>
              <p className="client-section__copy">Approved donated items submitted to {campaign.title}.</p>
            </div>
            <Link className="btn btn--primary btn--md" to={`/campaigns/${campaignId}/donate-item`}>Create Donate Item</Link>
          </div>

          <div className="client-toolbar client-toolbar--compact">
            <Input
              id="donated-item-search"
              placeholder="Search donated items..."
              value={donatedSearch}
              onChange={(event) => {
                setDonatedSearch(event.target.value);
                setDonatedPage(1);
              }}
            />
            {donatedData.items.length > 0 && (
              <div className="client-toolbar__info">
                <span>{donatedData.total || donatedData.items.length} item{(donatedData.total || donatedData.items.length) !== 1 ? 's' : ''} found</span>
                <span>Page {donatedData.page} of {donatedData.pages}</span>
              </div>
            )}
          </div>

          {donatedData.items.length ? (
            <div className="client-donation-grid">
              {donatedData.items.map((item) => (
                <button key={item.id} type="button" className="client-donation-card" onClick={() => setSelectedDonation(item)}>
                  <span className="client-donation-card__media">
                    {item.main_image ? <img src={item.main_image} alt={item.title} /> : <Package size={40} />}
                  </span>
                  <span className="client-donation-card__body">
                    <span className="client-card__meta">
                      <span className="badge badge--approved">donated</span>
                      <span>{item.category_name || 'Uncategorized'}</span>
                    </span>
                    <strong>{item.title}</strong>
                    <span>{item.owner_name || 'Campus member'}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="client-empty">
              <span className="client-empty__icon"><Search size={28} /></span>
              <span className="client-empty__title">No donated items found</span>
              <span className="client-empty__copy">Approved donated items for this campaign will appear here.</span>
            </div>
          )}

          <Pagination page={donatedData.page} pages={donatedData.pages} onPageChange={setDonatedPage} />
          <DonatedItemModal item={selectedDonation} onClose={() => setSelectedDonation(null)} />
        </section>
      ) : (
        <div className="client-detail">
          {/* Left column: Images */}
          <section>
            <ClientImageGallery images={campaign.images || []} title={campaign.title} fallbackIcon={<Megaphone size={80} />} />
          </section>

          {/* Right column: Info + Action */}
          <aside className="client-detail__info-panel">
            <div className="client-detail__content">
              <div className="client-card__meta">
                <span className="badge badge--approved">{campaign.type}</span>
                {campaign.organization_id ? (
                  <Link to={`/org-public/${campaign.organization_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span style={{ transition: 'color var(--transition-fast)', fontWeight: 600 }} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'inherit'}>
                      {campaign.organization_name || 'Campus'}
                    </span>
                  </Link>
                ) : (
                  <span>{campaign.organization_name || 'Campus'}</span>
                )}
              </div>
              <h1 className="client-detail__title">{campaign.title}</h1>
              <p>{campaign.description || 'No description provided.'}</p>

              {/* Action section */}
              <div className="client-detail__buy-section">
                {campaign.type === 'fundraising' ? (
                  <>
                    <div>
                      <p className="text-muted">Fundraising donation</p>
                      <h2 className="client-detail__price">{money(amount)}</h2>
                    </div>
                    <Input id="donate-amount" label="Amount" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <Button variant="primary" size="lg" onClick={donateMoney} disabled={saving || user?.status !== 'active'}>
                      {user?.status !== 'active' ? 'Awaiting Activation' : saving ? 'Creating...' : 'Donate Money'}
                    </Button>
                    {user?.status !== 'active' && <p className="text-muted">Admin activation is required before donating money.</p>}
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-muted">Item donation</p>
                      <h2 className="client-detail__price">Donate an item</h2>
                    </div>
                    <Link className="btn btn--primary btn--lg" to={`/campaigns/${campaignId}/donate-item`}>Create Donate Item</Link>
                    {user?.status !== 'active' && <p className="text-muted">Admin activation is required before submitting campaign items.</p>}
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
