import { AuthController } from "@/server/controllers/auth.controller";
import { fail } from "@/server/lib/http";

const controller = new AuthController();

export async function POST() {
  try {
    return await controller.logout();
  } catch (error) {
    return fail(error);
  }
}
