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
import { downloadFileSchema } from "./schema";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { headers: _headers, body: _body, ...safeEvent } = event;
  console.log("Received event:", JSON.stringify(safeEvent));
  try {
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

    const pathParsed = validate(downloadFileSchema, event.pathParameters, event);
    if (!pathParsed.success) return pathParsed.response;
    const { fileId } = pathParsed.data;

    const { data: file, error: fileError } = await supabaseClient
      .from(SUPABASE_TABLES.FILES)
      .select("*")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single();

    console.log("FILE INFO", file);

    if (fileError || !file) {
      console.error("File not found");
      return notFoundResponse(event, "File not found");
    }

    // Download url
    const downloadUrl = await new S3Service().getObject(
      file.s3_key,
      file.original_name,
    );

    await supabaseClient.from(SUPABASE_TABLES.ACTIVITY_LOG).insert({
      user_id: user.id,
      file_id: file.id,
      action: "download",
      metadata: { fileName: file.original_name },
    });

    return successResponse(
      event,
      { downloadUrl, fileName: file.original_name },
      "Success",
    );
  } catch (error: unknown) {
    console.error("ERROR:", JSON.stringify(error, null, 2));
    return errorResponse(event, error);
  }
};
