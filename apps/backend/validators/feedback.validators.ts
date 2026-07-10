import { z } from "zod/v4";

export const createFeedbackSchema = z
  .object({
    rating: z.int().min(1).max(5),
    description: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) => data.rating > 2 || (data.description !== undefined && data.description.trim().length > 0),
    { message: "Description is required when rating is 2 or below", path: ["description"] },
  );
