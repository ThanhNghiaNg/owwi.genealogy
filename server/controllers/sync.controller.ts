import type { NextRequest } from "next/server";
import { ok, parseJsonBody } from "@/server/lib/http";
import { getAuthenticatedUserId } from "@/server/lib/request-auth";
import { SyncService } from "@/server/services/sync.service";

export class SyncController {
  private readonly syncService = new SyncService();

  async sync(request: NextRequest) {
    const userId = getAuthenticatedUserId(request);
    const body = await parseJsonBody<unknown>(request);
    const data = await this.syncService.syncFromLocal(userId, body);
    return ok(data);
  }
}
