import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { ratingController } from "./rating.controller";

const router = Router();

router.use(requireAuth);

router.get("/me", asyncHandler(ratingController.me));
router.get("/history", asyncHandler(ratingController.history));

export default router;
