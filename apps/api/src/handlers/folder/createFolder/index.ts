import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { errorResponse, successResponse } from "../../../utils/response";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    return successResponse(event, {}, "Folder created successfully");
  } catch (error: unknown) {
    console.error("Error creating folder:", error);
    return errorResponse(event, error, "Failed to create folder");
  }
};
