import { NextResponse } from "next/server";

import { createUser, parseJson, registerSchema, sanitizeUser, serializeError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, registerSchema);
    const user = await createUser(input);

    return NextResponse.json(
      {
        ok: true,
        user: sanitizeUser(user),
      },
      { status: 201 },
    );
  } catch (error) {
    const serialized = serializeError(error);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
