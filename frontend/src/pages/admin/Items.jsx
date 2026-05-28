import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Image, Plus } from 'lucide-react';
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

const itemColumns = [
  { key: 'title', label: 'Title' },
  { key: 'price', label: 'Price' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'category', label: 'Category' },
  { key: 'owner', label: 'Owner' },
  { key: 'actions', label: 'Actions', width: '130px' },
];

const catColumns = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'is_active', label: 'Active' },
  { key: 'actions', label: 'Actions', width: '100px' },
];

export default function ItemsPage() {
  const toast = useToast();

  // --- Items State ---
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemSort = useSort();
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', price: '0', type: 'sell', status: 'pending', category_id: '', user_id: '' });
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [galleryItem, setGalleryItem] = useState(null);

  // --- Category State ---
  const [catData, setCatData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [catSearch, setCatSearch] = useState('');
  const [catPage, setCatPage] = useState(1);
  const catSort = useSort();
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', is_active: true });
  const [catSaving, setCatSaving] = useState(false);
  const [deleteCat, setDeleteCat] = useState(null);
  const [catDeleting, setCatDeleting] = useState(false);

  // --- Fetch Items ---
  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get('/items', { params: { page, page_size: 10, search, sort_by: itemSort.sortBy, sort_order: itemSort.sortOrder } });
      setData(res.data);
    } catch { /* ignore */ }
  }, [page, search, itemSort.sortBy, itemSort.sortOrder]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // --- Fetch Categories ---
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories', { params: { page: catPage, page_size: 10, search: catSearch, sort_by: catSort.sortBy, sort_order: catSort.sortOrder } });
      setCatData(res.data);
    } catch { /* ignore */ }
  }, [catPage, catSearch, catSort.sortBy, catSort.sortOrder]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Dropdown data
  useEffect(() => {
    api.get('/categories/all').then(r => setCategories(r.data)).catch(() => {});
    api.get('/users', { params: { page: 1, page_size: 100 } }).then(r => setUsers(r.data.items || [])).catch(() => {});
  }, []);

  // --- Item CRUD ---
  const openCreateItem = () => {
    setEditItem(null);
    setForm({ title: '', description: '', price: '0', type: 'sell', status: 'pending', category_id: '', user_id: '' });
    setModalOpen(true);
  };

  const openEditItem = (item) => {
    setEditItem(item);
    setForm({
      title: item.title, description: item.description || '', price: String(item.price),
      type: item.type, status: item.status, category_id: item.category_id || '', user_id: item.user_id,
    });
    setModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: form.type === 'donate' ? 0 : parseFloat(form.price) || 0,
        category_id: form.category_id || null,
      };
      if (editItem) {
        const { user_id, ...updatePayload } = payload;
        await api.put(`/items/${editItem.id}`, updatePayload);
        toast('Item updated successfully!', 'success');
      } else {
        await api.post('/items', payload);
        toast('Item created successfully!', 'success');
        setModalOpen(false);
      }
      fetchItems();
    } catch (err) {
      toast(err.response?.data?.detail || 'Save failed', 'error');
    }
    setSaving(false);
  };

  const handleDeleteItem = async () => {
    setDeleting(true);
    try {
      await api.delete(`/items/${deleteItem.id}`);
      toast('Item deleted successfully!', 'success');
      setDeleteItem(null);
      fetchItems();
    } catch (err) {
      toast(err.response?.data?.detail || 'Delete failed', 'error');
    }
    setDeleting(false);
  };

  // --- Category CRUD ---
  const openCreateCat = () => {
    setEditCat(null);
    setCatForm({ name: '', description: '', is_active: true });
    setCatModalOpen(true);
  };

  const openEditCat = (cat) => {
    setEditCat(cat);
    setCatForm({ name: cat.name, description: cat.description || '', is_active: cat.is_active });
    setCatModalOpen(true);
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();
    setCatSaving(true);
    try {
      if (editCat) {
        await api.put(`/categories/${editCat.id}`, catForm);
        toast('Category updated successfully!', 'success');
      } else {
        await api.post('/categories', catForm);
        toast('Category created successfully!', 'success');
        setCatModalOpen(false);
      }
      fetchCategories();
      api.get('/categories/all').then(r => setCategories(r.data)).catch(() => {});
    } catch (err) {
      toast(err.response?.data?.detail || 'Save failed', 'error');
    }
    setCatSaving(false);
  };

  const handleDeleteCat = async () => {
    setCatDeleting(true);
    try {
      await api.delete(`/categories/${deleteCat.id}`);
      toast('Category deleted successfully!', 'success');
      setDeleteCat(null);
      fetchCategories();
      api.get('/categories/all').then(r => setCategories(r.data)).catch(() => {});
    } catch (err) {
      toast(err.response?.data?.detail || 'Delete failed', 'error');
    }
    setCatDeleting(false);
  };

  return (
    <div>
      {/* Items Section */}
      <PageHeader title="Items" onCreateClick={openCreateItem} createLabel="Create Item" />
      <div className="management-toolbar">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search items..." />
      </div>

      <Table columns={itemColumns} data={data.items} sortBy={itemSort.sortBy} sortOrder={itemSort.sortOrder} onSort={(key) => { itemSort.handleSort(key); setPage(1); }} renderRow={(item) => (
        <tr key={item.id}>
          <td><strong>{item.title}</strong></td>
          <td>{item.type === 'donate' ? '—' : `$${Number(item.price).toLocaleString()}`}</td>
          <td><span className="badge badge--active">{item.type}</span></td>
          <td><span className={`badge badge--${item.status}`}>{item.status}</span></td>
          <td>{item.category_name || '—'}</td>
          <td>{item.owner_name || '—'}</td>
          <td>
            <div className="table__actions">
              <button className="btn btn--icon" title="Gallery" onClick={() => setGalleryItem(item)} style={{ color: 'var(--accent)' }}><Image size={16} /></button>
              <button className="btn btn--icon" title="Edit" onClick={() => openEditItem(item)}><Pencil size={16} /></button>
              <button className="btn btn--icon" title="Delete" onClick={() => setDeleteItem(item)}><Trash2 size={16} /></button>
            </div>
          </td>
        </tr>
      )} />
      <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />

      {/* Category Section at Bottom */}
      <div className="management-section">
        <div className="management-section__header">
          <h2 className="management-section__title">Categories</h2>
          <Button variant="primary" size="sm" onClick={openCreateCat}><Plus size={16} /> Create Category</Button>
        </div>
        <div className="management-toolbar">
          <SearchBar value={catSearch} onChange={(v) => { setCatSearch(v); setCatPage(1); }} placeholder="Search categories..." />
        </div>
        <Table columns={catColumns} data={catData.items} sortBy={catSort.sortBy} sortOrder={catSort.sortOrder} onSort={(key) => { catSort.handleSort(key); setCatPage(1); }} renderRow={(cat) => (
          <tr key={cat.id}>
            <td><strong>{cat.name}</strong></td>
            <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.description || '—'}</td>
            <td><span className={`badge ${cat.is_active ? 'badge--active' : 'badge--inactive'}`}>{cat.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
              <div className="table__actions">
                <button className="btn btn--icon" title="Edit" onClick={() => openEditCat(cat)}><Pencil size={16} /></button>
                <button className="btn btn--icon" title="Delete" onClick={() => setDeleteCat(cat)}><Trash2 size={16} /></button>
              </div>
            </td>
          </tr>
        )} />
        <Pagination page={catData.page} pages={catData.pages} onPageChange={setCatPage} />
      </div>

      {/* Item Modals */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Item' : 'Create Item'} size="md">
        <form onSubmit={handleSaveItem} className="modal-form">
          <Input id="item-title" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {form.type === 'sell' && (
              <Input id="item-price" label="Price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            )}
            <Input id="item-type" label="Type" type="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, price: e.target.value === 'donate' ? '0' : form.price })}>
              <option value="sell">Sell</option>
              <option value="donate">Donate</option>
            </Input>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Input id="item-status" label="Status" type="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="sold">Sold</option>
              <option value="donated">Donated</option>
            </Input>
            <Input id="item-cat" label="Category" type="select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">— None —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Input>
          </div>
          {!editItem && (
            <Input id="item-user" label="Owner (User)" type="select" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required>
              <option value="">— Select User —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </Input>
          )}
          <Input id="item-desc" label="Description" type="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="modal__actions">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : editItem ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDeleteItem}
        title="Delete Item" message={`Are you sure you want to delete "${deleteItem?.title}"?`} loading={deleting} />

      <ImageGalleryModal isOpen={!!galleryItem} onClose={() => setGalleryItem(null)}
        entityType="item" entityId={galleryItem?.id} entityTitle={galleryItem?.title} />

      {/* Category Modals */}
      <Modal isOpen={catModalOpen} onClose={() => setCatModalOpen(false)} title={editCat ? 'Edit Category' : 'Create Category'} size="sm">
        <form onSubmit={handleSaveCat} className="modal-form">
          <Input id="cat-name" label="Name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required />
          <Input id="cat-desc" label="Description" type="textarea" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <input id="cat-active" type="checkbox" checked={catForm.is_active} onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })} />
            <label htmlFor="cat-active" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>Active</label>
          </div>
          <div className="modal__actions">
            <Button variant="secondary" onClick={() => setCatModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={catSaving}>{catSaving ? 'Saving...' : editCat ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteCat} onClose={() => setDeleteCat(null)} onConfirm={handleDeleteCat}
        title="Delete Category" message={`Are you sure you want to delete "${deleteCat?.name}"?`} loading={catDeleting} />
    </div>
  );
}
