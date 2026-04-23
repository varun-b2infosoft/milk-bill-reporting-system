import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// API endpoint: use VITE_API_URL if available (for custom deployments),
// otherwise default to localhost:8080 for local dev
const API = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export type AuthStep = "login" | "otp" | "authenticated";

interface AuthState {
  step: AuthStep;
  phone: string;
  token: string | null;
  userId: number | null;
}

interface AuthContextValue extends AuthState {
  submitLogin: (phone: string, password: string) => Promise<void>;
  submitOtp: (otp: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "mbr_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<AuthStep>("login");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify stored token on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${stored}` } })
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setToken(stored);
          setUserId(data.userId);
          setPhone(data.phone);
          setStep("authenticated");
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      })
      .catch(() => {
        // If API is unreachable, don't clear the token — we may be offline
      });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const submitLogin = useCallback(async (ph: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: ph, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      setPhone(ph);
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitOtp = useCallback(
    async (otp: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, otp }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "OTP verification failed.");
          return;
        }
        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setUserId(data.user.userId);
        setStep("authenticated");
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [phone],
  );

  const resendOtp = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not resend OTP.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [phone]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUserId(null);
    setPhone("");
    setStep("login");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        step,
        phone,
        token,
        userId,
        submitLogin,
        submitOtp,
        resendOtp,
        logout,
        isLoading,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
