import { z } from "zod";

export const createFolderSchema = z.object({
  name: z.string().min(1, "name is required"),
  path: z.string().min(1, "path is required"),
  parentId: z.string().nullable().optional(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
