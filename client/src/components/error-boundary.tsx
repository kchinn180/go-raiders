/**
 * ErrorBoundary — top-level crash guard
 *
 * Catches any render-time JavaScript errors that bubble up from the component
 * tree, shows a friendly recovery screen, and logs the error for debugging.
 * Without this, a single unhandled exception would produce a white blank screen.
 */

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/error-reporter";

interface Props {
  children: ReactNode;
  /** Optional component name for better error messages */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console for debugging
    console.error(
      `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}] Uncaught error:`,
      error,
      errorInfo.componentStack
    );
    // Auto-report to admin error log
    reportError(
      error.message,
      (error.stack ?? "") + "\n\nComponent Stack:" + (errorInfo.componentStack ?? ""),
      this.props.name ?? "ErrorBoundary",
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-black mb-2">Something went wrong</h1>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            The app hit an unexpected error. Your data is safe — tap below to try again.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button onClick={this.handleReset} className="w-full font-bold rounded-xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="outline"
              className="w-full font-bold rounded-xl"
              onClick={() => window.location.reload()}
            >
              Reload App
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-6 text-left w-full max-w-sm">
              <summary className="text-xs text-muted-foreground cursor-pointer">Error details (dev only)</summary>
              <pre className="mt-2 text-[10px] bg-muted rounded-lg p-3 overflow-auto max-h-40 text-red-400">
                {this.state.error.message}
                {"\n\n"}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
