import { Router } from "express";
import { API_VERSION } from "../config/constants";

import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";
import profileRoutes from "../modules/profiles/profile.routes";
import presenceRoutes from "../modules/presence/presence.routes";
import questionRoutes from "../modules/questions/question.routes";
import practiceRoutes from "../modules/practice/practice.routes";
import progressionRoutes from "../modules/progression/progression.routes";
import achievementRoutes from "../modules/achievements/achievement.routes";
import challengeRoutes from "../modules/challenges/challenge.routes";
import statisticsRoutes from "../modules/statistics/statistics.routes";
import leaderboardRoutes from "../modules/leaderboard/leaderboard.routes";
import duelRoutes from "../modules/duels/duel.routes";
import chatRoutes from "../modules/chat/chat.routes";
import matchRoutes from "../modules/matches/match.routes";
import ratingRoutes from "../modules/rating/rating.routes";
import subscriptionRoutes from "../modules/subscriptions/subscription.routes";
import cosmeticsRoutes from "../modules/cosmetics/cosmetics.routes";
import notificationRoutes from "../modules/notifications/notification.routes";
import settingsRoutes from "../modules/settings/settings.routes";
import rewardRoutes from "../modules/rewards/reward.routes";
import adminRoutes from "../modules/admin/admin.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/profile", profileRoutes);
apiRouter.use("/presence", presenceRoutes);
apiRouter.use("/questions", questionRoutes);
apiRouter.use("/practice", practiceRoutes);
apiRouter.use("/progression", progressionRoutes);
apiRouter.use("/achievements", achievementRoutes);
apiRouter.use("/challenges", challengeRoutes);
apiRouter.use("/statistics", statisticsRoutes);
apiRouter.use("/leaderboard", leaderboardRoutes);

// Chat routes must be mounted before the generic /duels router so that
// /duels/:id/messages resolves to the chat module.
apiRouter.use("/duels", chatRoutes);
apiRouter.use("/duels", duelRoutes);

apiRouter.use("/matches", matchRoutes);
apiRouter.use("/rating", ratingRoutes);
apiRouter.use("/subscription", subscriptionRoutes);
apiRouter.use("/cosmetics", cosmeticsRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/settings", settingsRoutes);
apiRouter.use("/rewards", rewardRoutes);
apiRouter.use("/admin", adminRoutes);

export function apiPrefix(): string {
  return `/api/${API_VERSION}`;
}
