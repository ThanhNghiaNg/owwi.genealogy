import { ObjectId, Collection } from 'mongodb'
import { getDb } from '../db/mongodb'

export interface UserDocument {
  _id: ObjectId
  email: string
  otp?: string
  otpExpiresAt?: Date
  googleId?: string
  createdAt: Date
  updatedAt: Date
}

async function getCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb()
  return db.collection<UserDocument>('users')
}

export async function findByEmail(email: string): Promise<UserDocument | null> {
  const col = await getCollection()
  return col.findOne({ email: email.toLowerCase().trim() })
}

export async function findById(id: string): Promise<UserDocument | null> {
  const col = await getCollection()
  if (!ObjectId.isValid(id)) return null
  return col.findOne({ _id: new ObjectId(id) })
}

export async function findByGoogleId(googleId: string): Promise<UserDocument | null> {
  const col = await getCollection()
  return col.findOne({ googleId })
}

export async function upsertByEmail(email: string): Promise<UserDocument> {
  const col = await getCollection()
  const normalizedEmail = email.toLowerCase().trim()
  const now = new Date()
  const result = await col.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $setOnInsert: { email: normalizedEmail, createdAt: now },
      $set: { updatedAt: now },
    },
    { upsert: true, returnDocument: 'after' }
  )
  return result as UserDocument
}

export async function setOtp(userId: ObjectId, otp: string, otpExpiresAt: Date): Promise<void> {
  const col = await getCollection()
  await col.updateOne(
    { _id: userId },
    { $set: { otp, otpExpiresAt, updatedAt: new Date() } }
  )
}

export async function clearOtp(userId: ObjectId): Promise<void> {
  const col = await getCollection()
  await col.updateOne(
    { _id: userId },
    { $unset: { otp: '', otpExpiresAt: '' }, $set: { updatedAt: new Date() } }
  )
}

export async function linkGoogleId(userId: ObjectId, googleId: string): Promise<void> {
  const col = await getCollection()
  await col.updateOne(
    { _id: userId },
    { $set: { googleId, updatedAt: new Date() } }
  )
}
