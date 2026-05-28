import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, FileText, Gift, Megaphone } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import ItemImagePicker from './ItemImagePicker.jsx';
import './Client.css';

export default function DonateItem() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [campaign, setCampaign] = useState(null);
  const [campaignError, setCampaignError] = useState('');
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category_id: '' });
  const [imageFiles, setImageFiles] = useState([]);

  useEffect(() => {
    let active = true;
    setLoadingCampaign(true);
    api.get(`/client/campaigns/${campaignId}`)
      .then((res) => {
        if (!active) return;
        if (res.data.type !== 'donation') {
          setCampaignError('This campaign does not accept item donations.');
          setCampaign(null);
          return;
        }
        setCampaign(res.data);
        setCampaignError('');
      })
      .catch((err) => {
        if (!active) return;
        setCampaignError(err.response?.data?.detail || 'Campaign not found');
        setCampaign(null);
      })
      .finally(() => {
        if (active) setLoadingCampaign(false);
      });
    return () => { active = false; };
  }, [campaignId]);

  useEffect(() => {
    api.get('/client/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  if (user?.status !== 'active') {
    return (
      <div className="client-page">
        <div className="client-empty">
          <span className="client-empty__icon"><FileText size={28} /></span>
          <span className="client-empty__title">Account awaiting activation</span>
          <span className="client-empty__copy">
            Your account is awaiting admin activation. You can browse campaigns, but cannot donate items yet.
          </span>
        </div>
      </div>
    );
  }

  if (loadingCampaign) {
    return (
      <div className="client-page">
        <div className="client-skeleton">
          <div className="client-skeleton__block client-skeleton__block--title" />
          <div className="client-skeleton__block client-skeleton__block--text" />
          <div className="client-skeleton__block client-skeleton__block--hero" />
        </div>
      </div>
    );
  }

  if (campaignError || !campaign) {
    return (
      <div className="client-page">
        <div className="client-empty">
          <span className="client-empty__icon"><Megaphone size={28} /></span>
          <span className="client-empty__title">Donation campaign required</span>
          <span className="client-empty__copy">{campaignError || 'Choose an approved donation campaign before donating an item.'}</span>
          <Link className="btn btn--primary btn--md" to="/campaigns">View Campaigns</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/client/items', {
        title: form.title,
        description: form.description,
        price: 0,
        type: 'donate',
        category_id: form.category_id || null,
        campaign_id: campaign.id,
      });
      if (imageFiles.length) {
        try {
          const data = new FormData();
          imageFiles.forEach((file) => data.append('files', file));
          await api.post(`/client/items/${res.data.id}/images`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (imageErr) {
          toast(imageErr.response?.data?.detail || 'Donate item created, but images could not upload', 'error');
        }
      }
      toast('Donate item submitted to campaign review.', 'success');
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not submit donate item', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="client-page">
      <nav className="client-breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={14} className="client-breadcrumb__sep" />
        <Link to="/campaigns">Campaigns</Link>
        <ChevronRight size={14} className="client-breadcrumb__sep" />
        <Link to={`/campaigns/${campaign.id}`}>{campaign.title}</Link>
        <ChevronRight size={14} className="client-breadcrumb__sep" />
        <span className="client-breadcrumb__current">Donate Item</span>
      </nav>

      <form className="client-form-panel" onSubmit={handleSubmit}>
        <div>
          <div className="client-card__meta">
            <span className="badge badge--approved">donation campaign</span>
            <span>{campaign.organization_name || 'Campus'}</span>
          </div>
          <h1 className="client-section__title">Donate Item</h1>
          <p className="client-section__copy">Submit a donate item directly to {campaign.title} for review.</p>
        </div>

        <Input id="donate-title" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <Input id="donate-category" label="Category" type="select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">No category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </Input>
        <Input id="donate-description" label="Description" type="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <ItemImagePicker files={imageFiles} onChange={setImageFiles} />

        <div className="client-row-card">
          <div>
            <strong>Submitted to {campaign.title}</strong>
            <p className="text-muted">Donate items have no item price and no platform fee.</p>
          </div>
          <span className="client-empty__icon"><Gift size={22} /></span>
        </div>

        <div className="client-form-actions">
          <Link className="btn btn--secondary btn--lg" to={`/campaigns/${campaign.id}`}>Back to Campaign</Link>
          <Button type="submit" variant="primary" size="lg" disabled={saving}>{saving ? 'Submitting...' : 'Submit Donate Item'}</Button>
        </div>
      </form>
    </div>
  );
}
