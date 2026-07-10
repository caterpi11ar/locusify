export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "GONE"
  | "INTERNAL_ERROR";

const STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  INTERNAL_ERROR: 500,
};

export interface I18nMessage {
  en: string;
  zh: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly i18n: I18nMessage;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: I18nMessage, details?: unknown) {
    super(message.en);
    this.name = "AppError";
    this.code = code;
    this.statusCode = STATUS_MAP[code];
    this.i18n = message;
    this.details = details;
  }
}
