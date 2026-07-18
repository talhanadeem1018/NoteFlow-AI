import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

interface FormErrors {
  email?: string;
  password?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginPage() {
  const navigate = useNavigate();

  // ── Form state ──────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ── UI state ────────────────────────────────────────────────────
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Validation ──────────────────────────────────────────────────
  function validate(): FormErrors {
    const e: FormErrors = {};

    if (!email.trim()) {
      e.email = "Email is required";
    } else if (!validateEmail(email.trim())) {
      e.email = "Please enter a valid email address";
    }

    if (!password) {
      e.password = "Password is required";
    }

    return e;
  }

  // ── Submit ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setServerError(mapSupabaseError(error.message));
        return;
      }

      // AuthContext listener will update state automatically
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
            Welcome back
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to your NoteFlow AI account
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
          <div className="mb-2">
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Forgot Password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isSubmitting}
              className={inputClasses("password")}
            />
            {errors.password && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="mt-6">
            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              className="w-full"
            >
              Sign In
            </Button>
          </div>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

// ── Supabase error mapper ───────────────────────────────────────
function mapSupabaseError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Invalid email or password. Please try again.";
  if (message.includes("Email not confirmed"))
    return "Please confirm your email before signing in.";
  if (message.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";
  if (message.includes("not found"))
    return "No account found with this email.";
  return message || "Login failed. Please try again.";
}
