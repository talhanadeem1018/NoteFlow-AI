import { useAuth } from "@/hooks/useAuth";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back{user?.email ? `, ${user.email}` : ""}! Your notes
            will appear here.
          </p>
        </div>

        {/* Placeholder cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {placeholders.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-2xl dark:bg-primary-950">
                {item.icon}
              </div>
              <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

const placeholders = [
  {
    icon: "📝",
    title: "Recent Notes",
    description: "Your generated notes will appear here.",
  },
  {
    icon: "🎬",
    title: "Videos",
    description: "Videos you've processed will show up here.",
  },
  {
    icon: "⚡",
    title: "Quick Start",
    description: "Paste a YouTube URL on the home page to get started.",
  },
];
