import { useState } from "react";
import { useNotes, useDeleteNote } from "@/services/notes.service";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { AINoteCard } from "@/components/notes/AINoteCard";
import type { AINote } from "@/types";

export function NotesPage() {
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [selectedNote, setSelectedNote] = useState<AINote | null>(null);
  const deleteNote = useDeleteNote();

  const { data, isLoading, error } = useNotes(page, 10);

  const handleDelete = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }
    try {
      await deleteNote.mutateAsync(noteId);
      addToast("Note deleted successfully", "success");
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch {
      addToast("Failed to delete note", "error");
    }
  };

  // Show skeletons on first load while fetching
  const showSkeletons = isLoading && notes.length === 0;
  const notes = data?.data || [];

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
        <div className="flex items-start gap-3">
          <span className="text-red-500">⚠️</span>
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">Error loading notes</p>
            <p className="text-sm text-red-600 dark:text-red-400">
              {(error as Error).message || "Failed to load notes"}
            </p>
          </div>
        </div>
      </div>
    );
  }
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Notes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} {total === 1 ? "note" : "notes"} total
          </p>
        </div>
      </div>

      {/* Empty State - only when not loading */}
      {!showSkeletons && notes.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 text-6xl">📝</div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            No notes yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate your first AI-powered note from a YouTube video
          </p>
        </div>
      )}

      {/* Notes Grid or Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {showSkeletons
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-4 h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mb-1 h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mb-1 h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-4 flex gap-2">
                  <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))
          : notes.map((note) => (
          <div key={note.id} className="group relative">
            <AINoteCard
              note={note}
              onClick={() => setSelectedNote(note)}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(note.id);
              }}
              className="absolute right-4 top-4 rounded-lg bg-red-50 p-2 text-red-600 opacity-0 transition-opacity hover:bg-red-100 group-hover:opacity-100 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800"
              title="Delete note"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {total > 10 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="px-4 text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {Math.ceil(total / 10)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 10)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Note Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white dark:bg-gray-900">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedNote.title}
              </h2>
              <button
                onClick={() => setSelectedNote(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <AINoteCard note={selectedNote} showFullContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
