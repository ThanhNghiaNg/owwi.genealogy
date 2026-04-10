"use client";

import { useEffect, useState } from "react";
import { User, LogOut, TreeDeciduous } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { RegisterFlow } from "@/components/auth/register-flow";
import { initialFormState, type FormState } from "@/components/auth/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchCurrentSession, loginWithPassword, logoutCurrentSession, type AuthUser } from "@/lib/auth/client";

const FEATURES = [
  "Xây dựng & trực quan hóa cây phả hệ",
  "Lưu trữ dữ liệu gia đình an toàn",
  "Đồng bộ dữ liệu trên nhiều thiết bị",
  "Chia sẻ phả hệ với người thân",
];

export function AuthModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loginState, setLoginState] = useState<FormState>(initialFormState);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

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

  async function refreshSession() {
    const session = await fetchCurrentSession();
    setSessionUser(session?.user ?? null);
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
      setLoginState(initialFormState);
      setOpen(false);
    } catch (error) {
      setLoginState({
        loading: false,
        error: error instanceof Error ? error.message : "Đăng nhập không thành công.",
        success: null,
      });
    }
  }

  async function handleLogout() {
    try {
      await logoutCurrentSession();
      setSessionUser(null);
      setMode("login");
    } catch {
      // quiet
    }
  }

  if (sessionUser) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative size-10 rounded-full border bg-muted/50 p-0 hover:bg-muted">
            <User className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{sessionUser.name || "Người dùng"}</p>
              <p className="text-xs leading-none text-muted-foreground">{sessionUser.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 size-4" />
            <span>Đăng xuất</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="font-semibold shadow-sm">
          Đăng nhập
        </Button>
      </DialogTrigger>
      <DialogContent
        className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-[780px] sm:rounded-2xl"
        showCloseButton={true}
      >
        <div className="flex min-h-[480px] flex-col sm:flex-row">
          {/* ---- LEFT: branding panel ---- */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-8 text-white sm:flex sm:w-[320px]">
            {/* decorative circles */}
            <div className="pointer-events-none absolute -left-16 -top-16 size-64 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 size-56 rounded-full bg-white/5" />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <TreeDeciduous className="size-6" />
                </div>
                <span className="text-lg font-bold tracking-tight">Owwi Genealogy</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold leading-snug">
                  Lưu giữ lịch sử<br />gia đình bạn
                </h2>
                <p className="text-sm leading-relaxed text-emerald-200/80">
                  Xây dựng cây phả hệ trực quan và kết nối các thế hệ trong gia đình.
                </p>
              </div>
            </div>

            <div className="relative z-10">
              <ul className="space-y-3 text-sm">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/30 text-emerald-300">
                      ✓
                    </span>
                    <span className="text-emerald-100/90">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ---- RIGHT: form panel ---- */}
          <div className="flex flex-1 flex-col justify-center p-6 sm:p-10">
            {/* mobile-only mini header */}
            <div className="mb-6 flex items-center gap-2 sm:hidden">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <TreeDeciduous className="size-5" />
              </div>
              <span className="font-bold">Owwi Genealogy</span>
            </div>

            <div className="mb-6 space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">
                {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {mode === "login"
                  ? "Đăng nhập để quản lý cây phả hệ của bạn"
                  : "Đăng ký để bắt đầu lưu giữ lịch sử gia đình"}
              </p>
            </div>

            {mode === "login" ? (
              <LoginForm
                email={loginEmail}
                password={loginPassword}
                state={loginState}
                onEmailChange={setLoginEmail}
                onPasswordChange={setLoginPassword}
                onSubmit={handleLogin}
                onSwitchToRegister={() => {
                  setLoginState(initialFormState);
                  setMode("register");
                }}
              />
            ) : (
              <RegisterFlow
                defaultEmail={loginEmail}
                onSwitchToLogin={(prefillEmail) => {
                  if (prefillEmail) setLoginEmail(prefillEmail);
                  setMode("login");
                }}
                onRegisteredAndLoggedIn={async () => {
                  await refreshSession();
                  setOpen(false);
                }}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
