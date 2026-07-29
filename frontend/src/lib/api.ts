import { supabase } from "@/lib/supabase";
import axios from "axios";

/**
 * Pre-configured Axios instance for API communication.
 * Base URL is read from VITE_API_URL env var, defaulting to /api/v1
 * which is proxied to the backend in development.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
  timeout: 300_000, // 5 minutes – transcription/AI can take a while
  headers: {
    "Content-Type": "application/json",
  },
});

// Cache the last known session token to avoid redundant supabase.auth.getSession() calls
let _cachedToken: string | null = null;

// Subscribe to Supabase auth state to keep cached token in sync
// without relying on AuthContext (which may not be mounted yet)
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedToken = session?.access_token ?? null;
});

async function getAccessToken(): Promise<string | null> {
  // Return cached token immediately if available
  if (_cachedToken) return _cachedToken;

  // Fetch fresh session – supabase-js reads from its internal cache / localStorage
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? null;
    _cachedToken = token;
    return token;
  } catch {
    return null;
  }
}

// Request interceptor – attach auth token when available
api.interceptors.request.use(async (config) => {
  try {
    const token = await getAccessToken();

    if (token) {
      // Bracket notation works with both plain objects AND AxiosHeaders instances
      config.headers["Authorization"] = `Bearer ${token}`;
    } else if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        "[api.ts] No access token available – protected requests will receive 401",
      );
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[api.ts] Failed to attach auth token:", err);
    }
  }

  return config;
});

// Response interceptor – invalidate cached token on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      _cachedToken = null; // Force re-fetch on next request
    }
    return Promise.reject(error);
  },
);

// Allow external code to invalidate the cached token (e.g., after logout)
export function invalidateCachedToken() {
  _cachedToken = null;
}
