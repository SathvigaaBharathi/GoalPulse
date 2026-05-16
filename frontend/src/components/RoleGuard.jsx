import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const RoleGuard = ({ allowedRoles, children }) => {
  const { user, token } = useAuthStore();

  if (!user || !token) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to their actual role dashboard if they try to access something else
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'manager') return <Navigate to="/manager" replace />;
    return <Navigate to="/employee" replace />;
  }

  return children || <Outlet />;
};

export default RoleGuard;
