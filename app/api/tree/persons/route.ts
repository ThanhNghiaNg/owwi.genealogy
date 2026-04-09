import { NextRequest } from 'next/server'
import { withAuth } from '@/server/middleware/auth.middleware'
import { handleCreatePerson } from '@/server/controllers/tree.controller'

export const POST = withAuth(
  async (req: NextRequest, userId: string) => handleCreatePerson(req, userId)
)
