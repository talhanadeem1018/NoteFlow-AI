import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      {/* Hero Section */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          AI-Powered Notes
        </div>

        <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Turn YouTube Videos into
          <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
            {" "}Study Notes
          </span>
        </h1>

        <p className="mb-10 text-lg text-gray-600 dark:text-gray-400">
          Paste any YouTube URL and get AI-generated summaries, notes, quizzes,
          and flashcards in seconds. Learn smarter, not harder.
        </p>

        {/* URL Input */}
        <div className="mx-auto mb-8 flex max-w-lg flex-col gap-3 sm:flex-row">
          <input
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 rounded-xl border border-gray-300 bg-white px-5 py-3 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
          />
          <button className="rounded-xl bg-primary-600 px-8 py-3 font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-600/30 active:scale-[0.98]">
            Generate Notes
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-500">
          No credit card required • Free tier available
        </p>
      </div>

      {/* Features Grid */}
      <div className="mx-auto mt-24 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-primary-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-800"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-2xl dark:bg-primary-950">
              {feature.icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              {feature.title}
            </h3>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-24 text-center">
        <p className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
          Built for students, educators, and lifelong learners
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          Get Started
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </Link>
      </div>
    </main>
  );
}

const features = [
  {
    icon: "📝",
    title: "Smart Summaries",
    description:
      "Get concise, well-structured summaries of any YouTube video using advanced AI.",
  },
  {
    icon: "🧠",
    title: "Study Quizzes",
    description:
      "Auto-generated quizzes to test your understanding and reinforce key concepts.",
  },
  {
    icon: "🎴",
    title: "Flashcards",
    description:
      "Spaced-repetition ready flashcards extracted from video content automatically.",
  },
  {
    icon: "⚡",
    title: "Instant Processing",
    description:
      "Transcript extraction and AI generation happen in seconds, not minutes.",
  },
  {
    icon: "🎯",
    title: "Multiple Providers",
    description:
      "Choose between GPT, Claude, or Gemini for your preferred AI experience.",
  },
  {
    icon: "🔒",
    title: "Private & Secure",
    description:
      "Your notes are encrypted and only accessible to you. We never share your data.",
  },
];
