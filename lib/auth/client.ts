export type OtpPurpose = "sign-in" | "sign-up" | "verify-email" | "reset-password" | "link-account";

export interface AuthApiError {
  ok: false;
  error: string;
  details?: unknown;
}

export interface AuthUser {
  id?: string | null;
  email: string;
  emailVerifiedAt?: string | Date | null;
  lastLoginAt?: string | Date | null;
  name?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface AuthSuccessResponse {
  ok: true;
  user?: AuthUser | null;
  userId?: string;
  message?: string;
  purpose?: OtpPurpose;
  expiresAt?: string | Date;
  verified?: boolean;
}

async function parseResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as AuthSuccessResponse | AuthApiError | null;

  if (!response.ok || !payload || payload.ok === false) {
    const message = payload && "error" in payload && payload.error ? payload.error : "Request failed";
    throw new Error(message);
  }

  return payload;
}

export async function registerWithPassword(input: { email: string; password: string; name?: string }) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseResponse(response);
}

export async function loginWithPassword(input: { email: string; password: string }) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseResponse(response);
}

export async function requestOtp(input: { email: string; purpose: OtpPurpose }) {
  const response = await fetch("/api/auth/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseResponse(response);
}

export async function verifyOtpCode(input: { email: string; otp: string; purpose: OtpPurpose }) {
  const response = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseResponse(response);
}

export async function fetchCurrentSession() {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as AuthSuccessResponse | null;
  if (!payload?.ok || !payload.user) {
    return null;
  }

  return payload;
}

export async function logoutCurrentSession() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  return parseResponse(response);
}
