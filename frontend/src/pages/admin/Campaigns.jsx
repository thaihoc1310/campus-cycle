import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Image } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/admin/PageHeader.jsx';
import SearchBar from '../../components/ui/SearchBar.jsx';
import Table from '../../components/ui/Table.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import ImageGalleryModal from '../../components/admin/ImageGalleryModal.jsx';
import useSort from '../../hooks/useSort.js';
import './Management.css';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'organization', label: 'Organization', sortKey: 'organization' },
  { key: 'start_date', label: 'Start' },
  { key: 'end_date', label: 'End' },
  { key: 'actions', label: 'Actions', width: '130px' },
];

export default function CampaignsPage() {
  const toast = useToast();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { sortBy, sortOrder, handleSort } = useSort();
  const [orgs, setOrgs] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'fundraising', status: 'pending', start_date: '', end_date: '', organization_id: '' });
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [galleryItem, setGalleryItem] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/campaigns', { params: { page, page_size: 10, search, sort_by: sortBy, sort_order: sortOrder } });
      setData(res.data);
    } catch { /* ignore */ }
  }, [page, search, sortBy, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    api.get('/organizations/all').then(r => setOrgs(r.data)).catch(() => {});
  }, []);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
  const toInputDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', description: '', type: 'fundraising', status: 'pending', start_date: '', end_date: '', organization_id: '' });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      title: item.title, description: item.description || '', type: item.type, status: item.status,
      start_date: toInputDate(item.start_date), end_date: toInputDate(item.end_date),
      organization_id: item.organization_id || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        organization_id: form.organization_id || null,
      };
      if (editItem) {
        await api.put(`/campaigns/${editItem.id}`, payload);
        toast('Campaign updated successfully!', 'success');
      } else {
        await api.post('/campaigns', payload);
        toast('Campaign created successfully!', 'success');
        setModalOpen(false);
      }
      fetchData();
    } catch (err) {
      toast(err.response?.data?.detail || 'Save failed', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/campaigns/${deleteItem.id}`);
      toast('Campaign deleted successfully!', 'success');
      setDeleteItem(null);
      fetchData();
    } catch (err) {
      toast(err.response?.data?.detail || 'Delete failed', 'error');
    }
    setDeleting(false);
  };

  return (
    <div>
      <PageHeader title="Campaigns" onCreateClick={openCreate} createLabel="Create Campaign" />
      <div className="management-toolbar">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search campaigns..." />
      </div>

      <Table columns={columns} data={data.items} sortBy={sortBy} sortOrder={sortOrder} onSort={(key) => { handleSort(key); setPage(1); }} renderRow={(item) => (
        <tr key={item.id}>
          <td><strong>{item.title}</strong></td>
          <td><span className="badge badge--active">{item.type}</span></td>
          <td><span className={`badge badge--${item.status}`}>{item.status}</span></td>
          <td>{item.organization_name || '—'}</td>
          <td>{fmtDate(item.start_date)}</td>
          <td>{fmtDate(item.end_date)}</td>
          <td>
            <div className="table__actions">
              <button className="btn btn--icon" title="Gallery" onClick={() => setGalleryItem(item)} style={{ color: 'var(--accent)' }}><Image size={16} /></button>
              <button className="btn btn--icon" title="Edit" onClick={() => openEdit(item)}><Pencil size={16} /></button>
              <button className="btn btn--icon" title="Delete" onClick={() => setDeleteItem(item)}><Trash2 size={16} /></button>
            </div>
          </td>
        </tr>
      )} />

      <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Campaign' : 'Create Campaign'} size="md">
        <form onSubmit={handleSave} className="modal-form">
          <Input id="camp-title" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Input id="camp-type" label="Type" type="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="fundraising">Fundraising</option>
              <option value="donation">Donation</option>
            </Input>
            <Input id="camp-status" label="Status" type="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </Input>
          </div>
          <Input id="camp-org" label="Organization" type="select" value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })}>
            <option value="">— None —</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Input>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Input id="camp-start" label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input id="camp-end" label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <Input id="camp-desc" label="Description" type="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="modal__actions">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : editItem ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        title="Delete Campaign" message={`Are you sure you want to delete "${deleteItem?.title}"?`} loading={deleting} />

      <ImageGalleryModal isOpen={!!galleryItem} onClose={() => setGalleryItem(null)}
        entityType="campaign" entityId={galleryItem?.id} entityTitle={galleryItem?.title} />
    </div>
  );
}
