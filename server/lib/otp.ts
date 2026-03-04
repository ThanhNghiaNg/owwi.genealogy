import { randomInt } from "crypto";

export function generateOtpCode(): string {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

export function computeOtpExpiry(minutes = 5): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
