import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, type Variants } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

// ─── Motion Variants ──────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.05, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

// ─── Reusable Section Wrapper ─────────────────────────────────────────

function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="relative px-4 sm:px-6 lg:px-8">
      {children}
    </section>
  );
}

function SectionHeader({
  tag,
  title,
  description,
}: {
  tag: string;
  title: string;
  description: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}              className="mx-auto mb-10 max-w-2xl text-center"
    >
      <motion.span
        variants={fadeUp}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-400"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
        {tag}
      </motion.span>
      <motion.h2
        variants={fadeUp}
        className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
      >
        {title}
      </motion.h2>
      <motion.p
        variants={fadeUp}
        className="mt-4 text-base leading-relaxed text-gray-400"
      >
        {description}
      </motion.p>
    </motion.div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────

function HeroSection() {
  const { isAuthenticated } = useAuth();
  return (
    <Section>
      <div className="mx-auto max-w-7xl pt-12 pb-6 sm:pt-16 sm:pb-10 lg:pt-20 lg:pb-12">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left: Text */}
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            >
              {/* Badge */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
                </span>
                AI-Powered Study Companion
              </div>

              {/* Headline */}
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem]">
                Transform YouTube Lectures into{" "}
                <span
                  className="text-primary-300"
                  style={{
                    background: 'linear-gradient(to right, #93c5fd, #60a5fa, #2563eb)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Intelligent Study Notes
                </span>
              </h1>

              {/* Description */}
              <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-400 sm:text-lg">
                NoteFlow AI converts your lecture videos into comprehensive
                summaries, key concepts, and structured study notes in seconds.
                Paste a YouTube URL and get AI-generated material ready for
                review.
              </p>

              {/* CTA */}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  to="/dashboard"
                  className={`group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/50 hover:-translate-y-0.5 active:scale-[0.97] before:absolute before:inset-0 before:rounded-xl before:opacity-0 before:transition-opacity before:duration-300 before:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_70%)] hover:before:opacity-100 ${isAuthenticated ? 'ring-2 ring-primary-300/30 ring-offset-2 ring-offset-gray-950 animate-[glow-pulse_2s_ease-in-out_infinite]' : ''}`}
                >
                  {/* Shine sweep */}
                  <span className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {/* Pulsing glow ring - always active when authenticated */}
                  <span className={`absolute -inset-1 rounded-xl bg-gradient-to-r from-primary-400 to-primary-600 ${isAuthenticated ? 'opacity-70 blur-md animate-pulse' : 'opacity-0 blur-md'} transition-opacity duration-300 group-hover:opacity-60`} />
                  <span className="relative z-10">
                    {isAuthenticated ? (
                      <>
                        <span className="inline-flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Go to Dashboard
                        </span>
                      </>
                    ) : (
                      "Get Started"
                    )}
                  </span>
                  <svg
                    className="relative z-10 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
                {!isAuthenticated && (
                  <p className="text-sm text-gray-500">No credit card required</p>
                )}
              </div>

              {/* Social proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-6 flex items-center gap-5 border-t border-gray-800 pt-4"
              >
                <div className="flex -space-x-2">
                  {[
                    "https://i.pravatar.cc/32?u=a",
                    "https://i.pravatar.cc/32?u=b",
                    "https://i.pravatar.cc/32?u=c",
                    "https://i.pravatar.cc/32?u=d",
                  ].map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="h-8 w-8 rounded-full border-2 border-gray-900"
                    />
                  ))}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-900 bg-primary-600 text-[10px] font-bold text-white">
                    +4K
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Loved by 4,000+ students
                  </p>
                  <div className="flex items-center gap-1 text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-1 text-xs text-gray-500">5.0</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Right: Product Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
            className="relative z-0 hidden lg:block"
          >
            {/* Floating glow */}
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-600/20 blur-[100px]" />
            <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-purple-600/15 blur-[80px]" />

            {/* Mockup */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/80 shadow-2xl shadow-primary-600/10 backdrop-blur-xl">
              {/* Mac-style window chrome */}
              <div className="flex items-center gap-2 border-b border-gray-800 px-5 py-3.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <div className="ml-3 flex-1 text-center text-[11px] font-medium text-gray-500">
                  NoteFlow AI — My Notes
                </div>
              </div>

              {/* Mockup content */}
              <div className="space-y-4 p-5">
                {/* Search bar */}
                <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/50 px-3.5 py-2.5">
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <span className="text-sm text-gray-500">Search notes...</span>
                  <span className="ml-auto rounded border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-600">⌘K</span>
                </div>

                {/* Note card 1 */}
                <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-red-500/30" />
                        <h4 className="text-sm font-semibold text-white">Introduction to Neural Networks</h4>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">3Blue1Brown · 22 min</p>
                    </div>
                    <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                      Completed
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-gray-400">
                    Neural networks are computing systems inspired by biological neural networks. They consist of layers of interconnected nodes (neurons) that process data using weighted connections...
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["Deep Learning", "AI", "Mathematics"].map((tag) => (
                      <span key={tag} className="rounded-md bg-gray-700/50 px-2 py-0.5 text-[10px] text-gray-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Note card 2 */}
                <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-blue-500/30" />
                        <h4 className="text-sm font-semibold text-white">Quantum Field Theory Explained</h4>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">MIT OpenCourseWare · 45 min</p>
                    </div>
                    <span className="rounded-md bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
                      Processing
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-gray-400">
                    Quantum field theory combines classical field theory, special relativity, and quantum mechanics. It provides a theoretical framework for constructing quantum mechanical models...
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["Physics", "Quantum", "Advanced"].map((tag) => (
                      <span key={tag} className="rounded-md bg-gray-700/50 px-2 py-0.5 text-[10px] text-gray-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom status */}
                <div className="flex items-center justify-between rounded-lg bg-primary-500/5 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary-400" />
                    <span className="text-xs text-primary-300">AI processing live</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Last generated 2m ago</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    title: "Smart Summaries",
    description:
      "Get concise, well-structured summaries that capture every key insight from your lecture videos.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    title: "Key Concepts",
    description:
      "Automatically extracted key concepts, terminology, and principles with clear explanations.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "Structured Notes",
    description:
      "Well-organized notes with bullet points, action items, and detailed breakdowns for effective study sessions.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Quiz Generation",
    description:
      "Auto-generated quizzes test your understanding and reinforce retention of lecture material.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
      </svg>
    ),
    title: "Flashcards",
    description:
      "Spaced-repetition ready flashcards extracted from video content to accelerate long-term memory.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Multiple AI Models",
    description:
      "Choose between GPT, Claude, or Gemini — whichever model gives you the best results for your subject matter.",
  },
];

function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <Section>
      <div ref={ref} className="mx-auto max-w-7xl py-16 lg:py-20">
        <SectionHeader
          tag="Features"
          title="Everything You Need to Master Any Subject"
          description="From transcript to comprehensive study material in seconds. NoteFlow AI extracts, organizes, and optimizes your lecture content."
        />

        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={cardVariant}
              custom={i}
              className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60 p-5 transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/80 hover:shadow-lg hover:shadow-primary-500/5"
            >
              {/* Gradient corner accent */}
              <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-primary-500/5 blur-xl transition-all duration-500 group-hover:bg-primary-500/10 group-hover:scale-150" />

              <div className="relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-gray-700/50 bg-gray-800 text-primary-400 transition-colors duration-300 group-hover:border-primary-500/30 group-hover:bg-primary-500/10">
                {f.icon}
              </div>
              <h3 className="relative z-10 mb-2 text-base font-semibold text-white">
                {f.title}
              </h3>
              <p className="relative z-10 text-sm leading-relaxed text-gray-400">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────

const steps = [
  {
    number: "01",
    title: "Paste a YouTube URL",
    description:
      "Copy any lecture, tutorial, or educational video URL from YouTube and paste it into NoteFlow AI.",
    color: "from-primary-500 to-primary-600",
  },
  {
    number: "02",
    title: "AI Processes Your Video",
    description:
      "Our AI extracts the transcript, identifies key concepts, and generates comprehensive study notes in real-time.",
    color: "from-purple-500 to-purple-600",
  },
  {
    number: "03",
    title: "Review & Study",
    description:
      "Access your structured notes, summaries, flashcards, and quizzes — optimized for your learning style and ready to use.",
    color: "from-cyan-500 to-cyan-600",
  },
];

function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <Section>          <div ref={ref} className="mx-auto max-w-7xl py-16 lg:py-20">
        <SectionHeader
          tag="How It Works"
          title="Three Simple Steps to Smarter Studying"
          description="No setup, no configuration. Turn any lecture video into study-ready material in under a minute."
        />

        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="relative grid gap-8 md:grid-cols-3"
        >
          {/* Connecting line (desktop) */}
          <div className="absolute left-0 right-0 top-16 hidden h-px bg-gradient-to-r from-primary-500/0 via-primary-500/40 to-primary-500/0 md:block" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              variants={cardVariant}
              className="relative flex flex-col items-center text-center"
            >
              {/* Number badge */}
              <div className="relative mb-6">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} shadow-lg`}
                >
                  <span className="text-lg font-bold text-white">
                    {step.number}
                  </span>
                </div>
                {/* Connector dot */}
                {i < steps.length - 1 && (
                  <div className="absolute left-1/2 top-16 hidden h-6 w-px -translate-x-1/2 bg-gradient-to-b from-primary-500/40 to-transparent md:block" />
                )}
              </div>

              <h3 className="mb-3 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-gray-400">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

// ─── AI Technology Stack ──────────────────────────────────────────────

const technologies = [
  {
    name: "Whisper AI",
    description: "OpenAI's state-of-the-art speech recognition",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-900/30",
  },
  {
    name: "GPT-4o",
    description: "Advanced language understanding & generation",
    gradient: "from-primary-500/20 to-primary-500/5",
    border: "border-primary-900/30",
  },
  {
    name: "Claude 3.5",
    description: "Anthropic's reasoning & analysis model",
    gradient: "from-purple-500/20 to-purple-500/5",
    border: "border-purple-900/30",
  },
  {
    name: "Gemini Pro",
    description: "Google's multimodal AI capabilities",
    gradient: "from-cyan-500/20 to-cyan-500/5",
    border: "border-cyan-900/30",
  },
  {
    name: "yt-dlp",
    description: "High-performance video extraction engine",
    gradient: "from-orange-500/20 to-orange-500/5",
    border: "border-orange-900/30",
  },
  {
    name: "Supabase",
    description: "Real-time data storage & authentication",
    gradient: "from-green-500/20 to-green-500/5",
    border: "border-green-900/30",
  },
];

function TechStackSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <Section>              <div ref={ref} className="mx-auto max-w-7xl py-16 lg:py-20">
        <SectionHeader
          tag="Technology Stack"
          title="Powered by Industry-Leading AI"
          description="We combine the best models and tools to deliver accurate, reliable study material from any video content."
        />

        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {technologies.map((tech) => (
            <motion.div
              key={tech.name}
              variants={cardVariant}
              className={`group relative overflow-hidden rounded-xl border ${tech.border} bg-gradient-to-br ${tech.gradient} p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="relative z-10">
                <h3 className="text-sm font-semibold text-white">
                  {tech.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">
                  {tech.description}
                </p>
              </div>
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="absolute -right-10 -top-10 h-20 w-20 rounded-full bg-white/5 blur-xl" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────

function FinalCTASection() {
  const { isAuthenticated } = useAuth();
  return (
    <Section>
      <div className="mx-auto max-w-7xl py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
          className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 px-6 py-12 text-center shadow-2xl sm:px-12"
        >
          {/* Decorative gradients */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary-600/10 blur-[100px]" />
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-purple-600/10 blur-[100px]" />

          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Transform Your Learning?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-gray-400">
              Join thousands of students who are studying smarter, not harder.
              Start generating AI-powered notes from your lectures today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className={`group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-primary-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/50 hover:-translate-y-0.5 active:scale-[0.97] before:absolute before:inset-0 before:rounded-xl before:opacity-0 before:transition-opacity before:duration-300 before:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_70%)] hover:before:opacity-100 ${isAuthenticated ? 'ring-2 ring-primary-300/30 ring-offset-2 ring-offset-gray-950 animate-[glow-pulse_2s_ease-in-out_infinite]' : ''}`}
              >
                {/* Shine sweep */}
                <span className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {/* Pulsing glow ring - always active when authenticated */}
                <span className={`absolute -inset-1 rounded-xl bg-gradient-to-r from-primary-400 to-primary-600 ${isAuthenticated ? 'opacity-70 blur-md animate-pulse' : 'opacity-0 blur-md'} transition-opacity duration-300 group-hover:opacity-60`} />
                <span className="relative z-10">
                  {isAuthenticated ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Go to Dashboard
                    </span>
                  ) : (
                    "Get Started Free"
                  )}
                </span>
                <svg
                  className="relative z-10 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="group relative inline-flex items-center gap-2 rounded-xl border border-gray-700 px-7 py-3.5 font-medium text-gray-300 transition-all duration-200 hover:border-primary-500/50 hover:text-white hover:shadow-lg hover:shadow-primary-500/10 active:scale-[0.97]"
                >
                  Sign In
                </Link>
              )}
            </div>
            {!isAuthenticated && (
              <p className="mt-5 text-xs text-gray-500">
                No credit card required · Free tier available · Cancel anytime
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────

export function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary-600/5 blur-[150px]" />
        <div className="absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full bg-purple-600/5 blur-[150px]" />
        <div className="absolute -bottom-32 left-1/3 h-[350px] w-[350px] rounded-full bg-cyan-600/5 blur-[150px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TechStackSection />
      <FinalCTASection />
    </main>
  );
}
