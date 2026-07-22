// ─── API Response Types ───────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
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

/** Metadata extracted from a YouTube video via yt-dlp */
export interface VideoMetadata {
  video_id: string;
  title: string;
  channel: string;
  duration: number | null;
  thumbnail_url: string | null;
  description: string | null;
  upload_date: string | null;
  view_count: number | null;
  tags: string[];
}

export interface VideoMetadataResponse {
  data: VideoMetadata;
  message: string;
}

/** Information about a downloaded audio file */
export interface AudioInfo {
  video_id: string;
  audio_path: string;
  duration: number | null;
  file_size: number;
  audio_format: string;
}

export interface AudioResponse {
  data: AudioInfo;
  message: string;
}

// ─── Transcription Types ───────────────────────────────────────────────

export interface TranscriptionRequest {
  url: string;
  language?: string;
  beam_size?: number;
  vad_filter?: boolean;
  force_reprocess?: boolean;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
  no_speech_prob?: number;
  compression_ratio?: number;
}

export interface TranscriptionResponse {
  id: string;
  video_id: string;
  video_url: string;
  full_text: string;
  detected_language: string;
  language_probability: number;
  duration: number;
  segments: TranscriptSegment[];
  segment_count: number;
  processing_time: number;
  model_used: string;
  created_at: string;
}

export interface TranscriptionStatus {
  exists: boolean;
  transcript_id?: string;
  created_at?: string;
  language?: string;
  duration?: number;
}

export interface TranscriptListResponse {
  data: TranscriptionResponse[];
  total: number;
  skip: number;
  limit: number;
}

// ─── AI Notes Types ────────────────────────────────────────────────────

export interface AINote {
  id: string;
  transcript_id?: string;
  user_id: string;
  title: string;
  executive_summary: string;
  key_concepts: string[];
  detailed_notes: string;
  bullet_points: string[];
  keywords: string[];
  action_items: string[];
  conclusion: string;
  model_used?: string;
  prompt_version?: string;
  processing_time: number;
  created_at: string;
}

export interface GenerateAINoteRequest {
  transcript_id: string;
  force_regenerate?: boolean;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  custom_instructions?: string;
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
