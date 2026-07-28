import { useState, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useNote } from "@/services/notes.service";
import { useTranscript } from "@/services/transcription.service";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { cn } from "@/utils/cn";
import { useDownloadPdf, useDownloadDocx, useDownloadMarkdown, useDownloadTxt, useCopyToClipboard, useCopyMarkdown } from "@/services/export.service";

// ─── Helpers ─────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

function formatViewCount(count: number | null): string {
  if (!count) return "—";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Read video metadata from URL search params (set by GenerateWorkflow) */
function readVideoMetaFromParams(searchParams: URLSearchParams): { meta: {
  title: string;
  channel: string;
  thumbnail_url: string | null;
  duration: number | null;
  upload_date: string | null;
  view_count: number | null;
  video_id: string;
}; url: string } | null {
  const title = searchParams.get("title");
  if (!title) return null;
  return {
    meta: {
      title,
      channel: searchParams.get("channel") || "",
      thumbnail_url: searchParams.get("thumbnail") || null,
      duration: searchParams.get("duration") ? Number(searchParams.get("duration")) : null,
      upload_date: searchParams.get("upload_date") || null,
      view_count: searchParams.get("view_count") ? Number(searchParams.get("view_count")) : null,
      video_id: searchParams.get("video_id") || "",
    },
    url: searchParams.get("youtube_url") || "",
  };
}

// ─── Tab types ──────────────────────────────────────────────────

type TabId = "overview" | "ai-notes" | "transcript" | "metadata" | "export";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "ai-notes", label: "AI Notes" },
  { id: "transcript", label: "Transcript" },
  { id: "metadata", label: "Metadata" },
  { id: "export", label: "Export" },
];

// ─── Component ──────────────────────────────────────────────────

export function NoteDetailsPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();

  const { data: note, isLoading, error, refetch } = useNote(noteId ?? "");
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Read video metadata from URL search params
  const videoInfo = useMemo(() => readVideoMetaFromParams(searchParams), [searchParams.toString()]);

  // Transcript data
  const transcriptId = note?.transcript_id ?? "";
  const { data: transcript } = useTranscript(transcriptId);

  // Export hooks
  const { downloadPdf, loading: pdfLoading, progress: pdfProgress } = useDownloadPdf();
  const { downloadDocx, loading: docxLoading, progress: docxProgress } = useDownloadDocx();
  const { downloadMarkdown, loading: mdDlLoading } = useDownloadMarkdown();
  const { downloadTxt, loading: txtDlLoading } = useDownloadTxt();
  const { copyToClipboard, loading: copyLoading } = useCopyToClipboard();
  const { copyMarkdown, loading: mdCopyLoading } = useCopyMarkdown();

  const exportLoading = pdfLoading || docxLoading || mdDlLoading || txtDlLoading || copyLoading || mdCopyLoading;

  // Key metadata items for the header
  const headerMeta = useMemo(() => {
    if (!note) return null;
    return {
      aiProvider: note.model_used || "N/A",
      processingTime: note.processing_time > 0 ? `${note.processing_time.toFixed(1)}s` : "N/A",
      createdDate: formatDateFull(note.created_at),
    };
  }, [note]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleDownloadPdf = async () => {
    if (!note) return;
    try {
      await downloadPdf(note.id, note.title || "notes");
      addToast("PDF downloaded successfully!", "success");
    } catch {
      addToast("Failed to download PDF", "error");
    }
  };

  const handleDownloadDocx = async () => {
    if (!note) return;
    try {
      await downloadDocx(note.id, note.title || "notes");
      addToast("DOCX downloaded successfully!", "success");
    } catch {
      addToast("Failed to download DOCX", "error");
    }
  };

  const handleDownloadMarkdown = async () => {
    if (!note) return;
    try {
      await downloadMarkdown(note);
      addToast("Markdown downloaded!", "success");
    } catch {
      addToast("Failed to download Markdown", "error");
    }
  };

  const handleDownloadTxt = async () => {
    if (!note) return;
    try {
      await downloadTxt(note);
      addToast("Text file downloaded!", "success");
    } catch {
      addToast("Failed to download text", "error");
    }
  };

  const handleCopyMarkdown = async () => {
    if (!note) return;
    try {
      await copyMarkdown(note);
      addToast("Markdown copied to clipboard!", "success");
    } catch {
      addToast("Failed to copy Markdown", "error");
    }
  };

  const handleCopyPlainText = async () => {
    if (!note) return;
    try {
      await copyToClipboard(note);
      addToast("Plain text copied to clipboard!", "success");
    } catch {
      addToast("Failed to copy text", "error");
    }
  };

  // ── Loading state ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  // ── Error / Not found ─────────────────────────────────────────

  if (error || !note) {
    return (
      <div className="mx-auto max-w-4xl">
        <ErrorCard
              title="Note Not Found"
              message={(error as Error)?.message || "The requested note could not be found."}
              onRetry={() => refetch()}
            />
            <Link
              to="/dashboard/notes"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Notes
            </Link>
      </div>
    );
  }

  return (
      <div className="mx-auto max-w-4xl animate-fade-in space-y-5">
          {/* ── Back Navigation ──────────────────────────────── */}
          <Link
            to="/dashboard/notes"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Notes
          </Link>

          {/* ── Hero Header ─────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            {/* Thumbnail with overlay info */}
            {videoInfo?.meta.thumbnail_url && (
              <div className="relative aspect-video w-full bg-gray-100 dark:bg-gray-800 sm:aspect-[21/9]">
                <img
                  src={videoInfo.meta.thumbnail_url}
                  alt={videoInfo.meta.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {videoInfo.meta.duration && (
                  <span className="absolute bottom-3 right-3 rounded-lg bg-black/80 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {formatDuration(videoInfo.meta.duration)}
                  </span>
                )}
              </div>
            )}

            {/* Title & Meta row */}
            <div className="p-4 sm:p-6">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">
                {note.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                {videoInfo?.meta.channel && (
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    {videoInfo.meta.channel}
                  </span>
                )}
                {videoInfo?.meta.upload_date && (
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {formatDate(videoInfo?.meta.upload_date || null)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  {headerMeta?.aiProvider || "N/A"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {headerMeta?.processingTime}
                </span>
              </div>
            </div>
          </div>

          {/* ── Tabs ─────────────────────────────────────────── */}
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="flex gap-0 -mb-px overflow-x-auto" aria-label="Note sections" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200",
                    activeTab === tab.id
                      ? "border-primary-500 text-primary-700 dark:text-primary-300"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Tab Content ──────────────────────────────────── */}
          <div role="tabpanel" className="animate-fade-in">
            {/* ─── Overview Tab ─────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Executive Summary */}
                {note.executive_summary && (
                  <SectionCard icon="📋" title="Executive Summary">
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      {note.executive_summary}
                    </p>
                  </SectionCard>
                )}

                {/* Key Concepts */}
                {note.key_concepts && note.key_concepts.length > 0 && (
                  <SectionCard icon="💡" title="Key Concepts">
                    <div className="flex flex-wrap gap-1.5">
                      {note.key_concepts.map((concept, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* Key Takeaways (Bullet Points) */}
                {note.bullet_points && note.bullet_points.length > 0 && (
                  <SectionCard icon="✅" title="Key Takeaways">
                    <ul className="space-y-1.5">
                      {note.bullet_points.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="mt-1 flex-shrink-0 text-primary-500" aria-hidden="true">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}

                {/* Action Items */}
                {note.action_items && note.action_items.length > 0 && (
                  <SectionCard icon="🎯" title="Action Items">
                    <ul className="space-y-1.5">
                      {note.action_items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="mt-1 flex-shrink-0 text-green-500" aria-hidden="true">☐</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}

                {/* Keywords */}
                {note.keywords && note.keywords.length > 0 && (
                  <SectionCard icon="🏷️" title="Keywords">
                    <div className="flex flex-wrap gap-1.5">
                      {note.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* Conclusion */}
                {note.conclusion && (
                  <SectionCard icon="📌" title="Conclusion">
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      {note.conclusion}
                    </p>
                  </SectionCard>
                )}
              </div>
            )}

            {/* ─── AI Notes Tab ─────────────────────────────────── */}
            {activeTab === "ai-notes" && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                {note.detailed_notes ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      {note.detailed_notes}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">No detailed notes available.</p>
                )}
              </div>
            )}

            {/* ─── Transcript Tab ────────────────────────────────── */}
            {activeTab === "transcript" && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                {transcript ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Full Transcript</h3>
                      {transcript.detected_language && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {transcript.detected_language.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      {transcript.full_text}
                    </div>
                    {transcript.segments && transcript.segments.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
                        {transcript.segment_count || transcript.segments.length} segments ·{" "}
                        {transcript.duration ? `${formatDuration(transcript.duration)}` : ""}
                      </div>
                    )}
                  </div>
                ) : transcriptId ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading transcript...</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">No transcript available for this note.</p>
                )}
              </div>
            )}

            {/* ─── Metadata Tab ──────────────────────────────────── */}
            {activeTab === "metadata" && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                {/* Hero thumbnail */}
                {videoInfo?.meta.thumbnail_url && (
                  <div className="relative aspect-video w-full bg-gray-100 dark:bg-gray-800 sm:aspect-[21/9]">
                    <img
                      src={videoInfo.meta.thumbnail_url}
                      alt={videoInfo.meta.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  <MetaRow label="Title" value={note.title} />
                  {videoInfo && (
                    <>
                      <MetaRow
                        label="Original URL"
                        value={videoInfo.url}
                        isUrl
                      />
                      <MetaRow label="Channel" value={videoInfo.meta.channel} />
                      <MetaRow label="Video ID" value={videoInfo.meta.video_id} mono />
                      <MetaRow label="Duration" value={formatDuration(videoInfo.meta.duration)} />
                      <MetaRow label="Views" value={formatViewCount(videoInfo.meta.view_count)} />
                      <MetaRow label="Upload Date" value={formatDate(videoInfo.meta.upload_date)} />
                    </>
                  )}
                  <MetaRow label="Language" value={transcript?.detected_language || "—"} />
                  <MetaRow label="Processing Time" value={note.processing_time > 0 ? `${note.processing_time.toFixed(1)}s` : "—"} />
                  <MetaRow label="Model Used" value={note.model_used || "—"} />
                  <MetaRow label="Created Date" value={formatDateFull(note.created_at)} />
                  <MetaRow label="Transcript ID" value={note.transcript_id || "—"} mono />
                </div>
              </div>
            )}

            {/* ─── Export Tab ──────────────────────────────────── */}
            {activeTab === "export" && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Download</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Export your notes in various formats
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* PDF */}
                    <ExportCard
                      icon={
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      }
                      label="PDF Document"
                      desc="Professional layout"
                      loading={pdfLoading}
                      progress={pdfProgress}
                      colorClass="hover:border-red-200 dark:hover:border-red-800"
                      iconBg="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      onClick={handleDownloadPdf}
                      disabled={exportLoading}
                    />

                    {/* DOCX */}
                    <ExportCard
                      icon={
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      }
                      label="Word Document"
                      desc="Editable .docx format"
                      loading={docxLoading}
                      progress={docxProgress}
                      colorClass="hover:border-blue-200 dark:hover:border-blue-800"
                      iconBg="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      onClick={handleDownloadDocx}
                      disabled={exportLoading}
                    />

                    {/* Markdown */}
                    <ExportCard
                      icon={
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                        </svg>
                      }
                      label="Markdown"
                      desc="Lightweight markup format"
                      loading={mdDlLoading}
                      progress={0}
                      colorClass="hover:border-purple-200 dark:hover:border-purple-800"
                      iconBg="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                      onClick={handleDownloadMarkdown}
                      disabled={exportLoading}
                    />

                    {/* TXT */}
                    <ExportCard
                      icon={
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      }
                      label="Plain Text"
                      desc="Simple .txt format"
                      loading={txtDlLoading}
                      progress={0}
                      colorClass="hover:border-gray-300 dark:hover:border-gray-600"
                      iconBg="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      onClick={handleDownloadTxt}
                      disabled={exportLoading}
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-5 dark:border-gray-800">
                    <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Copy to Clipboard</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleCopyMarkdown}
                        disabled={exportLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-primary-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {mdCopyLoading ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                          </svg>
                        )}
                        Copy Markdown
                      </button>
                      <button
                        onClick={handleCopyPlainText}
                        disabled={exportLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-primary-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {copyLoading ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                        Copy Plain Text
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
  );
}

// ─── Helper Sub-Components ───────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <span aria-hidden="true">{icon}</span>
        <span>{title}</span>
      </h4>
      {children}
    </div>
  );
}

function ExportCard({
  icon,
  label,
  desc,
  loading,
  progress,
  colorClass,
  iconBg,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  loading: boolean;
  progress: number;
  colorClass: string;
  iconBg: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary-500 dark:border-gray-700 dark:bg-gray-800",
        colorClass,
      )}
    >
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg transition-colors group-hover:scale-105", iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
        {loading && progress > 0 && progress < 100 && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {loading && !progress && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      )}
    </button>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
  isUrl = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  isUrl?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </span>
      {isUrl && value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "max-w-[60%] truncate text-right text-sm text-primary-600 hover:text-primary-700 hover:underline dark:text-primary-400",
            mono && "font-mono text-xs",
          )}
        >
          {value}
        </a>
      ) : (
        <span
          className={cn(
            "max-w-[60%] truncate text-right text-sm text-gray-900 dark:text-white",
            mono && "font-mono text-xs",
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}
