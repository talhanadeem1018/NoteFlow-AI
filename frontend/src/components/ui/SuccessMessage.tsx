import { cn } from "@/utils/cn";

interface SuccessMessageProps {
  title?: string;
  message: string;
  className?: string;
  compact?: boolean;
}

export function SuccessMessage({
  title = "Success",
  message,
  className,
  compact = false,
}: SuccessMessageProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
        compact ? "p-4" : "p-6",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-200 text-sm dark:bg-green-800">
          <span className="text-green-700 dark:text-green-300">✓</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-green-800 dark:text-green-200">{title}</p>
          <p
            className={cn(
              "mt-1 text-green-600 dark:text-green-400",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
