'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/auth.context'
import { ApiError } from '@/lib/api-client'

interface LoginModalProps {
  onClose: () => void
}

export function LoginModal({ onClose }: LoginModalProps) {
  const { requestOtp, verifyOtp } = useAuth()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [success, setSuccess] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const otpRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRef.current?.focus(), 50)
  }, [step])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleRequestOtp = useCallback(async () => {
    if (!email.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      await requestOtp(email.trim())
      setStep('otp')
      setResendCooldown(60)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể gửi OTP. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [email, loading, requestOtp])

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6 || loading) return
    setLoading(true)
    setError(null)
    try {
      await verifyOtp(email.trim(), otp.trim())
      setSuccess(true)
      setTimeout(onClose, 800)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xác thực thất bại.')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }, [otp, loading, verifyOtp, email, onClose])

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || loading) return
    setLoading(true)
    setError(null)
    try {
      await requestOtp(email.trim())
      setResendCooldown(60)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể gửi lại OTP.')
    } finally {
      setLoading(false)
    }
  }, [resendCooldown, loading, requestOtp, email])

  return (
    <div className="family-tree-dialog-overlay" onClick={onClose}>
      <div
        className="family-tree-dialog"
        style={{ minWidth: 360 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Đăng nhập"
      >
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <p style={{ color: 'var(--ft-text)', fontWeight: 600 }}>Đăng nhập thành công!</p>
          </div>
        ) : (
          <>
            <h3 className="family-tree-dialog-title">
              {step === 'email' ? 'Đăng nhập' : 'Nhập mã OTP'}
            </h3>

            {step === 'email' ? (
              <>
                <div className="family-tree-dialog-field">
                  <label htmlFor="login-email">Địa chỉ email</label>
                  <input
                    ref={emailRef}
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                    placeholder="ten@email.com"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
                {error && (
                  <p style={{ color: 'var(--ft-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>
                )}
                <div className="family-tree-dialog-actions">
                  <button className="btn-cancel" onClick={onClose} disabled={loading}>Hủy</button>
                  <button
                    className="btn-confirm"
                    onClick={handleRequestOtp}
                    disabled={!email.trim() || loading}
                  >
                    {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--ft-text-muted)', fontSize: 13, marginBottom: 16 }}>
                  Mã OTP đã được gửi đến <strong style={{ color: 'var(--ft-text)' }}>{email}</strong>.
                  Mã có hiệu lực trong 5 phút.
                </p>
                <div className="family-tree-dialog-field">
                  <label htmlFor="login-otp">Mã OTP (6 chữ số)</label>
                  <input
                    ref={otpRef}
                    id="login-otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    disabled={loading}
                    style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: 20 }}
                  />
                </div>
                {error && (
                  <p style={{ color: 'var(--ft-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>
                )}
                <div style={{ marginBottom: 12 }}>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: resendCooldown > 0 ? 'var(--ft-text-muted)' : 'var(--ft-accent)',
                      fontSize: 13,
                      cursor: resendCooldown > 0 ? 'default' : 'pointer',
                      padding: 0,
                    }}
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                  >
                    {resendCooldown > 0
                      ? `Gửi lại sau ${resendCooldown}s`
                      : 'Gửi lại mã OTP'}
                  </button>
                </div>
                <div className="family-tree-dialog-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => { setStep('email'); setOtp(''); setError(null) }}
                    disabled={loading}
                  >
                    Quay lại
                  </button>
                  <button
                    className="btn-confirm"
                    onClick={handleVerifyOtp}
                    disabled={otp.length !== 6 || loading}
                  >
                    {loading ? 'Đang xác thực...' : 'Xác nhận'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
