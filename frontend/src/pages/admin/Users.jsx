import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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
import './Management.css';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'user_type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', width: '100px' },
];

export default function UsersPage() {
  const toast = useToast();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'member', user_type: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', { params: { page, page_size: 10, search } });
      setData(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', email: '', role: 'member', user_type: '', status: 'active' });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, email: item.email, role: item.role, user_type: item.user_type || '', status: item.status });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/users/${editItem.id}`, form);
        toast('User updated successfully!', 'success');
      }
      fetchData();
      if (!editItem) setModalOpen(false);
    } catch (err) {
      toast(err.response?.data?.detail || 'Save failed', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteItem.id}`);
      toast('User deleted successfully!', 'success');
      setDeleteItem(null);
      fetchData();
    } catch (err) {
      toast(err.response?.data?.detail || 'Delete failed', 'error');
    }
    setDeleting(false);
  };

  return (
    <div>
      <PageHeader title="Users" />

      <div className="management-toolbar">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search users..." />
      </div>

      <Table columns={columns} data={data.items} renderRow={(item) => (
        <tr key={item.id}>
          <td><strong>{item.name}</strong></td>
          <td>{item.email}</td>
          <td><span className={`badge badge--${item.role}`}>{item.role}</span></td>
          <td>{item.user_type || '—'}</td>
          <td><span className={`badge badge--${item.status}`}>{item.status}</span></td>
          <td>
            <div className="table__actions">
              <button className="btn btn--icon" title="Edit" onClick={() => openEdit(item)}><Pencil size={16} /></button>
              <button className="btn btn--icon" title="Delete" onClick={() => setDeleteItem(item)}><Trash2 size={16} /></button>
            </div>
          </td>
        </tr>
      )} />

      <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />

      {/* Edit Modal (no create for users — they register) */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit User' : 'User'} size="md">
        <form onSubmit={handleSave} className="modal-form">
          <Input id="user-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="user-email" label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editItem} />
          <Input id="user-role" label="Role" type="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </Input>
          <Input id="user-type" label="User Type" value={form.user_type} onChange={(e) => setForm({ ...form, user_type: e.target.value })} placeholder="student, teacher, staff" />
          <Input id="user-status" label="Status" type="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="banned">Banned</option>
          </Input>
          <div className="modal__actions">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
