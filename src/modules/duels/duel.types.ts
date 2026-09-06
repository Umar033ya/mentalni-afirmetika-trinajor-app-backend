import type { GenerationConfig } from "../../types/question.types";

export type DuelStatus = "WAITING" | "READY" | "COUNTDOWN" | "ONGOING" | "COMPLETED" | "CANCELLED" | "DECLINED";
export type DuelMode = "public" | "private" | "challenge";

export interface DuelRow {
  id: string;
  creator_id: string;
  opponent_id: string | null;
  status: DuelStatus;
  mode: DuelMode;
  operation: string;
  digit_count: number;
  rows: number;
  question_count: number;
  time_per_question_ms: number;
  difficulty: string;
  start_at: string | null;
  ends_at: string | null;
  finished_at: string | null;
  winner_id: string | null;
  is_draw: boolean;
  created_at: string;
}

export interface DuelPlayerRow {
  id: string;
  duel_id: string;
  user_id: string;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  total_xp: number;
  rating_before: number | null;
  rating_after: number | null;
  finished_at: string | null;
  joined_at: string;
}

export interface DuelAnswerRow {
  id: string;
  duel_id: string;
  user_id: string;
  question_number: number;
  answer: number;
  is_correct: boolean;
  verified_by_server: boolean;
  response_time_ms: number | null;
  answered_at: string;
}

export interface DuelCreatorInfo {
  id: string;
  username: string;
  level: number;
  xp: number;
  duel_rating: number;
  avatar_url: string | null;
  is_online: boolean;
}

export interface LobbyDuelItem {
  id: string;
  status: DuelStatus;
  mode: DuelMode;
  creator: DuelCreatorInfo;
  config: {
    operation: string;
    digitCount: number;
    rows: number;
    questionCount: number;
    timePerQuestionMs: number;
    difficulty: string;
  };
  playersCount: number;
  createdAt: string;
}

export interface DuelPlayerState {
  userId: string;
  username: string;
  level: number;
  duelRating: number;
  avatarUrl: string | null;
  frame: string | null;
  title: string | null;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalXp: number;
  finished: boolean;
}

export interface DuelStateResponse {
  duelId: string;
  status: DuelStatus;
  mode: DuelMode;
  config: GenerationConfig;
  startAt: string | null;
  endsAt: string | null;
  serverTime: string;
  countdownMs: number | null;
  timeRemainingMs: number | null;
  players: DuelPlayerState[];
  winnerId: string | null;
  isDraw: boolean;
  you: {
    userId: string;
    role: "creator" | "opponent";
    answeredQuestions: number;
    canAnswer: boolean;
  };
}

export interface AnswerRequestPayload {
  questionNumber: number;
  answer: number;
  clientTimeMs?: number;
  responseTimeMs?: number;
}

export interface AnswerResult {
  isCorrect: boolean;
  verifiedByServer: boolean;
  score: number;
  xpEarned: number;
  nextQuestion: number | null;
  duelFinished: boolean;
}
