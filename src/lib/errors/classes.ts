export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    public validationErrors: Array<{ field: string; message: string }>
  ) {
    super(message, 400, "VALIDATION_ERROR", validationErrors);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = "Authentication failed") {
    super(message, 401, "AUTH_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = "Not authorized") {
    super(message, 403, "FORBIDDEN");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string, public retryAfter: number) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", { retryAfter });
    this.name = "RateLimitError";
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string = "Database operation failed", details?: unknown) {
    super(message, 500, "DATABASE_ERROR", details);
    this.name = "DatabaseError";
  }
}
