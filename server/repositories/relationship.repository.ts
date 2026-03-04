import { ObjectId, type ClientSession, type Collection } from "mongodb";
import { getDb } from "@/server/db/mongodb";

export interface RelationshipDocument {
  _id: ObjectId;
  userId: ObjectId;
  type: "parent" | "spouse";
  person1Id: ObjectId;
  person2Id: ObjectId;
  orderIndex: number;
}

export class RelationshipRepository {
  private async collection(): Promise<Collection<RelationshipDocument>> {
    const db = await getDb();
    return db.collection<RelationshipDocument>("relationships");
  }

  async findByUserId(userId: ObjectId): Promise<RelationshipDocument[]> {
    const col = await this.collection();
    return col.find({ userId }).toArray();
  }

  async deleteByUserId(userId: ObjectId, session?: ClientSession): Promise<void> {
    const col = await this.collection();
    await col.deleteMany({ userId }, { session });
  }

  async insertMany(docs: RelationshipDocument[], session?: ClientSession): Promise<void> {
    if (docs.length === 0) return;
    const col = await this.collection();
    await col.insertMany(docs, { session });
  }
}
