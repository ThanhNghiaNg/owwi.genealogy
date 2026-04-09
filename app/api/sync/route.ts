import { NextRequest } from 'next/server'
import { withAuth } from '@/server/middleware/auth.middleware'
import { handleSync, handleLoadCloud } from '@/server/controllers/sync.controller'

// POST /api/sync → upload local data to cloud (replaces existing)
export const POST = withAuth(
  async (req: NextRequest, userId: string) => handleSync(req, userId)
)

// GET /api/sync → download cloud data
export const GET = withAuth(
  async (req: NextRequest, userId: string) => handleLoadCloud(req, userId)
)
