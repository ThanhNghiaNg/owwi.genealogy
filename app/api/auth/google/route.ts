import { NextRequest } from 'next/server'
import { handleGoogleAuth } from '@/server/controllers/auth.controller'

// INSERT_GOOGLE_OAUTH: Endpoint nhận authorization code từ Google redirect
// Flow:
//   1. Nhận code từ query param hoặc body
//   2. Exchange lấy tokens qua googleapis
//   3. Verify ID token
//   4. handleGoogleAuth gọi authService.handleGoogleLogin(googleId, email)
//   5. Set httpOnly cookie

export async function GET(req: NextRequest) {
  return handleGoogleAuth(req)
}

export async function POST(req: NextRequest) {
  return handleGoogleAuth(req)
}
