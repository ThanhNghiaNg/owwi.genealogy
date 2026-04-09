"use client";

import { KeyRound, RotateCcw } from "lucide-react";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { FormField } from "@/components/auth/form-field";
import type { FormState } from "@/components/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterOtpStep({
  email,
  otp,
  state,
  onOtpChange,
  onSubmit,
  onBack,
  onResend,
  resendLoading,
}: {
  email: string;
  otp: string;
  state: FormState;
  onOtpChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onResend: () => void;
  resendLoading: boolean;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <AuthFeedback state={state} />

      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Mã OTP đã được gửi tới <span className="font-medium text-foreground">{email}</span>.
        Nhập mã để hoàn tất đăng ký, sau đó hệ thống sẽ tự động đăng nhập cho bạn.
      </div>

      <FormField label="OTP code" htmlFor="register-otp-code">
        <Input
          id="register-otp-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          value={otp}
          onChange={(event) => onOtpChange(event.target.value)}
          placeholder="6-digit code"
          required
        />
      </FormField>

      <div className="flex gap-3">
        <Button className="flex-1" type="submit" disabled={state.loading}>
          <KeyRound className="size-4" />
          {state.loading ? "Verifying..." : "Xác minh & tạo tài khoản"}
        </Button>
        <Button type="button" variant="outline" onClick={onResend} disabled={resendLoading}>
          <RotateCcw className="size-4" />
          {resendLoading ? "Đang gửi..." : "Gửi lại mã"}
        </Button>
      </div>

      <div className="text-center">
        <button
          type="button"
          className="text-sm font-medium text-foreground underline underline-offset-4"
          onClick={onBack}
        >
          Quay lại để sửa thông tin
        </button>
      </div>
    </form>
  );
}
