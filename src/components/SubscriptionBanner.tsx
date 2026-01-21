// src/components/SubscriptionBanner.tsx
import React from "react";
import {
  FiClock,
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";

export interface SubscriptionStatus {
  user_id?: number;
  subscription_type:
    | "free_trial"
    | "limited"
    | "unlimited"
    | "admin"
    | "none"
    | null;
  is_active: boolean;
  api_calls_used: number;
  api_call_limit: number; // -1 for unlimited
  api_calls_remaining: number;
  is_expired: boolean;
  is_locked: boolean;
  valid_until: string | null;
  days_remaining: number | null;
  display_message?: string;
  admin_contact_email: string; // ✅ ADD THIS LINE
}

interface SubscriptionBannerProps {
  subscription: SubscriptionStatus | null | undefined;
  userRole?: string | string[]; // Can be string or array of roles
}

const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  subscription,
  userRole,
}) => {
  // ✅ FIX: Don't show banner for admin users
  const isAdmin =
    typeof userRole === "string"
      ? userRole.toLowerCase() === "admin"
      : Array.isArray(userRole) &&
        userRole.some((r) => r.toLowerCase() === "admin");

  if (isAdmin) {
    return null; // Don't render anything for admins
  }

  if (!subscription || !subscription.is_active) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <FiAlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">
              No Active Subscription
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Please contact your administrator to activate your subscription.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { subscription_type, api_calls_used, api_call_limit, days_remaining } =
    subscription;

  // Calculate usage percentage
  const usagePercent =
    api_call_limit === -1 ? 0 : (api_calls_used / api_call_limit) * 100;

  // Determine color scheme based on subscription type
  let bgColor = "bg-blue-50";
  let borderColor = "border-blue-200";
  let textColor = "text-blue-900";
  let subtextColor = "text-blue-700";
  let progressColor = "bg-blue-600";
  let iconColor = "text-blue-600";

  if (subscription_type === "free_trial") {
    bgColor = "bg-blue-50";
    borderColor = "border-blue-200";
    textColor = "text-blue-900";
    subtextColor = "text-blue-700";
    progressColor = "bg-blue-600";
    iconColor = "text-blue-600";
  } else if (subscription_type === "unlimited") {
    bgColor = "bg-green-50";
    borderColor = "border-green-200";
    textColor = "text-green-900";
    subtextColor = "text-green-700";
    progressColor = "bg-green-600";
    iconColor = "text-green-600";
  } else if (subscription_type === "limited") {
    bgColor = "bg-amber-50";
    borderColor = "border-amber-200";
    textColor = "text-amber-900";
    subtextColor = "text-amber-700";
    progressColor = "bg-amber-600";
    iconColor = "text-amber-600";
  }

  // Warning for low usage
  const isLowUsage = api_call_limit !== -1 && usagePercent > 80;
  const isLowDays = days_remaining !== null && days_remaining <= 7;

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4 mb-6`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FiCheckCircle className={`w-5 h-5 ${iconColor}`} />
            <h3 className={`font-semibold ${textColor}`}>
              {subscription_type === "free_trial" && "Free Trial Active"}
              {subscription_type === "limited" && "Limited Subscription"}
              {subscription_type === "unlimited" && "Unlimited Subscription"}
            </h3>
            {isLowDays && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                Expiring Soon
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {/* API Usage */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FiActivity className={`w-4 h-4 ${subtextColor}`} />
                <span className={`text-sm font-medium ${subtextColor}`}>
                  API Usage
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${textColor}`}>
                  {api_calls_used}
                </span>
                <span className={`text-sm ${subtextColor}`}>
                  / {api_call_limit === -1 ? "∞" : api_call_limit}
                </span>
              </div>
              {api_call_limit !== -1 && (
                <div className="mt-2">
                  <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${progressColor} transition-all`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Time Remaining */}
            {days_remaining !== null && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FiClock className={`w-4 h-4 ${subtextColor}`} />
                  <span className={`text-sm font-medium ${subtextColor}`}>
                    Time Remaining
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${textColor}`}>
                    {days_remaining}
                  </span>
                  <span className={`text-sm ${subtextColor}`}>days</span>
                </div>
              </div>
            )}
          </div>

          {/* Warning Messages */}
          {(isLowUsage || isLowDays) && (
            <div className="mt-3 flex items-start gap-2">
              <FiAlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                {isLowUsage &&
                  `You've used ${Math.round(
                    usagePercent
                  )}% of your API calls. `}
                {isLowDays &&
                  `Your subscription expires in ${days_remaining} days. `}
                Contact your administrator for renewal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBanner;
