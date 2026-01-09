import { NextResponse } from "next/server";
import { ApiError, RateLimitError } from "./classes";
import { ZodError } from "zod";

export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Known API errors
  if (error instanceof ApiError) {
    const headers: HeadersInit = {};

    if (error instanceof RateLimitError) {
      headers["Retry-After"] = String(error.retryAfter);
      headers["X-RateLimit-Remaining"] = "0";
    }

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode, headers }
    );
  }

  // Zod validation errors (shouldn't reach here if using validateBody)
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request data",
        code: "VALIDATION_ERROR",
        details: error.issues,
      },
      { status: 400 }
    );
  }

  // Supabase/PostgreSQL errors
  if (error && typeof error === "object" && "code" in error) {
    const dbError = error as { code: string; message: string; details?: string };

    // PostgreSQL error codes
    if (dbError.code === "23505") {
      return NextResponse.json(
        { error: "Resource already exists", code: "DUPLICATE" },
        { status: 409 }
      );
    }

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          error: "Referenced resource not found",
          code: "FOREIGN_KEY_VIOLATION",
        },
        { status: 400 }
      );
    }
  }

  // Unknown errors - don't leak details
  return NextResponse.json(
    {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}
