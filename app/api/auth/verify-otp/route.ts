import { NextResponse } from "next/server";

import { parseJson, serializeError, verifyOtp, verifyOtpSchema } from "@/lib/auth";
import { setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, verifyOtpSchema);
    const result = await verifyOtp(input);

    const response = NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 200 },
    );

    if (input.purpose === "sign-in" && result.user?.id) {
      setSessionCookie(response, result.user.id);
    }

    return response;
  } catch (error) {
    const serialized = serializeError(error);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
