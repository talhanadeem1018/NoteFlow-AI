/** Application-wide constants */
export const APP_NAME = "YT Notes";
export const APP_DESCRIPTION =
  "AI-powered YouTube video notes and study material generator";

/** API endpoints (relative to base URL) */
export const API_ENDPOINTS = {
  health: "/health",
  notes: {
    root: "/notes",
    byId: (id: string) => `/notes/${id}`,
    generate: "/notes/generate",
  },
  videos: {
    root: "/videos",
    byId: (id: string) => `/videos/${id}`,
    metadata: "/videos/metadata",
    audio: "/videos/audio",
    process: "/videos/process",
  },
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    me: "/auth/me",
  },
} as const;
