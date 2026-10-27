import { z } from "zod/v4";

export const discoverySources = [
  "friend_colleague", "search", "x", "linkedin", "youtube", "github",
  "bilibili", "douyin", "xiaohongshu", "other_social", "blog_newsletter",
  "ai_assistant", "work", "offline_event", "dont_remember", "other",
] as const;

export const discoverySourceSchema = z.union([
  z.strictObject({ source: z.enum(discoverySources) }),
  z.strictObject({ status: z.literal("skipped") }),
]);
