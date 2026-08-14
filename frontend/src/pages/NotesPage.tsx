import { useState, useCallback, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotes, useDeleteNote, useBulkDeleteNotes } from "@/services/notes.service";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { NoteCard } from "@/components/notes/NoteCard";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SearchFilterBar, type SortOption, type TimeRange } from "@/components/ui/SearchFilterBar";
import type { AINote } from "@/types";

export function NotesPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AINote | null>(null);
  const deleteNote = useDeleteNote();

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(false);
  const bulkDelete = useBulkDeleteNotes();

  // Search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all-time");

  const { data, isLoading, error, refetch } = useNotes(page, 50);

  // Close modals and clear selection on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeleteTarget(null);
        setBulkDeleteTarget(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const notes = data?.data || [];
  const total = data?.total || 0;
  const showSkeletons = isLoading && notes.length === 0;

  // Extract unique providers from notes
  const availableProviders = useMemo(() => {
    const providers = new Set(notes.filter((n) => n.model_used).map((n) => n.model_used!));
    return Array.from(providers).sort();
  }, [notes]);

  // ── Client-side filtering ────────────────────────────────────

  /** Search by title, keywords, notes content, executive summary */
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter((note) => {
      if (note.title.toLowerCase().includes(q)) return true;
      if (note.executive_summary && note.executive_summary.toLowerCase().includes(q)) return true;
      if (note.detailed_notes && note.detailed_notes.toLowerCase().includes(q)) return true;
      if (note.keywords && note.keywords.some((kw) => kw.toLowerCase().includes(q))) return true;
      if (note.key_concepts && note.key_concepts.some((kc) => kc.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [notes, searchQuery]);

  /** Filter by time range */
  const filteredByTime = useMemo(() => {
    if (timeRange === "all-time") return filteredBySearch;
    const now = new Date();
    const start = new Date();
    if (timeRange === "this-week") {
      start.setDate(now.getDate() - 7);
    } else if (timeRange === "this-month") {
      start.setMonth(now.getMonth() - 1);
    }
    return filteredBySearch.filter((note) => new Date(note.created_at) >= start);
  }, [filteredBySearch, timeRange]);

  /** Filter by provider */
  const filteredByProvider = useMemo(() => {
    if (providerFilter === "all") return filteredByTime;
    return filteredByTime.filter((note) => note.model_used === providerFilter);
  }, [filteredByTime, providerFilter]);

  // ── Client-side sorting ────────────────────────────────────────

  const sortedNotes = useMemo(() => {
    const items = [...filteredByProvider];
    switch (sortOption) {
      case "newest":
        return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "oldest":
        return items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "longest-duration":
        return items.sort((a, b) => (b.processing_time || 0) - (a.processing_time || 0));
      case "shortest-duration":
        return items.sort((a, b) => (a.processing_time || 0) - (b.processing_time || 0));
      default:
        return items;
    }
  }, [filteredByProvider, sortOption]);

  // Client-side pagination
  const pageSize = 10;
  const totalFiltered = sortedNotes.length;
  const totalFilteredPages = Math.ceil(totalFiltered / pageSize);
  const paginatedNotes = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedNotes.slice(start, start + pageSize);
  }, [sortedNotes, page]);

  // All currently visible note IDs (for select-all)
  const paginatedIds = useMemo(() => paginatedNotes.map((n) => n.id), [paginatedNotes]);

  // Selection helpers
  const allVisibleSelected = paginatedIds.length > 0 && paginatedIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [allVisibleSelected, paginatedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Reset page and clear selection when filters change
  useEffect(() => {
    setPage(1);
    clearSelection();
  }, [searchQuery, sortOption, providerFilter, timeRange]);

  const handleDeleteRequest = useCallback((note: AINote) => {
    setDeleteTarget(note);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteNote.mutateAsync(deleteTarget.id);
      addToast("Note deleted successfully", "success");
      setSelectedIds((prev) => {
        if (!prev.has(deleteTarget.id)) return prev;
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
    } catch {
      addToast("Failed to delete note", "error");
    }
  }, [deleteTarget, deleteNote, addToast]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const results = await bulkDelete.mutateAsync(ids);
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    if (succeeded > 0) {
      addToast(
        failed > 0
          ? `Deleted ${succeeded} note${succeeded > 1 ? "s" : ""} (${failed} failed)`
          : `Deleted ${succeeded} note${succeeded > 1 ? "s" : ""} successfully`,
        failed > 0 ? "warning" : "success",
      );
    }
    if (failed > 0 && succeeded === 0) addToast("Failed to delete notes", "error");
    setSelectedIds(new Set());
    setBulkDeleteTarget(false);
  }, [selectedIds, bulkDelete, addToast]);

  const handleView = useCallback((note: AINote) => {
    navigate(`/dashboard/notes/${note.id}`);
  }, [navigate]);

  if (error) {
    return (
      <div className="animate-fade-in">
        <ErrorCard title="Error Loading Notes" message={(error as Error).message || "Failed to load notes"} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Notes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total > 0 ? `${total} ${total === 1 ? "note" : "notes"} total` : "Manage your study notes"}
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-primary-500 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Note
        </Link>
      </div>

      {/* Search & Filter Bar */}
      {!showSkeletons && notes.length > 0 && (
        <SearchFilterBar
          currentQuery={searchQuery}
          currentSort={sortOption}
          currentProvider={providerFilter}
          currentTimeRange={timeRange}
          onSearchChange={setSearchQuery}
          onSortChange={setSortOption}
          onProviderChange={setProviderFilter}
          onTimeRangeChange={setTimeRange}
          availableProviders={availableProviders}
          totalResults={totalFiltered}
        />
      )}

      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="animate-slide-down flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 dark:border-primary-800 dark:bg-primary-950">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-200 text-xs font-bold text-primary-700 dark:bg-primary-800 dark:text-primary-300">{selectedCount}</span>
            <span className="text-sm font-medium text-primary-800 dark:text-primary-200">{selectedCount} {selectedCount === 1 ? "note" : "notes"} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
            <Button variant="danger" size="sm" onClick={() => setBulkDeleteTarget(true)} icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            }>Delete Selected</Button>
          </div>
        </div>
      )}

      {/* Empty States */}
      {!showSkeletons && notes.length === 0 && (
        <EmptyState icon="📝" title="No notes yet" description="Generate your first AI-powered note from a YouTube video" action={
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 active:scale-[0.98]">Generate a Note</Link>
        } />
      )}
      {!showSkeletons && notes.length > 0 && totalFiltered === 0 && (
        <EmptyState icon="🔍" title="No search results" description={`No notes match "${searchQuery}". Try a different search term.`} action={
          <Button variant="secondary" size="sm" onClick={() => setSearchQuery("")}>Clear Search</Button>
        } />
      )}

      {/* Select All toggle */}
      {!showSkeletons && totalFiltered > 0 && (
        <div className="flex items-center gap-2 px-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
              aria-label={allVisibleSelected ? "Deselect all notes on this page" : "Select all notes on this page"} />
            {allVisibleSelected ? "Deselect all" : "Select all"}
          </label>
          {selectedCount > 0 && <span className="text-xs text-gray-400 dark:text-gray-500">({selectedCount} selected across all pages)</span>}
        </div>
      )}

      {/* Notes Grid — compact NoteCard */}
      {totalFiltered > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {showSkeletons
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ animationDelay: `${i * 75}ms` }}><CardSkeleton /></div>
              ))
            : paginatedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onView={() => handleView(note)}
                  onDelete={() => handleDeleteRequest(note)}
                  isSelected={selectedIds.has(note.id)}
                  onToggleSelect={() => toggleSelect(note.id)}
                />
              ))}
        </div>
      )}

      {/* Pagination */}
      {totalFilteredPages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Notes pagination">
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7l-7-7 7-7" /></svg>
            Previous
          </Button>
          <span className="px-3 text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalFilteredPages}</span>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalFilteredPages}>
            Next
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" /></svg>
          </Button>
        </nav>
      )}

      {/* Single Delete Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Note"
        message={<>
          Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deleteTarget?.title}</strong>?
          <br />This action cannot be undone.
        </>}
        confirmText={deleteNote.isPending ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        variant="danger"
        loading={deleteNote.isPending}
        icon="🗑️"
      />

      {/* Bulk Delete Modal */}
      <ConfirmModal
        isOpen={bulkDeleteTarget}
        onClose={() => setBulkDeleteTarget(false)}
        onConfirm={handleBulkDeleteConfirm}
        title={`Delete ${selectedCount} ${selectedCount === 1 ? "Note" : "Notes"}`}
        message={<>
          <p>Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{selectedCount} {selectedCount === 1 ? "note" : "notes"}</strong>?</p>
          <p className="mt-2">This action cannot be undone.</p>
          {bulkDelete.isPending && (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Deleting... This may take a moment.</span>
            </div>
          )}
        </>}
        confirmText={bulkDelete.isPending ? `Deleting ${selectedCount} notes...` : "Delete All"}
        cancelText="Cancel"
        variant="danger"
        loading={bulkDelete.isPending}
        icon="🗑️"
      />
    </div>
  );
}
