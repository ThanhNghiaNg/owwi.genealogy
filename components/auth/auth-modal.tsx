"use client";

import { useEffect, useState } from "react";
import { User, LogOut, Settings, TreeDeciduous } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { RegisterFlow } from "@/components/auth/register-flow";
import { initialFormState, type FormState } from "@/components/auth/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
      // quiet logout
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
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl bg-background">
        <div className="flex flex-col items-center pt-8 pb-4 bg-muted/30">
          <div className="size-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-inner mb-4">
            <TreeDeciduous className="size-7" />
          </div>
          <DialogHeader className="px-6 space-y-1">
            <DialogTitle className="text-2xl font-bold text-center">
              {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              {mode === "login"
                ? "Đăng nhập để quản lý cây phả hệ của bạn"
                : "Bắt đầu lưu giữ lịch sử gia đình ngay hôm nay"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 pt-2">
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
      </DialogContent>
    </Dialog>
  );
}
