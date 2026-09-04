import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AuthLayout } from './components/AuthLayout';
import { ProductsPage } from './pages/ProductsPage';
import { InvoicesPage } from './pages/InvoicesPage';

function App() {
  return (
    <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes inside AuthLayout */}
        <Route element={<AuthLayout />}>
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/" element={<Navigate to="/products" replace />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>
  );
}

export default App;
