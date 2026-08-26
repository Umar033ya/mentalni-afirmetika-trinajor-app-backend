import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { presenceController } from "./presence.controller";

const router = Router();

router.use(requireAuth);

router.post("/heartbeat", asyncHandler(presenceController.heartbeat));
router.post("/offline", asyncHandler(presenceController.offline));

export default router;
