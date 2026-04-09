import { withAuthAndParam } from '@/server/middleware/auth.middleware'
import {
  handleUpdatePerson,
  handleDeletePerson,
} from '@/server/controllers/tree.controller'

export const PUT = withAuthAndParam(handleUpdatePerson)
export const PATCH = withAuthAndParam(handleUpdatePerson)
export const DELETE = withAuthAndParam(handleDeletePerson)
