import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/server/db/mongodb";

export interface UserDocument {
  _id: ObjectId;
  email: string;
  otp?: string;
  otpExpiresAt?: Date;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  private async collection(): Promise<Collection<UserDocument>> {
    const db = await getDb();
    return db.collection<UserDocument>("users");
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const col = await this.collection();
    return col.findOne({ email });
  }

  async findById(userId: string): Promise<UserDocument | null> {
    const col = await this.collection();
    return col.findOne({ _id: new ObjectId(userId) });
  }

  async upsertOtp(email: string, otp: string, otpExpiresAt: Date): Promise<UserDocument> {
    const col = await this.collection();
    const now = new Date();

    await col.updateOne(
      { email },
      {
        $set: { email, otp, otpExpiresAt, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    const user = await col.findOne({ email });
    if (!user) {
      throw new Error("Failed to upsert user OTP");
    }
    return user;
  }

  async clearOtp(userId: ObjectId): Promise<void> {
    const col = await this.collection();
    await col.updateOne(
      { _id: userId },
      {
        $unset: { otp: "", otpExpiresAt: "" },
        $set: { updatedAt: new Date() },
      }
    );
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    const col = await this.collection();
    return col.findOne({ googleId });
  }

  async linkGoogleId(userId: string, googleId: string): Promise<void> {
    const col = await this.collection();
    await col.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          googleId,
          updatedAt: new Date(),
        },
      }
    );
  }
}
