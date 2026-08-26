export interface ChallengeRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  challenge_date: string;
  target_type: "correct_answers" | "practice_sessions" | "duel_wins" | string;
  target_value: number;
  reward_xp: number;
  is_active: boolean;
  created_at: string;
}

export interface ChallengeProgressRow {
  id: string;
  user_id: string;
  challenge_id: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  completed_at: string | null;
  updated_at: string;
}
