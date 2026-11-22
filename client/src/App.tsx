import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PetForm from './pages/PetForm';
import PetDetail from './pages/PetDetail';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserDetail from './pages/AdminUserDetail';

function FullScreenLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner text="正在加载…" />
    </div>
  );
}

function RequireUser({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoading />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (user.role !== 'user') return <Navigate to="/admin" replace />;
  return <Layout>{children}</Layout>;
}

function RequireAnyUser({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoading />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Layout admin={user.role === 'admin'}>{children}</Layout>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoading />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <Layout admin>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <RequireUser>
            <Dashboard />
          </RequireUser>
        }
      />
      <Route
        path="/pets/new"
        element={
          <RequireUser>
            <PetForm />
          </RequireUser>
        }
      />
      <Route
        path="/pets/:id/edit"
        element={
          <RequireUser>
            <PetForm />
          </RequireUser>
        }
      />
      <Route
        path="/pets/:id"
        element={
          <RequireUser>
            <PetDetail />
          </RequireUser>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAnyUser>
            <Settings />
          </RequireAnyUser>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/users/:id"
        element={
          <RequireAdmin>
            <AdminUserDetail />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
