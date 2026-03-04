import { ObjectId, type ClientSession, type Collection } from "mongodb";
import { getDb } from "@/server/db/mongodb";

export interface PersonDocument {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  gender: "male" | "female";
  birthYear?: number;
  nickname?: string;
  phone?: string;
  address?: string;
  isDeceased?: boolean;
  createdAt: Date;
}

export class PersonRepository {
  private async collection(): Promise<Collection<PersonDocument>> {
    const db = await getDb();
    return db.collection<PersonDocument>("persons");
  }

  async findByUserId(userId: ObjectId): Promise<PersonDocument[]> {
    const col = await this.collection();
    return col.find({ userId }).toArray();
  }

  async deleteByUserId(userId: ObjectId, session?: ClientSession): Promise<void> {
    const col = await this.collection();
    await col.deleteMany({ userId }, { session });
  }

  async insertMany(docs: PersonDocument[], session?: ClientSession): Promise<void> {
    if (docs.length === 0) return;
    const col = await this.collection();
    await col.insertMany(docs, { session });
  }
}
