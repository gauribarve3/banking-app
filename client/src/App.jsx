import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';

// Customer pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import AccountsView from './pages/customer/AccountsView';
import TransferPage from './pages/customer/TransferPage';
import FDCalculator from './pages/customer/FDCalculator';
import CustomerProfile from './pages/customer/CustomerProfile';
import MandatesPage from './pages/customer/MandatesPage';
import SetupManager from './pages/customer/SetupManager';
import DepositPage from './pages/customer/DepositPage';
import CreditCardHub from './pages/customer/CreditCardHub';
import GoogleCallback from './pages/GoogleCallback';

// Employee pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import CustomerLedger from './pages/employee/CustomerLedger';
import PendingApprovals from './pages/employee/PendingApprovals';
import ManagerMessages from './pages/employee/ManagerMessages';
import PendingCards from './pages/employee/PendingCards';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageEmployees from './pages/admin/ManageEmployees';
import BranchManagement from './pages/admin/BranchManagement';

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('vault-theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          {/* Customer routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/customer/accounts" element={<AccountsView />} />
            <Route path="/customer/transfer" element={<TransferPage />} />
            <Route path="/customer/fd-calculator" element={<FDCalculator />} />
            <Route path="/customer/profile" element={<CustomerProfile />} />
            <Route path="/customer/mandates" element={<MandatesPage />} />
            <Route path="/customer/deposit" element={<DepositPage />} />
            <Route path="/customer/credit-card" element={<CreditCardHub />} />
            <Route path="/customer/setup-manager" element={<SetupManager />} />
          </Route>

          {/* Employee routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/customers/:id" element={<CustomerLedger />} />
            <Route path="/employee/approvals" element={<PendingApprovals />} />
            <Route path="/employee/messages" element={<ManagerMessages />} />
            <Route path="/employee/credit-cards" element={<PendingCards />} />
          </Route>

          {/* Admin routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/employees" element={<ManageEmployees />} />
            <Route path="/admin/branches" element={<BranchManagement />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
