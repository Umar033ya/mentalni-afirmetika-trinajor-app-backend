import { Request, Response } from "express";
import { db } from "../../config/database";
import { AppError, ok } from "../../utils/response";
import { applyXp } from "../progression/xp.service";
import { notificationService } from "../notifications/notification.service";
import { achievementService } from "../achievements/achievement.service";
import { challengeService } from "./challenge.service";

export const challengeController = {
  async list(_req: Request, res: Response): Promise<void> {
    const items = await challengeService.listActive();
    ok(res, { items });
  },

  async today(_req: Request, res: Response): Promise<void> {
    const items = await challengeService.getTodaysChallenges();
    ok(res, { items, date: new Date().toISOString().slice(0, 10) });
  },

  async myProgress(req: Request, res: Response): Promise<void> {
    const items = await challengeService.myProgress(req.user!.id);
    ok(res, { items, date: new Date().toISOString().slice(0, 10) });
  },

  /** Claims the reward for a fully-completed challenge. Idempotent per user/challenge. */
  async complete(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const challengeId = req.params.id;

    const { data: challenge } = await db
      .from("daily_challenges")
      .select("*")
      .eq("id", challengeId)
      .maybeSingle<{ id: string; title: string; target_value: number; reward_xp: number; is_active: boolean }>();
    if (!challenge) throw new AppError(404, "CHALLENGE_NOT_FOUND", "Challenge not found");
    if (!challenge.is_active) throw new AppError(400, "CHALLENGE_INACTIVE", "Challenge is not active");

    const { data: progress } = await db
      .from("challenge_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("challenge_id", challengeId)
      .maybeSingle<{ progress: number; completed: boolean; claimed: boolean }>();

    if (!progress || progress.progress < challenge.target_value) {
      throw new AppError(
        409,
        "CHALLENGE_NOT_COMPLETED",
        `Challenge is not completed yet (${progress?.progress ?? 0}/${challenge.target_value})`
      );
    }
    if (progress.claimed) {
      throw new AppError(409, "REWARD_ALREADY_CLAIMED", "Reward already claimed");
    }

    const { error } = await db
      .from("challenge_progress")
      .update({ claimed: true })
      .eq("user_id", userId)
      .eq("challenge_id", challengeId);
    if (error) throw error;

    const xpResult = await applyXp(userId, challenge.reward_xp, "challenge", {
      questionId: challengeId,
      description: `Challenge reward: ${challenge.title}`
    });

    await notificationService.create({
      userId,
      type: "REWARD_CLAIMED",
      title: "Challenge completed!",
      message: `You earned ${challenge.reward_xp} XP for "${challenge.title}"`,
      data: { challengeId, xpEarned: challenge.reward_xp }
    });

    await achievementService.evaluate(userId);

    ok(res, {
      claimed: true,
      rewardXp: challenge.reward_xp,
      level: xpResult.level,
      leveledUp: xpResult.leveledUp
    });
  }
};
