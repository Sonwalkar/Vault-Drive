import { z } from "zod";

export const uploadFileSchema = z.object({
  fileName: z.string().min(1, "fileName is required"),
  contentType: z.string().min(1, "contentType is required"),
  sizeBytes: z.number().positive("sizeBytes must be a positive number"),
  folderId: z.string().nullable().optional(),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
