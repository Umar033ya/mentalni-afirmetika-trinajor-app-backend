import { db } from "../../config/database";
import type { PageParams } from "../../utils/pagination";
import { buildPaginationMeta } from "../../utils/pagination";
import type { UserQueryRow } from "../users/user.mapper";
import { USER_SELECT_WITH_COSMETICS, toPublicUser } from "../users/user.mapper";

export async function getMyStatistics(userId: string) {
  const [userRes, matchesRes, practiceRes, challengesRes, achievementsRes] = await Promise.all([
    db.from("users").select(USER_SELECT_WITH_COSMETICS).eq("id", userId).maybeSingle<UserQueryRow>(),
    db
      .from("match_history")
      .select("id", { count: "exact", head: true })
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`),
    db
      .from("practice_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    db
      .from("challenge_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("claimed", true),
    db
      .from("user_achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
  ]);

  if (userRes.error || !userRes.data) throw userRes.error ?? new Error("User not found");
  const u = toPublicUser(userRes.data);

  const totalAnswers = userRes.data.correct_answers + userRes.data.wrong_answers;
  const totalGames = u.wins + u.losses + userRes.data.draws;

  return {
    profile: u,
    stats: {
      level: u.level,
      xp: u.xp,
      totalXpEarned: userRes.data.total_xp_earned,
      duelRating: u.duelRating,
      wins: u.wins,
      losses: u.losses,
      draws: userRes.data.draws,
      winRate: totalGames > 0 ? Math.round((u.wins / totalGames) * 100) : 0,
      correctAnswers: userRes.data.correct_answers,
      wrongAnswers: userRes.data.wrong_answers,
      accuracy: totalAnswers > 0 ? Math.round((userRes.data.correct_answers / totalAnswers) * 100) : 0,
      longestWinStreak: userRes.data.longest_win_streak,
      currentWinStreak: userRes.data.current_win_streak,
      completedDuels: matchesRes.count ?? 0,
      practiceSessionsCompleted: practiceRes.count ?? 0,
      challengesCompleted: challengesRes.count ?? 0,
      achievementsUnlocked: achievementsRes.count ?? 0
    }
  };
}

export async function getDuelHistory(userId: string, page: PageParams) {
  const { data, error, count } = await db
    .from("duel_players")
    .select(
      `*, duel:duel_id(id,status,mode,operation,digit_count,rows,question_count,time_per_question_ms,difficulty,winner_id,is_draw,finished_at)`,
      { count: "exact" }
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .range(page.from, page.to);
  if (error) throw error;

  const items = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
    const duel = row.duel as Record<string, unknown> | null;
    return {
      duelId: row.duel_id,
      score: row.score,
      correctAnswers: row.correct_answers,
      wrongAnswers: row.wrong_answers,
      xpEarned: row.total_xp,
      ratingBefore: row.rating_before,
      ratingAfter: row.rating_after,
      won:
        duel && duel.is_draw === false && duel.winner_id !== null ? duel.winner_id === userId : null,
      duel
    };
  });

  return { items, pagination: buildPaginationMeta(page, count) };
}

export const statisticsService = { getMyStatistics, getDuelHistory };
