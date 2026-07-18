import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setServerError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!validateEmail(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setServerError(mapSupabaseError(error.message));
        return;
      }

      setSuccessMessage(
        "If an account exists with this email, you'll receive a password reset link shortly. Please check your inbox.",
      );
      setEmail("");
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Reset your password
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          {/* Server error */}
          {serverError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {serverError}
              </p>
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {successMessage}
              </p>
            </div>
          )}

          {/* Email */}
          <div className="mb-6">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isSubmitting || successMessage !== null}
              className={`w-full rounded-xl border bg-white px-4 py-3 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 ${
                emailError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-600"
                  : "border-gray-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-700"
              }`}
            />
            {emailError && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                {emailError}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            disabled={successMessage !== null}
            className="w-full"
          >
            Send Reset Link
          </Button>

          {/* Back to login */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Remember your password?{" "}
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

// ── Supabase error mapper ───────────────────────────────────────
function mapSupabaseError(message: string): string {
  if (message.includes("rate limit"))
    return "Too many requests. Please wait a moment and try again.";
  if (message.includes("not found") || message.includes("invalid"))
    return "No account found with this email address.";
  return message || "Failed to send reset email. Please try again.";
}
