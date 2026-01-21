// src/components/SubscriptionManagement.tsx
import React, { useState } from "react";
import {
  FiGift,
  FiXCircle,
  FiActivity,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCalendar,
} from "react-icons/fi";

// ============================================
// SKELETON LOADER COMPONENT
// ============================================
const SubscriptionTableSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                API Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Days Left
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Expiry
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <div>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// TYPE DEFINITIONS
// ============================================
interface SubscriptionStatus {
  user_id: number;
  subscription_type: "free_trial" | "limited" | "unlimited" | null;
  is_active: boolean;
  api_calls_used: number;
  api_call_limit: number;
  start_date: string | null;
  expiry_date: string | null;
  days_remaining: number | null;
}

interface User {
  id: number;
  name: string;
  email: string;
  subscription?: SubscriptionStatus;
}

interface SubscriptionManagementProps {
  users: User[];
  onGrantSubscription: (
    userId: number,
    type: "limited" | "unlimited",
    callLimit?: number,
    validDays?: number
  ) => Promise<void>;
  onRevokeSubscription: (userId: number) => Promise<void>;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================
const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  users,
  onGrantSubscription,
  onRevokeSubscription,
  onRefresh,
  loading = false,
}) => {
  // State declarations
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null); // ✅ ADDED: Error state

  // Grant form state
  const [subscriptionType, setSubscriptionType] = useState<
    "limited" | "unlimited"
  >("limited");
  const [callLimit, setCallLimit] = useState<number>(50);
  const [validDays, setValidDays] = useState<number>(30);

  // ✅ FIXED: Show skeleton loader when loading
  if (loading) {
    return <SubscriptionTableSkeleton />;
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge based on subscription
  const getStatusBadge = (subscription: SubscriptionStatus | undefined) => {
    if (!subscription || !subscription.is_active) {
      return (
        <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-1 w-fit">
          <FiXCircle className="w-3 h-3" />
          No Subscription
        </span>
      );
    }

    const { subscription_type, days_remaining } = subscription;
    const isExpiringSoon = days_remaining !== null && days_remaining <= 7;
    const isCritical = days_remaining !== null && days_remaining <= 3;

    if (subscription_type === "free_trial") {
      return (
        <span
          className={`px-3 py-1 text-xs rounded-full border flex items-center gap-1 w-fit ${
            isCritical
              ? "bg-red-50 text-red-700 border-red-200"
              : isExpiringSoon
              ? "bg-orange-50 text-orange-700 border-orange-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
          }`}
        >
          <FiClock className="w-3 h-3" />
          Free Trial {days_remaining !== null && `(${days_remaining}d)`}
        </span>
      );
    }

    if (subscription_type === "unlimited") {
      return (
        <span className="px-3 py-1 text-xs rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1 w-fit">
          <FiCheckCircle className="w-3 h-3" />
          Unlimited {days_remaining !== null && `(${days_remaining}d)`}
        </span>
      );
    }

    if (subscription_type === "limited") {
      return (
        <span
          className={`px-3 py-1 text-xs rounded-full border flex items-center gap-1 w-fit ${
            isCritical
              ? "bg-red-50 text-red-700 border-red-200"
              : isExpiringSoon
              ? "bg-orange-50 text-orange-700 border-orange-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          <FiActivity className="w-3 h-3" />
          Limited {days_remaining !== null && `(${days_remaining}d)`}
        </span>
      );
    }

    return (
      <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-300">
        Unknown
      </span>
    );
  };

  // Get usage percentage color
  const getUsageColor = (subscription: SubscriptionStatus | undefined) => {
    if (!subscription || subscription.api_call_limit === -1)
      return "text-gray-600";

    const usagePercent =
      (subscription.api_calls_used / subscription.api_call_limit) * 100;
    if (usagePercent >= 90) return "text-red-600";
    if (usagePercent >= 75) return "text-orange-600";
    return "text-green-600";
  };

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleGrant = async () => {
    if (!selectedUser) return;

    setLocalLoading(true);
    setActionLoading(`grant-${selectedUser.id}`);
    setGrantError(null); // ✅ ADDED: Clear previous errors

    try {
      await onGrantSubscription(
        selectedUser.id,
        subscriptionType,
        subscriptionType === "limited" ? callLimit : undefined,
        validDays
      );
      // ✅ Success - close modal and reset
      setShowGrantModal(false);
      setSelectedUser(null);
      setSubscriptionType("limited");
      setCallLimit(50);
      setValidDays(30);
      setGrantError(null); // ✅ ADDED: Clear any errors
    } catch (error: any) {
      // ✅ ADDED: Show error in modal instead of just console
      const errorMessage =
        error?.message || "Failed to grant subscription. Please try again.";
      setGrantError(errorMessage);
      console.error("Failed to grant subscription:", error);
    } finally {
      setLocalLoading(false);
      setActionLoading(null);
    }
  };

  const handleRevoke = async (user: User) => {
    if (
      !confirm(
        `Are you sure you want to revoke subscription for ${
          user.name || user.email || "this user"
        }?`
      )
    )
      return;

    setActionLoading(`revoke-${user.id}`);
    try {
      await onRevokeSubscription(user.id);
    } catch (error) {
      console.error("Failed to revoke subscription:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    setLocalLoading(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setLocalLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Subscription Management</h2>
            <p className="text-blue-100 opacity-90">
              Manage user subscriptions, API access, and monitor usage across
              your organization
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 lg:mt-0">
            <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
              <div className="text-sm font-semibold">
                {users.filter((u) => u.subscription?.is_active).length} Active
              </div>
              <div className="text-xs opacity-80">Subscriptions</div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={localLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${localLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  API Usage
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Days Left
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((user) => {
                // ✅ FIXED: Use days_remaining directly from backend
                const daysLeft = user.subscription?.days_remaining;
                const isExpiringSoon =
                  daysLeft !== null && daysLeft !== undefined && daysLeft <= 7;
                const isCritical =
                  daysLeft !== null && daysLeft !== undefined && daysLeft <= 3;

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors duration-200 group"
                  >
                    {/* User Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {(user.name || user.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {user.name || "Unknown User"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.subscription)}
                    </td>

                    {/* API Usage */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.subscription ? (
                        <div className="flex flex-col">
                          <div
                            className={`text-sm font-semibold ${getUsageColor(
                              user.subscription
                            )}`}
                          >
                            {user.subscription.api_calls_used} /{" "}
                            {user.subscription.api_call_limit === -1
                              ? "∞"
                              : user.subscription.api_call_limit}
                          </div>
                          {user.subscription.api_call_limit !== -1 && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    (user.subscription.api_calls_used /
                                      user.subscription.api_call_limit) *
                                      100,
                                    100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>

                    {/* Days Left - ✅ FIXED: Now properly shows days remaining */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {daysLeft !== null && daysLeft !== undefined ? (
                        <div className="flex items-center gap-2">
                          <FiClock
                            className={`w-4 h-4 ${
                              isCritical
                                ? "text-red-500"
                                : isExpiringSoon
                                ? "text-orange-500"
                                : "text-green-500"
                            }`}
                          />
                          <span
                            className={`text-sm font-semibold ${
                              isCritical
                                ? "text-red-600"
                                : isExpiringSoon
                                ? "text-orange-600"
                                : "text-gray-700"
                            }`}
                          >
                            {daysLeft} days
                          </span>
                          {isExpiringSoon && (
                            <FiAlertTriangle className="w-3 h-3 text-orange-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>

                    {/* Expiry Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.subscription?.expiry_date ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiCalendar className="w-4 h-4 text-gray-400" />
                          {formatDate(user.subscription.expiry_date)}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowGrantModal(true);
                          }}
                          disabled={localLoading}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-blue-200 font-medium"
                        >
                          {actionLoading === `grant-${user.id}` ? (
                            <FiRefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <FiGift className="w-4 h-4" />
                          )}
                          Grant
                        </button>
                        {user.subscription?.is_active && (
                          <button
                            onClick={() => handleRevoke(user)}
                            disabled={actionLoading !== null}
                            className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-red-200 font-medium"
                          >
                            {actionLoading === `revoke-${user.id}` ? (
                              <FiRefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FiXCircle className="w-4 h-4" />
                            )}
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {users.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiGift className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Users Found
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              There are no users to display. Users will appear here once they
              are registered in the system.
            </p>
          </div>
        )}
      </div>

      {/* Grant Subscription Modal */}
      {showGrantModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <FiGift className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Grant Subscription
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    For{" "}
                    {selectedUser.name || selectedUser.email || "Unknown User"}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* ✅ ADDED: Error Alert */}
              {grantError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 text-red-600 mt-0.5">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">
                      Failed to Grant Subscription
                    </h3>
                    <p className="text-sm text-red-700">{grantError}</p>
                  </div>
                  <button
                    onClick={() => setGrantError(null)}
                    className="flex-shrink-0 text-red-400 hover:text-red-600"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Subscription Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Subscription Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSubscriptionType("limited")}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      subscriptionType === "limited"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-semibold">Limited</div>
                    <div className="text-xs opacity-75 mt-1">
                      Fixed API calls
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubscriptionType("unlimited")}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      subscriptionType === "unlimited"
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-semibold">Unlimited</div>
                    <div className="text-xs opacity-75 mt-1">
                      No restrictions
                    </div>
                  </button>
                </div>
              </div>

              {/* API Call Limit (only for limited) */}
              {subscriptionType === "limited" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    API Call Limit
                  </label>
                  <input
                    type="number"
                    value={callLimit}
                    onChange={(e) =>
                      setCallLimit(parseInt(e.target.value) || 50)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    min="1"
                    max="10000"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Number of API calls allowed for this subscription period
                  </p>
                </div>
              )}

              {/* Valid Days */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Valid Days
                </label>
                <input
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  min="1"
                  max="365"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Subscription duration in days
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowGrantModal(false);
                  setSelectedUser(null);
                  setSubscriptionType("limited");
                  setCallLimit(50);
                  setValidDays(30);
                  setGrantError(null); // ✅ ADDED: Clear error when modal closes
                }}
                className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium text-gray-700"
                disabled={localLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleGrant}
                disabled={localLoading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {localLoading ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                    Granting...
                  </>
                ) : (
                  <>
                    <FiGift className="w-4 h-4" />
                    Grant Subscription
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
