import { withAuthAndParam } from '@/server/middleware/auth.middleware'
import { handleDeleteRelationship } from '@/server/controllers/tree.controller'

export const DELETE = withAuthAndParam(handleDeleteRelationship)
