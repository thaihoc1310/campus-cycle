import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ClientLayout from './components/layout/ClientLayout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Home from './pages/client/Home.jsx';
import Marketplace from './pages/client/Marketplace.jsx';
import ItemDetail from './pages/client/ItemDetail.jsx';
import PostItem from './pages/client/PostItem.jsx';
import MyItems from './pages/client/MyItems.jsx';
import ClientCampaigns from './pages/client/Campaigns.jsx';
import CampaignDetail from './pages/client/CampaignDetail.jsx';
import Profile from './pages/client/Profile.jsx';
import OrgDashboard from './pages/org/OrgDashboard.jsx';
import OrgCampaigns from './pages/org/OrgCampaigns.jsx';
import OrgCampaignDetail from './pages/org/OrgCampaignDetail.jsx';
import OrgInfo from './pages/org/OrgInfo.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Users from './pages/admin/Users.jsx';
import Organizations from './pages/admin/Organizations.jsx';
import Campaigns from './pages/admin/Campaigns.jsx';
import Items from './pages/admin/Items.jsx';
import Transactions from './pages/admin/Transactions.jsx';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-family)', color: '#6B7280' }}>
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Client Routes */}
      <Route path="/" element={<ClientLayout />}>
        <Route index element={<Home />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="items/:itemId" element={<ItemDetail />} />
        <Route path="post-item" element={<PostItem />} />
        <Route path="my-items" element={<MyItems />} />
        <Route path="campaigns" element={<ClientCampaigns />} />
        <Route path="campaigns/:campaignId" element={<CampaignDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="org/:orgId" element={<OrgDashboard />} />
        <Route path="org/:orgId/campaigns" element={<OrgCampaigns />} />
        <Route path="org/:orgId/campaigns/:campaignId" element={<OrgCampaignDetail />} />
        <Route path="org/:orgId/info" element={<OrgInfo />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="items" element={<Items />} />
        <Route path="transactions" element={<Transactions />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
