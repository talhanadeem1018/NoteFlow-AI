import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, type Variants } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNotes } from "@/services/notes.service";
import { GenerateWorkflow } from "@/components/dashboard/GenerateWorkflow";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/cn";

// ─── Motion Variants ──────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, delay: i * 0.05, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

// ─── Stat Card ────────────────────────────────────────────────────────

interface StatCardData {
  icon: string;
  label: string;
  value: string | number;
  subtext: string;
  gradient: string;
  progress?: number;
}

function StatCard({ stat, index }: { stat: StatCardData; index: number }) {
  return (
    <motion.div
      variants={cardVariant}
      custom={index}
      className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/80"
    >
      {/* Gradient accent */}
      <div className={cn(
        "absolute -right-8 -top-8 h-20 w-20 rounded-full blur-2xl transition-all duration-500 group-hover:scale-150",
        stat.gradient,
      )} />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-white">
              {stat.value}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-gray-300">
            {stat.label}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {stat.subtext}
          </p>
        </div>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-700/50 bg-gray-800 text-lg">
          {stat.icon}
        </div>
      </div>

      {/* Progress bar */}
      {stat.progress !== undefined && (
        <div className="relative z-10 mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-700"
            style={{ width: `${Math.min(stat.progress, 100)}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Stat Skeleton ────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-7 w-16 animate-pulse rounded bg-gray-800" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-800" />
          <div className="h-3 w-20 animate-pulse rounded bg-gray-800" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-800" />
      </div>
    </div>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────

function NoteCard({ note, index }: { note: any; index: number }) {
  return (
    <motion.div variants={cardVariant} custom={index}>
      <Link
        to={`/dashboard/notes/${note.id}`}
        className="group relative block overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60 p-5 transition-all duration-300 hover:border-primary-500/30 hover:bg-gray-900/80 hover:shadow-lg hover:shadow-primary-500/5"
      >
        {/* Hover accent */}
        <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-primary-500/5 blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative z-10">
          {/* Title row */}
          <div className="mb-2.5 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">
              {note.title}
            </h3>
            {note.model_used && (
              <span className="shrink-0 rounded-md border border-gray-700/50 bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                {note.model_used}
              </span>
            )}
          </div>

          {/* Summary */}
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-400">
            {note.executive_summary || "No summary available"}
          </p>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              {new Date(note.created_at).toLocaleDateString()}
            </span>
            {note.processing_time > 0 && (
              <span className="inline-flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {note.processing_time.toFixed(1)}s
              </span>
            )}
          </div>

          {/* View link */}
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-400 opacity-0 transition-all duration-200 group-hover:opacity-100">
            View notes
            <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();
  const { data: notesData, isLoading } = useNotes(1, 50);
  const notesRef = useRef(null);
  const notesInView = useInView(notesRef, { once: true, margin: "-40px" });

  const hasCachedData = notesData !== undefined;
  const allNotes = useMemo(() => notesData?.data || [], [notesData]);
  const totalNotes = notesData?.total || 0;
  const recentNotes = useMemo(() => allNotes.slice(0, 3), [allNotes]);

  const videosProcessed = useMemo(() =>
    allNotes.filter((n) => n.processing_time > 0).length,
    [allNotes],
  );

  const statCards: StatCardData[] = [
    {
      icon: "📊",
      label: "Total Notes",
      value: totalNotes,
      subtext: "All time",
      gradient: "bg-primary-500/10",
      progress: Math.min((totalNotes / 50) * 100, 100),
    },
    {
      icon: "🎬",
      label: "Videos Processed",
      value: videosProcessed,
      subtext: videosProcessed > 0 ? "Completed successfully" : "No videos yet",
      gradient: "bg-emerald-500/10",
    },
  ];

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";

  return (
    <main className="relative mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary-600/5 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-violet-600/5 blur-[120px]" />
      </div>

      {/* ── Welcome Header ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          Welcome back{`, `}
          <span
            className="bg-gradient-to-r from-primary-300 via-primary-400 to-primary-500 bg-clip-text text-transparent"
            style={{
              background: 'linear-gradient(to right, #93c5fd, #60a5fa, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {userName}
          </span>
          <span className="text-white">!</span>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Generate AI-powered study notes from YouTube videos
        </p>
      </motion.div>

      {/* ── Stats Row ────────────────────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="grid gap-4 sm:grid-cols-3"
      >
        {!hasCachedData && isLoading ? (
          <>
            <StatSkeleton /><StatSkeleton /><StatSkeleton />
          </>
        ) : (
          statCards.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))
        )}
      </motion.div>

      {/* ── Quick Generate ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
        className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm"
      >
        <GenerateWorkflow onNoteGenerated={() => {}} />
      </motion.div>

      {/* ── Recent Notes ─────────────────────────────────────────── */}
      <div ref={notesRef}>
        <motion.div
          initial="hidden"
          animate={notesInView ? "visible" : "hidden"}
          variants={stagger}
          className="mb-4 flex items-center justify-between"
        >
          <div>
            <h2 className="text-base font-semibold text-white">Recent Notes</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {totalNotes > 0
                ? `Showing ${recentNotes.length} of ${totalNotes} notes`
                : "Your latest generated study notes"
              }
            </p>
          </div>
          {recentNotes.length > 0 && (
            <Link
              to="/dashboard/notes"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary-400 transition-colors hover:text-primary-300"
            >
              View all
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}
        </motion.div>

        {!hasCachedData && isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        ) : recentNotes.length === 0 ? (
          <motion.div variants={fadeUp}>
            <EmptyState
              icon="🎥"
              title="No notes yet"
              description="Paste a YouTube URL above and generate your first set of AI-powered notes!"
              compact
            />
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate={notesInView ? "visible" : "hidden"}
            variants={stagger}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {recentNotes.map((note, i) => (
              <NoteCard key={note.id} note={note} index={i} />
            ))}
          </motion.div>
        )}
      </div>
    </main>
  );
}
