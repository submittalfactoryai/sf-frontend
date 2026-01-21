// src/components/ResetPasswordModal.tsx
import React, { useState, useEffect } from "react";
import { FiEye, FiEyeOff, FiRefreshCcw, FiX, FiCheck, FiXCircle } from "react-icons/fi";

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: { id: number; name: string; email: string };
    onReset: (userId: number, newPassword: string) => Promise<boolean>;
    onSuccess: () => void;
}

function generateRandomPassword(length = 12) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let ret = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        ret += charset.charAt(Math.floor(Math.random() * n));
    }
    return ret;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
    isOpen,
    onClose,
    user,
    onReset,
    onSuccess,
}) => {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);

    useEffect(() => {
        if (confirm.length > 0 && password.length > 0) {
            setPasswordMatch(password === confirm);
        } else {
            setPasswordMatch(null);
        }
    }, [password, confirm]);

    if (!isOpen) return null;

    const handleGenerate = () => {
        const pass = generateRandomPassword();
        setPassword(pass);
        setConfirm(pass);
        setPasswordMatch(true);
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!password || password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        const ok = await onReset(user.id, password);
        setLoading(false);

        if (ok) {
            setPassword("");
            setConfirm("");
            onClose();
            onSuccess();
        } else {
            setError("Failed to reset password. Try again.");
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
                        <div className="text-sm text-gray-600 mt-1">
                            For <span className="font-medium">{user.name}</span> ({user.email})
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="flex justify-end mb-4">
                    <button
                        type="button"
                        onClick={handleGenerate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
                    >
                        <FiRefreshCcw size={16} />
                        Generate Strong Password
                    </button>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPass ? "text" : "password"}
                                value={password}
                                minLength={8}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                autoFocus
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(v => !v)}
                                tabIndex={-1}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                title={showPass ? "Hide password" : "Show password"}
                            >
                                {showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? "text" : "password"}
                                value={confirm}
                                minLength={8}
                                onChange={e => setConfirm(e.target.value)}
                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all pr-10
                                    ${passwordMatch === true ? 'border-green-500 focus:border-green-500' :
                                        passwordMatch === false ? 'border-red-500 focus:border-red-500' :
                                            'border-gray-300 focus:border-blue-500'}`}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(v => !v)}
                                tabIndex={-1}
                                className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                title={showConfirm ? "Hide password" : "Show password"}
                            >
                                {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>

                            {passwordMatch !== null && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    {passwordMatch ? (
                                        <FiCheck className="text-green-500" size={18} />
                                    ) : (
                                        <FiXCircle className="text-red-500" size={18} />
                                    )}
                                </div>
                            )}
                        </div>
                        {passwordMatch === false && confirm.length > 0 && (
                            <p className="mt-1 text-sm text-red-500">Passwords do not match</p>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2.5 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || passwordMatch === false}
                            className={`px-6 py-2.5 text-white rounded-lg font-medium transition-colors disabled:opacity-70 flex items-center justify-center min-w-[120px]
                                ${passwordMatch === false ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                "Reset Password"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordModal;