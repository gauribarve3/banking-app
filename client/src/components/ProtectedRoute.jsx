import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const roleHome = {
  customer: '/customer/dashboard',
  employee: '/employee/dashboard',
  admin: '/admin/dashboard',
};

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-screen__spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHome[user.role] || '/login'} replace />;
  }

  // Force first-time Google sign-ins or unassigned customers to choose their invited branch manager
  if (user && user.role === 'customer' && !user.assignedEmployeeId) {
    if (window.location.pathname !== '/customer/setup-manager') {
      return <Navigate to="/customer/setup-manager" replace />;
    }
  }

  return children;
}
