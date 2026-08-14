import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
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

/** Statuses where the backend will no longer make progress on its own. */
const STABLE_STATUSES: ProcessingStatus[] = [
  "completed",
  "failed",
  "paused",
  "cancelled",
  "interrupted",
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
 * Poll for the status of a processing job.
 *
 * - Polling is gated on authentication so we never fire protected requests
 *   (and pile up 401s) while the Supabase session is loading or missing.
 * - Polling stops for every stable/terminal status (completed, failed,
 *   paused, cancelled, interrupted) – a paused job only resumes polling
 *   after the user explicitly clicks Resume (which invalidates the query).
 * - A 404 response means the job no longer exists: the persisted job ID is
 *   cleared from the Zustand store (which also clears localStorage), polling
 *   stops immediately, and the UI resets instead of staying stuck on Queued.
 */
export function useJobStatus(jobId: string | null) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeJobRef = useRef<string | null>(null);
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

    if (status === "pending" || status === "processing") {
      if (activeJobRef.current === jobId && intervalRef.current) {
        return;
      }

      stopPolling();

      activeJobRef.current = jobId;
      intervalRef.current = window.setInterval(() => {
        if (!jobId) return;
        void queryClient
          .fetchQuery({
            queryKey: ["processing", "status", jobId],
            queryFn: () => fetchStatus(jobId),
            retry: false,
          })
          .catch(() => {
            // fetchStatus already handles 404s (clears the persisted job and
            // stops this interval). Any other error is transient and the next
            // tick retries.
          });
      }, 5000);
    }

    return stopPolling;
  }, [jobId, isAuthenticated, query.data?.status, queryClient, fetchStatus]);

  return query;
}
