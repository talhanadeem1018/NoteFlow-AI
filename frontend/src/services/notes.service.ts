import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import type { Note, GenerateNoteRequest, PaginatedResponse } from "@/types";

/** Fetch all notes with pagination */
export function useNotes(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["notes", page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Note>>(
        `${API_ENDPOINTS.notes.root}?page=${page}&page_size=${pageSize}`,
      );
      return data;
    },
  });
}

/** Fetch a single note by ID */
export function useNote(id: string) {
  return useQuery({
    queryKey: ["notes", id],
    queryFn: async () => {
      const { data } = await api.get<Note>(API_ENDPOINTS.notes.byId(id));
      return data;
    },
    enabled: !!id,
  });
}

/** Generate a new note from a YouTube video */
export function useGenerateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GenerateNoteRequest) => {
      const { data } = await api.post<Note>(
        API_ENDPOINTS.notes.generate,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}
