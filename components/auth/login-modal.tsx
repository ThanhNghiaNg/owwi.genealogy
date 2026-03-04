"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { OtpForm } from "@/components/auth/otp-form";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { requestOtp, verifyOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleRequestOtp(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await requestOtp(email);
      setOtpStep(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request OTP");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="family-tree-dialog-overlay" onClick={onClose}>
      <div className="family-tree-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Login">
        <h3 className="family-tree-dialog-title">Sign in</h3>
        {!otpStep ? (
          <form onSubmit={handleRequestOtp}>
            <div className="family-tree-dialog-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="family-tree-dialog-actions">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn-confirm" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </form>
        ) : (
          <OtpForm
            email={email}
            onVerify={async (otp) => {
              await verifyOtp(email, otp);
            }}
            onBack={() => setOtpStep(false)}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
