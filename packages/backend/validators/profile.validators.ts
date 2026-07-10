import { z } from "zod/v4";

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  avatar_url: z.url("Invalid avatar URL").optional(),
});
