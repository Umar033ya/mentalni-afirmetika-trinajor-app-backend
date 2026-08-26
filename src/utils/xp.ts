import { DIFFICULTY_XP } from "../config/constants";
import type { Difficulty } from "../types/question.types";

export function xpForCorrectAnswer(difficulty: Difficulty): number {
  return DIFFICULTY_XP[difficulty] ?? DIFFICULTY_XP.normal;
}
