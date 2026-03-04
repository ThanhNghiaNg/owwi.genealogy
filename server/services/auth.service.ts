import { ObjectId } from "mongodb";
import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { sendOtpEmail } from "@/server/lib/mailer";
import { generateOtpCode, computeOtpExpiry } from "@/server/lib/otp";
import { sanitizeEmail } from "@/server/lib/sanitize";
import { signSessionToken } from "@/server/lib/jwt";
import { UserRepository } from "@/server/repositories/user.repository";
import type { AuthenticatedUser } from "@/server/types/auth";

const requestOtpSchema = z.object({
  email: z.string().email().max(254),
});

const verifyOtpSchema = z.object({
  email: z.string().email().max(254),
  otp: z.string().regex(/^\d{6}$/),
});

export class AuthService {
  private readonly userRepository = new UserRepository();

  async requestOtp(input: unknown): Promise<void> {
    const parsed = requestOtpSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(400, "INVALID_INPUT", "Invalid email", parsed.error.flatten());
    }

    const email = sanitizeEmail(parsed.data.email);
    const otp = generateOtpCode();
    const otpExpiresAt = computeOtpExpiry(5);

    await this.userRepository.upsertOtp(email, otp, otpExpiresAt);
    await sendOtpEmail(email, otp);
  }

  async verifyOtp(input: unknown): Promise<{ token: string; user: AuthenticatedUser }> {
    const parsed = verifyOtpSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(400, "INVALID_INPUT", "Invalid OTP payload", parsed.error.flatten());
    }

    const email = sanitizeEmail(parsed.data.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.otp || !user.otpExpiresAt) {
      throw new AppError(401, "OTP_INVALID", "OTP is invalid or expired");
    }

    if (user.otp !== parsed.data.otp || user.otpExpiresAt.getTime() < Date.now()) {
      throw new AppError(401, "OTP_INVALID", "OTP is invalid or expired");
    }

    await this.userRepository.clearOtp(user._id);

    const token = signSessionToken({ userId: user._id.toHexString(), email: user.email });

    return {
      token,
      user: {
        id: user._id.toHexString(),
        email: user.email,
        hasGoogleLinked: Boolean(user.googleId),
      },
    };
  }

  async getSessionUser(userId: string): Promise<AuthenticatedUser> {
    if (!ObjectId.isValid(userId)) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid session user");
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "Session user not found");
    }

    return {
      id: user._id.toHexString(),
      email: user.email,
      hasGoogleLinked: Boolean(user.googleId),
    };
  }

  async handleGoogleAuthPlaceholder(): Promise<never> {
    // OAuth provider token verification/linking is inserted here.
    throw new AppError(501, "GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth is not configured yet");
  }
}
