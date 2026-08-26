import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { challengeController } from "./challenge.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(challengeController.list));
router.get("/today", asyncHandler(challengeController.today));
router.get("/me", asyncHandler(challengeController.myProgress));
router.post("/:id/complete", validate({ body: z.object({}).optional() }), asyncHandler(challengeController.complete));

export default router;
