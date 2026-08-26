import { z } from "zod";
import { generationConfigSchema, normalizeTiming } from "../questions/question.validation";

export const startSessionSchema = z
  .object({})
  .passthrough()
  .transform((v) => normalizeTiming(v as Record<string, unknown>))
  .pipe(generationConfigSchema);

export type StartSessionPayload = z.infer<typeof startSessionSchema>;

export const practiceAnswerSchema = z.object({
  questionNumber: z.number().int().min(1),
  answer: z.number().finite(),
  responseTimeMs: z.number().int().min(0).max(600000).optional(),
  isCorrect: z.boolean().optional(),
  operands: z.array(z.number().finite()).max(30).optional()
});

export type PracticeAnswerPayload = z.infer<typeof practiceAnswerSchema>;
