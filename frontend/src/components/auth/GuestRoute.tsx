import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";

/**
 * Wraps routes that should only be accessible to guests (not authenticated).
 *
 * If the user is already authenticated they are redirected to `/` so they
 * don't see login/register pages unnecessarily.
 *
 * While the session is being restored a minimal loading spinner is shown.
 */
export function GuestRoute() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return <AuthLoadingScreen />;

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
