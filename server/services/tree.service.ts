import { ObjectId } from "mongodb";
import { AppError } from "@/server/lib/errors";
import { PersonRepository } from "@/server/repositories/person.repository";
import { RelationshipRepository } from "@/server/repositories/relationship.repository";
import type { LocalDatabasePayload } from "@/server/types/tree";
import {
  fromMongoSnapshot,
  toMongoSnapshot,
  validateLocalDatabasePayload,
} from "@/lib/family-tree/cloud-mapper";

export class TreeService {
  private readonly personRepository = new PersonRepository();
  private readonly relationshipRepository = new RelationshipRepository();

  async getTree(userId: string): Promise<LocalDatabasePayload> {
    const userObjectId = this.assertUserId(userId);

    const [persons, relationships] = await Promise.all([
      this.personRepository.findByUserId(userObjectId),
      this.relationshipRepository.findByUserId(userObjectId),
    ]);

    return fromMongoSnapshot(persons, relationships);
  }

  async replaceTree(userId: string, input: unknown): Promise<LocalDatabasePayload> {
    const userObjectId = this.assertUserId(userId);
    const payload = validateLocalDatabasePayload(input);
    const snapshot = toMongoSnapshot(userObjectId, payload);

    await this.relationshipRepository.deleteByUserId(userObjectId);
    await this.personRepository.deleteByUserId(userObjectId);
    await this.personRepository.insertMany(snapshot.persons);
    await this.relationshipRepository.insertMany(snapshot.relationships);

    return this.getTree(userObjectId.toHexString());
  }

  protected assertUserId(userId: string): ObjectId {
    if (!ObjectId.isValid(userId)) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid authenticated user");
    }
    return new ObjectId(userId);
  }
}
