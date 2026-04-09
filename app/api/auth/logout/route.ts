import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json(
    {
      ok: true,
      message: "Logged out successfully",
    },
    { status: 200 },
  );

  clearSessionCookie(response);
  return response;
}
