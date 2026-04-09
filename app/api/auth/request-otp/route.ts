import { NextResponse } from "next/server";

import { createOtp, parseJson, requestOtpSchema, serializeError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, requestOtpSchema);
    const otp = await createOtp(input);

    return NextResponse.json(
      {
        ok: true,
        message: "OTP sent successfully",
        purpose: otp.purpose,
        expiresAt: otp.expiresAt,
      },
      { status: 200 },
    );
  } catch (error) {
    const serialized = serializeError(error);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
