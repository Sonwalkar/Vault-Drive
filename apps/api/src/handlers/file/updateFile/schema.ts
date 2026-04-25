import { z } from "zod";

export const updateFileSchema = z.object({
  fileId: z.string().min(1, "fileId is required"),
  updates: z.object({
    name: z.string().min(1).optional(),
    folder_id: z.string().nullable().optional(),
    is_starred: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type UpdateFileInput = z.infer<typeof updateFileSchema>;
