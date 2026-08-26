import { z } from "zod";

export const completeChallengeSchema = z.object({
  result: z.enum(["win", "lose", "draw"]).optional()
});

export type CompleteChallengePayload = z.infer<typeof completeChallengeSchema>;
