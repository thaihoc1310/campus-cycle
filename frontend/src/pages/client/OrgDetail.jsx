import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Building2,
  ChevronRight,
  Megaphone,
  Calendar,
  HeartHandshake,
  Award,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  Package,
  TrendingUp
} from 'lucide-react';
import api from '../../api/client';
import './Client.css';

export default function OrgDetail() {
  const { orgId } = useParams();
  const [org, setOrg] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');

  useEffect(() => {
    Promise.all([
      api.get(`/client/organizations/${orgId}`),
      api.get('/client/campaigns', { params: { organization_id: orgId } })
    ])
      .then(([orgRes, campRes]) => {
        setOrg(orgRes.data);
        setCampaigns(campRes.data.items || []);
      })
      .catch((err) => {
        console.error('Error fetching org details:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orgId]);

  if (loading) {
    return (
      <div className="client-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
        {/* Breadcrumb Skeleton */}
        <div className="client-skeleton" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="client-skeleton__block" style={{ width: '200px', height: '16px' }} />
        </div>
        
        {/* Banner Skeleton */}
        <div className="client-skeleton" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: 'var(--space-6)' }}>
          <div className="client-skeleton__block" style={{ height: '180px', borderRadius: 0 }} />
          <div style={{ padding: 'var(--space-6)', display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <div className="client-skeleton__block" style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-xl)', marginTop: '-40px', border: '4px solid var(--bg)' }} />
            <div style={{ flex: 1 }}>
              <div className="client-skeleton__block" style={{ width: '40%', height: '24px', marginBottom: 'var(--space-2)' }} />
              <div className="client-skeleton__block" style={{ width: '60%', height: '16px' }} />
            </div>
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
          <div className="client-skeleton" style={{ height: '90px', borderRadius: 'var(--radius-xl)' }} />
          <div className="client-skeleton" style={{ height: '90px', borderRadius: 'var(--radius-xl)' }} />
          <div className="client-skeleton" style={{ height: '90px', borderRadius: 'var(--radius-xl)' }} />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="client-page" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <div className="client-empty" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
          <span className="client-empty__icon" style={{ background: '#FEE2E2', color: '#EF4444' }}><Building2 size={32} /></span>
          <span className="client-empty__title">Organization Not Found</span>
          <span className="client-empty__copy">This organization might have been deleted, or the address URL is invalid.</span>
          <Link className="btn btn--primary btn--md" to="/campaigns" style={{ marginTop: 'var(--space-4)' }}>Back to Campaigns</Link>
        </div>
      </div>
    );
  }

  // Calculate high-premium real-time statistics
  const activeCampaigns = campaigns.filter(c => c.status !== 'completed');
  const fundraisingCount = campaigns.filter(c => c.type === 'fundraising').length;
  const donationCount = campaigns.filter(c => c.type === 'donation').length;

  const emailSlug = org.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const orgEmail = `${emailSlug}@campus.edu.vn`;
  const orgLocation = org.type === 'club' ? 'Student Association Hub, Level 2' : 'Campus Admin Hall, Room 104';

  return (
    <div className="client-page" style={{ maxWidth: '1080px', margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* Breadcrumbs */}
      <nav className="client-breadcrumb" style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
        <Link to="/" style={{ color: 'var(--gray-500)', transition: 'color var(--transition-fast)' }} onMouseEnter={e => e.target.style.color = 'var(--primary)'} onMouseLeave={e => e.target.style.color = 'var(--gray-500)'}>Home</Link>
        <ChevronRight size={14} className="client-breadcrumb__sep" style={{ color: 'var(--gray-400)' }} />
        <Link to="/campaigns" style={{ color: 'var(--gray-500)', transition: 'color var(--transition-fast)' }} onMouseEnter={e => e.target.style.color = 'var(--primary)'} onMouseLeave={e => e.target.style.color = 'var(--gray-500)'}>Campaigns</Link>
        <ChevronRight size={14} className="client-breadcrumb__sep" style={{ color: 'var(--gray-400)' }} />
        <span className="client-breadcrumb__current" style={{ color: 'var(--fg)' }}>{org.name}</span>
      </nav>

      {/* Organization Header Banner Component */}
      <header style={{
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        marginBottom: 'var(--space-6)',
        position: 'relative'
      }}>
        {/* Cover Graphic with blur mesh gradients */}
        <div style={{
          height: '180px',
          background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 40%, #1E40AF 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle design patterns for aesthetics */}
          <div style={{
            position: 'absolute',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            top: '-60px',
            right: '-40px',
            filter: 'blur(30px)'
          }} />
          <div style={{
            position: 'absolute',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.2)',
            bottom: '-40px',
            left: '10%',
            filter: 'blur(40px)'
          }} />
          {/* Organization Type Floating Tag */}
          <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)', textTransform: 'capitalize', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
              {org.type || 'Community'} Organization
            </span>
          </div>
        </div>

        {/* Profile Card Overlay details */}
        <div style={{
          padding: '0 var(--space-6) var(--space-6) var(--space-6)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-5)',
          alignItems: 'flex-start',
          position: 'relative'
        }}>
          {/* Avatar Container overlapping */}
          <div style={{
            width: '108px',
            height: '108px',
            borderRadius: '24px',
            overflow: 'hidden',
            backgroundColor: 'var(--muted)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--gray-400)',
            border: '5px solid var(--bg)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            flexShrink: 0,
            marginTop: '-44px',
            position: 'relative',
            zIndex: 2,
            transition: 'transform var(--transition-normal)'
          }}
          className="org-avatar-hover"
          >
            {org.image_url ? (
              <img src={org.image_url} alt={org.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Building2 size={48} style={{ color: 'var(--primary)' }} />
            )}
          </div>

          {/* Org details */}
          <div style={{ flex: 1, minWidth: '280px', paddingTop: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <h1 className="client-section__title" style={{ fontSize: 'var(--font-size-2xl)', margin: 0, fontWeight: 800 }}>{org.name}</h1>
              <span className="badge badge--approved" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: '10px' }}>
                <ShieldCheck size={12} /> Verified
              </span>
            </div>
            <p className="client-section__copy" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)', lineHeight: 1.6, maxWidth: '780px' }}>
              {org.description || 'No description provided for this campus organization.'}
            </p>
          </div>
        </div>
      </header>

      {/* Dashboard Statistics Overview */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-8)'
      }}>
        {/* Stat Card 1: Active Drives */}
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
        }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#EFF6FF', display: 'grid', placeItems: 'center', color: '#2563EB', flexShrink: 0 }}>
            <Megaphone size={20} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Drives</div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--fg)', marginTop: '2px' }}>{activeCampaigns.length}</div>
          </div>
        </div>

        {/* Stat Card 2: Fundraising */}
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
        }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ECFDF5', display: 'grid', placeItems: 'center', color: '#10B981', flexShrink: 0 }}>
            <HeartHandshake size={20} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fundraising</div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--fg)', marginTop: '2px' }}>{fundraisingCount}</div>
          </div>
        </div>

        {/* Stat Card 3: Accepting Items */}
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
        }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FFFBEB', display: 'grid', placeItems: 'center', color: '#F59E0B', flexShrink: 0 }}>
            <Package size={20} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accepting Items</div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--fg)', marginTop: '2px' }}>{donationCount}</div>
          </div>
        </div>
      </section>

      {/* Tabs Navigation system */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--border)',
        gap: 'var(--space-6)',
        marginBottom: 'var(--space-6)',
        alignItems: 'center'
      }}>
        {/* Tab 1: Campaigns */}
        <button
          onClick={() => setActiveTab('campaigns')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'campaigns' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: 'var(--space-3) 0',
            color: activeTab === 'campaigns' ? 'var(--primary)' : 'var(--gray-500)',
            fontSize: 'var(--font-size-md)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'color var(--transition-fast), border-color var(--transition-fast)'
          }}
        >
          <TrendingUp size={16} /> Campaigns
        </button>

        {/* Tab 2: About & Guidelines */}
        <button
          onClick={() => setActiveTab('about')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'about' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: 'var(--space-3) 0',
            color: activeTab === 'about' ? 'var(--primary)' : 'var(--gray-500)',
            fontSize: 'var(--font-size-md)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'color var(--transition-fast), border-color var(--transition-fast)'
          }}
        >
          <Award size={16} /> About & Contact
        </button>
      </div>

      {/* Tab Contents: Campaigns */}
      {activeTab === 'campaigns' && (
        <section>
          {campaigns.length ? (
            <div className="client-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
              {campaigns.map((campaign) => (
                <article
                  key={campaign.id}
                  className="client-card client-item-card"
                  style={{
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                    background: 'var(--bg)',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease'
                  }}
                >
                  {/* Campaign Image Cover */}
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    style={{
                      display: 'block',
                      height: '190px',
                      position: 'relative',
                      overflow: 'hidden',
                      background: '#0B1020'
                    }}
                  >
                    {campaign.main_image ? (
                      <img src={campaign.main_image} alt={campaign.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }} onMouseEnter={e => e.target.style.transform = 'scale(1.05)'} onMouseLeave={e => e.target.style.transform = 'scale(1.0)'} />
                    ) : (
                      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'rgba(255,255,255,0.3)', background: 'linear-gradient(135deg, var(--gray-800) 0%, #1f2937 100%)' }}>
                        <Megaphone size={56} style={{ opacity: 0.6 }} />
                      </div>
                    )}
                    {/* Absolute Badges on Cover Image */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      <span className="badge badge--approved" style={{ backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>{campaign.type}</span>
                    </div>
                  </Link>

                  {/* Campaign details */}
                  <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 800, color: 'var(--fg)', lineHeight: 1.4, margin: '0 0 var(--space-2) 0' }}>
                      <Link to={`/campaigns/${campaign.id}`} style={{ color: 'inherit', textDecoration: 'none', transition: 'color var(--transition-fast)' }} onMouseEnter={e => e.target.style.color = 'var(--primary)'} onMouseLeave={e => e.target.style.color = 'inherit'}>
                        {campaign.title}
                      </Link>
                    </h3>
                    
                    <p style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--gray-500)',
                      lineHeight: 1.5,
                      margin: '0 0 var(--space-4) 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      height: '48px'
                    }}>
                      {campaign.description}
                    </p>

                    {/* Card Footer details */}
                    <div style={{
                      marginTop: 'auto',
                      paddingTop: 'var(--space-3)',
                      borderTop: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--gray-600)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Calendar size={13} style={{ color: 'var(--primary)' }} />
                        <span>{campaign.type === 'fundraising' ? 'Raising Funds' : 'Donating Goods'}</span>
                      </div>
                      <Link to={`/campaigns/${campaign.id}`} style={{ fontWeight: 700, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        View <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="client-empty" style={{ padding: 'var(--space-12) 0', border: '1px dashed var(--border)', background: 'var(--bg)', borderRadius: 'var(--radius-xl)' }}>
              <span className="client-empty__icon"><Megaphone size={28} style={{ color: 'var(--gray-400)' }} /></span>
              <span className="client-empty__title" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>No Active Campaigns</span>
              <span className="client-empty__copy" style={{ color: 'var(--gray-500)' }}>This organization hasn't published any community campaigns yet.</span>
            </div>
          )}
        </section>
      )}

      {/* Tab Contents: About & Guidelines */}
      {activeTab === 'about' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
          {/* Main Info */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>About The Organization</h2>
            <p style={{ color: 'var(--gray-600)', fontSize: 'var(--font-size-sm)', lineHeight: 1.7, marginBottom: 'var(--space-5)' }}>
              {org.description || 'This organization is a verified campus affiliate dedicated to driving community engagement, sharing campus cycles, supporting fundraising drives, and facilitating student and faculty item cycles.'}
            </p>

            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 800, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--primary)' }} /> Donation & Support Guidelines
            </h3>
            <ul style={{ paddingLeft: 'var(--space-4)', color: 'var(--gray-600)', fontSize: 'var(--font-size-sm)', lineHeight: 1.7, display: 'grid', gap: 'var(--space-2)' }}>
              <li><strong>Monetary Fundraisers:</strong> Ensure all direct donations are made securely via the official Campus Cycle platform gateway.</li>
              <li><strong>Physical Item Collections:</strong> Please list your items under the dedicated campaign path and submit them directly to the organization collection rooms during active working hours.</li>
              <li><strong>Verification Status:</strong> Feel free to request physical cycle verification for heavy machinery or electronic gear from the campus org support staff.</li>
            </ul>
          </div>

          {/* Quick Stats & Contact Meta Card */}
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--fg)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)' }}>Quick Information</h3>
              
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {/* Meta Item: Type */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <Building2 size={16} style={{ color: 'var(--gray-400)' }} />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 700 }}>Type</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--fg)', fontWeight: 600, textTransform: 'capitalize' }}>{org.type || 'Campus Affiliate'}</div>
                  </div>
                </div>

                {/* Meta Item: Joined date */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <Calendar size={16} style={{ color: 'var(--gray-400)' }} />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 700 }}>Date Joined</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--fg)', fontWeight: 600 }}>
                      {new Date(org.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Meta Item: Location */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <MapPin size={16} style={{ color: 'var(--gray-400)' }} />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 700 }}>Campus Address</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--fg)', fontWeight: 600 }}>{orgLocation}</div>
                  </div>
                </div>

                {/* Meta Item: Contact */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <Mail size={16} style={{ color: 'var(--gray-400)' }} />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 700 }}>Official Email</div>
                    <a href={`mailto:${orgEmail}`} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--primary)', fontWeight: 600, wordBreak: 'break-all' }}>{orgEmail}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
