import * as z from "zod";

export const usernameRegex = /^[a-zA-Z0-9_]+$/;

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long" })
    .max(20, { message: "Username cannot exceed 20 characters" })
    .regex(usernameRegex, {
      message: "Username can only contain letters, numbers, and underscores",
    }),
  fullName: z
    .string()
    .max(50, { message: "Full name cannot exceed 50 characters" })
    .optional(),
  bio: z
    .string()
    .max(160, { message: "Bio cannot exceed 160 characters" })
    .optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>; 