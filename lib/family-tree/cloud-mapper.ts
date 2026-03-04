import { ObjectId } from "mongodb";
import { z } from "zod";
import type { PersonDocument } from "@/server/repositories/person.repository";
import type { RelationshipDocument } from "@/server/repositories/relationship.repository";
import type { LocalDatabasePayload, LocalPerson, LocalRelationship } from "@/server/types/tree";
import { AppError } from "@/server/lib/errors";

const localPersonSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  gender: z.enum(["male", "female"]),
  birthYear: z.number().int().min(0).max(3000).nullable(),
  nickname: z.string().max(200).nullable(),
  phone: z.string().max(32).nullable(),
  address: z.string().max(300).nullable(),
  isDeceased: z.boolean(),
  createdAt: z.number().int().nonnegative(),
});

const localRelationshipSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["parent", "spouse"]),
  person1Id: z.string().min(1),
  person2Id: z.string().min(1),
  orderIndex: z.number().int().min(0),
});

export const localDatabaseSchema = z.object({
  persons: z.array(localPersonSchema),
  relationships: z.array(localRelationshipSchema),
});

function normalizeNullableString(value: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export function validateLocalDatabasePayload(input: unknown): LocalDatabasePayload {
  const parsed = localDatabaseSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_PAYLOAD", "Invalid family tree payload", parsed.error.flatten());
  }

  const personIds = new Set(parsed.data.persons.map((p) => p.id));
  for (const rel of parsed.data.relationships) {
    if (!personIds.has(rel.person1Id) || !personIds.has(rel.person2Id)) {
      throw new AppError(400, "INVALID_RELATIONSHIP", "Relationship references a missing person");
    }
  }

  return parsed.data;
}

export function toMongoSnapshot(userId: ObjectId, payload: LocalDatabasePayload): {
  persons: PersonDocument[];
  relationships: RelationshipDocument[];
} {
  const personIdMap = new Map<string, ObjectId>();

  const persons = payload.persons.map((person): PersonDocument => {
    const mongoId = new ObjectId();
    personIdMap.set(person.id, mongoId);

    return {
      _id: mongoId,
      userId,
      name: person.name.trim(),
      gender: person.gender,
      birthYear: person.birthYear ?? undefined,
      nickname: normalizeNullableString(person.nickname),
      phone: normalizeNullableString(person.phone),
      address: normalizeNullableString(person.address),
      isDeceased: person.isDeceased,
      createdAt: new Date(person.createdAt),
    };
  });

  const relationships = payload.relationships.map((rel): RelationshipDocument => {
    const person1Id = personIdMap.get(rel.person1Id);
    const person2Id = personIdMap.get(rel.person2Id);

    if (!person1Id || !person2Id) {
      throw new AppError(400, "INVALID_RELATIONSHIP", "Relationship references missing person mapping");
    }

    return {
      _id: new ObjectId(),
      userId,
      type: rel.type,
      person1Id,
      person2Id,
      orderIndex: rel.orderIndex,
    };
  });

  return { persons, relationships };
}

export function fromMongoSnapshot(
  persons: PersonDocument[],
  relationships: RelationshipDocument[]
): LocalDatabasePayload {
  const idMap = new Map<string, string>();

  const localPersons: LocalPerson[] = persons.map((person) => {
    const localId = person._id.toHexString();
    idMap.set(person._id.toHexString(), localId);

    return {
      id: localId,
      name: person.name,
      gender: person.gender,
      birthYear: person.birthYear ?? null,
      nickname: person.nickname ?? null,
      phone: person.phone ?? null,
      address: person.address ?? null,
      isDeceased: person.isDeceased ?? false,
      createdAt: person.createdAt.getTime(),
    };
  });

  const localRelationships: LocalRelationship[] = relationships.map((rel) => {
    const person1Id = idMap.get(rel.person1Id.toHexString());
    const person2Id = idMap.get(rel.person2Id.toHexString());

    if (!person1Id || !person2Id) {
      throw new AppError(500, "DATA_INTEGRITY_ERROR", "Relationship references unknown cloud person");
    }

    return {
      id: rel._id.toHexString(),
      type: rel.type,
      person1Id,
      person2Id,
      orderIndex: rel.orderIndex,
    };
  });

  return {
    persons: localPersons,
    relationships: localRelationships,
  };
}
