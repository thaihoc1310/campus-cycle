import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  Check,
  Clock,
  DollarSign,
  Edit3,
  Megaphone,
  MoreVertical,
  Package,
  Trash2,
  X,
} from 'lucide-react';
import api from '../../api/client';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import ClientImageGallery from '../client/ClientImageGallery.jsx';
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

/** Compute the effective display status for an org campaign item. */
function effectiveItemStatus(item) {
  if (item.item_status === 'rejected' || item.status === 'rejected') {
    return { label: 'Rejected', variant: 'rejected' };
  }
  if (item.item_status === 'pending') {
    return { label: 'Awaiting Admin', variant: 'pending' };
  }
  if (item.status === 'approved' && item.item_status === 'approved') {
    return { label: 'Approved', variant: 'approved' };
  }
  if (item.status === 'pending' && item.item_status === 'approved') {
    return { label: 'Pending Review', variant: 'pending' };
  }
  return { label: item.status, variant: item.status };
}

export default function OrgCampaignDetail() {
  const { orgId, campaignId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'fundraising', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Menu & modals
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const menuRef = useRef(null);

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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  /* ---- Actions ---- */
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
      setEditOpen(false);
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not update campaign', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/org/${orgId}/campaigns/${campaignId}`);
      toast('Campaign deleted.', 'success');
      navigate(`/org/${orgId}/campaigns`);
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not delete campaign', 'error');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
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
      setPreviewItem(null);
      fetchDetail();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not update item', 'error');
    }
  };

  /* ---- Loading ---- */
  if (!detail) {
    return <div className="org-page"><div className="client-empty"><span className="client-empty__title">Loading campaign detail...</span></div></div>;
  }

  const { campaign, images, stats, money_donations: donations, campaign_items: campaignItems } = detail;
  const canDelete = campaign.status !== 'approved';
  const actionableItem = previewItem && previewItem.status === 'pending' && previewItem.item_status === 'approved';

  return (
    <div className="org-page">
      {/* Header */}
      <div className="org-page__header">
        <div>
          <p className="org-eyebrow">Campaign detail</p>
          <h1>{campaign.title}</h1>
          <p className="org-copy">{campaign.organization_name} · {campaign.type} · {fmtDate(campaign.start_date)}</p>
        </div>
        <Link className="btn btn--secondary btn--md" to={`/org/${orgId}/campaigns`}>Back to Campaigns</Link>
      </div>

      {/* Hero Section */}
      <section className="org-detail-hero">
        <ClientImageGallery
          images={images}
          title={campaign.title}
          fallbackIcon={<Megaphone size={64} />}
          onAddImage={handleUpload}
          onDeleteImage={deleteImage}
          onSetMainImage={setMainImage}
        />
        <div className="org-detail-hero__content">
          {/* Status + Type + Menu */}
          <div className="org-detail-hero__top">
            <div className="org-card-meta">
              <span className={`badge badge--${campaign.status}`}>{campaign.status}</span>
              <span className="org-detail-type-badge">{campaign.type}</span>
            </div>
            <div className="org-menu-container" ref={menuRef}>
              <button type="button" className="org-menu-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Campaign actions">
                <MoreVertical size={20} />
              </button>
              {menuOpen && (
                <div className="org-menu-dropdown">
                  <button type="button" onClick={() => { setMenuOpen(false); setEditOpen(true); }}>
                    <Edit3 size={15} /> Edit Campaign
                  </button>
                  <button
                    type="button"
                    className="org-menu-dropdown__danger"
                    disabled={!canDelete}
                    onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
                    title={!canDelete ? 'Cannot delete an approved campaign' : ''}
                  >
                    <Trash2 size={15} /> Delete Campaign
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="org-detail-desc">{campaign.description || 'No description provided.'}</p>

          {/* Info Grid */}
          <div className="org-detail-info-grid">
            <div className="org-detail-info-block">
              <span className="org-detail-info-block__icon org-detail-info-block__icon--green"><Calendar size={14} /></span>
              <div>
                <span className="org-detail-info-block__label">Start Date</span>
                <strong>{fmtDate(campaign.start_date)}</strong>
              </div>
            </div>
            <div className="org-detail-info-block">
              <span className="org-detail-info-block__icon org-detail-info-block__icon--amber"><Clock size={14} /></span>
              <div>
                <span className="org-detail-info-block__label">End Date</span>
                <strong>{fmtDate(campaign.end_date)}</strong>
              </div>
            </div>
          </div>

          {/* Stats Strip — conditional by campaign type */}
          {campaign.type === 'donation' ? (
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
                <strong>{stats.rejected_items}</strong>
                <span>rejected items</span>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </section>

      {/* Submitted Items / Fund Contributors */}
      {campaign.type === 'donation' ? (
        <section className="org-panel">
          <div className="org-panel__header">
            <h2>Submitted Items</h2>
            <span>{campaignItems.filter((i) => i.status === 'pending' && i.item_status === 'approved').length} pending review</span>
          </div>
          {campaignItems.length ? (
            <div className="org-submission-list">
              {campaignItems.map((item) => {
                const es = effectiveItemStatus(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="org-submission org-submission--clickable"
                    onClick={() => setPreviewItem(item)}
                  >
                    <div className="org-submission__media">
                      {item.main_image ? <img src={item.main_image} alt={item.item_title} /> : <Package size={24} />}
                    </div>
                    <div className="org-submission__info">
                      <h3>{item.item_title}</h3>
                      <p>{item.donor_name || 'Unknown donor'}</p>
                    </div>
                    <span className={`badge badge--${es.variant}`}>{es.label}</span>
                  </button>
                );
              })}
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

      {/* ---- Edit Campaign Modal ---- */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Campaign" size="md">
        <form className="org-modal-form" onSubmit={handleSave}>
          <Input id="org-edit-title" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="org-form-grid">
            <Input id="org-edit-type" label="Type" type="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="fundraising">Fundraising</option>
              <option value="donation">Donation</option>
            </Input>
            <Input id="org-edit-status" label="Status" value={campaign.status} disabled />
          </div>
          <div className="org-form-grid">
            <Input id="org-edit-start" label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input id="org-edit-end" label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <Input id="org-edit-desc" label="Description" type="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="modal__actions">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* ---- Delete Confirm ---- */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Campaign"
        message={`Are you sure you want to delete "${campaign.title}"? This action cannot be undone.`}
        loading={deleting}
      />

      {/* ---- Item Preview Modal ---- */}
      <Modal isOpen={!!previewItem} onClose={() => setPreviewItem(null)} title="Item Details" size="md">
        {previewItem && (() => {
          const es = effectiveItemStatus(previewItem);
          const previewImages = (previewItem.item_images || []).length
            ? previewItem.item_images.map((p) => ({ image_path: p }))
            : previewItem.main_image ? [{ image_path: previewItem.main_image }] : [];
          return (
            <div className="org-item-preview">
              {previewImages.length > 0 ? (
                <ClientImageGallery images={previewImages} title={previewItem.item_title} fallbackIcon={<Package size={48} />} />
              ) : (
                <div className="org-item-preview__media">
                  <Package size={48} />
                </div>
              )}
              <div className="org-item-preview__body">
                <div className="org-item-preview__header">
                  <h3>{previewItem.item_title}</h3>
                  <span className={`badge badge--${es.variant}`}>{es.label}</span>
                </div>
                {previewItem.item_description && (
                  <p className="org-detail-desc">{previewItem.item_description}</p>
                )}
                <div className="org-item-preview__details">
                  <div className="org-item-preview__detail">
                    <span>Donor</span>
                    <strong>{previewItem.donor_name || 'Unknown'}</strong>
                  </div>
                  <div className="org-item-preview__detail">
                    <span>Email</span>
                    <strong>{previewItem.donor_email || 'N/A'}</strong>
                  </div>
                  <div className="org-item-preview__detail">
                    <span>Item Type</span>
                    <strong style={{ textTransform: 'capitalize' }}>{previewItem.item_type}</strong>
                  </div>
                  <div className="org-item-preview__detail">
                    <span>Submitted</span>
                    <strong>{new Date(previewItem.created_at).toLocaleDateString()}</strong>
                  </div>
                </div>
              </div>
              {actionableItem && (
                <div className="org-item-preview__actions">
                  <Button variant="primary" onClick={() => updateCampaignItem(previewItem.id, 'approved')}>
                    <Check size={16} /> Approve
                  </Button>
                  <Button variant="danger" onClick={() => updateCampaignItem(previewItem.id, 'rejected')}>
                    <X size={16} /> Reject
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
