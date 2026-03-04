"use client";

import { useState } from "react";

interface OtpFormProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onBack: () => void;
  onClose: () => void;
}

export function OtpForm({ email, onVerify, onBack, onClose }: OtpFormProps) {
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onVerify(otp.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="family-tree-dialog-field">
        <label>Email</label>
        <input type="text" value={email} disabled />
      </div>
      <div className="family-tree-dialog-field">
        <label htmlFor="otp-code">OTP code</label>
        <input
          id="otp-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="family-tree-dialog-actions">
        <button type="button" className="btn-cancel" onClick={onBack} disabled={isSubmitting}>
          Back
        </button>
        <button type="submit" className="btn-confirm" disabled={isSubmitting}>
          {isSubmitting ? "Verifying..." : "Verify"}
        </button>
      </div>
    </form>
  );
}
