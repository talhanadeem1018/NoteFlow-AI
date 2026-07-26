import { memo, useCallback, useState } from "react";
import type { AINote } from "@/types";
import { useDownloadPdf } from "@/services/export.service";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/utils/cn";

interface NoteCardProps {
  note: AINote;
  onView: () => void;
  onDelete: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

/** Deterministic gradient based on note title for the thumbnail placeholder */
function thumbnailGradient(title: string): string {
  const colors = [
    "from-violet-500 to-purple-700",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-700",
    "from-amber-500 to-orange-700",
    "from-rose-500 to-pink-700",
    "from-indigo-500 to-blue-700",
    "from-sky-500 to-indigo-600",
    "from-teal-500 to-emerald-700",
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const NoteCard = memo(function NoteCard({
  note,
  onView,
  onDelete,
  isSelected = false,
  onToggleSelect,
}: NoteCardProps) {
  const { addToast } = useToast();
  const { downloadPdf, loading: pdfLoading } = useDownloadPdf();
  const [copied, setCopied] = useState(false);

  const handleDownloadPdf = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadPdf(note.id, note.title || "notes");
      addToast("PDF downloaded successfully!", "success");
    } catch {
      addToast("Failed to download PDF", "error");
    }
  }, [downloadPdf, note.id, note.title, addToast]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
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
      }
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      addToast("Notes copied to clipboard!", "success");
    } catch {
      addToast("Failed to copy to clipboard", "error");
    }
  }, [note, addToast]);

  const gradient = thumbnailGradient(note.title);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-white shadow-sm transition-all hover:shadow-md dark:bg-gray-900",
        "border-gray-200 dark:border-gray-800",
        isSelected && "ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-950",
      )}
    >
      {/* Selection checkbox */}
      {onToggleSelect && (
        <div
          className={cn(
            "absolute left-2 top-2 z-10",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
          )}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
            aria-label={`Select note: ${note.title}`}
          />
        </div>
      )}

      {/* Thumbnail placeholder */}
      <div
        className={cn(
          "relative flex h-28 w-full flex-shrink-0 items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-br",
          gradient,
        )}
      >
        {/* Play button icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
          <svg className="ml-0.5 h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>

        {/* Duration badge (using processing_time as a proxy) */}
        {note.processing_time > 0 && (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {note.processing_time.toFixed(1)}s
          </span>
        )}

        {/* AI Provider Badge */}
        {note.model_used && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
            {note.model_used}
          </span>
        )}
      </div>

      {/* Content */}
      <div
        className="flex cursor-pointer flex-col gap-2 p-3"
        onClick={onView}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") onView(); }}
      >
        {/* Title */}
        <h3 className="line-clamp-1 text-sm font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
          {note.title}
        </h3>

        {/* Summary (2 lines) */}
        {note.executive_summary && (
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {note.executive_summary}
          </p>
        )}

        {/* Date */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
          <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span>{new Date(note.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5 border-t border-gray-100 px-2 py-2 dark:border-gray-800">
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary-500 dark:text-primary-400 dark:hover:bg-primary-950"
          aria-label={`View note: ${note.title}`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          View
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-primary-500 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label={`Download PDF: ${note.title}`}
        >
          {pdfLoading ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
          Download
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-primary-500 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label={`Copy note: ${note.title}`}
        >
          {copied ? (
            <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.5 10.5H18a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25h-1.5m-9 15.75H6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 016 4.5h1.5" />
            </svg>
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-500 dark:text-red-400 dark:hover:bg-red-900/30"
          aria-label={`Delete note: ${note.title}`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
});
