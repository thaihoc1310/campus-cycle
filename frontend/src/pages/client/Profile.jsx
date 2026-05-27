import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import './Client.css';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', date_of_birth: '', user_type: 'student' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        user_type: user.user_type || 'student',
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/me', {
        name: profileForm.name,
        phone: profileForm.phone || null,
        date_of_birth: profileForm.date_of_birth || null,
        user_type: profileForm.user_type,
      });
      updateUser(res.data);
      toast('Profile updated successfully.', 'success');
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('avatar', file);
    try {
      const res = await api.post('/auth/me/avatar', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(res.data);
      toast('Avatar updated successfully.', 'success');
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not upload avatar', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast('New passwords do not match', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      toast('Password changed successfully.', 'success');
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="client-page">
      <div className="client-account">
        <section className="client-account__summary">
          <label className="client-account__avatar" htmlFor="profile-avatar">
            {user?.avatar_url ? <img src={user.avatar_url} alt={user?.name || 'User'} /> : user?.name?.[0]?.toUpperCase() || 'U'}
            <input id="profile-avatar" type="file" accept="image/*" onChange={handleAvatarUpload} />
            <span>Upload Avatar</span>
          </label>
          <p className="client-hero__eyebrow">Account</p>
          <h1>{user?.name}</h1>
          <p>{user?.email}</p>
          <div className="client-account__facts">
            <div>
              <strong>{user?.role}</strong>
              <span>role</span>
            </div>
            <div>
              <strong>{user?.user_type || 'student'}</strong>
              <span>user type</span>
            </div>
            <div>
              <strong>{user?.status}</strong>
              <span>status</span>
            </div>
            {user?.status !== 'active' && (
              <div>
                <strong>View only</strong>
                <span>admin activation required</span>
              </div>
            )}
          </div>
        </section>

        <section className="client-account__panel">
          <div className="client-account__tabs">
            <button
              type="button"
              className={`client-account__tab ${activeTab === 'profile' ? 'client-account__tab--active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              type="button"
              className={`client-account__tab ${activeTab === 'password' ? 'client-account__tab--active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              Password
            </button>
          </div>

          {activeTab === 'profile' ? (
            <form className="client-account__form" onSubmit={handleProfileSubmit}>
              <div>
                <h2>Personal Information</h2>
                <p className="text-muted">Update the basic account details shown across Campus Cycle.</p>
              </div>
              <Input id="account-name" label="Full Name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required />
              <Input id="account-email" label="Email" type="email" value={profileForm.email} disabled />
              <Input id="account-phone" label="Phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              <Input id="account-dob" label="Date of Birth" type="date" value={profileForm.date_of_birth} onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })} />
              <Input id="account-user-type" label="User Type" type="select" value={profileForm.user_type} onChange={(e) => setProfileForm({ ...profileForm, user_type: e.target.value })}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
              </Input>
              <Button type="submit" variant="primary" size="lg" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Profile'}</Button>
            </form>
          ) : (
            <form className="client-account__form" onSubmit={handlePasswordSubmit}>
              <div>
                <h2>Change Password</h2>
                <p className="text-muted">Use at least 6 characters for the new password.</p>
              </div>
              <Input id="current-password" label="Current Password" type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} required />
              <Input id="new-password" label="New Password" type="password" minLength={6} value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} required />
              <Input id="confirm-password" label="Confirm New Password" type="password" minLength={6} value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} required />
              <Button type="submit" variant="primary" size="lg" disabled={savingPassword}>{savingPassword ? 'Saving...' : 'Change Password'}</Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
