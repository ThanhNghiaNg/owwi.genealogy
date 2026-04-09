import { ObjectId } from 'mongodb'
import * as personRepo from '../repositories/person.repository'
import * as relRepo from '../repositories/relationship.repository'
import type { PersonDocument } from '../repositories/person.repository'
import type { RelationshipDocument } from '../repositories/relationship.repository'

export interface ClientPerson {
  id: string
  localId: string
  name: string
  gender: 'male' | 'female'
  birthYear: number | null
  nickname: string | null
  phone: string | null
  address: string | null
  isDeceased: boolean
  createdAt: number
}

export interface ClientRelationship {
  id: string
  localId: string
  type: 'parent' | 'spouse'
  person1Id: string
  person2Id: string
  localPerson1Id: string
  localPerson2Id: string
  orderIndex: number
}

export interface ClientDatabase {
  persons: ClientPerson[]
  relationships: ClientRelationship[]
}

function toClientPerson(doc: PersonDocument): ClientPerson {
  return {
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
  }
}

function toClientRelationship(doc: RelationshipDocument): ClientRelationship {
  return {
    id: doc._id.toString(),
    localId: doc.localId,
    type: doc.type,
    person1Id: doc.person1Id.toString(),
    person2Id: doc.person2Id.toString(),
    localPerson1Id: doc.localPerson1Id,
    localPerson2Id: doc.localPerson2Id,
    orderIndex: doc.orderIndex,
  }
}

export async function getTree(userId: string): Promise<ClientDatabase> {
  const uid = new ObjectId(userId)
  const [persons, relationships] = await Promise.all([
    personRepo.findByUserId(uid),
    relRepo.findByUserId(uid),
  ])
  return {
    persons: persons.map(toClientPerson),
    relationships: relationships.map(toClientRelationship),
  }
}

export interface CreatePersonInput {
  name: string
  gender: 'male' | 'female'
  birthYear?: number | null
  nickname?: string | null
  phone?: string | null
  address?: string | null
  isDeceased?: boolean
  localId: string
}

export async function createPerson(userId: string, input: CreatePersonInput): Promise<ClientPerson> {
  const uid = new ObjectId(userId)
  const doc = await personRepo.createPerson({
    userId: uid,
    localId: input.localId,
    name: input.name,
    gender: input.gender,
    birthYear: input.birthYear ?? undefined,
    nickname: input.nickname ?? undefined,
    phone: input.phone ?? undefined,
    address: input.address ?? undefined,
    isDeceased: input.isDeceased ?? false,
  })
  return toClientPerson(doc)
}

export interface UpdatePersonInput {
  name?: string
  gender?: 'male' | 'female'
  birthYear?: number | null
  nickname?: string | null
  phone?: string | null
  address?: string | null
  isDeceased?: boolean
}

export async function updatePerson(
  userId: string,
  personId: string,
  input: UpdatePersonInput
): Promise<ClientPerson> {
  const uid = new ObjectId(userId)
  const updates: Partial<PersonDocument> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.gender !== undefined) updates.gender = input.gender
  if (input.birthYear !== undefined) updates.birthYear = input.birthYear ?? undefined
  if (input.nickname !== undefined) updates.nickname = input.nickname?.trim() ?? undefined
  if (input.phone !== undefined) updates.phone = input.phone?.trim() ?? undefined
  if (input.address !== undefined) updates.address = input.address?.trim() ?? undefined
  if (input.isDeceased !== undefined) updates.isDeceased = input.isDeceased

  const doc = await personRepo.updatePerson(personId, uid, updates)
  if (!doc) throw new Error('Person not found or access denied.')
  return toClientPerson(doc)
}

export async function deletePerson(userId: string, personId: string): Promise<void> {
  const uid = new ObjectId(userId)
  const deleted = await personRepo.deletePerson(personId, uid)
  if (!deleted) throw new Error('Person not found or access denied.')

  // Cascade: xóa relationships liên quan
  const rels = await relRepo.findByUserId(uid)
  const toDelete = rels.filter(
    (r) => r.person1Id.toString() === personId || r.person2Id.toString() === personId
  )
  for (const rel of toDelete) {
    await relRepo.deleteRelationship(rel._id.toString(), uid)
  }
}

export interface CreateRelationshipInput {
  type: 'parent' | 'spouse'
  person1Id: string
  person2Id: string
  orderIndex: number
  localId: string
  localPerson1Id: string
  localPerson2Id: string
}

export async function createRelationship(
  userId: string,
  input: CreateRelationshipInput
): Promise<ClientRelationship> {
  const uid = new ObjectId(userId)
  if (!ObjectId.isValid(input.person1Id) || !ObjectId.isValid(input.person2Id)) {
    throw new Error('Invalid person IDs.')
  }
  const doc = await relRepo.createRelationship({
    userId: uid,
    localId: input.localId,
    type: input.type,
    person1Id: new ObjectId(input.person1Id),
    person2Id: new ObjectId(input.person2Id),
    localPerson1Id: input.localPerson1Id,
    localPerson2Id: input.localPerson2Id,
    orderIndex: input.orderIndex,
  })
  return toClientRelationship(doc)
}

export async function deleteRelationship(userId: string, relationshipId: string): Promise<void> {
  const uid = new ObjectId(userId)
  const deleted = await relRepo.deleteRelationship(relationshipId, uid)
  if (!deleted) throw new Error('Relationship not found or access denied.')
}
