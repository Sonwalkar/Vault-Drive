import { createClient } from "@supabase/supabase-js";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  badRequestResponse,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "../../../utils/response";
import { SUPABASE_TABLES } from "../../../types/constants";
import S3Service from "../../../services/s3Service";
import { validate } from "../../../utils/validate";
import { uploadFileSchema } from "./schema";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { headers: _headers, body: _body, ...safeEvent } = event;
  console.log("Received event:", JSON.stringify(safeEvent));
  try {
    if (!event.body) {
      return badRequestResponse(event, "Request body is missing");
    }
    const authToken =
      event.headers["Authorization"] || event.headers["authorization"];
    if (!authToken) {
      return unauthorizedResponse(event, "Authorization token is missing");
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase credentials are not set in environment variables",
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authToken,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return unauthorizedResponse(event, "Invalid or expired token");
    }
    const { data: profile } = await supabaseClient
      .from(SUPABASE_TABLES.PROFILES)
      .select("storage_used_bytes, storage_limit_bytes")
      .eq("id", user.id)
      .single();

    const parsed = validate(uploadFileSchema, JSON.parse(event.body), event);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    if (
      profile &&
      profile.storage_used_bytes + body.sizeBytes > profile.storage_limit_bytes
    ) {
      return badRequestResponse(event, "Storage limit exceeded.");
    }

    // Generate a unique file key for S3
    const sanitized = body.fileName.replace(/[^a-zA-Z0-9._\-\s]/g, "_").trim();
    const timestamp = Date.now();
    const folder = body.folderId ?? "root";
    const s3Key = `users/${user.id}/${folder}/${timestamp}_${sanitized}`;

    // Create a presigned URL
    const uploadUrl = await new S3Service().putObject(s3Key, body.contentType);

    // Pre-register the file record in DB
    const ext = body.fileName.split(".").pop()?.toLowerCase() ?? null;
    const { data: fileRecord, error: insertError } = await supabaseClient
      .from(SUPABASE_TABLES.FILES)
      .insert({
        user_id: user.id,
        folder_id: body.folderId ?? null,
        name: body.fileName,
        original_name: body.fileName,
        s3_key: s3Key,
        size_bytes: body.sizeBytes,
        mime_type: body.contentType,
        extension: ext,
      })
      .select()
      .single();

    if (insertError) {
      return errorResponse(event, insertError, "Failed to create file record");
    }

    // Log activity
    await supabaseClient.from(SUPABASE_TABLES.ACTIVITY_LOG).insert({
      user_id: user.id,
      file_id: fileRecord.id,
      action: "upload",
      metadata: {
        fileName: body.fileName,
        sizeBytes: body.sizeBytes,
      },
    });

    console.log("PROCESSING COMPLETE: Returning presigned URL and file record");

    return successResponse(event, { uploadUrl, s3Key, fileId: fileRecord.id });
  } catch (error: any) {
    console.error("Error in uploadFile handler:", error);
    return errorResponse(event, error, "Failed to upload file");
  }
};
