import { useState, useEffect } from 'react';
import { UserPlus, X, Search } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../ui/Toast.jsx';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import './OrgAdminModal.css';

export default function OrgAdminModal({ isOpen, onClose, organization }) {
  const toast = useToast();
  const [admins, setAdmins] = useState([]);
  const [available, setAvailable] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const orgId = organization?.id;

  const fetchAdmins = async () => {
    if (!orgId) return;
    try {
      const res = await api.get(`/organizations/${orgId}/admins`);
      setAdmins(res.data);
    } catch { /* ignore */ }
  };

  const searchUsers = async (term) => {
    if (!orgId) return;
    try {
      const res = await api.get(`/organizations/${orgId}/available-users`, { params: { search: term } });
      setAvailable(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (isOpen && orgId) {
      fetchAdmins();
      searchUsers('');
    }
  }, [isOpen, orgId]);

  const handleAdd = async (userId) => {
    setLoading(true);
    try {
      await api.post(`/organizations/${orgId}/admins`, { user_id: userId });
      toast('Admin added successfully!', 'success');
      fetchAdmins();
      searchUsers(searchTerm);
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to add admin', 'error');
    }
    setLoading(false);
  };

  const handleRemove = async (userId) => {
    setLoading(true);
    try {
      await api.delete(`/organizations/${orgId}/admins/${userId}`);
      toast('Admin removed successfully!', 'success');
      fetchAdmins();
      searchUsers(searchTerm);
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to remove admin', 'error');
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    searchUsers(val);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Admins — ${organization?.name || ''}`} size="lg">
      <div className="org-admin-modal">
        {/* Current Admins */}
        <div className="org-admin-section">
          <h4 className="org-admin-section__title">Current Admins ({admins.length})</h4>
          <div className="org-admin-list">
            {admins.length === 0 && <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>No admins assigned</p>}
            {admins.map((a) => (
              <div key={a.id} className="org-admin-item">
                <div className="org-admin-item__avatar">{a.user?.name?.[0]?.toUpperCase()}</div>
                <div className="org-admin-item__info">
                  <span className="org-admin-item__name">{a.user?.name}</span>
                  <span className="org-admin-item__email">{a.user?.email}</span>
                </div>
                <button className="btn btn--icon" style={{ color: 'var(--danger)' }} onClick={() => handleRemove(a.user_id)} disabled={loading}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add Admin */}
        <div className="org-admin-section">
          <h4 className="org-admin-section__title">Add Admin</h4>
          <div className="org-admin-search">
            <Search size={16} className="org-admin-search__icon" />
            <input
              type="text"
              className="org-admin-search__input"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="org-admin-list">
            {available.length === 0 && <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>No users found</p>}
            {available.map((u) => (
              <div key={u.id} className="org-admin-item">
                <div className="org-admin-item__avatar">{u.name?.[0]?.toUpperCase()}</div>
                <div className="org-admin-item__info">
                  <span className="org-admin-item__name">{u.name}</span>
                  <span className="org-admin-item__email">{u.email}</span>
                </div>
                <Button variant="primary" size="sm" onClick={() => handleAdd(u.id)} disabled={loading}>
                  <UserPlus size={14} /> Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
