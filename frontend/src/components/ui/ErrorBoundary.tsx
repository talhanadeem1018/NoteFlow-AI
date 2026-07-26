import { Component, type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary – catches JavaScript errors in its child
 * component tree and displays a fallback UI instead of crashing.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-24 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center blur-3xl">
              <div className="h-24 w-24 rounded-full bg-red-200/30 dark:bg-red-800/20" />
            </div>
            <span className="relative text-5xl" aria-hidden="true">⚠️</span>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Something went wrong
          </h2>
          <p className="mb-6 max-w-md text-sm text-gray-600 dark:text-gray-400">
            An unexpected error occurred. You can try reloading the page.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 active:scale-[0.98]"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Reload Page
            </button>
          </div>
          {this.state.error && (
            <details className="mt-6 max-w-lg text-left">
              <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                Error details
              </summary>
              <pre className="mt-2 overflow-auto rounded-lg bg-gray-100 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
