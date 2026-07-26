import { useRef } from "react";
import { motion, useInView, type Variants } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { APP_NAME } from "@/lib/constants";

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

function ProfileCard({
  label,
  value,
  icon,
  index,
}: {
  label: string;
  value: string;
  icon: string;
  index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/80"
    >
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary-500/5 blur-2xl transition-all duration-500 group-hover:scale-150" />
      <div className="relative z-10 flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-700/50 bg-gray-800 text-lg">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold text-white break-all">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  const fullName = user?.user_metadata?.full_name || "—";
  const email = user?.email || "—";
  const userId = user?.id || "—";
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const avatarLetter = (fullName !== "—" ? fullName[0] : email[0] || "U").toUpperCase();

  return (
    <main className="relative mx-auto max-w-3xl p-4 sm:p-6">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary-600/5 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-violet-600/5 blur-[120px]" />
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div
        ref={headerRef}
        initial="hidden"
        animate={headerInView ? "visible" : "hidden"}
        variants={stagger}
        className="mb-8 text-center"
      >
        {/* Avatar */}
        <motion.div
          variants={fadeUp}
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/20 ring-2 ring-primary-400/20"
        >
          <span className="text-2xl font-bold text-white">{avatarLetter}</span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-xl font-bold tracking-tight text-white sm:text-2xl"
        >
          {fullName !== "—" ? fullName : "Your Profile"}
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mt-1 text-sm text-gray-400"
        >
          Manage your {APP_NAME} account
        </motion.p>
      </motion.div>

      {/* ── Info Cards ──────────────────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate={headerInView ? "visible" : "hidden"}
        variants={stagger}
        className="space-y-3"
      >
        <ProfileCard label="Full Name" value={fullName} icon="👤" index={0} />
        <ProfileCard label="Email Address" value={email} icon="📧" index={1} />
        <ProfileCard label="User ID" value={userId} icon="🔑" index={2} />
        <ProfileCard label="Member Since" value={createdAt} icon="📅" index={3} />
      </motion.div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-8 text-center text-xs text-gray-600"
      >
        {APP_NAME} &copy; {new Date().getFullYear()}
      </motion.p>
    </main>
  );
}
