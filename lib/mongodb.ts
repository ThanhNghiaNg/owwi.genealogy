import { MongoClient } from "mongodb";

type GlobalMongo = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoClientUri?: string;
};

const globalForMongo = globalThis as GlobalMongo;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  return uri;
}

function createClientPromise(): Promise<MongoClient> {
  const uri = getMongoUri();
  const client = new MongoClient(uri);

  return client.connect();
}

export async function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    const uri = getMongoUri();

    if (!globalForMongo._mongoClientPromise || globalForMongo._mongoClientUri !== uri) {
      globalForMongo._mongoClientPromise = createClientPromise();
      globalForMongo._mongoClientUri = uri;
    }

    return globalForMongo._mongoClientPromise;
  }

  return createClientPromise();
}

export async function pingMongo(): Promise<void> {
  const mongoClient = await getMongoClient();
  await mongoClient.db().command({ ping: 1 });
}
