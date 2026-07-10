import { z } from "zod/v4";

export const trackUsageSchema = z.object({
  feature: z.string().min(1, "Feature name is required").max(100),
});

export const queryUsageSchema = z.object({
  feature: z.string().optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});
