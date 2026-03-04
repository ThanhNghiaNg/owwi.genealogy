import type { NextRequest } from "next/server";
import { TreeController } from "@/server/controllers/tree.controller";
import { fail } from "@/server/lib/http";

const controller = new TreeController();

export async function GET(request: NextRequest) {
  try {
    return await controller.getTree(request);
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await controller.replaceTree(request);
  } catch (error) {
    return fail(error);
  }
}
