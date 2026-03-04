import jwt from "jsonwebtoken";
import { AppError } from "@/server/lib/errors";
import { env, requireEnvValue } from "@/server/lib/env";

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function signSessionToken(payload: { userId: string; email: string }): string {
  const secret = requireEnvValue("JWT_SECRET", env.JWT_SECRET);
  const expiresIn = env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"];
  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email,
    },
    secret,
    { expiresIn }
  );
}

export function verifySessionToken(token: string): JwtPayload {
  try {
    const secret = requireEnvValue("JWT_SECRET", env.JWT_SECRET);
    const decoded = jwt.verify(token, secret);
    if (!decoded || typeof decoded !== "object") {
      throw new AppError(401, "UNAUTHORIZED", "Invalid session token");
    }

    const sub = typeof decoded.sub === "string" ? decoded.sub : "";
    const email = typeof (decoded as { email?: unknown }).email === "string"
      ? (decoded as { email: string }).email
      : "";

    if (!sub || !email) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid session payload");
    }

    return decoded as JwtPayload;
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired session");
  }
}
