import { NextRequest } from 'next/server'
import { handleRequestOtp } from '@/server/controllers/auth.controller'
import { ensureIndexes } from '@/server/db/mongodb'

let indexesCreated = false

export async function POST(req: NextRequest) {
  if (!indexesCreated) {
    await ensureIndexes()
    indexesCreated = true
  }
  return handleRequestOtp(req)
}
