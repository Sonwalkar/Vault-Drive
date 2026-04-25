import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from "../../../utils/response";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_TABLES } from "../../../types/constants";
import S3Service from "../../../services/s3Service";
import { validate } from "../../../utils/validate";
import { deleteFileSchema } from "./schema";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));
    const authToken =
      event.headers["Authorization"] || event.headers["authorization"];

    if (!authToken) {
      console.error("No Authorization header provided");
      return unauthorizedResponse(event, "Unauthorized");
    }

    const supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authToken,
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return unauthorizedResponse(event, "Unauthorized");
    }

    const pathParsed = validate(deleteFileSchema, event.pathParameters, event);
    if (!pathParsed.success) return pathParsed.response;
    const { fileId } = pathParsed.data;

    // verify ownership and get S3 key
    const { data: file, error: fileError } = await supabaseClient
      .from(SUPABASE_TABLES.FILES)
      .select("id, s3_key, original_name, user_id")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single();

    if (fileError || !file) {
      console.error("File not found", fileError);
      return notFoundResponse(event, "File not Found");
    }

    // delete from S3
    await new S3Service().deleteObject(file.s3_key);

    // Delete from DB (triggers storage_used update)
    await supabaseClient.from(SUPABASE_TABLES.FILES).delete().eq("id", fileId);

    // Log activity
    await supabaseClient.from(SUPABASE_TABLES.ACTIVITY_LOG).insert({
      user_id: user.id,
      file_id: null,
      action: "delete",
      metadata: { fileName: file.original_name, s3Key: file.s3_key },
    });

    return successResponse(event, {}, "File deleted successfully");
  } catch (error: unknown) {
    return errorResponse(event, error);
  }
};
