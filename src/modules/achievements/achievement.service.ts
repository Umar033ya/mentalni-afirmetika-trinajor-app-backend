import { db } from "../../config/database";
import type { AchievementRow } from "../../types/achievements.types";
import { notificationService } from "../notifications/notification.service";

export interface UserStatsSnapshot {
  wins: number;
  level: number;
  correct_answers: number;
  longest_win_streak: number;
  total_xp_earned: number;
  duels_played: number;
  practice_sessions: number;
  challenges_completed: number;
}

async function loadStats(userId: string): Promise<UserStatsSnapshot> {
  const [userRes, duelsRes, practiceRes, challengesRes] = await Promise.all([
    db
      .from("users")
      .select("wins,level,correct_answers,longest_win_streak,total_xp_earned")
      .eq("id", userId)
      .single<{
        wins: number;
        level: number;
        correct_answers: number;
        longest_win_streak: number;
        total_xp_earned: number;
      }>(),
    db.from("match_history").select("id", { count: "exact", head: true }).or(`player1_id.eq.${userId},player2_id.eq.${userId}`),
    db
      .from("practice_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    db
      .from("challenge_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("claimed", true)
  ]);

  if (userRes.error || !userRes.data) throw userRes.error ?? new Error("User not found");
  return {
    wins: userRes.data.wins,
    level: userRes.data.level,
    correct_answers: userRes.data.correct_answers,
    longest_win_streak: userRes.data.longest_win_streak,
    total_xp_earned: userRes.data.total_xp_earned,
    duels_played: duelsRes.count ?? 0,
    practice_sessions: practiceRes.count ?? 0,
    challenges_completed: challengesRes.count ?? 0
  };
}

function metricValue(stats: UserStatsSnapshot, targetType: string): number {
  switch (targetType) {
    case "wins":
      return stats.wins;
    case "level":
      return stats.level;
    case "correct_answers":
      return stats.correct_answers;
    case "win_streak":
      return stats.longest_win_streak;
    case "duels_played":
      return stats.duels_played;
    case "practice_sessions":
      return stats.practice_sessions;
    case "challenges_completed":
      return stats.challenges_completed;
    case "total_xp":
      return stats.total_xp_earned;
    default:
      return 0;
  }
}

/**
 * Evaluates all locked achievements against the user's current stats and unlocks
 * any that reached their target. Never triggers further evaluations (no recursion).
 */
export async function evaluate(userId: string): Promise<string[]> {
  const [stats, catalog, owned] = await Promise.all([
    loadStats(userId),
    db.from("achievements").select("*").eq("is_active", true),
    db.from("user_achievements").select("achievement_id").eq("user_id", userId)
  ]);

  const unlockedIds = new Set((owned.data ?? []).map((row) => row.achievement_id));
  const newlyUnlocked: AchievementRow[] = [];

  for (const achievement of (catalog.data ?? []) as AchievementRow[]) {
    if (unlockedIds.has(achievement.id)) continue;
    const value = metricValue(stats, achievement.target_type);
    if (value >= achievement.target_value) {
      const { error } = await db.from("user_achievements").upsert(
        { user_id: userId, achievement_id: achievement.id, progress_at_unlock: value },
        { onConflict: "user_id,achievement_id", ignoreDuplicates: true }
      );
      if (!error) newlyUnlocked.push(achievement);
    }
  }

  for (const achievement of newlyUnlocked) {
    await notificationService.create({
      userId,
      type: "ACHIEVEMENT_UNLOCKED",
      title: `Achievement unlocked: ${achievement.name}`,
      message: achievement.description,
      data: { achievementId: achievement.id, rewardXp: achievement.reward_xp }
    });
    if (achievement.reward_xp > 0) {
      // Reward XP is added directly; level is recalculated from total XP afterwards.
      const { data: user } = await db
        .from("users")
        .select("xp,total_xp_earned")
        .eq("id", userId)
        .single<{ xp: number; total_xp_earned: number }>();
      if (user) {
        await db
          .from("users")
          .update({ xp: user.xp + achievement.reward_xp, total_xp_earned: user.total_xp_earned + achievement.reward_xp })
          .eq("id", userId);
        await db.from("xp_history").insert({
          user_id: userId,
          source: "achievement",
          amount: achievement.reward_xp,
          description: `Achievement: ${achievement.name}`
        });
      }
    }
  }

  return newlyUnlocked.map((a) => a.code);
}

async function listCatalog() {
  const { data, error } = await db
    .from("achievements")
    .select("*")
    .eq("is_active", true)
    .order("target_value");
  if (error) throw error;
  return (data ?? []) as AchievementRow[];
}

async function myAchievements(userId: string) {
  const [catalog, ownedRes] = await Promise.all([
    listCatalog(),
    db.from("user_achievements").select("*").eq("user_id", userId)
  ]);
  const ownedMap = new Map(
    ((ownedRes.data ?? []) as Array<{ achievement_id: string; unlocked_at: string; progress_at_unlock: number | null }>).map(
      (row) => [row.achievement_id, row]
    )
  );

  let stats: UserStatsSnapshot | null = null;
  try {
    stats = await loadStats(userId);
  } catch {
    stats = null;
  }

  const items = catalog.map((achievement) => {
    const owned = ownedMap.get(achievement.id);
    const progress = stats && !owned ? Math.min(metricValue(stats, achievement.target_type), achievement.target_value) : null;
    return {
      id: achievement.id,
      code: achievement.code,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      category: achievement.category,
      target: { type: achievement.target_type, value: achievement.target_value },
      rewardXp: achievement.reward_xp,
      unlockedAt: owned?.unlocked_at ?? null,
      currentProgress: progress
    };
  });

  return items;
}

export const achievementService = { evaluate, listCatalog, myAchievements };
