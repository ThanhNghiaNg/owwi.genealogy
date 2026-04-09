import { randomInt, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

import { type Collection, type Db, MongoServerError, ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import { z } from "zod";

import {
  COLLECTIONS,
  createOtpDocument,
  createUserDocument,
  normalizeEmail,
  schemaIndexes,
  type CollectionSchemaMap,
  type OtpPurpose,
  type UserDocument,
} from "@/lib/db/schemas";
import { getSessionTokenFromCookieHeader, verifySessionToken } from "@/lib/auth/session";
import { getMongoClient } from "@/lib/mongodb";

const scrypt = promisify(scryptCallback);
const OTP_TTL_MINUTES = 10;
const OTP_DIGITS = 6;

const ensuredCollections = new WeakSet<Db>();

interface AuthenticatedRequestContext {
  userId: string;
  user: ReturnType<typeof sanitizeUser>;
}

export const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export const requestOtpSchema = z.object({
  email: z.string().trim().email(),
  purpose: z
    .enum(["sign-in", "sign-up", "verify-email", "reset-password", "link-account"])
    .optional()
    .default("verify-email"),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
  purpose: z
    .enum(["sign-in", "sign-up", "verify-email", "reset-password", "link-account"])
    .optional()
    .default("verify-email"),
});

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function getAuthDb(): Promise<Db> {
  const client = await getMongoClient();
  const db = client.db();
  await ensureAuthIndexes(db);
  return db;
}

async function ensureAuthIndexes(db: Db): Promise<void> {
  if (ensuredCollections.has(db)) {
    return;
  }

  await Promise.all([
    createIndexes(db.collection(COLLECTIONS.users), schemaIndexes.users),
    createIndexes(db.collection(COLLECTIONS.otps), schemaIndexes.otps),
  ]);

  ensuredCollections.add(db);
}

async function createIndexes<TSchema>(collection: Collection<TSchema>, indexes: (typeof schemaIndexes)[keyof typeof schemaIndexes]) {
  await Promise.all(indexes.map((index) => collection.createIndex(index.key, index)));
}

export function getCollection<K extends keyof CollectionSchemaMap>(db: Db, name: K): Collection<CollectionSchemaMap[K]> {
  return db.collection<CollectionSchemaMap[K]>(name);
}

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomUUID();
  const derived = (await scrypt(secret, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifySecret(secret: string, storedHash: string): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(":");

  if (!salt || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(secret, salt, expected.length)) as Buffer;

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function generateOtpCode(): string {
  const max = 10 ** OTP_DIGITS;
  const min = 10 ** (OTP_DIGITS - 1);
  return String(randomInt(min, max));
}

export function otpExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + OTP_TTL_MINUTES * 60_000);
}

export function sanitizeUser(user: UserDocument) {
  return {
    id: user._id?.toString(),
    email: user.email,
    emailVerifiedAt: user.metadata.emailVerifiedAt ?? null,
    lastLoginAt: user.metadata.lastLoginAt ?? null,
    name: user.metadata.name ?? null,
    avatarUrl: user.metadata.avatarUrl ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function parseJson<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
  const json = await request.json().catch(() => {
    throw new HttpError(400, "Invalid JSON body");
  });

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError(400, "Validation failed", parsed.error.flatten());
  }

  return parsed.data;
}

export function normalizePurpose(purpose: OtpPurpose | undefined): OtpPurpose {
  return purpose ?? "verify-email";
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const secureRaw = process.env.SMTP_SECURE;

  if (!host || !portRaw || !user || !pass || !from) {
    throw new HttpError(500, "SMTP is not configured");
  }

  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new HttpError(500, "SMTP_PORT must be a valid positive integer");
  }

  const secure = secureRaw ? secureRaw.toLowerCase() === "true" : port === 465;

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
}

function getOtpEmailSubject(purpose: OtpPurpose): string {
  switch (purpose) {
    case "sign-in":
      return "Your sign-in OTP code";
    case "sign-up":
      return "Your sign-up OTP code";
    case "reset-password":
      return "Your password reset OTP code";
    case "link-account":
      return "Your account linking OTP code";
    case "verify-email":
    default:
      return "Verify your email with this OTP code";
  }
}

function getOtpEmailIntro(purpose: OtpPurpose): string {
  switch (purpose) {
    case "sign-in":
      return "Use the OTP below to complete your sign-in.";
    case "sign-up":
      return "Use the OTP below to complete your sign-up.";
    case "reset-password":
      return "Use the OTP below to reset your password.";
    case "link-account":
      return "Use the OTP below to link your account.";
    case "verify-email":
    default:
      return "Use the OTP below to verify your email address.";
  }
}

export async function sendOtpEmail(params: {
  email: string;
  otpCode: string;
  purpose: OtpPurpose;
  expiresAt: Date;
}) {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const expiresInMinutes = Math.max(1, Math.ceil((params.expiresAt.getTime() - Date.now()) / 60_000));
  const subject = getOtpEmailSubject(params.purpose);
  const intro = getOtpEmailIntro(params.purpose);

  const text = [
    intro,
    "",
    `OTP: ${params.otpCode}`,
    `Expires in: ${expiresInMinutes} minute(s)`,
    "",
    "If you did not request this code, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <p>${intro}</p>
      <p><strong>OTP:</strong> ${params.otpCode}</p>
      <p><strong>Expires in:</strong> ${expiresInMinutes} minute(s)</p>
      <p>If you did not request this code, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: smtp.from,
    to: params.email,
    subject,
    text,
    html,
  });
}

export async function createUser(params: { email: string; password: string; name?: string }): Promise<UserDocument> {
  const db = await getAuthDb();
  const users = getCollection(db, COLLECTIONS.users);
  const normalizedEmail = normalizeEmail(params.email);
  const existing = await users.findOne({ emailNormalized: normalizedEmail });

  if (existing) {
    throw new HttpError(409, "User already exists");
  }

  const passwordHash = await hashSecret(params.password);
  const user = createUserDocument({
    email: params.email.trim(),
    passwordHash,
    metadata: params.name ? { name: params.name.trim() } : {},
  });

  try {
    const result = await users.insertOne(user);
    return { ...user, _id: result.insertedId };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new HttpError(409, "User already exists");
    }
    throw error;
  }
}

export async function authenticateUser(params: { email: string; password: string }): Promise<UserDocument> {
  const db = await getAuthDb();
  const users = getCollection(db, COLLECTIONS.users);
  const user = await users.findOne({ emailNormalized: normalizeEmail(params.email) });

  if (!user?.passwordHash) {
    throw new HttpError(401, "Invalid email or password");
  }

  const isValid = await verifySecret(params.password, user.passwordHash);
  if (!isValid) {
    throw new HttpError(401, "Invalid email or password");
  }

  const now = new Date();
  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        updatedAt: now,
        "metadata.lastLoginAt": now,
      },
    },
  );

  return {
    ...user,
    updatedAt: now,
    metadata: {
      ...user.metadata,
      lastLoginAt: now,
    },
  };
}

export async function createOtp(params: { email: string; purpose: OtpPurpose }) {
  const db = await getAuthDb();
  const users = getCollection(db, COLLECTIONS.users);
  const otps = getCollection(db, COLLECTIONS.otps);
  const normalizedEmail = normalizeEmail(params.email);
  const user = await users.findOne({ emailNormalized: normalizedEmail });

  const otpCode = generateOtpCode();
  const codeHash = await hashSecret(otpCode);
  const now = new Date();
  const expiresAt = otpExpiresAt(now);

  await otps.updateMany(
    {
      emailNormalized: normalizedEmail,
      purpose: params.purpose,
      consumedAt: null,
    },
    {
      $set: { consumedAt: now },
    },
  );

  const otp = createOtpDocument({
    email: params.email.trim(),
    codeHash,
    purpose: params.purpose,
    expiresAt,
    userId: user?._id ?? null,
    now,
  });

  await otps.insertOne(otp);
  await sendOtpEmail({
    email: params.email.trim(),
    otpCode,
    purpose: params.purpose,
    expiresAt,
  });

  return {
    expiresAt,
    purpose: params.purpose,
  };
}

export async function verifyOtp(params: { email: string; otp: string; purpose: OtpPurpose }) {
  const db = await getAuthDb();
  const users = getCollection(db, COLLECTIONS.users);
  const otps = getCollection(db, COLLECTIONS.otps);
  const normalizedEmail = normalizeEmail(params.email);
  const now = new Date();

  const otpDoc = await otps.findOne(
    {
      emailNormalized: normalizedEmail,
      purpose: params.purpose,
      consumedAt: null,
      expiresAt: { $gt: now },
    },
    {
      sort: { createdAt: -1 },
    },
  );

  if (!otpDoc) {
    throw new HttpError(400, "OTP is invalid or expired");
  }

  const isValid = await verifySecret(params.otp, otpDoc.codeHash);
  if (!isValid) {
    throw new HttpError(400, "OTP is invalid or expired");
  }

  await otps.updateOne(
    { _id: otpDoc._id },
    {
      $set: { consumedAt: now },
    },
  );

  const user = await users.findOne({ emailNormalized: normalizedEmail });
  let updatedUser = user;

  if (user && params.purpose === "verify-email") {
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          updatedAt: now,
          "metadata.emailVerifiedAt": user.metadata.emailVerifiedAt ?? now,
        },
      },
    );

    updatedUser = {
      ...user,
      updatedAt: now,
      metadata: {
        ...user.metadata,
        emailVerifiedAt: user.metadata.emailVerifiedAt ?? now,
      },
    };
  }

  return {
    verified: true,
    user: updatedUser ? sanitizeUser(updatedUser) : null,
    expiresAt: otpDoc.expiresAt,
  };
}

export async function getAuthenticatedUserFromRequest(request: Request): Promise<AuthenticatedRequestContext> {
  const userIdFromHeader = request.headers.get("x-auth-user-id");
  let userId = userIdFromHeader;

  if (!userId) {
    const token = getSessionTokenFromCookieHeader(request.headers.get("cookie"));
    const session = token ? verifySessionToken(token) : null;
    userId = session?.sub ?? null;
  }

  if (!userId || !ObjectId.isValid(userId)) {
    throw new HttpError(401, "Authentication required");
  }

  const db = await getAuthDb();
  const users = getCollection(db, COLLECTIONS.users);
  const user = await users.findOne({ _id: new ObjectId(userId) });

  if (!user) {
    throw new HttpError(401, "Authentication required");
  }

  return {
    userId,
    user: sanitizeUser(user),
  };
}

export function serializeError(error: unknown) {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: {
        ok: false,
        error: error.message,
        details: error.details ?? null,
      },
    };
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return {
    status: 500,
    body: {
      ok: false,
      error: message,
    },
  };
}
