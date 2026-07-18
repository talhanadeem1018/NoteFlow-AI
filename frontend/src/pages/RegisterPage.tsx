import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function RegisterPage() {
  const navigate = useNavigate();

  // ── Form state ──────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── UI state ────────────────────────────────────────────────────
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Validation ──────────────────────────────────────────────────
  function validate(): FormErrors {
    const e: FormErrors = {};

    if (!fullName.trim()) {
      e.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      e.fullName = "Name must be at least 2 characters";
    }

    if (!email.trim()) {
      e.email = "Email is required";
    } else if (!validateEmail(email.trim())) {
      e.email = "Please enter a valid email address";
    }

    if (!password) {
      e.password = "Password is required";
    } else if (password.length < 6) {
      e.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      e.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      e.confirmPassword = "Passwords do not match";
    }

    return e;
  }

  // ── Submit ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (error) {
        // Map common Supabase errors to friendly messages
        const msg = mapSupabaseError(error.message);
        setServerError(msg);
        return;
      }

      // If email confirmation is required, Supabase returns a session of null
      if (!data.session) {
        setSuccessMessage(
          "Account created! Please check your email to confirm your account before signing in.",
        );
        return;
      }

      // Session exists – user is signed in immediately (email confirm disabled)
      navigate("/", { replace: true });
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────
  function inputClasses(field: keyof FormErrors): string {
    const base =
      "w-full rounded-xl border bg-white px-4 py-3 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500";
    const errorStyle =
      "border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-600";
    const normal =
      "border-gray-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-700";

    return `${base} ${errors[field] ? errorStyle : normal}`;
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Create your account
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Start generating AI-powered study notes today
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

          {/* Full Name */}
          <div className="mb-4">
            <label
              htmlFor="fullName"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
              }}
              placeholder="John Doe"
              autoComplete="name"
              disabled={isSubmitting}
              className={inputClasses("fullName")}
            />
            {errors.fullName && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isSubmitting}
              className={inputClasses("email")}
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="mb-4">
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              disabled={isSubmitting}
              className={inputClasses("password")}
            />
            {errors.password && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
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
                if (errors.confirmPassword)
                  setErrors((p) => ({ ...p, confirmPassword: undefined }));
              }}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              disabled={isSubmitting}
              className={inputClasses("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full"
          >
            Create Account
          </Button>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

// ── Supabase error mapper ───────────────────────────────────────
function mapSupabaseError(message: string): string {
  if (message.includes("already registered"))
    return "An account with this email already exists.";
  if (message.includes("valid email"))
    return "Please enter a valid email address.";
  if (message.includes("at least"))
    return "Password must be at least 6 characters.";
  if (message.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";
  return message || "Registration failed. Please try again.";
}
