/**
 * useErrorHandler Hook
 *
 * A React hook for standardized error handling in the Submittal Factory application.
 * Provides methods for displaying errors, handling API errors, and managing error state.
 *
 * @version 2.2.0 - Added handleException function
 */

import { useState, useCallback } from "react";
import type { StandardError, ErrorDisplay } from "../utils/errorHandler";
import {
  formatError,
  isStandardError,
  ErrorCategory,
} from "../utils/errorHandler";

// =============================================================================
// HOOK TYPES
// =============================================================================

export interface UseErrorHandlerReturn {
  /** Current error display object */
  error: ErrorDisplay | null;
  /** Whether error notification is visible */
  isVisible: boolean;
  /** Show a custom error display */
  showError: (display: ErrorDisplay | Partial<ErrorDisplay>) => void;
  /** Clear the current error */
  clearError: () => void;
  /** Handle a StandardError from the API */
  handleApiError: (error: StandardError) => void;
  /** Handle any exception/error object (with standardError or display attached) */
  handleException: (error: unknown) => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorDisplay | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  /**
   * Show an error notification
   */
  const showError = useCallback(
    (display: ErrorDisplay | Partial<ErrorDisplay>) => {
      const fullDisplay: ErrorDisplay = {
        title: display.title || "Error",
        message: display.message || "An error occurred",
        action: display.action,
        severity: display.severity || "error",
        icon: display.icon || "error",
        showContactSupport: display.showContactSupport ?? true,
        showRetry: display.showRetry ?? true,
        category: display.category || "UNKNOWN",
        referenceId: display.referenceId,
        // ✅ ADD THESE NEW FIELDS:
        details: display.details,
        errorType: display.errorType,
        critical: display.critical,
        filename: display.filename,
      };

      setError(fullDisplay);
      setIsVisible(true);

      // Auto-hide info messages after 5 seconds
      if (fullDisplay.severity === "info") {
        setTimeout(() => {
          setIsVisible(false);
        }, 5000);
      }
    },
    []
  );

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setIsVisible(false);
    // Delay clearing the error to allow for fade-out animation
    setTimeout(() => {
      setError(null);
    }, 300);
  }, []);

  /**
   * Handle a StandardError from the API
   */
  const handleApiError = useCallback(
    (standardError: StandardError) => {
      const display = formatError(standardError);
      showError(display);
    },
    [showError]
  );

  /**
   * ✅ NEW: Handle any exception/error object
   * This handles errors that may have standardError or display properties attached
   */
const handleException = useCallback(
  (errorObj: unknown) => {
    if (!errorObj) {
      showError({
        title: "Error",
        message: "An unknown error occurred",
        severity: "error",
      });
      return;
    }

    const err = errorObj as Record<string, unknown>;

    // 1. Check if errorObj itself is already a StandardError
    if (isStandardError(errorObj)) {
      handleApiError(errorObj as StandardError);
      return;
    }

    // 2. Check for error.response.data format (common in some HTTP clients)
    const responseData = (err as any).response?.data;
    if (responseData && isStandardError(responseData)) {
      handleApiError(responseData as StandardError);
      return;
    }

    // 3. Check for error.data format (another common pattern)
    const data = (err as any).data;
    if (data && isStandardError(data)) {
      handleApiError(data as StandardError);
      return;
    }

    // 4. Check if it has a standardError property (from api.ts legacy format)
    if (err.standardError && isStandardError(err.standardError)) {
      handleApiError(err.standardError as StandardError);
      return;
    }

    // 5. Check if it has a display property (pre-formatted display)
    // Check if it has a display property (pre-formatted display)
    if (err.display && typeof err.display === "object") {
      const display = err.display as Partial<ErrorDisplay>;
      showError({
        title: display.title || "Error",
        message: display.message || "An error occurred",
        action: display.action,
        severity: display.severity || "error",
        icon: display.icon || "error",
        showContactSupport: display.showContactSupport ?? true,
        showRetry: display.showRetry ?? true,
        category: display.category || "UNKNOWN",
        referenceId: display.referenceId,
        details: display.details, // ✅ ADD THIS
        errorType: display.errorType, // ✅ ADD THIS
        critical: display.critical, // ✅ ADD THIS
        filename: display.filename, // ✅ ADD THIS
      });
      return;
    }

    // 6. Check if the error object itself has StandardError properties
    // (This catches the case where the error is the StandardError object itself)
    if (err.success === false && err.error_code && err.user_message) {
      const potentialError: StandardError = {
        success: false as const,
        error_code: String(err.error_code),
        error_category: String(err.error_category || ErrorCategory.UNKNOWN),
        user_message: String(err.user_message || "An error occurred"),
        action_required: String(err.action_required || "Please try again"),
        severity: (err.severity as "error" | "warning" | "info") || "error",
        reference_id: err.reference_id ? String(err.reference_id) : undefined,
        timestamp: err.timestamp ? String(err.timestamp) : undefined,
        filename: err.filename ? String(err.filename) : undefined,
        error_type: err.error_type ? String(err.error_type) : undefined,
        critical:
          err.critical !== undefined ? Boolean(err.critical) : undefined,
        details: err.details ? String(err.details) : undefined,
      };

      if (isStandardError(potentialError)) {
        handleApiError(potentialError);
        return;
      }
    }

    // 7. Check for raw API JSON response (direct from fetch)
    if (err.success === false && (err.error_code || err.user_message)) {
      const apiError: StandardError = {
        success: false as const,
        error_code: String(err.error_code || "5000"),
        error_category: String(err.error_category || ErrorCategory.UNKNOWN),
        user_message: String(
          err.user_message ||
            err.message ||
            (err as any).detail ||
            "An API error occurred"
        ),
        action_required: String(err.action_required || "Please try again"),
        severity: (err.severity as "error" | "warning" | "info") || "error",
        reference_id: err.reference_id ? String(err.reference_id) : undefined,
        timestamp: err.timestamp ? String(err.timestamp) : undefined,
        filename: err.filename ? String(err.filename) : undefined,
        error_type: err.error_type ? String(err.error_type) : undefined,
        critical:
          err.critical !== undefined ? Boolean(err.critical) : undefined,
        details: err.details ? String(err.details) : undefined,
      };

      handleApiError(apiError);
      return;
    }

    // 8. Check for Error-like objects
    if (err instanceof Error || typeof (err as any).message === "string") {
      showError({
        title: "Error",
        message: String((err as any).message || "An error occurred"),
        severity: "error",
        icon: "error",
        showContactSupport: true,
        showRetry: true,
        category: "UNKNOWN",
      });
      return;
    }

    // 9. Check for string error messages
    if (typeof errorObj === "string") {
      showError({
        title: "Error",
        message: errorObj,
        severity: "error",
        icon: "error",
        showContactSupport: true,
        showRetry: true,
        category: "UNKNOWN",
      });
      return;
    }

    // 10. Fallback for unknown error types
    showError({
      title: "Error",
      message: "An unexpected error occurred",
      severity: "error",
      icon: "error",
      showContactSupport: true,
      showRetry: true,
      category: "UNKNOWN",
    });

    // Log for debugging
    if (process.env.NODE_ENV === "development") {
      console.error("Unhandled error format:", errorObj);
    }
  },
  [showError, handleApiError]
);

  return {
    error,
    isVisible,
    showError,
    clearError,
    handleApiError,
    handleException,
  };
}

export default useErrorHandler;
