import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Megaphone, Plus, Search } from 'lucide-react';
import api from '../../api/client';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import ItemImagePicker from '../client/ItemImagePicker.jsx';
import '../client/Client.css';
import './Org.css';

const defaultForm = {
  title: '',
  description: '',
  type: 'fundraising',
  start_date: '',
  end_date: '',
};

function toApiDate(value) {
  return value ? new Date(value).toISOString() : null;
}

function fmtDate(value) {
  return value ? new Date(value).toLocaleDateString() : 'No date';
}

export default function OrgCampaigns() {
  const { orgId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', campaign_type: '', status_filter: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);

  const [orgName, setOrgName] = useState('');

  const fetchCampaigns = useCallback(() => {
    api.get(`/org/${orgId}/campaigns`, { params: { page, page_size: 12, ...filters } })
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [orgId, page, filters]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);
  useEffect(() => {
    api.get(`/org/${orgId}`)
      .then((res) => setOrgName(res.data.name))
      .catch(() => {});
  }, [orgId]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const openCreate = () => {
    setForm(defaultForm);
    setImageFiles([]);
    setModalOpen(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await api.post(`/org/${orgId}/campaigns`, {
        ...form,
        status: 'pending',
        start_date: toApiDate(form.start_date),
        end_date: toApiDate(form.end_date),
      });

      if (imageFiles.length) {
        try {
          const data = new FormData();
          imageFiles.forEach((file) => data.append('files', file));
          await api.post(`/org/${orgId}/campaigns/${res.data.id}/images`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (imageErr) {
          toast(imageErr.response?.data?.detail || 'Campaign created, but images could not upload', 'error');
        }
      }

      toast('Campaign submitted for campus review.', 'success');
      setModalOpen(false);
      navigate(`/org/${orgId}/campaigns/${res.data.id}`);
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not create campaign', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="org-page">
      <div className="org-page__header">
        <div>
          <p className="org-eyebrow">{orgName ? `${orgName} campaigns` : 'Organization campaigns'}</p>
          <h1>Our Campaigns</h1>
          <p className="org-copy">Create campaigns, follow campus approval, and manage contribution review.</p>
        </div>
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={18} />
          Create Campaign
        </Button>
      </div>

      <div className="org-toolbar">
        <Input id="org-campaign-search" placeholder="Search campaigns..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
        <Input id="org-campaign-type" type="select" value={filters.campaign_type} onChange={(e) => updateFilter('campaign_type', e.target.value)}>
          <option value="">All types</option>
          <option value="fundraising">Fundraising</option>
          <option value="donation">Donation</option>
        </Input>
        <Input id="org-campaign-status" type="select" value={filters.status_filter} onChange={(e) => updateFilter('status_filter', e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </Input>
        {data.items.length > 0 && (
          <div className="org-toolbar__info">
            <span>{data.total || data.items.length} campaign{(data.total || data.items.length) !== 1 ? 's' : ''} found</span>
            <span>Page {data.page} of {data.pages}</span>
          </div>
        )}
      </div>

      {data.items.length ? (
        <div className="org-campaign-grid">
          {data.items.map((campaign) => (
            <Link key={campaign.id} to={`/org/${orgId}/campaigns/${campaign.id}`} className="org-campaign-card">
              <div className="org-campaign-card__media">
                {campaign.main_image ? <img src={campaign.main_image} alt={campaign.title} /> : <Megaphone size={44} />}
              </div>
              <div className="org-campaign-card__body">
                <div className="org-card-meta">
                  <span className={`badge badge--${campaign.status}`}>{campaign.status}</span>
                  <span>{campaign.type}</span>
                </div>
                <h2>{campaign.title}</h2>
                <p>{campaign.description || 'No description provided.'}</p>
                <div className="org-campaign-card__footer">
                  <span><CalendarDays size={15} /> {fmtDate(campaign.start_date)}</span>
                  <span>View detail →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="client-empty">
          <span className="client-empty__icon"><Search size={28} /></span>
          <span className="client-empty__title">No campaigns found</span>
          <span className="client-empty__copy">No campaigns match these filters. Create a new campaign to get started.</span>
        </div>
      )}
      <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Campaign" size="md">
        <form className="org-modal-form" onSubmit={handleCreate}>
          <Input id="org-new-campaign-title" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="org-form-grid">
            <Input id="org-new-campaign-type" label="Type" type="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="fundraising">Fundraising</option>
              <option value="donation">Donation</option>
            </Input>
            <Input id="org-new-campaign-status" label="Status" value="Pending campus review" disabled />
          </div>
          <div className="org-form-grid">
            <Input id="org-new-campaign-start" label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input id="org-new-campaign-end" label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <Input id="org-new-campaign-desc" label="Description" type="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <ItemImagePicker files={imageFiles} onChange={setImageFiles} maxFiles={4} />
          </div>

          <div className="modal__actions">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
