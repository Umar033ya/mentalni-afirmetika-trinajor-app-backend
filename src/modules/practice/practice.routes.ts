import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { answerLimiter } from "../../middleware/rate-limit.middleware";
import { practiceController } from "./practice.controller";
import { practiceAnswerSchema, startSessionSchema } from "./practice.validation";

const router = Router();

router.use(requireAuth);

router.post("/sessions", validate({ body: startSessionSchema }), asyncHandler(practiceController.startSession));
router.get("/sessions", asyncHandler(practiceController.listSessions));
router.get("/sessions/:id", asyncHandler(practiceController.getSession));
router.post(
  "/sessions/:id/answer",
  answerLimiter,
  validate({ body: practiceAnswerSchema }),
  asyncHandler(practiceController.answer)
);
router.post("/sessions/:id/finish", asyncHandler(practiceController.finish));

export default router;
