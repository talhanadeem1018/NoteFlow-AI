import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-4 text-8xl font-bold text-gray-200 dark:text-gray-800">
        404
      </p>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        Page Not Found
      </h1>
      <p className="mb-8 text-gray-600 dark:text-gray-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-700"
      >
        Back to Home
      </Link>
    </main>
  );
}
