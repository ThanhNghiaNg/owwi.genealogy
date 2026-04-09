import { NextRequest } from 'next/server'
import { handleVerifyOtp, handleLogout } from '@/server/controllers/auth.controller'

// POST /api/auth/verify-otp → verify OTP, set cookie
export async function POST(req: NextRequest) {
  return handleVerifyOtp(req)
}

// DELETE /api/auth/verify-otp → logout, clear cookie
export async function DELETE(req: NextRequest) {
  return handleLogout(req)
}
