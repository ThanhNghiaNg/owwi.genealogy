import { ObjectId, Collection } from 'mongodb'
import { getDb } from '../db/mongodb'

export interface RelationshipDocument {
  _id: ObjectId
  userId: ObjectId
  localId: string
  type: 'parent' | 'spouse'
  person1Id: ObjectId
  person2Id: ObjectId
  localPerson1Id: string
  localPerson2Id: string
  orderIndex: number
}

export interface CreateRelationshipInput {
  userId: ObjectId
  localId: string
  type: 'parent' | 'spouse'
  person1Id: ObjectId
  person2Id: ObjectId
  localPerson1Id: string
  localPerson2Id: string
  orderIndex: number
}

async function getCollection(): Promise<Collection<RelationshipDocument>> {
  const db = await getDb()
  return db.collection<RelationshipDocument>('relationships')
}

export async function findByUserId(userId: ObjectId): Promise<RelationshipDocument[]> {
  const col = await getCollection()
  return col.find({ userId }).toArray()
}

export async function findById(id: string, userId: ObjectId): Promise<RelationshipDocument | null> {
  const col = await getCollection()
  if (!ObjectId.isValid(id)) return null
  return col.findOne({ _id: new ObjectId(id), userId })
}

export async function createRelationship(input: CreateRelationshipInput): Promise<RelationshipDocument> {
  const col = await getCollection()
  const doc: Omit<RelationshipDocument, '_id'> = {
    userId: input.userId,
    localId: input.localId,
    type: input.type,
    person1Id: input.person1Id,
    person2Id: input.person2Id,
    localPerson1Id: input.localPerson1Id,
    localPerson2Id: input.localPerson2Id,
    orderIndex: input.orderIndex,
  }
  const result = await col.insertOne(doc as RelationshipDocument)
  return { ...doc, _id: result.insertedId } as RelationshipDocument
}

export async function deleteRelationship(id: string, userId: ObjectId): Promise<boolean> {
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

export async function insertMany(relationships: CreateRelationshipInput[]): Promise<RelationshipDocument[]> {
  if (relationships.length === 0) return []
  const col = await getCollection()
  const docs = relationships.map((r) => ({
    userId: r.userId,
    localId: r.localId,
    type: r.type,
    person1Id: r.person1Id,
    person2Id: r.person2Id,
    localPerson1Id: r.localPerson1Id,
    localPerson2Id: r.localPerson2Id,
    orderIndex: r.orderIndex,
  })) as Omit<RelationshipDocument, '_id'>[]
  const result = await col.insertMany(docs as RelationshipDocument[])
  return docs.map((doc, i) => ({ ...doc, _id: result.insertedIds[i] })) as RelationshipDocument[]
}
