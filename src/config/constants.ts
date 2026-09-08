import type { Difficulty } from "../types/question.types";

export const API_VERSION = "v1";

export const DIFFICULTY_XP: Record<Difficulty, number> = {
  easy: 3,
  normal: 5,
  hard: 8,
  very_hard: 10
};

export const OPERATIONS = ["addition", "subtraction", "multiplication", "division", "mixed"] as const;

export const DUEL_CONFIG_LIMITS = {
  digitCount: { min: 1, max: 6 },
  rows: { min: 1, max: 20 },
  questionCount: { min: 1, max: 50 },
  timePerQuestionMs: { min: 200, max: 10000 }
};

export const COUNTDOWN_MS = 5000;
export const ANSWER_GRACE_MS = 2000;
export const MIN_RESPONSE_TIME_MS = 120;
export const TOTAL_TIME_TOLERANCE = 1.25;
export const EARLY_ANSWER_TOLERANCE = 0.5;

export const DUEL_WAITING_TTL_MS = 30 * 60 * 1000;

export const DEFAULT_RATING = 0;
export const RATING_FLOOR = 100;
export const RATING_K_FACTOR = 32;
export const CLOSE_MATCH_DIVIDER = 2;

export const DUEL_WIN_BONUS_XP = 15;
export const DUEL_DRAW_BONUS_XP = 5;

export const LEVEL_BASE_REQUIREMENTS = [100, 130, 175, 230, 300, 380, 470, 570];
export const LEVEL_GROWTH = 1.22;
export const MAX_LEVEL = 200;

export const ONLINE_WINDOW_MS = 90 * 1000;
export const PRESENCE_TOUCH_INTERVAL_MS = 30 * 1000;

export const SUBSCRIPTION_DEFAULT_DAYS = 30;

export const CHAT_MAX_MESSAGE_LENGTH = 200;
export const CHAT_MESSAGE_TYPES = ["text", "emoji"] as const;

export const NOTIFICATION_TYPES = [
  "DUEL_CHALLENGE",
  "DUEL_ACCEPTED",
  "DUEL_DECLINED",
  "DUEL_STARTED",
  "DUEL_COMPLETED",
  "LEVEL_UP",
  "TITLE_UNLOCKED",
  "FRAME_UNLOCKED",
  "EMOJI_UNLOCKED",
  "ACHIEVEMENT_UNLOCKED",
  "SUBSCRIPTION_EXPIRING",
  "REWARD_CLAIMED",
  "SYSTEM"
] as const;

export const PAGINATION_DEFAULTS = { page: 1, pageSize: 20 };
export const PAGINATION_MAX_PAGE_SIZE = 100;

export const BCRYPT_ROUNDS = 12;
