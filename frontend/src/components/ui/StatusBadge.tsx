import { cn } from "@/utils/cn";

type StatusVariant =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "info"
  | "success"
  | "warning"
  | "error";

interface StatusBadgeProps {
  variant: StatusVariant;
  children: string;
  className?: string;
  animate?: boolean;
}

const variantStyles: Record<StatusVariant, string> = {
  pending:
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  processing:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  completed:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  failed:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  info:
    "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700",
  success:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  warning:
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  error:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
};

export function StatusBadge({
  variant,
  children,
  className,
  animate = false,
}: StatusBadgeProps) {
  const isProcessing = variant === "processing";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        animate && isProcessing && "animate-pulse",
        className,
      )}
    >
      {isProcessing && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {variant === "completed" && (
        <span className="text-green-600 dark:text-green-400">✓</span>
      )}
      {variant === "failed" && (
        <span className="text-red-600 dark:text-red-400">✕</span>
      )}
      {children}
    </span>
  );
}
