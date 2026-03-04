import { NextResponse, type NextRequest } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { clearAuthCookie, setAuthCookie } from "@/server/lib/auth-cookie";
import { ok, parseJsonBody } from "@/server/lib/http";
import { getAuthenticatedUserId } from "@/server/lib/request-auth";

export class AuthController {
  private readonly authService = new AuthService();

  async requestOtp(request: NextRequest): Promise<NextResponse> {
    const body = await parseJsonBody<unknown>(request);
    await this.authService.requestOtp(body);
    return ok({ success: true });
  }

  async verifyOtp(request: NextRequest): Promise<NextResponse> {
    const body = await parseJsonBody<unknown>(request);
    const result = await this.authService.verifyOtp(body);

    const response = ok({ success: true, user: result.user });
    setAuthCookie(response, result.token);
    return response;
  }

  async me(request: NextRequest): Promise<NextResponse> {
    const userId = getAuthenticatedUserId(request);
    const user = await this.authService.getSessionUser(userId);
    return ok({ authenticated: true, user });
  }

  async logout(): Promise<NextResponse> {
    const response = ok({ success: true });
    clearAuthCookie(response);
    return response;
  }

  async google(): Promise<NextResponse> {
    await this.authService.handleGoogleAuthPlaceholder();
    return ok({ success: false });
  }
}
