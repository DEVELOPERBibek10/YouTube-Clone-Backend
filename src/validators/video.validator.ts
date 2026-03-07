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
      .max(300, { error: "Description must be less than 300 characters" })
      .optional(),

    videoUrl: z.string().trim().min(1, { error: "Video url is required." }),

    videoPublicId: z.string().min(1, { error: "Public Id is required." }),

    duration: z.coerce
      .number()
      .min(1, { error: "Video duration is required." })
      .positive({ error: "Duration must be a positive number." }),

    isPublished: z
      .enum(["true", "false"], {
        error: "Please provide a valid status",
      })
      .transform((val) => val === "true"),
  }),
});

export const updateVideoSchema = z.object({
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
      error: "You must provide at least a title or a description to update.",
    }),
});

export const updateVideoParamsSchema = z.object({
  params: z.object({
    videoId: z.string().regex(/^[a-fA-F0-9]{24}$/, {
      error: "Invalid Video Id format.",
    }),
  }),
});

export const videoQuerySchema = z.object({
  query: z.object({
    page: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.number().min(1).default(1)
    ),
    limit: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.number().min(1).max(50).default(10)
    ),
    sortBy: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .enum(["createdAt", "views"], {
          error: "Please provide a valid sorting parameter.",
        })
        .default("createdAt")
    ),
    sortType: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .enum(["asc", "dsc"], {
          error: "Please provide a valid sorting order.",
        })
        .default("asc")
    ),
    searchText: z
      .string()
      .trim()
      .max(50, {
        error: "Search Text cannot exceed 50 characters",
      })
      .optional(),
  }),
});

export type VideoSchema = z.infer<typeof videoRequestSchema>["body"];
export type UpdateVideoSchema = z.infer<typeof updateVideoSchema>["body"];
export type UpdateVideoParamsSchema = z.infer<
  typeof updateVideoParamsSchema
>["params"];
export type VideoQuerySchema = z.infer<typeof videoQuerySchema>["query"];
