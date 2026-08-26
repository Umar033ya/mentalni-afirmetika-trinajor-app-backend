import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { statisticsController } from "./statistics.controller";

const router = Router();

router.use(requireAuth);

router.get("/me", asyncHandler(statisticsController.me));
router.get("/history", asyncHandler(statisticsController.history));

export default router;
