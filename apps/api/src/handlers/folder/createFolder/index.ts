import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  badRequestResponse,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "../../../utils/response";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_TABLES } from "../../../types/constants";

interface CreateFolderRequest {
  name: string;
  parentId?: string | null;
  path: string;
}
export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const authToken: string =
      event.headers["Authorization"]! || event.headers["authorization"]!;

    const supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authToken } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return unauthorizedResponse(event, "Unauthorized");
    }

    const { name, parentId, path }: CreateFolderRequest = JSON.parse(
      event.body!,
    );

    if (!name || !path) {
      return badRequestResponse(
        event,
        "Missing required fields: name and path",
      );
    }
    const { data, error } = await supabaseClient
      .from(SUPABASE_TABLES.FOLDERS)
      .insert({
        name,
        user_id: user.id,
        parent_id: parentId,
        path,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting folder into database:", error);
      return errorResponse(event, error, "Failed to create folder");
    }

    return successResponse(event, {}, "Folder created successfully");
  } catch (error: unknown) {
    console.error("Error creating folder:", error);
    return errorResponse(event, error, "Failed to create folder");
  }
};
