import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Admin pages
import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import Products       from './pages/Products';
import Customers      from './pages/Customers';
import Orders         from './pages/Orders';
import CreateOrder    from './pages/CreateOrder';
import OrderDetail    from './pages/OrderDetail';
import Payments       from './pages/Payments';
import Employees      from './pages/Employees';
import EmployeeForm   from './pages/EmployeeForm';
import EmployeeDetail from './pages/EmployeeDetail';
import Reports        from './pages/Reports';
import Layout         from './components/Layout';

// Customer portal pages
import PortalLogin        from './pages/portal/PortalLogin';
import PortalLayout       from './pages/portal/PortalLayout';
import PortalDashboard    from './pages/portal/PortalDashboard';
import PortalPayments     from './pages/portal/PortalPayments';
import { PortalOrdersList, PortalOrderDetail } from './pages/portal/PortalOrders';

// Public catalogue (no auth needed)
import Catalogue        from './pages/portal/Catalogue';
import CatalogueProduct from './pages/portal/CatalogueProduct';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-stone-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public catalogue (no login required) ── */}
          <Route path="/catalogue"     element={<Catalogue />} />
          <Route path="/catalogue/:id" element={<CatalogueProduct />} />

          {/* ── Admin routes ── */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"              element={<Dashboard />} />
            <Route path="products"               element={<Products />} />
            <Route path="customers"              element={<Customers />} />
            <Route path="orders"                 element={<Orders />} />
            <Route path="orders/new"             element={<CreateOrder />} />
            <Route path="orders/:id"             element={<OrderDetail />} />
            <Route path="payments"               element={<Payments />} />
            <Route path="employees"              element={<Employees />} />
            <Route path="employees/new"          element={<EmployeeForm />} />
            <Route path="employees/:id"          element={<EmployeeDetail />} />
            <Route path="employees/:id/edit"     element={<EmployeeForm />} />
            <Route path="reports"                element={<Reports />} />
          </Route>

          {/* ── Customer portal (login required) ── */}
          <Route path="/portal/login"  element={<PortalLogin />} />
          <Route path="/portal"        element={<PortalLayout />}>
            <Route index               element={<Navigate to="/portal/dashboard" replace />} />
            <Route path="dashboard"    element={<PortalDashboard />} />
            <Route path="orders"       element={<PortalOrdersList />} />
            <Route path="orders/:id"   element={<PortalOrderDetail />} />
            <Route path="payments"     element={<PortalPayments />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
