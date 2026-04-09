"use client";

import { LogIn, ArrowRight } from "lucide-react";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { FormField } from "@/components/auth/form-field";
import type { FormState } from "@/components/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({
  email,
  password,
  state,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSwitchToRegister,
}: {
  email: string;
  password: string;
  state: FormState;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSwitchToRegister: () => void;
}) {
  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <AuthFeedback state={state} />

      <div className="space-y-4">
        <FormField label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="name@example.com"
            className="h-11"
            required
          />
        </FormField>

        <FormField label="Mật khẩu" htmlFor="login-password">
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="••••••••"
            className="h-11"
            required
          />
        </FormField>
      </div>

      <Button className="h-11 w-full text-base font-semibold" type="submit" disabled={state.loading}>
        {state.loading ? "Đang xử lý..." : "Đăng nhập"}
        <LogIn className="ml-2 size-4" />
      </Button>

      <div className="pt-2 text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <button
          type="button"
          className="font-semibold text-primary hover:underline underline-offset-4"
          onClick={onSwitchToRegister}
        >
          Đăng ký ngay
        </button>
      </div>
    </form>
  );
}
