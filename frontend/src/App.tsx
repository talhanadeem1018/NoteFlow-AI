import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// Lazy-loaded pages for better performance
const HomePage = lazy(() => import("@/pages/HomePage").then(m => ({ default: m.HomePage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const NotesPage = lazy(() => import("@/pages/NotesPage").then(m => ({ default: m.NotesPage })));
const NoteDetailsPage = lazy(() => import("@/pages/NoteDetailsPage").then(m => ({ default: m.NoteDetailsPage })));
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then(m => ({ default: m.ProfilePage })));

/** Minimal loading fallback for lazy-loaded pages */
function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route element={<Layout />}>
        {/* Public routes */}
        <Route index element={
          <Suspense fallback={<PageLoader />}>
            <HomePage />
          </Suspense>
        } />
        <Route path="forgot-password" element={
          <Suspense fallback={<PageLoader />}>
            <ForgotPasswordPage />
          </Suspense>
        } />
        <Route path="reset-password" element={
          <Suspense fallback={<PageLoader />}>
            <ResetPasswordPage />
          </Suspense>
        } />

        {/* Guest-only routes (redirect to / if already authenticated) */}
        <Route element={<GuestRoute />}>
          <Route path="login" element={
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          } />
          <Route path="register" element={
            <Suspense fallback={<PageLoader />}>
              <RegisterPage />
            </Suspense>
          } />
        </Route>

        {/* Protected routes (redirect to /login if not authenticated) */}
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          } />
          <Route path="dashboard/notes" element={
            <Suspense fallback={<PageLoader />}>
              <NotesPage />
            </Suspense>
          } />
          <Route path="dashboard/notes/:noteId" element={
            <Suspense fallback={<PageLoader />}>
              <NoteDetailsPage />
            </Suspense>
          } />
          <Route path="dashboard/profile" element={
            <Suspense fallback={<PageLoader />}>
              <ProfilePage />
            </Suspense>
          } />
        </Route>

        <Route path="*" element={
          <Suspense fallback={<PageLoader />}>
            <NotFoundPage />
          </Suspense>
        } />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}
