import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

/**
 * ResetPasswordPage – handles the password recovery flow.
 *
 * Flow:
 *   1. User clicks the reset link in their email.
 *      Link: {siteUrl}/reset-password#access_token=...&type=recovery
 *   2. Supabase client detects the hash tokens and fires PASSWORD_RECOVERY.
 *   3. AuthContext sets the session; useAuth() returns the authenticated user.
 *   4. This page detects the user and renders the new-password form.
 *   5. On submit, `supabase.auth.updateUser({ password })` updates the password.
 *   6. Success message → redirect to /login.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showInvalidLink = !authLoading && !user;

  // ── Submit handler ──────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);

      // Sign out for security, then redirect to login after a short delay
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render: Loading state ────────────────────────────────────────

  if (authLoading) {
    return (
      <main className="flex flex-1 flex-col px-6 py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Verifying your reset link...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Render: Invalid / expired link ────────────────────────────────

  if (showInvalidLink) {
    return (
      <main className="flex flex-1 flex-col px-6 py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center">
            <div className="mb-4 text-4xl" aria-hidden="true">🔗</div>
            <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              Invalid or Expired Link
            </h1>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-primary-500"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Render: Success ────────────────────────────────────────────────

  if (success) {
    return (
      <main className="flex flex-1 flex-col px-6 py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <span className="text-2xl text-green-600 dark:text-green-400" aria-hidden="true">✓</span>
            </div>
            <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              Password Updated
            </h1>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Your password has been successfully updated. Redirecting to login...
            </p>
            <Link
              to="/login"
              className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Render: Password form ─────────────────────────────────────────

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Set New Password
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your new password below
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          {/* Error message */}
          {error && (
            <div
              className="mb-6 animate-slide-down rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
              role="alert"
            >
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          )}

          {/* New password */}
          <div className="mb-4">
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter new password"
              autoComplete="new-password"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

          {/* Confirm password */}
          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Confirm new password"
              autoComplete="new-password"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

          {/* Submit */}
          <Button type="submit" size="lg" loading={isSubmitting} fullWidth>
            Update Password
          </Button>

          {/* Back to login */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
