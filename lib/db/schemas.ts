import type { IndexDescription, ObjectId } from "mongodb";

export const COLLECTIONS = {
  users: "users",
  accounts: "accounts",
  otps: "otps",
  familyTrees: "familyTrees",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export type AuthProvider = "credentials" | "google" | "facebook" | "github" | "apple";
export type OtpPurpose = "sign-in" | "sign-up" | "verify-email" | "reset-password" | "link-account";
export type AccountStatus = "active" | "revoked";

export interface UserMetadata {
  name?: string | null;
  avatarUrl?: string | null;
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  locale?: string | null;
  timezone?: string | null;
}

export interface UserDocument {
  _id?: ObjectId;
  email: string;
  emailNormalized: string;
  passwordHash: string | null;
  metadata: UserMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountDocument {
  _id?: ObjectId;
  userId: ObjectId;
  provider: AuthProvider;
  providerAccountId: string;
  email: string | null;
  status: AccountStatus;
  linkedAt: Date;
  updatedAt: Date;
}

export interface OtpDocument {
  _id?: ObjectId;
  userId?: ObjectId | null;
  email: string;
  emailNormalized: string;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface FamilyTreePersonSnapshot {
  id: string;
  name: string;
  gender: "male" | "female";
  birthYear: number | null;
  nickname: string | null;
  phone: string | null;
  address: string | null;
  isDeceased: boolean;
  createdAt: number;
}

export interface FamilyTreeRelationshipSnapshot {
  id: string;
  type: "parent" | "spouse";
  person1Id: string;
  person2Id: string;
  orderIndex: number;
}

export interface FamilyTreeDataSnapshot {
  persons: FamilyTreePersonSnapshot[];
  relationships: FamilyTreeRelationshipSnapshot[];
}

export interface FamilyTreeDocument {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  description: string | null;
  data: FamilyTreeDataSnapshot;
  rootPersonId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemaRelationDefinition {
  from: CollectionName;
  to: CollectionName;
  localField: string;
  foreignField: string;
  cardinality: "one-to-one" | "one-to-many" | "many-to-one";
  notes: string;
}

export const schemaRelations: SchemaRelationDefinition[] = [
  {
    from: COLLECTIONS.accounts,
    to: COLLECTIONS.users,
    localField: "userId",
    foreignField: "_id",
    cardinality: "many-to-one",
    notes: "Một user có thể có nhiều account để hỗ trợ account linking/social login trong tương lai.",
  },
  {
    from: COLLECTIONS.otps,
    to: COLLECTIONS.users,
    localField: "userId",
    foreignField: "_id",
    cardinality: "many-to-one",
    notes: "OTP có thể gắn với user đã tồn tại hoặc chỉ gắn email ở giai đoạn pre-registration.",
  },
  {
    from: COLLECTIONS.familyTrees,
    to: COLLECTIONS.users,
    localField: "userId",
    foreignField: "_id",
    cardinality: "many-to-one",
    notes: "Mỗi family tree thuộc sở hữu của đúng một user; một user có thể có nhiều cây.",
  },
] as const;

export const schemaIndexes: Record<CollectionName, IndexDescription[]> = {
  [COLLECTIONS.users]: [
    {
      key: { emailNormalized: 1 },
      name: "users_email_normalized_unique",
      unique: true,
    },
    {
      key: { createdAt: -1 },
      name: "users_created_at_desc",
    },
  ],
  [COLLECTIONS.accounts]: [
    {
      key: { userId: 1, provider: 1 },
      name: "accounts_user_provider_idx",
    },
    {
      key: { provider: 1, providerAccountId: 1 },
      name: "accounts_provider_account_unique",
      unique: true,
    },
  ],
  [COLLECTIONS.otps]: [
    {
      key: { emailNormalized: 1, purpose: 1, createdAt: -1 },
      name: "otps_email_purpose_created_desc",
    },
    {
      key: { expiresAt: 1 },
      name: "otps_expires_at_ttl",
      expireAfterSeconds: 0,
    },
    {
      key: { userId: 1, purpose: 1, createdAt: -1 },
      name: "otps_user_purpose_created_desc",
      partialFilterExpression: { userId: { $exists: true } },
    },
  ],
  [COLLECTIONS.familyTrees]: [
    {
      key: { userId: 1, updatedAt: -1 },
      name: "family_trees_user_updated_desc",
    },
    {
      key: { userId: 1, name: 1 },
      name: "family_trees_user_name_unique",
      unique: true,
    },
  ],
};

export interface CollectionSchemaMap {
  users: UserDocument;
  accounts: AccountDocument;
  otps: OtpDocument;
  familyTrees: FamilyTreeDocument;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createUserDocument(input: {
  email: string;
  passwordHash: string | null;
  metadata?: UserMetadata;
  now?: Date;
}): UserDocument {
  const now = input.now ?? new Date();

  return {
    email: input.email,
    emailNormalized: normalizeEmail(input.email),
    passwordHash: input.passwordHash,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
}

export function createAccountDocument(input: {
  userId: ObjectId;
  provider: AuthProvider;
  providerAccountId: string;
  email?: string | null;
  status?: AccountStatus;
  now?: Date;
}): AccountDocument {
  const now = input.now ?? new Date();

  return {
    userId: input.userId,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    email: input.email ?? null,
    status: input.status ?? "active",
    linkedAt: now,
    updatedAt: now,
  };
}

export function createOtpDocument(input: {
  email: string;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  userId?: ObjectId | null;
  now?: Date;
}): OtpDocument {
  const now = input.now ?? new Date();

  return {
    userId: input.userId ?? null,
    email: input.email,
    emailNormalized: normalizeEmail(input.email),
    codeHash: input.codeHash,
    purpose: input.purpose,
    expiresAt: input.expiresAt,
    consumedAt: null,
    createdAt: now,
  };
}

export function createFamilyTreeDocument(input: {
  userId: ObjectId;
  name: string;
  description?: string | null;
  data?: FamilyTreeDataSnapshot;
  rootPersonId?: string | null;
  now?: Date;
}): FamilyTreeDocument {
  const now = input.now ?? new Date();

  return {
    userId: input.userId,
    name: input.name,
    description: input.description ?? null,
    data: input.data ?? { persons: [], relationships: [] },
    rootPersonId: input.rootPersonId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
