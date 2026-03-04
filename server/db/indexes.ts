import type { Db } from "mongodb";

let indexesReady = false;

export async function ensureIndexes(db: Db): Promise<void> {
  if (indexesReady) {
    return;
  }

  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true, name: "uniq_users_email" }),
    db.collection("persons").createIndex({ userId: 1 }, { name: "idx_persons_userId" }),
    db.collection("relationships").createIndex({ userId: 1 }, { name: "idx_relationships_userId" }),
    db.collection("relationships").createIndex({ person1Id: 1 }, { name: "idx_relationships_person1Id" }),
    db.collection("relationships").createIndex({ person2Id: 1 }, { name: "idx_relationships_person2Id" }),
  ]);

  indexesReady = true;
}
