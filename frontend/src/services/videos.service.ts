import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import type { VideoMetadataResponse } from "@/types";

/** Request payload for fetching video metadata */
interface FetchMetadataRequest {
  url: string;
}

/** Fetch YouTube video metadata by URL */
export function useVideoMetadata() {
  return useMutation({
    mutationFn: async (payload: FetchMetadataRequest) => {
      const { data } = await api.post<VideoMetadataResponse>(
        API_ENDPOINTS.videos.metadata,
        payload,
      );
      return data.data;
    },
  });
}
