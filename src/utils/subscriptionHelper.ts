// src/utils/subscriptionHelper.ts
// ✅ UPDATED: Fixed to allow workflow completion after API calls exhausted

import { SubscriptionStatus } from "../hooks/useAuth";

/**
 * ✅ NEW: Checks if user can upload new PDFs
 * This is separate from workflow operations
 */
export const canUploadPdf = (subscription?: SubscriptionStatus): boolean => {
  if (!subscription) return false;

  // Admin always has access
  if (subscription.subscription_type === "admin") return true;

  // Check if subscription is active
  if (!subscription.is_active) return false;

  // Check if subscription is expired
  if (subscription.is_expired) return false;

  // Check if subscription is locked
  if (subscription.is_locked) return false;

  // Unlimited subscription can always upload
  if (subscription.subscription_type === "unlimited") return true;

  // Check API call limit for uploads
  if (subscription.api_call_limit >= 0) {
    return subscription.api_calls_used < subscription.api_call_limit;
  }

  return false;
};

/**
 * ✅ NEW: Checks if user can perform workflow operations
 * (search, validate, download, etc.)
 *
 * This is MORE PERMISSIVE than canUploadPdf because:
 * - User may have exhausted uploads but still has workflow to complete
 * - Backend already exempts these endpoints from subscription limits
 */
export const canPerformWorkflowOperation = (
  subscription?: SubscriptionStatus
): boolean => {
  if (!subscription) return false;

  // Admin always has access
  if (subscription.subscription_type === "admin") return true;

  // Check if subscription is locked (fully blocked)
  if (subscription.is_locked) return false;

  // Unlimited subscription can always work
  if (subscription.subscription_type === "unlimited") return true;

  // ✅ KEY FIX: If user has used any API calls, they have a workflow to complete
  // Allow them to finish their work even if calls are exhausted
  if (subscription.api_calls_used > 0) {
    return true;
  }

  // Check if subscription is active and not expired
  if (subscription.is_active && !subscription.is_expired) {
    return true;
  }

  return false;
};

/**
 * Checks if subscription allows API calls
 * ✅ UPDATED: Now allows workflow operations even if uploads exhausted
 * @param subscription - User's subscription status
 * @returns true if user can make API calls, false otherwise
 */
export const canMakeApiCall = (subscription?: SubscriptionStatus): boolean => {
  if (!subscription) return false;

  // Admin always has access
  if (subscription.subscription_type === "admin") return true;

  // Check if subscription is active
  if (!subscription.is_active) return false;

  // Check if subscription is expired
  if (subscription.is_expired) return false;

  // Check if subscription is locked
  if (subscription.is_locked) return false;

  // Unlimited subscription can always make calls
  if (subscription.subscription_type === "unlimited") return true;

  // ✅ NEW: Allow workflow operations even if uploads exhausted
  // If user has used at least 1 call, they have workflow to complete
  if (subscription.api_calls_used > 0) {
    return true;
  }

  // For limited/free_trial, check API call limit
  if (subscription.api_call_limit >= 0) {
    return subscription.api_calls_used < subscription.api_call_limit;
  }

  return false;
};

/**
 * Checks if subscription uploads are exhausted (used all API calls for uploads)
 * ✅ NOTE: This only affects UPLOADS, not workflow operations
 * @param subscription - User's subscription status
 * @returns true if upload API calls are exhausted
 */
export const isApiCallsExhausted = (
  subscription?: SubscriptionStatus
): boolean => {
  if (!subscription) return true;

  // Admin/Unlimited never exhausted
  if (
    subscription.subscription_type === "admin" ||
    subscription.subscription_type === "unlimited"
  ) {
    return false;
  }

  // Check if API calls are exhausted for UPLOADS
  if (subscription.api_call_limit >= 0) {
    return subscription.api_calls_used >= subscription.api_call_limit;
  }

  return false;
};

/**
 * Checks if subscription is expired
 * @param subscription - User's subscription status
 * @returns true if subscription is expired
 */
export const isSubscriptionExpired = (
  subscription?: SubscriptionStatus
): boolean => {
  if (!subscription) return true;

  // Admin subscriptions don't expire
  if (subscription.subscription_type === "admin") return false;

  return subscription.is_expired || !subscription.is_active;
};

/**
 * Gets remaining API calls (for uploads)
 * @param subscription - User's subscription status
 * @returns number of remaining upload calls or -1 for unlimited
 */
export const getRemainingApiCalls = (
  subscription?: SubscriptionStatus
): number => {
  if (!subscription) return 0;

  if (
    subscription.subscription_type === "admin" ||
    subscription.subscription_type === "unlimited"
  ) {
    return -1; // Unlimited
  }

  if (subscription.api_call_limit < 0) return -1;

  return Math.max(0, subscription.api_call_limit - subscription.api_calls_used);
};

/**
 * Gets subscription display message
 * ✅ UPDATED: Better messaging for exhausted but workflow-active state
 * @param subscription - User's subscription status
 * @returns user-friendly status message
 */
export const getSubscriptionMessage = (
  subscription?: SubscriptionStatus
): string => {
  if (!subscription) {
    return "No subscription found";
  }

  if (subscription.display_message) {
    return subscription.display_message;
  }

  // Custom messages based on status
  if (subscription.subscription_type === "admin") {
    return "Admin access - Unlimited usage";
  }

  if (!subscription.is_active) {
    return "Subscription inactive - Contact administrator";
  }

  if (subscription.is_expired) {
    return "Subscription expired - Contact administrator";
  }

  if (subscription.is_locked) {
    return "Account locked - Contact administrator";
  }

  // ✅ UPDATED: Different message when uploads exhausted but workflow allowed
  if (isApiCallsExhausted(subscription)) {
    if (subscription.api_calls_used > 0) {
      return `No uploads remaining - You can still complete your current workflow`;
    }
    return `API calls exhausted (${subscription.api_calls_used}/${subscription.api_call_limit}) - Contact administrator`;
  }

  if (subscription.subscription_type === "unlimited") {
    return "Unlimited access";
  }

  if (subscription.subscription_type === "free_trial") {
    const remaining = getRemainingApiCalls(subscription);
    const daysLeft = subscription.days_remaining ?? 0;
    return `Free trial: ${remaining} uploads remaining, ${daysLeft} days left`;
  }

  if (subscription.subscription_type === "limited") {
    const remaining = getRemainingApiCalls(subscription);
    return `${remaining} uploads remaining`;
  }

  return "Active subscription";
};

/**
 * Gets status badge color
 * ✅ UPDATED: Show different color when exhausted but workflow active
 * @param subscription - User's subscription status
 * @returns Tailwind color classes
 */
export const getSubscriptionBadgeColor = (
  subscription?: SubscriptionStatus
): string => {
  if (!subscription) return "bg-gray-100 text-gray-800";

  if (subscription.subscription_type === "admin") {
    return "bg-purple-100 text-purple-800";
  }

  // ✅ UPDATED: Show orange (warning) instead of red when exhausted but can still work
  if (isApiCallsExhausted(subscription)) {
    if (subscription.api_calls_used > 0 && !subscription.is_locked) {
      return "bg-orange-100 text-orange-800"; // Warning: Can work but can't upload
    }
    return "bg-red-100 text-red-800"; // Blocked
  }

  if (!canMakeApiCall(subscription)) {
    return "bg-red-100 text-red-800";
  }

  if (subscription.subscription_type === "unlimited") {
    return "bg-green-100 text-green-800";
  }

  if (subscription.subscription_type === "free_trial") {
    const remaining = getRemainingApiCalls(subscription);
    if (remaining <= 2) {
      return "bg-orange-100 text-orange-800";
    }
    return "bg-blue-100 text-blue-800";
  }

  return "bg-green-100 text-green-800";
};
