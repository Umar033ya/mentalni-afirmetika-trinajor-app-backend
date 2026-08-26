export type NotificationType =
  | "DUEL_CHALLENGE"
  | "DUEL_ACCEPTED"
  | "DUEL_DECLINED"
  | "DUEL_STARTED"
  | "DUEL_COMPLETED"
  | "LEVEL_UP"
  | "TITLE_UNLOCKED"
  | "FRAME_UNLOCKED"
  | "EMOJI_UNLOCKED"
  | "ACHIEVEMENT_UNLOCKED"
  | "SUBSCRIPTION_EXPIRING"
  | "REWARD_CLAIMED"
  | "SYSTEM";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}
