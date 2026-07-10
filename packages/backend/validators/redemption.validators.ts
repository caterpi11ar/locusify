import { z } from "zod/v4";

export const redeemCodeSchema = z.object({
  code: z.string().min(1, "Redemption code is required").trim(),
});

export const validateCodeSchema = z.object({
  code: z.string().min(1, "Redemption code is required").trim(),
});
