import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";

/**
 * Wraps routes that require an authenticated user.
 *
 * Behaviour:
 *   - While the session is being restored (`loading === true`) a full-screen
 *     spinner is shown so the page never flickers to "unauthenticated".
 *   - Once loading finishes, unauthenticated users are redirected to `/login`.
 *   - Authenticated users see the child route via `<Outlet />`.
 */
export function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return <AuthLoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
