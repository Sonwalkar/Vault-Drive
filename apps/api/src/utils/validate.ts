import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ZodSchema } from "zod";
import { ALLOWED_ORIGINS, STATUS_CODES } from "../types/constants";

type ValidateSuccess<T> = { success: true; data: T };
type ValidateFailure = { success: false; response: APIGatewayProxyResult };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.join(","),
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
  "Content-Type": "application/json",
};

export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown,
  _event: APIGatewayProxyEvent,
): ValidateSuccess<T> | ValidateFailure {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    response: {
      statusCode: STATUS_CODES.BAD_REQUEST,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Validation failed",
        issues: result.error.issues,
      }),
    },
  };
}
