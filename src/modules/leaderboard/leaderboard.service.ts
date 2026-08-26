import { db } from "../../config/database";
import type { UserQueryRow } from "../users/user.mapper";
import { USER_SELECT_WITH_COSMETICS, toPublicUser } from "../users/user.mapper";

export type LeaderboardType = "duel" | "xp" | "wins";

const COLUMNS: Record<LeaderboardType, string> = {
  duel: "duel_rating",
  xp: "xp",
  wins: "wins"
};

async function getLeaderboard(type: LeaderboardType, limit: number) {
  const column = COLUMNS[type] ?? COLUMNS.duel;

  const { data, error } = await db
    .from("users")
    .select(`${USER_SELECT_WITH_COSMETICS}`)
    .eq("is_banned", false)
    .gt(column, 0)
    .order(column, { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) throw error;
  const rows = (data ?? []) as UserQueryRow[];

  return rows.map((row, index) => ({
    rank: index + 1,
    user: toPublicUser(row)
  }));
}

export const leaderboardService = { getLeaderboard };
