import { NextRequest, NextResponse } from 'next/server'
import * as authService from '../services/auth.service'

export async function handleRequestOtp(req: NextRequest): Promise<NextResponse> {
  let body: { email?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }

  const { email } = body
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email là bắt buộc.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Địa chỉ email không hợp lệ.' }, { status: 400 })
  }

  try {
    await authService.requestOtp(email)
    return NextResponse.json({ message: 'OTP đã được gửi đến email của bạn.' })
  } catch (err) {
    console.error('[AUTH] requestOtp error:', err)
    return NextResponse.json({ error: 'Không thể gửi OTP. Vui lòng thử lại sau.' }, { status: 500 })
  }
}

export async function handleVerifyOtp(req: NextRequest): Promise<NextResponse> {
  let body: { email?: string; otp?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }

  const { email, otp } = body
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email là bắt buộc.' }, { status: 400 })
  }
  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
    return NextResponse.json({ error: 'OTP phải là 6 chữ số.' }, { status: 400 })
  }

  try {
    const { token, user } = await authService.verifyOtp(email, otp)
    const response = NextResponse.json({
      message: 'Đăng nhập thành công.',
      user: { id: user._id.toString(), email: user.email },
    })
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Xác thực thất bại.'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function handleLogout(_req: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json({ message: 'Đăng xuất thành công.' })
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}

// INSERT_GOOGLE_OAUTH: Implement exchange code → verify token → handleGoogleLogin
export async function handleGoogleAuth(_req: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Google OAuth chưa được cấu hình. Vui lòng cài đặt OAuth credentials.' },
    { status: 501 }
  )
}
