import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "@/lib/errors/classes";

export function validateBody<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        "Invalid request data",
        error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      );
    }
    throw error;
  }
}

export function validateQueryParams<T>(
  schema: ZodSchema<T>,
  params: URLSearchParams
): T {
  const data = Object.fromEntries(params.entries());
  return validateBody(schema, data);
}
