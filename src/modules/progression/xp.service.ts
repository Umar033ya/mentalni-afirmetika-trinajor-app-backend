import { db } from "../../config/database";
import { MAX_LEVEL } from "../../config/constants";
import type { Difficulty } from "../../types/question.types";
import { levelInfoFromTotalXp, type LevelInfo } from "../../utils/level";
import { xpForCorrectAnswer } from "../../utils/xp";

export interface XpSourceRef {
  duelId?: string;
  questionId?: string;
  description?: string;
}

export interface UnlockedCosmetic {
  kind: "frame" | "title" | "emoji";
  id: string;
  name: string;
}

export interface ApplyXpResult {
  xp: number;
  totalXpEarned: number;
  amount: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  levelInfo: LevelInfo;
  unlocked: UnlockedCosmetic[];
}

interface UserProgressRow {
  id: string;
  xp: number;
  total_xp_earned: number;
  level: number;
}

async function loadUser(userId: string): Promise<UserProgressRow> {
  const { data, error } = await db
    .from("users")
    .select("id,xp,total_xp_earned,level")
    .eq("id", userId)
    .single<UserProgressRow>();
  if (error || !data) throw error ?? new Error("User not found");
  return data;
}

async function writeXpHistory(
  userId: string,
  amount: number,
  source: string,
  ref: XpSourceRef
): Promise<void> {
  const { error } = await db.from("xp_history").insert({
    user_id: userId,
    source,
    amount,
    duel_id: ref.duelId ?? null,
    question_id: ref.questionId ?? null,
    description: ref.description ?? null
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[xp] failed writing history:", error.message);
  }
}

async function unlockCosmeticsBetween(
  userId: string,
  oldLevel: number,
  newLevel: number
): Promise<UnlockedCosmetic[]> {
  const unlocked: UnlockedCosmetic[] = [];
  if (newLevel <= oldLevel) return unlocked;

  const [{ data: frames }, { data: titles }, { data: emojis }] = await Promise.all([
    db.from("frames").select("*").gt("unlock_level", oldLevel).lte("unlock_level", newLevel),
    db.from("titles").select("*").gt("unlock_level", oldLevel).lte("unlock_level", newLevel),
    db.from("emojis").select("*").gt("unlock_level", oldLevel).lte("unlock_level", newLevel)
  ]);

  for (const frame of frames ?? []) {
    const { error } = await db.from("user_frames").upsert(
      { user_id: userId, frame_id: frame.id },
      { onConflict: "user_id,frame_id", ignoreDuplicates: true }
    );
    if (!error) unlocked.push({ kind: "frame", id: frame.id, name: frame.name });
  }

  for (const title of titles ?? []) {
    const { error } = await db.from("user_titles").upsert(
      { user_id: userId, title_id: title.id },
      { onConflict: "user_id,title_id", ignoreDuplicates: true }
    );
    if (!error) unlocked.push({ kind: "title", id: title.id, name: title.name });
  }

  for (const emoji of emojis ?? []) {
    const { error } = await db.from("user_emojis").upsert(
      { user_id: userId, emoji_id: emoji.id },
      { onConflict: "user_id,emoji_id", ignoreDuplicates: true }
    );
    if (!error) unlocked.push({ kind: "emoji", id: emoji.id, name: emoji.name });
  }

  return unlocked;
}

/**
 * Applies an XP delta to a user, recalculates the level, handles level-up unlocks
 * and writes an xp_history row. This is the single authoritative XP entry point.
 */
export async function applyXp(
  userId: string,
  amount: number,
  source: string,
  ref: XpSourceRef = {}
): Promise<ApplyXpResult> {
  const user = await loadUser(userId);
  const newXp = Math.max(0, user.xp + amount);
  const newTotalEarned =
    amount > 0 ? user.total_xp_earned + amount : user.total_xp_earned;

  const before = levelInfoFromTotalXp(user.xp);
  const after = levelInfoFromTotalXp(newXp);
  const leveledUp = after.level > before.level;

  let unlocked: UnlockedCosmetic[] = [];
  if (leveledUp && !after.isMaxLevel) {
    unlocked = await unlockCosmeticsBetween(userId, before.level, after.level);
  }

  const { error } = await db
    .from("users")
    .update({ xp: newXp, total_xp_earned: newTotalEarned, level: after.level })
    .eq("id", userId);
  if (error) throw error;

  if (amount !== 0) {
    await writeXpHistory(userId, amount, source, ref);
  }

  return {
    xp: newXp,
    totalXpEarned: newTotalEarned,
    amount,
    level: after.level,
    previousLevel: before.level,
    leveledUp,
    levelInfo: after,
    unlocked
  };
}

export async function getXpForDifficulty(difficulty: Difficulty): Promise<number> {
  return xpForCorrectAnswer(difficulty);
}

export async function recalcLevelOnly(userId: string): Promise<number> {
  const user = await loadUser(userId);
  const info = levelInfoFromTotalXp(user.xp);
  if (info.level !== user.level) {
    await db.from("users").update({ level: info.level }).eq("id", userId);
  }
  return info.level;
}

export function maxLevel(): number {
  return MAX_LEVEL;
}
