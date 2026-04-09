"use client";

import { Mail } from "lucide-react";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { FormField } from "@/components/auth/form-field";
import type { FormState } from "@/components/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterDetailsStep({
  name,
  email,
  password,
  state,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSwitchToLogin,
}: {
  name: string;
  email: string;
  password: string;
  state: FormState;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSwitchToLogin: () => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <AuthFeedback state={state} />

      <FormField label="Name (optional)" htmlFor="register-name">
        <Input
          id="register-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Your name"
        />
      </FormField>

      <FormField label="Email" htmlFor="register-email">
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </FormField>

      <FormField label="Password" htmlFor="register-password">
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
      </FormField>

      <Button className="w-full" type="submit" disabled={state.loading}>
        <Mail className="size-4" />
        {state.loading ? "Sending OTP..." : "Tiếp tục"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-4"
          onClick={onSwitchToLogin}
        >
          Đăng nhập
        </button>
      </p>
    </form>
  );
}
