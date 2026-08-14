import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ActiveJob {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed" | "paused" | "cancelled" | "interrupted";
  progressMessage: string | null;
  videoTitle?: string;
}

/** Video metadata persisted so the Dashboard can restore the processing card after refresh */
export interface PendingJobMetadata {
  url: string;
  title: string;
  channel: string;
  thumbnail_url: string | null;
  duration: number | null;
  upload_date: string | null;
  view_count: number | null;
  video_id: string | null;
}

interface AppState {
  /** Global loading overlay */
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  /** Theme preference */
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;

  /** Active processing job — persisted so it survives refresh / navigation */
  activeJob: ActiveJob | null;
  setActiveJob: (job: ActiveJob | null) => void;

  /** Video metadata for the active job — persisted to restore the processing card */
  pendingJobMetadata: PendingJobMetadata | null;
  setPendingJobMetadata: (meta: PendingJobMetadata | null) => void;

  /** Completed note ID — set when a processing job finishes, used for redirect */
  completedNoteId: string | null;
  setCompletedNoteId: (noteId: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isLoading: false,
      setLoading: (isLoading) => set({ isLoading }),

      theme: "system",
      setTheme: (theme) => set({ theme }),

      activeJob: null,
      setActiveJob: (activeJob) => set({ activeJob }),

      pendingJobMetadata: null,
      setPendingJobMetadata: (pendingJobMetadata) => set({ pendingJobMetadata }),

      completedNoteId: null,
      setCompletedNoteId: (completedNoteId) => set({ completedNoteId }),
    }),
    {
      name: "noteflow-active-job",
      // Only persist these fields — skip UI-only state like theme, sidebar, loading
      partialize: (state) => ({
        activeJob: state.activeJob,
        pendingJobMetadata: state.pendingJobMetadata,
      }),
    },
  ),
);
