import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

interface ErrorCardProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorCard({
  title = "Error",
  message,
  onRetry,
  className,
  compact = false,
}: ErrorCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
        compact ? "p-4" : "p-6",
        className,
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn("mt-0.5 flex-shrink-0", compact ? "text-base" : "text-lg")}
          aria-hidden="true"
        >
          ⚠️
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-red-800 dark:text-red-200">{title}</p>
          <p
            className={cn(
              "mt-1 text-red-600 dark:text-red-400",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {message}
          </p>
          {onRetry && (
            <Button
              variant="danger"
              size="sm"
              onClick={onRetry}
              className="mt-3"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
