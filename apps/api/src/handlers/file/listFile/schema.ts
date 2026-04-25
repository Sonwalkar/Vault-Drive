import { z } from "zod";

export const listFilesSchema = z.object({
  folderId: z.string().nullable().optional(),
  showAll: z.boolean().optional(),
  isTrash: z.boolean().optional(),
  search: z.string().optional(),
  mimeType: z.string().optional(),
  isStarred: z.boolean().optional(),
  tag: z.string().optional(),
  sortField: z
    .enum(["name", "size_bytes", "created_at", "updated_at"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.number().int().nonnegative().optional(),
  offset: z.number().int().nonnegative().optional(),
});

export type ListFilesInput = z.infer<typeof listFilesSchema>;
