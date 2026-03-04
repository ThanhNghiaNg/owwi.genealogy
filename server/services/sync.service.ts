import { MongoServerError, ObjectId } from "mongodb";
import { AppError } from "@/server/lib/errors";
import { getMongoClient } from "@/server/db/mongodb";
import { PersonRepository } from "@/server/repositories/person.repository";
import { RelationshipRepository } from "@/server/repositories/relationship.repository";
import {
  fromMongoSnapshot,
  toMongoSnapshot,
  validateLocalDatabasePayload,
} from "@/lib/family-tree/cloud-mapper";
import type { LocalDatabasePayload } from "@/server/types/tree";

function isTransactionUnsupported(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  if (msg.includes("replica set") || msg.includes("transaction numbers")) {
    return true;
  }
  return error instanceof MongoServerError && error.code === 20;
}

export class SyncService {
  private readonly personRepository = new PersonRepository();
  private readonly relationshipRepository = new RelationshipRepository();

  async syncFromLocal(userId: string, input: unknown): Promise<LocalDatabasePayload> {
    if (!ObjectId.isValid(userId)) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid authenticated user");
    }

    const userObjectId = new ObjectId(userId);
    const payload = validateLocalDatabasePayload(input);
    const snapshot = toMongoSnapshot(userObjectId, payload);

    const client = await getMongoClient();
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        await this.relationshipRepository.deleteByUserId(userObjectId, session);
        await this.personRepository.deleteByUserId(userObjectId, session);
        await this.personRepository.insertMany(snapshot.persons, session);
        await this.relationshipRepository.insertMany(snapshot.relationships, session);
      });
    } catch (error) {
      if (!isTransactionUnsupported(error)) {
        throw error;
      }

      await this.relationshipRepository.deleteByUserId(userObjectId);
      await this.personRepository.deleteByUserId(userObjectId);
      await this.personRepository.insertMany(snapshot.persons);
      await this.relationshipRepository.insertMany(snapshot.relationships);
    } finally {
      await session.endSession();
    }

    const [persons, relationships] = await Promise.all([
      this.personRepository.findByUserId(userObjectId),
      this.relationshipRepository.findByUserId(userObjectId),
    ]);

    return fromMongoSnapshot(persons, relationships);
  }
}
