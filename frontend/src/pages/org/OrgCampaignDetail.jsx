import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  Check,
  Clock,
  DollarSign,
  Edit3,
  Filter,
  Info,
  Mail,
  Megaphone,
  MoreVertical,
  Package,
  Phone,
  Search,
  Trash2,
  User,
  X,
  BarChart2,
  PieChart,
  TrendingUp,
  Award,
  Activity,
  Percent,
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
  if (item.item_status === 'rejected') {
    return { label: 'Rejected by Campus', variant: 'rejected' };
  }
  if (item.status === 'rejected') {
    return { label: 'Rejected by Organization', variant: 'rejected' };
  }
  if (item.status === 'received' && item.item_status === 'donated') {
    return { label: 'Donated', variant: 'donated' };
  }
  if (item.status === 'handover' && item.item_status === 'approved') {
    return { label: 'Handover', variant: 'handover' };
  }
  if (item.status === 'pending' && item.item_status === 'approved') {
    return { label: 'Awaiting Organization Review', variant: 'pending' };
  }
  if (item.item_status === 'pending') {
    return { label: 'Awaiting Campus Review', variant: 'pending' };
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

  // Tabs
  const [activeTab, setActiveTab] = useState('info');

  // Menu & modals
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const menuRef = useRef(null);

  // Submissions search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

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

  // Debounced search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('');
    setShowFilters(false);
  };

  const hasActiveFilters = debouncedSearch || statusFilter;

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
      const messages = {
        handover: 'Item accepted. Contact the donor to arrange handover.',
        received: 'Handover completed. Item is now counted as donated.',
        rejected: 'Item rejected.',
      };
      toast(messages[status], 'success');
      setPreviewItem(null);
      fetchDetail();
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not update item', 'error');
    }
  };

  /* ---- Filtered items / donations ---- */
  const filteredCampaignItems = useMemo(() => {
    if (!detail) return [];
    let items = detail.campaign_items || [];
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      items = items.filter((i) =>
        (i.item_title || '').toLowerCase().includes(query) ||
        (i.donor_name || '').toLowerCase().includes(query) ||
        (i.donor_email || '').toLowerCase().includes(query)
      );
    }
    if (statusFilter) {
      items = items.filter((i) => {
        const es = effectiveItemStatus(i);
        if (statusFilter === 'pending') return es.variant === 'pending';
        if (statusFilter === 'handover') return es.variant === 'handover';
        if (statusFilter === 'donated') return es.variant === 'donated';
        if (statusFilter === 'rejected') return es.variant === 'rejected';
        return true;
      });
    }
    return items;
  }, [detail, debouncedSearch, statusFilter]);

  const filteredDonations = useMemo(() => {
    if (!detail) return [];
    let donations = detail.money_donations || [];
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      donations = donations.filter((d) =>
        (d.donor_name || '').toLowerCase().includes(query) ||
        (d.donor_email || '').toLowerCase().includes(query)
      );
    }
    return donations;
  }, [detail, debouncedSearch]);

  // Dynamic total for filtered donations
  const filteredDonationTotal = useMemo(() => {
    return filteredDonations
      .filter((d) => d.status === 'completed')
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  }, [filteredDonations]);

  // Categorized items for donation campaigns
  const pendingItems = useMemo(() =>
    filteredCampaignItems.filter((i) => effectiveItemStatus(i).variant === 'pending'),
    [filteredCampaignItems]
  );
  const handoverItems = useMemo(() =>
    filteredCampaignItems.filter((i) => effectiveItemStatus(i).variant === 'handover'),
    [filteredCampaignItems]
  );
  const donatedItems = useMemo(() =>
    filteredCampaignItems.filter((i) => effectiveItemStatus(i).variant === 'donated'),
    [filteredCampaignItems]
  );
  const rejectedItems = useMemo(() =>
    filteredCampaignItems.filter((i) => effectiveItemStatus(i).variant === 'rejected'),
    [filteredCampaignItems]
  );

  // ===== BI & ANALYTICS DATA CALCULATIONS =====
  const biCategoryData = useMemo(() => {
    if (!detail || !detail.campaign_items) return [];
    const counts = {};
    detail.campaign_items.forEach((item) => {
      const cat = item.category_name || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const total = detail.campaign_items.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [detail]);

  const biStatusData = useMemo(() => {
    if (!detail || !detail.campaign_items) return { pending: 0, handover: 0, donated: 0, rejected: 0, total: 0 };
    let pending = 0, handover = 0, donated = 0, rejected = 0;
    detail.campaign_items.forEach((item) => {
      const status = effectiveItemStatus(item).variant;
      if (status === 'pending') pending++;
      else if (status === 'handover') handover++;
      else if (status === 'donated') donated++;
      else if (status === 'rejected') rejected++;
    });
    const total = detail.campaign_items.length;
    return {
      pending,
      handover,
      donated,
      rejected,
      total,
      donatedRate: total ? Math.round((donated / total) * 100) : 0,
    };
  }, [detail]);

  const biTopDonors = useMemo(() => {
    if (!detail || !detail.campaign_items) return [];
    const donors = {};
    detail.campaign_items.forEach((item) => {
      if (effectiveItemStatus(item).variant !== 'donated') return;
      const email = item.donor_email || 'anonymous@campus.edu';
      const name = item.donor_name || 'Anonymous';
      if (!donors[email]) {
        donors[email] = { name, email, count: 0 };
      }
      donors[email].count += 1;
    });
    return Object.values(donors).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [detail]);

  const biFundraisingChart = useMemo(() => {
    if (!detail || !detail.money_donations) return [];
    // Sort transactions chronologically, take last 8 completed donations
    const completed = detail.money_donations
      .filter((d) => d.status === 'completed')
      .slice()
      .reverse(); // chronological
    const last8 = completed.slice(-8);
    if (last8.length === 0) return [];
    const maxVal = Math.max(...last8.map((d) => Number(d.amount)), 10);
    return last8.map((d) => ({
      id: d.id,
      amount: Number(d.amount),
      label: d.donor_name ? d.donor_name.split(' ')[0] : 'Donor',
      percentage: Math.round((Number(d.amount) / maxVal) * 100),
      date: new Date(d.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }));
  }, [detail]);

  const biTopContributors = useMemo(() => {
    if (!detail || !detail.money_donations) return [];
    const donors = {};
    detail.money_donations.forEach((d) => {
      if (d.status !== 'completed') return;
      const email = d.donor_email || 'anonymous@campus.edu';
      const name = d.donor_name || 'Anonymous';
      if (!donors[email]) {
        donors[email] = { name, email, totalAmount: 0, count: 0 };
      }
      donors[email].totalAmount += Number(d.amount);
      donors[email].count += 1;
    });
    return Object.values(donors).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5);
  }, [detail]);

  /* ---- Loading ---- */
  if (!detail) {
    return <div className="org-page"><div className="client-empty"><span className="client-empty__title">Loading campaign detail...</span></div></div>;
  }

  const { campaign, images, stats, money_donations: donations, campaign_items: campaignItems } = detail;
  const canDelete = campaign.status !== 'approved';
  const canAcceptItem = previewItem && previewItem.status === 'pending' && previewItem.item_status === 'approved';
  const canCompleteHandover = previewItem && previewItem.status === 'handover' && previewItem.item_status === 'approved';
  const canRejectItem = previewItem && ['pending', 'handover'].includes(previewItem.status) && previewItem.item_status === 'approved';

  /* ---- Render section of items (MyItems-style) ---- */
  const renderItemSection = (title, copy, items) => (
    <section className="org-submissions-section">
      <div className="org-submissions-section__header">
        <div>
          <h2 className="org-submissions-section__title">{title}</h2>
          <p className="org-submissions-section__copy">{copy}</p>
        </div>
      </div>
      {items.length ? (
        <div className="org-submission-list">
          {items.map((item) => {
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
          <span className="client-empty__title">No {title.toLowerCase()}</span>
          <span className="client-empty__copy">Items matching this filter will appear here.</span>
        </div>
      )}
    </section>
  );

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

      {/* Side-by-side layout: Left nav + Content */}
      <div className="org-campaign-layout">
        <nav className="org-campaign-sidenav">
          <button
            type="button"
            className={`org-campaign-sidenav__item ${activeTab === 'info' ? 'org-campaign-sidenav__item--active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <Info size={16} />
            Campaign Info
          </button>
          <button
            type="button"
            className={`org-campaign-sidenav__item ${activeTab === 'submissions' ? 'org-campaign-sidenav__item--active' : ''}`}
            onClick={() => setActiveTab('submissions')}
          >
            {campaign.type === 'donation' ? <Package size={16} /> : <DollarSign size={16} />}
            {campaign.type === 'donation' ? 'Submitted Items' : 'Fund Donations'}
          </button>
          <button
            type="button"
            className={`org-campaign-sidenav__item ${activeTab === 'analytics' ? 'org-campaign-sidenav__item--active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 size={16} />
            Analytics & BI
          </button>
        </nav>

        <div className="org-campaign-content">

      {/* ===== TAB 1: Campaign Info ===== */}
      {activeTab === 'info' && (
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
                  <span>awaiting review</span>
                </div>
                <div>
                  <strong>{stats.handover_items}</strong>
                  <span>handover</span>
                </div>
                <div>
                  <strong>{stats.donated_items}</strong>
                  <span>donated</span>
                </div>
                <div>
                  <strong>{stats.rejected_items}</strong>
                  <span>rejected items</span>
                </div>
              </div>
            ) : (
              <div className="org-review-strip org-review-strip--compact">
                <div>
                  <strong>{stats.money_donations}</strong>
                  <span>completed donations</span>
                </div>
                <div>
                  <strong>{money(stats.total_money_donations || 0)}</strong>
                  <span>raised</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== TAB 2: Submissions ===== */}
      {activeTab === 'submissions' && campaign.type === 'donation' && (
        <div className="org-submissions-panel">
          {/* Search & Filter Bar */}
          <div className="org-search-bar">
            <div className="org-search-bar__input-wrap">
              <Search size={18} className="org-search-bar__icon" />
              <input
                id="org-submissions-search"
                type="text"
                placeholder="Search by item title or donor name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="org-search-bar__input"
              />
            </div>
            <button
              type="button"
              className={`org-search-bar__filter-btn ${showFilters ? 'org-search-bar__filter-btn--active' : ''}`}
              onClick={() => setShowFilters((s) => !s)}
            >
              <Filter size={18} />
              <span>Filters</span>
            </button>
            {hasActiveFilters && (
              <button type="button" className="org-search-bar__clear" onClick={clearFilters}>
                <X size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {showFilters && (
            <div className="org-filters">
              <div className="org-filters__group">
                <label className="org-filters__label" htmlFor="org-item-status-filter">Status</label>
                <select
                  id="org-item-status-filter"
                  className="org-filters__select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="pending">Awaiting Review</option>
                  <option value="handover">Handover</option>
                  <option value="donated">Donated</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          )}

          {/* Categorized sections */}
          {renderItemSection(
            'Awaiting Organization Review',
            `${pendingItems.length} item${pendingItems.length !== 1 ? 's' : ''} ready for your accept or reject decision.`,
            pendingItems
          )}
          {renderItemSection(
            'Handover',
            `${handoverItems.length} accepted item${handoverItems.length !== 1 ? 's' : ''} waiting to be received.`,
            handoverItems
          )}
          {renderItemSection(
            'Donated',
            `${donatedItems.length} item${donatedItems.length !== 1 ? 's' : ''} physically received and counted as donated.`,
            donatedItems
          )}
          {renderItemSection(
            'Rejected',
            `${rejectedItems.length} item${rejectedItems.length !== 1 ? 's' : ''} rejected.`,
            rejectedItems
          )}
        </div>
      )}

      {activeTab === 'submissions' && campaign.type === 'fundraising' && (
        <div className="org-submissions-panel">
          {/* Search Bar */}
          <div className="org-search-bar">
            <div className="org-search-bar__input-wrap">
              <Search size={18} className="org-search-bar__icon" />
              <input
                id="org-donations-search"
                type="text"
                placeholder="Search by donor name or email..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="org-search-bar__input"
              />
            </div>
            {debouncedSearch && (
              <button type="button" className="org-search-bar__clear" onClick={clearFilters}>
                <X size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Flat transaction list */}
          <section className="org-submissions-section">
            <div className="org-submissions-section__header">
              <div>
                <h2 className="org-submissions-section__title">Fund Contributors</h2>
                <p className="org-submissions-section__copy">
                  {filteredDonations.length} donation{filteredDonations.length !== 1 ? 's' : ''} · Total raised: {money(filteredDonationTotal)}{debouncedSearch && ` (of ${money(stats.total_money_donations || 0)} total)`}
                </p>
              </div>
            </div>
            {filteredDonations.length ? (
              <div className="org-donor-list">
                {filteredDonations.map((donation) => (
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
                <span className="client-empty__title">{debouncedSearch ? 'No matching donations' : 'No fund donations yet'}</span>
                <span className="client-empty__copy">{debouncedSearch ? 'Try adjusting your search query.' : 'Donation requests from users will appear here.'}</span>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ===== TAB 3: Analytics & BI ===== */}
      {activeTab === 'analytics' && (
        <div className="org-bi-dashboard">
          <div className="org-bi-dashboard__header">
            <div className="org-bi-dashboard__title">
              <BarChart2 size={24} />
              <span>Campaign Insights & Business Intelligence</span>
            </div>
            <p className="org-bi-dashboard__copy">
              Real-time campaign performance tracking, distribution metrics, and donor behavior analysis.
            </p>
          </div>

          {/* KPI Metrics Cards */}
          <div className="org-bi-grid">
            {campaign.type === 'donation' ? (
              <>
                <div className="org-bi-card">
                  <span className="org-bi-card__icon">
                    <Package size={24} />
                  </span>
                  <div className="org-bi-card__content">
                    <span className="org-bi-card__value">{biStatusData.total}</span>
                    <span className="org-bi-card__label">Submitted Items</span>
                  </div>
                </div>
                <div className="org-bi-card">
                  <span className="org-bi-card__icon org-bi-card__icon--success">
                    <Check size={24} />
                  </span>
                  <div className="org-bi-card__content">
                    <span className="org-bi-card__value">{biStatusData.donated}</span>
                    <span className="org-bi-card__label">Donated Items</span>
                  </div>
                </div>
                <div className="org-bi-card">
                  <span className="org-bi-card__icon org-bi-card__icon--warning">
                    <Clock size={24} />
                  </span>
                  <div className="org-bi-card__content">
                    <span className="org-bi-card__value">{biStatusData.handover}</span>
                    <span className="org-bi-card__label">Handover</span>
                  </div>
                </div>
                <div className="org-bi-card">
                  <span className="org-bi-card__icon org-bi-card__icon--danger">
                    <User size={24} />
                  </span>
                  <div className="org-bi-card__content">
                    <span className="org-bi-card__value">{biTopDonors.length}</span>
                    <span className="org-bi-card__label">Active Donors</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="org-bi-card">
                  <span className="org-bi-card__icon org-bi-card__icon--success">
                    <DollarSign size={24} />
                  </span>
                  <div className="org-bi-card__content">
                    <span className="org-bi-card__value">{money(stats.total_money_donations || 0)}</span>
                    <span className="org-bi-card__label">Total Raised</span>
                  </div>
                </div>
                <div className="org-bi-card">
                  <span className="org-bi-card__icon">
                    <User size={24} />
                  </span>
                  <div className="org-bi-card__content">
                    <span className="org-bi-card__value">{biTopContributors.length}</span>
                    <span className="org-bi-card__label">Generous Backers</span>
                  </div>
                </div>
                <div className="org-bi-card">
                  <span className="org-bi-card__icon org-bi-card__icon--warning">
                    <Activity size={24} />
                  </span>
                  <div className="org-bi-card__content">
                    <span className="org-bi-card__value">
                      {money(
                        detail.money_donations.filter((d) => d.status === 'completed').length
                          ? detail.money_donations.filter((d) => d.status === 'completed').reduce((sum, d) => sum + Number(d.amount), 0) /
                            detail.money_donations.filter((d) => d.status === 'completed').length
                          : 0
                      )}
                    </span>
                    <span className="org-bi-card__label">Avg Donation</span>
                  </div>
                </div>
                <div className="org-bi-card">
                  <span className="org-bi-card__icon org-bi-card__icon--danger">
                    <Check size={24} />
                  </span>
                  <div className="org-bi-card__content">
                    <span className="org-bi-card__value">
                      {detail.money_donations.filter((d) => d.status === 'completed').length}
                    </span>
                    <span className="org-bi-card__label">Successful Donations</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Interactive Visualizations Row */}
          <div className="org-bi-charts-grid">
            {campaign.type === 'donation' ? (
              <>
                {/* Donation categories breakdown */}
                <div className="org-bi-chart-card">
                  <div className="org-bi-chart-card__header">
                    <div className="org-bi-chart-card__title">
                      <PieChart size={18} />
                      <span>Item Category Distribution</span>
                    </div>
                  </div>
                  <div className="org-bi-progress-list">
                    {biCategoryData.length ? (
                      biCategoryData.map((cat, index) => (
                        <div key={index} className="org-bi-progress-row">
                          <div className="org-bi-progress-row__info">
                            <span className="org-bi-progress-row__name">{cat.name}</span>
                            <span>{cat.count} items ({cat.percentage}%)</span>
                          </div>
                          <div className="org-bi-progress-row__bar-bg">
                            <div className="org-bi-progress-row__bar-fill" style={{ width: `${cat.percentage}%` }} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="org-bi-leaderboard__empty">No categorized items submitted.</div>
                    )}
                  </div>
                </div>

                {/* Donation status ratios split bar */}
                <div className="org-bi-chart-card">
                  <div className="org-bi-chart-card__header">
                    <div className="org-bi-chart-card__title">
                      <Activity size={18} />
                      <span>Item Review Status Ratio</span>
                    </div>
                  </div>
                  {biStatusData.total > 0 ? (
                    <div>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)', marginBottom: 'var(--space-2)' }}>
                        Overview of workflow and review queue composition:
                      </p>
                      <div className="org-bi-ratio-bar">
                        {biStatusData.donated > 0 && (
                          <div
                            className="org-bi-ratio-part org-bi-ratio-part--approved"
                            style={{ width: `${Math.round((biStatusData.donated / biStatusData.total) * 100)}%` }}
                            title={`Donated: ${biStatusData.donated}`}
                          >
                            {Math.round((biStatusData.donated / biStatusData.total) * 100)}%
                          </div>
                        )}
                        {biStatusData.handover > 0 && (
                          <div
                            className="org-bi-ratio-part org-bi-ratio-part--handover"
                            style={{ width: `${Math.round((biStatusData.handover / biStatusData.total) * 100)}%` }}
                            title={`Handover: ${biStatusData.handover}`}
                          >
                            {Math.round((biStatusData.handover / biStatusData.total) * 100)}%
                          </div>
                        )}
                        {biStatusData.pending > 0 && (
                          <div
                            className="org-bi-ratio-part org-bi-ratio-part--pending"
                            style={{ width: `${Math.round((biStatusData.pending / biStatusData.total) * 100)}%` }}
                            title={`Pending: ${biStatusData.pending}`}
                          >
                            {Math.round((biStatusData.pending / biStatusData.total) * 100)}%
                          </div>
                        )}
                        {biStatusData.rejected > 0 && (
                          <div
                            className="org-bi-ratio-part org-bi-ratio-part--rejected"
                            style={{ width: `${Math.round((biStatusData.rejected / biStatusData.total) * 100)}%` }}
                            title={`Rejected: ${biStatusData.rejected}`}
                          >
                            {Math.round((biStatusData.rejected / biStatusData.total) * 100)}%
                          </div>
                        )}
                      </div>
                      <div className="org-bi-ratio-legend">
                        <div className="org-bi-ratio-legend__item">
                          <span className="org-bi-ratio-legend__dot" style={{ backgroundColor: '#16a34a' }} />
                          <span>Donated ({biStatusData.donated})</span>
                        </div>
                        <div className="org-bi-ratio-legend__item">
                          <span className="org-bi-ratio-legend__dot" style={{ backgroundColor: '#4f46e5' }} />
                          <span>Handover ({biStatusData.handover})</span>
                        </div>
                        <div className="org-bi-ratio-legend__item">
                          <span className="org-bi-ratio-legend__dot" style={{ backgroundColor: '#d97706' }} />
                          <span>Pending ({biStatusData.pending})</span>
                        </div>
                        <div className="org-bi-ratio-legend__item">
                          <span className="org-bi-ratio-legend__dot" style={{ backgroundColor: '#dc2626' }} />
                          <span>Rejected ({biStatusData.rejected})</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="org-bi-leaderboard__empty">No items submitted yet.</div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Fundraising timeline column chart */}
                <div className="org-bi-chart-card">
                  <div className="org-bi-chart-card__header">
                    <div className="org-bi-chart-card__title">
                      <TrendingUp size={18} />
                      <span>Recent Donations Timeline</span>
                    </div>
                  </div>
                  {biFundraisingChart.length ? (
                    <div className="org-bi-chart">
                      {biFundraisingChart.map((item) => (
                        <div key={item.id} className="org-bi-chart__column-wrap">
                          <span className="org-bi-chart__amount">{money(item.amount)}</span>
                          <div className="org-bi-chart__column" style={{ height: `${item.percentage}%` }} title={`${item.label}: ${money(item.amount)}`} />
                          <span className="org-bi-chart__label">{item.date}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="org-bi-leaderboard__empty">No successful donations yet.</div>
                  )}
                </div>

                {/* Fundraising net vs fee allocation */}
                <div className="org-bi-chart-card">
                  <div className="org-bi-chart-card__header">
                    <div className="org-bi-chart-card__title">
                      <PieChart size={18} />
                      <span>Payout & Settlement Overview</span>
                    </div>
                  </div>
                  {stats.total_money_donations > 0 ? (
                    <div className="org-bi-progress-list">
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)', marginBottom: 'var(--space-1)' }}>
                        Campaign settlement statistics (0% platform commission):
                      </p>
                      <div className="org-bi-progress-row">
                        <div className="org-bi-progress-row__info">
                          <span className="org-bi-progress-row__name" style={{ color: '#16a34a', fontWeight: 700 }}>Organizer Payout (100%)</span>
                          <strong>{money(stats.total_money_donations)}</strong>
                        </div>
                        <div className="org-bi-progress-row__bar-bg">
                          <div className="org-bi-progress-row__bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #16a34a 0%, #4ade80 100%)' }} />
                        </div>
                      </div>
                      <div className="org-bi-progress-row" style={{ marginTop: 'var(--space-2)' }}>
                        <div className="org-bi-progress-row__info">
                          <span className="org-bi-progress-row__name" style={{ color: 'var(--gray-500)', fontWeight: 650 }}>Platform Commission (0%)</span>
                          <strong>{money(0)}</strong>
                        </div>
                        <div className="org-bi-progress-row__bar-bg">
                          <div className="org-bi-progress-row__bar-fill" style={{ width: '0%', background: 'var(--border)' }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="org-bi-leaderboard__empty">No successful donations yet.</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Leaders & Generous Donors Leaderboard */}
          <div className="org-bi-chart-card" style={{ width: '100%' }}>
            <div className="org-bi-chart-card__header">
              <div className="org-bi-chart-card__title">
                <Award size={20} />
                <span>Generous Leaderboard (Top Contributors)</span>
              </div>
            </div>

            {campaign.type === 'donation' ? (
              <div className="org-bi-leaderboard">
                {biTopDonors.length ? (
                  biTopDonors.map((donor, index) => (
                    <div key={index} className={`org-bi-leaderboard-row ${index === 0 ? 'org-bi-leaderboard-row--top1' : ''}`}>
                      <div className="org-bi-leaderboard-row__left">
                        <span className="org-bi-leaderboard-row__rank">{index + 1}</span>
                        <div>
                          <span className="org-bi-leaderboard-row__name">{donor.name}</span>
                          <span className="org-bi-leaderboard-row__email">{donor.email}</span>
                        </div>
                      </div>
                      <span className="org-bi-leaderboard-row__value">
                        {donor.count} item{donor.count !== 1 ? 's' : ''} donated
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="org-bi-leaderboard__empty">No completed handovers recorded yet.</div>
                )}
              </div>
            ) : (
              <div className="org-bi-leaderboard">
                {biTopContributors.length ? (
                  biTopContributors.map((contrib, index) => (
                    <div key={index} className={`org-bi-leaderboard-row ${index === 0 ? 'org-bi-leaderboard-row--top1' : ''}`}>
                      <div className="org-bi-leaderboard-row__left">
                        <span className="org-bi-leaderboard-row__rank">{index + 1}</span>
                        <div>
                          <span className="org-bi-leaderboard-row__name">{contrib.name}</span>
                          <span className="org-bi-leaderboard-row__email">{contrib.email}</span>
                        </div>
                      </div>
                      <span className="org-bi-leaderboard-row__value">
                        {money(contrib.totalAmount)} ({contrib.count} donation{contrib.count !== 1 ? 's' : ''})
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="org-bi-leaderboard__empty">No successful donations recorded yet.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

        </div>{/* end .org-campaign-content */}
      </div>{/* end .org-campaign-layout */}

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

      {/* ---- Item Preview Modal (MyItems-style) ---- */}
      <Modal isOpen={!!previewItem} onClose={() => setPreviewItem(null)} title={previewItem?.item_title || 'Item Details'} size="lg">
        {previewItem && (() => {
          const es = effectiveItemStatus(previewItem);
          const previewImages = (previewItem.item_images || []).length
            ? previewItem.item_images.map((p) => ({ image_path: p }))
            : previewItem.main_image ? [{ image_path: previewItem.main_image }] : [];
          return (
            <div className="client-my-item-view">
              <ClientImageGallery
                images={previewImages}
                title={previewItem.item_title}
                fallbackIcon={<Package size={72} />}
                variant="strip"
              />
              <div className="client-my-item-view__body">
                <div className="client-card__meta">
                  <span className={`badge badge--${es.variant}`}>{es.label}</span>
                  <span style={{ textTransform: 'capitalize' }}>{previewItem.item_type}</span>
                </div>
                <h2>{previewItem.item_title}</h2>
                <p>{previewItem.item_description || 'No description provided.'}</p>

                <div className="client-item-facts">
                  <div>
                    <strong>{previewItem.donor_name || 'Unknown'}</strong>
                    <span>Donor</span>
                  </div>
                  <div>
                    <strong>{new Date(previewItem.created_at).toLocaleDateString()}</strong>
                    <span>Submitted</span>
                  </div>
                </div>

                {(previewItem.donor_email || previewItem.donor_phone) && (
                  <div className="client-contact-card">
                    <div className="client-contact-card__header">
                      <User size={16} />
                      <strong>Donor Contact</strong>
                    </div>
                    {previewItem.donor_name && (
                      <span className="client-contact-card__item"><User size={14} /> {previewItem.donor_name}</span>
                    )}
                    {previewItem.donor_email && (
                      <span className="client-contact-card__item"><Mail size={14} /> {previewItem.donor_email}</span>
                    )}
                    {previewItem.donor_phone && (
                      <span className="client-contact-card__item"><Phone size={14} /> {previewItem.donor_phone}</span>
                    )}
                  </div>
                )}

                {previewItem.accepted_at && (
                  <div className="client-linked-info">
                    <div>
                      <span>{previewItem.received_at ? 'Received by' : 'Accepted by'}</span>
                      <strong>{previewItem.received_by_name || previewItem.accepted_by_name || 'Organization admin'}</strong>
                    </div>
                    <span className="text-muted">{fmtDate(previewItem.received_at || previewItem.accepted_at)}</span>
                  </div>
                )}

                {previewItem.rejected_at && (
                  <div className="client-linked-info">
                    <div>
                      <span>Rejected by</span>
                      <strong>{previewItem.rejected_by_name || 'Organization admin'}</strong>
                    </div>
                    <span className="text-muted">{fmtDate(previewItem.rejected_at)}</span>
                  </div>
                )}

                {(canAcceptItem || canCompleteHandover || canRejectItem) && (
                  <div className="org-item-preview__actions">
                    {canAcceptItem && (
                      <Button variant="primary" onClick={() => updateCampaignItem(previewItem.id, 'handover')}>
                        <Check size={16} /> Accept Donation
                      </Button>
                    )}
                    {canCompleteHandover && (
                      <Button variant="primary" onClick={() => updateCampaignItem(previewItem.id, 'received')}>
                        <Check size={16} /> Mark as Received
                      </Button>
                    )}
                    {canRejectItem && (
                      <Button variant="danger" onClick={() => updateCampaignItem(previewItem.id, 'rejected')}>
                        <X size={16} /> Reject
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
