import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import type { AINote } from "@/types";

// ─── Shared helpers ───────────────────────────────────────────────

/**
 * Extract a human-readable error message from an Axios error that used
 * `responseType: "blob"`.  When the server returns a JSON error body
 * (e.g. {"detail":"Not found"}) Axios wraps the response as a Blob,
 * so normal `err.response.data.detail` access fails.
 */
async function _extractBlobError(err: any, fallback: string): Promise<string> {
  if (err?.response?.data instanceof Blob) {
    try {
      const text = await err.response.data.text();
      const parsed = JSON.parse(text);
      if (parsed.detail) return parsed.detail;
    } catch { /* not JSON – fall through */ }
  }
  return err?.response?.data?.detail || err?.message || fallback;
}

// ─── Download helpers ───────────────────────────────────────────────

/**
 * Download a note as a PDF file by calling the backend API.
 * Shows download progress via the `progress` callback.
 */
export function useDownloadPdf() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (noteId: string, title: string) => {
    setLoading(true);
    setProgress(0);
    setError(null);
    try {
      const response = await api.get(
        API_ENDPOINTS.notes.exportPdf(noteId),
        {
          responseType: "blob",
          onDownloadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
          },
        },
      );
      setProgress(100);
      _triggerDownload(response.data, `${title}.pdf`, "application/pdf");
    } catch (err: any) {
      const msg = await _extractBlobError(err, "Failed to download PDF");
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { downloadPdf: download, loading, progress, error };
}

/**
 * Download a note as a DOCX file by calling the backend API.
 * Shows download progress via the `progress` callback.
 */
export function useDownloadDocx() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (noteId: string, title: string) => {
    setLoading(true);
    setProgress(0);
    setError(null);
    try {
      const response = await api.get(
        API_ENDPOINTS.notes.exportDocx(noteId),
        {
          responseType: "blob",
          onDownloadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
          },
        },
      );
      setProgress(100);
      _triggerDownload(
        response.data,
        `${title}.docx`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    } catch (err: any) {
      const msg = await _extractBlobError(err, "Failed to download DOCX");
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { downloadDocx: download, loading, progress, error };
}

/**
 * Download a note as a Markdown file (generated client-side).
 */
export function useDownloadMarkdown() {
  const [loading, setLoading] = useState(false);

  const download = useCallback(async (note: AINote) => {
    setLoading(true);
    try {
      const md = _formatAsMarkdown(note);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      _triggerDownload(blob, `${note.title || "notes"}.md`, "text/markdown");
    } finally {
      setLoading(false);
    }
  }, []);

  return { downloadMarkdown: download, loading };
}

/**
 * Download a note as a TXT file (generated client-side).
 */
export function useDownloadTxt() {
  const [loading, setLoading] = useState(false);

  const download = useCallback(async (note: AINote) => {
    setLoading(true);
    try {
      const text = _formatAsPlainText(note);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      _triggerDownload(blob, `${note.title || "notes"}.txt`, "text/plain");
    } finally {
      setLoading(false);
    }
  }, []);

  return { downloadTxt: download, loading };
}

// ─── Copy helpers ───────────────────────────────────────────────────

/** Copy formatted note content to the system clipboard. */
export function useCopyToClipboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useCallback(async (note: AINote) => {
    setLoading(true);
    setError(null);
    try {
      const text = _formatAsPlainText(note);
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

/** Copy note as Markdown to the system clipboard. */
export function useCopyMarkdown() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useCallback(async (note: AINote) => {
    setLoading(true);
    setError(null);
    try {
      const md = _formatAsMarkdown(note);
      await navigator.clipboard.writeText(md);
    } catch (err: any) {
      const msg = err?.message || "Failed to copy Markdown";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { copyMarkdown: copy, loading, error };
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

function _formatAsMarkdown(note: AINote): string {
  const lines: string[] = [];

  lines.push(`# ${note.title || "Untitled Notes"}`);
  lines.push("");
  lines.push(`_Generated on ${new Date(note.created_at).toLocaleDateString()}_`);
  if (note.model_used) lines.push(`_Model: ${note.model_used}_`);
  if (note.processing_time > 0) lines.push(`_Processing time: ${note.processing_time.toFixed(1)}s_`);
  lines.push("");
  lines.push("---");
  lines.push("");

  if (note.executive_summary) {
    lines.push("## Executive Summary");
    lines.push("");
    lines.push(note.executive_summary);
    lines.push("");
  }

  if (note.key_concepts?.length) {
    lines.push("## Key Concepts");
    lines.push("");
    note.key_concepts.forEach((c) => lines.push(`- ${c}`));
    lines.push("");
  }

  if (note.detailed_notes) {
    lines.push("## Detailed Notes");
    lines.push("");
    lines.push(note.detailed_notes);
    lines.push("");
  }

  if (note.bullet_points?.length) {
    lines.push("## Key Takeaways");
    lines.push("");
    note.bullet_points.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  if (note.keywords?.length) {
    lines.push("## Keywords");
    lines.push("");
    lines.push(`\`${note.keywords.join("`, `")}\``);
    lines.push("");
  }

  if (note.action_items?.length) {
    lines.push("## Action Items");
    lines.push("");
    note.action_items.forEach((a) => lines.push(`- [ ] ${a}`));
    lines.push("");
  }

  if (note.conclusion) {
    lines.push("## Conclusion");
    lines.push("");
    lines.push(note.conclusion);
    lines.push("");
  }

  lines.push("---");
  lines.push("_Generated by NoteFlow AI_");

  return lines.join("\n");
}

function _formatAsPlainText(note: AINote): string {
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
