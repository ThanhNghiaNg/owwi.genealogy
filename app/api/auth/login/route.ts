import { NextResponse } from "next/server";

import { authenticateUser, loginSchema, parseJson, sanitizeUser, serializeError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, loginSchema);
    const user = await authenticateUser(input);

    return NextResponse.json(
      {
        ok: true,
        user: sanitizeUser(user),
      },
      { status: 200 },
    );
  } catch (error) {
    const serialized = serializeError(error);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
