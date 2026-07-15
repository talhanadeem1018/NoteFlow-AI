import axios from "axios";

/**
 * Pre-configured Axios instance for API communication.
 * Base URL is read from VITE_API_URL env var, defaulting to /api
 * which is proxied to the backend in development.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor – attach auth token when available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      // Redirect to login when auth is implemented
    }
    return Promise.reject(error);
  },
);
