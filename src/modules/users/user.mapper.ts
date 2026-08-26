import type { UserRow } from "../../types/user.types";

export interface FrameEmbed {
  name: string;
  image_url: string | null;
}

export interface TitleEmbed {
  name: string;
}

export interface EmojiEmbed {
  emoji: string;
  name: string;
}

export interface UserQueryRow extends Omit<UserRow, "active_frame_id" | "active_title_id" | "active_emoji_id"> {
  active_frame_id: FrameEmbed | null;
  active_title_id: TitleEmbed | null;
  active_emoji_id: EmojiEmbed | null;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  level: number;
  xp: number;
  duelRating: number;
  wins: number;
  losses: number;
  avatarUrl: string | null;
  frame: FrameEmbed | null;
  title: string | null;
  emoji: string | null;
  isOnline: boolean;
  lastSeen: string | null;
  createdAt: string;
}

export interface SelfUserProfile extends PublicUserProfile {
  email: string;
  phone: string | null;
  role: "user" | "admin";
  totalXpEarned: number;
  correctAnswers: number;
  wrongAnswers: number;
  draws: number;
  longestWinStreak: number;
  currentWinStreak: number;
}

export const USER_SELECT_WITH_COSMETICS =
  "*, active_frame_id(name,image_url), active_title_id(name), active_emoji_id(emoji,name)";

export function toPublicUser(row: UserQueryRow): PublicUserProfile {
  return {
    id: row.id,
    username: row.username,
    level: row.level,
    xp: row.xp,
    duelRating: row.duel_rating,
    wins: row.wins,
    losses: row.losses,
    avatarUrl: row.avatar_url,
    frame: row.active_frame_id,
    title: row.active_title_id ? row.active_title_id.name : null,
    emoji: row.active_emoji_id ? row.active_emoji_id.emoji : null,
    isOnline: row.is_online,
    lastSeen: row.last_seen,
    createdAt: row.created_at
  };
}

export function toSelfUser(row: UserQueryRow): SelfUserProfile {
  return {
    ...toPublicUser(row),
    email: row.email,
    phone: row.phone,
    role: row.role,
    totalXpEarned: row.total_xp_earned,
    correctAnswers: row.correct_answers,
    wrongAnswers: row.wrong_answers,
    draws: row.draws,
    longestWinStreak: row.longest_win_streak,
    currentWinStreak: row.current_win_streak
  };
}
