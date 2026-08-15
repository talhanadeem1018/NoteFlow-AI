import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/stores/app.store";
import type {
  ProcessingJobResponse,
  ProcessingStatus,
  ProcessingStatusResponse,
  StartProcessingRequest,
} from "@/types";

/** Start a background processing job for a YouTube video */
export function useStartProcessing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StartProcessingRequest) => {
      const { data } = await api.post<ProcessingJobResponse>(
        API_ENDPOINTS.processing.start,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processing"] });
    },
  });
}

/** Pause a running processing job (resumable) */
export function usePauseJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.post<ProcessingStatusResponse>(
        API_ENDPOINTS.processing.pause(jobId),
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["processing", "status", data.job_id], data);
    },
  });
}

/** Resume a paused/interrupted/failed processing job from its checkpoint */
export function useResumeJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.post<ProcessingStatusResponse>(
        API_ENDPOINTS.processing.resume(jobId),
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["processing", "status", data.job_id], data);
    },
  });
}

/** Cancel a processing job and discard its progress */
export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.post<ProcessingStatusResponse>(
        API_ENDPOINTS.processing.cancel(jobId),
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["processing", "status", data.job_id], data);
    },
  });
}

/**
 * Statuses where the backend will no longer make progress on its own.
 *
 * Note: 'interrupted' is intentionally NOT listed here. The backend can
 * report 'interrupted' (startup orphan recovery) while the original worker
 * is still alive and decoding in another process, so the frontend keeps
 * polling and only treats the job as interrupted once that state is
 * CONFIRMED (see createInterruptedTracker) – otherwise the UI gets stuck on
 * a "Processing interrupted" banner while the job actually completes in the
 * background.
 */
const STABLE_STATUSES: ProcessingStatus[] = [
  "completed",
  "failed",
  "paused",
  "cancelled",
];

/**
 * True when an API error is a 404 Not Found.
 *
 * Used to detect processing jobs that no longer exist server-side (deleted,
 * expired, or wiped during a DB reset). A 404 is NOT transient – it means the
 * job ID is stale and must be dropped instead of polled forever.
 */
export function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { response?: { status?: number } }).response?.status === 404
  );
}

/**
 * How long an 'interrupted' status must persist (with no progress
 * advancement between polls) before the frontend treats the job as
 * genuinely stopped. Longer than the 5s poll interval so at least a few
 * unchanged observations are required, while a live worker (Whisper updates
 * progress every ~10s) never reaches it.
 */
export const INTERRUPTED_CONFIRM_MS = 30_000;

export interface InterruptedTracker {
  /**
   * Feed a status observation. Returns true only once the backend has
   * reported 'interrupted' consistently with no sign of life (progress
   * advancing) for the confirmation window. Any progress change resets the
   * clock, because the worker is clearly still alive.
   */
  observe(status: ProcessingStatusResponse | undefined | null): boolean;
  /** Clear tracking state – call when the tracked job changes. */
  reset(): void;
}

/**
 * Confirmation logic for a backend 'interrupted' status.
 *
 * The backend marks jobs 'interrupted' on startup recovery
 * (recover_orphaned_jobs) – but that can fire while the original worker is
 * still alive and advancing in another process (e.g. a second worker/restart
 * marked the row while Whisper keeps decoding). So a single 'interrupted'
 * reading is NOT trusted: the status must stay 'interrupted' with no
 * progress advancement for INTERRUPTED_CONFIRM_MS. The clock is seeded from
 * the backend's own interrupted_at timestamp when available, so an old,
 * genuinely dead job confirms quickly.
 */
export function createInterruptedTracker(
  confirmMs: number = INTERRUPTED_CONFIRM_MS,
): InterruptedTracker {
  let seenAt: number | null = null;
  let lastSignature: string | null = null;

  return {
    observe(status) {
      if (!status || status.status !== "interrupted") {
        seenAt = null;
        lastSignature = null;
        return false;
      }

      // Anything that advances (progress %, stage, or message) means the
      // worker is alive – restart the confirmation clock.
      const signature = `${status.progress}|${status.current_stage ?? ""}|${status.progress_message ?? ""}`;
      const now = Date.now();
      if (signature !== lastSignature) {
        lastSignature = signature;
        seenAt = now;
        return false;
      }

      if (seenAt === null) {
        // First unchanged observation – seed from the backend's own
        // interrupted_at timestamp when available, so a genuinely dead job
        // that was interrupted long ago confirms right away while a fresh
        // interruption still needs the full window.
        seenAt = status.interrupted_at
          ? new Date(status.interrupted_at).getTime()
          : now;
      }

      return now - seenAt >= confirmMs;
    },
    reset() {
      seenAt = null;
      lastSignature = null;
    },
  };
}

/**
 * Poll for the status of a processing job.
 *
 * - Polling is gated on authentication so we never fire protected requests
 *   (and pile up 401s) while the Supabase session is loading or missing.
 * - Polling stops for every stable/terminal status (completed, failed,
 *   paused, cancelled) – a paused job only resumes polling after the user
 *   explicitly clicks Resume (which invalidates the query). 'interrupted'
 *   intentionally keeps polling: the backend can report it (startup orphan
 *   recovery) while the worker is still alive in another process, so the
 *   status is only trusted once confirmed (see `interruptedConfirmed`).
 * - A failed poll never changes the job state: query.data keeps its last
 *   successful value and the next tick retries. A 404 response means the
 *   job no longer exists: the persisted job ID is cleared from the Zustand
 *   store (which also clears localStorage), polling stops immediately, and
 *   the UI resets instead of staying stuck on Queued.
 */
export function useJobStatus(jobId: string | null) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeJobRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const interruptedTrackerRef = useRef(createInterruptedTracker());
  const [interruptedConfirmed, setInterruptedConfirmed] = useState(false);
  const { isAuthenticated } = useAuth();
  const setActiveJob = useAppStore((s) => s.setActiveJob);
  const setPendingJobMetadata = useAppStore((s) => s.setPendingJobMetadata);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    activeJobRef.current = null;
  };

  /** The job no longer exists server-side – drop it from the persisted store
   *  (which also clears localStorage via zustand persist) and stop polling. */
  const clearStaleJob = useCallback(() => {
    stopPolling();
    setActiveJob(null);
    setPendingJobMetadata(null);
  }, [setActiveJob, setPendingJobMetadata]);

  const fetchStatus = useCallback(
    async (id: string) => {
      try {
        const { data } = await api.get<ProcessingStatusResponse>(
          API_ENDPOINTS.processing.byId(id),
        );
        return data;
      } catch (error) {
        if (isNotFoundError(error)) {
          clearStaleJob();
        }
        throw error;
      }
    },
    [clearStaleJob],
  );

  const query = useQuery({
    queryKey: ["processing", "status", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      return fetchStatus(jobId);
    },
    enabled: !!jobId && isAuthenticated,
    refetchInterval: false,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: false,
  });

  // Confirm a backend 'interrupted' status before it is surfaced to the UI.
  // The backend marks jobs 'interrupted' on startup recovery, but the worker
  // may still be alive and advancing in another process – only confirm once
  // the status stays 'interrupted' with no progress advancement for the
  // confirmation window. While unconfirmed, callers treat the job as still
  // processing. (query.data keeps its last value when a poll fails, so a
  // temporary network error can neither confirm nor un-confirm anything.)
  useEffect(() => {
    const data = query.data;
    if (!data) {
      interruptedTrackerRef.current.reset();
      setInterruptedConfirmed(false);
      return;
    }
    setInterruptedConfirmed(interruptedTrackerRef.current.observe(data));
  }, [query.data]);

  useEffect(() => {
    if (!jobId || !isAuthenticated) {
      stopPolling();
      return;
    }

    const status = query.data?.status;
    if (status && STABLE_STATUSES.includes(status)) {
      stopPolling();
      return;
    }

    // Keep polling through 'interrupted' as well – the backend can report it
    // (startup orphan recovery) while the worker is still alive in another
    // process, and only continued polling reveals the real status (e.g. the
    // job completing, or flipping back to processing after a resume).
    if (status === "pending" || status === "processing" || status === "interrupted") {
      if (activeJobRef.current === jobId && intervalRef.current) {
        return;
      }

      stopPolling();

      activeJobRef.current = jobId;
      intervalRef.current = window.setInterval(() => {
        if (!jobId) return;
        // Skip a tick while the previous poll is still pending (slow backend
        // response) so we never stack overlapping duplicate requests.
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        void queryClient
          .fetchQuery({
            queryKey: ["processing", "status", jobId],
            queryFn: () => fetchStatus(jobId),
            retry: false,
          })
          .catch(() => {
            // fetchStatus already handles 404s (clears the persisted job and
            // stops this interval). Any other error is transient – query.data
            // keeps its last value, so the job state is never changed by a
            // failed poll, and the next tick retries.
          })
          .finally(() => {
            inFlightRef.current = false;
          });
      }, 5000);
    }

    return stopPolling;
  }, [jobId, isAuthenticated, query.data?.status, queryClient, fetchStatus]);

  return { ...query, interruptedConfirmed };
}
