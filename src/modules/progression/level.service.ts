import { db } from "../../config/database";
import { MAX_LEVEL } from "../../config/constants";
import { levelInfoFromTotalXp, requirementForLevel, totalXpForLevel } from "../../utils/level";

async function getMyProgress(userId: string) {
  const { data, error } = await db
    .from("users")
    .select("id,xp,total_xp_earned,level")
    .eq("id", userId)
    .single<{ id: string; xp: number; total_xp_earned: number; level: number }>();
  if (error || !data) throw error ?? new Error("User not found");

  const info = levelInfoFromTotalXp(data.xp);
  return {
    level: info.level,
    xp: data.xp,
    xpIntoLevel: info.xpIntoLevel,
    xpForNextLevel: info.xpForNextLevel,
    progressPercent: info.progressPercent,
    isMaxLevel: info.isMaxLevel,
    totalXpEarned: data.total_xp_earned,
    storedLevelInSync: data.level === info.level
  };
}

function getLevelTable(maxRows = 50) {
  const rows: Array<{ level: number; xpToNextLevel: number; totalXpToReach: number }> = [];
  const limit = Math.min(maxRows, MAX_LEVEL);
  for (let level = 1; level <= limit; level++) {
    const req = requirementForLevel(level);
    rows.push({
      level,
      xpToNextLevel: req === Number.POSITIVE_INFINITY ? 0 : req,
      totalXpToReach: totalXpForLevel(level + 1)
    });
  }
  return rows;
}

export const levelService = { getMyProgress, getLevelTable };
