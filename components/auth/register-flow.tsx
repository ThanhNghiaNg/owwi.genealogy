"use client";

import { useState } from "react";

import { RegisterDetailsStep } from "@/components/auth/register-details-step";
import { RegisterOtpStep } from "@/components/auth/register-otp-step";
import { initialFormState, type FormState } from "@/components/auth/types";
import { loginWithPassword, registerWithPassword, requestOtp, verifyOtpCode } from "@/lib/auth/client";

export function RegisterFlow({
  onRegisteredAndLoggedIn,
  onSwitchToLogin,
  defaultName = "",
  defaultEmail = "",
}: {
  onRegisteredAndLoggedIn: () => void;
  onSwitchToLogin: (prefillEmail?: string) => void;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [detailsState, setDetailsState] = useState<FormState>(initialFormState);
  const [otpState, setOtpState] = useState<FormState>(initialFormState);
  const [resendLoading, setResendLoading] = useState(false);

  async function sendSignupOtp(nextEmail: string) {
    await requestOtp({
      email: nextEmail.trim(),
      purpose: "sign-up",
    });
  }

  async function handleDetailsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDetailsState({ loading: true, error: null, success: null });

    try {
      await sendSignupOtp(email);
      setStep("otp");
      setDetailsState({
        loading: false,
        error: null,
        success: `OTP has been sent to ${email.trim()}.`,
      });
      setOtpState(initialFormState);
    } catch (error) {
      setDetailsState({
        loading: false,
        error: error instanceof Error ? error.message : "Unable to send OTP.",
        success: null,
      });
    }
  }

  async function handleVerifyAndRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOtpState({ loading: true, error: null, success: null });

    try {
      await verifyOtpCode({
        email: email.trim(),
        otp: otp.trim(),
        purpose: "sign-up",
      });

      await registerWithPassword({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });

      await loginWithPassword({
        email: email.trim(),
        password,
      });

      setOtpState({
        loading: false,
        error: null,
        success: `Account created and logged in as ${email.trim()}.`,
      });
      onRegisteredAndLoggedIn();
    } catch (error) {
      setOtpState({
        loading: false,
        error: error instanceof Error ? error.message : "Unable to complete registration.",
        success: null,
      });
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setOtpState((current) => ({ ...current, error: null, success: null }));

    try {
      await sendSignupOtp(email);
      setOtpState({
        loading: false,
        error: null,
        success: `A new OTP has been sent to ${email.trim()}.`,
      });
    } catch (error) {
      setOtpState({
        loading: false,
        error: error instanceof Error ? error.message : "Unable to resend OTP.",
        success: null,
      });
    } finally {
      setResendLoading(false);
    }
  }

  if (step === "otp") {
    return (
      <RegisterOtpStep
        email={email.trim()}
        otp={otp}
        state={otpState}
        onOtpChange={setOtp}
        onSubmit={handleVerifyAndRegister}
        onBack={() => setStep("details")}
        onResend={handleResend}
        resendLoading={resendLoading}
      />
    );
  }

  return (
    <RegisterDetailsStep
      name={name}
      email={email}
      password={password}
      state={detailsState}
      onNameChange={setName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleDetailsSubmit}
      onSwitchToLogin={() => onSwitchToLogin(email.trim())}
    />
  );
}
