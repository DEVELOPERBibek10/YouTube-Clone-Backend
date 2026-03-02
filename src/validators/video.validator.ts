import { z } from "zod";

export const videoRequestSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(2, { error: "Title must be at least 2 characters." })
      .max(100, { error: "Title cannot exceed 100 characters." }),

    description: z
      .string()
      .trim()
      .max(400, { error: "Description cannot exceed 400 characters" }),

    videoUrl: z.string().trim().min(1, { error: "Video url is required." }),

    videoPublicId: z.string().min(1, { error: "Public Id is required." }),

    duration: z.coerce
      .number()
      .positive({ error: "Duration must be a positive number." }),

    isPublished: z
      .enum(["true", "false"], {
        error: "Please enter a valid status.",
      })
      .transform((val) => val === "true"),
  }),
});

const updateVideoSchema = z.object({
  params: z.object({
    videoId: z.string().regex(/^[a-fA-F0-9]{24}$/, {
      error: "Invalid Video Id format.",
    }),
  }),
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(2, { error: "Title must be at least 2 characters." })
        .max(100, { error: "Title cannot exceed 100 characters." })
        .optional(),

      description: z
        .string()
        .trim()
        .max(400, { error: "Description cannot exceed 400 characters." })
        .optional(),
    })
    .refine((data) => data.title || data.description, {
      message: "You must provide at least a title or a description to update.",
    }),
});

export type VideoSchema = z.infer<typeof videoRequestSchema>["body"];
export type UpdateVideoSchema = z.infer<typeof updateVideoSchema>["body"];
export type UpdateVideoParmasSchema = z.infer<
  typeof updateVideoSchema
>["params"];
