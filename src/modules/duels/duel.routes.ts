import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { answerLimiter } from "../../middleware/rate-limit.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { z } from "zod";
import { duelController } from "./duel.controller";
import { createDuelSchema, duelAnswerSchema, joinDuelSchema } from "./duel.validation";

const router = Router();

router.use(requireAuth);

router.post("/", validate({ body: createDuelSchema }), asyncHandler(duelController.create));
router.get("/waiting", asyncHandler(duelController.listWaiting));
router.get("/ongoing", asyncHandler(duelController.listOngoing));
router.get("/completed", asyncHandler(duelController.listCompleted));
router.get("/", asyncHandler(duelController.listAll));
router.get("/:id", asyncHandler(duelController.getById));
router.get("/:id/state", asyncHandler(duelController.getState));
router.post("/:id/join", validate({ body: joinDuelSchema }), asyncHandler(duelController.join));
router.post("/:id/accept", asyncHandler(duelController.accept));
router.post("/:id/decline", asyncHandler(duelController.decline));
router.post("/:id/cancel", asyncHandler(duelController.cancel));
router.post(
  "/:id/answer",
  answerLimiter,
  validate({ body: duelAnswerSchema }),
  asyncHandler(duelController.answer)
);

export default router;
