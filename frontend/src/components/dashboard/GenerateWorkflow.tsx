import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useVideoMetadata } from "@/services/videos.service";
import {
  useStartProcessing,
  useJobStatus,
  usePauseJob,
  useResumeJob,
  useCancelJob,
  isNotFoundError,
} from "@/services/processing.service";
import { useNote } from "@/services/notes.service";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { ProcessingSteps, type ProcessingStepId } from "@/components/ui/ProcessingSteps";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { cn } from "@/utils/cn";
import { useAppStore } from "@/stores/app.store";
import type { VideoMetadata, AINote, ProcessingStatus } from "@/types";

interface GenerateWorkflowProps {
  onNoteGenerated: (note: AINote) => void;
  onJobStatusChange?: (
    status: "started" | "completed" | "failed" | "paused" | "cancelled" | "interrupted",
  ) => void;
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

function getErrorMessage(error: any): string {
  return error?.response?.data?.detail || error?.message || "An error occurred";
}

/** Statuses during which the Pause button is shown. */
const ACTIVE_STATUSES: ProcessingStatus[] = ["pending", "processing"];
/** Statuses during which the Resume button is shown. */
const RESUMABLE_STATUSES: ProcessingStatus[] = ["paused", "interrupted", "failed"];

/**
 * GenerateWorkflow – orchestrates the full video → notes pipeline.
 *
 * Persistence flow:
 *   1. Zustand store persists activeJob + pendingJobMetadata to localStorage
 *   2. On mount, if persisted state exists, restore the processing card
 *   3. useJobStatus polls every 5s (auth-gated) and updates the store
 *   4. Pause / Cancel / Resume call backend control endpoints; the backend
 *      database is the source of truth, the store is only a mirror
 *   5. On completion → toast, redirect to note, clear persisted state
 *   6. On failure → show error card; Retry resumes from the last checkpoint
 */
export function GenerateWorkflow({ onNoteGenerated, onJobStatusChange }: GenerateWorkflowProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const setActiveJob = useAppStore((s) => s.setActiveJob);
  const setPendingJobMetadata = useAppStore((s) => s.setPendingJobMetadata);
  const [url, setUrl] = useState("");
  const [workflowStep, setWorkflowStep] = useState<ProcessingStepId>("queued");
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const processedNoteRef = useRef<boolean>(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMetadata = useVideoMetadata();
  const startProcessing = useStartProcessing();
  const jobStatus = useJobStatus(jobId);
  const completedNote = useNote(jobStatus.data?.note_id ?? "");
  const pauseJob = usePauseJob();
  const resumeJob = useResumeJob();
  const cancelJob = useCancelJob();

  const apiStep = useMemo(
    () => mapProgressToStep(jobStatus.data?.progress_message),
    [jobStatus.data?.progress_message],
  );

  const status = jobStatus.data?.status;
  const interruptedConfirmed = jobStatus.interruptedConfirmed;
  // The backend can report 'interrupted' (startup orphan recovery) while the
  // original worker is still alive and decoding in another process. Treat it
  // as still processing until useJobStatus CONFIRMS the interruption – only
  // then show the "Processing interrupted" banner / Resume.
  const effectiveStatus: ProcessingStatus | undefined =
    status === "interrupted" && !interruptedConfirmed ? "processing" : status;
  const isActive = effectiveStatus ? ACTIVE_STATUSES.includes(effectiveStatus) : false;
  const isResumable = effectiveStatus ? RESUMABLE_STATUSES.includes(effectiveStatus) : false;
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";
  const isFailed = status === "failed";
  const controlBusy = pauseJob.isPending || resumeJob.isPending || cancelJob.isPending;

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

    const s = effectiveStatus;

    if (s === "completed") {
      setWorkflowStep("completed");
      onJobStatusChange?.("completed");
    } else if (s === "failed") {
      setError(jobStatus.data.error_message || "Processing failed");
      onJobStatusChange?.("failed");
      if (jobId && metadata) {
        setActiveJob({
          jobId,
          status: "failed",
          progressMessage: jobStatus.data.progress_message,
          videoTitle: metadata.title,
        });
      }
    } else if (s === "cancelled") {
      // Cancelled is terminal – clear persisted state so a refresh cannot
      // accidentally resurrect the job. The user can start a new one.
      setWorkflowStep("queued");
      setActiveJob(null);
      setPendingJobMetadata(null);
      onJobStatusChange?.("cancelled");
    } else if (s === "paused" || s === "interrupted") {
      setWorkflowStep(apiStep || "queued");
      if (jobId && metadata) {
        setActiveJob({
          jobId,
          status: s,
          progressMessage: jobStatus.data.progress_message,
          videoTitle: metadata.title,
        });
      }
      onJobStatusChange?.(s);
    } else if (s === "processing" || s === "pending") {
      const step = apiStep || "queued";
      setWorkflowStep(step);
      if (jobId && metadata) {
        setActiveJob({
          jobId,
          status: s,
          progressMessage: jobStatus.data.progress_message,
          videoTitle: metadata.title,
        });
      }
    }
  }, [jobStatus.data, apiStep, effectiveStatus, onJobStatusChange, setActiveJob, setPendingJobMetadata, jobId, metadata]);

  // ── Stale job: a 404 means the job no longer exists server-side ────
  // The backend returned 404 for this job ID (deleted / expired / DB reset).
  // useJobStatus already cleared the persisted store, which also clears
  // localStorage via zustand persist – so a refresh can no longer restore it.
  // Here we reset the local workflow UI back to the submission form instead
  // of leaving the card stuck on "Queued" polling a dead job ID forever.
  useEffect(() => {
    if (!jobStatus.error || !isNotFoundError(jobStatus.error)) return;

    setJobId(null);
    setShowWorkflow(false);
    setWorkflowStep("queued");
    setMetadata(null);
    setError(null);
    setActiveJob(null);
    setPendingJobMetadata(null);
    addToast("The previous processing job is no longer available. Start a new one.", "info");
    // Run only when the error changes; the setters are stable store actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobStatus.error, addToast]);

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

      const jobResult = await startProcessing.mutateAsync({ url: trimmed });
      setJobId(jobResult.job_id);

      // Persist to store immediately (backend remains the source of truth)
      setActiveJob({
        jobId: jobResult.job_id,
        status: jobResult.status,
        progressMessage: jobResult.progress_message || "Queued for processing",
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

      // If the backend returned an existing job (paused/interrupted/...),
      // show its actual stage instead of assuming "downloading".
      setWorkflowStep(mapProgressToStep(jobResult.progress_message) || "queued");

      onJobStatusChange?.("started");
    } catch (error: any) {
      const message = getErrorMessage(error);
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

  const handlePause = useCallback(async () => {
    if (!jobId) return;
    try {
      await pauseJob.mutateAsync(jobId);
      addToast("Processing paused — your progress is saved", "info");
    } catch (e: any) {
      addToast(getErrorMessage(e), "error");
    }
  }, [jobId, pauseJob, addToast]);

  const handleResume = useCallback(async () => {
    if (!jobId) return;
    try {
      await resumeJob.mutateAsync(jobId);
      addToast("Processing resumed", "info");
    } catch (e: any) {
      addToast(getErrorMessage(e), "error");
    }
  }, [jobId, resumeJob, addToast]);

  const handleCancel = useCallback(async () => {
    if (!jobId) return;
    setCancelConfirmOpen(false);
    try {
      await cancelJob.mutateAsync(jobId);
      addToast("Processing cancelled", "info");
      // The status-sync effect renders the cancelled state and clears the
      // persisted job once the API confirms.
    } catch (e: any) {
      addToast(getErrorMessage(e), "error");
    }
  }, [jobId, cancelJob, addToast]);

  const handleStartNew = useCallback(() => {
    setError(null);
    setShowWorkflow(false);
    setWorkflowStep("queued");
    setJobId(null);
    setMetadata(null);
    setActiveJob(null);
    setPendingJobMetadata(null);
    processedNoteRef.current = false;
  }, [setActiveJob, setPendingJobMetadata]);

  const handleRetry = useCallback(() => {
    // A failed job may still have checkpoints – retry resumes the SAME job
    // from its last completed stage instead of restarting from scratch.
    if (jobId) {
      void handleResume();
    } else {
      handleStartNew();
    }
  }, [jobId, handleResume, handleStartNew]);

  return (
    <div className={cn(
      "rounded-xl border bg-white shadow-sm transition-all duration-300 dark:bg-gray-900",
      "border-gray-200 dark:border-gray-800",
      "p-5",
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
      ) : isCancelled ? (
        /* ── Cancelled state: terminal, offer a fresh start ── */
        <div className="animate-fade-in">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-lg dark:bg-gray-700" aria-hidden="true">
              🛑
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">Processing Cancelled</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
              Your processing progress was discarded. You can start a completely new processing job whenever you're ready.
            </p>
            <Button variant="primary" size="md" onClick={handleStartNew} className="mt-4">
              Start New Generation
            </Button>
          </div>
        </div>
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

          {/* Paused / Interrupted banner */}
          {(effectiveStatus === "paused" || effectiveStatus === "interrupted") && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40" role="status">
              <span className="mt-0.5 text-base" aria-hidden="true">{effectiveStatus === "paused" ? "⏸️" : "⚠️"}</span>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {effectiveStatus === "paused" ? "Processing paused" : "Processing interrupted"}
                </p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300/80">
                  {effectiveStatus === "paused"
                    ? "Your progress is saved. Resume to continue from where you left off."
                    : "The connection to the server was lost. Your progress is saved — resume to continue."}
                </p>
              </div>
            </div>
          )}

          {/* Failed state */}
          {isFailed && error && (
            <div className="mb-4">
              <ErrorCard title="Processing Failed" message={error} onRetry={handleRetry} compact />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Retry continues from the last completed stage instead of starting over.
              </p>
            </div>
          )}

          {/* Progress bar – driven by the backend's stage-derived progress */}
          {jobStatus.data && !isFailed && (
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="truncate pr-3">
                  {status === "paused" ? "Paused — progress saved" : jobStatus.data.progress_message}
                </span>
                <span className="font-medium tabular-nums">{jobStatus.data.progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" role="progressbar" aria-valuenow={jobStatus.data.progress} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-700"
                  style={{ width: `${Math.min(jobStatus.data.progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Processing Timeline */}
          <div className="animate-slide-up">
            <ProcessingSteps
              currentStep={workflowStep}
              progressMessage={
                status === "paused"
                  ? "Paused — progress saved"
                  : jobStatus.data?.progress_message
              }
            />
          </div>

          {/* Controls */}
          <div className="mt-5 flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            {isActive && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePause}
                disabled={controlBusy}
                loading={pauseJob.isPending}
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                  </svg>
                }
              >
                Pause
              </Button>
            )}

            {isResumable && status !== "failed" && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleResume}
                disabled={controlBusy}
                loading={resumeJob.isPending}
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                  </svg>
                }
              >
                Resume
              </Button>
            )}

            {(isActive || isResumable) && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={controlBusy}
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v.75m-13.5 0v9.75A2.25 2.25 0 007.5 20.25h9a2.25 2.25 0 002.25-2.25v-9.75m-13.5 0h13.5M10.5 11.25v5.25m3-5.25v5.25" />
                  </svg>
                }
              >
                Cancel
              </Button>
            )}

            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Completed
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Cancel confirmation dialog ─────────────────────────────── */}
      {cancelConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          aria-describedby="cancel-dialog-description"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCancelConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 id="cancel-dialog-title" className="text-base font-semibold text-gray-900 dark:text-white">
              Cancel processing?
            </h3>
            <p id="cancel-dialog-description" className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Your current processing progress will be discarded.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCancelConfirmOpen(false)}
                disabled={cancelJob.isPending}
              >
                Keep Processing
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                loading={cancelJob.isPending}
              >
                Cancel Processing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
