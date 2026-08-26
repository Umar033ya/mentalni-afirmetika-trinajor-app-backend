import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { progressionController } from "./progression.controller";

const router = Router();

router.use(requireAuth);

router.get("/me", asyncHandler(progressionController.me));
router.get("/levels", asyncHandler(progressionController.levels));
router.get("/xp-history", asyncHandler(progressionController.xpHistory));

export default router;
