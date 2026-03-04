import { AppError } from "@/server/lib/errors";

export const env = {
  MONGODB_URI: process.env.MONGODB_URI?.trim() ?? "",
  JWT_SECRET: process.env.JWT_SECRET?.trim() ?? "",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN?.trim() || "7d",
  SMTP_HOST: process.env.SMTP_HOST?.trim() ?? "",
  SMTP_PORT: process.env.SMTP_PORT?.trim() ?? "",
  SMTP_USER: process.env.SMTP_USER?.trim() ?? "",
  SMTP_PASS: process.env.SMTP_PASS?.trim() ?? "",
  SMTP_FROM: process.env.SMTP_FROM?.trim() ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "development",
};

export function requireEnvValue(name: string, value: string): string {
  if (!value) {
    throw new AppError(500, "CONFIG_ERROR", `Missing environment variable: ${name}`);
  }
  return value;
}

export const isProduction = env.NODE_ENV === "production";
