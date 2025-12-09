'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary specifically for upload errors
 */
export class UploadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('UploadErrorBoundary caught an error:', error, errorInfo);
    
    // TODO: Log upload errors to analytics/error tracking
    // Example: analytics.track('upload_error', { error: error.message });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Upload failed
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  An error occurred while uploading your file. Please check your connection and try again.
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <p className="mt-2 font-mono text-xs">
                    {this.state.error.message}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    if (this.props.onReset) {
                      this.props.onReset();
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

