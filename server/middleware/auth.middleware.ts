import { NextRequest, NextResponse } from 'next/server'
import * as authService from '../services/auth.service'

export function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const token =
      req.cookies.get('auth_token')?.value ??
      req.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Bạn cần đăng nhập để thực hiện thao tác này.' },
        { status: 401 }
      )
    }

    try {
      const payload = authService.verifyToken(token)
      return handler(req, payload.userId)
    } catch {
      return NextResponse.json(
        { error: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' },
        { status: 401 }
      )
    }
  }
}

export function withAuthAndParam(
  handler: (req: NextRequest, userId: string, param: string) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> => {
    const token =
      req.cookies.get('auth_token')?.value ??
      req.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Bạn cần đăng nhập để thực hiện thao tác này.' },
        { status: 401 }
      )
    }

    try {
      const payload = authService.verifyToken(token)
      const { id } = await context.params
      return handler(req, payload.userId, id)
    } catch {
      return NextResponse.json(
        { error: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' },
        { status: 401 }
      )
    }
  }
}
