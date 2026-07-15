import { useState } from "react";
import { useVideoMetadata } from "@/services/videos.service";
import type { VideoMetadata } from "@/types";

export function VideoMetadataPage() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  const { mutate, isPending } = useVideoMetadata();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMetadata(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a YouTube URL");
      return;
    }

    // Quick client-side validation
    const ytPattern =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    if (!ytPattern.test(trimmed)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    mutate(
      { url: trimmed },
      {
        onSuccess: (data) => {
          setMetadata(data);
        },
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
          const detail =
            err.response?.data?.detail ||
            err.message ||
            "Failed to fetch video metadata";
          setError(detail);
        },
      },
    );
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "Unknown";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "Unknown";
    // yt-dlp returns YYYYMMDD format
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
  };

  const formatViewCount = (count: number | null): string => {
    if (!count) return "Unknown";
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
    return `${count.toLocaleString()} views`;
  };

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Extract Video Metadata
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Paste a YouTube URL to fetch video information without downloading
          </p>
        </div>

        {/* URL Input Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              disabled={isPending}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-5 py-3 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-3 font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-700 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Fetching...
                </>
              ) : (
                "Fetch Metadata"
              )}
            </button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-red-500">⚠️</span>
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  Error
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isPending && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Extracting video metadata...
            </p>
          </div>
        )}

        {/* Metadata Display */}
        {metadata && !isPending && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {/* Thumbnail */}
            {metadata.thumbnail_url && (
              <div className="relative aspect-video w-full bg-gray-100 dark:bg-gray-800">
                <img
                  src={metadata.thumbnail_url}
                  alt={metadata.title}
                  className="h-full w-full object-cover"
                />
                {metadata.duration && (
                  <span className="absolute bottom-3 right-3 rounded-lg bg-black/80 px-2.5 py-1 text-xs font-medium text-white">
                    {formatDuration(metadata.duration)}
                  </span>
                )}
              </div>
            )}

            {/* Details */}
            <div className="p-6">
              <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                {metadata.title}
              </h2>

              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {metadata.channel}
                </span>
                <span>•</span>
                <span>{formatDate(metadata.upload_date)}</span>
                <span>•</span>
                <span>{formatViewCount(metadata.view_count)}</span>
              </div>

              {/* Tags */}
              {metadata.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {metadata.tags.slice(0, 10).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {metadata.description && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Description
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {metadata.description.length > 500
                      ? `${metadata.description.slice(0, 500)}...`
                      : metadata.description}
                  </p>
                </div>
              )}

              {/* Video ID */}
              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Video ID:{" "}
                  <code className="font-mono text-gray-700 dark:text-gray-300">
                    {metadata.video_id}
                  </code>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
