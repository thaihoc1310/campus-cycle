import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
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
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
