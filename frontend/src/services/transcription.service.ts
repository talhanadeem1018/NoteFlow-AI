import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import type { TranscriptionResponse, TranscriptionRequest, TranscriptionStatus, TranscriptListResponse } from "@/types";

const GC_TIME = 1000 * 60 * 30; // 30 min – transcripts are static once created

/** Start transcription for a YouTube video */
export function useStartTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TranscriptionRequest) => {
      const { data } = await api.post<TranscriptionResponse>(
        API_ENDPOINTS.transcription.transcribe,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcriptions"] });
    },
  });
}

/** Get a specific transcript by ID */
export function useTranscript(transcriptId: string) {
  return useQuery({
    queryKey: ["transcriptions", "detail", transcriptId],
    queryFn: async () => {
      const { data } = await api.get<TranscriptionResponse>(
        API_ENDPOINTS.transcription.byId(transcriptId),
      );
      return data;
    },
    enabled: !!transcriptId,
    staleTime: GC_TIME, // Transcript content never changes after creation
    gcTime: GC_TIME,
    refetchOnMount: false,
  });
}

/** List all transcripts for the current user */
export function useTranscripts(skip = 0, limit = 20) {
  return useQuery({
    queryKey: ["transcriptions", "list", skip, limit],
    queryFn: async () => {
      const { data } = await api.get<TranscriptListResponse>(
        `${API_ENDPOINTS.transcription.root}?skip=${skip}&limit=${limit}`,
      );
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 min
    gcTime: GC_TIME,
    refetchOnMount: false,
  });
}

/** Check transcription status for a video URL */
export function useTranscriptionStatus(url: string) {
  return useQuery({
    queryKey: ["transcription-status", url],
    queryFn: async () => {
      const { data } = await api.get<TranscriptionStatus>(
        `${API_ENDPOINTS.transcription.status}?url=${encodeURIComponent(url)}`,
      );
      return data;
    },
    enabled: !!url,
    staleTime: 1000 * 60 * 5, // 5 min – status can change
    gcTime: GC_TIME,
    refetchOnMount: false,
  });
}
