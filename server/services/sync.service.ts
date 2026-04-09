import { ObjectId } from 'mongodb'
import { getDb } from '../db/mongodb'
import * as personRepo from '../repositories/person.repository'
import * as relRepo from '../repositories/relationship.repository'
import type { ClientDatabase } from './tree.service'

export interface LocalPerson {
  id: string
  name: string
  gender: 'male' | 'female'
  birthYear: number | null
  nickname: string | null
  phone: string | null
  address: string | null
  isDeceased: boolean
  createdAt: number
}

export interface LocalRelationship {
  id: string
  type: 'parent' | 'spouse'
  person1Id: string
  person2Id: string
  orderIndex: number
}

export interface LocalDatabase {
  persons: LocalPerson[]
  relationships: LocalRelationship[]
}

function validateLocalDatabase(data: unknown): LocalDatabase {
  if (!data || typeof data !== 'object') throw new Error('Invalid sync payload: expected an object.')
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.persons)) throw new Error('Invalid sync payload: persons must be an array.')
  if (!Array.isArray(obj.relationships)) throw new Error('Invalid sync payload: relationships must be an array.')

  for (const p of obj.persons as LocalPerson[]) {
    if (!p.id || typeof p.id !== 'string') throw new Error('Person missing id.')
    if (!p.name || typeof p.name !== 'string') throw new Error('Person missing name.')
    if (p.gender !== 'male' && p.gender !== 'female') throw new Error('Person has invalid gender.')
  }
  for (const r of obj.relationships as LocalRelationship[]) {
    if (!r.id || typeof r.id !== 'string') throw new Error('Relationship missing id.')
    if (r.type !== 'parent' && r.type !== 'spouse') throw new Error('Relationship has invalid type.')
    if (!r.person1Id || !r.person2Id) throw new Error('Relationship missing person references.')
  }
  return obj as LocalDatabase
}

export async function syncLocalToCloud(userId: string, localData: unknown): Promise<ClientDatabase> {
  const validated = validateLocalDatabase(localData)
  const uid = new ObjectId(userId)
  const db = await getDb()
  const client = db.client
  const session = client.startSession()

  try {
    let result!: ClientDatabase

    await session.withTransaction(async () => {
      // Xóa toàn bộ data cũ
      await db.collection('persons').deleteMany({ userId: uid }, { session })
      await db.collection('relationships').deleteMany({ userId: uid }, { session })

      if (validated.persons.length === 0 && validated.relationships.length === 0) {
        result = { persons: [], relationships: [] }
        return
      }

      // Insert persons
      const personDocs = await personRepo.insertMany(
        validated.persons.map((p) => ({
          userId: uid,
          localId: p.id,
          name: p.name,
          gender: p.gender,
          birthYear: p.birthYear ?? undefined,
          nickname: p.nickname ?? undefined,
          phone: p.phone ?? undefined,
          address: p.address ?? undefined,
          isDeceased: p.isDeceased ?? false,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        }))
      )

      // Tạo map localId → ObjectId
      const localToCloudId = new Map<string, ObjectId>()
      for (const doc of personDocs) {
        localToCloudId.set(doc.localId, doc._id)
      }

      // Insert relationships với ObjectIds đã resolve
      const validRels = validated.relationships.filter(
        (r) => localToCloudId.has(r.person1Id) && localToCloudId.has(r.person2Id)
      )
      const relDocs = await relRepo.insertMany(
        validRels.map((r) => ({
          userId: uid,
          localId: r.id,
          type: r.type,
          person1Id: localToCloudId.get(r.person1Id)!,
          person2Id: localToCloudId.get(r.person2Id)!,
          localPerson1Id: r.person1Id,
          localPerson2Id: r.person2Id,
          orderIndex: r.orderIndex,
        }))
      )

      result = {
        persons: personDocs.map((doc) => ({
          id: doc._id.toString(),
          localId: doc.localId,
          name: doc.name,
          gender: doc.gender,
          birthYear: doc.birthYear ?? null,
          nickname: doc.nickname ?? null,
          phone: doc.phone ?? null,
          address: doc.address ?? null,
          isDeceased: doc.isDeceased,
          createdAt: doc.createdAt.getTime(),
        })),
        relationships: relDocs.map((doc) => ({
          id: doc._id.toString(),
          localId: doc.localId,
          type: doc.type,
          person1Id: doc.person1Id.toString(),
          person2Id: doc.person2Id.toString(),
          localPerson1Id: doc.localPerson1Id,
          localPerson2Id: doc.localPerson2Id,
          orderIndex: doc.orderIndex,
        })),
      }
    })

    return result
  } finally {
    await session.endSession()
  }
}

export async function loadCloudToLocal(userId: string): Promise<ClientDatabase> {
  const uid = new ObjectId(userId)
  const [persons, relationships] = await Promise.all([
    personRepo.findByUserId(uid),
    relRepo.findByUserId(uid),
  ])
  return {
    persons: persons.map((doc) => ({
      id: doc._id.toString(),
      localId: doc.localId,
      name: doc.name,
      gender: doc.gender,
      birthYear: doc.birthYear ?? null,
      nickname: doc.nickname ?? null,
      phone: doc.phone ?? null,
      address: doc.address ?? null,
      isDeceased: doc.isDeceased,
      createdAt: doc.createdAt.getTime(),
    })),
    relationships: relationships.map((doc) => ({
      id: doc._id.toString(),
      localId: doc.localId,
      type: doc.type,
      person1Id: doc.person1Id.toString(),
      person2Id: doc.person2Id.toString(),
      localPerson1Id: doc.localPerson1Id,
      localPerson2Id: doc.localPerson2Id,
      orderIndex: doc.orderIndex,
    })),
  }
}
