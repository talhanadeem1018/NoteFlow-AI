import { type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { Skeleton } from "@/components/ui/Skeleton";

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    text: string;
  };
  color?: "primary" | "green" | "blue" | "purple" | "amber";
  children?: ReactNode;
  className?: string;
  isLoading?: boolean;
}

type ColorKey = "primary" | "green" | "blue" | "purple" | "amber";

const colorStyles: Record<ColorKey, { icon: string; text: string; bar: string }> = {
  primary: {
    icon: "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
    text: "text-primary-600 dark:text-primary-400",
    bar: "bg-primary-500",
  },
  green: {
    icon: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    text: "text-green-600 dark:text-green-400",
    bar: "bg-green-500",
  },
  blue: {
    icon: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    text: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
  },
  purple: {
    icon: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    text: "text-purple-600 dark:text-purple-400",
    bar: "bg-purple-500",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
};

export function StatsCard({
  icon,
  label,
  value,
  subtext,
  trend,
  color = "primary",
  children,
  className,
  isLoading = false,
}: StatsCardProps) {
  const styles = colorStyles[color];

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900", className)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="mb-1 h-8 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className={cn("text-2xl font-bold tracking-tight", styles.text)}>
            {value}
          </div>
          <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {label}
          </div>
          {subtext && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {subtext}
            </p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span
                className={cn(
                  trend.direction === "up" && "text-green-600 dark:text-green-400",
                  trend.direction === "down" && "text-red-600 dark:text-red-400",
                  trend.direction === "neutral" && "text-gray-500 dark:text-gray-400",
                )}
              >
                {trend.direction === "up" && "↑"}
                {trend.direction === "down" && "↓"}
                {trend.direction === "neutral" && "→"}
              </span>
              <span className="text-gray-500 dark:text-gray-400">{trend.text}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-lg",
            styles.icon,
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function StatsCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}
