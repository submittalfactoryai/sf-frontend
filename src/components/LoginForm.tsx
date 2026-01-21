import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';

interface LoginFormProps {
  // result: {success: boolean, inactive?: boolean}
  onLogin: (email: string, password: string) => Promise<{ success: boolean, inactive?: boolean }>;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInactivePopup, setShowInactivePopup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { success, inactive } = await onLogin(email, password);
    if (!success) {
      if (inactive) {
        setShowInactivePopup(true);
      } else {
        setError('Invalid credentials. Please try again.');
      }
      setPassword('');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Premium header bar */}
      <div className="bg-white border-b border-gray-200 py-3 px-6 flex justify-between items-center">
        <Logo className="h-8" />
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600">New to Submittal Factory?</span>
          <Link
            to="/register"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
          >
            Get Started
          </Link>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          {/* Modern form header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-6 px-8 text-center">
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-blue-100 mt-1">Sign in to your Submittal Factory account</p>
          </div>

          <div className="p-8">
            {/* Error message with modern styling */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start">
                <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email field */}
              <div className="space-y-1">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-100 text-gray-800 placeholder-gray-400 font-medium pl-10"
                    placeholder="Enter your email"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-100 text-gray-800 placeholder-gray-400 font-medium pl-10"
                    placeholder="Enter your password"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-blue-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3.5 font-semibold rounded-xl text-white transition transform hover:scale-[1.01] ${isLoading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg hover:shadow-xl'
                  } flex items-center justify-center`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 mr-2" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Popup for inactive account */}
      {showInactivePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-8 max-w-sm shadow-2xl text-center border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-red-600">Account Under Review</h2>
            <p className="mb-6 text-gray-800">
              Your account is under review.<br />Please wait until it is approved by the admin.
            </p>
            <button
              onClick={() => setShowInactivePopup(false)}
              className="px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
