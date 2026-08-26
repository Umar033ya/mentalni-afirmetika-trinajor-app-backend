export interface UserRow {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  password_hash: string;
  role: "user" | "admin";
  level: number;
  xp: number;
  total_xp_earned: number;
  wins: number;
  losses: number;
  draws: number;
  correct_answers: number;
  wrong_answers: number;
  duel_rating: number;
  longest_win_streak: number;
  current_win_streak: number;
  avatar_url: string | null;
  active_frame_id: string | null;
  active_title_id: string | null;
  active_emoji_id: string | null;
  is_online: boolean;
  is_banned: boolean;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface FrameRef {
  name: string;
  image_url: string | null;
}

export interface TitleRef {
  name: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  level: number;
  xp: number;
  duel_rating: number;
  is_banned: boolean;
}

export interface ProfileRow {
  user_id: string;
  bio: string | null;
  country: string | null;
  birthday: string | null;
  created_at: string;
  updated_at: string;
}
