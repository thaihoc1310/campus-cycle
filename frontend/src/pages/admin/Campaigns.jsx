import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Image, UploadCloud, X } from 'lucide-react';
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
  
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [galleryItem, setGalleryItem] = useState(null);

  // Quản lý việc tạo và thu hồi (cleanup) các URL tạm thời của ảnh để tránh rò rỉ bộ nhớ máy tính
  useEffect(() => {
    if (images.length === 0) {
      setImagePreviews([]);
      return;
    }
    const urls = images.map(file => URL.createObjectURL(file));
    setImagePreviews(urls);

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);

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
    setImages([]); 
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      title: item.title, description: item.description || '', type: item.type, status: item.status,
      start_date: toInputDate(item.start_date), end_date: toInputDate(item.end_date),
      organization_id: item.organization_id || '',
    });
    setImages([]); 
    setModalOpen(true);
  };

  // Xử lý khi người dùng chọn file ảnh từ thiết bị
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []).filter(file => file.type.startsWith('image/'));
    // Giới hạn cho phép chọn tối đa 4 ảnh minh họa
    setImages((prev) => [...prev, ...selectedFiles].slice(0, 4));
  };

  // Xóa ảnh đã chọn khỏi danh sách hàng đợi trước khi nhấn lưu
  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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
      
      let campaignId = editItem?.id;

      // 1. Lưu thông tin văn bản của chiến dịch
      if (editItem) {
        await api.put(`/campaigns/${campaignId}`, payload);
        toast('Campaign updated successfully!', 'success');
      } else {
        const res = await api.post('/campaigns', payload);
        campaignId = res.data.id; 
        toast('Campaign created successfully!', 'success');
      }

      // 2. Tiến hành đóng gói và upload ảnh từ thiết bị lên server nếu có ảnh được chọn
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((file) => {
          formData.append('files', file); 
        });

        await api.post(`/campaigns/${campaignId}/images`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        toast('Images uploaded successfully!', 'success');
      }

      setModalOpen(false);
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
          
          {/* Vùng tích hợp tính năng tải ảnh trực tiếp từ thiết bị */}
          <div style={{ marginTop: 'var(--space-4)', display: 'grid', gap: 'var(--space-2)' }}>
            <span className="input-label" style={{ fontWeight: '700' }}>Campaign Images</span>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p className="text-muted" style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                {images.length}/4 ảnh đã chọn từ thiết bị
              </p>
              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                onClick={() => document.getElementById('camp-local-file').click()}
                disabled={images.length >= 4}
              >
                Chọn ảnh từ máy
              </Button>
              <input
                id="camp-local-file"
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleFileChange}
              />
            </div>

            {images.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                {imagePreviews.map((url, index) => (
                  <div key={index} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={url} alt="Local Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      onClick={() => handleRemoveImage(index)} 
                      style={{
                        position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px',
                        borderRadius: 'var(--radius-md)', border: 0, background: 'rgba(17, 24, 39, 0.8)',
                        color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                onClick={() => document.getElementById('camp-local-file').click()}
                style={{
                  minHeight: '120px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 'var(--space-2)', color: 'var(--gray-500)', cursor: 'pointer', background: 'var(--muted)'
                }}
              >
                <UploadCloud size={28} />
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>Nhấn vào đây để tải tệp ảnh từ máy tính lên</span>
              </div>
            )}
          </div>

          <div className="modal__actions" style={{ marginTop: 'var(--space-6)' }}>
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