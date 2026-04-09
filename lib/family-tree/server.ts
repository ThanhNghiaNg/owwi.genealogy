import { ObjectId, type Collection, type Db } from "mongodb";
import { z } from "zod";

import { getAuthenticatedUserFromRequest, getAuthDb, HttpError } from "@/lib/auth";
import {
  COLLECTIONS,
  createFamilyTreeDocument,
  type CollectionSchemaMap,
  type FamilyTreeDataSnapshot,
  type FamilyTreeDocument,
  type FamilyTreePersonSnapshot,
  type FamilyTreeRelationshipSnapshot,
} from "@/lib/db/schemas";

const DEFAULT_TREE_NAME = "My Family Tree";
const DEFAULT_TREE_DESCRIPTION = "Primary family tree";

const personSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  gender: z.enum(["male", "female"]),
  birthYear: z.number().int().nullable(),
  nickname: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  isDeceased: z.boolean(),
  createdAt: z.number().int(),
});

const relationshipSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["parent", "spouse"]),
  person1Id: z.string().min(1),
  person2Id: z.string().min(1),
  orderIndex: z.number().int(),
});

export const familyTreeSnapshotSchema = z.object({
  persons: z.array(personSchema),
  relationships: z.array(relationshipSchema),
});

const ensuredFamilyTreeIndexes = new WeakSet<Db>();

function getCollection(db: Db): Collection<CollectionSchemaMap["familyTrees"]> {
  return db.collection<CollectionSchemaMap["familyTrees"]>(COLLECTIONS.familyTrees);
}

export async function ensureFamilyTreeIndexes(db: Db): Promise<void> {
  if (ensuredFamilyTreeIndexes.has(db)) {
    return;
  }

  const collection = getCollection(db);
  await Promise.all([
    collection.createIndex({ userId: 1, updatedAt: -1 }, { name: "family_trees_user_updated_desc" }),
    collection.createIndex({ userId: 1, name: 1 }, { name: "family_trees_user_name_unique", unique: true }),
  ]);

  ensuredFamilyTreeIndexes.add(db);
}

export async function getFamilyTreeDb(): Promise<Db> {
  const db = await getAuthDb();
  await ensureFamilyTreeIndexes(db);
  return db;
}

function getRootPersonId(snapshot: FamilyTreeDataSnapshot): string | null {
  const childIds = new Set(
    snapshot.relationships.filter((rel) => rel.type === "parent").map((rel) => rel.person2Id),
  );

  return snapshot.persons.find((person) => !childIds.has(person.id))?.id ?? snapshot.persons[0]?.id ?? null;
}

function sanitizePerson(person: z.infer<typeof personSchema>): FamilyTreePersonSnapshot {
  return {
    id: person.id,
    name: person.name,
    gender: person.gender,
    birthYear: person.birthYear,
    nickname: person.nickname,
    phone: person.phone,
    address: person.address,
    isDeceased: person.isDeceased,
    createdAt: person.createdAt,
  };
}

function sanitizeRelationship(relationship: z.infer<typeof relationshipSchema>): FamilyTreeRelationshipSnapshot {
  return {
    id: relationship.id,
    type: relationship.type,
    person1Id: relationship.person1Id,
    person2Id: relationship.person2Id,
    orderIndex: relationship.orderIndex,
  };
}

export function normalizeFamilyTreeSnapshot(input: unknown): FamilyTreeDataSnapshot {
  const parsed = familyTreeSnapshotSchema.parse(input);

  return {
    persons: parsed.persons.map(sanitizePerson),
    relationships: parsed.relationships.map(sanitizeRelationship),
  };
}

export async function getPrimaryFamilyTree(userId: string): Promise<FamilyTreeDocument | null> {
  const db = await getFamilyTreeDb();
  const collection = getCollection(db);

  return collection.findOne({ userId: new ObjectId(userId), name: DEFAULT_TREE_NAME });
}

export async function upsertPrimaryFamilyTree(params: {
  userId: string;
  snapshot: FamilyTreeDataSnapshot;
}): Promise<FamilyTreeDocument> {
  if (!ObjectId.isValid(params.userId)) {
    throw new HttpError(401, "Authentication required");
  }

  const db = await getFamilyTreeDb();
  const collection = getCollection(db);
  const now = new Date();
  const userObjectId = new ObjectId(params.userId);
  const rootPersonId = getRootPersonId(params.snapshot);
  const existing = await collection.findOne({ userId: userObjectId, name: DEFAULT_TREE_NAME });

  if (!existing) {
    const document = createFamilyTreeDocument({
      userId: userObjectId,
      name: DEFAULT_TREE_NAME,
      description: DEFAULT_TREE_DESCRIPTION,
      data: params.snapshot,
      rootPersonId,
      now,
    });

    const result = await collection.insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  await collection.updateOne(
    { _id: existing._id },
    {
      $set: {
        data: params.snapshot,
        rootPersonId,
        updatedAt: now,
      },
    },
  );

  return {
    ...existing,
    data: params.snapshot,
    rootPersonId,
    updatedAt: now,
  };
}

export async function requireAuthenticatedUser(request: Request) {
  return getAuthenticatedUserFromRequest(request);
}

export function toFamilyTreeResponse(document: FamilyTreeDocument | null) {
  if (!document) {
    return null;
  }

  return {
    id: document._id?.toString() ?? null,
    name: document.name,
    description: document.description,
    data: document.data,
    rootPersonId: document.rootPersonId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
