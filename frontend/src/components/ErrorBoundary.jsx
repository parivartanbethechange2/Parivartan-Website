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

  componentDidCatch(error, errorInfo) {
    console.error("Parivartan website error:", error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F8F4] px-6">
          <div className="max-w-lg text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
            <div className="text-5xl mb-5">🌱</div>

            <h1 className="text-2xl font-bold text-[#163B2A] mb-3">
              This page could not be displayed
            </h1>

            <p className="text-gray-600 mb-7">
              Something went wrong while loading this page. Please refresh and
              try again.
            </p>

            <button
              onClick={this.handleRefresh}
              className="px-6 py-3 rounded-xl bg-[#163B2A] text-white font-semibold hover:bg-[#24553E] transition"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
