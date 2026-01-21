export enum ErrorCategory {
  UPLOAD = "UPLOAD",
  EXTRACTION = "EXTRACTION",
  LLM = "LLM",
  SEARCH = "SEARCH", // ✅ Added to match backend
  VALIDATION = "VALIDATION",
  NETWORK = "NETWORK",
  SYSTEM = "SYSTEM", // ✅ Added to match backend
  AUTH = "AUTH", // Frontend extension for auth handling
  SUBSCRIPTION = "SUBSCRIPTION", // Frontend extension for subscription handling
  UNKNOWN = "UNKNOWN",
}

// =============================================================================
// STANDARDIZED ERROR TYPE
// =============================================================================

export interface StandardError {
  success: false;
  error_code: string;
  error_category: ErrorCategory | string;
  user_message: string;
  action_required?: string;
  severity: "error" | "warning" | "info";
  reference_id?: string;
  timestamp?: string;
  filename?: string;
  text_length?: number;
  response_type?: string;
  error_type?: string;
  critical?: boolean;
  details?: string;
}

// =============================================================================
// ERROR DISPLAY TYPE (for UI components)
// =============================================================================

export interface ErrorDisplay {
  title: string;
  message: string;
  action?: string;
  severity: "error" | "warning" | "info";
  icon: "error" | "warning" | "info";
  showContactSupport: boolean;
  showRetry: boolean;
  category: string;
  referenceId?: string;
  details?: string;
  errorType?: string;
  critical?: boolean;
  filename?: string;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if an object is a StandardError
 */
export function isStandardError(obj: unknown): obj is StandardError {
  if (typeof obj !== "object" || obj === null) return false;
  const candidate = obj as Record<string, unknown>;
  return (
    candidate.success === false &&
    typeof candidate.error_code === "string" &&
    typeof candidate.user_message === "string"
  );
}

// =============================================================================
// ERROR CODE MAPPING - SYNCHRONIZED WITH BACKEND error_handlers.py
// =============================================================================

const ERROR_CODE_INFO: Record<
  string,
  { title: string; icon: "error" | "warning" | "info" }
> = {
  // ==========================================
  // Upload Errors (1xxx) - Matches backend ErrorCode enum
  // ==========================================
  "1001": { title: "File Too Large", icon: "error" }, // FILE_TOO_LARGE
  "1002": { title: "Too Many Products", icon: "warning" }, // TOO_MANY_PRODUCTS
  "1003": { title: "Invalid File Format", icon: "error" }, // INVALID_FILE_FORMAT
  "1004": { title: "Empty File", icon: "error" }, // EMPTY_FILE
  "1005": { title: "Corrupted File", icon: "error" }, // CORRUPTED_FILE

  // ==========================================
  // Extraction Errors (2xxx) - Matches backend ErrorCode enum
  // ==========================================
  "2001": { title: "PDF Not Readable", icon: "error" }, // PDF_NOT_READABLE
  "2002": { title: "Scanned Document Detected", icon: "warning" }, // SCANNED_DOCUMENT
  "2003": { title: "No Text Content", icon: "error" }, // NO_TEXT_CONTENT
  "2004": { title: "No PART 2 Section Found", icon: "warning" }, // NO_PART2_FOUND
  "2005": { title: "Extraction Failed", icon: "error" }, // EXTRACTION_FAILED

  // ==========================================
  // LLM/AI Errors (3xxx) - Matches backend ErrorCode enum
  // ==========================================
  "3001": { title: "AI Model Not Found", icon: "error" }, // MODEL_NOT_FOUND
  "3002": { title: "AI Service Overloaded", icon: "warning" }, // MODEL_OVERLOADED
  "3003": { title: "Invalid API Key", icon: "error" }, // API_KEY_INVALID
  "3004": { title: "Rate Limit Exceeded", icon: "warning" }, // RATE_LIMITED
  "3005": { title: "Document Too Long", icon: "error" }, // CONTEXT_TOO_LONG
  "3006": { title: "Invalid AI Response", icon: "error" }, // LLM_RESPONSE_INVALID
  "3007": { title: "AI Processing Timeout", icon: "error" }, // LLM_TIMEOUT
  "3008": { title: "Content Blocked by AI Safety", icon: "warning" }, // LLM_SAFETY_BLOCKED

  // ==========================================
  // Search Errors (4xxx) - Matches backend ErrorCode enum
  // ==========================================
  "4001": { title: "No Results Found", icon: "info" }, // NO_RESULTS_FOUND
  "4002": { title: "Search Timeout", icon: "warning" }, // SEARCH_TIMEOUT
  "4003": { title: "Invalid Search Parameters", icon: "error" }, // INVALID_SEARCH_PARAMS

  // ==========================================
  // Validation Errors (5xxx) - Matches backend ErrorCode enum
  // ==========================================
  "5001": { title: "Validation Failed", icon: "error" }, // VALIDATION_FAILED
  "5002": { title: "Specifications Mismatch", icon: "warning" }, // SPECS_MISMATCH
  "5003": { title: "PDF Fetch Failed", icon: "error" }, // PDF_FETCH_FAILED
  "5004": { title: "Incomplete Product Data", icon: "warning" }, // INCOMPLETE_PRODUCT_DATA

  // ==========================================
  // Network Errors (6xxx) - Matches backend ErrorCode enum
  // ==========================================
  "6001": { title: "Connection Failed", icon: "error" }, // CONNECTION_FAILED
  "6002": { title: "Request Timeout", icon: "error" }, // TIMEOUT
  "6003": { title: "DNS Resolution Failed", icon: "error" }, // DNS_FAILURE
  "6004": { title: "SSL/TLS Error", icon: "error" }, // SSL_ERROR
  "6005": { title: "Proxy Error", icon: "error" }, // PROXY_ERROR

  // ==========================================
  // Auth Errors (7xxx) - Frontend extension
  // ==========================================
  "7001": { title: "Authentication Required", icon: "error" },
  "7002": { title: "Session Expired", icon: "warning" },
  "7003": { title: "Access Denied", icon: "error" },

  // ==========================================
  // Subscription Errors (8xxx) - Frontend extension
  // ==========================================
  "8001": { title: "Subscription Required", icon: "warning" },
  "8002": { title: "Usage Limit Reached", icon: "warning" },
  "8003": { title: "Subscription Expired", icon: "warning" },

  // ==========================================
  // System Errors (9xxx) - Matches backend ErrorCode enum
  // ==========================================
  "9001": { title: "Internal Server Error", icon: "error" }, // INTERNAL_ERROR
  "9002": { title: "Database Error", icon: "error" }, // DATABASE_ERROR
  "9003": { title: "Configuration Error", icon: "error" }, // CONFIGURATION_ERROR
  "9004": { title: "Subscription System Error", icon: "error" }, // SUBSCRIPTION_ERROR
};

// =============================================================================
// ERROR PARSING FUNCTIONS
// =============================================================================

/**
 * Parse an API Response object into a StandardError
 */
export async function parseApiError(
  response: Response | unknown
): Promise<StandardError> {
  // Check if response is actually a Response object with text method
  if (!response || typeof response !== "object") {
    return createFallbackError("Invalid response received");
  }

  // Check if it's a fetch Response object
  const isResponseObject =
    response instanceof Response ||
    (typeof (response as Response).text === "function" &&
      typeof (response as Response).json === "function" &&
      typeof (response as Response).status === "number");

  if (!isResponseObject) {
    // If it's already an error object, try to extract info from it
    const errorObj = response as Record<string, unknown>;
    if (errorObj.user_message || errorObj.message || errorObj.error) {
      return {
        success: false,
        error_code: String(errorObj.error_code || "9001"),
        error_category: String(
          errorObj.error_category || ErrorCategory.UNKNOWN
        ),
        user_message: String(
          errorObj.user_message ||
            errorObj.message ||
            errorObj.error ||
            "An error occurred"
        ),
        action_required: String(errorObj.action_required || "Please try again"),
        severity:
          (errorObj.severity as "error" | "warning" | "info") || "error",
        reference_id: errorObj.reference_id
          ? String(errorObj.reference_id)
          : undefined,
        timestamp: errorObj.timestamp ? String(errorObj.timestamp) : undefined,
        filename: errorObj.filename ? String(errorObj.filename) : undefined,
        error_type: errorObj.error_type
          ? String(errorObj.error_type)
          : undefined,
        critical:
          errorObj.critical !== undefined
            ? Boolean(errorObj.critical)
            : undefined,
        details: errorObj.details ? String(errorObj.details) : undefined,
      };
    }
    return createFallbackError("Unknown error format");
  }

  const resp = response as Response;

  try {
    // Try to parse as JSON first
    const contentType = resp.headers?.get?.("content-type");

    if (contentType?.includes("application/json")) {
      try {
        const data = await resp.json();

        // Construct a complete StandardError with all fields
        return {
          success: false,
          error_code: data.error_code || String(resp.status) || "9001",
          error_category:
            data.error_category || getErrorCategoryFromStatus(resp.status),
          user_message:
            data.user_message ||
            data.message ||
            data.detail ||
            data.error ||
            `Server error (${resp.status})`,
          action_required: data.action_required || "Please try again",
          severity: data.severity || "error",
          reference_id: data.reference_id
            ? String(data.reference_id)
            : undefined,
          timestamp: data.timestamp ? String(data.timestamp) : undefined,
          filename: data.filename ? String(data.filename) : undefined,
          text_length:
            data.text_length !== undefined
              ? Number(data.text_length)
              : undefined,
          response_type: data.response_type
            ? String(data.response_type)
            : undefined,
          error_type: data.error_type ? String(data.error_type) : undefined,
          critical:
            data.critical !== undefined ? Boolean(data.critical) : undefined,
          details: data.details ? String(data.details) : undefined,
        };
      } catch (jsonError) {
        console.warn("Failed to parse JSON error response:", jsonError);
      }
    }

    // Try to get text content
    try {
      const text = await resp.text();
      return {
        success: false,
        error_code: String(resp.status) || "9001",
        error_category: getErrorCategoryFromStatus(resp.status),
        user_message: text || `Server error (${resp.status})`,
        action_required: "Please try again",
        severity: "error",
      };
    } catch (textError) {
      console.warn("Failed to get text from error response:", textError);
    }

    // Fallback for non-parseable responses
    return {
      success: false,
      error_code: String(resp.status) || "9001",
      error_category: getErrorCategoryFromStatus(resp.status),
      user_message: `Server error (${resp.status})`,
      action_required: "Please try again",
      severity: "error",
    };
  } catch (e) {
    console.error("Error parsing API error response:", e);
    return createFallbackError(
      `Failed to parse error response: ${
        e instanceof Error ? e.message : "Unknown error"
      }`
    );
  }
}

/**
 * Create a fallback error when parsing fails
 */
function createFallbackError(message: string): StandardError {
  return {
    success: false,
    error_code: "9001", // INTERNAL_ERROR
    error_category: ErrorCategory.SYSTEM,
    user_message: message,
    action_required: "Please try again",
    severity: "error",
    reference_id: undefined,
    timestamp: undefined,
    filename: undefined,
    error_type: undefined,
    critical: undefined,
    details: undefined,
  };
}

/**
 * Get error category from HTTP status code
 * Updated to match backend category assignments
 */
function getErrorCategoryFromStatus(status: number): ErrorCategory {
  if (status === 400) return ErrorCategory.UPLOAD; // Bad Request -> Upload
  if (status === 401 || status === 403) return ErrorCategory.AUTH;
  if (status === 404) return ErrorCategory.SEARCH; // Not Found -> Search
  if (status === 422) return ErrorCategory.VALIDATION; // Unprocessable Entity
  if (status === 429) return ErrorCategory.LLM; // Rate Limited -> LLM
  if (status === 502) return ErrorCategory.NETWORK; // Bad Gateway
  if (status === 503) return ErrorCategory.LLM; // Service Unavailable -> LLM
  if (status >= 500) return ErrorCategory.SYSTEM;
  return ErrorCategory.UNKNOWN;
}

/**
 * Handle fetch errors (network failures, timeouts, etc.)
 * Updated to use correct 6xxx codes matching backend
 */
export function handleFetchError(error: Error): StandardError {
  // Check for timeout
  if (error.name === "AbortError" || error.message.includes("timeout")) {
    return {
      success: false,
      error_code: "6002", // TIMEOUT (was 4002)
      error_category: ErrorCategory.NETWORK,
      user_message:
        "The request timed out. This may be due to a large file or slow connection.",
      action_required:
        "Please try again with a smaller file or wait and retry.",
      severity: "error", // Backend uses "error" for TIMEOUT
    };
  }

  // Check for network errors
  if (
    error.message.includes("fetch") ||
    error.message.includes("network") ||
    error.message.includes("Failed to fetch")
  ) {
    return {
      success: false,
      error_code: "6001", // CONNECTION_FAILED (was 4001)
      error_category: ErrorCategory.NETWORK,
      user_message:
        "Unable to connect to the server. Please check your internet connection.",
      action_required: "Check your connection and try again.",
      severity: "error",
    };
  }

  // Check for SSL/TLS errors
  if (
    error.message.includes("SSL") ||
    error.message.includes("certificate") ||
    error.message.includes("TLS")
  ) {
    return {
      success: false,
      error_code: "6004", // SSL_ERROR
      error_category: ErrorCategory.NETWORK,
      user_message:
        "Secure connection failed. Please contact support if this persists.",
      action_required: "Try refreshing the page or contact support.",
      severity: "error",
    };
  }

  // Generic error
  return {
    success: false,
    error_code: "9001", // INTERNAL_ERROR
    error_category: ErrorCategory.SYSTEM,
    user_message: error.message || "An unexpected error occurred",
    action_required: "Please try again",
    severity: "error",
  };
}

// =============================================================================
// ERROR FORMATTING FUNCTIONS
// =============================================================================

/**
 * Format a StandardError into an ErrorDisplay for UI components
 */
export function formatError(error: StandardError): ErrorDisplay {
  const codeInfo = ERROR_CODE_INFO[error.error_code] || {
    title: "Error",
    icon: "error" as const,
  };

  return {
    title: codeInfo.title,
    message: error.user_message,
    action: error.action_required,
    severity: error.severity,
    icon: codeInfo.icon,
    showContactSupport: error.severity === "error",
    showRetry: true,
    category: String(error.error_category),
    referenceId: error.reference_id,
    details: error.details,
    errorType: error.error_type,
    critical: error.critical,
    filename: error.filename,
  };
}

/**
 * Create an ErrorDisplay from a simple message
 */
export function createErrorDisplay(
  message: string,
  options?: Partial<ErrorDisplay>
): ErrorDisplay {
  return {
    title: options?.title || "Error",
    message,
    action: options?.action,
    severity: options?.severity || "error",
    icon: options?.icon || "error",
    showContactSupport: options?.showContactSupport ?? true,
    showRetry: options?.showRetry ?? true,
    category: options?.category || "UNKNOWN",
    referenceId: options?.referenceId,
    details: options?.details,
    errorType: options?.errorType,
    critical: options?.critical,
    filename: options?.filename,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate retry delay based on attempt number (exponential backoff)
 */
export function getRetryDelay(attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  return delay;
}

/**
 * Determine if an error should trigger auto-retry
 * Updated to use correct 6xxx codes
 */
export function shouldAutoRetry(error: StandardError): boolean {
  // Auto-retry for network errors and timeouts
  const retryableCategories = [ErrorCategory.NETWORK];

  const retryableCodes = [
    "6001", // CONNECTION_FAILED
    "6002", // TIMEOUT
    "6005", // PROXY_ERROR
    "3002", // MODEL_OVERLOADED
    "3004", // RATE_LIMITED
  ];

  return (
    retryableCategories.includes(error.error_category as ErrorCategory) ||
    retryableCodes.includes(error.error_code)
  );
}

/**
 * Check if error is critical (should block further operations)
 */
export function isCriticalError(error: StandardError): boolean {
  const criticalCodes = [
    "3003", // API_KEY_INVALID
    "9001", // INTERNAL_ERROR
    "9002", // DATABASE_ERROR
    "9003", // CONFIGURATION_ERROR
  ];

  return (
    error.critical === true ||
    criticalCodes.includes(error.error_code) ||
    error.severity === "error"
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  ErrorCategory,
  isStandardError,
  parseApiError,
  handleFetchError,
  formatError,
  createErrorDisplay,
  getRetryDelay,
  shouldAutoRetry,
  isCriticalError,
};
