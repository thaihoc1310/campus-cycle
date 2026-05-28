import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import api from '../../api/client';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import './Org.css';

export default function OrgInfo() {
  const { orgId } = useParams();
  const toast = useToast();
  const [org, setOrg] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ name: '', type: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchOrg = useCallback(() => {
    Promise.all([
      api.get(`/org/${orgId}`),
      api.get(`/org/${orgId}/admins`),
    ]).then(([orgRes, adminRes]) => {
      setOrg(orgRes.data);
      setAdmins(adminRes.data || []);
      setForm({
        name: orgRes.data.name || '',
        type: orgRes.data.type || '',
        description: orgRes.data.description || '',
      });
    }).catch(() => {});
  }, [orgId]);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/org/${orgId}`, form);
      setOrg(res.data);
      window.dispatchEvent(new Event('orgs:refresh'));
      toast('Organization info updated.', 'success');
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not update organization', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('image', file);
    try {
      const res = await api.post(`/org/${orgId}/image`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setOrg(res.data);
      window.dispatchEvent(new Event('orgs:refresh'));
      toast('Organization image updated.', 'success');
    } catch (err) {
      toast(err.response?.data?.detail || 'Upload failed', 'error');
    } finally {
      event.target.value = '';
    }
  };

  if (!org) {
    return <div className="org-page"><div className="client-empty"><span className="client-empty__title">Loading organization info...</span></div></div>;
  }

  return (
    <div className="org-page">
      <div className="org-page__header">
        <div>
          <p className="org-eyebrow">Organization profile</p>
          <h1>{org.name}</h1>
          <p className="org-copy">Keep public organization details and admin visibility up to date.</p>
        </div>
      </div>

      <div className="org-info-grid">
        <form className="org-panel" onSubmit={handleSave}>
          <div className="org-profile-head">
            <label className="org-image-upload">
              {org.image_url ? <img src={org.image_url} alt={org.name} /> : <Building2 size={54} />}
              <input type="file" accept="image/*" onChange={handleImageUpload} />
              <span>Upload Image</span>
            </label>
            <div className="org-profile-head__fields">
              <Input id="org-info-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input id="org-info-type" label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="club, class, department" />
            </div>
          </div>
          <Input id="org-info-desc" label="Description" type="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Organization'}</Button>
        </form>

        <section className="org-panel">
          <div className="org-panel__header">
            <h2>Admins</h2>
            <span>{admins.length} people</span>
          </div>
          {admins.length > 0 ? (
            <div className="org-admin-stack">
              {admins.map((admin) => (
                <div key={admin.id} className="org-admin-row">
                  <span className="org-admin-row__avatar">
                    {admin.user?.avatar_url ? <img src={admin.user.avatar_url} alt={admin.user.name} /> : admin.user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <div>
                    <strong>{admin.user?.name}</strong>
                    <span>{admin.user?.email}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="org-empty-inline">
              <Building2 size={32} />
              <span>No admins assigned to this organization.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
