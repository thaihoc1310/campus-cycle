import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { Recycle } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import './Auth.css';

export default function Register() {
  const { register, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', dateOfBirth: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated && isAdmin) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.phone, form.dateOfBirth);
      toast('Registration successful! Your account is awaiting admin activation.', 'success');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-decor auth-decor--1" />
      <div className="auth-decor auth-decor--2" />
      <div className="auth-decor auth-decor--3" />

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Recycle size={32} />
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join Campus Cycle today</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <Input
            id="register-name" label="Full Name" placeholder="Enter your name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
          />
          <Input
            id="register-email" label="Email" type="email" placeholder="Enter your email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
          />
          <Input
            id="register-phone" label="Phone" placeholder="Enter your phone number"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            id="register-dob" label="Date of Birth" type="date"
            value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          />
          <Input
            id="register-password" label="Password" type="password" placeholder="Min 6 characters"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
          />
          <Input
            id="register-confirm" label="Confirm Password" type="password" placeholder="Re-enter password"
            value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required
          />

          <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
