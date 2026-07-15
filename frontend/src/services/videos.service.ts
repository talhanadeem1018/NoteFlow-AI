import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import type { AudioResponse, VideoMetadataResponse } from "@/types";

/** Request payload for fetching video metadata or audio */
interface VideoUrlRequest {
  url: string;
}

/** Fetch YouTube video metadata by URL */
export function useVideoMetadata() {
  return useMutation({
    mutationFn: async (payload: VideoUrlRequest) => {
      const { data } = await api.post<VideoMetadataResponse>(
        API_ENDPOINTS.videos.metadata,
        payload,
      );
      return data.data;
    },
  });
}

/** Download and convert audio from a YouTube video */
export function useDownloadAudio() {
  return useMutation({
    mutationFn: async (payload: VideoUrlRequest) => {
      const { data } = await api.post<AudioResponse>(
        API_ENDPOINTS.videos.audio,
        payload,
      );
      return data.data;
    },
  });
}
