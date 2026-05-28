import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Image as ImageIcon, Megaphone, Package, Star, Trash2, Upload, X } from 'lucide-react';
import api from '../../api/client';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { money } from '../client/clientUtils.js';
import './Org.css';

function toInputDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function toApiDate(value) {
  return value ? new Date(value).toISOString() : null;
}

function fmtDate(value) {
  return value ? new Date(value).toLocaleDateString() : 'No date';
}

export default function OrgCampaignDetail() {
  const { orgId, campaignId } = useParams();
  const toast = useToast();
  const fileRef = useRef(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'fundraising', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDetail = useCallback(() => {
    api.get(`/org/${orgId}/campaigns/${campaignId}`)
      .then((res) => {
        setDetail(res.data);
        setForm({
          title: res.data.campaign.title || '',
          description: res.data.campaign.description || '',
          type: res.data.campaign.type || 'fundraising',
          start_date: toInputDate(res.data.campaign.start_date),
          end_date: toInputDate(res.data.campaign.end_date),
        });
      })
      .catch(() => {});
  }, [orgId, campaignId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/org/${orgId}/campaigns/${campaignId}`, {
        ...form,
        start_date: toApiDate(form.start_date),
        end_date: toApiDate(form.end_date),
      });
      setDetail((current) => current ? { ...current, campaign: res.data } : current);
      toast('Campaign updated.', 'success');
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not update campaign', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    setUploading(true);
    const data = new FormData();
    Array.from(files).forEach((file) => data.append('files', file));
    try {
      await api.post(`/org/${orgId}/campaigns/${campaignId}/images`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast('Campaign images uploaded.', 'success');
      fetchDetail();
    } catch (err) {
      toast(err.response?.data?.detail || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const setMainImage = async (imageId) => {
    try {
      await api.put(`/org/${orgId}/campaigns/images/${imageId}/main`);
      toast('Main image updated.', 'success');
      fetchDetail();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not set main image', 'error');
    }
  };

  const deleteImage = async (imageId) => {
    try {
      await api.delete(`/org/${orgId}/campaigns/images/${imageId}`);
      toast('Image deleted.', 'success');
      fetchDetail();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not delete image', 'error');
    }
  };

  const updateCampaignItem = async (campaignItemId, status) => {
    try {
      await api.put(`/org/${orgId}/campaign-items/${campaignItemId}`, { status });
      toast(status === 'approved' ? 'Item approved.' : 'Item rejected.', 'success');
      fetchDetail();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not update item', 'error');
    }
  };

  if (!detail) {
    return <div className="org-page"><div className="client-empty"><span className="client-empty__title">Loading campaign detail...</span></div></div>;
  }

  const { campaign, images, stats, money_donations: donations, campaign_items: campaignItems } = detail;
  const pendingItems = campaignItems.filter((item) => item.status === 'pending' && item.item_status === 'approved');

  return (
    <div className="org-page">
      <div className="org-page__header">
        <div>
          <p className="org-eyebrow">Campaign detail</p>
          <h1>{campaign.title}</h1>
          <p className="org-copy">{campaign.organization_name} · {campaign.type} · {fmtDate(campaign.start_date)}</p>
        </div>
        <Link className="btn btn--secondary btn--md" to={`/org/${orgId}/campaigns`}>Back to Campaigns</Link>
      </div>

      <section className="org-detail-hero">
        <div className="org-detail-hero__media">
          {campaign.main_image ? <img src={campaign.main_image} alt={campaign.title} /> : <Megaphone size={64} />}
        </div>
        <div className="org-detail-hero__content">
          <div className="org-card-meta">
            <span className={`badge badge--${campaign.status}`}>{campaign.status}</span>
            <span>{campaign.type}</span>
          </div>
          <p>{campaign.description || 'No description provided.'}</p>
          <div className="org-review-strip org-review-strip--compact">
            <div>
              <strong>{stats.pending_items}</strong>
              <span>pending items</span>
            </div>
            <div>
              <strong>{stats.approved_items}</strong>
              <span>approved items</span>
            </div>
            <div>
              <strong>{money(stats.total_money_donations || 0)}</strong>
              <span>raised</span>
            </div>
          </div>
        </div>
      </section>

      <section className="org-detail-grid">
        <form className="org-panel" onSubmit={handleSave}>
          <div className="org-panel__header">
            <h2>Campaign Settings</h2>
            <span>Campus approval controls public visibility</span>
          </div>
          <Input id="org-detail-title" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="org-form-grid">
            <Input id="org-detail-type" label="Type" type="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="fundraising">Fundraising</option>
              <option value="donation">Donation</option>
            </Input>
            <Input id="org-detail-status" label="Status" value={campaign.status} disabled />
          </div>
          <div className="org-form-grid">
            <Input id="org-detail-start" label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input id="org-detail-end" label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <Input id="org-detail-desc" label="Description" type="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </form>

        <section className="org-panel">
          <div className="org-panel__header">
            <h2>Campaign Images</h2>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} hidden />
          </div>
          {images.length ? (
            <div className="org-image-grid">
              {images.map((image) => (
                <div key={image.id} className={`org-image-card ${image.is_main ? 'org-image-card--main' : ''}`}>
                  <img src={image.image_path} alt="" />
                  {image.is_main && <span>Main</span>}
                  <div className="org-image-card__actions">
                    <button type="button" title="Set main" onClick={() => setMainImage(image.id)} disabled={image.is_main}><Star size={16} /></button>
                    <button type="button" title="Delete" onClick={() => deleteImage(image.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="org-empty-inline">
              <ImageIcon size={40} />
              <span>No campaign images yet. Upload to add visual appeal.</span>
            </div>
          )}
        </section>
      </section>

      {campaign.type === 'donation' ? (
        <section className="org-panel">
          <div className="org-panel__header">
            <h2>Submitted Items</h2>
            <span>{pendingItems.length} pending review</span>
          </div>
          {campaignItems.length ? (
            <div className="org-submission-list">
              {campaignItems.map((item) => (
                <div key={item.id} className="org-submission">
                  <div className="org-submission__media">
                    {item.main_image ? <img src={item.main_image} alt={item.item_title} /> : <Package size={24} />}
                  </div>
                  <div>
                    <div className="org-card-meta">
                      <span className={`badge badge--${item.status}`}>campaign: {item.status}</span>
                      <span className={`badge badge--${item.item_status}`}>item: {item.item_status}</span>
                    </div>
                    <h3>{item.item_title}</h3>
                    <p>{item.donor_name || 'Unknown donor'} · {item.donor_email || 'No email'}</p>
                  </div>
                  {item.status === 'pending' && item.item_status === 'approved' && (
                    <div className="org-submission__actions">
                      <Button variant="primary" size="sm" onClick={() => updateCampaignItem(item.id, 'approved')}><Check size={16} /> Approve</Button>
                      <Button variant="danger" size="sm" onClick={() => updateCampaignItem(item.id, 'rejected')}><X size={16} /> Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="client-empty">
              <span className="client-empty__icon"><Package size={28} /></span>
              <span className="client-empty__title">No item submissions yet</span>
              <span className="client-empty__copy">Items submitted by users will appear here for your review.</span>
            </div>
          )}
        </section>
      ) : (
        <section className="org-panel">
          <div className="org-panel__header">
            <h2>Fund Contributors</h2>
            <span>{donations.length} recent donation requests</span>
          </div>
          {donations.length ? (
            <div className="org-donor-list">
              {donations.map((donation) => (
                <div key={donation.id} className="org-donor-row">
                  <div>
                    <strong>{donation.donor_name || 'Unknown donor'}</strong>
                    <span>{donation.donor_email || 'No email'}</span>
                  </div>
                  <span className={`badge badge--${donation.status}`}>{donation.status}</span>
                  <strong>{money(donation.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="client-empty">
              <span className="client-empty__icon"><Megaphone size={28} /></span>
              <span className="client-empty__title">No fund donations yet</span>
              <span className="client-empty__copy">Donation requests from users will appear here.</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
