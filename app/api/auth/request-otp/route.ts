import type { NextRequest } from "next/server";
import { AuthController } from "@/server/controllers/auth.controller";
import { fail } from "@/server/lib/http";

const controller = new AuthController();

export async function POST(request: NextRequest) {
  try {
    return await controller.requestOtp(request);
  } catch (error) {
    return fail(error);
  }
}
