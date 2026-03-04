import type { NextRequest } from "next/server";
import { TreeService } from "@/server/services/tree.service";
import { ok, parseJsonBody } from "@/server/lib/http";
import { getAuthenticatedUserId } from "@/server/lib/request-auth";

export class TreeController {
  private readonly treeService = new TreeService();

  async getTree(request: NextRequest) {
    const userId = getAuthenticatedUserId(request);
    const data = await this.treeService.getTree(userId);
    return ok(data);
  }

  async replaceTree(request: NextRequest) {
    const userId = getAuthenticatedUserId(request);
    const body = await parseJsonBody<unknown>(request);
    const data = await this.treeService.replaceTree(userId, body);
    return ok(data);
  }
}
