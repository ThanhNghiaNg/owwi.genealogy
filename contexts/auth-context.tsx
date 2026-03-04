"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient, ApiError, type AuthUserResponse } from "@/lib/api/client";

interface AuthContextValue {
  user: AuthUserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const result = await apiClient.me();
      setUser(result.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    let canceled = false;

    (async () => {
      try {
        const result = await apiClient.me();
        if (!canceled) {
          setUser(result.user);
        }
      } catch (error) {
        if (!canceled) {
          if (error instanceof ApiError && error.status === 401) {
            setUser(null);
          } else {
            console.error("Failed to hydrate auth session", error);
            setUser(null);
          }
        }
      } finally {
        if (!canceled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, []);

  const requestOtp = useCallback(async (email: string) => {
    await apiClient.requestOtp(email);
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    const result = await apiClient.verifyOtp(email, otp);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await apiClient.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      requestOtp,
      verifyOtp,
      logout,
      refreshSession,
    }),
    [user, isLoading, requestOtp, verifyOtp, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
