// src/pages/SubscriptionPage.tsx - UPDATED WITH API CALL EXHAUSTION FIX
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiTrendingUp,
  FiZap,
  FiBarChart2,
  FiShield,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";
import { subscriptionApi, SubscriptionStatus } from "../config/api";

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const data = await subscriptionApi.getStatus();
      console.log("Subscription data:", data);
      setSubscription(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
      setError("Failed to load subscription details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubscription();
  };

  const calculateDaysRemaining = (validUntil: string | null): number | null => {
    if (!validUntil) return null;

    const expiryDate = new Date(validUntil);
    const today = new Date();

    // Calculate difference in milliseconds
    const diffTime = expiryDate.getTime() - today.getTime();

    // Convert to days and round down
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Return 0 if expired (negative days), otherwise return days left
    return Math.max(0, diffDays);
  };

  // ✅ NEW: Calculate if API calls are exhausted
  const isApiCallsExhausted = (subscription: SubscriptionStatus): boolean => {
    const { api_call_limit, api_calls_used, subscription_type } = subscription;

    // Unlimited plans never exhaust
    if (subscription_type === "unlimited") return false;

    // Check if limited plan has exhausted API calls
    if (api_call_limit >= 0 && api_calls_used >= api_call_limit) {
      return true;
    }

    return false;
  };

  // ✅ NEW: Get effective subscription status
  const getEffectiveStatus = (subscription: SubscriptionStatus): string => {
    if (!subscription.is_active) return "inactive";
    if (isApiCallsExhausted(subscription)) return "exhausted";
    if (subscription.subscription_type === "unlimited") return "premium";
    if (subscription.subscription_type === "free_trial") return "trial";
    return "standard";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your subscription details...</p>
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Unable to Load
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/app")}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const {
    subscription_type,
    api_calls_used,
    api_call_limit,
    valid_until,
    is_active,
  } = subscription;

  const days_remaining_cal = calculateDaysRemaining(valid_until);

  // ✅ NEW: Calculate usage with exhaustion check
  const isUnlimited = api_call_limit === -1;
  const callsRemaining = isUnlimited
    ? -1
    : Math.max(0, api_call_limit - api_calls_used);
  const usagePercent = isUnlimited
    ? 0
    : (api_calls_used / api_call_limit) * 100;
  const isExhausted = isApiCallsExhausted(subscription);
  const isExpiringSoon = days_remaining_cal !== null && days_remaining_cal <= 7;
  const isCritical = days_remaining_cal !== null && days_remaining_cal <= 3;

  // ✅ UPDATED: Use effective status instead of just is_active
  const effectiveStatus = getEffectiveStatus(subscription);

  const themeConfig = {
    inactive: {
      gradient: "from-gray-500 to-gray-700",
      bg: "bg-gray-100",
      text: "text-gray-800",
      accent: "text-gray-600",
      badge: "bg-gray-200 text-gray-800",
      progress: "bg-gray-500",
      icon: FiXCircle,
    },
    exhausted: {
      gradient: "from-red-500 to-orange-600",
      bg: "bg-red-50",
      text: "text-red-900",
      accent: "text-red-600",
      badge: "bg-red-100 text-red-800",
      progress: "bg-red-500",
      icon: FiXCircle,
    },
    trial: {
      gradient: "from-blue-500 to-cyan-600",
      bg: "bg-blue-50",
      text: "text-blue-900",
      accent: "text-blue-600",
      badge: "bg-blue-100 text-blue-800",
      progress: "bg-blue-500",
      icon: FiCheckCircle,
    },
    standard: {
      gradient: "from-green-500 to-emerald-600",
      bg: "bg-green-50",
      text: "text-green-900",
      accent: "text-green-600",
      badge: "bg-green-100 text-green-800",
      progress: "bg-green-500",
      icon: FiCheckCircle,
    },
    premium: {
      gradient: "from-purple-500 to-pink-600",
      bg: "bg-purple-50",
      text: "text-purple-900",
      accent: "text-purple-600",
      badge: "bg-purple-100 text-purple-800",
      progress: "bg-purple-500",
      icon: FiCheckCircle,
    },
  };

  const currentTheme = themeConfig[effectiveStatus];
  const StatusIcon = currentTheme.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <button
              onClick={() => navigate("/app")}
              className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-all duration-300 group"
            >
              <div className="p-2 rounded-xl bg-white shadow-sm group-hover:shadow-md transition-shadow">
                <FiArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-semibold">Back to Dashboard</span>
            </button>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800">
                Subscription Overview
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your account access
              </p>
            </div>

            {/* <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button> */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Hero Card */}
        <div
          className={`bg-gradient-to-r ${currentTheme.gradient} rounded-3xl p-8 text-white shadow-2xl mb-8 transform hover:scale-[1.02] transition-transform duration-300`}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <StatusIcon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {/* ✅ UPDATED: Show proper status */}
                    {effectiveStatus === "exhausted" && "API Calls Exhausted"}
                    {effectiveStatus === "inactive" && "Inactive Account"}
                    {subscription_type === "free_trial" && "Free Trial Plan"}
                    {subscription_type === "limited" && "Professional Plan"}
                    {subscription_type === "unlimited" && "Enterprise Plan"}
                  </h2>
                  <p className="text-blue-100 text-lg">
                    {/* ✅ UPDATED: Show proper status message */}
                    {effectiveStatus === "exhausted" &&
                      "All API calls have been used. Please contact support."}
                    {effectiveStatus === "inactive" &&
                      "Your account needs activation"}
                    {effectiveStatus === "trial" && "Your free trial is active"}
                    {effectiveStatus === "standard" &&
                      "Your subscription is active"}
                    {effectiveStatus === "premium" &&
                      "Your enterprise plan is active"}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 mt-6">
                <div className="flex items-center gap-3">
                  <FiActivity className="w-5 h-5" />
                  <span className="font-semibold">
                    {isUnlimited
                      ? "Unlimited"
                      : `${api_calls_used} / ${api_call_limit}`}{" "}
                    API Calls
                    {isExhausted && " ❌"}
                  </span>
                </div>
                {/* {days_remaining_cal !== null && (
                  <div className="flex items-center gap-3">
                    <FiClock className="w-5 h-5" />
                    <span className="font-semibold">
                      {days_remaining_cal} Days Remaining
                    </span>
                  </div>
                )} */}
                {valid_until && (
                  <div className="flex items-center gap-3">
                    <FiCalendar className="w-5 h-5" />
                    <span className="font-semibold">
                      Expires {new Date(valid_until).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 lg:mt-0">
              <span
                className={`px-6 py-3 rounded-2xl text-sm font-bold ${currentTheme.badge} backdrop-blur-sm`}
              >
                {/* ✅ UPDATED: Show proper status badge */}
                {effectiveStatus === "exhausted" && "EXHAUSTED"}
                {effectiveStatus === "inactive" && "INACTIVE"}
                {effectiveStatus === "trial" && "TRIAL"}
                {effectiveStatus === "standard" && "ACTIVE"}
                {effectiveStatus === "premium" && "PREMIUM"}
                {isExpiringSoon && " • EXPIRING SOON"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Usage Analytics Card */}
          <div className="lg:col-span-2 space-y-8">
            {/* API Usage Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  API Usage Analytics
                </h3>
                <FiBarChart2 className="w-6 h-6 text-gray-400" />
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Usage Progress
                      {isExhausted && (
                        <span className="ml-2 text-red-600 font-bold">
                          • EXHAUSTED
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {isUnlimited
                        ? "Unlimited"
                        : `${api_calls_used} of ${api_call_limit}`}
                      {isExhausted && " ❌"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${currentTheme.progress} transition-all duration-1000 ease-out`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-500">0%</span>
                    <span className="text-xs text-gray-500">100%</span>
                  </div>
                </div>

                {!isUnlimited && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <div
                        className={`text-2xl font-bold ${
                          isExhausted ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        {api_calls_used}
                      </div>
                      <div className="text-sm text-gray-600">Calls Used</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <div
                        className={`text-2xl font-bold ${
                          isExhausted ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {callsRemaining}
                        {isExhausted && " ❌"}
                      </div>
                      <div className="text-sm text-gray-600">
                        Calls Remaining
                      </div>
                    </div>
                  </div>
                )}

                {/* ✅ NEW: Exhausted API Calls Warning */}
                {isExhausted && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <FiXCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-800">
                          API Calls Exhausted
                        </h4>
                        <p className="text-sm text-red-700 mt-1">
                          You've used all {api_call_limit} API calls in your
                          plan. Please contact support to upgrade your
                          subscription.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Plan Details & Actions */}
          <div className="space-y-8">
            {/* Plan Details Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">
                Plan Details
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">
                    Plan Type
                  </span>
                  <span className="text-sm font-semibold text-gray-900 capitalize">
                    {subscription_type?.replace("_", " ") || "None"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">
                    Billing Cycle
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {valid_until
                      ? `${days_remaining_cal ?? 0} days left`
                      : "Lifetime"}
                  </span>
                </div>
              </div>
            </div>

            {/* Support Card - Show for exhausted or inactive subscriptions */}
            {(isExhausted || !is_active) && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-start gap-4">
                  <FiAlertTriangle className="w-8 h-8 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold mb-2">
                      {isExhausted ? "API Calls Exhausted" : "Action Required"}
                    </h3>
                    <p className="text-sm opacity-90 mb-4">
                      {isExhausted
                        ? `You've used all ${api_call_limit} API calls. Contact support to upgrade.`
                        : "Your subscription needs activation to access all features."}
                    </p>
                    <button
                      onClick={() =>
                        (window.location.href = "mailto:zack@kbccm.com")
                      }
                      className="w-full px-4 py-2 bg-white text-orange-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Contact Admin
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubscriptionPage;
