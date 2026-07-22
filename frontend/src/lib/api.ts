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
let _tokenPromise: Promise<string | null> | null = null;

// Subscribe to Supabase auth state to keep cached token in sync
// without relying on AuthContext (which may not be mounted yet)
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedToken = session?.access_token ?? null;
  if (!session) {
    _tokenPromise = null;
  }
});

async function getAccessToken(): Promise<string | null> {
  // Return cached token immediately if available
  if (_cachedToken) return _cachedToken;

  // Deduplicate concurrent calls
  if (!_tokenPromise) {
    _tokenPromise = supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token ?? null;
      _cachedToken = token;
      _tokenPromise = null;
      return token;
    });
  }

  return _tokenPromise;
}

// Request interceptor – attach auth token when available
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor – invalidate cached token on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      _cachedToken = null; // Force re-fetch on next request
      // AuthContext will handle session restoration / redirect
    }
    return Promise.reject(error);
  },
);

// Allow external code to invalidate the cached token (e.g., after logout)
export function invalidateCachedToken() {
  _cachedToken = null;
  _tokenPromise = null;
}
