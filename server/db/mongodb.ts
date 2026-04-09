import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is not set')

const DB_NAME = 'family_tree'

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  const client = new MongoClient(MONGODB_URI)
  clientPromise = client.connect()
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise
  return client.db(DB_NAME)
}

export async function ensureIndexes(): Promise<void> {
  const db = await getDb()
  await db.collection('users').createIndex({ email: 1 }, { unique: true })
  await db.collection('persons').createIndex({ userId: 1 })
  await db.collection('persons').createIndex({ userId: 1, createdAt: 1 })
  await db.collection('relationships').createIndex({ userId: 1 })
  await db.collection('relationships').createIndex({ person1Id: 1 })
  await db.collection('relationships').createIndex({ person2Id: 1 })
}

export default clientPromise
