import * as z from "zod";

export const postSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Post content is required" })
    .max(500, { message: "Post content cannot exceed 500 characters" }),
  imageUrl: z.string().url().optional().nullable(),
});

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Comment content is required" })
    .max(200, { message: "Comment content cannot exceed 200 characters" }),
});

export type PostFormValues = z.infer<typeof postSchema>;
export type CommentFormValues = z.infer<typeof commentSchema>; 