"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Link2, LogIn, LogOut, Mail, ShieldCheck, UserPlus } from "lucide-react";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { FormField } from "@/components/auth/form-field";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterFlow } from "@/components/auth/register-flow";
import { initialFormState, type FormState } from "@/components/auth/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchCurrentSession,
  loginWithPassword,
  logoutCurrentSession,
  requestOtp,
  verifyOtpCode,
  type AuthUser,
  type OtpPurpose,
} from "@/lib/auth/client";

const otpPurposeOptions: { value: OtpPurpose; label: string; description: string }[] = [
  { value: "sign-in", label: "Sign in", description: "Complete a passwordless sign-in flow." },
  { value: "verify-email", label: "Verify email", description: "Confirm an email address for the current account." },
  { value: "reset-password", label: "Reset password", description: "Request a verification code for password recovery." },
  { value: "link-account", label: "Link account", description: "Reserved for future account linking and social auth expansion." },
];

export function AuthShell() {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "request-otp" | "verify-otp">("login");
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginState, setLoginState] = useState<FormState>(initialFormState);

  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose>("sign-in");
  const [requestOtpState, setRequestOtpState] = useState<FormState>(initialFormState);
  const [verifyOtpState, setVerifyOtpState] = useState<FormState>(initialFormState);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const session = await fetchCurrentSession();
      if (cancelled) return;
      setSessionUser(session?.user ?? null);
      setSessionLoading(false);
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPurpose = useMemo(
    () => otpPurposeOptions.find((option) => option.value === otpPurpose) ?? otpPurposeOptions[0],
    [otpPurpose],
  );

  async function refreshSession() {
    const session = await fetchCurrentSession();
    setSessionUser(session?.user ?? null);
    setSessionLoading(false);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginState({ loading: true, error: null, success: null });

    try {
      const response = await loginWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      setSessionUser(response.user ?? null);
      setLoginState({
        loading: false,
        error: null,
        success: `Logged in as ${response.user?.email ?? loginEmail.trim()}.`,
      });
    } catch (error) {
      setLoginState({
        loading: false,
        error: error instanceof Error ? error.message : "Unable to log in.",
        success: null,
      });
    }
  }

  async function handleLogout() {
    try {
      await logoutCurrentSession();
      setSessionUser(null);
      setLoginState(initialFormState);
      setVerifyOtpState(initialFormState);
      setRequestOtpState(initialFormState);
    } catch {
      // keep logout quiet in this minimal shell
    }
  }

  async function handleRequestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestOtpState({ loading: true, error: null, success: null });

    try {
      const response = await requestOtp({
        email: otpEmail.trim(),
        purpose: otpPurpose,
      });

      setRequestOtpState({
        loading: false,
        error: null,
        success: `OTP requested for ${otpEmail.trim()} (${response.purpose ?? otpPurpose}).`,
      });
      setActiveTab("verify-otp");
      setVerifyOtpState(initialFormState);
    } catch (error) {
      setRequestOtpState({
        loading: false,
        error: error instanceof Error ? error.message : "Unable to request OTP.",
        success: null,
      });
    }
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyOtpState({ loading: true, error: null, success: null });

    try {
      const response = await verifyOtpCode({
        email: otpEmail.trim(),
        otp: otpCode.trim(),
        purpose: otpPurpose,
      });

      if (otpPurpose === "sign-in") {
        await refreshSession();
      }

      setVerifyOtpState({
        loading: false,
        error: null,
        success:
          otpPurpose === "sign-in"
            ? `OTP verified and signed in as ${response.user?.email ?? otpEmail.trim()}.`
            : `OTP verified for ${otpEmail.trim()} (${otpPurpose}).`,
      });
    } catch (error) {
      setVerifyOtpState({
        loading: false,
        error: error instanceof Error ? error.message : "Unable to verify OTP.",
        success: null,
      });
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Button asChild variant="ghost" className="-ml-3 w-fit px-3 text-muted-foreground">
              <Link href="/">
                <ArrowLeft className="size-4" />
                Back to family tree
              </Link>
            </Button>
            <div>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Minimal auth UI wired to the existing backend APIs, with room for future account linking.
              </CardDescription>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <ShieldCheck className="size-4 text-emerald-600" />
            Current session
          </div>
          {sessionLoading ? (
            <p className="mt-2 text-muted-foreground">Checking session...</p>
          ) : sessionUser ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{sessionUser.email}</p>
                <p className="text-muted-foreground">
                  {sessionUser.name ? `${sessionUser.name} • ` : ""}
                  {sessionUser.emailVerifiedAt ? "Email verified" : "Email not verified yet"}
                </p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="size-4" />
                Logout
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">No active session.</p>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-4">
            <TabsTrigger value="login" className="border">Login</TabsTrigger>
            <TabsTrigger value="register" className="border">Register</TabsTrigger>
            <TabsTrigger value="request-otp" className="border">Request OTP</TabsTrigger>
            <TabsTrigger value="verify-otp" className="border">Verify OTP</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <div className="rounded-lg border p-4">
              <div className="mb-4 space-y-1">
                <h2 className="font-medium">Password login</h2>
                <p className="text-sm text-muted-foreground">Sign in with email and password via /api/auth/login.</p>
              </div>
              <LoginForm
                email={loginEmail}
                password={loginPassword}
                state={loginState}
                onEmailChange={(value) => {
                  setLoginEmail(value);
                  if (!otpEmail) setOtpEmail(value);
                }}
                onPasswordChange={setLoginPassword}
                onSubmit={handleLogin}
                onSwitchToRegister={() => setActiveTab("register")}
              />
            </div>
          </TabsContent>

          <TabsContent value="register">
            <div className="rounded-lg border p-4">
              <div className="mb-4 space-y-1">
                <h2 className="font-medium">Register with OTP confirmation</h2>
                <p className="text-sm text-muted-foreground">
                  Request a sign-up OTP, verify it, create the account, then sign in automatically.
                </p>
              </div>
              <RegisterFlow
                defaultEmail={loginEmail || otpEmail}
                onSwitchToLogin={(prefillEmail) => {
                  if (prefillEmail) {
                    setLoginEmail(prefillEmail);
                    setOtpEmail(prefillEmail);
                  }
                  setActiveTab("login");
                }}
                onRegisteredAndLoggedIn={async () => {
                  await refreshSession();
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="request-otp">
            <div className="rounded-lg border p-4">
              <div className="mb-4 space-y-1">
                <h2 className="font-medium">Request OTP</h2>
                <p className="text-sm text-muted-foreground">
                  Trigger /api/auth/request-otp for sign-in, verify-email, reset-password, or future link-account flows.
                </p>
              </div>
              <form className="space-y-4" onSubmit={handleRequestOtp}>
                <AuthFeedback state={requestOtpState} />

                <FormField label="Email" htmlFor="otp-email">
                  <Input
                    id="otp-email"
                    type="email"
                    autoComplete="email"
                    value={otpEmail}
                    onChange={(event) => setOtpEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </FormField>

                <FormField label="Purpose" htmlFor="otp-purpose">
                  <select
                    id="otp-purpose"
                    className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={otpPurpose}
                    onChange={(event) => setOtpPurpose(event.target.value as OtpPurpose)}
                  >
                    {otpPurposeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Link2 className="size-4" />
                    {selectedPurpose.label}
                  </div>
                  <p className="mt-1">{selectedPurpose.description}</p>
                </div>

                <Button className="w-full" type="submit" disabled={requestOtpState.loading}>
                  <Mail className="size-4" />
                  {requestOtpState.loading ? "Requesting OTP..." : "Request OTP"}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="verify-otp">
            <div className="rounded-lg border p-4">
              <div className="mb-4 space-y-1">
                <h2 className="font-medium">Verify OTP</h2>
                <p className="text-sm text-muted-foreground">
                  Complete OTP verification via /api/auth/verify-otp. Sign-in purpose will also establish a session.
                </p>
              </div>
              <form className="space-y-4" onSubmit={handleVerifyOtp}>
                <AuthFeedback state={verifyOtpState} />

                <FormField label="Email" htmlFor="verify-otp-email">
                  <Input
                    id="verify-otp-email"
                    type="email"
                    autoComplete="email"
                    value={otpEmail}
                    onChange={(event) => setOtpEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </FormField>

                <FormField label="Purpose" htmlFor="verify-otp-purpose">
                  <select
                    id="verify-otp-purpose"
                    className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={otpPurpose}
                    onChange={(event) => setOtpPurpose(event.target.value as OtpPurpose)}
                  >
                    {otpPurposeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="OTP code" htmlFor="verify-otp-code">
                  <Input
                    id="verify-otp-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    placeholder="6-digit code"
                    required
                  />
                </FormField>

                <Button className="w-full" type="submit" disabled={verifyOtpState.loading}>
                  <LogIn className="size-4" />
                  {verifyOtpState.loading ? "Verifying OTP..." : "Verify OTP"}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <UserPlus className="size-4" />
            Ready for expansion
          </div>
          <p className="mt-1">
            The OTP purpose model already includes <code className="rounded bg-muted px-1 py-0.5">link-account</code>, so this UI can grow into account linking or social auth later without changing the family tree flow.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
