import { NextResponse } from "next/server";
import { AppError, I18nMessage } from "./errors";

interface SuccessBody<T> {
  success: true;
  data: T;
}

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: I18nMessage;
    details?: unknown;
  };
}

export function successResponse<T>(data: T, status = 200): NextResponse<SuccessBody<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  code: string,
  message: I18nMessage,
  status: number,
  details?: unknown,
): NextResponse<ErrorBody> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details !== undefined && { details }) },
    },
    { status },
  );
}

export function handleError(err: unknown): NextResponse<ErrorBody> {
  if (err instanceof AppError) {
    return errorResponse(err.code, err.i18n, err.statusCode, err.details);
  }

  console.error("Unhandled error:", err);
  return errorResponse(
    "INTERNAL_ERROR",
    { en: "An unexpected error occurred", zh: "发生了意外错误" },
    500,
  );
}
