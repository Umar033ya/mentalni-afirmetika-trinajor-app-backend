import { z } from "zod";

export const subscribeSchema = z.object({
  plan: z.literal("PRO"),
  days: z.number().int().min(1).max(3650).optional()
});

export type SubscribePayload = z.infer<typeof subscribeSchema>;
