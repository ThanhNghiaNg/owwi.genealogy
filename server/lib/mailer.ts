import nodemailer from "nodemailer";
import { env, requireEnvValue } from "@/server/lib/env";
import { AppError } from "@/server/lib/errors";

function createTransport() {
  const host = requireEnvValue("SMTP_HOST", env.SMTP_HOST);
  const user = requireEnvValue("SMTP_USER", env.SMTP_USER);
  const pass = requireEnvValue("SMTP_PASS", env.SMTP_PASS);
  const rawPort = requireEnvValue("SMTP_PORT", env.SMTP_PORT);
  const port = Number(rawPort);

  if (!Number.isFinite(port) || port <= 0) {
    throw new AppError(500, "CONFIG_ERROR", "SMTP_PORT must be a valid number");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from: requireEnvValue("SMTP_FROM", env.SMTP_FROM),
      to: email,
      subject: "Your Family Tree OTP Code",
      text: `Your OTP code is ${otp}. It expires in 5 minutes.`,
      html: `<p>Your OTP code is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(502, "EMAIL_SEND_FAILED", "Unable to send OTP email", {
      cause: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
