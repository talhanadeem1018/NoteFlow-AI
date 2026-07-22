import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotes } from "@/services/notes.service";
import { Sidebar } from "@/components/layout/Sidebar";
import { GenerateWorkflow } from "@/components/dashboard/GenerateWorkflow";
import { AINoteCard } from "@/components/notes/AINoteCard";
import { useAppStore } from "@/stores/app.store";
import type { AINote } from "@/types";

const RECENT_NOTE_KEY = "dashboard:recentNote";

function NoteCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mb-1 h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-3 flex gap-2">
        <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

function QuickStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-1 h-8 w-12 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-1 h-8 w-12 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { data: notesData, isLoading } = useNotes(1, 5);

  // Persist the most recently generated note across page refreshes
  const [recentNote, setRecentNote] = useState<AINote | null>(() => {
    try {
      const saved = sessionStorage.getItem(RECENT_NOTE_KEY);
      return saved ? (JSON.parse(saved) as AINote) : null;
    } catch {
      return null;
    }
  });

  const handleNoteGenerated = useCallback((note: AINote) => {
    setRecentNote(note);
    try {
      sessionStorage.setItem(RECENT_NOTE_KEY, JSON.stringify(note));
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, []);

  // Use existing data if available, otherwise show skeleton
  // `isLoading` is true only when there's no cached data at all
  const hasCachedData = notesData !== undefined;
  const recentNotes = notesData?.data?.slice(0, 3) || [];

  return (
    <div className="flex min-h-[calc(100dvh-4rem)]">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-20 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-md transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
        aria-label="Toggle sidebar"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:ml-64">
        <div className="mx-auto max-w-4xl">
          {/* Welcome Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
                </h1>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  Generate AI-powered notes from YouTube videos
                </p>
              </div>
              <button
                onClick={() => logout()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Generate Workflow */}
          <div className="mb-8">
            <GenerateWorkflow onNoteGenerated={setRecentNote} />
          </div>

          {/* Recently Generated Note */}
          {recentNote && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Just Generated
              </h2>
              <AINoteCard note={recentNote} showFullContent />
            </div>
          )}

          {/* Recent Notes */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Notes
              </h2>
              {recentNotes.length > 0 && (
                <a
                  href="/dashboard/notes"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  View all →
                </a>
              )}
            </div>

            {!hasCachedData && isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <NoteCardSkeleton />
                <NoteCardSkeleton />
                <NoteCardSkeleton />
              </div>
            ) : recentNotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-3 text-4xl">✨</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No notes yet. Paste a YouTube URL above to get started!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                    onClick={() => setRecentNote(note)}
                  >
                    <h3 className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
                      {note.title}
                    </h3>
                    <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                      {note.executive_summary || "No summary available"}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                      <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      {note.model_used && (
                        <>
                          <span>•</span>
                          <span>{note.model_used}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {!hasCachedData && isLoading ? (
            <QuickStatsSkeleton />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="text-2xl font-bold text-primary-600">{notesData?.total || 0}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Notes</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="text-2xl font-bold text-green-600">{recentNotes.length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Recently Viewed</div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
