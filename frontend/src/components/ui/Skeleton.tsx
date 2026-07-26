import { cn } from "@/utils/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      aria-label="Loading content"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="mb-2 h-5 w-3/4" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <Skeleton className="mb-1 h-8 w-12" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === 0 ? "w-1/3" : i === cols - 1 ? "w-1/6" : "w-1/4",
          )}
        />
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
