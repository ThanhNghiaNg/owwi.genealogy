import { NextResponse } from "next/server";
import { AppError, toAppError } from "@/server/lib/errors";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(error: unknown): NextResponse {
  const appError = toAppError(error);
  const payload: {
    error: {
      code: string;
      message: string;
      details?: unknown;
    };
  } = {
    error: {
      code: appError.code,
      message: appError.message,
    },
  };

  if (appError.details !== undefined) {
    payload.error.details = appError.details;
  }

  return NextResponse.json(payload, { status: appError.statusCode });
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}
