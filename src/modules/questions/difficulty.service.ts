import { db } from "../../config/database";
import { DIFFICULTY_XP } from "../../config/constants";
import type { Difficulty, DifficultyConfigRow } from "../../types/question.types";

const FALLBACK: DifficultyConfigRow[] = (Object.keys(DIFFICULTY_XP) as Difficulty[]).map((difficulty) => ({
  id: difficulty,
  difficulty,
  xp_per_correct: DIFFICULTY_XP[difficulty],
  time_multiplier: 1,
  description: null
}));

async function listDifficulties(): Promise<DifficultyConfigRow[]> {
  const { data, error } = await db.from("difficulty_configs").select("*").order("xp_per_correct");
  if (error || !data || data.length === 0) return FALLBACK;
  return data as DifficultyConfigRow[];
}

async function getXpForDifficulty(difficulty: Difficulty): Promise<number> {
  const rows = await listDifficulties();
  const match = rows.find((row) => row.difficulty === difficulty);
  return match ? match.xp_per_correct : DIFFICULTY_XP[difficulty];
}

export const difficultyService = { listDifficulties, getXpForDifficulty };
