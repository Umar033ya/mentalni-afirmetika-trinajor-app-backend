export interface RewardRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  reward_type: string;
  ref_code: string | null;
  required_level: number | null;
  required_wins: number | null;
  is_pro_only: boolean;
  is_active: boolean;
  created_at: string;
}
