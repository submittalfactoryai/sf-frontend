/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, {
  useState,
  useEffect,
  memo,
  useMemo,
  useRef,
  useCallback,
} from "react"; // Import useMemo
import { createPortal } from "react-dom"; // Add createPortal import
import {
  Upload,
  FileText,
  CheckCircle,
  X,
  Square,
  CheckSquare,
  Trash2,
  Archive,
  Loader2,
  Info,
  CheckCircle2,
  ScanSearch,
  XCircle,
  Lock,
  AlertTriangle,
} from "lucide-react";
// Also add FiCreditCard and FiAlertTriangle to your imports at the top:
import {
  FiChevronDown,
  FiChevronUp,
  FiLogOut,
  FiSettings,
  FiCreditCard,
  FiAlertTriangle,
} from "react-icons/fi";
import { Link, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { LogOut, ChevronDown, ChevronUp } from "lucide-react";
// pages
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";
import LandingPage from "./pages/LandingPage";
import SubscriptionPage from "./pages/SubscriptionPage";

import { Logo } from "./components/Logo";
import { LoginForm } from "./components/LoginForm";
import SmartValidate from "./components/SmartValidate";
import JSZip from "jszip";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
// import { useDropzone } from 'react-dropzone';
import { api, buildApiUrl } from "./config/api";
// ============================================================================
// ERROR HANDLING IMPORTS - Standardized error handling system
// ============================================================================
import type { StandardError } from "./config/api";
import { isStandardError, formatError } from "./config/api";
import { useErrorHandler } from "./hooks/useErrorHandler";
import ErrorNotification from "./components/ErrorNotification";
import useAuth from "./hooks/useAuth";
import SubscriptionBanner from "./components/SubscriptionBanner";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { logFrontendAudit } from "./hooks/auditlog";

// Define the type for the base Product data (adjust as needed)
type Product = {
  id: string;
  name: string;
  specifications: (string | { key: string; value: string })[]; // Allow both structures
  manufacturers: string[];
  reference?: string;
  product_name?: string; // Add for backward compatibility
  technical_specifications?: (string | { key: string; value: string })[]; // Add for backward compatibility
};

// Define the type for SearchResult from the API
type SearchResult = {
  title: string;
  link: string; // This is the pdf_link
  snippet: string;
  confidence_score?: number;
  justification?: string;
  heading?: string;
  pdf_data?: string; // Base64 encoded PDF data (for validated PDFs)
  is_validated?: boolean; // Flag indicating if this PDF has been validated
  from_listed_manufacturer?: number; // 1 if from listed manufacturer, 0 otherwise
  // No product_data here
};

// Define the ValidationResult type
type ValidationResult = {
  success: boolean;
  message: string;
  validation_score: number | null;
  product_name: string | null; // This might be from product_data, not LLM response

  // Fields from the LLM's JSON response
  valid?: "Yes" | "No"; // LLM output
  product_name_found?: "Yes" | "No"; // LLM output
  specifications_match?: string; // e.g., "3/5"
  matched_specifications?: string[];
  unmatched_specifications?: string[];
  any_manufacturer_found?: "Yes" | "No";
  found_manufacturers?: string[];
  unmatched_manufacturers?: string[];
  summary?: string | null; // LLM output

  // Fields for internal tracking/display (can be derived or passed)
  details?: {
    // This 'details' sub-object seems to duplicate fields. Consolidating.
    valid?: string; // Already top-level
    validation_score?: number; // Already top-level
    product_name_found?: string; // Already top-level
    summary?: string; // Already top-level
    unmatched_specifications?: string[]; // Already top-level
    // New fields to consider if they were meant for 'details' specifically
    matched_specifications?: string[];
    any_manufacturer_found?: "Yes" | "No";
    found_manufacturers?: string[];
    unmatched_manufacturers?: string[];
  };
  // Redundant fields removed for clarity, already present at top level or derivable
  // summary?: string | null;
  // unmatched_specifications?: string[] | null;

  // Fields from backend processing not directly from LLM
  response?: string; // Raw LLM response text
  elapsed_time?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  model_used?: string;
  error?: string; // For backend errors not from LLM
  pdf_path_validated?: string;
  product_json_used?: string;
};

type RawApiProduct = {
  product_name?: string;
  name?: string;
  technical_specifications?: Array<string | { key?: string; value?: string }>;
  specifications?: Array<string | { key?: string; value?: string }>;
  manufacturers?:
    | string[]
    | { base?: string[]; optional?: string[] }
    | undefined;
  reference?: string;
};

type ApiErrorDetail = { detail?: string };

interface ResponseError extends Error {
  response?: {
    json: () => Promise<ApiErrorDetail>;
  };
}

function hasResponse(err: unknown): err is ResponseError {
  return (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as ResponseError).response?.json === "function"
  );
}

// Default error result
const DEFAULT_ERROR_RESULT: ValidationResult = {
  success: false,
  message: "An unexpected error occurred.",
  validation_score: null,
  product_name: null,
  summary: "Error processing validation.",
  valid: "No",
  product_name_found: "No",
  specifications_match: "0/0",
  matched_specifications: [],
  unmatched_specifications: [],
  any_manufacturer_found: "No",
  found_manufacturers: [],
  unmatched_manufacturers: [],
  error: "An unexpected error occurred.",
};

// Add this component near your other components (like ValidationResultPopup)
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="bg-white rounded-xl shadow-xl max-w-md w-full z-10 overflow-hidden">
        <div className="p-6 border-b border-neutral-100">
          <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        </div>

        <div className="p-6">
          <p className="text-neutral-600">{message}</p>
        </div>

        <div className="flex justify-end gap-3 p-6 bg-neutral-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ValidationButton component (ensure selectedProduct prop type matches Product)
const ValidationButton = ({
  onValidate,
  isValidating = false,
  isGeneratingReport = false,
  disabled = false,
  selectedProduct, // Changed prop name for clarity, type is Product
  pdfLink, // Add PDF link to identify this specific PDF
  validationHistory, // Add validation history to check for stored validations
  onShowStoredResult, // Add callback to show stored result
}: {
  onValidate: () => Promise<ValidationResult>;
  isValidating?: boolean;
  isGeneratingReport?: boolean;
  disabled?: boolean;
  selectedProduct?: Product | null; // Use Product type
  pdfLink?: string; // PDF link for looking up stored validations
  validationHistory?: { [key: string]: ValidationResult }; // Validation history object
  onShowStoredResult?: (result: ValidationResult) => void; // Callback to show stored result
}) => {
  // Check if this PDF has a stored validation result
  const hasStoredValidation =
    pdfLink && validationHistory && validationHistory[pdfLink] ? true : false;

  // Get the stored validation if it exists
  const storedValidation =
    pdfLink && validationHistory ? validationHistory[pdfLink] : null;

  const handleValidateClick = async () => {
    if (disabled || isValidating || isGeneratingReport) return;
    const result = await onValidate(); // This function will handle updating the PDF preview with validation report
    // The popup will be shown by the parent handleValidateSpecs function
  };

  const handleShowStoredResult = () => {
    if (storedValidation && onShowStoredResult) {
      onShowStoredResult(storedValidation);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null || score < 0) return "bg-neutral-300"; // Grey for null/invalid score
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="relative flex items-center">
      <button
        onClick={handleValidateClick}
        disabled={isValidating || isGeneratingReport || disabled}
        className={`flex items-center justify-center gap-2 rounded-lg ${
          hasStoredValidation ? "rounded-r-none" : ""
        } border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          disabled
            ? "cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-400"
            : isValidating || isGeneratingReport
            ? "cursor-wait border-blue-300 bg-blue-100 text-blue-600 focus:ring-blue-500"
            : "border-green-600 bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500"
        }`}
      >
        {isGeneratingReport ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Report...
          </>
        ) : isValidating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Validating...
          </>
        ) : (
          <>
            <ScanSearch className="h-4 w-4" />
            Validate Specs
          </>
        )}
      </button>

      {/* Show validation score indicator if stored validation exists - make it clickable */}
      {hasStoredValidation && storedValidation && (
        <button
          onClick={handleShowStoredResult}
          className={`flex items-center justify-center rounded-lg rounded-l-none border-t border-r border-b px-3 py-2 text-xs font-medium transition-colors hover:bg-green-100 ${
            disabled || isValidating || isGeneratingReport
              ? "border-neutral-300 bg-neutral-100 text-neutral-400 cursor-not-allowed"
              : "border-green-600 bg-green-50 text-green-700 cursor-pointer"
          }`}
          title={`Click to view validation details - Score: ${storedValidation.validation_score}%`}
          disabled={disabled || isValidating || isGeneratingReport}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3" />
            <span>{storedValidation.validation_score}%</span>
          </div>
        </button>
      )}
    </div>
  );
};

// Debug component for testing popup in production
const DebugValidationPopup = ({ onTestPopup }: { onTestPopup: () => void }) => {
  const [showDebug, setShowDebug] = useState(false);

  // Only show in development or when specifically enabled
  if (
    process.env.NODE_ENV === "production" &&
    !window.location.search.includes("debug=true")
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-mono"
      >
        DEBUG
      </button>
      {showDebug && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg p-4 shadow-lg min-w-64">
          <h3 className="font-bold text-sm mb-2">Debug Controls</h3>
          <button
            onClick={onTestPopup}
            className="w-full bg-blue-500 text-white px-3 py-2 rounded text-xs mb-2"
          >
            Test Validation Popup
          </button>
          <div className="text-xs text-gray-600">
            <div>Environment: {process.env.NODE_ENV || "development"}</div>
            <div>URL: {window.location.href}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Modern ValidationResultPopup component
const ValidationResultPopup = ({
  isOpen,
  onClose,
  validationResult,
  productName,
  onClearValidationResult,
}: {
  isOpen: boolean;
  onClose: () => void;
  validationResult: ValidationResult | null;
  productName?: string;
  onClearValidationResult?: () => void;
}) => {
  // Add debugging for production
  React.useEffect(() => {
    // console.log('ValidationResultPopup render:', {
    //   isOpen,
    //   hasValidationResult: !!validationResult,
    //   productName: productName || 'none'
    // });
  }, [isOpen, validationResult, productName]);

  if (!isOpen || !validationResult) {
    // console.log('ValidationResultPopup not rendering:', { isOpen, hasResult: !!validationResult });
    return null;
  }

  const isSuccess = validationResult.success;
  const score = validationResult.validation_score;

  const getScoreColor = (score: number | null) => {
    if (score === null || score < 0) return "text-neutral-500";
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number | null) => {
    if (score === null || score < 0) return "bg-neutral-100";
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 50) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  // console.log('ValidationResultPopup rendering popup with:', { isSuccess, score });

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col"
        style={{
          maxHeight: "85vh",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b border-neutral-200 flex-shrink-0 ${
            isSuccess ? "bg-green-50" : "bg-red-50"
          }`}
          style={{ flexShrink: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSuccess ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Validation {isSuccess ? "Complete" : "Failed"}
                </h2>
                <p className="text-sm text-neutral-600">
                  {productName ||
                    validationResult.product_name ||
                    "Product validation"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                console.log("Closing validation popup");
                onClose();
                // Clear validation state to prevent contamination
                if (onClearValidationResult) {
                  onClearValidationResult();
                }
              }}
              className="p-2 rounded-lg transition-colors"
              style={{
                padding: "8px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="p-6 overflow-y-auto"
          style={{ flex: 1, overflowY: "auto" }}
        >
          {/* Validation Score */}
          {score !== null && (
            <div
              className={`rounded-lg border p-4 mb-6 ${getScoreBgColor(score)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-700">
                      Validation Score:
                    </span>
                    <span
                      className={`text-2xl font-bold ${getScoreColor(score)}`}
                    >
                      {score}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`w-16 h-2 rounded-full ${
                      score >= 80
                        ? "bg-green-200"
                        : score >= 50
                        ? "bg-yellow-200"
                        : "bg-red-200"
                    }`}
                    style={{
                      width: "64px",
                      height: "8px",
                      borderRadius: "9999px",
                    }}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        score >= 80
                          ? "bg-green-500"
                          : score >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.max(0, Math.min(100, score))}%`,
                        height: "100%",
                        borderRadius: "9999px",
                        transition: "all 0.5s",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary or Error Message */}
          {(validationResult.summary || validationResult.error) && (
            <div
              className={`p-4 rounded-lg ${
                !isSuccess ? "bg-red-50 border border-red-200" : "bg-neutral-50"
              }`}
            >
              <h3
                className={`font-medium mb-2 ${
                  !isSuccess ? "text-red-800" : "text-neutral-700"
                }`}
              >
                {!isSuccess ? "⚠️ Validation Issue" : "Summary"}
              </h3>
              <p
                className={`text-sm ${
                  !isSuccess ? "text-red-700" : "text-neutral-600"
                }`}
              >
                {validationResult.error || validationResult.summary}
              </p>
              {!isSuccess &&
                validationResult.summary &&
                validationResult.summary !== validationResult.error && (
                  <p className="text-sm text-red-600 mt-2">
                    {validationResult.summary}
                  </p>
                )}
            </div>
          )}

          {/* Validation Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Product Name Found */}
            <div className="bg-neutral-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-neutral-600">
                  Product Name
                </span>
                {validationResult.product_name_found === "Yes" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <p className="text-sm text-neutral-800">
                {validationResult.product_name_found === "Yes"
                  ? "Found in PDF"
                  : "Not found in PDF"}
              </p>
            </div>

            {/* Specifications Match */}
            <div className="bg-neutral-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-neutral-600">
                  Specifications
                </span>
                <span className="text-xs font-semibold text-blue-600">
                  {validationResult.specifications_match || "0/0"}
                </span>
              </div>
              <p className="text-sm text-neutral-800">
                {validationResult.specifications_match ||
                  "No specifications checked"}
              </p>
            </div>

            {/* Manufacturers */}
            <div className="bg-neutral-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-neutral-600">
                  Manufacturers
                </span>
                {validationResult.any_manufacturer_found === "Yes" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <p className="text-sm text-neutral-800">
                {validationResult.any_manufacturer_found === "Yes"
                  ? "Found in PDF"
                  : "Not found in PDF"}
              </p>
            </div>

            {/* Validation Status */}
            <div className="bg-neutral-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-neutral-600">
                  Overall Status
                </span>
                {validationResult.valid === "Yes" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <p className="text-sm text-neutral-800">
                {validationResult.valid === "Yes"
                  ? "Valid Document"
                  : "Invalid Document"}
              </p>
            </div>
          </div>

          {/* Matched Specifications */}
          {validationResult.matched_specifications &&
            validationResult.matched_specifications.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Matched Specifications (
                  {validationResult.matched_specifications.length})
                </h4>
                <div className="space-y-2">
                  {validationResult.matched_specifications.map(
                    (spec, index) => (
                      <div
                        key={index}
                        className="bg-green-50 border border-green-200 rounded-lg p-3"
                      >
                        <p className="text-sm text-green-800">{spec}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Unmatched Specifications */}
          {validationResult.unmatched_specifications &&
            validationResult.unmatched_specifications.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Unmatched Specifications (
                  {validationResult.unmatched_specifications.length})
                </h4>
                <div className="space-y-2">
                  {validationResult.unmatched_specifications.map(
                    (spec, index) => (
                      <div
                        key={index}
                        className="bg-red-50 border border-red-200 rounded-lg p-3"
                      >
                        <p className="text-sm text-red-800">{spec}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Manufacturers - Only show if found, otherwise show not from listed manufacturer */}
          <div className="mb-4">
            {validationResult.found_manufacturers &&
            validationResult.found_manufacturers.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Found Manufacturers (
                  {validationResult.found_manufacturers.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {validationResult.found_manufacturers.map(
                    (manufacturer, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
                      >
                        {manufacturer}
                      </span>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Manufacturer Status
                </h4>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  Not from listed manufacturer
                </span>
              </div>
            )}
          </div>

          {/* Technical Details (for debugging) */}
          {(validationResult.elapsed_time || validationResult.model_used) && (
            <div className="mt-6 pt-4 border-t border-neutral-200">
              <h4 className="text-xs font-semibold text-neutral-500 mb-2">
                Technical Details
              </h4>
              <div className="text-xs text-neutral-500 space-y-1">
                {validationResult.elapsed_time && (
                  <div>
                    Processing time: {validationResult.elapsed_time.toFixed(2)}s
                  </div>
                )}
                {validationResult.model_used && (
                  <div>Model: {validationResult.model_used}</div>
                )}
                {validationResult.prompt_tokens &&
                  validationResult.completion_tokens && (
                    <div>
                      Tokens:{" "}
                      {validationResult.prompt_tokens +
                        validationResult.completion_tokens}
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const usStates = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

// Component for displaying PDF previews with better error handling
const PDFPreview = memo(({ url, scale }: { url: string; scale: number }) => {
  // Wrap with memo
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  // Memoize the options object for the Document component
  const pdfOptions = useMemo(
    () => ({
      cMapUrl: "/pdfjs-viewer/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "/pdfjs-viewer/standard_fonts/",
    }),
    []
  );

  // Reset state explicitly when the URL prop changes
  useEffect(() => {
    // console.log(`PDFPreview: URL prop changed to: ${url}. Resetting state.`);
    setLoading(true);
    setError(null);
    setNumPages(null);
  }, [url]);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    // console.log(
    //   `PDFPreview: Load Success for ${url}. Pages: ${numPages}. Setting loading=false.`
    // );
    setNumPages(numPages);
    setLoading(false); // Set loading false *after* setting numPages
    setError(null);
  };

  const handleError = (err: Error) => {
    console.error(`PDFPreview: Load Error for ${url}:`, err);
    setError(err.message || "Failed to load PDF");
    setLoading(false); // Ensure loading is false on error
  };

  const handlePageError = (pageErr: Error) => {
    console.error(
      `PDFPreview: Error rendering a page for ${url} at scale ${scale}:`,
      pageErr
    );
    setError(`Failed to render PDF page. ${pageErr.message}`);
  };

  const handleRetry = () => {
    const originalUrl = url.replace("/api/proxy-pdf?url=", "");
    // console.log("PDFPreview: Retrying with original URL:", originalUrl);
    window.open(originalUrl, "_blank");
  };

  // console.log(
  //   `PDFPreview: Rendering for ${url}. Loading: ${loading}, Error: ${error}, NumPages: ${numPages}, Scale: ${scale}`
  // );

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative">
      {" "}
      {/* Center content */}
      <Document
        key={url} // Force re-mount when URL changes
        file={url}
        onLoadSuccess={handleDocumentLoadSuccess}
        onError={handleError}
        loading={null} // Disable internal loading indicator
        error={null} // Disable internal error display
        options={pdfOptions} // Use the memoized options
        className="w-full h-full flex flex-col items-center overflow-auto" // Ensure column layout and centering
      >
        {/* Conditional Rendering based on state */}
        {loading ? (
          // Show loading indicator while loading=true
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <span>Loading preview...</span>
          </div>
        ) : error ? (
          // Show error message if error occurred
          <div className="p-8 text-center text-red-600">
            <div className="mb-4">PDF preview could not be loaded</div>
            <div className="text-sm mb-4">Error: {error}</div>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Open PDF directly
            </button>
          </div>
        ) : numPages ? (
          // Show Page component if loading is finished, no error, and numPages is set
          // Loop through all pages and render each one
          Array.from(new Array(numPages), (el, index) => (
            <Page
              key={`page_${index + 1}-${url}-scale-${scale}`} // Include URL and scale in key for re-renders
              pageNumber={index + 1}
              scale={scale}
              className="mb-2 shadow-sm" // Removed flex and justify-center, pages will stack in flex-col parent
              onError={handlePageError}
              loading={null} // Disable internal loading indicator for Page
              renderAnnotationLayer={false} // Optionally disable annotation layer for previews
              renderTextLayer={true} // Optionally enable text layer if selectable text is desired
            />
          ))
        ) : (
          // Fallback if numPages is null but not loading and no error
          <div className="p-8 text-center text-neutral-500">
            <span>No preview available or document has no pages.</span>
          </div>
        )}
      </Document>
    </div>
  );
});

import { Search, Download } from "lucide-react";

const ACTION_SEARCH = "search";
// const ACTION_VALIDATE = 'validate'
const STORAGE_KEY = "sf_selectedAction";
const STORAGE_TIME = "sf_selectedActionTime";
const TTL = 2 * 60 * 60 * 1000; // 2 hours in ms

function App() {
  const {
    isAuthenticated,
    user,
    login,
    logout,
    sessionExpired,
    handleSessionExpiredLogin,
    refreshSubscription,
  } = useAuth();
  // const {
  //   isAuthenticated,
  //   user,
  //   token,
  //   login,
  //   logout,
  //   loading: authLoading,
  //   error: authError,
  //   sessionExpired,
  //   handleSessionExpiredLogin
  // } = useAuth();

  // Replace your old handleLogin with this:
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  // Update handleLogin to navigate to base path after successful login
  const handleLogin = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; inactive?: boolean }> => {
    const result = await login(email, password);
    if (result.inactive) {
      logout();
      return { success: false, inactive: true };
    }
    if (result.success) {
      navigate("/app"); // This will go to /gemini because of the basename
    }
    return result;
  };

  // const handleLogout = () => {
  //   logout();
  // };
  const handleLogout = () => {
    // 1. First reset all critical states that affect UI
    setFile(null);
    setValidationFile(null);
    setProducts([]);
    setValidationProducts([]);
    setSelectedProduct(null);

    // 2. Then reset secondary states
    setSearchResults([]);
    setSelectedSubmittals(new Set());
    setDownloadedSubmittals([]);
    setSelectedSubmittalForPreview(null);

    // 3. Reset validation-related states
    setCurrentValidationResult(null);
    setShowValidationPopup(false);
    setValidationHistory({});

    // 4. Reset remaining states
    setError(null);
    setCurrentSessionId(null);

    // 5. Clear file inputs (without causing re-renders)
    if (typeof window !== "undefined") {
      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement | null;
      const validationInput = document.getElementById(
        "validation-upload"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";
      if (validationInput) validationInput.value = "";
    }

    // 6. Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TIME);

    // 7. Force file input remount
    setFileInputKey((prev) => prev + 1);

    // 8. Perform auth logout
    logout();
    navigate("/");
  };
  // Replace your static currentUser with the authenticated user
  const currentUser = user
    ? {
        name: user.user_name,
        email: user.email,
        role: (user.roles || []).includes("admin") ? "Admin" : "User",
      }
    : {
        name: "Guest",
        email: "",
        role: "Guest",
      };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // ERROR HANDLER HOOK - Standardized error handling
  // ============================================================================
  const {
    error: errorDisplay,
    isVisible: isErrorVisible,
    showError,
    clearError,
    handleApiError,
    handleException, // ✅ FIXED: Added handleException from useErrorHandler
  } = useErrorHandler();

  const [file, setFile] = useState<File | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedSubmittalForPreview, setSelectedSubmittalForPreview] =
    useState<SearchResult | null>(null);
  const [selectedSubmittals, setSelectedSubmittals] = useState<Set<string>>(
    new Set()
  );
  const [downloadedSubmittals, setDownloadedSubmittals] = useState<
    SearchResult[]
  >([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [showPart2Popup, setShowPart2Popup] = useState(false);
  const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
  const [pdfPart2File, setPdfPart2File] = useState<File | Blob | null>(null);
  const [isTrimmingPdf, setIsTrimmingPdf] = useState(false);
  // const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [previewPdfScale, setPreviewPdfScale] = useState(1.0);
  const [isValidatingSpecs, setIsValidatingSpecs] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [validationHistory, setValidationHistory] = useState<
    Record<string, ValidationResult>
  >({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  // const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [currentValidationResult, setCurrentValidationResult] =
    useState<ValidationResult | null>(null);

  const [validationFile, setValidationFile] = useState<File | null>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 2. Scroll‐background state
  const [scrolled, setScrolled] = useState(false);

  // Add alongside other useState hooks
  const [seenLinks, setSeenLinks] = useState<Set<string>>(new Set());
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [addMoreNotice, setAddMoreNotice] = useState<string | null>(null);

  const [validationProducts, setValidationProducts] = useState<Product[]>([]);

  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [blockingMessage, setBlockingMessage] = useState("");

  const checkSubscriptionBlock = useCallback((subscription: any) => {
    if (!subscription) {
      setSubscriptionBlocked(true);
      setBlockingMessage(
        "No active subscription. Please contact admin to activate your account."
      );
      return true;
    }

    // Admin users are never blocked
    if (subscription.subscription_type === "admin") {
      setSubscriptionBlocked(false);
      setBlockingMessage("");
      return false;
    }

    // Check if expired
    if (subscription.is_expired) {
      setSubscriptionBlocked(true);
      setBlockingMessage(
        `Your 30-day free trial has expired. Please contact ${
          subscription.admin_contact_email || "zack@kbccm.com"
        } to continue using the service.`
      );
      return true;
    }

    // Check if locked
    if (subscription.is_locked) {
      setSubscriptionBlocked(true);
      setBlockingMessage(
        `Your account has been locked. Please contact ${
          subscription.admin_contact_email || "zack@kbccm.com"
        } for assistance.`
      );
      return true;
    }

    // ✅ FIXED: Don't fully block if user has active workflow
    // Only block NEW uploads, not workflow operations (search, validate, download)
    if (
      subscription.api_call_limit >= 0 &&
      subscription.api_calls_remaining <= 0
    ) {
      // ✅ NEW: If user has used API calls, they have workflow to complete
      // Don't block the entire UI - just disable upload functionality
      if (subscription.api_calls_used > 0) {
        // User can still complete their workflow, just can't upload new PDFs
        setSubscriptionBlocked(false);
        setBlockingMessage("");
        return false; // ✅ Allow workflow operations to continue
      }

      // Only block if user has never uploaded (no workflow to complete)
      setSubscriptionBlocked(true);
      setBlockingMessage(
        `You have used all ${
          subscription.api_call_limit
        } PDF uploads in your free trial. Please contact ${
          subscription.admin_contact_email || "zack@kbccm.com"
        } to upgrade your plan.`
      );
      return true;
    }

    // All checks passed
    setSubscriptionBlocked(false);
    setBlockingMessage("");
    return false;
  }, []);

  // ✅ Check subscription status when user changes
  useEffect(() => {
    if (user?.subscription) {
      checkSubscriptionBlock(user.subscription);
    }
  }, [user?.subscription, checkSubscriptionBlock]);

  // ✅ NEW: Refresh subscription status periodically (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshSubscription && refreshSubscription();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshSubscription]);

  // 4. Effect: toggle `scrolled` when window scrolls past 20px
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hasActiveSubscription = (
    subscription: any,
    roles: string | string[] | undefined
  ): boolean => {
    // ✅ Admin users always have access
    const isAdmin =
      typeof roles === "string"
        ? roles.toLowerCase() === "admin"
        : Array.isArray(roles) &&
          roles.some((r) => r.toLowerCase() === "admin");

    if (isAdmin) {
      return true;
    }

    // ✅ Check if subscription is active
    if (!subscription || !subscription.is_active) {
      return false;
    }

    // ✅ Check if expired
    if (subscription.is_expired || subscription.is_locked) {
      return false;
    }

    return true;
  };

  // 5. Effect: close dropdown when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // When the search modal opens or results first arrive, seed the set
  useEffect(() => {
    if (!showSearchModal) return;
    setSeenLinks((prev) => {
      const next = new Set(prev);
      for (const r of searchResults) next.add(r.link);
      return next;
    });
  }, [showSearchModal, searchResults]);

  // Memoize the URL for the PDFPreview component
  const pdfPreviewUrl = useMemo(() => {
    if (!selectedSubmittalForPreview) return null;

    // If this is a validated PDF with embedded report data, use the base64 data
    if (selectedSubmittalForPreview.pdf_data) {
      return `data:application/pdf;base64,${selectedSubmittalForPreview.pdf_data}`;
    }

    // Otherwise, use the original link through the proxy
    if (!selectedSubmittalForPreview.link) return null;
    const link = String(selectedSubmittalForPreview.link);
    return api.proxyPdf(link);
  }, [
    selectedSubmittalForPreview?.link,
    selectedSubmittalForPreview?.pdf_data,
  ]); // Add pdf_data as dependency

  // Validate specs message handler
  const handleValidateSpecs = async (): Promise<ValidationResult> => {
    if (!selectedSubmittalForPreview || !selectedProduct) {
      throw new Error("No PDF selected for validation or no product selected");
    }

    // Create a deep copy of the product to prevent contamination
    const productCopy = {
      id: selectedProduct.id,
      name: String(selectedProduct.name),
      specifications: selectedProduct.specifications.map((spec) => {
        if (typeof spec === "string") {
          return String(spec);
        } else if (typeof spec === "object" && spec !== null) {
          return {
            key: String(spec.key || ""),
            value: String(spec.value || ""),
          };
        }
        return spec;
      }),
      manufacturers: selectedProduct.manufacturers.map((m) => String(m)),
      reference: String(selectedProduct.reference || ""),
    };

    setIsValidatingSpecs(true);
    // Clear any previous errors
    clearError();

    try {
      const result = await api.validateSpecs(
        selectedSubmittalForPreview.link,
        productCopy,
        currentSessionId || undefined
      );

      // Store validation result in history
      const newValidationHistory = { ...validationHistory };
      newValidationHistory[selectedSubmittalForPreview.link] = result;
      setValidationHistory(newValidationHistory);

      // Show the validation popup with results
      // console.log("Setting validation result and showing popup:", {
      //   result: result,
      //   success: result.success,
      //   score: result.validation_score,
      // });
      setCurrentValidationResult(result);
      setShowValidationPopup(true);

      // After successful validation, generate and preview the validation report PDF
      if (result.success) {
        setIsGeneratingReport(true);
        try {
          // Generate validation report PDF using the backend endpoint
          const reportResponse = await api.generateValidationReport({
            validation_data: result,
            product_name: productCopy.name,
            original_pdf_url: selectedSubmittalForPreview.link,
          });

          // Convert the response to blob for preview
          const reportBlob = await (reportResponse as Response).blob();

          // Create a new SearchResult with the validation report PDF data
          const reportPdfData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(",")[1];
              resolve(base64);
            };
            reader.readAsDataURL(reportBlob);
          });

          // Update the current preview to show the validation report
          const updatedSubmittal: SearchResult = {
            ...selectedSubmittalForPreview,
            pdf_data: reportPdfData,
            is_validated: true,
            title: `${selectedSubmittalForPreview.title} - Validation Report`,
            snippet: `Validation Report - Score: ${
              result.validation_score
            }% - ${result.summary || "Validated"}`,
          };

          setSelectedSubmittalForPreview(updatedSubmittal);

          // Also update it in search results if it exists there
          setSearchResults((prevResults) =>
            prevResults.map((r) =>
              r.link === selectedSubmittalForPreview.link ? updatedSubmittal : r
            )
          );
        } catch (reportError: any) {
          console.error("Error generating validation report:", reportError);
          // If report generation fails, continue with normal validation result
        } finally {
          setIsGeneratingReport(false);
        }
      }
      await refreshUserSubscription();

      return result;
    } catch (error: any) {
      console.error("Validation error:", error);

      // ✅ FIXED: Extract user-friendly error message from various error formats
      const userMessage =
        error?.standardError?.user_message ||
        error?.display?.message ||
        error?.message ||
        "Validation failed";

      const actionRequired =
        error?.standardError?.action_required ||
        error?.display?.action ||
        "Please try again with a different PDF.";

      // Check if this is a standardized validation error or has display info
      if (error.standardError || error.isValidationError || error.display) {
        // ✅ FIXED: Use handleException if available, otherwise fallback to showError
        if (typeof handleException === "function") {
          handleException(error);
        } else {
          // Fallback to showError for proper error display
          showError({
            title: "Validation Error",
            message: userMessage,
            action: actionRequired,
            severity: error?.standardError?.severity || "error",
            icon: "error",
            showContactSupport: true,
            showRetry: true,
            category: "VALIDATION",
          });
        }

        // Also show in the validation popup with error state
        const errorResult: ValidationResult = {
          ...DEFAULT_ERROR_RESULT,
          message: userMessage,
          error: userMessage,
          summary: actionRequired,
        };

        // If we have partial validation data from the error, use it
        if (error.validationResult) {
          Object.assign(errorResult, {
            validation_score: error.validationResult.validation_score,
            product_name: error.validationResult.product_name,
          });
        }

        setCurrentValidationResult(errorResult);
        setShowValidationPopup(true);

        return errorResult;
      }

      // Handle legacy errors without standardError
      const errorMessage = error.message || "Validation failed";

      // ✅ FIXED: Use showError for proper notification display
      showError({
        title: "Validation Error",
        message: errorMessage,
        severity: "error",
        icon: "error",
        showContactSupport: true,
        showRetry: true,
        category: "VALIDATION",
      });

      // Also set legacy error for backwards compatibility
      setError(errorMessage);

      const errorResult: ValidationResult = {
        ...DEFAULT_ERROR_RESULT,
        message: errorMessage,
        error: errorMessage,
        summary:
          "An error occurred while validating the PDF. Please try again.",
      };

      // Show the error in the validation popup
      setCurrentValidationResult(errorResult);
      setShowValidationPopup(true);

      return errorResult;
    } finally {
      setIsValidatingSpecs(false);
    }
  };

  // Add a useEffect to log the full validationResult when it changes, for debugging
  useEffect(() => {
    if (validationHistory && selectedSubmittalForPreview?.link) {
      const currentValidationResult =
        validationHistory[selectedSubmittalForPreview.link];
      if (currentValidationResult) {
        // console.log(
        //   "Current Validation Result in App.tsx:",
        //   JSON.stringify(currentValidationResult, null, 2)
        // );
      }
    }
  }, [validationHistory, selectedSubmittalForPreview]);

  // Message event listener for PDF viewer iframe communication
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Added MessageEvent type
      if (
        event.data &&
        event.data.type === "VALIDATE_SPECS" &&
        event.data.source === "pdf-viewer"
      ) {
        console.log("Received validation request from PDF viewer");
        const result = await handleValidateSpecs();
        const iframes = document.querySelectorAll("iframe");
        for (const iframe of iframes) {
          try {
            if (iframe.contentWindow) {
              // Null check for contentWindow
              iframe.contentWindow.postMessage(
                {
                  type: "VALIDATE_SPECS_RESULT",
                  success: result.success,
                  message: result.message,
                },
                "*"
              );
            }
          } catch (e) {
            console.error("Failed to send response to iframe:", e);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleValidateSpecs]);

  function formatExtractedProducts(json: {
    products?: RawApiProduct[];
  }): Product[] {
    if (!json.products || !Array.isArray(json.products)) return [];
    return json.products.map((p: RawApiProduct, index: number): Product => {
      const productName = p.product_name || p.name || `Product ${index + 1}`;
      const originalSpecs =
        p.technical_specifications || p.specifications || [];
      let originalManufacturers: string[] = [];

      if (p.manufacturers) {
        if (Array.isArray(p.manufacturers)) {
          originalManufacturers = p.manufacturers;
        } else if (
          typeof p.manufacturers === "object" &&
          p.manufacturers !== null
        ) {
          const base = Array.isArray(p.manufacturers.base)
            ? p.manufacturers.base
            : [];
          const optional = Array.isArray(p.manufacturers.optional)
            ? p.manufacturers.optional
            : [];
          originalManufacturers = [...base, ...optional];
        }
      }

      const reference = p.reference || "";

      const specs = Array.isArray(originalSpecs)
        ? originalSpecs.map((spec) => {
            if (typeof spec === "string") {
              return spec;
            } else if (typeof spec === "object" && spec !== null) {
              return {
                key: spec.key ?? "",
                value: spec.value ?? "",
              };
            }
            return "";
          })
        : [];

      const manufacturers = Array.isArray(originalManufacturers)
        ? originalManufacturers.map((m) => m)
        : [];

      const id = `product-${index}-${Date.now()}`;

      return {
        id,
        name: productName,
        specifications: specs,
        manufacturers: manufacturers,
        reference: reference,
      };
    });
  }

  const processUploadedFile = async (uploadedFile: File) => {
    // Clear previous state based on mode
    if (selectedAction === "search") {
      setFile(uploadedFile);
      setProducts([]);
    } else {
      setValidationFile(uploadedFile);
      setValidationProducts([]);
    }

    setLoading(true);
    setError(null);
    clearError(); // Clear any previous standardized errors
    setSelectedProduct(null);
    setDownloadedSubmittals([]);

    // Generate session ID
    const newSessionId =
      crypto.randomUUID?.() ||
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

    setCurrentSessionId(newSessionId);

    try {
      const json = await api.extractPdf(uploadedFile, newSessionId);

      // Check if response indicates an error (standardized format)
      if (json && json.success === false && json.error_code) {
        // This is a standardized error response
        handleApiError(json as StandardError);
        return;
      }

      if (json && json.has_warnings && json.warnings) {
        const largeCountWarning = json.warnings.find(
          (w: { type: string; count?: number }) =>
            w.type === "large_product_count"
        );
        if (largeCountWarning) {
          showError({
            title: "Large File Notice",
            message: `This file contains ${
              largeCountWarning.count || "100+"
            } products. Some context may be missed for better accuracy. Please upload a smaller file for optimal results.`,
            severity: "warning",
            icon: "warning",
            showContactSupport: false,
            showRetry: false,
            category: "EXTRACTION",
          });
        }
      }

      const formattedProducts = formatExtractedProducts(json);

      if (selectedAction === "search") {
        setProducts(formattedProducts);
      } else {
        setValidationProducts(formattedProducts);
      }

      if (formattedProducts.length === 0) {
        showError({
          title: "Extraction Notice",
          message: "No products were extracted from the document.",
          severity: "warning",
          icon: "warning",
          showContactSupport: false,
          showRetry: true,
          category: "EXTRACTION",
        });
      }
      await refreshUserSubscription();
    } catch (e: unknown) {
      // ✅ FIXED: Improved error extraction from various error formats
      const err = e as any;

      // Extract user-friendly message from various error formats
      let userMessage = "An unknown error occurred";
      let actionMessage = "Please try again.";

      if (err?.standardError) {
        userMessage = err.standardError.user_message || userMessage;
        actionMessage = err.standardError.action_required || actionMessage;
        handleApiError(err.standardError);
      } else if (err?.display) {
        userMessage = err.display.message || userMessage;
        actionMessage = err.display.action || actionMessage;
        showError(err.display);
      } else {
        // Fallback to legacy error handling
        if (e && typeof e === "object" && "message" in e) {
          userMessage = (e as { message?: string }).message ?? userMessage;
        }

        // Try to extract from response if available
        if (hasResponse(e)) {
          try {
            const errorData = await e.response!.json();
            if (errorData && errorData.detail) {
              userMessage = `Server error: ${errorData.detail}`;
            }
          } catch {
            // ignore JSON parse errors
          }
        }

        // Show using new error handler
        showError({
          title: "Upload Error",
          message: userMessage,
          action: actionMessage,
          severity: "error",
          icon: "error",
          showContactSupport: true,
          showRetry: true,
          category: "UPLOAD",
        });

        // Also set legacy error for backwards compatibility
        setError(userMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) await processUploadedFile(uploadedFile);
  };

  const handleValidationFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) await processUploadedFile(uploadedFile);
  };

  const handleProductSelect = (product: Product) => {
    // console.log("Selected product:", product);

    // Clear all product-related state to prevent contamination
    setSelectedProduct(null); // Clear first to force re-render
    setIsSearching(false);
    setShowSearchModal(false);
    setSelectedSubmittalForPreview(null);
    setSelectedSubmittals(new Set());
    setSearchResults([]);
    setDownloadedSubmittals([]);
    setSelectedState("");
    setSearchQuery("");
    setCurrentValidationResult(null);
    setShowValidationPopup(false);

    // Set the new product after clearing state
    setTimeout(() => {
      setSelectedProduct(product);
    }, 0);
  };

  const handleSearchSubmittals = async () => {
    if (!user?.subscription?.is_active) {
      setError(
        "Your subscription is not active. Please contact your administrator."
      );
      return;
    }

    if (!selectedProduct) return;

    // Create formatted search query before starting search
    let formattedQuery = `${selectedProduct.name} Product Data Sheet pdf`;

    // Add manufacturer if there's exactly one, otherwise don't mention any
    if (
      selectedProduct.manufacturers &&
      selectedProduct.manufacturers.length === 1
    ) {
      formattedQuery += ` [${selectedProduct.manufacturers[0]}]`;
    }

    // Set the search query immediately so it displays correctly during loading
    setSearchQuery(formattedQuery);

    setIsSearching(true);
    setShowSearchModal(true);
    setSelectedSubmittals(new Set());
    setSearchResults([]);
    setSelectedSubmittalForPreview(null);
    setError(null);
    clearError(); // Clear standardized errors

    try {
      // Convert specifications array to an object for the API
      let technical_specifications: Record<string, string> = {};
      if (
        selectedProduct.specifications &&
        selectedProduct.specifications.length > 0
      ) {
        selectedProduct.specifications.forEach((spec) => {
          if (typeof spec === "string") {
            const idx = spec.indexOf(":");
            if (idx > 0) {
              const key = spec.substring(0, idx).trim();
              const value = spec.substring(idx + 1).trim();
              if (key && value) technical_specifications[key] = value;
            }
          } else if (typeof spec === "object" && spec !== null && spec.key) {
            technical_specifications[spec.key] = spec.value ?? "";
          }
        });
      }
      const manufacturers = { base: selectedProduct.manufacturers || [] };
      const reference = selectedProduct.reference || "";

      const data = await api.extractPdsLinks(
        {
          product_name: selectedProduct.name,
          technical_specifications, // Use the created object
          manufacturers,
          reference,
        },
        currentSessionId || undefined
      );

      let results: SearchResult[] = (data.results || []).map((item: any) => ({
        title:
          item.heading || item.pdf_summary || item.pdf_link || "PDF Document",
        link: item.pdf_link,
        snippet: item.pdf_summary || item.justification || "",
        confidence_score: item.confidence_score,
        justification: item.justification,
        heading: item.heading,
        from_listed_manufacturer: item.from_listed_manufacturer || 0,
      }));

      setSearchResults(results); // Use original results from the API

      // Show info message if no results found
      if (results.length === 0) {
        showError({
          title: "No Results Found",
          message:
            "No matching submittal documents found for the selected product and specifications.",
          action:
            "You can click the refresh button to search again, or try broadening your search criteria by adjusting the product specifications.",
          severity: "info",
          icon: "info",
          showContactSupport: false,
          showRetry: true,
          category: "SEARCH",
        });
      }

      await refreshUserSubscription();
    } catch (e: any) {
      // Check for standardized error
      if (e?.standardError) {
        handleApiError(e.standardError);
      } else if (e?.display) {
        showError(e.display);
      } else {
        showError({
          title: "Search Error",
          message: e.message || "An unknown error occurred during search.",
          severity: "error",
          icon: "error",
          showContactSupport: true,
          showRetry: true,
          category: "SEARCH",
        });
        setError(e.message || "An unknown error occurred during search.");
      }
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const shouldShowUploadExhaustedWarning = useCallback((): boolean => {
    if (!user?.subscription) return false;
    if (user.subscription.subscription_type === "admin") return false;
    if (user.subscription.subscription_type === "unlimited") return false;
    if (user.subscription.is_locked) return false;

    // Show warning if uploads exhausted but user has workflow
    if (
      user.subscription.api_call_limit >= 0 &&
      user.subscription.api_calls_used >= user.subscription.api_call_limit &&
      user.subscription.api_calls_used > 0
    ) {
      return true;
    }
    return false;
  }, [user?.subscription]);

  /**
   * ✅ NEW: Check if user can upload a new PDF
   * Different from checking if user can do workflow operations
   */
  const canUploadNewPdf = useCallback((subscription: any): boolean => {
    if (!subscription) return false;

    // Admin always can upload
    if (subscription.subscription_type === "admin") return true;

    // Must be active
    if (!subscription.is_active) return false;

    // Must not be expired
    if (subscription.is_expired) return false;

    // Must not be locked
    if (subscription.is_locked) return false;

    // Unlimited can always upload
    if (subscription.subscription_type === "unlimited") return true;

    // Check remaining calls for limited/trial
    if (subscription.api_call_limit >= 0) {
      return subscription.api_calls_used < subscription.api_call_limit;
    }

    return false;
  }, []);

  const refreshUserSubscription = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log("⚠️ Cannot refresh subscription: not authenticated");
      return;
    }

    try {
      // console.log("🔄 Refreshing subscription after API call...");
      // console.log("📊 Before refresh:", user?.subscription?.api_calls_used);

      await refreshSubscription();

      // Note: The user state will be updated by useAuth, we just need to wait
      setTimeout(() => {
        const updatedUser = JSON.parse(
          localStorage.getItem("submittalFactory_auth") || "{}"
        ).user;
        // console.log(
        //   "📊 After refresh:",
        //   updatedUser?.subscription?.api_calls_used
        // );
        // console.log("✅ Subscription refreshed successfully");
      }, 100);
    } catch (err) {
      console.error("❌ Failed to refresh subscription:", err);
    }
  }, [isAuthenticated, user, refreshSubscription]);

  // Call this after major API operations:
  useEffect(
    () => {
      if (isAuthenticated && user) {
        refreshUserSubscription();
      }
    },
    [
      /* dependencies - maybe after file upload, search, etc. */
    ]
  );

  // New function to handle refresh search (bypasses cache)
  const handleRefreshSubmittals = async () => {
    if (!selectedProduct) return;

    // Create formatted search query before starting search
    let formattedQuery = `${selectedProduct.name} Product Data Sheet pdf`;

    // Add manufacturer if there's exactly one, otherwise don't mention any
    if (
      selectedProduct.manufacturers &&
      selectedProduct.manufacturers.length === 1
    ) {
      formattedQuery += ` [${selectedProduct.manufacturers[0]}]`;
    }

    // Set the search query immediately so it displays correctly during loading
    setSearchQuery(formattedQuery);

    setIsSearching(true);
    setSelectedSubmittals(new Set());
    setSearchResults([]);
    setSelectedSubmittalForPreview(null);
    setError(null);

    try {
      // Convert specifications array to an object for the API
      let technical_specifications: Record<string, string> = {};
      if (
        selectedProduct.specifications &&
        selectedProduct.specifications.length > 0
      ) {
        selectedProduct.specifications.forEach((spec) => {
          if (typeof spec === "string") {
            const idx = spec.indexOf(":");
            if (idx > 0) {
              const key = spec.substring(0, idx).trim();
              const value = spec.substring(idx + 1).trim();
              if (key && value) technical_specifications[key] = value;
            }
          } else if (typeof spec === "object" && spec !== null && spec.key) {
            technical_specifications[spec.key] = spec.value ?? "";
          }
        });
      }
      const manufacturers = { base: selectedProduct.manufacturers || [] };
      const reference = selectedProduct.reference || "";

      // Call with refresh=true to bypass cache
      const data = await api.extractPdsLinks(
        {
          product_name: selectedProduct.name,
          technical_specifications, // Use the created object
          manufacturers,
          reference,
        },
        currentSessionId || undefined,
        true
      ); // Added refresh=true parameter

      let results: SearchResult[] = (data.results || []).map((item: any) => ({
        title:
          item.heading || item.pdf_summary || item.pdf_link || "PDF Document",
        link: item.pdf_link,
        snippet: item.pdf_summary || item.justification || "",
        confidence_score: item.confidence_score,
        justification: item.justification,
        heading: item.heading,
        from_listed_manufacturer: item.from_listed_manufacturer || 0,
      }));

      setSearchResults(results); // Use original results from the API
    } catch (e: any) {
      setError(e.message || "An unknown error occurred during refresh search.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSubmittalSelection = (link: string) => {
    const newSelected = new Set(selectedSubmittals);
    if (newSelected.has(link)) {
      newSelected.delete(link);
    } else {
      newSelected.add(link);
    }
    setSelectedSubmittals(newSelected);
  };

  const handleDownloadSelected = async () => {
    if (!selectedProduct) {
      setError("Please select a product first");
      return;
    }

    const selectedResults = searchResults.filter((result) =>
      selectedSubmittals.has(result.link)
    );

    if (selectedResults.length === 0) {
      setError("Please select at least one PDF to add");
      return;
    }

    setIsDownloadingZip(true);
    setError(null);
    setDownloadProgress(
      `Preparing validation for ${selectedResults.length} PDFs...`
    );

    // Declare variables outside try block so they're available for error logging
    let newPdfs: any[] = [];
    let alreadyValidatedPdfs: any[] = [];

    try {
      // Separate new PDFs from already validated ones
      selectedResults.forEach((result) => {
        const isAlreadyValidated =
          validationHistory[result.link] &&
          validationHistory[result.link].success;

        if (isAlreadyValidated) {
          alreadyValidatedPdfs.push({
            pdf_url: result.link,
            product_data: selectedProduct,
            filename: result.title.replace(/[^a-zA-Z0-9._-]/g, "_") + ".pdf",
            validation_data: validationHistory[result.link],
          });
        } else {
          newPdfs.push({
            pdf_url: result.link,
            product_data: selectedProduct,
            filename: result.title.replace(/[^a-zA-Z0-9._-]/g, "_") + ".pdf",
          });
        }
      });

      console.log(
        `Found ${newPdfs.length} new PDFs to validate and ${alreadyValidatedPdfs.length} already validated PDFs`
      );

      if (newPdfs.length > 0) {
        setDownloadProgress(`Validating ${newPdfs.length} new PDFs...`);
      } else {
        setDownloadProgress(
          `Generating reports for ${alreadyValidatedPdfs.length} already validated PDFs...`
        );
      }

      // Call the backend endpoint with separated PDFs
      console.log("🔄 Calling addValidatedPdfs API...");
      const result = await api.addValidatedPdfs(
        {
          new_pdfs: newPdfs,
          already_validated_pdfs: alreadyValidatedPdfs,
        },
        currentSessionId || undefined
      );

      console.log("✅ API Response received:", result);
      await refreshUserSubscription();
      // Handle case where result might not have expected structure
      if (!result || typeof result !== "object") {
        throw new Error("Invalid response format from API");
      }

      const {
        processed_pdfs = [],
        successful_count = 0,
        total_validation_cost = 0,
      } = result;

      console.log(
        `📊 Processing results: ${successful_count}/${processed_pdfs.length} PDFs successful`
      );
      setDownloadProgress(
        `Processing completed. ${successful_count}/${processed_pdfs.length} PDFs processed successfully.`
      );

      // Convert processed PDFs to downloadable format and add to download list
      const validatedSubmittals = processed_pdfs
        .filter((pdf: any) => pdf.success && pdf.pdf_data)
        .map((pdf: any) => ({
          title: pdf.filename,
          link: pdf.original_url,
          snippet: `Validated - Score: ${pdf.validation_score}% - ${pdf.validation_summary}`,
          confidence_score: pdf.validation_score,
          justification: pdf.validation_summary,
          pdf_data: pdf.pdf_data, // Base64 encoded PDF with validation report
          is_validated: true,
        }));

      console.log(
        `📝 Created ${validatedSubmittals.length} validated submittals`
      );

      // Store validation results in history for new PDFs only (already validated ones already have history)
      const newValidationHistory = { ...validationHistory };
      processed_pdfs.forEach((pdf: any) => {
        if (
          pdf.success &&
          newPdfs.some((newPdf) => newPdf.pdf_url === pdf.original_url)
        ) {
          // Only update history for newly validated PDFs
          newValidationHistory[pdf.original_url] = {
            success: true,
            message: `Validation completed with score: ${pdf.validation_score}%`,
            validation_score: pdf.validation_score,
            product_name: pdf.product_name,
            summary: pdf.validation_summary,
            // Add other validation fields as needed
            valid: pdf.validation_score >= 60 ? "Yes" : "No",
            matched_specifications: [],
            unmatched_specifications: [],
            found_manufacturers: [],
            unmatched_manufacturers: [],
            any_manufacturer_found: "Yes",
          };
        }
      });
      setValidationHistory(newValidationHistory);

      // Add successfully processed PDFs to download list
      const newDownloads = validatedSubmittals.filter(
        (newSubmittal: SearchResult) =>
          !downloadedSubmittals.some(
            (existing) => existing.link === newSubmittal.link
          )
      );

      console.log(`➕ Adding ${newDownloads.length} new downloads to list`);
      setDownloadedSubmittals((prev) => [...prev, ...newDownloads]);

      // Clear selected submittals to prevent re-validation
      setSelectedSubmittals(new Set());

      // Show summary
      const failedCount = processed_pdfs.length - successful_count;
      if (failedCount > 0) {
        setError(
          `${successful_count} PDFs added successfully with validation reports. ${failedCount} PDFs failed processing.`
        );
      } else {
        setError(null);
      }

      // Show cost information if available (only for new validations)
      if (total_validation_cost > 0) {
        console.log(
          `Total validation cost for new PDFs: $${total_validation_cost.toFixed(
            6
          )}`
        );
        if (alreadyValidatedPdfs.length > 0) {
          console.log(
            `Saved validation cost by reusing ${alreadyValidatedPdfs.length} previous validations`
          );
        }
      } else if (alreadyValidatedPdfs.length > 0 && newPdfs.length === 0) {
        console.log(
          `No validation cost - all ${alreadyValidatedPdfs.length} PDFs were already validated in this session`
        );
      }

      console.log("🚀 Processing completed successfully, closing modal...");
    } catch (error: any) {
      console.error("❌ Error processing PDFs with validation:", error);

      // Check for standardized error
      if (error?.standardError) {
        handleApiError(error.standardError);
      } else if (error?.display) {
        showError(error.display);
      } else {
        // Provide more detailed error information to the user
        let errorMessage = "Failed to process PDFs with validation";
        if (error.message) {
          errorMessage += `: ${error.message}`;
        }
        if (error.response?.status) {
          errorMessage += ` (HTTP ${error.response.status})`;
        }

        showError({
          title: "Validation Error",
          message: errorMessage,
          severity: "error",
          icon: "error",
          showContactSupport: true,
          showRetry: true,
          category: "VALIDATION",
        });
        setError(errorMessage);
      }

      // Log additional context for debugging
      console.error("🔍 Error context:", {
        selectedResults: selectedResults.length,
        newPdfs: newPdfs?.length || 0,
        alreadyValidatedPdfs: alreadyValidatedPdfs?.length || 0,
        sessionId: currentSessionId,
      });
    } finally {
      // Always clean up state and close modal, regardless of success or failure
      console.log("🧹 Cleaning up state and closing modal...");
      setIsDownloadingZip(false);
      setDownloadProgress(null);
      setShowSearchModal(false); // Moved here to ensure modal always closes
    }
  };

  const removeDownloadedSubmittal = (link: string) => {
    setDownloadedSubmittals((prev) =>
      prev.filter((submittal) => submittal.link !== link)
    );
  };

  const handleDownloadIndividualPdf = async (submittal: SearchResult) => {
    if (submittal.is_validated && submittal.pdf_data) {
      try {
        // Use the properly configured API method instead of direct fetch
        const response = await api.downloadIndividualPdf(
          submittal.pdf_data,
          submittal.title
        );

        // Create download link
        const blob = await (response as Response).blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = submittal.title.endsWith(".pdf")
          ? submittal.title
          : `${submittal.title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`Downloaded validated PDF: ${submittal.title}`);
      } catch (error: any) {
        console.error("Error downloading individual PDF:", error);
        setError(`Error downloading individual PDF: ${error.message}`);
        // Fallback to opening original URL
        window.open(submittal.link, "_blank");
      }
    } else {
      // No validated PDF data, open original URL
      window.open(submittal.link, "_blank");
    }
  };

  const handleDownloadAll = async () => {
    if (downloadedSubmittals.length === 0 || isDownloadingZip) return;

    setIsDownloadingZip(true);
    setError(null);
    setDownloadProgress(
      `Starting download... (0/${downloadedSubmittals.length})`
    );

    const zip = new JSZip();
    const failedDownloads: { title: string; error: string }[] = [];
    let successfulDownloads = 0;

    for (let i = 0; i < downloadedSubmittals.length; i++) {
      const submittal = downloadedSubmittals[i];
      setDownloadProgress(
        `Downloading ${i + 1}/${downloadedSubmittals.length}: ${
          submittal.title
        }...`
      );
      console.log(
        `Processing: ${submittal.title}${
          submittal.is_validated ? " (validated)" : ""
        }`
      );

      try {
        let blob: Blob;

        // Check if this is a validated PDF with base64 data
        if (submittal.is_validated && submittal.pdf_data) {
          // Convert base64 to blob
          try {
            const binaryString = atob(submittal.pdf_data);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }
            blob = new Blob([bytes], { type: "application/pdf" });
            console.log(`Using validated PDF data (${blob.size} bytes)`);
          } catch (e) {
            throw new Error("Failed to decode validated PDF data");
          }
        } else {
          // Download PDF from URL as before
          const proxyUrl = buildApiUrl(
            `/proxy-pdf?url=${encodeURIComponent(submittal.link)}`
          );
          const response = await fetch(proxyUrl);

          if (!response.ok) {
            throw new Error(
              `Failed to fetch PDF: ${response.status} ${response.statusText}`
            );
          }

          blob = await response.blob();
          console.log(`Downloaded PDF from URL (${blob.size} bytes)`);
        }

        if (blob.size === 0) {
          throw new Error("PDF file is empty");
        }

        // Generate filename
        let filename = "submittal.pdf";
        try {
          if (submittal.is_validated) {
            // Use the title directly for validated PDFs
            filename = submittal.title;
            if (!filename.toLowerCase().endsWith(".pdf")) {
              filename += ".pdf";
            }
          } else {
            // Extract filename from URL for non-validated PDFs
            const urlPath = new URL(submittal.link).pathname;
            const baseName = urlPath.substring(urlPath.lastIndexOf("/") + 1);
            if (baseName) {
              filename = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
              if (!filename.toLowerCase().endsWith(".pdf")) {
                filename += ".pdf";
              }
            }
          }
        } catch (e) {
          console.error("Error parsing filename, using default.", e);
          filename = `submittal_${i + 1}.pdf`;
        }

        // Ensure unique filename in zip
        let uniqueFilename = filename;
        let counter = 1;
        while (zip.file(uniqueFilename)) {
          const name = uniqueFilename.substring(
            0,
            uniqueFilename.lastIndexOf(".")
          );
          const ext = uniqueFilename.substring(uniqueFilename.lastIndexOf("."));
          uniqueFilename = `${name}_${counter}${ext}`;
          counter++;
        }

        console.log(`Adding ${uniqueFilename} (${blob.size} bytes) to zip.`);
        zip.file(uniqueFilename, blob);
        successfulDownloads++;
      } catch (e: any) {
        console.error(
          `Failed to process ${submittal.title} (${submittal.link}):`,
          e
        );
        failedDownloads.push({
          title: submittal.title,
          error: e.message || "Unknown error",
        });
      }
    }

    setDownloadProgress(null);

    if (successfulDownloads > 0) {
      setDownloadProgress(`Generating zip file...`);
      try {
        const zipBlob = await zip.generateAsync(
          {
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
              level: 6,
            },
          },
          (metadata) => {
            setDownloadProgress(
              `Compressing... ${metadata.percent.toFixed(0)}%`
            );
          }
        );

        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `submittal_pdfs_${new Date()
          .toISOString()
          .slice(0, 10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // --------- AUDIT LOG CALL HERE ----------
        logFrontendAudit({
          action: "smartSearchZipDownload",
          entityType: "PDFBatch",
          entityId: null,
          metadata: {
            count: successfulDownloads,
            failedCount: failedDownloads.length,
            fileNames: downloadedSubmittals
              .filter((_, idx) => idx < successfulDownloads)
              .map((s) => s.title),
            // Optionally include failed titles
            failedTitles: failedDownloads.map((f) => f.title),
          },
        });

        console.log(`Downloaded zip with ${successfulDownloads} PDFs.`);

        if (failedDownloads.length > 0) {
          setError(
            `Successfully downloaded ${successfulDownloads} PDFs. ${
              failedDownloads.length
            } failed: ${failedDownloads.map((f) => f.title).join(", ")}`
          );
        } else {
          setError(null);
        }
      } catch (zipError: any) {
        console.error("Failed to generate zip file:", zipError);
        setError(`Failed to create zip file: ${zipError.message}`);
      }
    } else {
      setError("No PDFs could be downloaded.");
    }

    setIsDownloadingZip(false);
    setDownloadProgress(null);
  };

  const handleShowPart2Popup = async () => {
    if (showPart2Popup) {
      setShowPart2Popup(false);
      setPdfPart2File(null);
      setPdfNumPages(null);
      return;
    }

    if (!file || isTrimmingPdf) return;

    setShowPart2Popup(true);
    setIsTrimmingPdf(true);
    setPdfPart2File(null);
    setPdfNumPages(null);
    setError(null);

    try {
      const trimResponse = await api.trimPdfPart2(file);

      // api.trimPdfPart2 returns the Response object, so we need to get the blob
      const trimmedBlob = await trimResponse.blob();
      if (trimmedBlob.size === 0) {
        throw new Error("Backend returned an empty PDF.");
      }
      setPdfPart2File(trimmedBlob);
    } catch (e: any) {
      setError("Could not display PART 2 PDF: " + e.message);
      setPdfPart2File(null);
      setShowPart2Popup(false);
    } finally {
      setIsTrimmingPdf(false);
    }
  };

  const handleClosePart2Popup = () => {
    setShowPart2Popup(false);
    setPdfPart2File(null);
    setPdfNumPages(null);
    setPdfScale(1.0); // Reset scale on close
  };

  // Function to handle PDF preview selection and load the PDF
  const handlePreviewPDF = (result: SearchResult) => {
    setSelectedSubmittalForPreview(result);
    setPreviewPdfScale(1.0); // Reset scale when selecting a new PDF
  };

  // Zoom functions for main PDF and preview PDF
  const zoomIn = () =>
    setPdfScale((prevScale) => Math.min(prevScale + 0.2, 3.0)); // Max zoom 3x
  const zoomOut = () =>
    setPdfScale((prevScale) => Math.max(prevScale - 0.2, 0.4)); // Min zoom 0.4x
  // const zoomInPreview = () => setPreviewPdfScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  // const zoomOutPreview = () => setPreviewPdfScale(prevScale => Math.max(prevScale - 0.2, 0.4));

  // Handle showing stored validation result
  const handleShowStoredValidationResult = (result: ValidationResult) => {
    setCurrentValidationResult(result);
    setShowValidationPopup(true);
  };

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });
  const [showJustificationId, setShowJustificationId] = useState<string | null>(
    null
  ); // State for showing justification
  const [fileInputKey, setFileInputKey] = useState(0);
  const [selectedAction, setSelectedAction] = useState<"search" | "validate">(
    () => {
      // First, get stored preference
      const stored = localStorage.getItem(STORAGE_KEY);
      const ts = localStorage.getItem(STORAGE_TIME);

      // Check if stored value is still valid (within TTL)
      if (stored && ts && Date.now() - +ts < TTL) {
        // ✅ NEW: Validate against current user permissions from localStorage
        const authData = localStorage.getItem("submittalFactory_auth");
        if (authData) {
          try {
            const parsed = JSON.parse(authData);
            const canValidate = parsed?.user?.canSmartValidate;
            const canSearch = parsed?.user?.canSmartSearch;

            // If stored is "validate" but user can't validate, default to search
            if (stored === "validate" && !canValidate) {
              console.log(
                "🔄 Stored action is validate but user cannot validate, defaulting to search"
              );
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(STORAGE_TIME);
              return ACTION_SEARCH;
            }

            // If stored is "search" but user can only validate, switch to validate
            if (stored === "search" && !canSearch && canValidate) {
              console.log(
                "🔄 Stored action is search but user can only validate, switching to validate"
              );
              localStorage.setItem(STORAGE_KEY, "validate");
              localStorage.setItem(STORAGE_TIME, Date.now().toString());
              return "validate";
            }
          } catch {
            // If parsing fails, just use stored value
          }
        }

        return stored as "search" | "validate";
      }

      // Clean up expired storage
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIME);
      return ACTION_SEARCH;
    }
  );

  // ✅ NEW: Validate selectedAction against user permissions when user changes
  useEffect(() => {
    if (!user) return;

    const canSearch = user.canSmartSearch;
    const canValidate = user.canSmartValidate;

    // If current selection is "validate" but user can't validate, switch to search
    if (selectedAction === "validate" && !canValidate) {
      console.log("🔄 User cannot validate, switching to search mode");
      setSelectedAction("search");
      localStorage.setItem(STORAGE_KEY, "search");
      localStorage.setItem(STORAGE_TIME, Date.now().toString());
    }

    // If current selection is "search" but user can't search (only validate), switch to validate
    if (selectedAction === "search" && !canSearch && canValidate) {
      console.log("🔄 User cannot search, switching to validate mode");
      setSelectedAction("validate");
      localStorage.setItem(STORAGE_KEY, "validate");
      localStorage.setItem(STORAGE_TIME, Date.now().toString());
    }

    // If user has neither permission, default to search (UI will show restricted message)
    if (!canSearch && !canValidate && selectedAction !== "search") {
      console.log("🔄 User has no permissions, defaulting to search mode");
      setSelectedAction("search");
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIME);
    }
  }, [user, user?.canSmartSearch, user?.canSmartValidate]);

  const handleActionToggle = (newAction: "search" | "validate") => {
    if (newAction === selectedAction) return;

    // If a file is currently being uploaded, prevent toggle
    if (loading) {
      setModalConfig({
        title: "Please Wait",
        message:
          "Please wait until the current file upload completes before switching modes.",
        onConfirm: () => setShowConfirmationModal(false),
        onCancel: () => setShowConfirmationModal(false),
      });
      setShowConfirmationModal(true);
      return;
    }

    // Create a deep reset function
    const resetStates = () => {
      // Clear file inputs by creating new elements
      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      const validationInput = document.getElementById(
        "validation-upload"
      ) as HTMLInputElement;

      if (fileInput) {
        fileInput.value = ""; // Clear the value
      }
      if (validationInput) {
        validationInput.value = ""; // Clear the value
      }

      // Reset all state variables
      setFile(null);
      setValidationFile(null);
      setProducts([]);
      setValidationProducts([]);
      setSelectedProduct(null);
      setSearchResults([]);
      setSelectedSubmittals(new Set());
      setDownloadedSubmittals([]);
      setSelectedSubmittalForPreview(null);
      setCurrentValidationResult(null);
      setShowValidationPopup(false);
      setValidationHistory({});
      setError(null);
      setCurrentSessionId(null);

      // Force component remount by changing key
      setFileInputKey((prev) => prev + 1);
    };

    // Show confirmation if there's any uploaded content
    const hasContent =
      (selectedAction === "validate" && validationFile) ||
      (selectedAction === "search" && file);

    if (hasContent) {
      setModalConfig({
        title: "Confirm Mode Switch",
        message: "Switching modes will reset your current session. Continue?",
        onConfirm: () => {
          resetStates();
          setSelectedAction(newAction);
          setShowConfirmationModal(false);
        },
        onCancel: () => setShowConfirmationModal(false),
      });
      setShowConfirmationModal(true);
    } else {
      resetStates();
      setSelectedAction(newAction);
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedAction);
    localStorage.setItem(STORAGE_TIME, Date.now().toString());
  }, [selectedAction]);

  const buildSearchPayload = (product: Product) => {
    let technical_specifications: Record<string, string> = {};
    if (product.specifications && product.specifications.length > 0) {
      product.specifications.forEach((spec) => {
        if (typeof spec === "string") {
          const idx = spec.indexOf(":");
          if (idx > 0) {
            const key = spec.substring(0, idx).trim();
            const value = spec.substring(idx + 1).trim();
            if (key && value) technical_specifications[key] = value;
          }
        } else if (spec && typeof spec === "object" && spec.key) {
          technical_specifications[spec.key] = spec.value ?? "";
        }
      });
    }
    const manufacturers = { base: product.manufacturers || [] };
    const reference = product.reference || "";
    return {
      product_name: product.name,
      technical_specifications,
      manufacturers,
      reference,
    };
  };

  const handleAddMore = async () => {
    if (!selectedProduct || isAddingMore) return;

    setIsAddingMore(true);
    setAddMoreNotice(null);

    try {
      // Same query formatting you already use (for display only)
      let formattedQuery = `${selectedProduct.name} Product Data Sheet pdf`;
      if (
        selectedProduct.manufacturers &&
        selectedProduct.manufacturers.length === 1
      ) {
        formattedQuery += ` [${selectedProduct.manufacturers[0]}]`;
      }
      setSearchQuery(formattedQuery);

      // Call the same API, with refresh=true to force a fresh crawl
      const payload = buildSearchPayload(selectedProduct);
      const data = await api.addMorePdsLinks(
        payload,
        currentSessionId || undefined
      );

      const incoming: SearchResult[] = (data.results || []).map(
        (item: any) => ({
          title:
            item.heading || item.pdf_summary || item.pdf_link || "PDF Document",
          link: item.pdf_link,
          snippet: item.pdf_summary || item.justification || "",
          confidence_score: item.confidence_score,
          justification: item.justification,
          heading: item.heading,
          from_listed_manufacturer: item.from_listed_manufacturer || 0,
        })
      );

      // Deduplicate by link against seenLinks
      const newOnes = incoming.filter((r) => !seenLinks.has(r.link));

      if (newOnes.length === 0) {
        setAddMoreNotice("No extra PDFs found");
      } else {
        // Append new ones, keep existing
        setSearchResults((prev) => [...prev, ...newOnes]);
        // Update seen set
        setSeenLinks((prev) => {
          const next = new Set(prev);
          newOnes.forEach((r) => next.add(r.link));
          return next;
        });
        setAddMoreNotice(
          `${newOnes.length} more PDF${newOnes.length > 1 ? "s" : ""} found`
        );
      }
    } catch (e: any) {
      setAddMoreNotice(
        e?.message ? `Add more failed: ${e.message}` : "Add more failed"
      );
    } finally {
      setIsAddingMore(false);
      // Auto-clear notice after a few seconds
      setTimeout(() => setAddMoreNotice(null), 4000);
    }
  };

  // ——— handlers ———
  // const handleSearchClick = () => setSelectedAction(ACTION_SEARCH)
  // const handleValidateClick = () => setSelectedAction(ACTION_VALIDATE)
  // const handleReset = () => {
  //   localStorage.removeItem(STORAGE_KEY)
  //   localStorage.removeItem(STORAGE_TIME)
  //   setSelectedAction(ACTION_SEARCH)
  // }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            !isAuthenticated ? <LandingPage /> : <Navigate to="/app" replace />
          }
        />
        {/* public register page */}
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <LoginForm onLogin={handleLogin} />
            ) : (
              <Navigate to="/app" replace />
            )
          }
        />
        <Route path="/register" element={<RegisterPage />} />

        {/* protected admin page */}
        <Route
          path="/admin"
          element={
            isAuthenticated && currentUser.role === "Admin" ? (
              <AdminPage />
            ) : (
              <Navigate to="/app" replace />
            )
          }
        />

        <Route
          path="/subscription"
          element={
            isAuthenticated ? <SubscriptionPage /> : <Navigate to="/" replace />
          }
        />

        {/* all other routes: login vs. your main authenticated UI */}
        <Route
          path="/app"
          element={
            !isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex flex-col">
                <header
                  className={`sticky top-0 z-50 transition-all duration-300 ${
                    scrolled
                      ? "bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200/50"
                      : "bg-white/90 backdrop-blur-md border-b border-gray-200/30"
                  }`}
                >
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                      {/* Left: Logo + Title */}
                      <div className="flex items-center gap-3">
                        <Logo className="h-12 w-12" />
                        <div className="hidden sm:block">
                          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
                            Submittal Factory
                          </h1>
                          <p className="text-sm font-medium text-neutral-500 tracking-wide">
                            Streamline your construction documentation
                          </p>
                        </div>
                      </div>

                      {/* Right: User dropdown */}
                      <div className="flex items-center gap-4">
                        <div className="relative" ref={dropdownRef}>
                          <button
                            onClick={() => setIsDropdownOpen((o) => !o)}
                            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium shadow-lg">
                              {currentUser.name.charAt(0)}
                            </div>
                            <div className="hidden sm:block text-left">
                              <p className="text-sm font-medium text-gray-700">
                                {currentUser.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {currentUser.role}
                              </p>
                            </div>
                            {isDropdownOpen ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                          </button>

                          {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 z-50">
                              {/* User Info */}
                              <div className="px-4 py-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {currentUser.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {currentUser.email}
                                </p>
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {currentUser.role}
                                </span>
                              </div>

                              {/* Navigation Links */}
                              <div className="py-1">
                                {/* Only show subscription link for non-admin users */}
                                {currentUser.role.toLowerCase() !== "admin" && (
                                  <button
                                    onClick={() => {
                                      navigate("/subscription");
                                      setIsDropdownOpen(false);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    <FiCreditCard className="mr-3 w-4 h-4" />
                                    Subscription
                                  </button>
                                )}

                                {currentUser.role === "Admin" && (
                                  <button
                                    onClick={() => {
                                      navigate("/admin");
                                      setIsDropdownOpen(false);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    <FiSettings className="mr-3 w-4 h-4" />
                                    Admin Panel
                                  </button>
                                )}
                              </div>

                              {/* Logout */}
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleLogout();
                                    setIsDropdownOpen(false);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                >
                                  <FiLogOut className="mr-3 w-4 h-4" />
                                  Logout
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </header>

                <main className="flex-1 max-w-[90rem] mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
                  {/* {user?.subscription && (
                    <SubscriptionBanner
                      subscription={user.subscription}
                      userRole={user.roles?.[0] || currentUser.role}
                    />
                  )} */}

                  {sessionExpired && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center">
                        <div className="text-xl font-semibold text-gray-800 mb-4">
                          Session Expired
                        </div>
                        <div className="text-gray-600 mb-8 text-center">
                          Your session has expired. Please login again to
                          continue.
                        </div>
                        <button
                          className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
                          onClick={handleSessionExpiredLogin}
                        >
                          Login Again
                        </button>
                      </div>
                    </div>
                  )}
                  {shouldShowUploadExhaustedWarning() && (
                    <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-orange-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-orange-800">
                            PDF Upload Limit Reached
                          </h3>
                          <p className="mt-1 text-sm text-orange-700">
                            You've used all {user?.subscription?.api_call_limit}{" "}
                            PDF uploads in your free trial.
                            {/* You can still{" "}
                            <span className="font-medium">
                              complete your current workflow
                            </span>{" "}
                            (search submittals, validate specs, download PDFs). */}
                          </p>
                          <p className="mt-2 text-sm text-orange-600">
                            Contact{" "}
                            <a
                              href={`mailto:${
                                user?.subscription?.admin_contact_email ||
                                "zack@kbccm.com"
                              }`}
                              className="font-medium underline hover:text-orange-800"
                            >
                              {user?.subscription?.admin_contact_email ||
                                "zack@kbccm.com"}
                            </a>{" "}
                            to upload more PDFs.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Hero Section */}
                  <div className="text-center mb-12 max-w-3xl mx-auto">
                    <h2 className="text-4xl font-bold text-neutral-900 mb-4">
                      Streamline Your Construction Submittals
                    </h2>
                    <p className="text-lg text-neutral-600 mb-8">
                      Transform your project specifications into organized,
                      searchable submittals.
                    </p>
                    {/* Add this near your other modal components */}
                    <ConfirmationModal
                      isOpen={showConfirmationModal}
                      title={modalConfig.title}
                      message={modalConfig.message}
                      onConfirm={modalConfig.onConfirm}
                      onCancel={modalConfig.onCancel}
                    />

                    <div className="flex gap-4 justify-center">
                      {/* Smart AI Search */}
                      {user?.canSmartSearch && (
                        <button
                          onClick={() => handleActionToggle("search")}
                          className={`flex items-center gap-3 px-6 py-3 rounded-lg focus:outline-none transition-colors
        ${
          selectedAction === "search"
            ? "border-2 border-orange-500 bg-orange-50 shadow-sm"
            : "border border-gray-200 bg-white hover:bg-orange-50"
        }`}
                        >
                          <Search
                            className={`w-5 h-5 ${
                              selectedAction === "search"
                                ? "text-orange-600"
                                : "text-gray-500"
                            }`}
                          />
                          <span
                            className={`${
                              selectedAction === "search"
                                ? "text-orange-700 font-semibold"
                                : "text-gray-700"
                            }`}
                          >
                            Smart Search
                          </span>
                        </button>
                      )}

                      {/* Smart AI Validation */}
                      {user?.canSmartValidate && (
                        <button
                          onClick={() => handleActionToggle("validate")}
                          className={`flex items-center gap-3 px-6 py-3 rounded-lg focus:outline-none transition-colors
        ${
          selectedAction === "validate"
            ? "border-2 border-emerald-500 bg-emerald-50 shadow-sm"
            : "border border-gray-200 bg-white hover:bg-emerald-50"
        }`}
                        >
                          <Download
                            className={`w-5 h-5 ${
                              selectedAction === "validate"
                                ? "text-emerald-600"
                                : "text-gray-500"
                            }`}
                          />
                          <span
                            className={`${
                              selectedAction === "validate"
                                ? "text-emerald-700 font-semibold"
                                : "text-gray-700"
                            }`}
                          >
                            Smart Validation
                          </span>
                        </button>
                      )}
                    </div>

                    {/* <div className="mt-4">
                        <button
                          onClick={handleReset}
                          className="text-sm text-gray-500 underline hover:text-gray-700"
                        >
                          Reset Selection
                        </button>
                      </div> */}
                  </div>

                  {/* Upload Section */}
                  <div className="grid grid-cols-1 gap-8 mb-8">
                    {!user?.canSmartSearch && !user?.canSmartValidate ? (
                      <div className="card p-8 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
                        <div className="max-w-md mx-auto">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-8 w-8 text-blue-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Access Restricted
                            </h3>
                            <p className="text-gray-600 mb-6">
                              Your account doesn't have access to this
                              functionality.
                            </p>
                            <div className="bg-blue-50 px-4 py-3 rounded-lg w-full">
                              <p className="text-sm text-gray-700">
                                Please contact your administrator at{" "}
                                <a
                                  href="mailto:zack@kbccm.com"
                                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                                >
                                  zack@kbccm.com
                                </a>{" "}
                                to request access.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : selectedAction === "search" ? (
                      // ---------- Project Specification Upload (Smart Search) ----------
                      <div className="card p-8 bg-white/90 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="section-title">
                              Project Specification Upload
                            </h2>
                            <p className="section-subtitle">
                              Upload your project specifications to get started
                            </p>
                          </div>
                          {/* Processing complete indicator */}
                          {file && !loading && products.length > 0 && (
                            <div className="flex items-center text-blue-600 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                              <CheckCircle className="w-5 h-5 mr-2" />
                              <span className="font-medium">
                                Processing complete
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-center items-center border-2 border-dashed border-neutral-200 rounded-xl p-8 bg-white">
                          <div className="text-center">
                            {file ? (
                              <div className="space-y-4">
                                <div className="bg-blue-50 rounded-full p-4 inline-block">
                                  <FileText className="h-12 w-12 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-900">
                                    {file.name}
                                  </p>
                                  <p className="text-sm text-neutral-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                  {/* File size warning - only show for files > 5MB */}
                                  {file.size > 5 * 1024 * 1024 && (
                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                      <div className="flex items-center gap-2 text-red-700">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm">
                                          <strong>File too large!</strong>{" "}
                                          Maximum size is 5 MB. Please compress
                                          or upload a smaller file.
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {loading ? (
                                  <div className="flex flex-col items-center justify-center text-blue-600">
                                    <div className="flex items-center">
                                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                                      Processing specification file...
                                    </div>
                                    <p className="text-sm text-neutral-500 mt-2">
                                      {file.size >= 3 * 1024 * 1024 &&
                                      file.size <= 5 * 1024 * 1024
                                        ? "Large file detected - Upload may take 7–8 minutes, please wait."
                                        : file.size >= 1 * 1024 * 1024 &&
                                          file.size < 3 * 1024 * 1024
                                        ? "Large file detected - Upload may take 3–4 minutes, please wait."
                                        : "This should only take a few seconds"}
                                    </p>
                                  </div>
                                ) : (
                                  <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    Upload a different file
                                  </label>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="bg-blue-50 rounded-full p-4 inline-block">
                                  <Upload className="h-12 w-12 text-blue-600" />
                                </div>
                                <div className="mt-6">
                                  <label
                                    htmlFor="file-upload"
                                    className={`btn-primary ${
                                      !canUploadNewPdf(user?.subscription)
                                        ? "opacity-50 cursor-not-allowed pointer-events-none"
                                        : ""
                                    }`}
                                  >
                                    Upload Specification File
                                  </label>
                                </div>
                                <p className="mt-3 text-sm text-neutral-500">
                                  PDF files only • Max 5 MB
                                </p>
                                <p className="mt-1 text-xs text-neutral-400">
                                  Text-based PDFs recommended
                                </p>
                              </>
                            )}
                            <input
                              key={`search-${fileInputKey}`}
                              id="file-upload"
                              className="hidden"
                              type="file"
                              accept=".pdf"
                              onChange={handleFileUpload}
                              disabled={!canUploadNewPdf(user?.subscription)}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // ---------- Smart Validation Upload ----------
                      <div className="card p-8 bg-white/90 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="section-title">
                              Upload Specification for Smart Validation
                            </h2>
                            <p className="section-subtitle">
                              Upload a Specification document to validate with
                              AI
                            </p>
                          </div>
                          {validationFile &&
                            !loading &&
                            validationProducts.length > 0 && (
                              <div className="flex items-center text-blue-600 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                                <CheckCircle className="w-5 h-5 mr-2" />
                                <span className="font-medium">
                                  File processed
                                </span>
                              </div>
                            )}
                          {validationFile && loading && (
                            <div className="flex items-center text-blue-600 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              <span className="font-medium">
                                Processing specification file...
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-center items-center border-2 border-dashed border-neutral-200 rounded-xl p-8 bg-white">
                          <div className="text-center">
                            {validationFile ? (
                              <div className="space-y-4">
                                <div className="bg-blue-50 rounded-full p-4 inline-block">
                                  <FileText className="h-12 w-12 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-900">
                                    {validationFile.name}
                                  </p>
                                  <p className="text-sm text-neutral-500">
                                    {(
                                      validationFile.size /
                                      1024 /
                                      1024
                                    ).toFixed(2)}{" "}
                                    MB
                                  </p>
                                  {/* File size warning - only show for files > 5MB */}
                                  {validationFile.size > 5 * 1024 * 1024 && (
                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                      <div className="flex items-center gap-2 text-red-700">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm">
                                          <strong>File too large!</strong>{" "}
                                          Maximum size is 5 MB. Please compress
                                          or upload a smaller file.
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {loading ? (
                                  <div className="flex flex-col items-center justify-center text-blue-600">
                                    <div className="flex items-center">
                                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                                      Processing specification file...
                                    </div>
                                    <p className="text-sm text-neutral-500 mt-2">
                                      {!file
                                        ? ""
                                        : file.size >= 3 * 1024 * 1024 &&
                                          file.size <= 5 * 1024 * 1024
                                        ? "Large file detected - Upload may take 7–8 minutes, please wait."
                                        : file.size >= 1 * 1024 * 1024 &&
                                          file.size < 3 * 1024 * 1024
                                        ? "Large file detected - Upload may take 3–4 minutes, please wait."
                                        : "This should only take a few seconds"}
                                    </p>
                                  </div>
                                ) : (
                                  <label
                                    htmlFor="validation-upload"
                                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    Upload a different file
                                  </label>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="bg-blue-50 rounded-full p-4 inline-block">
                                  <Upload className="h-12 w-12 text-blue-600" />
                                </div>
                                <div className="mt-6">
                                  <label
                                    htmlFor="validation-upload"
                                    className={`btn-primary ${
                                      !canUploadNewPdf(user?.subscription)
                                        ? "opacity-50 cursor-not-allowed pointer-events-none"
                                        : ""
                                    }`}
                                  >
                                    Upload Specification File
                                  </label>
                                </div>
                                <p className="mt-3 text-sm text-neutral-500">
                                  PDF files only • Max 5 MB
                                </p>
                                <p className="mt-1 text-xs text-neutral-400">
                                  Text-based PDFs work best • Large files may
                                  take 1-2 min
                                </p>
                              </>
                            )}
                            <input
                              key={`validate-${fileInputKey}`}
                              id="validation-upload"
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={handleValidationFileUpload}
                              disabled={!canUploadNewPdf(user?.subscription)}
                            />
                          </div>
                        </div>
                        {/* Validate Button */}
                        {validationFile && (
                          // {/* SmartValidate modal for validation mode */}
                          <>
                            {/* // SmartValidate modal for validation mode */}
                            <div>
                              {validationProducts.length > 0 && (
                                <div className="grid grid-cols-1 gap-8 mt-10">
                                  {/* Make the card full width */}
                                  <div className="col-span-1 lg:col-span-3">
                                    <div className="card bg-white/80">
                                      <div className="p-6 border-b border-neutral-100">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                          <h3 className="section-title mb-1 sm:mb-0">
                                            Select Product to Validate
                                          </h3>
                                          {!loading &&
                                            validationProducts.length > 0 && (
                                              <div className="mt-6">
                                                <select
                                                  id="validate-product-dropdown"
                                                  className="w-full sm:w-auto rounded-lg border px-4 py-2 text-sm"
                                                  value={
                                                    selectedProduct?.id || ""
                                                  }
                                                  onChange={(e) => {
                                                    const selected =
                                                      validationProducts.find(
                                                        (p) =>
                                                          p.id ===
                                                          e.target.value
                                                      );
                                                    if (selected)
                                                      setSelectedProduct(
                                                        selected
                                                      );
                                                  }}
                                                >
                                                  <option value="">
                                                    -- Select a product --
                                                  </option>
                                                  {validationProducts.map(
                                                    (product) => (
                                                      <option
                                                        key={product.id}
                                                        value={product.id}
                                                      >
                                                        {product.name}
                                                      </option>
                                                    )
                                                  )}
                                                </select>
                                              </div>
                                            )}
                                        </div>
                                        {/* <p className="section-subtitle mt-2">Pick a product to view its details</p> */}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Show selected product technical specs */}
                                  <div className="lg:col-span-2 space-y-8 hidden">
                                    {selectedProduct ? (
                                      <div className="card bg-white/80 h-full">
                                        <div className="p-6 border-b border-neutral-100">
                                          <h3 className="section-title">
                                            {selectedProduct.name}
                                          </h3>
                                        </div>
                                        {/* SCROLLABLE AREA */}
                                        <div
                                          className="p-6"
                                          style={{
                                            maxHeight: "65vh", // Adjust as needed
                                            overflowY: "auto",
                                            minHeight: "320px", // Optional: minimum height for good look
                                          }}
                                        >
                                          <div className="mb-6">
                                            <div className="flex items-center gap-2 mb-4">
                                              <h4 className="font-medium text-neutral-900">
                                                Technical Specifications
                                              </h4>
                                            </div>
                                            {selectedProduct.specifications &&
                                            selectedProduct.specifications
                                              .length > 0 ? (
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {selectedProduct.specifications.map(
                                                  (spec, index) => {
                                                    let keyPart: string | null =
                                                      null;
                                                    let valuePart: string =
                                                      "Invalid Specification";
                                                    let displayKey: React.Key =
                                                      index;

                                                    if (
                                                      typeof spec === "string"
                                                    ) {
                                                      const colonIndex =
                                                        spec.indexOf(":");
                                                      if (
                                                        colonIndex > 0 &&
                                                        colonIndex <
                                                          spec.length - 1
                                                      ) {
                                                        keyPart = spec
                                                          .substring(
                                                            0,
                                                            colonIndex
                                                          )
                                                          .trim();
                                                        valuePart = spec
                                                          .substring(
                                                            colonIndex + 1
                                                          )
                                                          .trim();
                                                        displayKey =
                                                          keyPart || index;
                                                      } else {
                                                        valuePart = spec;
                                                        displayKey = spec;
                                                      }
                                                    } else if (
                                                      typeof spec ===
                                                        "object" &&
                                                      spec !== null &&
                                                      spec.key
                                                    ) {
                                                      keyPart = spec.key;
                                                      valuePart =
                                                        spec.value ?? "";
                                                      displayKey = spec.key;
                                                    }

                                                    return (
                                                      <div
                                                        key={`spec-${index}`}
                                                        className="bg-neutral-50 rounded-lg p-3 text-sm text-neutral-600 border border-neutral-100"
                                                      >
                                                        {keyPart ? (
                                                          <>
                                                            <strong className="text-neutral-800">
                                                              {keyPart}:
                                                            </strong>{" "}
                                                            {valuePart}
                                                          </>
                                                        ) : (
                                                          valuePart
                                                        )}
                                                      </div>
                                                    );
                                                  }
                                                )}
                                              </div>
                                            ) : (
                                              <p className="text-sm text-neutral-500">
                                                No technical specifications
                                                listed.
                                              </p>
                                            )}
                                          </div>
                                          {selectedProduct.manufacturers &&
                                            selectedProduct.manufacturers
                                              .length > 0 && (
                                              <div className="mb-6">
                                                <h4 className="font-medium text-neutral-900 mb-4">
                                                  Manufacturers
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  {selectedProduct.manufacturers.map(
                                                    (manufacturer, index) => (
                                                      <div
                                                        key={index}
                                                        className="bg-neutral-50 rounded-lg p-3 text-sm text-neutral-600 border border-neutral-100"
                                                      >
                                                        {manufacturer}
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="card bg-white/80 p-8 text-neutral-500 h-full flex items-center justify-center">
                                        Select a product from the dropdown to
                                        view its technical specifications.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            {!loading &&
                              !isValidatingSpecs &&
                              validationFile &&
                              validationProducts.length > 0 && (
                                <SmartValidate
                                  defaultFile={validationFile}
                                  product={selectedProduct}
                                  productSpecs={
                                    selectedProduct?.specifications ?? []
                                  }
                                />
                              )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error Block - Enhanced with ErrorNotification */}
                  {/* New Standardized Error Notification */}
                  {isErrorVisible && errorDisplay ? (
                    // Show new standardized error notification
                    <ErrorNotification
                      error={errorDisplay}
                      isVisible={isErrorVisible}
                      onClose={clearError}
                      position="inline"
                      className="mb-4"
                    />
                  ) : error ? (
                    // Fallback to legacy error display only if new system has no error
                    <div className="mb-4 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg">
                      <strong>Error:</strong> {error}
                      <button
                        onClick={() => setError(null)}
                        className="ml-4 float-right font-bold"
                      >
                        X
                      </button>
                    </div>
                  ) : null}

                  {/* Legacy Error Block (for backwards compatibility) */}
                  {error && !isErrorVisible && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg">
                      <strong>Error:</strong> {error}
                      <button
                        onClick={() => setError(null)}
                        className="ml-4 float-right font-bold"
                      >
                        X
                      </button>
                    </div>
                  )}

                  {products.length > 0 && (
                    <>
                      <div className="text-center mb-8 flex flex-col items-center">
                        <h3 className="text-2xl font-semibold text-neutral-900 mb-2">
                          Extracted Products
                        </h3>
                        <p className="text-neutral-600 mt-4">
                          We've analyzed your specifications and identified{" "}
                          <span className="font-semibold text-blue-600">
                            {products.length} products
                          </span>
                          . Select any product to view details and search for
                          matching submittals.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                          <div className="card bg-white/80">
                            <div className="p-6 border-b border-neutral-100">
                              <div className="flex items-center gap-2 mb-2">
                                <button
                                  type="button"
                                  className={`p-1 rounded-full hover:bg-blue-100 focus:outline-none ${
                                    isTrimmingPdf
                                      ? "cursor-not-allowed opacity-50"
                                      : ""
                                  }`}
                                  onClick={handleShowPart2Popup}
                                  title={
                                    showPart2Popup
                                      ? "Hide Part 2 PDF"
                                      : "View Part 2 - Products section (PDF)"
                                  }
                                  disabled={isTrimmingPdf || !file}
                                >
                                  {isTrimmingPdf ? (
                                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                  ) : (
                                    <FileText
                                      className={`w-5 h-5 ${
                                        showPart2Popup
                                          ? "text-red-500 hover:text-red-700"
                                          : "text-blue-500 hover:text-blue-700"
                                      }`}
                                    />
                                  )}
                                </button>
                                <span className="text-neutral-600 text-left text-sm">
                                  {isTrimmingPdf
                                    ? "Loading Part 2..."
                                    : showPart2Popup
                                    ? "Hide Part 2 PDF"
                                    : "View Part 2 PDF"}
                                </span>
                              </div>
                              <h3 className="section-title">
                                Extracted Products
                              </h3>
                              <p className="section-subtitle">
                                Select a product to view details
                              </p>
                            </div>
                            <ul className="divide-y divide-neutral-100 max-h-[65vh] overflow-y-auto">
                              {products.map((product, index) => (
                                <li
                                  key={product.id}
                                  className={`p-4 cursor-pointer transition-all duration-200 hover:bg-blue-50 ${
                                    selectedProduct?.id === product.id
                                      ? "bg-blue-50 shadow-inner-soft"
                                      : ""
                                  }`}
                                  onClick={() => handleProductSelect(product)}
                                >
                                  <div className="flex items-center">
                                    <span className="mr-3 font-medium text-neutral-500">
                                      {index + 1}.
                                    </span>
                                    <div>
                                      <h4 className="font-medium text-neutral-900">
                                        {product.name}
                                      </h4>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="lg:col-span-2 space-y-8">
                          {selectedProduct ? (
                            <>
                              <div className="card bg-white/80">
                                <div className="p-6 border-b border-neutral-100">
                                  <div className="flex items-center gap-2 relative group">
                                    <h3 className="section-title">
                                      {selectedProduct.name}
                                    </h3>
                                    {selectedProduct.reference && (
                                      <>
                                        <Info className="w-5 h-5 text-blue-500 cursor-help" />
                                        <div className="absolute left-0 top-full mt-2 w-96 max-h-96 overflow-y-auto p-4 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                                          <h5 className="font-semibold text-neutral-800 mb-2 text-sm">
                                            Reference
                                          </h5>
                                          <div
                                            className="text-xs text-neutral-600 prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{
                                              __html: selectedProduct.reference,
                                            }}
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="p-6">
                                  <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-4">
                                      <h4 className="font-medium text-neutral-900">
                                        Technical Specifications
                                      </h4>
                                    </div>
                                    {selectedProduct.specifications &&
                                    selectedProduct.specifications.length >
                                      0 ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedProduct.specifications.map(
                                          (spec, index) => {
                                            let keyPart: string | null = null;
                                            let valuePart: string =
                                              "Invalid Specification";
                                            let displayKey: React.Key = index; // Use index as fallback key

                                            if (typeof spec === "string") {
                                              const colonIndex =
                                                spec.indexOf(":");
                                              if (
                                                colonIndex > 0 &&
                                                colonIndex < spec.length - 1
                                              ) {
                                                keyPart = spec
                                                  .substring(0, colonIndex)
                                                  .trim();
                                                valuePart = spec
                                                  .substring(colonIndex + 1)
                                                  .trim();
                                                displayKey = keyPart || index; // Use keyPart if available
                                              } else {
                                                valuePart = spec; // Treat as full value if no colon
                                                displayKey = spec; // Use the string itself as key if simple
                                              }
                                            } else if (
                                              typeof spec === "object" &&
                                              spec !== null &&
                                              spec.key
                                            ) {
                                              // Handle { key: string, value: string } format
                                              keyPart = spec.key;
                                              valuePart = spec.value ?? "";
                                              displayKey = spec.key; // Use object key as React key
                                            }

                                            return (
                                              <div
                                                key={`spec-${index}`}
                                                className="bg-neutral-50 rounded-lg p-3 text-sm text-neutral-600 border border-neutral-100"
                                              >
                                                {keyPart ? (
                                                  <>
                                                    <strong className="text-neutral-800">
                                                      {keyPart}:
                                                    </strong>{" "}
                                                    {valuePart}
                                                  </>
                                                ) : (
                                                  valuePart // Render only value if no key was parsed/present
                                                )}
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-neutral-500">
                                        No technical specifications listed.
                                      </p>
                                    )}
                                  </div>

                                  {selectedProduct.manufacturers &&
                                    selectedProduct.manufacturers.length >
                                      0 && (
                                      <div className="mb-6">
                                        <h4 className="font-medium text-neutral-900 mb-4">
                                          Manufacturers
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {selectedProduct.manufacturers.map(
                                            (manufacturer, index) => (
                                              <div
                                                key={index}
                                                className="bg-neutral-50 rounded-lg p-3 text-sm text-neutral-600 border border-neutral-100"
                                              >
                                                {manufacturer}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  <div className="mt-6 mb-8">
                                    <label
                                      htmlFor="state-select"
                                      className="block text-sm font-medium text-neutral-700 mb-2"
                                    >
                                      Filter by State (Optional)
                                    </label>
                                    <select
                                      id="state-select"
                                      value={selectedState}
                                      onChange={(e) =>
                                        setSelectedState(e.target.value)
                                      }
                                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm bg-white"
                                    >
                                      <option value="">
                                        -- Select a State --
                                      </option>
                                      {usStates.map((state) => (
                                        <option key={state} value={state}>
                                          {state}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="mt-8">
                                    <button
                                      onClick={handleSearchSubmittals}
                                      className="btn-accent w-full"
                                      disabled={isSearching}
                                    >
                                      {isSearching ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto" />
                                      ) : (
                                        <>
                                          <Search className="w-5 h-5" />
                                          Search for Submittals
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {downloadedSubmittals.length > 0 && (
                                <div className="card bg-white/80">
                                  <div className="p-6 border-b border-neutral-100">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h3 className="section-title">
                                          Selected Submittals
                                        </h3>
                                        <p className="section-subtitle">
                                          Manage your selected submittals
                                        </p>
                                      </div>
                                      <button
                                        onClick={handleDownloadAll}
                                        className="btn-accent flex items-center gap-2"
                                        disabled={
                                          isDownloadingZip ||
                                          downloadedSubmittals.length === 0
                                        }
                                      >
                                        {isDownloadingZip ? (
                                          <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {downloadProgress ||
                                              "Downloading..."}
                                          </>
                                        ) : (
                                          <>
                                            <Archive className="w-5 h-5" />
                                            Download All (
                                            {downloadedSubmittals.length})
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="p-6">
                                    <div className="space-y-4">
                                      {downloadedSubmittals.map((submittal) => (
                                        <div
                                          key={submittal.link}
                                          className="flex items-start justify-between p-4 rounded-lg border border-neutral-100 hover:border-blue-200 transition-all duration-200 bg-white"
                                        >
                                          <div className="flex-1 mr-4">
                                            <h4 className="font-medium text-blue-600">
                                              {submittal.title}
                                            </h4>
                                            <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                                              {submittal.snippet}
                                            </p>
                                            <a
                                              href={submittal.link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-500 hover:underline break-all"
                                            >
                                              {submittal.link}
                                            </a>
                                          </div>
                                          <div className="flex items-center space-x-3">
                                            <button
                                              onClick={() =>
                                                handleDownloadIndividualPdf(
                                                  submittal
                                                )
                                              }
                                              className="text-blue-600 hover:text-blue-700 transition-colors duration-200"
                                              title={
                                                submittal.is_validated &&
                                                submittal.pdf_data
                                                  ? "Download Validated PDF with Report"
                                                  : "Open Original PDF Link"
                                              }
                                            >
                                              <Download className="w-5 h-5" />
                                            </button>
                                            <button
                                              onClick={() =>
                                                removeDownloadedSubmittal(
                                                  submittal.link
                                                )
                                              }
                                              className="text-red-600 hover:text-red-700 transition-colors duration-200"
                                              title="Remove from list"
                                            >
                                              <Trash2 className="w-5 h-5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="card p-12 text-center bg-white/80">
                              <Search className="w-16 h-16 mx-auto text-neutral-200" />
                              <p className="text-neutral-500 mt-4">
                                Select a product from the list to view details
                                and search for submittals
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {showSearchModal && (
                    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-xl shadow-xl flex flex-col">
                        <div className="p-6 border-b border-neutral-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="section-title">
                                Submittal Search Results
                              </h3>
                              <p className="section-subtitle">
                                {isSearching ? (
                                  "Searching..."
                                ) : (
                                  <>
                                    Found {searchResults.length} potential PDFs
                                    for{" "}
                                    <span className="font-bold">
                                      {selectedProduct?.name}
                                    </span>
                                  </>
                                )}
                              </p>
                              <p className="text-xs text-neutral-500 mt-1">
                                Search Query:{" "}
                                <span className="font-mono bg-neutral-100 px-2 py-1 rounded">
                                  {searchQuery}
                                </span>
                              </p>

                              {/* Results info - shown after search completes with results */}
                              {!isSearching && searchResults.length > 0 && (
                                <>
                                  <p className="text-sm text-neutral-500 mt-1">
                                    <Info className="w-4 h-4 inline mr-1 text-blue-500" />
                                    Search results may contain both PDFs and
                                    Product Data Sheets (PDS).
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-4 ml-auto">
                              <button
                                onClick={handleRefreshSubmittals}
                                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 transition-colors shadow-sm"
                                disabled={isSearching}
                                title="Refresh search results and bypass cache"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="lucide lucide-refresh-cw"
                                >
                                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                  <path d="M21 3v5h-5" />
                                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                  <path d="M3 21v-5h5" />
                                </svg>
                                Refresh Results
                              </button>
                              <ValidationButton
                                onValidate={handleValidateSpecs}
                                isValidating={isValidatingSpecs}
                                isGeneratingReport={isGeneratingReport}
                                disabled={
                                  !selectedSubmittalForPreview ||
                                  isValidatingSpecs ||
                                  isGeneratingReport
                                }
                                selectedProduct={selectedProduct}
                                pdfLink={selectedSubmittalForPreview?.link}
                                validationHistory={validationHistory}
                                onShowStoredResult={
                                  handleShowStoredValidationResult
                                }
                              />
                              {selectedSubmittals.size > 0 && (
                                <button
                                  onClick={handleDownloadSelected}
                                  disabled={isDownloadingZip}
                                  className={`btn-accent flex items-center gap-2 ${
                                    isDownloadingZip
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }`}
                                >
                                  {isDownloadingZip ? (
                                    <>
                                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                      <span>Validating Files...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-5 h-5" />
                                      Add Selected ({selectedSubmittals.size})
                                      to List
                                    </>
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setShowSearchModal(false);
                                  setSelectedSubmittals(new Set()); // Clear selections when modal is closed
                                }}
                                className="btn-secondary"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Progress indicator for validation */}
                        {isDownloadingZip && downloadProgress && (
                          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                            <div className="flex items-center gap-3">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              <span className="text-blue-800 font-medium">
                                {downloadProgress}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex-1 flex overflow-hidden">
                          {isSearching && searchResults.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center gap-8">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-neutral-700 font-medium">
                                  Searching for submittals...
                                </p>
                                <p className="text-sm mt-2">
                                  <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                                    System may take up to one minute to process.
                                    Please do not refresh
                                  </span>
                                </p>
                                <p className="text-sm text-neutral-500 mt-4">
                                  <Info className="w-4 h-4 inline mr-1 text-blue-500" />
                                  Search results may contain both PDFs and
                                  Product Data Sheets (PDS).
                                </p>
                                <p className="text-sm text-neutral-500 mt-4">
                                  <Info className="w-4 h-4 inline mr-1 text-amber-500" />
                                  Sometimes search may return 0 results. You can
                                  click{" "}
                                  <span className="font-semibold text-blue-600">
                                    Refresh Results
                                  </span>{" "}
                                  to try again with fresh results.
                                </p>
                              </div>
                            </div>
                          ) : searchResults.length === 0 && !isSearching ? (
                            <div className="flex-1 flex items-center justify-center text-neutral-500">
                              <div className="text-center">
                                <p className="font-medium">
                                  No potential PDF results found for this
                                  product.
                                </p>
                                <p className="text-sm mt-2">
                                  Try clicking "Refresh Results" or modifying
                                  the product name.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-[35%] border-r border-neutral-100 p-6 flex flex-col">
                                {/* SCROLLABLE LIST */}
                                <div className="space-y-4 flex-1 overflow-y-auto">
                                  {[...searchResults]
                                    .sort((a, b) => {
                                      const aFromListed =
                                        a.from_listed_manufacturer ?? 0;
                                      const bFromListed =
                                        b.from_listed_manufacturer ?? 0;
                                      if (aFromListed !== bFromListed)
                                        return bFromListed - aFromListed;
                                      return (
                                        (b.confidence_score ?? 0) -
                                        (a.confidence_score ?? 0)
                                      );
                                    })
                                    .map((result, index) => (
                                      <div
                                        key={`${result.link}-${index}`}
                                        className={`rounded-xl border transition-all duration-200 shadow-sm p-4 flex flex-col gap-2 cursor-pointer group hover:shadow-md hover:border-blue-300 ${
                                          selectedSubmittalForPreview?.link ===
                                          result.link
                                            ? "border-blue-500 bg-blue-50"
                                            : result.from_listed_manufacturer ===
                                              1
                                            ? "border-green-200 bg-green-50"
                                            : "border-neutral-100 bg-white"
                                        }`}
                                        onClick={() => handlePreviewPDF(result)}
                                        title={result.title}
                                      >
                                        <div className="flex items-center gap-3">
                                          <button
                                            className="focus:outline-none flex-shrink-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleSubmittalSelection(
                                                result.link
                                              );
                                            }}
                                            title={
                                              selectedSubmittals.has(
                                                result.link
                                              )
                                                ? "Deselect"
                                                : "Select"
                                            }
                                          >
                                            {selectedSubmittals.has(
                                              result.link
                                            ) ? (
                                              <CheckSquare className="w-5 h-5 text-blue-600" />
                                            ) : (
                                              <Square className="w-5 h-5 text-neutral-400" />
                                            )}
                                          </button>
                                          <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <h4
                                                className="font-semibold text-blue-700 truncate flex-1"
                                                title={
                                                  result.heading || result.title
                                                }
                                              >
                                                {result.heading || result.title}
                                              </h4>
                                              {result.from_listed_manufacturer ===
                                                1 && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">
                                                  Listed Mfg
                                                </span>
                                              )}
                                            </div>
                                            <p
                                              className="text-xs text-neutral-500 truncate"
                                              title={result.link}
                                            >
                                              {result.link}
                                            </p>
                                          </div>
                                        </div>

                                        <div
                                          className="text-sm text-neutral-700 mt-1 line-clamp-2"
                                          title={result.snippet}
                                        >
                                          {result.snippet}
                                        </div>

                                        {result.confidence_score !==
                                          undefined && (
                                          <div className="flex items-center gap-2 mt-1 relative group">
                                            <span className="text-xs text-neutral-500">
                                              Confidence:
                                            </span>
                                            <span className="text-xs font-semibold text-emerald-700">
                                              {(
                                                result.confidence_score * 100
                                              ).toFixed(0)}
                                              %
                                            </span>
                                            {result.justification && (
                                              <button
                                                className="ml-1 p-1 rounded-full hover:bg-blue-100 text-blue-500 focus:outline-none"
                                                tabIndex={0}
                                                title="Show justification"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setShowJustificationId(
                                                    showJustificationId ===
                                                      result.link
                                                      ? null
                                                      : result.link
                                                  );
                                                }}
                                                onMouseEnter={() => {
                                                  setShowJustificationId(
                                                    result.link
                                                  );
                                                }}
                                                onMouseLeave={() => {
                                                  setShowJustificationId(null);
                                                }}
                                                aria-label="Show justification"
                                                type="button"
                                              >
                                                <Info className="w-4 h-4" />
                                              </button>
                                            )}
                                            {result.justification &&
                                              showJustificationId ===
                                                result.link && (
                                                <div className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 bg-white border border-neutral-200 rounded shadow-lg p-3 text-xs text-neutral-700 whitespace-pre-line">
                                                  <strong>
                                                    Justification:
                                                  </strong>
                                                  <div className="mt-1">
                                                    {result.justification}
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between mt-2">
                                          <div className="flex items-center gap-3">
                                            <a
                                              href={result.link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                              title="Open PDF"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            >
                                              Open Link
                                            </a>
                                            <button
                                              className="text-xs text-neutral-400 hover:text-blue-600 flex items-center gap-1"
                                              title="Copy PDF link"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(
                                                  result.link
                                                );
                                              }}
                                            >
                                              copy link
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>

                                {/* NON-STICKY FOOTER, ALWAYS VISIBLE */}
                                <div className="border-t border-neutral-200 pt-3 mt-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <button
                                      onClick={handleAddMore}
                                      disabled={
                                        isAddingMore || !selectedProduct
                                      }
                                      className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Search again and append only new PDFs"
                                    >
                                      {isAddingMore ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Searching…
                                        </>
                                      ) : (
                                        <>+ ADD MORE</>
                                      )}
                                    </button>

                                    {addMoreNotice && (
                                      <span className="text-sm text-neutral-600">
                                        {addMoreNotice}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="w-[65%] p-6 bg-neutral-50 flex flex-col">
                                {isGeneratingReport ? (
                                  <div className="h-full flex items-center justify-center">
                                    <div className="text-center">
                                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4 mx-auto" />
                                      <p className="text-neutral-600 font-medium">
                                        Generating validation report...
                                      </p>
                                      <p className="text-sm text-neutral-500 mt-2">
                                        Merging report with original PDF
                                      </p>
                                    </div>
                                  </div>
                                ) : selectedSubmittalForPreview &&
                                  pdfPreviewUrl ? (
                                  <div className="h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                      <h4
                                        className="font-medium text-neutral-900 truncate"
                                        title={
                                          selectedSubmittalForPreview.title
                                        }
                                      >
                                        {selectedSubmittalForPreview.title}
                                      </h4>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() =>
                                            setPreviewPdfScale((prevScale) =>
                                              Math.max(prevScale - 0.2, 0.4)
                                            )
                                          }
                                          className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
                                          title="Zoom Out"
                                          disabled={previewPdfScale <= 0.4}
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                                            />
                                          </svg>
                                        </button>
                                        <span className="text-sm font-medium text-neutral-600 w-10 text-center">
                                          {(previewPdfScale * 100).toFixed(0)}%
                                        </span>
                                        <button
                                          onClick={() =>
                                            setPreviewPdfScale((prevScale) =>
                                              Math.min(prevScale + 0.2, 3.0)
                                            )
                                          }
                                          className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
                                          title="Zoom In"
                                          disabled={previewPdfScale >= 3.0}
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                                            />
                                          </svg>
                                        </button>
                                        <a
                                          href={
                                            selectedSubmittalForPreview.link
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn-secondary ml-4"
                                        >
                                          Open Link
                                        </a>
                                      </div>
                                    </div>
                                    <div className="flex-1 bg-white rounded-lg border border-neutral-100 overflow-auto shadow-sm text-center">
                                      <PDFPreview
                                        url={pdfPreviewUrl}
                                        scale={previewPdfScale}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-full flex items-center justify-center text-neutral-500">
                                    <p>Select a submittal to preview</p>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {showPart2Popup && (
                    <div className="fixed inset-0 z-50 flex items-start justify-start p-4">
                      <div
                        className="fixed inset-0 bg-black/30"
                        onClick={handleClosePart2Popup}
                      />

                      <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-lg overflow-hidden text-base max-h-[90vh] relative animate-slide-in-left w-full max-w-3xl flex flex-col z-10">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                          <h2 className="text-xl font-bold">
                            Part 2 - Products (Trimmed PDF)
                          </h2>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={zoomOut}
                              className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
                              title="Zoom Out"
                              disabled={pdfScale <= 0.4}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                                />
                              </svg>
                            </button>
                            <span className="text-sm font-medium text-neutral-600 w-10 text-center">
                              {(pdfScale * 100).toFixed(0)}%
                            </span>
                            <button
                              onClick={zoomIn}
                              className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
                              title="Zoom In"
                              disabled={pdfScale >= 3.0}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                                />
                              </svg>
                            </button>
                            <button
                              className="ml-4 text-neutral-400 hover:text-neutral-600"
                              onClick={handleClosePart2Popup}
                              title="Close"
                              disabled={isTrimmingPdf}
                            >
                              <X className="w-6 h-6" />
                            </button>
                          </div>
                        </div>

                        <div className="w-full flex-1 min-h-[60vh] rounded border border-neutral-200 bg-[#f8fafc] overflow-auto text-center relative">
                          {isTrimmingPdf ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                              <span>Loading trimmed PDF...</span>
                            </div>
                          ) : pdfPart2File ? (
                            <Document
                              file={pdfPart2File}
                              onLoadSuccess={({ numPages }) =>
                                setPdfNumPages(numPages)
                              }
                              loading={
                                <div className="p-8 text-center">
                                  Initializing PDF viewer...
                                </div>
                              }
                              error={
                                <div className="p-8 text-center text-red-600">
                                  Failed to load PDF. It might be corrupted or
                                  incompatible.
                                </div>
                              }
                            >
                              {Array.from(
                                { length: pdfNumPages || 0 },
                                (_, idx) => (
                                  <Page
                                    key={`page_${idx + 1}`}
                                    pageNumber={idx + 1}
                                    scale={pdfScale}
                                    renderAnnotationLayer={false}
                                    renderTextLayer={true}
                                    className="mb-2 shadow-sm" // Keep this className, but remove props not in scope
                                  />
                                )
                              )}
                            </Document>
                          ) : (
                            <div className="p-8 text-center text-red-600">
                              Could not load the trimmed PDF.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </main>

                <footer className="bg-white/80 border-t border-neutral-200 py-8 mt-auto">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <Logo className="h-8 w-8" />
                          <span className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
                            Submittal Factory
                          </span>
                        </div>
                        <p className="text-neutral-600">
                          Streamlining construction documentation with
                          intelligent automation.
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">
                          Features
                        </h3>
                        <ul className="space-y-3">
                          <li>
                            <a
                              href="#"
                              className="text-neutral-600 hover:text-blue-600 transition-colors"
                            >
                              Automated Processing
                            </a>
                          </li>
                          <li>
                            <a
                              href="#"
                              className="text-neutral-600 hover:text-blue-600 transition-colors"
                            >
                              Smart Search
                            </a>
                          </li>
                          <li>
                            <a
                              href="#"
                              className="text-neutral-600 hover:text-blue-600 transition-colors"
                            >
                              Easy Export
                            </a>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">
                          Contact
                        </h3>
                        <ul className="space-y-3">
                          <li>
                            <a
                              href="mailto:zack@kbccm.com"
                              className="text-neutral-600 hover:text-blue-600 transition-colors"
                            >
                              zack@kbccm.com
                            </a>
                          </li>
                          <li>
                            <p className="text-neutral-600">
                              © 2025 Submittal Factory. All rights reserved.
                            </p>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
      {/* Validation Result Popup */}
      {createPortal(
        <ValidationResultPopup
          isOpen={showValidationPopup}
          onClose={() => setShowValidationPopup(false)}
          validationResult={currentValidationResult}
          productName={selectedProduct?.name}
          onClearValidationResult={() => setCurrentValidationResult(null)}
        />,
        document.body
      )}
      <DebugValidationPopup
        onTestPopup={() => {
          // Create a test validation result for debugging
          const testResult: ValidationResult = {
            success: true,
            message: "Test validation successful",
            validation_score: 85,
            product_name: "Test Product",
            valid: "Yes",
            product_name_found: "Yes",
            specifications_match: "3/5",
            matched_specifications: [
              "Test Spec 1",
              "Test Spec 2",
              "Test Spec 3",
            ],
            unmatched_specifications: [
              "Test Unmatched Spec 1",
              "Test Unmatched Spec 2",
            ],
            any_manufacturer_found: "Yes",
            found_manufacturers: ["Test Manufacturer"],
            summary:
              "This is a test validation result for debugging the popup in production.",
          };
          console.log("Setting test validation result:", testResult);
          setCurrentValidationResult(testResult);
          setShowValidationPopup(true);
        }}
      />

      {/* Global Error Notification Toast (for network/system errors) */}
      {/* {isErrorVisible &&
        errorDisplay &&
        createPortal(
          <ErrorNotification
            error={errorDisplay}
            isVisible={true}
            onClose={clearError}
            onRetry={() => {
              clearError();
              // User can manually retry their last action
            }}
            position="inline"
          />,
          document.body
        )} */}
    </>
  );
}

export default App;
