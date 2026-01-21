/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { logFrontendAudit } from "./auditlog";

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
  api_call_limit: number;
  api_calls_remaining: number;
  is_expired: boolean;
  is_locked: boolean;
  valid_until: string | null;
  expiry_date?: string | null;
  days_remaining: number | null;
  display_message?: string;
  admin_contact_email: string;
}

export interface User {
  user_id: string;
  user_name: string;
  email: string;
  roles: string[];
  UserActive: boolean;
  canSmartSearch: boolean;
  canSmartValidate: boolean;
  subscription?: SubscriptionStatus;
}

interface AuthData {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; inactive?: boolean }>;
  logout: (redirect?: boolean) => void;
  loading: boolean;
  error: string | null;
  canSmartSearch: boolean;
  canSmartValidate: boolean;
  sessionExpired: boolean;
  handleSessionExpiredLogin: () => void;
  refreshSubscription: () => Promise<void>;
}

const AUTH_KEY = "submittalFactory_auth";
const API_URL = import.meta.env.VITE_API_BASE_URL as string;

const SESSION_STORAGE_KEYS = ["sf_selectedAction", "sf_selectedActionTime"];

const AUTHORIZE_POLL_MS = 30 * 60 * 1000; // 30 minutes
const LOCAL_EXPIRY_CHECK_MS = 2 * 60 * 1000; // 2 minutes
const SUBSCRIPTION_REFRESH_MS = 12 * 60 * 60 * 1000; // 12 hours
const DEFAULT_ACCESS_TOKEN_FALLBACK_MS = 72 * 60 * 60 * 1000; // 72 hours

axios.defaults.baseURL = API_URL;

type StoredAuth = {
  isAuthenticated: boolean;
  user: User;
  token: string;
  tokenExpMs: number;
};

const getStoredAuth = (): StoredAuth | null => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed: StoredAuth = JSON.parse(raw);
    if (
      parsed?.token &&
      typeof parsed.tokenExpMs === "number" &&
      parsed.tokenExpMs > Date.now()
    ) {
      return parsed;
    }
    localStorage.removeItem(AUTH_KEY);
    return null;
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
};

const decodeJwt = (token: string): Record<string, any> | null => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

const clearSessionStorage = () => {
  SESSION_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
};

const useAuth = (): AuthData => {
  const navigate = useNavigate();

  const initial = getStoredAuth();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!initial);
  const [user, setUser] = useState<User | null>(initial?.user ?? null);
  const [token, setToken] = useState<string | null>(initial?.token ?? null);
  const [tokenExpMs, setTokenExpMs] = useState<number>(
    initial?.tokenExpMs ?? 0
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // ✅ FIX 1: Use refs to track logout state and prevent race conditions
  const isRefreshingRef = useRef(false);
  const isLoggingOutRef = useRef(false); // NEW: Track logout in progress
  const mountedRef = useRef(true); // NEW: Track if component is mounted

  const persist = useCallback((next: StoredAuth | null) => {
    if (!next) {
      localStorage.removeItem(AUTH_KEY);
      return;
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(next));
  }, []);

  // ✅ FIX 2: Improved logout that sets flag BEFORE clearing state
  const logout = useCallback(
    (redirect: boolean = true) => {
      // Prevent multiple simultaneous logouts
      if (isLoggingOutRef.current) return;
      isLoggingOutRef.current = true;

      logFrontendAudit({
        action: "Logout",
        entityType: "User",
        entityId: user?.user_id ? String(user.user_id) : null,
        metadata: {
          email: user?.email,
          userName: user?.user_name,
          roles: user?.roles,
        },
      });

      // Clear axios header FIRST
      delete axios.defaults.headers.common["Authorization"];

      // Clear storage BEFORE state
      persist(null);
      clearSessionStorage();

      // Then clear state
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      setTokenExpMs(0);
      setError(null);
      setSessionExpired(false);

      // Reset logout flag after a short delay
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 100);

      if (redirect) navigate("/");
    },
    [navigate, persist, user]
  );

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // ✅ FIX 3: refreshSubscription checks logout flag
  const refreshSubscription = useCallback(async () => {
    // Guard against calling during logout or when not authenticated
    if (
      !token ||
      !isAuthenticated ||
      isRefreshingRef.current ||
      isLoggingOutRef.current
    ) {
      return;
    }

    try {
      isRefreshingRef.current = true;

      const { data } = await axios.get("/api/subscription/status");

      // Double-check we haven't logged out while waiting
      if (isLoggingOutRef.current || !mountedRef.current) {
        return;
      }

      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, subscription: data };

        const stored = getStoredAuth();
        if (stored && !isLoggingOutRef.current) {
          persist({
            ...stored,
            user: updated,
          });
        }

        return updated;
      });
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error("Failed to refresh subscription:", err);
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [token, isAuthenticated, persist]);

  // ✅ FIX 4: probeAuthorize checks logout flag and doesn't re-authenticate during logout
  const probeAuthorize = useCallback(async (): Promise<boolean> => {
    // Don't probe if logging out or no token
    if (!token || isLoggingOutRef.current) return false;

    try {
      const { data } = await axios.get("/api/auth/authorize", {
        withCredentials: false,
      });

      // Check again after await - might have logged out while waiting
      if (isLoggingOutRef.current || !mountedRef.current) {
        return false;
      }

      const normalizedUser: User = {
        user_id: String(data.user_id),
        user_name: data.user_name,
        email: data.email,
        roles: Array.isArray(data.roles) ? data.roles : [],
        UserActive: true,
        canSmartSearch: user?.canSmartSearch ?? false,
        canSmartValidate: user?.canSmartValidate ?? false,
        subscription: user?.subscription,
      };

      const expMs = Number(data.exp) * 1000;

      // Only update state if not logging out
      if (!isLoggingOutRef.current) {
        setIsAuthenticated(true);
        setUser((prev) => ({ ...normalizedUser, ...prev }));
        setToken(token);
        setTokenExpMs(expMs);

        persist({
          isAuthenticated: true,
          user: { ...normalizedUser, ...(user ?? {}) },
          token,
          tokenExpMs: expMs,
        });

        setSessionExpired(false);
      }

      return true;
    } catch {
      return false;
    }
  }, [persist, token, user]);

  // ✅ FIX 5: Axios interceptor checks logout flag
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use((config) => {
      return config;
    });

    const responseInterceptor = axios.interceptors.response.use(
      async (response) => {
        if (
          response.config.url?.includes("/api/extract") &&
          !isLoggingOutRef.current
        ) {
          setTimeout(() => {
            if (!isLoggingOutRef.current) {
              refreshSubscription();
            }
          }, 500);
        }
        return response;
      },
      async (err) => {
        if (err?.response?.status === 401) {
          const url = err?.config?.url || "";

          // Ignore 401 from subscription and login endpoints
          if (
            url.includes("/api/subscription/status") ||
            url.includes("/api/auth/login")
          ) {
            return Promise.reject(err);
          }

          // Don't trigger logout if already logging out
          if (isLoggingOutRef.current || isRefreshingRef.current) {
            return Promise.reject(err);
          }

          isRefreshingRef.current = true;
          setSessionExpired(true);
          logout(false);
          isRefreshingRef.current = false;
        }

        if (
          (err?.response?.status === 429 ||
            err?.response?.data?.detail?.includes("API call limit")) &&
          !isLoggingOutRef.current
        ) {
          setTimeout(() => {
            if (!isLoggingOutRef.current) {
              refreshSubscription();
            }
          }, 500);
        }

        return Promise.reject(err);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [logout, refreshSubscription]);

  // ✅ FIX 6: Boot effect with proper guards
  useEffect(() => {
    mountedRef.current = true;

    const boot = async () => {
      const stored = getStoredAuth();

      if (!stored) {
        // No stored auth - this is normal, don't call logout
        // Just ensure state is clean
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
        setTokenExpMs(0);
        return;
      }

      // Check if token is already expired
      if (stored.tokenExpMs && Date.now() >= stored.tokenExpMs) {
        console.log("Token already expired, clearing auth");
        persist(null);
        clearSessionStorage();
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
        setTokenExpMs(0);
        return;
      }

      setIsAuthenticated(true);
      setUser(stored.user);
      setToken(stored.token);
      setTokenExpMs(stored.tokenExpMs);

      axios.defaults.headers.common["Authorization"] = `Bearer ${stored.token}`;

      // Only validate if token is not brand new (more than 5 seconds old)
      const tokenAge =
        Date.now() - (stored.tokenExpMs - DEFAULT_ACCESS_TOKEN_FALLBACK_MS);
      if (tokenAge > 5000) {
        const ok = await probeAuthorize();
        if (!ok && !isLoggingOutRef.current && mountedRef.current) {
          // Probe failed - but don't logout immediately, token might still be valid
          // Just mark session as potentially expired
          console.warn("Probe authorize failed, but token may still be valid");
          // Only logout if we're certain the token is invalid (e.g., 401 received)
        }
      }

      // Refresh subscription if still mounted and not logging out
      if (mountedRef.current && !isLoggingOutRef.current) {
        await refreshSubscription();
      }
    };

    boot();

    return () => {
      mountedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ FIX 7: Local expiry check with logout guard
  useEffect(() => {
    const interval = setInterval(() => {
      if (tokenExpMs && Date.now() >= tokenExpMs && !isLoggingOutRef.current) {
        setSessionExpired(true);
        logout(false);
      }
    }, LOCAL_EXPIRY_CHECK_MS);
    return () => clearInterval(interval);
  }, [logout, tokenExpMs]);

  // ✅ FIX 8: Focus handler with proper guards
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const onFocus = async () => {
      // Check refs instead of state to avoid stale closures
      if (isLoggingOutRef.current) return;

      const stored = getStoredAuth();
      if (!stored?.token) return;

      if (stored.tokenExpMs && Date.now() >= stored.tokenExpMs) {
        setSessionExpired(true);
        logout(false);
        return;
      }

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (!isLoggingOutRef.current && mountedRef.current) {
          await probeAuthorize();
          await refreshSubscription();
        }
      }, 500);
    };

    const vis = () => {
      if (document.visibilityState === "visible") onFocus();
    };

    window.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", onFocus);

    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener("visibilitychange", vis);
      window.removeEventListener("focus", onFocus);
    };
  }, [logout, probeAuthorize, refreshSubscription]);

  // ✅ FIX 9: Authorize poll with guards
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const id = setInterval(() => {
      if (tokenExpMs && Date.now() < tokenExpMs && !isLoggingOutRef.current) {
        probeAuthorize();
      }
    }, AUTHORIZE_POLL_MS);

    return () => clearInterval(id);
  }, [isAuthenticated, token, tokenExpMs, probeAuthorize]);

  // ✅ FIX 10: Subscription refresh poll with guards
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const id = setInterval(() => {
      if (tokenExpMs && Date.now() < tokenExpMs && !isLoggingOutRef.current) {
        refreshSubscription();
      }
    }, SUBSCRIPTION_REFRESH_MS);

    return () => clearInterval(id);
  }, [isAuthenticated, token, tokenExpMs, refreshSubscription]);

  // ✅ FIX 11: Storage sync with logout guard
  useEffect(() => {
    const syncFromStorage = () => {
      // Don't sync if we're in the middle of logging out
      if (isLoggingOutRef.current) return;

      const auth = getStoredAuth();
      setIsAuthenticated(!!auth);
      setUser(auth?.user ?? null);
      setToken(auth?.token ?? null);
      setTokenExpMs(auth?.tokenExpMs ?? 0);
    };
    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; inactive?: boolean }> => {
      setLoading(true);
      setError(null);
      setSessionExpired(false);
      isLoggingOutRef.current = false; // Ensure we're not in logout state

      clearSessionStorage();

      try {
        const resp = await axios.post("/api/auth/login", { email, password });

        const {
          access_token,
          user_id,
          user_name,
          email: userEmail,
          roles,
          isActive,
          canSmartSearch,
          canSmartValidate,
          subscription,
        } = resp.data;

        const authUser: User = {
          user_id: String(user_id),
          user_name,
          email: userEmail,
          roles: Array.isArray(roles) ? roles : [],
          UserActive: !!isActive,
          canSmartSearch: !!canSmartSearch,
          canSmartValidate: !!canSmartValidate,
          subscription: subscription || null,
        };

        if (!authUser.UserActive) {
          return { success: false, inactive: true };
        }

        setToken(access_token);
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${access_token}`;

        let expMs: number | null = null;

        try {
          const { data } = await axios.get("/api/auth/authorize");
          expMs = Number(data.exp) * 1000;
        } catch {
          const payload = decodeJwt(access_token);
          if (payload?.exp) expMs = Number(payload.exp) * 1000;
        }

        if (!expMs) {
          expMs = Date.now() + DEFAULT_ACCESS_TOKEN_FALLBACK_MS;
        }

        setIsAuthenticated(true);
        setUser(authUser);
        setTokenExpMs(expMs);
        setSessionExpired(false);

        persist({
          isAuthenticated: true,
          user: authUser,
          token: access_token,
          tokenExpMs: expMs,
        });

        return { success: true };
      } catch (err: any) {
        let msg = "Login failed";
        let inactive = false;
        if (axios.isAxiosError(err)) {
          const detail = err.response?.data?.detail || "";
          if (detail === "User account is inactive") {
            inactive = true;
            msg = detail;
          } else {
            msg = detail || msg;
          }
        }
        setError(msg);
        return { success: false, inactive };
      } finally {
        setLoading(false);
      }
    },
    [persist]
  );

  const handleSessionExpiredLogin = useCallback(() => {
    setSessionExpired(false);
    logout(true);
  }, [logout]);

  return {
    isAuthenticated,
    user,
    token,
    login,
    logout,
    refreshSubscription,
    loading,
    error,
    sessionExpired,
    canSmartSearch: user?.canSmartSearch ?? false,
    canSmartValidate: user?.canSmartValidate ?? false,
    handleSessionExpiredLogin,
  };
};

export default useAuth;
