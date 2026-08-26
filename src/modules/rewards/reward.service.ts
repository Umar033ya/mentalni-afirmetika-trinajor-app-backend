import { db } from "../../config/database";
import { AppError } from "../../utils/response";
import type { PageParams } from "../../utils/pagination";
import { buildPaginationMeta } from "../../utils/pagination";
import type { RewardRow } from "./reward.types";
import { subscriptionService } from "../subscriptions/subscription.service";
import { applyXp } from "../progression/xp.service";

export type RewardKind = "XP" | "FRAME" | "TITLE" | "EMOJI" | "SUBSCRIPTION_DAYS";

async function loadUser(userId: string) {
  const { data, error } = await db
    .from("users")
    .select("id,level,wins")
    .eq("id", userId)
    .single<{ id: string; level: number; wins: number }>();
  if (error || !data) throw error ?? new Error("User not found");
  return data;
}

function eligibility(reward: RewardRow, user: { level: number; wins: number }, isPro: boolean) {
  const levelOk = reward.required_level === null || user.level >= reward.required_level;
  const winsOk = reward.required_wins === null || user.wins >= reward.required_wins;
  const proOk = !reward.is_pro_only || isPro;
  return { levelOk, winsOk, proOk, eligible: levelOk && winsOk && proOk };
}

async function listRewards(userId: string) {
  const [rewardsRes, claimsRes, user, isPro] = await Promise.all([
    db.from("rewards").select("*").eq("is_active", true).order("required_level"),
    db.from("user_rewards").select("reward_id").eq("user_id", userId),
    loadUser(userId),
    subscriptionService.isPro(userId).catch(() => false)
  ]);

  const claimedIds = new Set(((claimsRes.data ?? []) as Array<{ reward_id: string }>).map((r) => r.reward_id));

  return ((rewardsRes.data ?? []) as RewardRow[]).map((reward) => ({
    id: reward.id,
    code: reward.code,
    name: reward.name,
    description: reward.description,
    rewardType: reward.reward_type,
    requiredLevel: reward.required_level,
    requiredWins: reward.required_wins,
    isProOnly: reward.is_pro_only,
    claimed: claimedIds.has(reward.id),
    ...eligibility(reward, user, isPro)
  }));
}

async function claimReward(userId: string, rewardId: string) {
  const [{ data: reward }, alreadyClaimedRes, user, isPro] = await Promise.all([
    db.from("rewards").select("*").eq("id", rewardId).maybeSingle<RewardRow>(),
    db
      .from("user_rewards")
      .select("id")
      .eq("user_id", userId)
      .eq("reward_id", rewardId)
      .maybeSingle(),
    loadUser(userId),
    subscriptionService.isPro(userId)
  ]);

  if (!reward) throw new AppError(404, "REWARD_NOT_FOUND", "Reward not found");
  if (!reward.is_active) throw new AppError(400, "REWARD_INACTIVE", "Reward is not active");
  if (alreadyClaimedRes.data) throw new AppError(409, "REWARD_ALREADY_CLAIMED", "Reward already claimed");

  const status = eligibility(reward, user, isPro);
  if (!status.eligible) {
    const reasons: string[] = [];
    if (!status.levelOk) reasons.push(`requires level ${reward.required_level}`);
    if (!status.winsOk) reasons.push(`requires ${reward.required_wins} wins`);
    if (!status.proOk) reasons.push("requires Pro");
    throw new AppError(403, "REWARD_LOCKED", `Reward locked: ${reasons.join(", ")}`);
  }

  const { error: claimError } = await db
    .from("user_rewards")
    .insert({ user_id: userId, reward_id: rewardId });
  if (claimError) throw claimError;

  let granted: Record<string, unknown> = {};
  switch (reward.reward_type) {
    case "XP": {
      const amount = Number(reward.ref_code ?? 0);
      if (amount !== 0) {
        await applyXp(userId, amount, "reward", { description: `Reward: ${reward.name}` });
      }
      granted = { xp: amount };
      break;
    }
    case "SUBSCRIPTION_DAYS": {
      const days = Number(reward.ref_code ?? 0);
      if (days > 0) await subscriptionService.subscribe(userId, "PRO", days);
      granted = { subscriptionDays: days };
      break;
    }
    case "FRAME":
    case "TITLE":
    case "EMOJI": {
      const target =
        reward.reward_type === "FRAME"
          ? { table: "user_frames", fk: "frame_id", catalog: "frames" }
          : reward.reward_type === "TITLE"
            ? { table: "user_titles", fk: "title_id", catalog: "titles" }
            : { table: "user_emojis", fk: "emoji_id", catalog: "emojis" };

      const { data: item } = await db
        .from(target.catalog)
        .select("id")
        .eq("code", reward.ref_code ?? "")
        .maybeSingle<{ id: string }>();
      if (!item) throw new AppError(500, "REWARD_TARGET_MISSING", "Reward references a missing cosmetic");

      await db
        .from(target.table)
        .upsert({ user_id: userId, [target.fk]: item.id } as Record<string, unknown>, {
          onConflict: `user_id,${target.fk}`,
          ignoreDuplicates: true
        });
      granted = { unlockedId: item.id };
      break;
    }
    default:
      break;
  }

  return { claimed: true, rewardType: reward.reward_type, ...granted };
}

async function myClaims(userId: string, page: PageParams) {
  const { data, error, count } = await db
    .from("user_rewards")
    .select("*, reward:reward_id(code,name,reward_type)", { count: "exact" })
    .eq("user_id", userId)
    .order("claimed_at", { ascending: false })
    .range(page.from, page.to);
  if (error) throw error;
  return { items: data ?? [], pagination: buildPaginationMeta(page, count) };
}

export const rewardService = { listRewards, claimReward, myClaims };
