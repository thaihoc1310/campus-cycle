import { useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Recycle,
  Sparkles,
  User,
  WalletCards,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import './ClientLayout.css';

const accountNavItems = [
  { to: '/', label: 'Explore', icon: Sparkles, end: true },
  { to: '/marketplace', label: 'Marketplace', icon: Package },
  { to: '/campaigns', label: 'Campaigns', icon: WalletCards },
];

export default function ClientLayout() {
  const { isAuthenticated, isAdmin, loading, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const [orgs, setOrgs] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const orgMatch = location.pathname.match(/^\/org\/([^/]+)/);
  const activeOrgId = orgMatch?.[1] || null;
  const activeOrg = orgs.find((org) => org.id === activeOrgId) || null;
  const isOrgMode = Boolean(activeOrgId);
  const navItems = isOrgMode && activeOrgId
    ? [
      { to: `/org/${activeOrgId}`, label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: `/org/${activeOrgId}/campaigns`, label: 'Campaigns', icon: Megaphone },
    ]
    : accountNavItems;

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchOrgs = () => {
      api.get('/org/me').then((res) => setOrgs(res.data || [])).catch(() => setOrgs([]));
    };
    fetchOrgs();
    window.addEventListener('orgs:refresh', fetchOrgs);
    return () => window.removeEventListener('orgs:refresh', fetchOrgs);
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (loading) return <div className="client-loading">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const menuAvatar = isOrgMode ? activeOrg?.image_url : user?.avatar_url;
  const menuName = isOrgMode ? activeOrg?.name || 'Organization' : user?.name || 'User';
  const fallbackLetter = menuName?.[0]?.toUpperCase() || 'U';

  return (
    <div className="client-shell">
      <header className="client-nav">
        <NavLink to="/" className="client-nav__brand">
          <span className="client-nav__mark"><Recycle size={26} /></span>
          <span>Campus Cycle</span>
          {isOrgMode && <span className="client-nav__context">{activeOrg?.name || 'Organization'}</span>}
        </NavLink>
        <nav className="client-nav__links">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `client-nav__link ${isActive ? 'client-nav__link--active' : ''}`}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="client-nav__user" ref={menuRef}>
          <button type="button" className="client-nav__avatar-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Open account menu">
            <span className={`client-nav__avatar ${isOrgMode ? 'client-nav__avatar--org' : ''}`}>
              {menuAvatar ? <img src={menuAvatar} alt={menuName} /> : fallbackLetter}
            </span>
            <ChevronDown size={16} />
          </button>
          {menuOpen && (
            <div className="account-menu">
              {isOrgMode ? (
                <>
                  <div className="account-menu__header">
                    <span className="account-menu__eyebrow">Managing organization</span>
                    <strong>{activeOrg?.name || 'Organization'}</strong>
                  </div>
                  <button type="button" className="account-menu__item" onClick={() => goTo(`/org/${activeOrgId}/info`)}>
                    <Building2 size={18} />
                    <span>Org Info</span>
                  </button>
                  <button type="button" className="account-menu__item" onClick={() => goTo('/')}>
                    <span className="account-menu__thumb">
                      {user?.avatar_url ? <img src={user.avatar_url} alt={user?.name || 'User'} /> : user?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                    <span>Switch to {user?.name || 'Account'}</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="account-menu__header">
                    <span className="account-menu__eyebrow">Signed in as</span>
                    <strong>{user?.name}</strong>
                  </div>
                  <button type="button" className="account-menu__item" onClick={() => goTo('/profile')}>
                    <User size={18} />
                    <span>Profile</span>
                  </button>
                  <button type="button" className="account-menu__item" onClick={() => goTo('/my-items')}>
                    <Package size={18} />
                    <span>My Items</span>
                  </button>
                  {orgs.length > 0 && (
                    <>
                      <div className="account-menu__section">Organizations</div>
                      {orgs.map((org) => (
                        <button key={org.id} type="button" className="account-menu__item" onClick={() => goTo(`/org/${org.id}`)}>
                          <span className="account-menu__thumb account-menu__thumb--org">
                            {org.image_url ? <img src={org.image_url} alt={org.name} /> : org.name?.[0]?.toUpperCase() || 'O'}
                          </span>
                          <span>{org.name}</span>
                        </button>
                      ))}
                    </>
                  )}
                  {isAdmin && (
                    <button type="button" className="account-menu__item" onClick={() => goTo('/admin')}>
                      <BarChart3 size={18} />
                      <span>Admin Console</span>
                    </button>
                  )}
                </>
              )}
              <div className="account-menu__divider" />
              <button type="button" className="account-menu__item account-menu__item--danger" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="client-main">
        <Outlet />
      </main>
    </div>
  );
}
