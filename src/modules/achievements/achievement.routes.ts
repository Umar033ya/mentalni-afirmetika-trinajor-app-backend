import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { achievementController } from "./achievement.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(achievementController.list));
router.get("/me", asyncHandler(achievementController.myAchievements));

export default router;
