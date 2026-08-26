import { db } from "../../config/database";
import { DUEL_CONFIG_LIMITS, OPERATIONS } from "../../config/constants";
import type { GenerationConfig } from "../../types/question.types";
import type { QuestionConfigRow } from "../../types/question.types";
import { difficultyService } from "./difficulty.service";

async function listPresets(): Promise<QuestionConfigRow[]> {
  const { data, error } = await db
    .from("question_configs")
    .select("*")
    .order("is_default", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuestionConfigRow[];
}

async function getGenerationRules() {
  const difficulties = await difficultyService.listDifficulties();
  return {
    operations: OPERATIONS,
    limits: DUEL_CONFIG_LIMITS,
    difficulties: difficulties.map((d) => ({
      difficulty: d.difficulty,
      xpPerCorrect: d.xp_per_correct,
      description: d.description
    })),
    note: "Questions are generated locally per player by the Expo app using this configuration."
  };
}

async function validateAndNormalize(input: GenerationConfig): Promise<GenerationConfig> {
  // Zod validation happens at the route layer; here we enforce cross-field sanity rules.
  if (input.operation === "division" && input.digitCount < 1) {
    throw new Error("Division requires at least 1 digit");
  }
  if (input.rows * input.questionCount > 5000) {
    throw new Error("Configuration is too large");
  }
  return input;
}

async function validateConfigPayload(config: GenerationConfig) {
  try {
    await validateAndNormalize(config);
    return { valid: true as const, normalized: config, errors: [] as string[] };
  } catch (err) {
    return {
      valid: false as const,
      normalized: null,
      errors: [err instanceof Error ? err.message : "Invalid configuration"]
    };
  }
}

export const questionConfigService = { listPresets, getGenerationRules, validateConfigPayload };
