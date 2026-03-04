import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/server/lib/auth-cookie";
import { AppError } from "@/server/lib/errors";
import { verifySessionToken } from "@/server/lib/jwt";

export function getAuthenticatedUserId(request: NextRequest): string {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Missing session token");
  }

  const payload = verifySessionToken(token);
  return payload.sub;
}
