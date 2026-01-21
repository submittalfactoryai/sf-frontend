// src/components/UserManagement.tsx
import React, { useState, useEffect } from "react";
import { FiEdit2, FiTrash2, FiKey } from "react-icons/fi";
import ResetPasswordModal from "./ResetPasswordModal";

// -- User Interface --
export interface User {
    id: number;
    name: string;
    email: string;
    role: "admin" | "user";
    isActive: boolean;
    lastLogin: string;
    canSmartSearch: boolean;
    canSmartValidate: boolean;
}
interface UserManagementProps {
    users: User[];
    filteredUsers: User[];
    search: string;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    toggleActive: (id: number) => void;
    setEditUser: (user: User) => void;
    removeUser: (id: number) => void;
    loading?: boolean;
}
function formatLastLogin(dateStr: string) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const options: Intl.DateTimeFormatOptions = {
        year: "numeric", month: "long", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: true,
        timeZone: "UTC",
    };
    return date.toLocaleString("en-US", options).replace(",", " -");
}

// === Main Component ===
const UserManagement: React.FC<UserManagementProps> = ({
    users, filteredUsers, search, setSearch, toggleActive, setEditUser, removeUser, loading
}) => {
    const [resetUser, setResetUser] = useState<User | null>(null);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsSmallScreen(window.innerWidth < 1400);
        };

        // Initial check
        checkScreenSize();

        // Add event listener
        window.addEventListener('resize', checkScreenSize);

        // Clean up
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // These would be provided by your context/auth
    const API_URL = import.meta.env.VITE_API_BASE_URL;
    function getAuthToken() {
        try {
            const stored = localStorage.getItem('submittalFactory_auth');
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.token || null;
            }
        } catch { }
        return null;
    }

    const token = getAuthToken();

    const handleResetPassword = async (userId: number, newPassword: string) => {
        try {
            const res = await fetch(`${API_URL}/api/auth/user/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: userId, new_password: newPassword }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to reset password");
            }
            return true;
        } catch (err) {
            return false;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                                <circle cx="8" cy="8" r="7" />
                                <path d="M14 14l-2.5-2.5" />
                            </svg>
                        </div>
                        <input
                            type="search"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>
            <div className={`overflow-x-auto ${isSmallScreen ? 'responsive-table-container' : ''}`}>
                <table className={`min-w-full divide-y divide-gray-200 ${isSmallScreen ? 'w-max' : 'w-full'}`}>
                    <thead className="bg-gray-50">
                        <tr>
                            {["User", "Email", "Role", "Last Login", "Status"].map((hdr) => (
                                <th key={hdr} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {hdr}
                                </th>
                            ))}
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, idx) => (
                                <tr key={idx} className="animate-pulse">
                                    <td className="px-6 py-4 whitespace-nowrap flex items-center min-w-[200px]"><div className="h-10 w-10 rounded-full bg-gray-200" /><div className="ml-4"><div className="h-3 w-24 bg-gray-200 rounded" /></div></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm min-w-[200px]"><div className="h-3 w-32 bg-gray-200 rounded" /></td>
                                    <td className="px-6 py-4 whitespace-nowrap min-w-[100px]"><div className="h-4 w-16 bg-gray-200 rounded-full" /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm min-w-[200px]"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
                                    <td className="px-6 py-4 whitespace-nowrap min-w-[100px]"><div className="h-6 w-11 bg-gray-200 rounded-full" /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm min-w-[250px]"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                                </tr>
                            ))
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap flex items-center min-w-[200px]">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 min-w-[200px]">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 min-w-[200px]">
                                        {formatLastLogin(user.lastLogin)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                                        <button
                                            onClick={() => toggleActive(user.id)}
                                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${user.isActive ? "bg-blue-600" : "bg-gray-200"}`}
                                        >
                                            <span className={`inline-block w-4 h-4 transform transition rounded-full bg-white ${user.isActive ? "translate-x-6" : "translate-x-1"}`} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium min-w-[250px]">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <button
                                                onClick={() => setEditUser(user)}
                                                className="text-blue-600 hover:text-blue-900 flex items-center"
                                            >
                                                <FiEdit2 className="mr-1" /> Edit
                                            </button>
                                            <button
                                                onClick={() => setResetUser(user)}
                                                className="text-yellow-600 hover:text-yellow-900 flex items-center"
                                            >
                                                <FiKey className="mr-1" /> Reset
                                            </button>
                                            <button
                                                onClick={() => removeUser(user.id)}
                                                className="text-red-600 hover:text-red-900 flex items-center"
                                            >
                                                <FiTrash2 className="mr-1" /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {!loading && filteredUsers.length === 0 && (
                <div className="p-8 text-center text-gray-500">No users found matching your search criteria.</div>
            )}

            {/* Password Reset Modal */}
            {resetUser && (
                <ResetPasswordModal
                    isOpen={!!resetUser}
                    onClose={() => setResetUser(null)}
                    user={resetUser}
                    onReset={handleResetPassword}
                    onSuccess={() => {
                        setResetSuccess(true);
                        setTimeout(() => setResetSuccess(false), 2500);
                    }}
                />
            )}

            {/* Success Popup */}
            {resetSuccess && (
                <div className="fixed top-8 right-8 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg z-50">
                    Password reset successfully!
                    <button
                        onClick={() => setResetSuccess(false)}
                        className="ml-3 text-white font-bold hover:text-gray-200"
                    >✕</button>
                </div>
            )}
        </div>
    );
};

export default UserManagement;