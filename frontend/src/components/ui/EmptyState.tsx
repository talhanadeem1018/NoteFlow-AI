import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center text-center overflow-hidden",
        compact
          ? "rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-800"
          : "rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-gray-900",
        className,
      )}
      role="status"
    >
      {/* Decorative background shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className={cn(
          "absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-[0.04]",
          compact ? "h-16 w-16 -top-4 -right-4" : "h-24 w-24",
        )} style={{ background: "radial-gradient(circle, var(--color-primary-500) 0%, transparent 70%)" }} />
        <div className={cn(
          "absolute -bottom-8 -left-8 h-32 w-32 rounded-full opacity-[0.03]",
          compact ? "h-20 w-20 -bottom-5 -left-5" : "h-32 w-32",
        )} style={{ background: "radial-gradient(circle, var(--color-primary-400) 0%, transparent 70%)" }} />
      </div>

      <div
        className={cn(
          "relative mb-4 flex items-center justify-center rounded-full",
          compact ? "mb-3 text-4xl" : "mb-4 text-6xl",
        )}
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3
        className={cn(
          "font-semibold text-gray-900 dark:text-white",
          compact ? "text-sm" : "text-lg",
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "mt-1 text-gray-500 dark:text-gray-400",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {description}
        </p>
      )}
      {action && <div className={cn("mt-4", compact ? "mt-3" : "mt-6")}>{action}</div>}
    </div>
  );
}
