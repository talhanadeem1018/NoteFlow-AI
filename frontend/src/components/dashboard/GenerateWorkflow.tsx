import { useState } from "react";
import { useVideoMetadata } from "@/services/videos.service";
import { useStartTranscription } from "@/services/transcription.service";
import { useGenerateNote } from "@/services/notes.service";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import type { VideoMetadata, AINote } from "@/types";

interface GenerateWorkflowProps {
  onNoteGenerated: (note: AINote) => void;
}

export function GenerateWorkflow({ onNoteGenerated }: GenerateWorkflowProps) {
  const { addToast } = useToast();
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<"idle" | "metadata" | "transcribing" | "generating" | "done">("idle");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  const fetchMetadata = useVideoMetadata();
  const startTranscription = useStartTranscription();
  const generateNote = useGenerateNote();

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

    try {
      // Step 1: Fetch metadata
      setStep("metadata");
      addToast("Fetching video metadata...", "info");
      
      const metadataResult = await fetchMetadata.mutateAsync({ url: trimmed });
      setMetadata(metadataResult);
      addToast("Video metadata fetched!", "success");

      // Step 2: Transcribe
      setStep("transcribing");
      addToast("Starting transcription...", "info");
      
      const transcriptionResult = await startTranscription.mutateAsync({ url: trimmed });
      addToast("Transcription complete!", "success");

      // Step 3: Generate notes
      setStep("generating");
      addToast("Generating AI notes...", "info");
      
      const noteResult = await generateNote.mutateAsync({
        transcript_id: transcriptionResult.id,
        force_regenerate: false,
      });
      
      setStep("done");
      addToast("Notes generated successfully!", "success");
      onNoteGenerated(noteResult);
      
      // Reset form
      setUrl("");
      setMetadata(null);
      setStep("idle");
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || "An error occurred";
      addToast(message, "error");
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
                {step === "transcribing" && "Transcribing audio..."}
                {step === "generating" && "Generating AI notes..."}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                This may take a few minutes for longer videos
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
          disabled={!url.trim()}
          className="w-full"
        >
          {isLoading ? "Processing..." : "Generate Notes"}
        </Button>
      </form>
    </div>
  );
}
