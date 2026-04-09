import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "../../utils/response";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_TABLES } from "../../types/constants";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const authToken =
      event.headers["Authorization"]! || event.headers["authorization"]!;
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
      return unauthorizedResponse(event);
    }

    const oneWeekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [
      recentFilesRes,
      foldersRes,
      totalFilesCount,
      starredCount,
      foldersCount,
      sharedCount,
      uploadedThisWeekCount,
      activityRes,
    ] = await Promise.all([
      supabaseClient
        .from(SUPABASE_TABLES.FILES)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseClient
        .from(SUPABASE_TABLES.FOLDERS)
        .select("*, files(count)")
        .eq("user_id", user.id)
        .is("parent_id", null)
        .order("updated_at", { ascending: false })
        .limit(6),
      supabaseClient
        .from(SUPABASE_TABLES.FILES)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabaseClient
        .from(SUPABASE_TABLES.FILES)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_starred", true),
      supabaseClient
        .from(SUPABASE_TABLES.FOLDERS)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabaseClient
        .from(SUPABASE_TABLES.FILE_SHARES)
        .select("id", { count: "exact", head: true })
        .eq("shared_by", user.id)
        .eq("is_active", true),
      supabaseClient
        .from(SUPABASE_TABLES.FILES)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", oneWeekAgo),
      supabaseClient
        .from(SUPABASE_TABLES.ACTIVITY_LOG)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return successResponse(event, {
      files: recentFilesRes.data ?? [],
      folders: foldersRes.data ?? [],
      totalFiles: totalFilesCount.count ?? 0,
      starredCount: starredCount.count ?? 0,
      foldersCount: foldersCount.count ?? 0,
      sharedFiles: sharedCount.count ?? 0,
      uploadedThisWeek: uploadedThisWeekCount.count ?? 0,
      activity: activityRes.data ?? [],
    });
  } catch (error: unknown) {
    console.error(error);
    return errorResponse(event, error);
  }
};
