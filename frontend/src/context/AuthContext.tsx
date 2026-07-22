/**
 * Authentication context – manages Supabase auth state for the entire app.
 *
 * Behaviour on mount:
 *   1. Checks for an existing session (page refresh / return visit).
 *   2. Subscribes to Supabase `onAuthStateChange` so state updates
 *      automatically when the user logs in or out from another tab.
 *   3. Unsubscribes on unmount.
 *
 * Uses `INITIAL_SESSION` event (supabase-js v2+) to set initial loading state,
 * avoiding a redundant manual `getSession()` call. The subscription also
 * handles `SIGNED_OUT` and `TOKEN_REFRESHED` events for robust session mgmt.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { invalidateCachedToken } from "@/lib/api";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
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

  // Stable ref to track mount status across StrictMode double-effects
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // ── 1. Subscribe to auth state changes ───────────────────────
    // The `INITIAL_SESSION` event fires synchronously with the current
    // session on first subscribe, replacing the need for a manual getSession().
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mountedRef.current) return;

      if (event === "SIGNED_OUT") {
        // User explicitly signed out – clear state immediately
        setSession(null);
        setUser(null);
        setLoading(false);
        invalidateCachedToken();
        return;
      }

      // Handle SESSION_INITIAL, SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // Only set loading=false on the initial event
      if (event === "INITIAL_SESSION") {
        setLoading(false);
      }
    });

    // ── 2. Cleanup ───────────────────────────────────────────────
    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    // Auth state will be updated by onAuthStateChange listener
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: user !== null,
      logout,
    }),
    [user, session, loading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
