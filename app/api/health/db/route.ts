import { NextResponse } from "next/server";

import { pingMongo } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingMongo();

    return NextResponse.json(
      {
        ok: true,
        service: "mongodb",
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";

    return NextResponse.json(
      {
        ok: false,
        service: "mongodb",
        error: message,
      },
      { status: 503 }
    );
  }
}
