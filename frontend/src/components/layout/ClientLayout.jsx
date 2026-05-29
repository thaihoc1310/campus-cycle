import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building2,
  Check,
  CheckCircle,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Recycle,
  ShoppingBag,
  User,
  WalletCards,
  XCircle,
  Mail,
  Phone,
  Heart,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import './ClientLayout.css';

const accountNavItems = [
  { to: '/marketplace', label: 'Marketplace', icon: Package },
  { to: '/campaigns', label: 'Campaigns', icon: WalletCards },
];

const NOTIF_READ_KEY = 'campus_cycle_notif_read_at';
const NOTIF_READ_IDS_KEY = 'campus_cycle_notif_read_ids';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const NOTIF_ICONS = {
  item_approved: { icon: CheckCircle, color: '#10B981' },
  item_rejected: { icon: XCircle, color: '#EF4444' },
  sale_paid: { icon: ShoppingBag, color: '#3B82F6' },
  sale_completed: { icon: CheckCircle, color: '#10B981' },
  sale_refunded: { icon: XCircle, color: '#F59E0B' },
  payment_cancelled: { icon: XCircle, color: '#EF4444' },
  donation_approved: { icon: CheckCircle, color: '#8B5CF6' },
  donation_rejected: { icon: XCircle, color: '#EF4444' },
};

function NotificationsDropdown({ notifications, onMarkRead, onClickNotif }) {
  return (
    <div className="notif-dropdown">
      <div className="notif-dropdown__header">
        <strong>Notifications</strong>
        {notifications.some((n) => !n.is_read) && (
          <button type="button" className="notif-dropdown__mark-read" onClick={onMarkRead}>
            <Check size={14} />
            <span>Mark all read</span>
          </button>
        )}
      </div>
      <div className="notif-dropdown__list">
        {notifications.length === 0 ? (
          <div className="notif-dropdown__empty">
            <Bell size={24} />
            <span>No notifications yet</span>
          </div>
        ) : (
          notifications.map((notif) => {
            const iconInfo = NOTIF_ICONS[notif.type] || { icon: Bell, color: '#6B7280' };
            const Icon = iconInfo.icon;
            return (
              <button
                key={notif.id}
                type="button"
                className={`notif-item ${notif.is_read ? '' : 'notif-item--unread'}`}
                onClick={() => onClickNotif(notif)}
              >
                <span className="notif-item__icon" style={{ color: iconInfo.color }}>
                  <Icon size={18} />
                </span>
                <span className="notif-item__body">
                  <span className="notif-item__msg">{notif.message}</span>
                  <span className="notif-item__time">{timeAgo(notif.timestamp)}</span>
                </span>
                {!notif.is_read && <span className="notif-item__dot" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function ClientLayout() {
  const { isAuthenticated, isAdmin, loading, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const [orgs, setOrgs] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Notifications state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const getReadAt = useCallback(() => localStorage.getItem(NOTIF_READ_KEY) || null, []);

  const getReadIds = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(NOTIF_READ_IDS_KEY) || '[]');
    } catch { return []; }
  }, []);

  const mergeReadState = useCallback((notifs) => {
    const readIds = new Set(getReadIds());
    return notifs.map((n) => ({ ...n, is_read: n.is_read || readIds.has(n.id) }));
  }, [getReadIds]);

  const fetchNotifications = useCallback(() => {
    if (!isAuthenticated) return;
    const after = getReadAt();
    const params = after ? { after } : {};
    api.get('/client/notifications', { params })
      .then((res) => {
        const merged = mergeReadState(res.data.items || []);
        setNotifications(merged);
        setUnreadCount(merged.filter((n) => !n.is_read).length);
      })
      .catch(() => {});
  }, [isAuthenticated, getReadAt, mergeReadState]);

  const fetchUnreadCount = useCallback(() => {
    if (!isAuthenticated) return;
    const after = getReadAt();
    const params = after ? { after } : {};
    api.get('/client/notifications/unread-count', { params })
      .then((res) => setUnreadCount(res.data.unread_count || 0))
      .catch(() => {});
  }, [isAuthenticated, getReadAt]);

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

  // Fetch notifications on mount and poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
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
    setNotifOpen(false);
    navigate(path);
  };

  const handleMarkAllRead = () => {
    localStorage.setItem(NOTIF_READ_KEY, new Date().toISOString());
    // Clear individual read IDs since everything is now covered by the timestamp
    localStorage.removeItem(NOTIF_READ_IDS_KEY);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleClickNotif = (notif) => {
    // Mark this notification as read
    if (!notif.is_read) {
      const readIds = getReadIds();
      if (!readIds.includes(notif.id)) {
        const updated = [...readIds, notif.id].slice(-200); // keep last 200
        localStorage.setItem(NOTIF_READ_IDS_KEY, JSON.stringify(updated));
      }
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    // Navigate
    goTo(notif.link);
  };

  const handleNotifToggle = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    setMenuOpen(false);
    if (opening) fetchNotifications();
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
        <div className="client-nav__actions">
          {/* Notification Bell */}
          <div className="notif-bell" ref={notifRef}>
            <button type="button" className="notif-bell__btn" onClick={handleNotifToggle} aria-label="Notifications">
              <Bell size={20} />
              {unreadCount > 0 && <span className="notif-bell__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {notifOpen && (
              <NotificationsDropdown
                notifications={notifications}
                onMarkRead={handleMarkAllRead}
                onClickNotif={handleClickNotif}
              />
            )}
          </div>

          {/* Account Menu */}
          <div className="client-nav__user" ref={menuRef}>
            <button type="button" className="client-nav__avatar-button" onClick={() => { setMenuOpen((open) => !open); setNotifOpen(false); }} aria-label="Open account menu">
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
                    <button type="button" className="account-menu__item" onClick={() => goTo('/my-purchases')}>
                      <ShoppingBag size={18} />
                      <span>My Purchases</span>
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
        </div>
      </header>

      <main className="client-main">
        <Outlet />
      </main>

      <footer className="client-footer">
        <div className="client-footer__container">
          <div className="client-footer__brand-col">
            <Link to="/" className="client-footer__brand">
              <span className="client-footer__mark"><Recycle size={20} /></span>
              <span>Campus Cycle</span>
            </Link>
            <p className="client-footer__tagline">
              Empowering campus sustainability through circular trade, item recycling, and community-driven fundraising campaigns.
            </p>
            <span className="client-footer__copyright">
              © {new Date().getFullYear()} Campus Cycle. All rights reserved.
            </span>
          </div>

          <div className="client-footer__links-col">
            <h4 className="client-footer__title">Explore</h4>
            <ul className="client-footer__list">
              <li><Link to="/marketplace">Marketplace</Link></li>
              <li><Link to="/campaigns">Campaigns</Link></li>
              <li><Link to="/profile">My Profile</Link></li>
              <li><Link to="/my-items">My Items</Link></li>
            </ul>
          </div>

          <div className="client-footer__contact-col">
            <h4 className="client-footer__title">Support</h4>
            <ul className="client-footer__list">
              <li className="client-footer__contact-item">
                <Mail size={16} />
                <a href="mailto:support@campuscycle.edu">support@campuscycle.edu</a>
              </li>
              <li className="client-footer__contact-item">
                <Phone size={16} />
                <a href="tel:+1234567890">(+84) 123-456-789</a>
              </li>
              <li className="client-footer__made-with">
                Made with <Heart size={14} className="heart-icon" /> for a greener campus.
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

