export type Difficulty = "easy" | "normal" | "hard" | "very_hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard", "very_hard"];

export interface DifficultyConfigRow {
  id: string;
  difficulty: Difficulty;
  xp_per_correct: number;
  time_multiplier: number;
  description: string | null;
}

export interface QuestionConfigRow {
  id: string;
  name: string;
  operation: string;
  digit_count: number;
  rows: number;
  question_count: number;
  time_per_question_ms: number;
  difficulty: Difficulty;
  is_default: boolean;
  created_at: string;
}

export interface GenerationConfig {
  operation: string;
  digitCount: number;
  rows: number;
  questionCount: number;
  timePerQuestionMs: number;
  difficulty: Difficulty;
  numberType?: "oddiy" | "kichik" | "dost" | "katta";
}
