import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { generationConfigSchema, normalizeTiming } from "./question.validation";
import { z } from "zod";
import { questionController } from "./question.controller";

const router = Router();

router.use(requireAuth);

router.get("/config", asyncHandler(questionController.getConfig));
router.get("/difficulties", asyncHandler(questionController.getDifficulties));
router.post(
  "/validate-config",
  validate({ body: z.unknown().transform((v) => normalizeTiming(v as Record<string, unknown>)) }),
  validate({ body: generationConfigSchema }),
  asyncHandler(questionController.validateConfig)
);

export default router;
