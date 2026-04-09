import { ObjectId, Collection } from 'mongodb'
import { getDb } from '../db/mongodb'

export interface PersonDocument {
  _id: ObjectId
  userId: ObjectId
  localId: string
  name: string
  gender: 'male' | 'female'
  birthYear?: number
  nickname?: string
  phone?: string
  address?: string
  isDeceased: boolean
  createdAt: Date
}

export interface CreatePersonInput {
  userId: ObjectId
  localId: string
  name: string
  gender: 'male' | 'female'
  birthYear?: number | null
  nickname?: string | null
  phone?: string | null
  address?: string | null
  isDeceased?: boolean
  createdAt?: Date
}

async function getCollection(): Promise<Collection<PersonDocument>> {
  const db = await getDb()
  return db.collection<PersonDocument>('persons')
}

export async function findByUserId(userId: ObjectId): Promise<PersonDocument[]> {
  const col = await getCollection()
  return col.find({ userId }).sort({ createdAt: 1 }).toArray()
}

export async function findById(id: string, userId: ObjectId): Promise<PersonDocument | null> {
  const col = await getCollection()
  if (!ObjectId.isValid(id)) return null
  return col.findOne({ _id: new ObjectId(id), userId })
}

export async function createPerson(input: CreatePersonInput): Promise<PersonDocument> {
  const col = await getCollection()
  const doc: Omit<PersonDocument, '_id'> = {
    userId: input.userId,
    localId: input.localId,
    name: input.name.trim(),
    gender: input.gender,
    isDeceased: input.isDeceased ?? false,
    createdAt: input.createdAt ?? new Date(),
    ...(input.birthYear != null ? { birthYear: input.birthYear } : {}),
    ...(input.nickname ? { nickname: input.nickname.trim() } : {}),
    ...(input.phone ? { phone: input.phone.trim() } : {}),
    ...(input.address ? { address: input.address.trim() } : {}),
  }
  const result = await col.insertOne(doc as PersonDocument)
  return { ...doc, _id: result.insertedId } as PersonDocument
}

export async function updatePerson(
  id: string,
  userId: ObjectId,
  updates: Partial<Omit<PersonDocument, '_id' | 'userId' | 'localId' | 'createdAt'>>
): Promise<PersonDocument | null> {
  const col = await getCollection()
  if (!ObjectId.isValid(id)) return null
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id), userId },
    { $set: updates },
    { returnDocument: 'after' }
  )
  return result as PersonDocument | null
}

export async function deletePerson(id: string, userId: ObjectId): Promise<boolean> {
  const col = await getCollection()
  if (!ObjectId.isValid(id)) return false
  const result = await col.deleteOne({ _id: new ObjectId(id), userId })
  return result.deletedCount > 0
}

export async function deleteAllByUserId(userId: ObjectId): Promise<number> {
  const col = await getCollection()
  const result = await col.deleteMany({ userId })
  return result.deletedCount
}

export async function insertMany(persons: CreatePersonInput[]): Promise<PersonDocument[]> {
  if (persons.length === 0) return []
  const col = await getCollection()
  const docs = persons.map((p) => ({
    userId: p.userId,
    localId: p.localId,
    name: p.name.trim(),
    gender: p.gender,
    isDeceased: p.isDeceased ?? false,
    createdAt: p.createdAt ?? new Date(),
    ...(p.birthYear != null ? { birthYear: p.birthYear } : {}),
    ...(p.nickname ? { nickname: p.nickname.trim() } : {}),
    ...(p.phone ? { phone: p.phone.trim() } : {}),
    ...(p.address ? { address: p.address.trim() } : {}),
  })) as Omit<PersonDocument, '_id'>[]
  const result = await col.insertMany(docs as PersonDocument[])
  return docs.map((doc, i) => ({ ...doc, _id: result.insertedIds[i] })) as PersonDocument[]
}
