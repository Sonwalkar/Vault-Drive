import { APIGatewayProxyEvent } from "aws-lambda";
import { ALLOWED_ORIGINS, STATUS_CODES } from "../types/constants";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.join(","),
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
};

const successResponse = (
  _req: APIGatewayProxyEvent,
  data: any,
  message: string = "Success",
) => {
  return {
    statusCode: STATUS_CODES.OK,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      data,
    }),
  };
};

const errorResponse = (
  _req: APIGatewayProxyEvent,
  error: any,
  message: string = "Internal Server Error",
) => {
  console.error("Internal error:", error);
  return {
    statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  };
};

const createdResponse = (
  _req: APIGatewayProxyEvent,
  data: any,
  message: string = "Resource created",
) => {
  return {
    statusCode: STATUS_CODES.CREATED,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      data,
    }),
  };
};

const badRequestResponse = (
  _req: APIGatewayProxyEvent,
  message: string = "Bad request",
) => {
  return {
    statusCode: STATUS_CODES.BAD_REQUEST,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  };
};

const unauthorizedResponse = (
  _req: APIGatewayProxyEvent,
  message: string = "Unauthorized",
) => {
  return {
    statusCode: STATUS_CODES.UNAUTHORIZED,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  };
};

const forbiddenResponse = (
  _req: APIGatewayProxyEvent,
  message: string = "Forbidden",
) => {
  return {
    statusCode: STATUS_CODES.FORBIDDEN,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  };
};

const notFoundResponse = (
  _req: APIGatewayProxyEvent,
  message: string = "Not found",
) => {
  return {
    statusCode: STATUS_CODES.NOT_FOUND,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  };
};

export {
  successResponse,
  errorResponse,
  createdResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
};
