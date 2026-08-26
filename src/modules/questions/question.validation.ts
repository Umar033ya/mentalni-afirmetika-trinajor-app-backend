import { z } from "zod";
import { DIFFICULTY_XP, DUEL_CONFIG_LIMITS } from "../../config/constants";

export const difficultyEnum = z.enum(["easy", "normal", "hard", "very_hard"]);

export const operationEnum = z.enum([
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "mixed"
]);

const intIn = (limits: { min: number; max: number }, label: string) =>
  z
    .number({ invalid_type_error: `${label} must be a number` })
    .int(`${label} must be an integer`)
    .min(limits.min, `${label} must be at least ${limits.min}`)
    .max(limits.max, `${label} must be at most ${limits.max}`);

export const generationConfigSchema = z.object({
  operation: operationEnum,
  digitCount: intIn(DUEL_CONFIG_LIMITS.digitCount, "digitCount"),
  rows: intIn(DUEL_CONFIG_LIMITS.rows, "rows"),
  questionCount: intIn(DUEL_CONFIG_LIMITS.questionCount, "questionCount"),
  timePerQuestionMs: intIn(DUEL_CONFIG_LIMITS.timePerQuestionMs, "timePerQuestionMs"),
  difficulty: difficultyEnum
});

export type GenerationConfigPayload = z.infer<typeof generationConfigSchema>;

interface RawTimingInput {
  timePerQuestion?: unknown;
  timePerQuestionMs?: unknown;
}

/** Accepts legacy `timePerQuestion` (seconds, may be fractional like 0.7) and normalizes to ms. */
export function normalizeTiming<T extends Record<string, unknown>>(input: T): T {
  const raw = input as unknown as RawTimingInput;
  if (raw.timePerQuestion !== undefined && raw.timePerQuestionMs === undefined) {
    const seconds = Number(raw.timePerQuestion);
    if (!Number.isFinite(seconds)) {
      throw new Error("timePerQuestion must be a number");
    }
    const { timePerQuestion, ...rest } = raw as Record<string, unknown>;
    return { ...rest, timePerQuestionMs: Math.round(seconds * 1000) } as unknown as T;
  }
  return input;
}

export function describeDifficulty(difficulty: keyof typeof DIFFICULTY_XP): number {
  return DIFFICULTY_XP[difficulty];
}
