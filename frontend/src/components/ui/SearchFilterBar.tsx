import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/utils/cn";

export type SortOption = "newest" | "oldest" | "alphabetical" | "alphabetical-reverse" | "processing-time" | "longest-duration" | "shortest-duration";

export type TimeRange = "all-time" | "this-week" | "this-month";

type FilterProvider = string | "all";

export interface SearchFilterState {
  query: string;
  sort: SortOption;
  provider: FilterProvider;
  timeRange: TimeRange;
}

interface SearchFilterBarProps {
  onSearchChange: (query: string) => void;
  onSortChange: (sort: SortOption) => void;
  onProviderChange: (provider: FilterProvider) => void;
  onTimeRangeChange: (range: TimeRange) => void;
  availableProviders: string[];
  currentQuery: string;
  currentSort: SortOption;
  currentProvider: FilterProvider;
  currentTimeRange: TimeRange;
  totalResults: number;
  className?: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "longest-duration", label: "Longest Duration" },
  { value: "shortest-duration", label: "Shortest Duration" },
];

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all-time", label: "All Time" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
];

export function SearchFilterBar({
  onSearchChange,
  onSortChange,
  onProviderChange,
  onTimeRangeChange,
  availableProviders,
  currentQuery,
  currentSort,
  currentProvider,
  currentTimeRange,
  totalResults,
  className,
}: SearchFilterBarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
      if (providerRef.current && !providerRef.current.contains(e.target as Node)) {
        setProviderOpen(false);
      }
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) {
        setTimeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange],
  );

  const handleClearSearch = useCallback(() => {
    onSearchChange("");
  }, [onSearchChange]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === currentSort)?.label || "Sort";

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <input
          type="text"
          value={currentQuery}
          onChange={handleSearchInput}
          placeholder="Search by title, notes, keywords..."
          aria-label="Search notes"
          className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
        />
        {currentQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Sort Dropdown */}
      <div className="relative" ref={sortRef}>
        <button
          onClick={() => setSortOpen(!sortOpen)}
          className="inline-flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
          aria-haspopup="listbox"
          aria-expanded={sortOpen}
        >
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6M3 12h12M3 17h18" />
          </svg>
          <span className="hidden sm:inline">{currentSortLabel}</span>
          <svg className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", sortOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {sortOpen && (
          <div className="absolute right-0 z-20 mt-1 w-56 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800" role="listbox">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSortChange(option.value);
                  setSortOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-4 py-2 text-left text-sm transition-colors",
                  currentSort === option.value
                    ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700",
                )}
                role="option"
                aria-selected={currentSort === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Time Range Filter */}
      <div className="relative" ref={timeRef}>
        <button
          onClick={() => setTimeOpen(!timeOpen)}
          className="inline-flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
          aria-haspopup="listbox"
          aria-expanded={timeOpen}
        >
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span className="hidden sm:inline">{TIME_OPTIONS.find((o) => o.value === currentTimeRange)?.label || "All Time"}</span>
          <svg className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", timeOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {timeOpen && (
          <div className="absolute right-0 z-20 mt-1 w-44 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800" role="listbox">
            {TIME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onTimeRangeChange(option.value);
                  setTimeOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-4 py-2 text-left text-sm transition-colors",
                  currentTimeRange === option.value
                    ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700",
                )}
                role="option"
                aria-selected={currentTimeRange === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Provider Filter */}
      {availableProviders.length > 1 && (
        <div className="relative" ref={providerRef}>
          <button
            onClick={() => setProviderOpen(!providerOpen)}
            className="inline-flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
            aria-haspopup="listbox"
            aria-expanded={providerOpen}
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span className="hidden sm:inline">{currentProvider === "all" ? "All Providers" : currentProvider}</span>
            <svg className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", providerOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {providerOpen && (
            <div className="absolute right-0 z-20 mt-1 w-48 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800" role="listbox">
              <button
                onClick={() => {
                  onProviderChange("all");
                  setProviderOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-4 py-2 text-left text-sm transition-colors",
                  currentProvider === "all"
                    ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700",
                )}
                role="option"
                aria-selected={currentProvider === "all"}
              >
                All Providers
              </button>
              {availableProviders.map((provider) => (
                <button
                  key={provider}
                  onClick={() => {
                    onProviderChange(provider);
                    setProviderOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-4 py-2 text-left text-sm transition-colors",
                    currentProvider === provider
                      ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700",
                  )}
                  role="option"
                  aria-selected={currentProvider === provider}
                >
                  {provider}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
        {totalResults} {totalResults === 1 ? "result" : "results"}
      </div>
    </div>
  );
}
