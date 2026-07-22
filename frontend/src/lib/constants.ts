/** Application-wide constants */
export const APP_NAME = "NoteFlow AI";
export const APP_DESCRIPTION =
  "AI-powered video notes and study material generator by NoteFlow AI";

/** API endpoints (relative to base URL /api/v1) */
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
  transcription: {
    root: "/transcription",
    transcribe: "/transcription/transcribe",
    byId: (id: string) => `/transcription/transcripts/${id}`,
    status: "/transcription/transcription-status",
  },
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    me: "/auth/me",
  },
} as const;
