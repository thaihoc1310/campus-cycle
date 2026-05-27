import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { money } from './clientUtils.js';
import './Client.css';

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const toast = useToast();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [amount, setAmount] = useState('10');
  const [myItems, setMyItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/client/campaigns/${campaignId}`).then((res) => setCampaign(res.data)).catch(() => {});
  }, [campaignId]);

  useEffect(() => {
    api.get('/client/items/my', { params: { page_size: 60 } })
      .then((res) => {
        const items = (res.data.items || []).filter((item) => item.type === 'donate' && !['rejected', 'sold', 'donated'].includes(item.status));
        setMyItems(items);
        setSelectedItemId(items[0]?.id || '');
      })
      .catch(() => {});
  }, []);

  const donateMoney = async () => {
    setSaving(true);
    try {
      await api.post(`/client/campaigns/${campaignId}/donate-money`, { amount: Number(amount || 0) });
      toast('Money donation request created. Billing system will handle payment.', 'success');
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not create donation request', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitItem = async () => {
    setSaving(true);
    try {
      await api.post(`/client/campaigns/${campaignId}/items`, { item_id: selectedItemId });
      toast('Item submitted to campaign review.', 'success');
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not submit item', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!campaign) return <div className="client-page"><div className="client-empty">Loading campaign...</div></div>;

  return (
    <div className="client-page">
      <div className="client-detail">
        <section>
          <div className="client-detail__media">
            {campaign.main_image ? <img src={campaign.main_image} alt={campaign.title} /> : <Megaphone size={80} />}
          </div>
          <div className="client-detail__content">
            <div className="client-card__meta">
              <span className="badge badge--approved">{campaign.type}</span>
              <span>{campaign.organization_name || 'Campus'}</span>
            </div>
            <h1 className="client-detail__title">{campaign.title}</h1>
            <p>{campaign.description || 'No description provided.'}</p>
          </div>
        </section>

        <aside className="client-side-panel">
          {campaign.type === 'fundraising' ? (
            <>
              <div>
                <p className="text-muted">Fundraising donation</p>
                <h2>{money(amount)}</h2>
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
                <h2>Submit a donate item</h2>
              </div>
              {myItems.length ? (
                <>
                  <Input id="campaign-item" label="Your Donate Item" type="select" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                    {myItems.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.status})</option>)}
                  </Input>
                  <Button variant="primary" size="lg" onClick={submitItem} disabled={saving || !selectedItemId || user?.status !== 'active'}>
                    {user?.status !== 'active' ? 'Awaiting Activation' : saving ? 'Submitting...' : 'Submit Item'}
                  </Button>
                  {user?.status !== 'active' && <p className="text-muted">Admin activation is required before submitting campaign items.</p>}
                </>
              ) : (
                <div className="client-empty">Create a donate item first, then submit it to this campaign.</div>
              )}
              <Link className="btn btn--secondary btn--lg" to="/post-item">Post Donate Item</Link>
            </>
          )}
          <Link className="btn btn--secondary btn--lg" to="/campaigns">Back to Campaigns</Link>
        </aside>
      </div>
    </div>
  );
}
