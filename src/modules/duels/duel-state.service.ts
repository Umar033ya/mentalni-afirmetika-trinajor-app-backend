import { db } from "../../config/database";
import { ANSWER_GRACE_MS, COUNTDOWN_MS, DUEL_DRAW_BONUS_XP, DUEL_WIN_BONUS_XP } from "../../config/constants";
import type { GenerationConfig } from "../../types/question.types";
import type {
  DuelPlayerRow,
  DuelRow,
  DuelStateResponse,
  DuelStatus
} from "./duel.types";
import { notificationService } from "../notifications/notification.service";
import { applyXp } from "../progression/xp.service";
import { DEFAULT_RATING } from "../../config/constants";
import { achievementService } from "../achievements/achievement.service";
import { challengeService } from "../challenges/challenge.service";
import { calculateElo } from "../../utils/rating";
import type { UserQueryRow } from "../users/user.mapper";
import { USER_SELECT_WITH_COSMETICS } from "../users/user.mapper";
import type { NotificationType } from "../../types/notification.types";

export interface PlayerWithUser extends DuelPlayerRow {
  user: UserQueryRow | null;
}

export function duelConfigFrom(duel: DuelRow): GenerationConfig {
  return {
    operation: duel.operation,
    digitCount: duel.digit_count,
    rows: duel.rows,
    questionCount: duel.question_count,
    timePerQuestionMs: duel.time_per_question_ms,
    difficulty: duel.difficulty as GenerationConfig["difficulty"],
    numberType: (duel as any).number_type ?? "oddiy"
  };
}

export function getDuelBonusXp(outcome: "win" | "loss" | "draw"): number {
  if (outcome === "win") return DUEL_WIN_BONUS_XP;
  if (outcome === "draw") return DUEL_DRAW_BONUS_XP;
  return 0;
}

export function isPlayerFinished(playerProgress: number, questionCount: number): boolean {
  return playerProgress >= questionCount;
}

export function getDuelOutcomeSummary(playerScore: number, opponentScore: number): {
  winnerId: string | null;
  isDraw: boolean;
  scoreDifference: number;
} {
  if (playerScore === opponentScore) {
    return { winnerId: null, isDraw: true, scoreDifference: 0 };
  }

  return {
    winnerId: playerScore > opponentScore ? "player1" : "player2",
    isDraw: false,
    scoreDifference: Math.abs(playerScore - opponentScore)
  };
}

export function totalDuelXp(playerTotalXp: number, outcome: "win" | "loss" | "draw"): number {
  // Award only the duel bonus (positive for win/draw). Losses currently carry no XP penalty.
  // applyXp expects an XP delta (positive or negative), so return the delta to apply.
  return getDuelBonusXp(outcome);
}

export function computeSchedule(questionCount: number, timePerQuestionMs: number) {
  const startAt = new Date(Date.now() + COUNTDOWN_MS);
  const totalMs = questionCount * timePerQuestionMs + ANSWER_GRACE_MS * 2;
  const endsAt = new Date(startAt.getTime() + totalMs);
  return { startAt: startAt.toISOString(), endsAt: endsAt.toISOString() };
}

/** Lazily advances READY -> ONGOING once the synchronized start time has passed. */
export async function advanceToOngoingIfDue(duel: DuelRow): Promise<DuelRow> {
  if (duel.status !== "READY" || !duel.start_at) return duel;
  if (new Date(duel.start_at).getTime() > Date.now()) return duel;

  const { data, error } = await db
    .from("duels")
    .update({ status: "ONGOING" })
    .eq("id", duel.id)
    .eq("status", "READY")
    .select("*")
    .maybeSingle<DuelRow>();
  if (error) throw error;
  if (data) {
    await notifyPlayers(duel.id, "DUEL_STARTED", "Duel started!", "Good luck! Answer as fast as you can.");
    return data;
  }
  return duel;
}

export async function loadPlayers(duelId: string): Promise<PlayerWithUser[]> {
  const { data, error } = await db
    .from("duel_players")
    .select(`*, user:user_id(${USER_SELECT_WITH_COSMETICS})`)
    .eq("duel_id", duelId)
    .order("joined_at");
  if (error) throw error;
  return (data ?? []) as unknown as PlayerWithUser[];
}

async function notifyPlayers(
  duelId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  const players = await loadPlayers(duelId);
  await notificationService.createMany(
    players.map((p) => ({ userId: p.user_id, type, title, message, data }))
  );
}

/**
 * Finalizes a finished duel exactly once (atomic claim via `finished_at IS NULL`).
 * Computes winner, applies XP bonuses, Elo rating changes, stats, history rows and
 * notifications for both players.
 */
export async function maybeFinalize(duel: DuelRow): Promise<DuelRow> {
  if (duel.status !== "ONGOING") return duel;

  const players = await loadPlayers(duel.id);
  if (players.length < 2) return duel;

  const now = Date.now();
  const expired = duel.ends_at ? new Date(duel.ends_at).getTime() <= now : false;
  const allFinished = players.every((p) => p.finished_at !== null);
  if (!expired && !allFinished) return duel;

  // Atomic claim: only one concurrent request performs the finalization.
  const claimed = await db
    .from("duels")
    .update({ status: "COMPLETED", finished_at: new Date(now).toISOString() })
    .eq("id", duel.id)
    .is("finished_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (!claimed.data) return duel;

  const [p1, p2] = players;
  const answersRes = await db.from("duel_answers").select("user_id,is_correct").eq("duel_id", duel.id);
  const answers = (answersRes.data ?? []) as Array<{ user_id: string; is_correct: boolean }>;

  const scoreOf = (userId: string) => answers.filter((a) => a.user_id === userId && a.is_correct).length;
  const wrongOf = (userId: string) => answers.filter((a) => a.user_id === userId && !a.is_correct).length;

  const s1 = scoreOf(p1.user_id);
  const s2 = scoreOf(p2.user_id);

  const summary = getDuelOutcomeSummary(s1, s2);
  let winnerId: string | null = summary.winnerId;
  let isDraw = summary.isDraw;

  await db.from("duels").update({ winner_id: winnerId, is_draw: isDraw }).eq("id", duel.id);

  const scoreDifference = summary.scoreDifference;

  const results = await Promise.all(
    players.map(async (player) => {
      const opponent = player.user_id === p1.user_id ? p2 : p1;
      const outcome: "win" | "loss" | "draw" =
        isDraw ? "draw" : winnerId === player.user_id ? "win" : "loss";

      const bonusXp = getDuelBonusXp(outcome);
      const totalAwardXp = totalDuelXp(player.total_xp, outcome);
      const xpResult = await applyXp(player.user_id, totalAwardXp, "duel", {
        duelId: duel.id,
        description: outcome === "win" ? "Duel victory" : outcome === "draw" ? "Duel draw" : "Duel participation"
      });

      // Elo is computed symmetrically from the ratings snapshotted at join time.
      const baseMine = player.rating_before ?? player.user?.duel_rating ?? DEFAULT_RATING;
      const baseOpp = opponent.rating_before ?? opponent.user?.duel_rating ?? DEFAULT_RATING;
      const eloFinal = calculateElo({
        playerRating: baseMine,
        opponentRating: baseOpp,
        outcome,
        scoreDifference: outcome === "draw" ? 0 : scoreDifference
      });

      const correct = scoreOf(player.user_id);
      const wrong = wrongOf(player.user_id);

      const streakDelta =
        outcome === "win"
          ? {
              current_win_streak: (player.user?.current_win_streak ?? 0) + 1
            }
          : { current_win_streak: 0 };

      const longestStreak =
        outcome === "win"
          ? Math.max(player.user?.longest_win_streak ?? 0, streakDelta.current_win_streak)
          : player.user?.longest_win_streak ?? 0;

      const winLossDraw =
        outcome === "win"
          ? { wins: (player.user?.wins ?? 0) + 1 }
          : outcome === "loss"
            ? { losses: (player.user?.losses ?? 0) + 1 }
            : { draws: (player.user?.draws ?? 0) + 1 };

      await db
        .from("users")
        .update({
          ...winLossDraw,
          ...streakDelta,
          longest_win_streak: longestStreak,
          duel_rating: eloFinal.newRating,
          correct_answers: (player.user?.correct_answers ?? 0) + correct,
          wrong_answers: (player.user?.wrong_answers ?? 0) + wrong
        })
        .eq("id", player.user_id);

      await db
        .from("duel_players")
        .update({
          rating_before: baseMine,
          rating_after: eloFinal.newRating
        })
        .eq("id", player.id);

      await db.from("rating_history").insert({
        user_id: player.user_id,
        duel_id: duel.id,
        old_rating: baseMine,
        new_rating: eloFinal.newRating,
        delta: eloFinal.delta,
        reason: outcome
      });

      await notificationService.create({
        userId: player.user_id,
        type: "DUEL_COMPLETED",
        title:
          outcome === "win"
            ? "Victory!"
            : outcome === "draw"
              ? "Duel drawn"
              : "Duel lost",
        message: `Final score ${correct} vs ${
          opponent.user_id === p1.user_id ? s1 : s2
        }. XP earned: ${totalAwardXp}, Rating ${eloFinal.delta >= 0 ? "+" : ""}${eloFinal.delta}`,
        data: { duelId: duel.id, outcome, score: correct }
      });

      if (outcome === "win") {
        await challengeService.recordActivity(player.user_id, "duel_wins", 1);
      }

      return { userId: player.user_id, xp: xpResult, elo: eloFinal };
    })
  );

  const { error: matchError } = await db.from("match_history").insert({
    type: "duel",
    duel_id: duel.id,
    player1_id: p1.user_id,
    player2_id: p2.user_id,
    winner_id: winnerId,
    is_draw: isDraw,
    player1_score: s1,
    player2_score: s2,
    played_at: new Date(now).toISOString()
  });
  if (matchError) {
    // eslint-disable-next-line no-console
    console.error("[duels] failed writing match_history:", matchError.message);
  }

  await Promise.all([
    achievementService.evaluate(p1.user_id),
    achievementService.evaluate(p2.user_id)
  ]);

  void results;

  const refreshed = await db.from("duels").select("*").eq("id", duel.id).maybeSingle<DuelRow>();
  return refreshed.data ?? { ...duel, status: "COMPLETED" as DuelStatus, winner_id: winnerId, is_draw: isDraw };
}

export function buildStateResponse(
  duel: DuelRow,
  players: PlayerWithUser[],
  userId: string
): DuelStateResponse {
  const nowIso = new Date().toISOString();
  const serverTimeMs = Date.now();
  const startMs = duel.start_at ? new Date(duel.start_at).getTime() : null;
  const endMs = duel.ends_at ? new Date(duel.ends_at).getTime() : null;

  const countdownMs =
    duel.status === "READY" && startMs !== null ? Math.max(0, startMs - serverTimeMs) : null;
  const timeRemainingMs =
    duel.status === "ONGOING" && endMs !== null ? Math.max(0, endMs - serverTimeMs) : null;

  const me = players.find((p) => p.user_id === userId);
  const answeredByMe = me ? me.correct_answers + me.wrong_answers : 0;

  return {
    duelId: duel.id,
    status: duel.status,
    mode: duel.mode,
    config: duelConfigFrom(duel),
    startAt: duel.start_at,
    endsAt: duel.ends_at,
    serverTime: nowIso,
    countdownMs,
    timeRemainingMs,
    players: players.map((p) => ({
      userId: p.user_id,
      username: p.user?.username ?? "Unknown",
      level: p.user?.level ?? 1,
      duelRating: p.rating_after ?? p.rating_before ?? p.user?.duel_rating ?? DEFAULT_RATING,
      avatarUrl: p.user?.avatar_url ?? null,
      frame: p.user?.active_frame_id?.name ?? null,
      title: p.user?.active_title_id?.name ?? null,
      score: p.score,
      correctAnswers: p.correct_answers,
      wrongAnswers: p.wrong_answers,
      totalXp: p.total_xp,
      finished: p.finished_at !== null
    })),
    winnerId: duel.winner_id,
    isDraw: duel.is_draw,
    you: {
      userId,
      role: duel.creator_id === userId ? "creator" : "opponent",
      answeredQuestions: answeredByMe,
      canAnswer: duel.status === "ONGOING" && me?.finished_at === null
    }
  };
}

export const duelStateService = {
  computeSchedule,
  advanceToOngoingIfDue,
  maybeFinalize,
  buildStateResponse,
  loadPlayers
};
