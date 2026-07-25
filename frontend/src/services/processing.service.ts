import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ProcessingJobResponse,
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

/** Poll for the status of a processing job */
export function useJobStatus(jobId: string | null) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeJobRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ["processing", "status", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data } = await api.get<ProcessingStatusResponse>(
        API_ENDPOINTS.processing.byId(jobId),
      );
      return data;
    },
    enabled: !!jobId,
    refetchInterval: false,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: false,
  });

  useEffect(() => {
    if (!jobId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      activeJobRef.current = null;
      return;
    }

    const status = query.data?.status;
    if (status === "completed" || status === "failed") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      activeJobRef.current = null;
      return;
    }

    if (status === "pending" || status === "processing") {
      if (activeJobRef.current === jobId && intervalRef.current) {
        return;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      activeJobRef.current = jobId;
      intervalRef.current = window.setInterval(() => {
        if (!jobId) return;

        void queryClient.fetchQuery({
          queryKey: ["processing", "status", jobId],
          queryFn: async () => {
            const { data } = await api.get<ProcessingStatusResponse>(
              API_ENDPOINTS.processing.byId(jobId),
            );
            return data;
          },
          retry: false,
        });
      }, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      activeJobRef.current = null;
    };
  }, [jobId, query.data?.status, queryClient]);

  return query;
}
