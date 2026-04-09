import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'
import * as userRepo from '../repositories/user.repository'
import type { UserDocument } from '../repositories/user.repository'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = '30d'
const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes

if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set')

function createTransport() {
  return nodemailer.createTransport({
    // host: process.env.SMTP_HOST!,
    // port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    // secure: parseInt(process.env.SMTP_PORT ?? '587', 10) === 465,
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  })
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function requestOtp(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  const user = await userRepo.upsertByEmail(normalizedEmail)
  const otp = generateOtp()
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS)
  await userRepo.setOtp(user._id, otp, otpExpiresAt)

  const transport = createTransport()
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: normalizedEmail,
    subject: 'Mã xác nhận đăng nhập - Phả hệ',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
        <h2 style="color:#1a2332;margin-bottom:8px;">Mã xác nhận đăng nhập</h2>
        <p style="color:#4b5563;margin-bottom:24px;">Sử dụng mã OTP bên dưới để đăng nhập vào ứng dụng <strong>Phả hệ</strong>. Mã có hiệu lực trong <strong>5 phút</strong>.</p>
        <div style="background:#1a2332;color:#fff;font-size:32px;font-weight:bold;letter-spacing:12px;text-align:center;padding:20px 32px;border-radius:8px;margin-bottom:24px;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:13px;">Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.</p>
      </div>
    `,
    text: `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.`,
  })
}

export async function verifyOtp(
  email: string,
  otp: string
): Promise<{ token: string; user: Pick<UserDocument, '_id' | 'email'> }> {
  const normalizedEmail = email.toLowerCase().trim()
  const user = await userRepo.findByEmail(normalizedEmail)

  if (!user) throw new Error('Email không tồn tại. Vui lòng yêu cầu OTP trước.')
  if (!user.otp || !user.otpExpiresAt) throw new Error('Không có OTP đang chờ. Vui lòng yêu cầu OTP mới.')
  if (new Date() > user.otpExpiresAt) {
    await userRepo.clearOtp(user._id)
    throw new Error('OTP đã hết hạn. Vui lòng yêu cầu OTP mới.')
  }
  if (user.otp !== otp.trim()) throw new Error('OTP không chính xác.')

  await userRepo.clearOtp(user._id)

  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

  return { token, user: { _id: user._id, email: user.email } }
}

export function verifyToken(token: string): { userId: string; email: string } {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
    return payload
  } catch {
    throw new Error('Token không hợp lệ hoặc đã hết hạn.')
  }
}

// INSERT_GOOGLE_OAUTH: Thay thế stub bằng OAuth2 flow thực tế
// Dùng `google-auth-library` hoặc `googleapis`:
//   1. Verify Google ID token bằng GoogleAuth client
//   2. Lấy googleId và email từ payload
//   3. Gọi handleGoogleLogin(googleId, email)
export async function handleGoogleLogin(
  googleId: string,
  email: string
): Promise<{ token: string; user: Pick<UserDocument, '_id' | 'email'> }> {
  const normalizedEmail = email.toLowerCase().trim()

  let user = await userRepo.findByGoogleId(googleId)
  if (!user) {
    user = await userRepo.findByEmail(normalizedEmail)
    if (user) {
      await userRepo.linkGoogleId(user._id, googleId)
    } else {
      user = await userRepo.upsertByEmail(normalizedEmail)
      await userRepo.linkGoogleId(user._id, googleId)
    }
  }

  const finalUser = await userRepo.findById(user._id.toString())
  if (!finalUser) throw new Error('Không thể tạo tài khoản người dùng.')

  const token = jwt.sign(
    { userId: finalUser._id.toString(), email: finalUser.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

  return { token, user: { _id: finalUser._id, email: finalUser.email } }
}
