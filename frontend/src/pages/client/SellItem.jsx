import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Package } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import ItemImagePicker from './ItemImagePicker.jsx';
import { itemFeePreview, money } from './clientUtils.js';
import './Client.css';

export default function SellItem() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', price: '0', category_id: '' });
  const [imageFiles, setImageFiles] = useState([]);

  useEffect(() => {
    api.get('/client/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const preview = itemFeePreview({ type: 'sell', price: form.price });

  if (user?.status !== 'active') {
    return (
      <div className="client-page">
        <div className="client-empty">
          <span className="client-empty__icon"><FileText size={28} /></span>
          <span className="client-empty__title">Account awaiting activation</span>
          <span className="client-empty__copy">
            Your account is awaiting admin activation. You can browse items and campaigns, but cannot sell items yet.
          </span>
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
        price: Number(form.price || 0),
        type: 'sell',
        category_id: form.category_id || null,
      });
      if (imageFiles.length) {
        try {
          const data = new FormData();
          imageFiles.forEach((file) => data.append('files', file));
          await api.post(`/client/items/${res.data.id}/images`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (imageErr) {
          toast(imageErr.response?.data?.detail || 'Item created, but images could not upload', 'error');
        }
      }
      toast('Sell item submitted for campus review.', 'success');
      navigate('/my-items');
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not submit item', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="client-page">
      <form className="client-form-panel" onSubmit={handleSubmit}>
        <div>
          <div className="client-card__meta">
            <span className="badge badge--active">sell</span>
            <span>Marketplace listing</span>
          </div>
          <h1 className="client-section__title">Sell Item</h1>
          <p className="client-section__copy">Create a sell listing. It appears publicly after campus admin approval.</p>
        </div>

        <Input id="sell-title" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <div className="client-form-grid">
          <Input id="sell-category" label="Category" type="select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">No category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Input>
          <Input
            id="sell-price"
            label="Seller Price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>
        <Input id="sell-description" label="Description" type="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <ItemImagePicker files={imageFiles} onChange={setImageFiles} />

        <div className="client-row-card">
          <div>
            <strong>Buyer and seller split platform fee</strong>
            <p className="text-muted">Buyer total estimate: {money(preview.buyerTotal)}</p>
          </div>
          <span className="client-empty__icon"><Package size={22} /></span>
        </div>

        <div className="client-form-actions">
          <Link className="btn btn--secondary btn--lg" to="/my-items">Cancel</Link>
          <Button type="submit" variant="primary" size="lg" disabled={saving}>{saving ? 'Submitting...' : 'Submit for Review'}</Button>
        </div>
      </form>
    </div>
  );
}
