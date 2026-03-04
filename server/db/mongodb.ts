import { MongoClient, type Db } from "mongodb";
import { ensureIndexes } from "@/server/db/indexes";
import { env, requireEnvValue } from "@/server/lib/env";

let clientPromise: Promise<MongoClient> | null = null;
let dbPromise: Promise<Db> | null = null;

async function connectClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const uri = requireEnvValue("MONGODB_URI", env.MONGODB_URI);
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getMongoClient(): Promise<MongoClient> {
  return connectClient();
}

export async function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const client = await connectClient();
      const db = client.db();
      await ensureIndexes(db);
      return db;
    })();
  }
  return dbPromise;
}
