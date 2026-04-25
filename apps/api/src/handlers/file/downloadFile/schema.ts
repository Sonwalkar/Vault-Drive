import { z } from "zod";

export const downloadFileSchema = z.object({
  fileId: z.string().min(1, "fileId is required"),
});

export type DownloadFileInput = z.infer<typeof downloadFileSchema>;
