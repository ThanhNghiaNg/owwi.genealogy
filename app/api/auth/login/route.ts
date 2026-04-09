import { NextResponse } from "next/server";

import { authenticateUser, loginSchema, parseJson, sanitizeUser, serializeError } from "@/lib/auth";
import { setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, loginSchema);
    const user = await authenticateUser(input);

    const response = NextResponse.json(
      {
        ok: true,
        user: sanitizeUser(user),
      },
      { status: 200 },
    );

    if (user._id) {
      setSessionCookie(response, user._id.toString());
    }

    return response;
  } catch (error) {
    const serialized = serializeError(error);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
