import { NextRequest } from 'next/server'
import { withAuth } from '@/server/middleware/auth.middleware'
import {
  handleGetTree,
  handleCreatePerson,
  handleCreateRelationship,
} from '@/server/controllers/tree.controller'

// GET /api/tree → fetch full tree
export const GET = withAuth(handleGetTree)

// POST /api/tree?type=relationship → create relationship
// POST /api/tree → create person
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  const url = new URL(req.url)
  if (url.searchParams.get('type') === 'relationship') {
    return handleCreateRelationship(req, userId)
  }
  return handleCreatePerson(req, userId)
})
