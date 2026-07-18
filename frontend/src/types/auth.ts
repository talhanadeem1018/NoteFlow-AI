/**
 * Authentication-related types for Supabase Auth integration.
 *
 * These types model the shapes returned by Supabase's auth SDK
 * and are kept separate from the API / domain types in index.ts.
 */

import type { Session, User } from "@supabase/supabase-js";

export type { Session, User };

/**
 * Shape exposed by the AuthContext.
 *
 * `user` and `session` mirror the Supabase types directly so
 * consumers never need to import from @supabase/supabase-js.
 */
export interface AuthState {
  /** The currently authenticated Supabase user, or `null`. */
  user: User | null;

  /** The active Supabase session, or `null`. */
  session: Session | null;

  /**
   * `true` while the initial session check is in progress.
   * After the check completes this becomes `false`.
   */
  loading: boolean;

  /** Convenience boolean – `true` when `user` is non-null. */
  isAuthenticated: boolean;
}
