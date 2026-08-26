export interface AchievementRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  target_type: string;
  target_value: number;
  reward_xp: number;
  is_active: boolean;
  created_at: string;
}

export interface UserAchievementRow {
  id: string;
  user_id: string;
  achievement_id: string;
  progress_at_unlock: number | null;
  unlocked_at: string;
}
