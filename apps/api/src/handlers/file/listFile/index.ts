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
import { listFilesSchema } from "./schema";

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

    if (!event.body) {
      return badRequestResponse(event, "Request body is missing");
    }

    const parsed = validate(listFilesSchema, JSON.parse(event.body), event);
    if (!parsed.success) return parsed.response;
    const {
      folderId = null,
      showAll = false,
      isTrash = false,
      search,
      mimeType,
      isStarred,
      tag,
      sortField = "created_at",
      sortOrder = "desc",
      limit = 50,
      offset = 0,
    } = parsed.data;

    // Build files query
    let filesQuery = supabaseClient
      .from(SUPABASE_TABLES.FILES)
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order(sortField, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    // Trash filter: show only soft-deleted or exclude them
    if (isTrash) {
      filesQuery = filesQuery.contains("metadata", { isDeleted: true });
    } else {
      filesQuery = filesQuery.not("metadata", "cs", '{"isDeleted":true}');
    }

    // showAll skips folder filtering — returns every file for the user
    if (!isTrash && !showAll) {
      if (folderId === null) {
        filesQuery = filesQuery.is("folder_id", null);
      } else {
        filesQuery = filesQuery.eq("folder_id", folderId);
      }
    }

    if (search) {
      filesQuery = filesQuery.ilike("name", `%${search}%`);
    }

    if (mimeType) {
      filesQuery = filesQuery.ilike("mime_type", `${mimeType}%`);
    }

    if (isStarred !== undefined) {
      filesQuery = filesQuery.eq("is_starred", isStarred);
    }

    if (tag) {
      filesQuery = filesQuery.contains("tags", [tag]);
    }

    // Build folders query
    // showAll: fetch all user folders (needed for name lookup in flat view)
    // otherwise: fetch subfolders of the current folder for navigation
    let folders = [];
    if (!search && !mimeType && !isStarred) {
      let foldersQuery = supabaseClient
        .from("folders")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (!showAll) {
        if (folderId === null) {
          foldersQuery = foldersQuery.is("parent_id", null);
        } else {
          foldersQuery = foldersQuery.eq("parent_id", folderId);
        }
      }

      const { data: foldersData } = await foldersQuery;
      folders = foldersData ?? [];
    }

    const { data: files, count, error: filesError } = await filesQuery;

    if (filesError) {
      return errorResponse(event, filesError);
    }

    return successResponse(
      event,
      {
        files: files ?? [],
        folders,
        total: count ?? 0,
        limit,
        offset,
      },
      "Success",
    );
  } catch (error: unknown) {
    console.error("ERROR", error);
    return errorResponse(event, error);
  }
};
