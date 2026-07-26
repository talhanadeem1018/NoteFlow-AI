import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useVideoMetadata } from "@/services/videos.service";
import { useStartProcessing, useJobStatus } from "@/services/processing.service";
import { useNote } from "@/services/notes.service";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { ProcessingSteps, type ProcessingStepId } from "@/components/ui/ProcessingSteps";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { cn } from "@/utils/cn";
import { useAppStore } from "@/stores/app.store";
import type { VideoMetadata, AINote } from "@/types";

interface GenerateWorkflowProps {
  onNoteGenerated: (note: AINote) => void;
  onJobStatusChange?: (status: "started" | "completed" | "failed") => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

function formatViewCount(count: number | null): string {
  if (!count) return "";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count.toLocaleString()} views`;
}

function mapProgressToStep(message: string | null | undefined): ProcessingStepId | null {
  if (!message) return null;
  const lower = message.toLowerCase();
  if (lower.includes("transcrib")) return "transcribing";
  if (lower.includes("generat") || lower.includes("ai note") || lower.includes("note")) return "generating";
  if (lower.includes("download")) return "downloading";
  if (lower.includes("metadata") || lower.includes("fetch")) return "metadata";
  if (lower.includes("queue")) return "queued";
  if (lower.includes("sav")) return "saving";
  if (lower.includes("complete")) return "completed";
  return null;
}

/**
 * GenerateWorkflow – orchestrates the full video → notes pipeline.
 *
 * Persistence flow:
 *   1. Zustand store persists activeJob + pendingJobMetadata to localStorage
 *   2. On mount, if persisted state exists, restore the processing card
 *   3. useJobStatus polls every 5s and updates the store
 *   4. On completion → toast, redirect to note, clear persisted state
 *   5. On failure → show error card with retry
 */
export function GenerateWorkflow({ onNoteGenerated, onJobStatusChange }: GenerateWorkflowProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const activeJob = useAppStore((s) => s.activeJob);
  const setActiveJob = useAppStore((s) => s.setActiveJob);
  const pendingJobMetadata = useAppStore((s) => s.pendingJobMetadata);
  const setPendingJobMetadata = useAppStore((s) => s.setPendingJobMetadata);
  const [url, setUrl] = useState("");
  const [workflowStep, setWorkflowStep] = useState<ProcessingStepId>("queued");
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processedNoteRef = useRef<boolean>(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMetadata = useVideoMetadata();
  const startProcessing = useStartProcessing();
  const jobStatus = useJobStatus(jobId);
  const completedNote = useNote(jobStatus.data?.note_id ?? "");

  const apiStep = useMemo(
    () => mapProgressToStep(jobStatus.data?.progress_message),
    [jobStatus.data?.progress_message],
  );

  // ── Restore from persisted state on mount ──────────────────────────
  useEffect(() => {
    const stored = useAppStore.getState();
    if (stored.activeJob && stored.pendingJobMetadata) {
      setJobId(stored.activeJob.jobId);
      setShowWorkflow(true);
      setMetadata({
        video_id: stored.pendingJobMetadata.video_id || "",
        title: stored.pendingJobMetadata.title,
        channel: stored.pendingJobMetadata.channel,
        thumbnail_url: stored.pendingJobMetadata.thumbnail_url,
        duration: stored.pendingJobMetadata.duration,
        description: null,
        upload_date: stored.pendingJobMetadata.upload_date,
        view_count: stored.pendingJobMetadata.view_count,
        tags: [],
      });
      setUrl(stored.pendingJobMetadata.url);
      setWorkflowStep(
        mapProgressToStep(stored.activeJob.progressMessage) || "queued",
      );
    }
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync workflow step & store from API status ─────────────────────
  useEffect(() => {
    if (!jobStatus.data) return;

    if (jobStatus.data.status === "completed") {
      setWorkflowStep("completed");
      onJobStatusChange?.("completed");
    } else if (jobStatus.data.status === "failed") {
      setError(jobStatus.data.error_message || "Processing failed");
      setActiveJob(null);
      setPendingJobMetadata(null);
      onJobStatusChange?.("failed");
    } else if (jobStatus.data.status === "processing" || jobStatus.data.status === "pending") {
      const step = apiStep || "queued";
      setWorkflowStep(step);
      if (jobId && metadata) {
        setActiveJob({
          jobId,
          status: jobStatus.data.status,
          progressMessage: jobStatus.data.progress_message,
          videoTitle: metadata.title,
        });
      }
    }
  }, [jobStatus.data, apiStep, onJobStatusChange, setActiveJob, setPendingJobMetadata, jobId, metadata]);

  // ── On completion: toast + redirect ────────────────────────────────
  useEffect(() => {
    if (
      jobStatus.data?.status === "completed" &&
      completedNote.data &&
      !processedNoteRef.current
    ) {
      processedNoteRef.current = true;
      setActiveJob(null);
      setPendingJobMetadata(null);

      const note: AINote = {
        id: completedNote.data.id,
        transcript_id: completedNote.data.transcript_id,
        user_id: completedNote.data.user_id,
        title: completedNote.data.title,
        executive_summary: completedNote.data.executive_summary,
        key_concepts: completedNote.data.key_concepts,
        detailed_notes: completedNote.data.detailed_notes,
        bullet_points: completedNote.data.bullet_points,
        keywords: completedNote.data.keywords,
        action_items: completedNote.data.action_items,
        conclusion: completedNote.data.conclusion,
        model_used: completedNote.data.model_used,
        prompt_version: completedNote.data.prompt_version,
        processing_time: completedNote.data.processing_time,
        created_at: completedNote.data.created_at,
      };

      addToast("Your notes are ready!", "success");

      const searchParams = new URLSearchParams();
      if (metadata) {
        searchParams.set("title", metadata.title);
        searchParams.set("channel", metadata.channel);
        if (metadata.thumbnail_url) searchParams.set("thumbnail", metadata.thumbnail_url);
        if (metadata.duration) searchParams.set("duration", String(metadata.duration));
        if (metadata.upload_date) searchParams.set("upload_date", metadata.upload_date);
        if (metadata.view_count) searchParams.set("view_count", String(metadata.view_count));
        if (metadata.video_id) searchParams.set("video_id", metadata.video_id);
        if (url) searchParams.set("youtube_url", url);
      }

      onNoteGenerated(note);

      redirectTimerRef.current = setTimeout(() => {
        navigate(`/dashboard/notes/${note.id}?${searchParams.toString()}`);
      }, 1000);
    }

    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [jobStatus.data?.status, completedNote.data, metadata, url, onNoteGenerated, addToast, navigate, setActiveJob, setPendingJobMetadata]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = url.trim();
    if (!trimmed) {
      addToast("Please enter a YouTube URL", "warning");
      return;
    }

    const ytPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    if (!ytPattern.test(trimmed)) {
      addToast("Please enter a valid YouTube URL", "error");
      return;
    }

    setMetadata(null);
    setJobId(null);
    setError(null);
    setWorkflowStep("queued");
    setShowWorkflow(true);
    processedNoteRef.current = false;

    try {
      setWorkflowStep("metadata");
      const metadataResult = await fetchMetadata.mutateAsync({ url: trimmed });
      setMetadata(metadataResult);

      setWorkflowStep("downloading");
      const jobResult = await startProcessing.mutateAsync({ url: trimmed });
      setJobId(jobResult.job_id);

      // Persist to store immediately
      setActiveJob({
        jobId: jobResult.job_id,
        status: "pending",
        progressMessage: "Queued for processing",
        videoTitle: metadataResult.title,
      });
      setPendingJobMetadata({
        url: trimmed,
        title: metadataResult.title,
        channel: metadataResult.channel,
        thumbnail_url: metadataResult.thumbnail_url,
        duration: metadataResult.duration,
        upload_date: metadataResult.upload_date,
        view_count: metadataResult.view_count,
        video_id: metadataResult.video_id,
      });

      onJobStatusChange?.("started");
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || "An error occurred";
      setError(message);
      addToast(message, "error");
      setMetadata(null);
      setJobId(null);
      setShowWorkflow(false);
      setWorkflowStep("queued");
      setActiveJob(null);
      setPendingJobMetadata(null);
    }
  }, [url, fetchMetadata, startProcessing, addToast, setActiveJob, setPendingJobMetadata, onJobStatusChange]);

  const handleRetry = useCallback(() => {
    setError(null);
    setShowWorkflow(false);
    setWorkflowStep("queued");
    setJobId(null);
    setMetadata(null);
    setActiveJob(null);
    setPendingJobMetadata(null);
    processedNoteRef.current = false;
  }, [setActiveJob, setPendingJobMetadata]);

  const isProcessing = showWorkflow && workflowStep !== "completed";

  return (
    <div className={cn(
      "rounded-xl border bg-white shadow-sm transition-all duration-300 dark:bg-gray-900",
      "border-gray-200 dark:border-gray-800",
      showWorkflow ? "p-5" : "p-5",
    )}>
      {!showWorkflow ? (
        <>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Generate Notes</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Paste a YouTube URL to create AI-powered study notes</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube URL here..."
                aria-label="YouTube URL"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3.5 pr-12 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
              {url.trim() && (
                <button type="button" onClick={() => setUrl("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Clear">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            <Button type="submit" size="md" disabled={!url.trim()} className="w-full sm:w-auto self-start">
              Generate Notes
            </Button>
          </form>
        </>
      ) : (
        <div className="animate-fade-in space-y-0">
          {/* Video Metadata Card */}
          {metadata && workflowStep !== "queued" && (
            <div className="mb-5 flex items-start gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
              {metadata.thumbnail_url && (
                <div className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 shadow-sm">
                  <img src={metadata.thumbnail_url} alt={metadata.title} className="h-full w-full object-cover" />
                  {metadata.duration && (
                    <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/85 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                      {formatDuration(metadata.duration)}
                    </span>
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">{metadata.title}</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{metadata.channel}</p>
                {(metadata.upload_date || metadata.view_count) && (
                  <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                    {formatDate(metadata.upload_date)}{metadata.upload_date && metadata.view_count ? " · " : ""}{formatViewCount(metadata.view_count)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isProcessing && (
            <div className="mb-4">
              <ErrorCard title="Processing Failed" message={error} onRetry={handleRetry} compact />
            </div>
          )}

          {/* Processing Timeline */}
          <div className="animate-slide-up">
            <ProcessingSteps
              currentStep={workflowStep}
              progressMessage={jobStatus.data?.progress_message}
            />
          </div>
        </div>
      )}
    </div>
  );
}
