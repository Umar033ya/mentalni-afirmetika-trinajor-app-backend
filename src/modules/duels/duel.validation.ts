import { z } from "zod";
import { generationConfigSchema, normalizeTiming } from "../questions/question.validation";

export const duelModeEnum = z.enum(["public", "private", "challenge"]);

export const createDuelSchema = z
  .object({})
  .passthrough()
  .transform((v) => normalizeTiming(v as Record<string, unknown>))
  .pipe(
    generationConfigSchema.extend({
      mode: duelModeEnum.default("public"),
      opponentId: z.string().uuid().optional(),
      // Optional duel-specific number type
      numberType: z.enum(["oddiy", "kichik", "dost", "katta"]).default("oddiy"),
      // Optional creator seed to allow per-player deterministic generation
      creatorSeed: z.string().optional()
    })
  )
  .refine((v) => v.mode !== "challenge" || !!v.opponentId, {
    message: "challenge duels require an opponentId"
  });

export type CreateDuelPayload = z.infer<typeof createDuelSchema>;

export const duelAnswerSchema = z
  .object({
    questionNumber: z.number().int().min(1),
    answer: z.number().finite(),
    clientTimeMs: z.number().int().min(0).max(3600000).optional(),
    responseTimeMs: z.number().int().min(0).max(600000).optional()
  })
  .strict();

export type DuelAnswerPayload = z.infer<typeof duelAnswerSchema>;

export const joinDuelSchema = z.object({
  seed: z.string().optional(),
  numberType: z.enum(["oddiy", "kichik", "dost", "katta"]).optional()
});

export const duelListQuerySchema = z.object({
  scope: z.enum(["mine", "all"]).default("all"),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});
