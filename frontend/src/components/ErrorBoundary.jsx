import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error("Parivartan page render error:", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-[60vh] flex items-center justify-center px-6 py-20">
        <div className="max-w-xl text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Something went wrong
          </p>

          <h1 className="text-3xl font-semibold mb-4">
            This page could not be displayed.
          </h1>

          <p className="text-muted-foreground mb-6">
            Please refresh the page and try again. If the problem continues,
            the error has been logged for diagnosis.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Refresh page
          </button>
        </div>
      </main>
    );
  }
}
