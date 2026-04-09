import { NextResponse } from "next/server";

import { HttpError, serializeError } from "@/lib/auth";
import {
  getPrimaryFamilyTree,
  normalizeFamilyTreeSnapshot,
  requireAuthenticatedUser,
  toFamilyTreeResponse,
  upsertPrimaryFamilyTree,
} from "@/lib/family-tree/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    const familyTree = await getPrimaryFamilyTree(auth.userId);

    return NextResponse.json({ ok: true, familyTree: toFamilyTreeResponse(familyTree) }, { status: 200 });
  } catch (error) {
    const serialized = serializeError(error);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    const body = await request.json().catch(() => {
      throw new HttpError(400, "Invalid JSON body");
    });
    const snapshot = normalizeFamilyTreeSnapshot(body?.data ?? body);
    const familyTree = await upsertPrimaryFamilyTree({ userId: auth.userId, snapshot });

    return NextResponse.json({ ok: true, familyTree: toFamilyTreeResponse(familyTree) }, { status: 200 });
  } catch (error) {
    const serialized = serializeError(error);
    return NextResponse.json(serialized.body, { status: serialized.status });
  }
}
