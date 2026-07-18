/**
 * useAuth – typed convenience hook for consuming the AuthContext.
 *
 * Usage:
 *   const { user, session, loading, isAuthenticated } = useAuth();
 */

import { useContext } from "react";
import { AuthContext, type AuthState } from "@/context/AuthContext";

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return ctx;
}
