import { NextRequest, NextResponse } from 'next/server'
import * as syncService from '../services/sync.service'

export async function handleSync(req: NextRequest, userId: string): Promise<NextResponse> {
  let body: { localData?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }

  if (!body.localData) {
    return NextResponse.json({ error: 'localData là bắt buộc.' }, { status: 400 })
  }

  try {
    const cloudData = await syncService.syncLocalToCloud(userId, body.localData)
    return NextResponse.json({ message: 'Đồng bộ dữ liệu thành công.', database: cloudData })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể đồng bộ dữ liệu.'
    console.error('[SYNC] error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function handleLoadCloud(_req: NextRequest, userId: string): Promise<NextResponse> {
  try {
    const cloudData = await syncService.loadCloudToLocal(userId)
    return NextResponse.json({ database: cloudData })
  } catch (err) {
    console.error('[SYNC] loadCloud error:', err)
    return NextResponse.json({ error: 'Không thể tải dữ liệu từ cloud.' }, { status: 500 })
  }
}
