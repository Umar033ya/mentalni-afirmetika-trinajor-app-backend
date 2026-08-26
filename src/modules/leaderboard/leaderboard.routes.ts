import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { leaderboardController } from "./leaderboard.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(leaderboardController.index));
router.get("/duel", asyncHandler(leaderboardController.duel));
router.get("/xp", asyncHandler(leaderboardController.xp));

export default router;
