import { z } from "zod";

export const deleteFileSchema = z.object({
  fileId: z.string().min(1, "fileId is required"),
});

export type DeleteFileInput = z.infer<typeof deleteFileSchema>;
