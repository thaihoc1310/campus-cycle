import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { itemFeePreview, money } from './clientUtils.js';
import './Client.css';

export default function PostItem() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', price: '0', type: 'sell', category_id: '' });

  useEffect(() => { api.get('/client/categories').then((res) => setCategories(res.data)).catch(() => {}); }, []);

  const preview = itemFeePreview({ type: form.type, price: form.price });

  if (user?.status !== 'active') {
    return (
      <div className="client-page">
        <div className="client-empty">
          <span className="client-empty__icon"><FileText size={28} /></span>
          <span className="client-empty__title">Account awaiting activation</span>
          <span className="client-empty__copy">
            Your account is awaiting admin activation. You can browse items and campaigns, but cannot post items yet.
          </span>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/client/items', {
        title: form.title,
        description: form.description,
        price: Number(form.price || 0),
        type: form.type,
        category_id: form.category_id || null,
      });
      toast('Item submitted for campus review.', 'success');
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
        <div className="client-step-indicator">
          <span className="client-step-indicator__dot">1</span>
          <span className="client-step-indicator__text">Fill in details</span>
          <span>→</span>
          <span className="client-step-indicator__dot" style={{ background: 'var(--gray-300)' }}>2</span>
          <span>Submit for review</span>
          <span>→</span>
          <span className="client-step-indicator__dot" style={{ background: 'var(--gray-300)' }}>3</span>
          <span>Goes live after approval</span>
        </div>

        <div>
          <h1 className="client-section__title">Post Item</h1>
          <p className="client-section__copy">Every listing starts as pending and appears publicly only after campus admin approval.</p>
        </div>

        <Input id="post-title" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <div className="client-form-grid">
          <Input id="post-type" label="Listing Type" type="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="sell">Sell</option>
            <option value="donate">Donate</option>
          </Input>
          <Input id="post-category" label="Category" type="select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">No category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Input>
        </div>
        <Input
          id="post-price"
          label={form.type === 'donate' ? 'Estimated Value' : 'Seller Price'}
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <Input id="post-description" label="Description" type="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <div className="client-row-card">
          <div>
            <strong>{form.type === 'donate' ? 'Buyer pays platform fee only' : 'Buyer and seller split platform fee'}</strong>
            <p className="text-muted">Buyer total estimate: {money(preview.buyerTotal)}</p>
          </div>
          <span className="badge badge--pending">pending review</span>
        </div>

        <Button type="submit" variant="primary" size="lg" disabled={saving}>{saving ? 'Submitting...' : 'Submit for Review'}</Button>
      </form>
    </div>
  );
}
