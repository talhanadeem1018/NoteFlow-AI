import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center animate-fade-in">
      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center justify-center blur-3xl">
          <div className="h-32 w-32 rounded-full bg-primary-200/30 dark:bg-primary-800/20" />
        </div>
        <p className="relative text-8xl sm:text-9xl font-bold bg-gradient-to-b from-gray-200 to-gray-100 bg-clip-text text-transparent dark:from-gray-800 dark:to-gray-900">
          404
        </p>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        Page Not Found
      </h1>
      <p className="mb-8 max-w-md text-gray-600 dark:text-gray-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-700 hover:shadow-xl active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Home
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
