'use client';

import React from 'react';
import { AlertCircle, XCircle, RefreshCw, ArrowRight, X } from 'lucide-react';
import type { AppErrorDetails } from '@/lib/errors';

// ============================================================================
// Error Display Component - User-friendly error presentation
// ============================================================================

interface ErrorDisplayProps {
  error: AppErrorDetails | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  variant?: 'inline' | 'card' | 'toast' | 'fullpage';
  className?: string;
}

export function ErrorDisplay({
  error,
  onDismiss,
  onRetry,
  variant = 'card',
  className = '',
}: ErrorDisplayProps) {
  if (!error) return null;

  const baseStyles = {
    inline: 'flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200',
    card: 'p-4 rounded-xl bg-white border border-red-200 shadow-sm',
    toast: 'fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-white border border-red-200 shadow-lg max-w-md animate-in slide-in-from-bottom-4',
    fullpage: 'flex flex-col items-center justify-center min-h-[400px] p-8 text-center',
  };

  if (variant === 'fullpage') {
    return (
      <div className={`${baseStyles.fullpage} ${className}`}>
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error.title}</h2>
        <p className="text-gray-600 mb-4 max-w-md">{error.message}</p>
        {error.action && (
          <p className="text-sm text-gray-500 mb-6">{error.action}</p>
        )}
        <div className="flex gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-6">Error Code: {error.code}</p>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`${baseStyles.inline} ${className}`} role="alert">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">{error.title}</p>
          <p className="text-sm text-red-600 mt-0.5">{error.message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-red-100 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        )}
      </div>
    );
  }

  // Card and Toast variants
  return (
    <div className={`${baseStyles[variant]} ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900">{error.title}</h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{error.message}</p>
          {error.action && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              {error.action}
            </p>
          )}
        </div>
      </div>
      {onRetry && (
        <div className="mt-3 pt-3 border-t border-red-100">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">Code: {error.code}</p>
    </div>
  );
}

// ============================================================================
// Error Banner - For page-level errors
// ============================================================================

interface ErrorBannerProps {
  error: AppErrorDetails | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ error, onDismiss, onRetry }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <span className="font-medium text-red-800">{error.title}:</span>
            <span className="text-red-700 ml-1">{error.message}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm font-medium text-red-600 hover:text-red-700 underline"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded hover:bg-red-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// useError Hook - For managing error state
// ============================================================================

export function useError() {
  const [error, setError] = React.useState<AppErrorDetails | null>(null);

  const showError = React.useCallback((err: AppErrorDetails) => {
    setError(err);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleApiError = React.useCallback((response: { error?: AppErrorDetails }) => {
    if (response.error) {
      setError(response.error);
      return true;
    }
    return false;
  }, []);

  return {
    error,
    showError,
    clearError,
    handleApiError,
  };
}

// ============================================================================
// Error Boundary Fallback
// ============================================================================

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">
              Technical Details
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
