import type { NextRequest } from "next/server";
import { SyncController } from "@/server/controllers/sync.controller";
import { fail } from "@/server/lib/http";

const controller = new SyncController();

export async function POST(request: NextRequest) {
  try {
    return await controller.sync(request);
  } catch (error) {
    return fail(error);
  }
}
