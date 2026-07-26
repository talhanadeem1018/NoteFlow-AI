/**
 * Full-screen loading spinner shown while the auth session is being restored.
 * Used by both ProtectedRoute and GuestRoute to avoid code duplication.
 */
export function AuthLoadingScreen() {
  return (
    <div className="flex flex-1 items-center justify-center" role="status" aria-label="Checking authentication">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600 dark:border-primary-900 dark:border-t-primary-400" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-primary-500 animate-ping-slow" />
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          Checking authentication…
        </p>
      </div>
    </div>
  );
}
