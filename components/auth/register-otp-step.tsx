"use client";

import { ShieldCheck, RotateCcw } from "lucide-react";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import type { FormState } from "@/components/auth/types";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

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
    <form className="space-y-6" onSubmit={onSubmit}>
      <AuthFeedback state={state} />

      <div className="space-y-2 text-center text-sm">
        <p className="text-muted-foreground">
          Mã xác thực đã được gửi đến email:
        </p>
        <p className="font-semibold text-foreground">{email}</p>
      </div>

      <div className="flex justify-center py-2">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={onOtpChange}
          autoFocus
        >
          <InputOTPGroup className="gap-2">
            <InputOTPSlot index={0} className="size-12 text-lg" />
            <InputOTPSlot index={1} className="size-12 text-lg" />
            <InputOTPSlot index={2} className="size-12 text-lg" />
            <InputOTPSlot index={3} className="size-12 text-lg" />
            <InputOTPSlot index={4} className="size-12 text-lg" />
            <InputOTPSlot index={5} className="size-12 text-lg" />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="space-y-3">
        <Button className="h-11 w-full text-base font-semibold" type="submit" disabled={state.loading || otp.length < 6}>
          <ShieldCheck className="mr-2 size-4" />
          {state.loading ? "Đang xác minh..." : "Xác minh & Đăng ký"}
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          className="w-full text-sm"
          onClick={onResend}
          disabled={resendLoading}
        >
          <RotateCcw className="mr-2 size-4" />
          {resendLoading ? "Đang gửi lại..." : "Gửi lại mã mới"}
        </Button>
      </div>

      <div className="text-center">
        <button
          type="button"
          className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4"
          onClick={onBack}
        >
          Quay lại sửa thông tin
        </button>
      </div>
    </form>
  );
}
