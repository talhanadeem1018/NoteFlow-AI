// ─── API Response Types ───────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

// ─── User Types ───────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
}

// ─── Video Types ──────────────────────────────────────────────────────

export interface Video {
  id: string;
  youtubeUrl: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
  channelName?: string;
  publishedAt?: string;
  transcript?: string;
  createdAt: string;
}

// ─── Note Types ───────────────────────────────────────────────────────

export type NoteType = "summary" | "notes" | "quiz" | "flashcards";

export interface Note {
  id: string;
  videoId: string;
  type: NoteType;
  title: string;
  content: string;
  aiProvider?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateNoteRequest {
  videoUrl: string;
  type: NoteType;
  customPrompt?: string;
}

// ─── Utility Types ────────────────────────────────────────────────────

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
