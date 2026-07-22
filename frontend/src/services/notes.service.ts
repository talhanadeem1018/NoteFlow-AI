import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import type { AINote, GenerateAINoteRequest, PaginatedResponse } from "@/types";

const NOTES_LIST_STALE_TIME = 1000 * 60 * 2;   // 2 min – list can become stale
const NOTES_LIST_GC_TIME = 1000 * 60 * 30;      // 30 min – keep list cached
const NOTES_DETAIL_STALE_TIME = 1000 * 60 * 30; // 30 min – individual note is static

/** Fetch all notes with pagination */
export function useNotes(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["notes", "list", page, pageSize],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const { data } = await api.get<PaginatedResponse<AINote>>(
        `${API_ENDPOINTS.notes.root}?offset=${offset}&limit=${pageSize}`,
      );
      return data;
    },
    placeholderData: keepPreviousData, // Show previous page data while loading next
    staleTime: NOTES_LIST_STALE_TIME,
    gcTime: NOTES_LIST_GC_TIME,
    refetchOnMount: false, // Rely on invalidation + staleTime
  });
}

/** Fetch a single note by ID */
export function useNote(id: string) {
  return useQuery({
    queryKey: ["notes", "detail", id],
    queryFn: async () => {
      const { data } = await api.get<AINote>(API_ENDPOINTS.notes.byId(id));
      return data;
    },
    enabled: !!id,
    staleTime: NOTES_DETAIL_STALE_TIME,
    gcTime: NOTES_LIST_GC_TIME,
    refetchOnMount: false,
  });
}

/** Generate a new AI note from a transcript */
export function useGenerateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GenerateAINoteRequest) => {
      const { data } = await api.post<AINote>(
        API_ENDPOINTS.notes.generate,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate all notes caches so list views refresh
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

/** Delete a note by ID */
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      await api.delete(API_ENDPOINTS.notes.byId(noteId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}
