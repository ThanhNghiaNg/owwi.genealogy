import { NextResponse } from "next/server";

import { getAuthenticatedUserFromRequest, serializeError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUserFromRequest(request);

    return NextResponse.json(
      {
        ok: true,
        user: auth.user,
        userId: auth.userId,
      },
      { status: 200 },
    );
  } catch (error) {
    const serialized = serializeError(error);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
