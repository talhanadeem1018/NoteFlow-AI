/**
 * Full-screen loading spinner shown while the auth session is being restored.
 * Used by both ProtectedRoute and GuestRoute to avoid code duplication.
 */
export function AuthLoadingScreen() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Checking authentication…
        </p>
      </div>
    </div>
  );
}
