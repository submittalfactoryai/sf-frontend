import React, { FC, useState, useEffect, useRef } from "react";
import {
    FiDownload,
    FiFilter,
    FiChevronUp,
    FiChevronDown,
    FiCalendar,
    FiClock,
    FiEye,
    FiSearch,
    FiChevronsLeft,
    FiChevronLeft,
    FiChevronRight,
    FiChevronsRight,
    FiX,
} from "react-icons/fi";

// === TYPES ===
export interface LogEntry {
    id: number;
    userId: number;
    user: string;
    action: string;
    details: string;
    timestamp: string;
    cost: number;
}
type UserLogGroup = { name: string; logs: LogEntry[] };
type LogGroupByActionDate = {
    action: string;
    date: string;
    users: UserLogGroup[];
};
type UserDateGroup = {
    user: string;
    dates: {
        date: string;
        logs: LogEntry[];
    }[];
};
type UserDateFlatGroup = {
    user: string;
    date: string;
    logs: LogEntry[];
};
interface AuditLogsProps {
    groupedLogs: LogGroupByActionDate[] | UserDateGroup[] | UserDateFlatGroup[];
    groupBy: "user" | "action";
    setGroupBy: (val: "user" | "action") => void;
    search: string;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    selectedRange: { start: string; end: string };
    setSelectedRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
    selectedActions: string[];
    setSelectedActions: React.Dispatch<React.SetStateAction<string[]>>;
    showFilters: boolean;
    setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
    expandedGroups: string[];
    toggleGroupExpansion: (groupId: string) => void;
    exportLogs: () => void;
    setSelectedLog: React.Dispatch<React.SetStateAction<LogEntry | null>>;
    formatDisplayDate: (dateStr: string) => string;
    formatTime: (timestamp: string) => string;
}

// === HELPERS ===
function todayString() {
    return new Date().toISOString().slice(0, 10);
}
function fiveDaysAgoString() {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    return d.toISOString().slice(0, 10);
}
const GROUPS_PER_PAGE = 5;

// Action list for filter checkboxes
const ALL_ACTIONS = [
    { value: "Register", label: "Register" },
    { value: "Login", label: "Login" },
    { value: "Extract", label: "Extract" },
    { value: "SmartSearch", label: "Smart Search" },
    { value: "SmartValidate", label: "Smart Validate" },
    { value: "SmartSearchValidate", label: "Smart Search Validate" },
    { value: "SmartValidateSingleDownload", label: "Smart Validate Single Download" },
    { value: "SmartValidateZipDownload", label: "Smart Validate Zip Download" },
    { value: "smartSearchSingleDownload", label: "smart Search Single Download" },
    { value: "smartSearchZipDownload", label: "smart Search Zip Download" },
    { value: "Logout", label: "Logout" },
];

const ACTION_COLORS: Record<string, string> = {
    Register: "bg-purple-100 text-purple-800",
    Login: "bg-indigo-100 text-indigo-800",
    Extract: "bg-teal-100 text-teal-800",
    SmartSearch: "bg-blue-100 text-blue-800",
    SmartValidate: "bg-green-100 text-green-800",
    SmartSearchValidate: "bg-pink-100 text-pink-800",
    SmartValidateSingleDownload: "bg-cyan-100 text-cyan-800",
    SmartValidateZipDownload: "bg-orange-100 text-orange-800",
    smartSearchSingleDownload: "bg-amber-100 text-amber-800",
    smartSearchZipDownload: "bg-lime-100 text-lime-800",
    Logout: "bg-gray-200 text-gray-700"
};

function getActionColor(action: string) {
    const foundKey = Object.keys(ACTION_COLORS).find(
        key => key.toLowerCase() === action.toLowerCase()
    );
    return foundKey ? ACTION_COLORS[foundKey] : "bg-gray-100 text-gray-800";
}

// === COMPONENT ===
const AuditLogs: FC<AuditLogsProps> = ({
    groupedLogs,
    groupBy,
    setGroupBy,
    search,
    setSearch,
    selectedRange,
    setSelectedRange,
    selectedActions,
    setSelectedActions,
    showFilters,
    setShowFilters,
    expandedGroups,
    toggleGroupExpansion,
    exportLogs,
    setSelectedLog,
    formatDisplayDate,
    formatTime,
}) => {
    const minAllowedDate = fiveDaysAgoString();
    const maxAllowedDate = todayString();
    const [currentPage, setCurrentPage] = useState(1);
    const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const actionDropdownRef = useRef<HTMLDivElement>(null);

    // Reset pagination when filter/search/group changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedActions, selectedRange, showFilters, groupedLogs.length, groupBy]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
                setActionDropdownOpen(false);
            }
        }
        if (actionDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [actionDropdownOpen]);

    // Pagination logic
    const totalPages = Math.ceil(groupedLogs.length / GROUPS_PER_PAGE);
    let paginatedGroups: LogGroupByActionDate[] | UserDateFlatGroup[] = [];

    if (groupBy === "user") {
        paginatedGroups = (groupedLogs as UserDateFlatGroup[]).slice(
            (currentPage - 1) * GROUPS_PER_PAGE,
            currentPage * GROUPS_PER_PAGE
        );
    } else {
        paginatedGroups = (groupedLogs as LogGroupByActionDate[]).slice(
            (currentPage - 1) * GROUPS_PER_PAGE,
            currentPage * GROUPS_PER_PAGE
        );
    }

    // Pagination render
    const renderPagination = () => (
        <div className="flex justify-between md:justify-end items-center mt-4 space-x-2 text-sm">
            <div className="md:hidden text-sm text-gray-500">
                Page {currentPage} of {totalPages || 1}
            </div>
            <div className="flex space-x-2">
                <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded ${currentPage === 1 ? "text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
                    title="First"
                >
                    <FiChevronsLeft />
                </button>
                <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded ${currentPage === 1 ? "text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
                    title="Previous"
                >
                    <FiChevronLeft />
                </button>
                <span className="hidden md:inline px-2 text-gray-600">
                    Page <b>{currentPage}</b> of <b>{totalPages || 1}</b>
                </span>
                <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`p-2 rounded ${currentPage === totalPages || totalPages === 0 ? "text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
                    title="Next"
                >
                    <FiChevronRight />
                </button>
                <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`p-2 rounded ${currentPage === totalPages || totalPages === 0 ? "text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
                    title="Last"
                >
                    <FiChevronsRight />
                </button>
            </div>
        </div>
    );

    // === MAIN RENDER ===
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Mobile filter toggle */}
            <div className="md:hidden p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Audit Logs</h2>
                    <p className="text-xs text-gray-500">Track all system activities</p>
                </div>
                <button
                    onClick={() => setMobileFiltersOpen(true)}
                    className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                    <FiFilter className="mr-2" />
                    Filters
                </button>
            </div>

            {/* Mobile filters sidebar */}
            {mobileFiltersOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto md:hidden">
                    <div className="flex min-h-screen">
                        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setMobileFiltersOpen(false)} />
                        <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-white shadow-xl">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h2 className="text-lg font-medium">Filters</h2>
                                <button
                                    type="button"
                                    className="-mr-2 flex h-10 w-10 items-center justify-center rounded-md p-2 text-gray-400"
                                    onClick={() => setMobileFiltersOpen(false)}
                                >
                                    <FiX className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto">
                                <div className="space-y-6">
                                    {/* Group By */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Group By
                                        </label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2 text-sm"
                                            value={groupBy}
                                            onChange={e => setGroupBy(e.target.value as "user" | "action")}
                                        >
                                            <option value="action">Action + Date</option>
                                            <option value="user">User + Date</option>
                                        </select>
                                    </div>

                                    {/* Date Range */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date Range
                                        </label>
                                        <div className="space-y-2">
                                            <div className="flex items-center">
                                                <input
                                                    type="date"
                                                    value={selectedRange.start}
                                                    min={minAllowedDate}
                                                    max={selectedRange.end || maxAllowedDate}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setSelectedRange(r => ({ ...r, start: val }));
                                                    }}
                                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    type="date"
                                                    value={selectedRange.end}
                                                    min={selectedRange.start || minAllowedDate}
                                                    max={maxAllowedDate}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setSelectedRange(r => ({ ...r, end: val }));
                                                    }}
                                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Action Type
                                        </label>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {ALL_ACTIONS.map((action) => (
                                                <label
                                                    key={action.value}
                                                    className="flex items-center gap-2 py-1 cursor-pointer text-sm"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        value={action.value}
                                                        checked={selectedActions.includes(action.value)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedActions((prev) => [...prev, action.value]);
                                                            } else {
                                                                setSelectedActions((prev) =>
                                                                    prev.filter(
                                                                        (val) =>
                                                                            val.toLowerCase() !== action.value.toLowerCase()
                                                                    )
                                                                );
                                                            }
                                                        }}
                                                        className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                                    />
                                                    <span>{action.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedActions([])}
                                            className="mt-2 w-full text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 border border-gray-200 text-gray-700"
                                        >
                                            Clear All
                                        </button>
                                    </div>

                                    {/* Search */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Search by User
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiSearch className="text-gray-400" />
                                            </div>
                                            <input
                                                type="search"
                                                placeholder="Search users..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-gray-200 p-4">
                                <button
                                    onClick={() => {
                                        exportLogs();
                                        setMobileFiltersOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                >
                                    <FiDownload className="mr-2" />
                                    Export Logs
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop header */}
            <div className="hidden md:block p-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800">Audit Logs</h2>
                        <p className="text-sm text-gray-500">Track all system activities and actions</p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Group By Dropdown */}
                        <div className="flex justify-center items-center gap-3">
                            <label className="block text-xs text-gray-500 mb-1">Group By</label>
                            <select
                                className="border rounded-lg px-2 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm"
                                value={groupBy}
                                onChange={e => setGroupBy(e.target.value as "user" | "action")}
                            >
                                <option value="action">Action + Date</option>
                                <option value="user">User + Date</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm"
                        >
                            <FiFilter className="mr-2" />
                            Filters
                            {showFilters ? (
                                <FiChevronUp className="ml-2" />
                            ) : (
                                <FiChevronDown className="ml-2" />
                            )}
                        </button>

                        {/* Date Range Picker */}
                        <div className="flex items-center space-x-2">
                            <FiCalendar className="text-blue-500 hidden sm:block" />
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="date"
                                    value={selectedRange.start}
                                    min={minAllowedDate}
                                    max={selectedRange.end || maxAllowedDate}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSelectedRange(r => ({ ...r, start: val }));
                                    }}
                                    className="border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm"
                                />
                                <span className="mx-1 text-gray-400 hidden sm:flex items-center">to</span>
                                <input
                                    type="date"
                                    value={selectedRange.end}
                                    min={selectedRange.start || minAllowedDate}
                                    max={maxAllowedDate}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSelectedRange(r => ({ ...r, end: val }));
                                    }}
                                    className="border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm"
                                />
                            </div>
                        </div>

                        <button
                            onClick={exportLogs}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                            <FiDownload className="mr-2" />
                            Export
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Action Type Checkboxes */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Action Type
                                </label>
                                <div className="relative inline-block text-left" ref={actionDropdownRef}>
                                    <button
                                        type="button"
                                        className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm hover:border-blue-400 min-w-full"
                                        onClick={() => setActionDropdownOpen((open) => !open)}
                                    >
                                        <FiFilter className="mr-2" />
                                        {selectedActions.length === 0
                                            ? "Select Action(s)"
                                            : `${selectedActions.length} selected`}
                                        {actionDropdownOpen ? (
                                            <FiChevronUp className="ml-2" />
                                        ) : (
                                            <FiChevronDown className="ml-2" />
                                        )}
                                    </button>
                                    {actionDropdownOpen && (
                                        <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-20 p-3">
                                            <div className="max-h-60 overflow-y-auto space-y-1 w-full">
                                                {ALL_ACTIONS.map((action) => (
                                                    <label
                                                        key={action.value}
                                                        className="flex items-center gap-2 py-1 cursor-pointer text-sm"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            value={action.value}
                                                            checked={selectedActions.includes(action.value)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedActions((prev) => [...prev, action.value]);
                                                                } else {
                                                                    setSelectedActions((prev) =>
                                                                        prev.filter(
                                                                            (val) =>
                                                                                val.toLowerCase() !== action.value.toLowerCase()
                                                                        )
                                                                    );
                                                                }
                                                            }}
                                                            className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                                        />
                                                        <span>{action.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedActions([])}
                                                className="mt-3 w-full text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 border border-gray-200 text-gray-700"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Search By User */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Search by User
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FiSearch className="text-gray-400" />
                                    </div>
                                    <input
                                        type="search"
                                        placeholder="Search users..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {renderPagination()}

            <div className="divide-y divide-gray-200">
                {paginatedGroups.length > 0 ? (
                    groupBy === "action" ? (
                        // ==== GROUP BY ACTION ====
                        (paginatedGroups as LogGroupByActionDate[]).map((group) => {
                            const groupId = `${group.action}-${group.date}`;
                            const isExpanded = expandedGroups.includes(groupId);

                            return (
                                <div key={groupId} className="p-4 md:p-6">
                                    <button
                                        onClick={() => toggleGroupExpansion(groupId)}
                                        className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-2 rounded-lg"
                                    >
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                                {group.action.charAt(0)}
                                            </div>
                                            <div className="ml-3 md:ml-4">
                                                <h3 className="text-base md:text-lg font-medium text-gray-900">
                                                    {group.action}
                                                </h3>
                                                <div className="flex flex-col md:flex-row md:items-center text-xs md:text-sm text-gray-500 mt-1">
                                                    <div className="flex items-center">
                                                        <FiCalendar className="mr-1 hidden md:block" />
                                                        <span>{formatDisplayDate(group.date)}</span>
                                                    </div>
                                                    <span className="mx-2 hidden md:block">•</span>
                                                    <div className="flex items-center">
                                                        <FiClock className="mr-1 hidden md:block" />
                                                        <span>
                                                            {group.users.reduce((acc, u) => acc + u.logs.length, 0)} action
                                                            {group.users.reduce((acc, u) => acc + u.logs.length, 0) !== 1 ? "s" : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <FiChevronUp className="text-gray-500" />
                                        ) : (
                                            <FiChevronDown className="text-gray-500" />
                                        )}
                                    </button>
                                    {isExpanded && (
                                        <div className="mt-4 pl-0 md:pl-14">
                                            {group.users.map((userGroup) => (
                                                <div key={userGroup.name} className="mb-6">
                                                    <div className="font-semibold text-gray-700 mb-2 text-sm md:text-base">{userGroup.name}</div>
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                                                    <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                                                    <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                                                                    <th className="px-3 py-2 md:px-6 md:py-3 text-right text-xs font-medium text-gray-500 uppercase">Details</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {userGroup.logs.map((log) => (
                                                                    <tr key={log.id} className="hover:bg-gray-50">
                                                                        <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                                                                            <div className="flex items-center">
                                                                                <FiClock className="mr-1 text-gray-400 hidden md:block" />
                                                                                {formatTime(log.timestamp)}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                                                            <span
                                                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.action)}`}
                                                                            >
                                                                                {log.action}
                                                                            </span>
                                                                        </td>

                                                                        <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium">
                                                                            {log.cost > 0 ? `$${log.cost.toFixed(7)}` : "-"}
                                                                        </td>
                                                                        <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-right text-xs md:text-sm font-medium">
                                                                            <button
                                                                                onClick={() => setSelectedLog(log)}
                                                                                className="text-blue-600 hover:text-blue-900 flex items-center justify-end"
                                                                            >
                                                                                <FiEye className="mr-1" /> <span className="hidden sm:inline">View</span>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        // ==== GROUP BY USER ====
                        (paginatedGroups as UserDateFlatGroup[]).map((userDateGroup) => {
                            const groupId = `user-${userDateGroup.user}-${userDateGroup.date}`;
                            const isExpanded = expandedGroups.includes(groupId);

                            return (
                                <div key={groupId} className="p-4 md:p-6">
                                    <button
                                        onClick={() => toggleGroupExpansion(groupId)}
                                        className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-2 rounded-lg"
                                    >
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium">
                                                {userDateGroup.user.charAt(0)}
                                            </div>
                                            <div className="ml-3 md:ml-4">
                                                <h3 className="text-base md:text-lg font-medium text-gray-900">
                                                    {userDateGroup.user}
                                                </h3>
                                                <div className="flex flex-col md:flex-row md:items-center text-xs md:text-sm text-gray-500 mt-1">
                                                    <span>{formatDisplayDate(userDateGroup.date)}</span>
                                                    <span className="mx-2 hidden md:block">•</span>
                                                    <span>
                                                        {userDateGroup.logs.length} action{userDateGroup.logs.length !== 1 ? "s" : ""}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <FiChevronUp className="text-gray-500" />
                                        ) : (
                                            <FiChevronDown className="text-gray-500" />
                                        )}
                                    </button>
                                    {isExpanded && (
                                        <div className="mt-4 pl-0 md:pl-14">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                                            <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                                            <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                                                            <th className="px-3 py-2 md:px-6 md:py-3 text-right text-xs font-medium text-gray-500 uppercase">Details</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {userDateGroup.logs.map((log) => (
                                                            <tr key={log.id} className="hover:bg-gray-50">
                                                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                                                                    <div className="flex items-center">
                                                                        <FiClock className="mr-1 text-gray-400 hidden md:block" />
                                                                        {formatTime(log.timestamp)}
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                                                    <span
                                                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.action)}`}
                                                                    >
                                                                        {log.action}
                                                                    </span>
                                                                </td>

                                                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium">
                                                                    {log.cost > 0 ? `$${log.cost.toFixed(7)}` : "-"}
                                                                </td>
                                                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-right text-xs md:text-sm font-medium">
                                                                    <button
                                                                        onClick={() => setSelectedLog(log)}
                                                                        className="text-blue-600 hover:text-blue-900 flex items-center justify-end"
                                                                    >
                                                                        <FiEye className="mr-1" /> <span className="hidden sm:inline">View</span>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )
                ) : (
                    <div className="p-6 md:p-8 text-center text-gray-500">
                        No logs found matching your filter criteria.
                    </div>
                )}
            </div>

            {renderPagination()}
        </div>
    );
};

export default AuditLogs;