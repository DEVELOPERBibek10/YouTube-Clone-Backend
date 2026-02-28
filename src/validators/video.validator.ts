import { z } from "zod";

export const videoRequestSchema = z.object({
  body: z.object({
    title: z
      .string({
        error: (iss) =>
          iss.input === undefined
            ? "Title is required"
            : "Invalid title format",
      })
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(100, "Title cannot exceed 100 characters"),

    description: z
      .string({
        error: (iss) =>
          iss.input === undefined
            ? "Description is required"
            : "Invalid description",
      })
      .trim()
      .max(400, "Description cannot exceed 400 characters"),

    videoUrl: z.url({
      error: (iss) =>
        iss.input === undefined ? "url is required" : "Invalid url",
    }),

    videoPublicId: z.string({
      error: (iss) =>
        iss.input === undefined ? "Public Id is required" : "Invalid pubicId",
    }),

    duration: z.coerce.number().positive("Duration must be a positive number"),

    isPublished: z
      .enum(["true", "false"], {
        error: (iss) =>
          iss.input === undefined
            ? "Publish status is required"
            : "Invalid status value",
      })
      .transform((val) => val === "true"),
  }),
});

const updateVideoSchema = z.object({
  params: z.object({
    videoId: z
      .string({
        error: (iss) =>
          iss.input === undefined ? "Video Id is required." : "Invalid input.",
      })
      .regex(/^[a-fA-F0-9]{24}$/, {
        error: "Invalid MongoDB ObjectId",
      }),
  }),
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(2, "Title must be at least 2 characters")
        .max(100, "Title cannot exceed 100 characters")
        .optional(),

      description: z
        .string()
        .trim()
        .max(400, "Description cannot exceed 400 characters")
        .optional(),
    })
    .refine((data) => data.title || data.description, {
      message: "You must provide at least a title or a description to update",
    }),
});

export type VideoSchema = z.infer<typeof videoRequestSchema>["body"];
export type UpdateVideoSchema = z.infer<typeof updateVideoSchema>["body"];
export type UpdateVideoParmasSchema = z.infer<
  typeof updateVideoSchema
>["params"];
