import { useState, useEffect, useRef } from "react";
import { useVideoMetadata } from "@/services/videos.service";
import { useStartProcessing, useJobStatus } from "@/services/processing.service";
import { useNote } from "@/services/notes.service";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import type { VideoMetadata, AINote } from "@/types";

interface GenerateWorkflowProps {
  onNoteGenerated: (note: AINote) => void;
}

/**
 * GenerateWorkflow – orchestrates the full video → notes pipeline.
 *
 * Flow:
 *   1. Fetch video metadata (fast, synchronous HTTP)
 *   2. Start background processing (returns job_id immediately)
 *   3. Poll job status every 5 seconds
 *   4. When completed → fetch and display generated note
 *
 * This eliminates request timeouts for long videos by decoupling
 * the processing pipeline from the HTTP request lifecycle.
 */
export function GenerateWorkflow({ onNoteGenerated }: GenerateWorkflowProps) {
  const { addToast } = useToast();
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<"idle" | "metadata" | "processing" | "done">("idle");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Track whether polling has completed to avoid double-fetching notes
  const processedNoteRef = useRef<boolean>(false);

  const fetchMetadata = useVideoMetadata();
  const startProcessing = useStartProcessing();
  const jobStatus = useJobStatus(jobId);
  // Fetch the completed note when job finishes
  // Note: useNote accepts string, so we use ?? "" to satisfy TypeScript.
  // The hook's internal `enabled: !!id` guard prevents fetching empty strings.
  const completedNote = useNote(jobStatus.data?.note_id ?? "");

  // When job completes → the useNote query auto-fetches the note
  useEffect(() => {
    if (
      jobStatus.data?.status === "completed" &&
      completedNote.data &&
      !processedNoteRef.current
    ) {
      processedNoteRef.current = true;
      setStep("done");
      addToast("Notes generated successfully!", "success");

      // Map the NoteRead response to AINote format
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

      onNoteGenerated(note);

      // Reset form
      setUrl("");
      setMetadata(null);
      setJobId(null);
      setStep("idle");
      processedNoteRef.current = false;
    }
  }, [jobStatus.data?.status, completedNote.data, onNoteGenerated, addToast]);

  // When job fails
  useEffect(() => {
    if (jobStatus.data?.status === "failed") {
      const errorMsg = jobStatus.data.error_message || "Processing failed";
      addToast(errorMsg, "error");
      setMetadata(null);
      setJobId(null);
      setUrl("");
      setStep("idle");
      processedNoteRef.current = false;
    }
  }, [jobStatus.data?.status, jobStatus.data?.error_message, addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = url.trim();
    if (!trimmed) {
      addToast("Please enter a YouTube URL", "warning");
      return;
    }

    // Validate YouTube URL
    const ytPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    if (!ytPattern.test(trimmed)) {
      addToast("Please enter a valid YouTube URL", "error");
      return;
    }

    // Reset state for new processing
    setMetadata(null);
    setJobId(null);
    processedNoteRef.current = false;

    try {
      // Step 1: Fetch metadata
      setStep("metadata");
      addToast("Fetching video metadata...", "info");

      const metadataResult = await fetchMetadata.mutateAsync({ url: trimmed });
      setMetadata(metadataResult);
      addToast("Video metadata fetched!", "success");

      // Step 2: Start background processing
      setStep("processing");
      addToast("Starting background processing...", "info");

      const jobResult = await startProcessing.mutateAsync({ url: trimmed });
      setJobId(jobResult.job_id);
      addToast("Processing started! This may take a few minutes for longer videos.", "info");
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || "An error occurred";
      addToast(message, "error");
      setMetadata(null);
      setUrl("");
      setStep("idle");
    }
  };

  const isLoading = step !== "idle" && step !== "done";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Generate Notes
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Paste a YouTube URL to create AI-powered study notes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            disabled={isLoading}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>

        {/* Progress indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {step === "metadata" && "Fetching video information..."}
                {step === "processing" && (
                  <>
                    {jobStatus.data?.progress_message === "Transcribing audio..."
                      ? "Transcribing audio..."
                      : jobStatus.data?.progress_message === "Generating AI notes..."
                        ? "Generating AI notes..."
                        : "Processing video..."}
                  </>
                )}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {step === "processing" && "This may take a few minutes for longer videos. We'll notify you when it's done."}
              </span>
            </div>
          </div>
        )}

        {/* Metadata preview */}
        {metadata && !isLoading && (
          <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            {metadata.thumbnail_url && (
              <img
                src={metadata.thumbnail_url}
                alt={metadata.title}
                className="h-16 w-28 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {metadata.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {metadata.channel}
              </p>
            </div>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          loading={isLoading}
          disabled={!url.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? "Processing..." : "Generate Notes"}
        </Button>
      </form>
    </div>
  );
}
