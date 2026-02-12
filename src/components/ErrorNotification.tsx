/**
 * ErrorNotification Component
 *
 * A reusable error notification component that displays standardized errors
 * from the Submittal Factory error handling system.
 *
 * Features:
 * - Severity-based styling (error, warning, info)
 * - Contact support link
 * - Reference ID display
 * - Expandable technical details
 * - Critical badge
 * - Filename display
 * - Dismissible
 * - Handles null error gracefully
 *
 * @author Submittal Factory Team
 * @version 2.1.0 - Removed retry button
 */

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ErrorDisplay } from "../utils/errorHandler";

// =============================================================================
// TYPES
// =============================================================================

type ErrorSeverity = "error" | "warning" | "info";

interface ErrorNotificationProps {
  error: ErrorDisplay | null;
  isVisible?: boolean;
  onClose: () => void;
  onRetry?: () => void; // Keep for backward compatibility but won't use
  autoHide?: boolean;
  autoHideDelay?: number;
  position?: "toast" | "inline" | "banner";
  showDetails?: boolean;
  className?: string;
}

// =============================================================================
// STYLING CONFIGURATION
// =============================================================================

const SEVERITY_STYLES: Record<
  ErrorSeverity,
  { bg: string; border: string; icon: string; text: string; button: string }
> = {
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-500",
    text: "text-red-800",
    button: "bg-red-100 hover:bg-red-200 text-red-700",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "text-amber-500",
    text: "text-amber-800",
    button: "bg-amber-100 hover:bg-amber-200 text-amber-700",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-500",
    text: "text-blue-800",
    button: "bg-blue-100 hover:bg-blue-200 text-blue-700",
  },
};

const ICONS: Record<
  ErrorSeverity,
  React.ComponentType<{ className?: string }>
> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  isVisible = true,
  onClose,
  autoHide = false,
  autoHideDelay = 5000,
  position = "inline",
  className = "",
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Early return if no error or not visible
  if (!error || !isVisible) {
    return null;
  }

  const styles = SEVERITY_STYLES[error.severity] || SEVERITY_STYLES.error;
  const IconComponent = ICONS[error.icon || error.severity] || AlertCircle;

  // Auto-hide effect
  useEffect(() => {
    if (autoHide && error && error.severity !== "error") {
      const timer = setTimeout(onClose, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onClose, error]);

  // Position-based container styles
  const containerStyles = {
    toast: "fixed top-4 right-4 z-50 max-w-md shadow-lg animate-slide-in-right",
    inline: "w-full",
    banner: "w-full rounded-none border-x-0",
  };

  return (
    <div
      className={`${styles.bg} ${styles.border} border rounded-lg p-4 ${containerStyles[position]} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        {/* Icon */}
        <div className="flex-shrink-0">
          <IconComponent className={`${styles.icon} h-5 w-5 mt-0.5`} />
        </div>

        {/* Content */}
        <div className="ml-3 flex-1 min-w-0">
          {/* Title with Critical Badge */}
          <h4
            className={`${styles.text} font-semibold text-sm flex items-center gap-2 flex-wrap`}
          >
            <span>{error.title}</span>
            {error.critical && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  error.severity === "error"
                    ? "bg-red-200 text-red-800 border border-red-300"
                    : error.severity === "warning"
                    ? "bg-amber-200 text-amber-800 border border-amber-300"
                    : "bg-blue-200 text-blue-800 border border-blue-300"
                }`}
              >
                Critical
              </span>
            )}
          </h4>

          {/* Message */}
          <p className={`${styles.text} text-sm mt-1`}>{error.message}</p>

          {/* Filename */}
          {error.filename && (
            <p className={`${styles.text} text-xs mt-2 opacity-70`}>
              <strong>File:</strong> {error.filename}
            </p>
          )}

          {/* Action Required */}
          {error.action && (
            <p className={`${styles.text} text-sm mt-2 opacity-80`}>
              <strong>Suggested Action:</strong> {error.action}
            </p>
          )}

          {/* Reference ID */}
          {error.referenceId && (
            <p className={`${styles.text} text-xs mt-2 opacity-60 font-mono`}>
              Reference: {error.referenceId}
            </p>
          )}

          {/* Error Type */}
          {error.errorType && (
            <p className={`${styles.text} text-xs mt-1 opacity-60 font-mono`}>
              Type: {error.errorType}
            </p>
          )}

          {/* Technical Details (Expandable) */}
          {error.details && (
            <div className="mt-3">
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className={`inline-flex items-center text-xs font-medium ${styles.text} opacity-70 hover:opacity-100 transition-opacity focus:outline-none`}
              >
                <HelpCircle className="h-3 w-3 mr-1" />
                {showTechnicalDetails ? "Hide" : "Show"} Technical Details
                {showTechnicalDetails ? (
                  <ChevronUp className="ml-1 h-3 w-3" />
                ) : (
                  <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </button>

              {showTechnicalDetails && (
                <div
                  className={`mt-2 p-3 rounded-md ${styles.bg} border ${styles.border} opacity-90 animate-slide-down`}
                >
                  <p
                    className={`${styles.text} text-xs font-mono whitespace-pre-wrap break-words leading-relaxed`}
                  >
                    {error.details}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions Row */}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {/* Close Button */}
            <button
              onClick={onClose}
              className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md ${styles.button} transition-colors`}
            >
              <X className="h-4 w-4 mr-1.5" />
              Close
            </button>

            {/* Contact Support */}
            {error.showContactSupport && (
              <a
                href="mailto:zack@submittalfactory.com?subject=Error%20Report"
                className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md ${styles.button} transition-colors`}
              >
                <HelpCircle className="h-4 w-4 mr-1.5" />
                Contact Support
              </a>
            )}
          </div>
        </div>

        {/* Dismiss X Button (Top Right) */}
        <button
          onClick={onClose}
          className={`${styles.text} hover:opacity-70 ml-2 p-1 rounded-full transition-opacity focus:outline-none`}
          aria-label="Dismiss error"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// TOAST CONTAINER COMPONENT
// =============================================================================

interface ErrorToastContainerProps {
  errors: Array<ErrorDisplay & { id: string }>;
  onDismiss: (id: string) => void;
  onRetry?: (id: string) => void; // Keep for backward compatibility but won't use
  maxVisible?: number;
}

export const ErrorToastContainer: React.FC<ErrorToastContainerProps> = ({
  errors,
  onDismiss,
  maxVisible = 3,
}) => {
  const visibleErrors = errors.slice(0, maxVisible);
  const hiddenCount = errors.length - maxVisible;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {visibleErrors.map((error) => (
        <ErrorNotification
          key={error.id}
          error={error}
          onClose={() => onDismiss(error.id)}
          position="toast"
          autoHide={error.severity === "info"}
        />
      ))}

      {hiddenCount > 0 && (
        <div className="text-sm text-gray-500 text-center py-2">
          +{hiddenCount} more{" "}
          {hiddenCount === 1 ? "notification" : "notifications"}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// INLINE ERROR COMPONENT (SIMPLER VERSION)
// =============================================================================

interface InlineErrorProps {
  message: string;
  severity?: ErrorSeverity;
  onDismiss?: () => void;
  onRetry?: () => void; // Keep for backward compatibility but won't use
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  message,
  severity = "error",
  onDismiss,
  className = "",
}) => {
  const styles = SEVERITY_STYLES[severity];
  const IconComponent = ICONS[severity];

  return (
    <div
      className={`${styles.bg} ${styles.border} border rounded-lg p-3 ${className}`}
      role="alert"
    >
      <div className="flex items-center">
        <IconComponent className={`${styles.icon} h-4 w-4 flex-shrink-0`} />
        <p className={`${styles.text} text-sm ml-2 flex-1`}>{message}</p>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${styles.text} hover:opacity-70 ml-2 focus:outline-none`}
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// BANNER ERROR COMPONENT
// =============================================================================

interface ErrorBannerProps {
  error: ErrorDisplay | null;
  onDismiss: () => void;
  onRetry?: () => void; // Keep for backward compatibility but won't use
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  onDismiss,
}) => {
  if (!error) return null;

  const styles = SEVERITY_STYLES[error.severity];
  const IconComponent = ICONS[error.icon || error.severity];

  return (
    <div
      className={`${styles.bg} ${styles.border} border-b px-4 py-3`}
      role="alert"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <IconComponent className={`${styles.icon} h-5 w-5`} />
          <p className={`${styles.text} text-sm ml-3`}>
            <strong>{error.title}:</strong> {error.message}
            {error.action && (
              <span className="opacity-80"> — {error.action}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onDismiss}
            className={`${styles.text} hover:opacity-70 p-1 focus:outline-none`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorNotification;
