import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Shield } from 'lucide-react';
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
import OrgAdminModal from '../../components/admin/OrgAdminModal.jsx';
import useSort from '../../hooks/useSort.js';
import './Management.css';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'description', label: 'Description' },
  { key: 'actions', label: 'Actions', width: '130px' },
];

export default function OrganizationsPage() {
  const toast = useToast();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { sortBy, sortOrder, handleSort } = useSort();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', type: '' });
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [adminOrg, setAdminOrg] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/organizations', { params: { page, page_size: 10, search, sort_by: sortBy, sort_order: sortOrder } });
      setData(res.data);
    } catch { /* ignore */ }
  }, [page, search, sortBy, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', description: '', type: '' });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description || '', type: item.type || '' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/organizations/${editItem.id}`, form);
        toast('Organization updated successfully!', 'success');
      } else {
        await api.post('/organizations', form);
        toast('Organization created successfully!', 'success');
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
      await api.delete(`/organizations/${deleteItem.id}`);
      toast('Organization deleted successfully!', 'success');
      setDeleteItem(null);
      fetchData();
    } catch (err) {
      toast(err.response?.data?.detail || 'Delete failed', 'error');
    }
    setDeleting(false);
  };

  return (
    <div>
      <PageHeader title="Organizations" onCreateClick={openCreate} createLabel="Create Organization" />
      <div className="management-toolbar">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search organizations..." />
      </div>

      <Table columns={columns} data={data.items} sortBy={sortBy} sortOrder={sortOrder} onSort={(key) => { handleSort(key); setPage(1); }} renderRow={(item) => (
        <tr key={item.id}>
          <td><strong>{item.name}</strong></td>
          <td>{item.type || '—'}</td>
          <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || '—'}</td>
          <td>
            <div className="table__actions">
              <button className="btn btn--icon" title="Admins" onClick={() => setAdminOrg(item)} style={{ color: 'var(--secondary)' }}><Shield size={16} /></button>
              <button className="btn btn--icon" title="Edit" onClick={() => openEdit(item)}><Pencil size={16} /></button>
              <button className="btn btn--icon" title="Delete" onClick={() => setDeleteItem(item)}><Trash2 size={16} /></button>
            </div>
          </td>
        </tr>
      )} />

      <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Organization' : 'Create Organization'} size="md">
        <form onSubmit={handleSave} className="modal-form">
          <Input id="org-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="org-type" label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="club, class, department" />
          <Input id="org-desc" label="Description" type="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="modal__actions">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : editItem ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        title="Delete Organization" message={`Are you sure you want to delete "${deleteItem?.name}"?`} loading={deleting} />

      <OrgAdminModal isOpen={!!adminOrg} onClose={() => setAdminOrg(null)} organization={adminOrg} />
    </div>
  );
}
