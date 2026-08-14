import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { APP_NAME, API_ENDPOINTS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/stores/app.store";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { isNotFoundError } from "@/services/processing.service";
import { cn } from "@/utils/cn";
import type { ProcessingStatusResponse } from "@/types";

/** Small animated dot for the processing indicator */
function ProcessingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
    </span>
  );
}

/** Pill badge shown in the header when a job is processing on any page.
 *  Polls the backend every 5s so the badge stays fresh across page navigation. */
function ActiveJobBadge() {
  const activeJob = useAppStore((s) => s.activeJob);
  const setActiveJob = useAppStore((s) => s.setActiveJob);
  const setPendingJobMetadata = useAppStore((s) => s.setPendingJobMetadata);
  const { addToast } = useToast();
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Poll job status while activeJob exists (even on other pages).
  // Only poll from the header when NOT on the dashboard to avoid
  // duplicating the polling done by GenerateWorkflow's useJobStatus.
  // Polling is gated on authentication to avoid useless 401 requests
  // while the Supabase session is loading or after sign-out.
  useEffect(() => {
    if (!activeJob?.jobId || !isAuthenticated) return;

    const interval = window.setInterval(async () => {
      // Skip polling on the dashboard — GenerateWorkflow/useJobStatus handles
      // it there, and two pollers would duplicate requests.
      if (location.pathname === "/dashboard") return;
      try {
        const current = useAppStore.getState().activeJob;
        if (!current) return;
        const { data } = await api.get<ProcessingStatusResponse>(
          API_ENDPOINTS.processing.byId(current.jobId),
        );
        if (data.status === "completed") {
          setActiveJob(null);
          setPendingJobMetadata(null);
          addToast("Your notes are ready!", "success");
        } else if (data.status === "failed") {
          setActiveJob(null);
          setPendingJobMetadata(null);
          addToast(data.error_message || "Processing failed", "error");
        } else if (data.status === "cancelled") {
          // Terminal – clear the persisted badge state.
          setActiveJob(null);
          setPendingJobMetadata(null);
        } else if (data.status === "paused" || data.status === "interrupted") {
          // Stable – keep the badge so the user can return and resume.
          setActiveJob({
            ...current,
            status: data.status,
            progressMessage: data.progress_message,
          });
        } else {
          setActiveJob({
            ...current,
            status: data.status,
            progressMessage: data.progress_message,
          });
        }
      } catch (error) {
        if (isNotFoundError(error)) {
          // The job was deleted server-side – drop the persisted badge so we
          // stop polling a non-existent job and a refresh can't restore it.
          setActiveJob(null);
          setPendingJobMetadata(null);
        }
        // Other errors (network/auth) are transient – keep polling next tick.
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeJob?.jobId, isAuthenticated, location.pathname, setActiveJob, setPendingJobMetadata, addToast]);

  if (!activeJob) return null;

  const isOnDashboard = location.pathname === "/dashboard";
  const isPaused = activeJob.status === "paused";
  const isInterrupted = activeJob.status === "interrupted";

  return (
    <Link
      to="/dashboard"
      className={cn(
        "group inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200",
        isPaused || isInterrupted
          ? "border-amber-800/40 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50 hover:border-amber-700/60"
          : "border-primary-800/40 bg-primary-900/30 text-primary-300 hover:bg-primary-900/50 hover:border-primary-700/60",
      )}
    >
      {isPaused || isInterrupted ? (
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
      ) : (
        <ProcessingDot />
      )}
      <span className="hidden sm:inline truncate max-w-[140px]">
        {activeJob.videoTitle || "Processing video"}
      </span>
      <span className="sm:hidden">{isPaused || isInterrupted ? "Paused" : "Processing"}</span>
      {!isOnDashboard && (
        <svg className="h-3 w-3 text-current opacity-70 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      )}
    </Link>
  );
}

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const NAV_LINKS = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "My Notes", href: "/dashboard/notes" },
    { name: "Profile", href: "/dashboard/profile" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label={`${APP_NAME} Home`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white transition-transform hover:scale-105">
              N
            </span>
            <span className="hidden sm:block text-lg font-bold text-gray-900 dark:text-white">
              {APP_NAME}
            </span>
          </Link>

          {/* Primary Nav — authenticated only */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className={cn(
                    "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "text-primary-700 dark:text-primary-300"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800",
                  )}
                >
                  {link.name}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-4/5 -translate-x-1/2 rounded-full bg-primary-500" />
                  )}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Processing indicator — visible from any page */}
          <ActiveJobBadge />

          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-primary-500 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-label="User menu"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-800 dark:text-primary-300">
                  {((user?.user_metadata?.full_name || user?.email || "U")[0] || "U").toUpperCase()}
                </span>
                <span className="hidden sm:block max-w-[120px] truncate">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                </span>
                <svg
                  className={cn("h-3.5 w-3.5 text-gray-400 transition-transform duration-200", menuOpen && "rotate-180")}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Animated dropdown */}
              <div
                className={cn(
                  "absolute right-0 z-50 mt-1 w-48 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800",
                  "transition-all duration-150 ease-out",
                  menuOpen
                    ? "visible opacity-100 scale-100"
                    : "invisible opacity-0 scale-95 pointer-events-none",
                )}
                role="menu"
              >
                <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {user?.user_metadata?.full_name || user?.email || "User"}
                  </p>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                    role="menuitem"
                  >
                    <span className="text-base" aria-hidden="true">🚪</span>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-primary-500 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-primary-500 active:scale-[0.98]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
