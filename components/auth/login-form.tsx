"use client";

import { LogIn } from "lucide-react";

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
    <form className="space-y-4" onSubmit={onSubmit}>
      <AuthFeedback state={state} />

      <FormField label="Email" htmlFor="login-email">
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </FormField>

      <FormField label="Password" htmlFor="login-password">
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Your password"
          required
        />
      </FormField>

      <Button className="w-full" type="submit" disabled={state.loading}>
        <LogIn className="size-4" />
        {state.loading ? "Logging in..." : "Đăng nhập"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-4"
          onClick={onSwitchToRegister}
        >
          Đăng ký ngay
        </button>
      </p>
    </form>
  );
}
