import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/server/lib/auth-cookie";

function base64UrlToUint8Array(input: string): Uint8Array {
  const padding = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyHs256(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [header, payload, signature] = parts;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToUint8Array(signature),
    encoder.encode(`${header}.${payload}`)
  );
}

function isTokenExpired(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return true;

  try {
    const payloadBytes = base64UrlToUint8Array(parts[1]);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as { exp?: number };
    if (!payload.exp) return true;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
    },
    { status: 401 }
  );
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return unauthorizedResponse();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error: {
          code: "CONFIG_ERROR",
          message: "Server authentication is not configured",
        },
      },
      { status: 500 }
    );
  }

  const validSignature = await verifyHs256(token, secret);
  if (!validSignature || isTokenExpired(token)) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/tree", "/api/sync", "/api/auth/me", "/api/auth/logout"],
};

