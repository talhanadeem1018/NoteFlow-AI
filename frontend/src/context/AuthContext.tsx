/**
 * Authentication context – manages Supabase auth state for the entire app.
 *
 * Behaviour on mount:
 *   1. Checks for an existing session (page refresh / return visit).
 *   2. Subscribes to Supabase `onAuthStateChange` so state updates
 *      automatically when the user logs in or out from another tab.
 *   3. Unsubscribes on unmount.
 *
 * This context intentionally does NOT expose login / signup / logout helpers.
 * Those belong to a later step.
 */

import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

// oxlint-ignore next-line only-export-components – context + provider are tightly coupled
export const AuthContext = createContext<AuthState | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Track whether the component is still mounted. Using a ref (not a
  // closure variable) so it survives StrictMode unmount/remount cycles.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // ── 1. Restore existing session ──────────────────────────────
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mountedRef.current) return;
      setSession(s);
      setUser(s?.user ?? null);
    }).finally(() => {
      if (mountedRef.current) setLoading(false);
    });

    // ── 2. Subscribe to auth state changes ───────────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mountedRef.current) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    // ── 3. Cleanup ───────────────────────────────────────────────
    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: user !== null,
    }),
    [user, session, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
