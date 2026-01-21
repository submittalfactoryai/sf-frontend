/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// pages/AdminPage.tsx

import { useState, useMemo, useEffect } from "react";
import { FiUsers, FiFileText, FiGift, FiMenu, FiX } from "react-icons/fi";
import { FaArrowAltCircleLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import UserManagement from "../components/UserManagement";
import AuditLogs from "../components/AuditLogs";
import SubscriptionManagement from "../components/SubscriptionManagement";
import useAuth from "../hooks/useAuth";
import axios from "axios";

// =========================
// Types
// =========================
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  isActive: boolean;
  lastLogin: string;
  canSmartSearch: boolean;
  canSmartValidate: boolean;
  roles?: string[];
  subscription?: any; // Add subscription property
}
interface Log {
  id: number;
  userId: number;
  user: string;
  action: string;
  details: string;
  timestamp: string;
  cost: number;
  process_time?: number;
}
type LogEntry = Log;
type UserDateFlatGroup = {
  user: string;
  date: string;
  logs: LogEntry[];
};
type UserLogGroup = { name: string; logs: LogEntry[] };
type LogGroupByActionDate = {
  action: string;
  date: string;
  users: UserLogGroup[];
};

// =========================
// Helper functions
// =========================
function fiveDaysAgoString() {
  const d = new Date();
  d.setDate(d.getDate() - 5);
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timestamp: string) {
  const timePart = timestamp.includes("T")
    ? timestamp.split("T")[1].replace("Z", "")
    : timestamp.split(" ")[1];
  if (!timePart) return "";
  const [h, m] = timePart.split(":");
  let hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${m} ${ampm}`;
}

function formatAuditTime(dateStr: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  };
  return date.toLocaleTimeString("en-US", options);
}

function groupLogsByActionDateUser(logs: LogEntry[]): LogGroupByActionDate[] {
  const groupMap: Record<
    string,
    { action: string; date: string; users: Record<string, UserLogGroup> }
  > = {};

  logs.forEach((log) => {
    const date = log.timestamp.split("T")[0].split(" ")[0];
    const action = log.action;
    const key = `${action}|${date}`;
    if (!groupMap[key]) {
      groupMap[key] = { action, date, users: {} };
    }
    if (!groupMap[key].users[log.user]) {
      groupMap[key].users[log.user] = { name: log.user, logs: [] };
    }
    groupMap[key].users[log.user].logs.push(log);
  });

  return Object.values(groupMap)
    .map((g) => ({
      action: g.action,
      date: g.date,
      users: Object.values(g.users),
    }))
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.action.localeCompare(b.action)
    );
}

function groupLogsByUserDateAction(logs: LogEntry[]): UserDateFlatGroup[] {
  const map = new Map<string, UserDateFlatGroup>();
  logs.forEach((log) => {
    const date = log.timestamp.split("T")[0].split(" ")[0];
    const key = `${log.user}|||${date}`;
    if (!map.has(key)) {
      map.set(key, { user: log.user, date, logs: [] });
    }
    map.get(key)!.logs.push(log);
  });
  return Array.from(map.values()).sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return a.user.localeCompare(b.user);
  });
}

// =========================
// Main Component
// =========================
const AdminPage = () => {
  const [tab, setTab] = useState<"users" | "logs" | "subscriptions">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptionUsers, setSubscriptionUsers] = useState<User[]>([]); // ✅ ADD THIS
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<"action" | "user">("action");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const today = new Date().toISOString().split("T")[0];

  // ✅ NEW: Pagination state variables
  const [currentPage, setCurrentPage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [usersPerPage] = useState(50);

  const { token, logout, sessionExpired, handleSessionExpiredLogin } =
    useAuth();
  const [selectedRange, setSelectedRange] = useState<{
    start: string;
    end: string;
  }>({
    start: fiveDaysAgoString(),
    end: today,
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Loader states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);

  // Popup & Modal states
  const [popup, setPopup] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [confirmType, setConfirmType] = useState<"delete" | "status" | null>(
    null
  );

  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        !event.target?.closest("aside") &&
        !event.target?.closest("button[data-mobile-menu-toggle]")
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // ---- Data Fetchers ----
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      showPopup(err.message || "Failed to fetch users", "error");
    }
    setUsersLoading(false);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/audit/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setLogs(await res.json());
    } catch (err: any) {
      showPopup(err.message || "Failed to fetch logs", "error");
    }
    setLoading(false);
  };

  // ✅ UPDATED: Subscription API with batch API
  const fetchUserSubscriptions = async (
    page: number = 0,
    limit: number = 50
  ) => {
    setSubscriptionsLoading(true);
    try {
      // ✅ NEW: Use batch API instead of individual calls
      const response = await axios.get(
        `${API_URL}/api/subscription/users-with-subscriptions?skip=${
          page * limit
        }&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Fetched all users with subscriptions:", response.data);

      // response.data structure:
      // {
      //   users: [...],
      //   total: 44,
      //   page: 0,
      //   limit: 50,
      //   has_more: false
      // }

      setSubscriptionUsers(response.data.users);
      setTotalUsers(response.data.total);
      setCurrentPage(response.data.page);
      setHasMore(response.data.has_more);
    } catch (error) {
      console.error("Failed to fetch user subscriptions:", error);
      showPopup("Failed to fetch user subscriptions", "error");
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const handleGrantSubscription = async (
    userId: number,
    subscriptionType: "limited" | "unlimited",
    callLimit?: number,
    validDays?: number
  ) => {
    setSubscriptionsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/subscription/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          subscription_type: subscriptionType,
          api_call_limit: callLimit,
          valid_days: validDays,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        // ✅ Better error handling for duplicate key constraint
        if (error.detail && error.detail.includes("unique constraint")) {
          throw new Error(
            "A subscription is already being processed. Please refresh and try again."
          );
        }
        throw new Error(error.detail || "Failed to grant subscription");
      }

      showPopup("Subscription granted successfully");
      await fetchUserSubscriptions(currentPage, usersPerPage);
    } catch (err: any) {
      showPopup(err.message || "Failed to grant subscription", "error");
      throw err;
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const handleRevokeSubscription = async (userId: number) => {
    setSubscriptionsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/subscription/revoke/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to revoke subscription");
      }

      showPopup("Subscription revoked successfully");
      await fetchUserSubscriptions(currentPage, usersPerPage);
    } catch (err: any) {
      showPopup(err.message || "Failed to revoke subscription", "error");
      throw err;
    } finally {
      setSubscriptionsLoading(false);
    }
  };
  useEffect(() => {
    // Load basic user data for Users tab (default)
    fetchUsers();
    // Load logs for Logs tab
    fetchLogs();
  }, []);

  // ✅ FIXED: Load tab-specific data when tab changes
  useEffect(() => {
    if (tab === "subscriptions") {
      fetchUserSubscriptions(currentPage, usersPerPage);
    }
  }, [tab]);

  // ---- Popup logic ----
  const showPopup = (msg: string, type: "success" | "error" = "success") => {
    setPopup({ type, msg });
    setTimeout(() => setPopup(null), 2200);
  };

  // ---- User Actions ----
  const handleToggleActive = (user: User) => {
    setConfirmUser(user);
    setConfirmType("status");
  };

  const handleRemoveUser = (user: User) => {
    setConfirmUser(user);
    setConfirmType("delete");
  };

  const handleConfirm = async () => {
    if (!confirmUser || !confirmType) return;
    setActionLoading(true);
    try {
      if (confirmType === "status") {
        const res = await fetch(
          `${API_URL}/api/users/${confirmUser.id}/activate`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ is_active: !confirmUser.isActive }),
          }
        );
        if (!res.ok) throw new Error(await res.text());
        showPopup(
          `User "${confirmUser.name}" has been ${
            confirmUser.isActive ? "deactivated" : "activated"
          }.`
        );
        await fetchUsers();
      } else if (confirmType === "delete") {
        const res = await fetch(
          `${API_URL}/api/users/${confirmUser.id}/delete`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error(await res.text());
        showPopup(`User "${confirmUser.name}" deleted.`, "success");
        await fetchUsers();
      }
      setConfirmUser(null);
      setConfirmType(null);
    } catch (err: any) {
      showPopup(err.message || "Failed to perform action", "error");
    }
    setActionLoading(false);
  };

  const handleCancel = () => {
    setConfirmUser(null);
    setConfirmType(null);
    setActionLoading(false);
  };

  const handleLogout = () => {
    navigate("/");
  };

  // ---- User Edit Modal Save ----
  const saveEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${editUser.id}/edit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editUser.name,
          email: editUser.email,
          role: editUser.role,
          canSmartSearch: editUser.canSmartSearch,
          canSmartValidate: editUser.canSmartValidate,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showPopup("User updated successfully");
      setEditUser(null);
      await fetchUsers();
    } catch (err: any) {
      showPopup(err.message || "Failed to update user", "error");
    }
    setEditLoading(false);
  };

  // ---- Filters, Groups, etc. ----
  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
      ),
    [users, search]
  );

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (
        selectedActions.length > 0 &&
        !selectedActions.some((a) =>
          log.action?.toLowerCase().includes(a.toLowerCase())
        )
      )
        return false;
      if (search && !log.user?.toLowerCase().includes(search.toLowerCase()))
        return false;
      const date = log.timestamp.split("T")[0].split(" ")[0];
      return date >= selectedRange.start && date <= selectedRange.end;
    });
  }, [logs, search, selectedActions, selectedRange]);

  const groupedLogs = useMemo(() => {
    return groupBy === "user"
      ? groupLogsByUserDateAction(filteredLogs)
      : groupLogsByActionDateUser(filteredLogs);
  }, [filteredLogs, groupBy]);

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  // CSV export
  const exportLogs = () => {
    const rows = [
      ["Action", "User", "Date", "Time", "Cost", "Details"],
      ...filteredLogs.map((log) => {
        const date = log.timestamp.split("T")[0].split(" ")[0];
        const time = formatAuditTime(log.timestamp);
        return [
          log.action,
          log.user,
          date,
          time,
          log.cost > 0 ? `$${log.cost.toFixed(2)}` : "-",
          log.details,
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  function formatCost(cost: number) {
    if (cost === undefined || cost === null) return "-";
    if (cost < 0.01 && cost > 0) {
      return `$${cost.toFixed(7).replace(/0+$/, "")}`;
    }
    return `$${cost.toFixed(2)}`;
  }

  // =========================
  // RENDER
  // =========================
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile menu button */}
      {isMobile && (
        <button
          data-mobile-menu-toggle
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md md:hidden"
        >
          {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      )}

      {/* Mobile menu overlay */}
      {isMobile && isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" />
      )}

      {/* Popup notification */}
      {popup && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all duration-300
                    ${
                      popup.type === "success"
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white"
                    }`}
          style={{ maxWidth: isMobile ? "calc(100% - 2rem)" : "auto" }}
        >
          {popup.msg}
        </div>
      )}

      {/* Session expired modal */}
      {sessionExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 flex flex-col items-center">
            <div className="text-xl font-semibold text-gray-800 mb-4">
              Session Expired
            </div>
            <div className="text-gray-600 mb-6 text-center">
              Your session has expired. Please login again to continue.
            </div>
            <button
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium w-full"
              onClick={handleSessionExpiredLogin}
            >
              Login Again
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmUser && confirmType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 flex flex-col items-center">
            <div className="text-xl font-semibold text-gray-800 mb-4">
              {confirmType === "delete"
                ? "Delete User"
                : confirmUser.isActive
                ? "Deactivate User"
                : "Activate User"}
            </div>
            <div className="text-gray-600 mb-6 text-center">
              {confirmType === "delete"
                ? `Are you sure you want to delete "${confirmUser.name}"?`
                : `Are you sure you want to ${
                    confirmUser.isActive ? "deactivate" : "activate"
                  } "${confirmUser.name}"?`}
            </div>
            <div className="flex gap-3 w-full">
              <button
                className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 font-medium flex-1"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium flex-1
                                    ${
                                      confirmType === "delete"
                                        ? "bg-red-600 text-white hover:bg-red-700"
                                        : "bg-blue-600 text-white hover:bg-blue-700"
                                    }`}
                onClick={handleConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Static Sidebar */}
      <aside
        className={`w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col fixed md:static inset-y-0 left-0 z-40 transform ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        {/* Sidebar Header - Fixed */}
        <div className="p-6 font-bold text-xl text-blue-700 border-b border-gray-200 flex-shrink-0">
          SF Admin
        </div>

        {/* Sidebar Navigation - Scrollable if needed */}
        <nav className="p-4 space-y-1 flex-grow overflow-y-auto">
          <button
            onClick={() => {
              setTab("users");
              if (isMobile) setIsMobileMenuOpen(false);
            }}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition ${
              tab === "users"
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FiUsers className="mr-3 text-lg flex-shrink-0" />
            <span className="truncate">User Management</span>
          </button>
          <button
            onClick={() => {
              setTab("logs");
              if (isMobile) setIsMobileMenuOpen(false);
            }}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition ${
              tab === "logs"
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FiFileText className="mr-3 text-lg flex-shrink-0" />
            <span className="truncate">Audit Logs</span>
          </button>
          <button
            onClick={() => {
              setTab("subscriptions");
              if (isMobile) setIsMobileMenuOpen(false);
            }}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition ${
              tab === "subscriptions"
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FiGift className="mr-3 text-lg flex-shrink-0" />
            <span className="truncate">Subscriptions</span>
          </button>
        </nav>
      </aside>

      {/* Main content area with proper scrolling */}
      <main className="flex-grow flex flex-col min-w-0 md:ml-0">
        {/* Header - Fixed */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="min-w-0 flex-grow">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 capitalize truncate">
                {tab === "users"
                  ? "User Management"
                  : tab === "logs"
                  ? "Audit Logs"
                  : "Subscriptions"}
              </h1>
              <p className="text-sm sm:text-base text-gray-500 truncate">
                {tab === "users"
                  ? "Manage system users and permissions"
                  : tab === "logs"
                  ? "Track all system activities and actions"
                  : "Manage user subscriptions and API access"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-sm sm:text-base flex-shrink-0"
            >
              <FaArrowAltCircleLeft className="text-lg" />
              <span>SF Home</span>
            </button>
          </div>
        </header>

        {/* Content area - Scrollable */}
        <div className="flex-grow overflow-hidden">
          <div className="h-full p-4 md:p-6 overflow-y-auto">
            {tab === "users" && (
              <UserManagement
                users={users}
                filteredUsers={filteredUsers}
                search={search}
                setSearch={setSearch}
                loading={usersLoading}
                toggleActive={(userId) => {
                  const user = users.find((u) => u.id === userId);
                  if (user) handleToggleActive(user);
                }}
                setEditUser={setEditUser}
                removeUser={(userId) => {
                  const user = users.find((u) => u.id === userId);
                  if (user) handleRemoveUser(user);
                }}
              />
            )}

            {tab === "logs" && (
              <AuditLogs
                logs={filteredLogs}
                groupedLogs={groupedLogs}
                groupBy={groupBy}
                setGroupBy={setGroupBy}
                search={search}
                setSearch={setSearch}
                selectedRange={selectedRange}
                setSelectedRange={setSelectedRange}
                selectedActions={selectedActions}
                setSelectedActions={setSelectedActions}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                expandedGroups={expandedGroups}
                toggleGroupExpansion={toggleGroupExpansion}
                exportLogs={exportLogs}
                setSelectedLog={setSelectedLog}
                formatDisplayDate={formatDisplayDate}
                formatTime={formatAuditTime}
              />
            )}

            {tab === "subscriptions" && (
              <>
                <SubscriptionManagement
                  users={subscriptionUsers}
                  onGrantSubscription={handleGrantSubscription}
                  onRevokeSubscription={handleRevokeSubscription}
                  onRefresh={() =>
                    fetchUserSubscriptions(currentPage, usersPerPage)
                  }
                  loading={subscriptionsLoading}
                />

                {/* ✅ NEW: Pagination Controls */}
                {totalUsers > usersPerPage && (
                  <div className="mt-6 flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-600">
                      Showing {currentPage * usersPerPage + 1} to{" "}
                      {Math.min((currentPage + 1) * usersPerPage, totalUsers)}{" "}
                      of {totalUsers} users
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          fetchUserSubscriptions(currentPage - 1, usersPerPage)
                        }
                        disabled={currentPage === 0}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          fetchUserSubscriptions(currentPage + 1, usersPerPage)
                        }
                        disabled={!hasMore}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-800">
                Edit User
              </h3>
            </div>
            <div className="p-4 sm:p-6 space-y-4 flex-grow overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={(e) =>
                    setEditUser({ ...editUser, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editUser.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      name="role"
                      value="admin"
                      checked={editUser.role === "admin"}
                      onChange={() =>
                        setEditUser({ ...editUser, role: "admin" })
                      }
                    />
                    <span className="text-gray-700">Admin</span>
                  </label>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      name="role"
                      value="user"
                      checked={editUser.role === "user"}
                      onChange={() =>
                        setEditUser({ ...editUser, role: "user" })
                      }
                    />
                    <span className="text-gray-700">User</span>
                  </label>
                </div>
              </div>
              {editUser.role === "user" && (
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User Permissions
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600 rounded"
                        checked={editUser.canSmartSearch || false}
                        onChange={(e) =>
                          setEditUser({
                            ...editUser,
                            canSmartSearch: e.target.checked,
                          })
                        }
                      />
                      <span className="text-gray-700">Smart Search User</span>
                    </label>
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600 rounded"
                        checked={editUser.canSmartValidate || false}
                        onChange={(e) =>
                          setEditUser({
                            ...editUser,
                            canSmartValidate: e.target.checked,
                          })
                        }
                      />
                      <span className="text-gray-700">Smart Validate User</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setEditUser(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md flex items-center justify-center min-w-[120px]"
              >
                {editLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="dot-pulse">
                      <span></span>
                    </span>
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-800">
                Log Details
              </h3>
            </div>
            <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                    User
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-800 break-words">
                    {selectedLog.user}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                    Action
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-800 break-words">
                    {selectedLog.action}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                    Date
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-800">
                    {formatDisplayDate(selectedLog.timestamp)}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                    Time
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-800">
                    {formatAuditTime(selectedLog.timestamp)}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                    Cost
                  </p>
                  <p
                    className={`text-base sm:text-lg font-semibold ${
                      selectedLog.cost > 0 ? "text-blue-600" : "text-gray-600"
                    }`}
                  >
                    {selectedLog.cost > 0
                      ? formatCost(selectedLog.cost)
                      : "No cost"}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                    Process Time
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-purple-700">
                    {selectedLog.process_time !== undefined &&
                    selectedLog.process_time !== null
                      ? `${(selectedLog.process_time / 1000).toFixed(2)} sec`
                      : "-"}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 mb-2">
                  Details
                </p>
                <div className="p-3 bg-gray-50 rounded-lg h-48 sm:h-64 overflow-auto">
                  <pre className="text-gray-800 font-mono whitespace-pre-wrap text-xs sm:text-sm break-words">
                    {selectedLog.details
                      ? typeof selectedLog.details === "object"
                        ? JSON.stringify(selectedLog.details, null, 2)
                        : String(selectedLog.details)
                      : "No details available"}
                  </pre>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
