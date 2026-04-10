"use client";

import { ArrowRight } from "lucide-react";

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
    <form className="space-y-5" onSubmit={onSubmit}>
      <AuthFeedback state={state} />

      <div className="space-y-4">
        <FormField label="Họ và tên (không bắt buộc)" htmlFor="register-name">
          <Input
            id="register-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Nguyễn Văn A"
            className="h-11"
          />
        </FormField>

        <FormField label="Email" htmlFor="register-email">
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="name@example.com"
            className="h-11"
            required
          />
        </FormField>

        <FormField label="Mật khẩu" htmlFor="register-password">
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            className="h-11"
            minLength={8}
            required
          />
        </FormField>
      </div>

      <Button className="h-11 w-full text-base font-semibold" type="submit" disabled={state.loading}>
        {state.loading ? "Đang gửi mã..." : "Tiếp tục"}
        <ArrowRight className="ml-2 size-4" />
      </Button>

      <div className="pt-2 text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <button
          type="button"
          className="font-semibold text-primary hover:underline underline-offset-4"
          onClick={onSwitchToLogin}
        >
          Đăng nhập
        </button>
      </div>
    </form>
  );
}
