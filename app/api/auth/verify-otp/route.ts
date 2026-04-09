import { NextResponse } from "next/server";

import { parseJson, serializeError, verifyOtp, verifyOtpSchema } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, verifyOtpSchema);
    const result = await verifyOtp(input);

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    const serialized = serializeError(error);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
