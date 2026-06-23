import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Gate around the /admin route. While auth is resolving we show nothing;
 * once resolved, non-admins are redirected to login and the dashboard is
 * only rendered for users whose profile role is 'admin'.
 */
export default function RequireAdmin({ children }) {
  const { loading, user, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    localStorage.setItem('redirect_after_login', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
