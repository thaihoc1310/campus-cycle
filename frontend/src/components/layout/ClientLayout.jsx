import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Package, Recycle, Sparkles, User, WalletCards } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './ClientLayout.css';

const navItems = [
  { to: '/', label: 'Explore', icon: Sparkles, end: true },
  { to: '/marketplace', label: 'Marketplace', icon: Package },
  { to: '/campaigns', label: 'Campaigns', icon: WalletCards },
  { to: '/my-items', label: 'My Items', icon: Recycle },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function ClientLayout() {
  const { isAuthenticated, isAdmin, loading, logout, user } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="client-loading">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="client-shell">
      <header className="client-nav">
        <NavLink to="/" className="client-nav__brand">
          <span className="client-nav__mark"><Recycle size={26} /></span>
          <span>Campus Cycle</span>
        </NavLink>
        <nav className="client-nav__links">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `client-nav__link ${isActive ? 'client-nav__link--active' : ''}`}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
          {isAdmin && <NavLink to="/admin" className="client-nav__link">Admin</NavLink>}
        </nav>
        <div className="client-nav__user">
          <span className="client-nav__avatar">
            {user?.avatar_url ? <img src={user.avatar_url} alt={user?.name || 'User'} /> : user?.name?.[0]?.toUpperCase() || 'U'}
          </span>
          <span>{user?.name}</span>
          <button type="button" className="client-nav__logout" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="client-main">
        <Outlet />
      </main>
    </div>
  );
}
