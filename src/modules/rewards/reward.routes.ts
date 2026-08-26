import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { rewardController } from "./reward.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(rewardController.list));
router.get("/me", asyncHandler(rewardController.myClaims));
router.post("/:id/claim", asyncHandler(rewardController.claim));

export default router;
