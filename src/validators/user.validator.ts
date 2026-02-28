import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    fullName: z
      .string({
        error: (iss) =>
          !iss.input ? "Full name is required" : "Invalid input",
      })
      .trim()
      .min(3, "Full name must be at least 3 characters"),

    email: z
      .email({
        error: (iss) =>
          iss.input === undefined
            ? "Email is required"
            : "Invalid email format",
      })
      .toLowerCase()
      .trim(),

    username: z
      .string({
        error: (iss) =>
          iss.input === undefined ? "Username is required" : "Invalid input",
      })
      .trim()
      .min(3, "Username must be at least 3 characters"),

    password: z
      .string({
        error: (iss) =>
          iss.input === undefined ? "Password is required" : "Invalid input",
      })
      .min(8, "Password must be 8+ characters")
      .max(16, "Password cannot be more than 16 characters"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .email({
        error: (iss) =>
          iss.input === undefined
            ? "Email is required"
            : "Invalid email format",
      })
      .toLowerCase()
      .trim(),
    password: z
      .string({
        error: (iss) =>
          iss.input === undefined ? "Password is required" : "Invalid input",
      })
      .min(8, "Password must be at least 8 characters")
      .max(16, "Password must be less than 17 characters"),
  }),
});

export const updateUserDetailSchema = z.object({
  body: z.object({
    username: z
      .string({
        error: (iss) =>
          iss.input === undefined ? "Username is required" : "Invalid input",
      })
      .trim(),
  }),
});

export const userParamSchema = z.object({
  params: z.object({
    username: z
      .string({
        error: (iss) =>
          iss.input === undefined ? "Username is required" : "Invalid input",
      })
      .trim(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z
      .string({
        error: (iss) =>
          iss.input === undefined
            ? "Old Password is required"
            : "Invalid input",
      })
      .min(8, "Password must be at least 8 characters")
      .max(16, "Password must be less than 17 characters"),

    newPassword: z
      .string({
        error: (iss) =>
          iss.input === undefined
            ? "New Password is required"
            : "Invalid input",
      })
      .min(8, "Password must be at least 8 characters")
      .max(16, "Password must be less than 17 characters"),
  }),
});

export type RegisterUserSchema = z.infer<typeof registerSchema>["body"];
export type LoginUserSchema = z.infer<typeof loginSchema>["body"];
export type UpdateUserSchema = z.infer<typeof updateUserDetailSchema>["body"];
export type UserParamSchema = z.infer<typeof userParamSchema>["params"];
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>["body"];
