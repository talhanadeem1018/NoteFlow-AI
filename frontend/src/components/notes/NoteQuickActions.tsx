import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { AINote } from "@/types";

interface NoteQuickActionsProps {
  note: AINote;
  onView: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  compact?: boolean;
}

export function NoteQuickActions({
  note,
  onView,
  onDelete,
  isDeleting = false,
  compact = false,
}: NoteQuickActionsProps) {
  const { addToast } = useToast();

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Format note content for clipboard
      const lines: string[] = [];
      lines.push(note.title || "Untitled Notes");
      lines.push("=".repeat(60));
      lines.push("");
      lines.push(`Generated: ${new Date(note.created_at).toLocaleDateString()}`);
      if (note.model_used) lines.push(`Model: ${note.model_used}`);
      lines.push("");

      if (note.executive_summary) {
        lines.push("EXECUTIVE SUMMARY");
        lines.push("-".repeat(40));
        lines.push(note.executive_summary);
        lines.push("");
      }
      if (note.key_concepts?.length) {
        lines.push("KEY CONCEPTS");
        lines.push("-".repeat(40));
        note.key_concepts.forEach((c) => lines.push(`  • ${c}`));
        lines.push("");
      }
      if (note.bullet_points?.length) {
        lines.push("KEY TAKEAWAYS");
        lines.push("-".repeat(40));
        note.bullet_points.forEach((p) => lines.push(`  • ${p}`));
        lines.push("");
      }
      if (note.conclusion) {
        lines.push("CONCLUSION");
        lines.push("-".repeat(40));
        lines.push(note.conclusion);
      }

      await navigator.clipboard.writeText(lines.join("\n"));
      addToast("Notes copied to clipboard!", "success");
    } catch {
      addToast("Failed to copy to clipboard", "error");
    }
  }, [note, addToast]);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-primary-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label={`View note: ${note.title}`}
          title="View"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button
          onClick={handleCopy}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-primary-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label={`Copy note: ${note.title}`}
          title="Copy to clipboard"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={isDeleting}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          aria-label={`Delete note: ${note.title}`}
          title="Delete"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onView(); }}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      >
        View
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleCopy}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        }
      >
        Copy
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        disabled={isDeleting}
        loading={isDeleting}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        }
      >
        Delete
      </Button>
    </div>
  );
}
