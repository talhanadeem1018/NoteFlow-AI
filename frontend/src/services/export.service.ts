import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import type { AINote } from "@/types";

// ─── Download helpers ───────────────────────────────────────────────

/**
 * Download a note as a PDF file by calling the backend API.
 *
 * Returns an object with `loading` state and the `downloadPdf` trigger.
 */
export function useDownloadPdf() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (noteId: string, title: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(
        API_ENDPOINTS.notes.exportPdf(noteId),
        { responseType: "blob" },
      );
      _triggerDownload(response.data, `${title}.pdf`, "application/pdf");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to download PDF";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { downloadPdf: download, loading, error };
}

/**
 * Download a note as a DOCX file by calling the backend API.
 *
 * Returns an object with `loading` state and the `downloadDocx` trigger.
 */
export function useDownloadDocx() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (noteId: string, title: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(
        API_ENDPOINTS.notes.exportDocx(noteId),
        { responseType: "blob" },
      );
      _triggerDownload(
        response.data,
        `${title}.docx`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to download DOCX";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { downloadDocx: download, loading, error };
}

/**
 * Copy formatted note content to the system clipboard.
 *
 * Returns an object with `loading` state and the `copyToClipboard` trigger.
 */
export function useCopyToClipboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useCallback(async (note: AINote) => {
    setLoading(true);
    setError(null);
    try {
      const text = _formatNoteForClipboard(note);
      await navigator.clipboard.writeText(text);
    } catch (err: any) {
      const msg = err?.message || "Failed to copy to clipboard";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { copyToClipboard: copy, loading, error };
}

// ─── Internal helpers ───────────────────────────────────────────────

function _triggerDownload(blob: Blob, filename: string, _mimeType: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function _formatNoteForClipboard(note: AINote): string {
  const lines: string[] = [];

  lines.push(note.title || "Untitled Notes");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(`Generated: ${new Date(note.created_at).toLocaleDateString()}`);
  if (note.model_used) lines.push(`Model: ${note.model_used}`);
  if (note.processing_time > 0) lines.push(`Processing time: ${note.processing_time.toFixed(1)}s`);
  lines.push("");

  // Executive Summary
  if (note.executive_summary) {
    lines.push("EXECUTIVE SUMMARY");
    lines.push("-".repeat(40));
    lines.push(note.executive_summary);
    lines.push("");
  }

  // Key Concepts
  if (note.key_concepts && note.key_concepts.length > 0) {
    lines.push("KEY CONCEPTS");
    lines.push("-".repeat(40));
    note.key_concepts.forEach((c) => lines.push(`  • ${c}`));
    lines.push("");
  }

  // Detailed Notes
  if (note.detailed_notes) {
    lines.push("DETAILED NOTES");
    lines.push("-".repeat(40));
    lines.push(note.detailed_notes);
    lines.push("");
  }

  // Bullet Points / Key Takeaways
  if (note.bullet_points && note.bullet_points.length > 0) {
    lines.push("KEY TAKEAWAYS");
    lines.push("-".repeat(40));
    note.bullet_points.forEach((p) => lines.push(`  • ${p}`));
    lines.push("");
  }

  // Keywords
  if (note.keywords && note.keywords.length > 0) {
    lines.push("KEYWORDS");
    lines.push("-".repeat(40));
    lines.push(`  ${note.keywords.join(", ")}`);
    lines.push("");
  }

  // Action Items
  if (note.action_items && note.action_items.length > 0) {
    lines.push("ACTION ITEMS");
    lines.push("-".repeat(40));
    note.action_items.forEach((a) => lines.push(`  ☐ ${a}`));
    lines.push("");
  }

  // Conclusion
  if (note.conclusion) {
    lines.push("CONCLUSION");
    lines.push("-".repeat(40));
    lines.push(note.conclusion);
    lines.push("");
  }

  lines.push("=".repeat(60));
  lines.push("Generated by NoteFlow AI");

  return lines.join("\n");
}
