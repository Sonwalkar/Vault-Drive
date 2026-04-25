import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  badRequestResponse,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "../../../utils/response";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_TABLES } from "../../../types/constants";
import { validate } from "../../../utils/validate";
import { updateFileSchema } from "./schema";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const authToken =
      event.headers["Authorization"] || event.headers["authorization"];
    if (!authToken) {
      console.error("No Authorization header provided");
      return unauthorizedResponse(event);
    }
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
      return unauthorizedResponse(event);
    }

    if (!event.body) {
      return badRequestResponse(event, "Request body is missing");
    }
    const parsed = validate(updateFileSchema, JSON.parse(event.body), event);
    if (!parsed.success) return parsed.response;
    const { fileId, updates } = parsed.data;

    // If metadata is being updated, merge with existing metadata
    const resolveUpdates: Record<string, unknown> = { ...updates };
    if (updates.metadata !== undefined) {
      const { data: current } = await supabaseClient
        .from(SUPABASE_TABLES.FILES)
        .select("metadata")
        .eq("id", fileId)
        .eq("user_id", user.id)
        .single();
      resolveUpdates.metadata = {
        ...((current?.metadata as Record<string, unknown>) ?? {}),
        ...updates.metadata,
      };
    }

    const { data, error } = await supabaseClient
      .from(SUPABASE_TABLES.FILES)
      .update({ ...resolveUpdates, updated_at: new Date().toISOString() })
      .eq("id", fileId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return badRequestResponse(event, error.message);
    }
    // Log activity for meaningful actions
    const action =
      updates.is_starred !== undefined
        ? "star"
        : updates.name !== undefined
          ? "rename"
          : updates.folder_id !== undefined
            ? "move"
            : updates.tags !== undefined
              ? "tag"
              : null;

    if (action) {
      await supabaseClient.from("activity_log").insert({
        user_id: user.id,
        file_id: fileId,
        action,
        metadata: updates,
      });
    }
    return successResponse(event, data, "Success");
  } catch (error: unknown) {
    console.error("ERROR", error);
    return errorResponse(event, error);
  }
};
