/**
 * API Configuration for Submittal Factory Frontend
 * Handles backend URL detection, configuration, and standardized error handling
 *
 * @version 2.1.0 - Enhanced error handling for validation APIs
 */

import {
  StandardError,
  isStandardError,
  parseApiError,
  handleFetchError,
  formatError,
  ErrorDisplay,
  ErrorCategory,
} from "../utils/errorHandler";

// =============================================================================
// API BASE URL DETECTION
// =============================================================================

function getApiBaseUrl(): string {
  // Priority 1: Explicit environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Priority 2: Runtime detection based on current location
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    if (port === "5173" || port === "3000" || port === "4173") {
      // Development scenario - try localhost backend
      return `${protocol}//${hostname}:8000`;
    }
    if (port === "8000") {
      return `${protocol}//${hostname}:${port}`;
    }
    if (port === "80" || port === "443" || !port) {
      return `${protocol}//${hostname}`;
    }
    return `${protocol}//${hostname}:8000`;
  }

  // Fallback for SSR or unknown environments
  return "https://submittalfactory.com/gemini";
}

export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith("/api/")) {
    return `${baseUrl}${cleanEndpoint}`;
  }
  return `${baseUrl}/api${cleanEndpoint}`;
}

// =============================================================================
// API CONFIGURATION
// =============================================================================

export const apiConfig = {
  baseUrl: getApiBaseUrl(),
  timeout: 20000000,
  defaultHeaders: {
    "Content-Type": "application/json",
  },
  upload: {
    timeout: 20000000, // 5 min for uploads
    maxSizeMB: 5, // Updated to 5MB
  },
};

// =============================================================================
// AUTH TOKEN MANAGEMENT
// =============================================================================

/**
 * Utility: Get token from localStorage (for all API requests)
 */
function getAuthToken(): string | null {
  try {
    const authData = localStorage.getItem("submittalFactory_auth");
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.token || null;
    }
  } catch {}
  return null;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Wrapper type for API responses that can be either success or error
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: StandardError; display: ErrorDisplay };

/**
 * Check if response is an error
 */
export function isApiError<T>(
  response: ApiResponse<T>
): response is { success: false; error: StandardError; display: ErrorDisplay } {
  return !response.success;
}

// =============================================================================
// VALIDATION ERROR MESSAGES (User-Friendly)
// =============================================================================

const VALIDATION_ERROR_MESSAGES: Record<
  string,
  { message: string; action: string }
> = {
  "Failed to download PDF for validation": {
    message:
      "Could not retrieve the PDF document for validation. The PDF link may be broken or inaccessible.",
    action: "Try selecting a different PDF or refresh the search results.",
  },
  "PDF download failed": {
    message: "The PDF document could not be downloaded for validation.",
    action: "Check if the PDF link is still valid and try again.",
  },
  "Validation timeout": {
    message: "The validation process took too long to complete.",
    action: "Try again with a smaller document or wait a moment and retry.",
  },
  default: {
    message: "An error occurred while validating the PDF specifications.",
    action: "Please try again. If the issue persists, try a different PDF.",
  },
};

/**
 * Get user-friendly validation error message
 */
function getValidationErrorMessage(errorMessage: string): {
  message: string;
  action: string;
} {
  // Check for known error patterns
  for (const [pattern, errorInfo] of Object.entries(
    VALIDATION_ERROR_MESSAGES
  )) {
    if (
      pattern !== "default" &&
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    ) {
      return errorInfo;
    }
  }
  return VALIDATION_ERROR_MESSAGES.default;
}

// =============================================================================
// ENHANCED FETCH WRAPPER WITH ERROR HANDLING
// =============================================================================

/**
 * Enhanced fetch wrapper with auto token, error handling, and standardized errors
 * Returns ApiResponse<T> for type-safe error handling
 */
export async function apiRequestSafe<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = buildApiUrl(endpoint);

  // Add Authorization token if present
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : apiConfig.defaultHeaders),
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  // Timeout
  const timeoutMs = isFormData ? apiConfig.upload.timeout : apiConfig.timeout;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  config.signal = controller.signal;

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    // Check for error responses
    if (!response.ok) {
      const error = await parseApiError(response);
      return {
        success: false,
        error,
        display: formatError(error),
      };
    }

    // Parse successful response
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const data = await response.json();

      // Check if the JSON response itself indicates an error
      if (isStandardError(data)) {
        return {
          success: false,
          error: data,
          display: formatError(data),
        };
      }

      // Check for success: false in response (legacy format)
      if (data.success === false) {
        // Get user-friendly message for validation errors
        const errorInfo = getValidationErrorMessage(data.message || "");

        const error: StandardError = {
          success: false,
          error_code: data.error_code || "5003", // PDF_FETCH_FAILED for validation errors
          error_category: data.error_category || ErrorCategory.VALIDATION,
          user_message: data.user_message || errorInfo.message,
          action_required: data.action_required || errorInfo.action,
          severity: data.severity || "error",
          reference_id: data.reference_id,
        };
        return {
          success: false,
          error,
          display: formatError(error),
        };
      }

      return { success: true, data: data as T };
    }

    // Non-JSON response
    return { success: true, data: response as unknown as T };
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle fetch errors (network failures, timeouts, etc.)
    const standardError = handleFetchError(
      error instanceof Error ? error : new Error("Unknown error")
    );
    return {
      success: false,
      error: standardError,
      display: formatError(standardError),
    };
  }
}

/**
 * Legacy fetch wrapper - throws errors instead of returning them
 * Use apiRequestSafe for new code
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const result = await apiRequestSafe<T>(endpoint, options);

  if (!result.success) {
    // Throw an error with the user message for backwards compatibility
    const error = new Error(result.error.user_message) as Error & {
      standardError: StandardError;
      display: ErrorDisplay;
    };
    error.standardError = result.error;
    error.display = result.display;
    throw error;
  }

  return result.data;
}

// =============================================================================
// API METHODS
// =============================================================================

export const api = {
  // Health check
  health: () =>
    apiRequest<{ status: string; message: string; timestamp: string }>(
      "/health"
    ),
  healthSafe: () =>
    apiRequestSafe<{ status: string; message: string; timestamp: string }>(
      "/health"
    ),

  // PDF Extraction
  extractPdf: (file: File, sessionId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    if (sessionId) headers["x-session-id"] = sessionId;
    return apiRequest("/extract", {
      method: "POST",
      body: formData,
      headers,
    });
  },

  extractPdfSafe: (file: File, sessionId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    if (sessionId) headers["x-session-id"] = sessionId;
    return apiRequestSafe("/extract", {
      method: "POST",
      body: formData,
      headers,
    });
  },

  // Search Submittals
  searchSubmittals: (data: any) =>
    apiRequest("/search-submittals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  searchSubmittalsSafe: (data: any) =>
    apiRequestSafe("/search-submittals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Validate Specs - Enhanced with better error handling
  // REPLACE the validateSpecs function in your api.ts with this:

  validateSpecs: async (
    pdfUrl: string,
    productData: any,
    sessionId?: string
  ) => {
    const formData = new FormData();
    formData.append("pdf_url", pdfUrl);
    formData.append("product_data_json", JSON.stringify(productData));
    const headers: Record<string, string> = {};
    if (sessionId) headers["x-session-id"] = sessionId;

    const result = await apiRequestSafe("/validate-specs", {
      method: "POST",
      body: formData,
      headers,
    });

    // ✅ Check for HTTP/network errors only (4xx, 5xx status codes)
    if (!result.success) {
      // This is a network error or server error
      const error = new Error(result.error.user_message) as Error & {
        standardError: StandardError;
        display: ErrorDisplay;
        isValidationError: boolean;
      };
      error.standardError = result.error;
      error.display = result.display;
      error.isValidationError = true;
      throw error;
    }

    // ✅ At this point we have a successful HTTP response with validation data
    const validationData = result.data;

    // ✅ Validate that we got validation data back
    if (!validationData || typeof validationData !== "object") {
      const error = new Error("Invalid validation response format") as Error & {
        standardError: StandardError;
        display: ErrorDisplay;
        isValidationError: boolean;
      };
      error.standardError = {
        success: false,
        error_code: "5004",
        error_category: ErrorCategory.VALIDATION,
        user_message: "Received invalid validation data from server",
        action_required: "Please try again",
        severity: "error",
      };
      error.display = formatError(error.standardError);
      error.isValidationError = true;
      throw error;
    }

    // ✅ CRITICAL: Check if validation_score exists
    // If validation_score is missing, that's an actual error
    if (
      typeof validationData.validation_score !== "number" &&
      validationData.validation_score !== null
    ) {
      const error = new Error(
        "Validation score missing from response"
      ) as Error & {
        standardError: StandardError;
        display: ErrorDisplay;
        isValidationError: boolean;
      };
      error.standardError = {
        success: false,
        error_code: "5004",
        error_category: ErrorCategory.VALIDATION,
        user_message: "Validation completed but score data is missing",
        action_required: "Please try again",
        severity: "error",
      };
      error.display = formatError(error.standardError);
      error.isValidationError = true;
      throw error;
    }

    // ✅ Return the validation data even if score is low
    // Low scores (0%, 20%, etc.) are valid results, not errors
    return validationData;
  },

  validateSpecsSafe: (pdfUrl: string, productData: any, sessionId?: string) => {
    const formData = new FormData();
    formData.append("pdf_url", pdfUrl);
    formData.append("product_data_json", JSON.stringify(productData));
    const headers: Record<string, string> = {};
    if (sessionId) headers["x-session-id"] = sessionId;
    return apiRequestSafe("/validate-specs", {
      method: "POST",
      body: formData,
      headers,
    });
  },

  // Extract PDS Links
  extractPdsLinks: (data: any, sessionId?: string, refresh?: boolean) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionId) headers["x-session-id"] = sessionId;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const requestData = refresh ? { ...data, refresh: true } : data;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const url = buildApiUrl("/extract-pds-links");

    return fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestData),
      signal: controller.signal,
    })
      .then(async (response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          const error = await parseApiError(response);
          throw Object.assign(new Error(error.user_message), {
            standardError: error,
            display: formatError(error),
          });
        }
        return response.json();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          const timeoutError = handleFetchError(
            new Error("PDS link extraction timeout after 2 minutes")
          );
          throw Object.assign(new Error(timeoutError.user_message), {
            standardError: timeoutError,
            display: formatError(timeoutError),
          });
        }
        throw error;
      });
  },

  // Add More PDS Links
  addMorePdsLinks: (data: any, sessionId?: string) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionId) headers["x-session-id"] = sessionId;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const requestData = { ...data, refresh: true, mode: "add_more" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const url = buildApiUrl("/extract-pds-links/add-more");

    return fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestData),
      signal: controller.signal,
    })
      .then(async (response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          const error = await parseApiError(response);
          throw Object.assign(new Error(error.user_message), {
            standardError: error,
            display: formatError(error),
          });
        }
        return response.json();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if ((error as any).name === "AbortError") {
          const timeoutError = handleFetchError(
            new Error("PDS link extraction timeout after 2 minutes")
          );
          throw Object.assign(new Error(timeoutError.user_message), {
            standardError: timeoutError,
            display: formatError(timeoutError),
          });
        }
        throw error;
      });
  },

  // Add Validated PDFs
  addValidatedPdfs: (data: any, sessionId?: string) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionId) headers["x-session-id"] = sessionId;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    const url = buildApiUrl("/add-validated-pdfs");

    return fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      signal: controller.signal,
    })
      .then(async (response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          const error = await parseApiError(response);
          throw Object.assign(new Error(error.user_message), {
            standardError: error,
            display: formatError(error),
          });
        }
        return response.json();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          const timeoutError = handleFetchError(
            new Error("PDF validation timeout after 5 minutes")
          );
          throw Object.assign(new Error(timeoutError.user_message), {
            standardError: timeoutError,
            display: formatError(timeoutError),
          });
        }
        throw error;
      });
  },

  // Usage Summary
  usageSummary: (sessionId?: string) => {
    const params = sessionId
      ? `?session_id=${encodeURIComponent(sessionId)}`
      : "";
    return apiRequest(`/usage-summary${params}`);
  },

  usageSummarySafe: (sessionId?: string) => {
    const params = sessionId
      ? `?session_id=${encodeURIComponent(sessionId)}`
      : "";
    return apiRequestSafe(`/usage-summary${params}`);
  },

  // Proxy PDF
  proxyPdf: (url: string) =>
    buildApiUrl(`/proxy-pdf?url=${encodeURIComponent(url)}`),

  // Download PDFs
  downloadPdfs: (urls: string[]) =>
    apiRequest("/download-pdfs", {
      method: "POST",
      body: JSON.stringify({ urls }),
    }),

  // Download Individual PDF
  downloadIndividualPdf: (pdfData: string, filename: string) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const url = buildApiUrl("/download-individual-pdf");

    return fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ pdf_data: pdfData, filename }),
      signal: controller.signal,
    })
      .then(async (response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          const error = await parseApiError(response);
          throw Object.assign(new Error(error.user_message), {
            standardError: error,
            display: formatError(error),
          });
        }
        return response;
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          const timeoutError = handleFetchError(
            new Error("PDF download timeout after 2 minutes")
          );
          throw Object.assign(new Error(timeoutError.user_message), {
            standardError: timeoutError,
            display: formatError(timeoutError),
          });
        }
        throw error;
      });
  },

  // Trim PDF Part 2
  trimPdfPart2: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest("/pdf-tools/trim-pdf-part2", {
      method: "POST",
      body: formData,
    });
  },

  // Generate Validation Report
  generateValidationReport: (data: {
    validation_data: any;
    product_name: string;
    original_pdf_url: string;
  }) => {
    return apiRequest("/generate-validation-report", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Smart Validate Specs (with PDF bytes instead of URL)
  smartValidateSpecs: (
    pdfBytes: string,
    productData: any,
    sessionId?: string
  ) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionId) headers["x-session-id"] = sessionId;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    const url = buildApiUrl("/smart-validate-specs");

    return fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        pdf_bytes: pdfBytes,
        product_data_json: JSON.stringify(productData),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          const error = await parseApiError(response);
          throw Object.assign(new Error(error.user_message), {
            standardError: error,
            display: formatError(error),
          });
        }
        return response.json();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          const timeoutError = handleFetchError(
            new Error("Smart validation timeout after 5 minutes")
          );
          throw Object.assign(new Error(timeoutError.user_message), {
            standardError: timeoutError,
            display: formatError(timeoutError),
          });
        }
        throw error;
      });
  },
};

// =============================================================================
// DEVELOPMENT LOGGING
// =============================================================================

if (import.meta.env.DEV) {
  console.log("🔧 API Configuration:", {
    baseUrl: apiConfig.baseUrl,
    detectedFrom: import.meta.env.VITE_API_BASE_URL
      ? "Environment Variable"
      : "Runtime Detection",
    location: typeof window !== "undefined" ? window.location.href : "SSR",
  });
}

// =============================================================================
// SUBSCRIPTION TYPES & API
// =============================================================================

export interface SubscriptionStatus {
  user_id: number;
  subscription_type: "free_trial" | "limited" | "unlimited" | null;
  is_active: boolean;
  api_calls_used: number;
  api_call_limit: number; // -1 for unlimited
  start_date: string | null;
  valid_until: string | null;
  days_remaining: number | null;
}

export interface GrantSubscriptionRequest {
  user_id: number;
  subscription_type: "limited" | "unlimited";
  api_call_limit?: number;
  valid_days?: number;
}

export interface SubscriptionSetting {
  setting_key: string;
  setting_value: string | number;
  description: string;
}

export const subscriptionApi = {
  // User APIs
  getStatus: (): Promise<SubscriptionStatus> =>
    apiRequest("/subscription/status"),

  getStatusSafe: () =>
    apiRequestSafe<SubscriptionStatus>("/subscription/status"),

  // Admin APIs
  getUserStatus: (userId: number): Promise<SubscriptionStatus> =>
    apiRequest(`/subscription/user/${userId}/status`),

  grant: (data: GrantSubscriptionRequest) =>
    apiRequest("/subscription/grant", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  revoke: (userId: number) =>
    apiRequest(`/subscription/revoke/${userId}`, {
      method: "POST",
    }),

  getSettings: (): Promise<SubscriptionSetting[]> =>
    apiRequest("/subscription/settings"),

  updateSetting: (settingKey: string, value: string | number) =>
    apiRequest(`/subscription/settings/${settingKey}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    }),
};

// =============================================================================
// RE-EXPORTS FOR CONVENIENCE
// =============================================================================

// Type exports (must use 'export type' with isolatedModules)
export type { StandardError, ErrorDisplay } from "../utils/errorHandler";

// Value exports
export {
  ErrorCategory,
  isStandardError,
  formatError,
  parseApiError,
  handleFetchError,
} from "../utils/errorHandler";
